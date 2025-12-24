# 16. クイズモード

## 概要
「1人が描いて、他の人が当てる」リアルタイムクイズモードを追加する。
- お題はサーバーが自動生成（ランダム）
- 親（描画者）が制限時間内に描く
- 子（回答者）が当てる（リアルタイム）
- 回答ログはニコニコ動画風に上部を右→左へ流す
- 正解者が上位k人に達したら答えを公開して次の人へ
- 点数が加算され、最終結果でスコアボードを表示

仕様の元資料: [doc/plan/gamemode/quiz.md](doc/plan/gamemode/quiz.md)


## 実装方針（既存構造に寄せる）
既存の `GameModeHandler` / `gameUseCases.ts` の「フェーズ+タイマー」の枠は維持し、クイズ特有の要件は以下で吸収する。

- **フェーズ進行**: クイズ専用フェーズ（`quiz_*`）を追加して分岐を明確にする
- **回答送信**: 既存の `submit_guess` は `guessing` フェーズ専用のため、クイズ用に **独立イベント**（`submit_quiz_guess`）を追加し、サーバー側で正誤判定・ランキング・スコア計算・フィード配信を行う
- **提出カウント**: `roomSubmissions` の「必要提出数でフェーズを進める」仕組みは、
  - 描画フェーズ: **親のみ提出必須**
  - 回答は提出カウントに含めない（ラウンド完了条件は「時間切れ」または「正解者k人到達」）


## 追加する設定

### QuizModeSettings
```ts
interface QuizModeSettings {
  // 時間
  drawingTimeSec: number;        // default: 120

  // 形式
  quizFormat: 'live' | 'draw-then-guess';
  // live: 描いている最中に回答できる（デフォ）
  // draw-then-guess: まず描いて、その後みんなが回答（短時間想定）

  // draw-then-guess 用
  hiddenDrawingTimeSec: number;  // default: 15
  guessTimeSec: number;          // default: 30

  // お題表示
  promptRevealMode: 'included' | 'separated';
  // included: お題表示と同時に制限時間開始
  // separated: お題確認時間は別枠（制限時間に含めない）
  promptPeekTimeSec: number;     // default: 3

  // 正解者数
  maxWinners: number;            // default: 3

  // 得点（1ラウンドあたり個人加点は最大3点にクランプ）
  scoring: {
    drawerOnSomeoneCorrect: number; // default: 2
    winnerPoints: number[];         // default: [3,2,1]（1位〜3位）
    othersOnNoWinner: number;       // default: 1（親以外）
    perRoundCap: number;            // default: 3
  };

  // ラウンド間の見せ場
  revealTimeSec: number;         // default: 3（正解公開のインターバル）
}
```

### Settings への追加
- `Settings` に `quizSettings: QuizModeSettings` を追加
- `GameMode` に `'quiz'` を追加


## データモデル（サーバー側の状態）
クイズモードは「チェーンの入力」よりも「ラウンド状態とスコア」が本質なので、
サーバー側（in-memory）に `roomId -> QuizState` を持つ。

```ts
interface QuizState {
  round: number;                 // 0-based
  drawerId: string;
  prompt: string;
  normalizedAnswer: string;

  // 正解者（順序が順位）
  winners: { playerId: string; at: number }[];

  // 各プレイヤーの累積スコア
  scores: Record<string, number>;

  // そのラウンド内で同一プレイヤーが複数回正解しないため
  hasCorrect: Set<string>;

  // クイズ形式により、描画を見せるタイミングが違う
  isCanvasHidden: boolean;

  // フィード（ニコニコ）用の直近ログ（再接続用）
  recentFeed: QuizFeedItem[];     // max N 件（例: 50）
}

interface QuizFeedItem {
  id: string;
  playerId: string;
  playerName: string;
  text: string;                  // 表示文言（正解時は答えを漏らさない形にするのが安全）
  kind: 'guess' | 'correct' | 'system';
  createdAt: number;
  rank?: number;                 // 正解順位（1..）
}
```

### 正規化（答え判定）
実装初期は「トリム＋小文字化＋全角半角のゆるい正規化」程度で良い。
- ひらがな/カタカナ揺れ、濁点、長音などは将来拡張


## ゲームフロー

### live（デフォ）
```
1. ラウンド開始（drawer決定・お題決定）
2. quiz_drawing
   - 親は描画
   - 子は常に回答送信できる
   - 正解者がk人に達したら即終了
   - 時間切れでも終了
3. quiz_reveal（revealTimeSec）
   - 答え公開・スコア更新表示
4. 次のdrawerへ（繰り返し）
5. 最終結果（quiz_result もしくは既存 result を利用）
```

### draw-then-guess（短時間）
```
1. quiz_hidden_drawing（hiddenDrawingTimeSec）
   - 親のみ描画できる
   - 子はキャンバスを見れない（ロック/黒塗り）
2. quiz_guessing（guessTimeSec）
   - キャンバス公開
   - 子が回答
   - 正解者k人に達したら即終了
3. quiz_reveal → 次へ
```


## WebSocket イベント設計
既存 `submit_guess` / `phase_changed` の枠に無理やり乗せず、クイズ専用イベントを増やす。

### クライアント → サーバー
```ts
| { type: 'submit_quiz_guess'; payload: { text: string } }
```

### サーバー → クライアント
```ts
| { type: 'quiz_state'; payload: {
    round: number;
    drawerId: string;
    scores: Record<string, number>;
    maxWinners: number;
    winners: { playerId: string; rank: number }[];
    // 再接続/復元用
    recentFeed: QuizFeedItem[];
    // キャンバス隠し状態
    isCanvasHidden: boolean;
    // 公開中の答え（reveal中のみ）
    revealedAnswer?: string | null;
  }}

| { type: 'quiz_feed'; payload: { item: QuizFeedItem } }

| { type: 'quiz_round_ended'; payload: {
    prompt: string;
    answer: string;
    winners: { playerId: string; rank: number; gained: number }[];
    drawerGained: number;
    scores: Record<string, number>;
    reason: 'timeout' | 'k-winners';
  }}
```

補足:
- **正解者の入力文字列を他人に見せると答えが漏れる**ため、`quiz_feed` の `text` は
  - 不正解: 入力そのまま
  - 正解: `"✅ 正解！"` や `"✅ {playerName}（1位）"` のように加工
  を推奨。


## スコアリング

### ルール（デフォ）
- 誰かが当てる（上位k人まで）
  - 親に +2 点（1回のみ）
  - 1位 +3 点 / 2位 +2 点 / 3位 +1 点
- 誰も当てない
  - 親以外全員に +1 点
- 1ラウンドあたり個人加点は最大3点にクランプ（`perRoundCap`）

### 計算手順（サーバー側）
1. 正解判定に通ったら、まだ勝者でないなら `winners` に追加（順位確定）
2. `rank` に応じた加点（`winnerPoints[rank-1]`）を適用
3. 初回の正解が出たタイミングで親に `drawerOnSomeoneCorrect` を付与（重複しない）
4. 3人（=k）に達したらラウンド終了
5. タイムアウト時に `winners.length === 0` なら親以外に `othersOnNoWinner`


## フロントエンドUI

### 画面レイアウト（live）
- 親: 既存 `DrawingCanvas` をベースに「お題カードを目隠し+peek」に変更
- 子: 「キャンバス閲覧 + 回答入力 + コメント流し」を同一画面にする

推奨: `QuizRound.tsx` を新設し、親/子でサブレイアウト分岐。

```
┌────────────────────────────────────────────┐
│ ターン/残り時間  スコアボード（小）         │
│ ニコニコ風コメント（右→左に流れる）        │
├───────────────────────┬────────────────────┤
│        キャンバス       │   回答入力/履歴     │
│  (draw-then-guessの     │  [_____] [送信]     │
│   hidden中は非表示)     │  winners表示        │
└───────────────────────┴────────────────────┘
```

### ニコニコ風コメント
- `quiz_feed` を受け取り、ローカルstateで「表示中の弾幕リスト」を管理
- 右→左の移動は CSS keyframes（Tailwindの `@layer utilities` か `index.css` に追加）
- 行の被りを避けるため、`lane`（0..n-1）を割り当てて `top` をずらす（最小実装はランダムでも可）

### お題の目隠し（親のみ）
- 初回 `promptPeekTimeSec` だけは表示
- 以降はマスク表示（例: `•••••`）
- 「押してる間だけ表示」は
  - PC: `onMouseDown` / `onMouseUp`
  - Mobile: `onTouchStart` / `onTouchEnd`


## サーバー実装タスク

### 16.1 型追加
- `server/src/domain/entities.ts`
  - `GameMode` に `'quiz'`
  - `Settings` に `quizSettings`
- `frontend/src/shared/types/index.ts` も同様に同期

### 16.2 QuizModeHandler
- 新規: `server/src/application/gameModes/quizMode.ts`
- `server/src/application/gameModes/index.ts` に登録

`QuizModeHandler` の責務:
- `initializeGame(room)` で `room.currentPhase` / `room.totalTurns` 初期化
- `getTimeLimit(phase, settings)` で時間を返す
- `getExpectedSubmitters(room)` は **親のみ**（描画提出対象を1人に限定）
- `distributeContent(room, chains)` で
  - 親には prompt を送る
  - 子には「キャンバス/状態」用ペイロード（必要なら空）を送る

※ クイズはチェーンの `entries` を最小限にし、
- 結果画面はスコア中心にする
- ただし将来のリプレイ用に「各ラウンドの絵」を保存したいなら、親の描画を `entries` に残す

### 16.3 早期ラウンド終了（k人正解）
現状 `advancePhase` は内側関数なので、以下のどちらかを採用する。
- 案A: `gameUseCases.ts` に `forceAdvancePhase(roomId)` を export して、クイズ正解k到達時に呼ぶ
- 案B: `startPhase(roomId, nextPhase)` を直接呼ぶための安全なAPIを追加

**最小変更**は案A。

### 16.4 WSハンドラ拡張
- `WSClientEvent` に `submit_quiz_guess`
- `wsHandler.ts` でルーティングして quiz usecase を呼ぶ

### 16.5 Quiz用usecase
- 新規: `server/src/application/quizUseCases.ts`（or `gameUseCases.ts` に寄せて実装）

責務:
- `submitQuizGuess(roomId, playerId, text)`
  - フェーズが `quiz_drawing` / `quiz_guessing` の時だけ受ける
  - 正解判定
  - `quiz_feed` broadcast
  - 正解時は `quiz_state` 更新 & `k` 到達なら `quiz_round_ended` → `quiz_reveal` へ


## フロント実装タスク

### 16.6 ModeSelection
- `GameMode` に quiz を追加
- モードカードに「クイズ」を追加
- `quizSettings` を編集できるUIセクションを追加

### 16.7 GamePage分岐
- `room.settings.gameMode === 'quiz'` の場合は `QuizRound` を表示
- quiz系フェーズのレンダリングを追加

### 16.8 store拡張
- `gameStore.ts` に以下を追加
  - `quiz` 状態（scores/winners/recentFeed/isCanvasHidden/revealedAnswer 等）
  - `quiz_feed` 受信で弾幕リストを更新


## 完了条件
- [ ] ロビーでクイズモードを選べる
- [ ] ラウンドが親交代しながら進行する
- [ ] 回答が弾幕表示され、正解はマークで流れる
- [ ] 上位k人正解で答えが公開→自動で次へ
- [ ] 誰も正解しないと親以外に+1
- [ ] 最終結果でスコアが全員分表示される


## 主要変更ファイル（予定）
- server
  - `server/src/domain/entities.ts`
  - `server/src/application/gameModes/quizMode.ts`（新規）
  - `server/src/application/gameModes/index.ts`
  - `server/src/application/gameUseCases.ts`（forceAdvancePhase等）
  - `server/src/infra/ws/wsHandler.ts`
- frontend
  - `frontend/src/shared/types/index.ts`
  - `frontend/src/features/room/components/ModeSelectionPanel.tsx`
  - `frontend/src/features/game/pages/GamePage.tsx`
  - `frontend/src/features/game/components/QuizRound.tsx`（新規）
  - `frontend/src/features/game/store/gameStore.ts`
  - `frontend/src/index.css`（弾幕keyframes追加、必要なら）
