# 18. 人狼モード - 概要・基盤設計

## 概要
お絵描き人狼モード。全員がお題に沿った絵を描き、「人狼」を見つけ出す対戦ゲーム。
人狼には村人とは異なるお題（または無し）が与えられるため、絵の違いから推理する。

仕様の元資料: [doc/plan/gamemode/werewolf.md](doc/plan/gamemode/werewolf.md)


## モードのバリエーション

### 実装対象（初期）
1. **ワードウルフモード** (`wordwolf`)
   - 人狼には微妙に違うお題が配られる
   - 人狼自身も最初は自分が人狼だとわからない
   
2. **インポスターモード** (`impostor`)
   - 人狼にはお題が配られない（ジャンルのみ）
   - 人狼は他の絵を見て推測して描く必要がある

### 将来拡張候補
- 複数人狼モード
- お題進化モード
- 逆人狼モード（カモフラージュ）


## ゲームフロー

```
[ロビー] → [ジャンル・お題配布] → [描画1] → [発表1] → [議論1]
                                      ↓
                               [描画2] → [発表2] → [議論2]
                                      ↓
                               [投票] → [結果発表]
```

### 詳細フロー

#### 1. ゲーム開始・お題配布（`werewolf_assign`）
- お題のジャンルを全員に表示
- 村人には正しいお題を配布
- 人狼には別のお題（ワードウルフ）または無し（インポスター）を配布
- 自分が人狼かどうかは画面に表示しない

#### 2. 描画フェーズ（`werewolf_drawing`）
- 全員が一斉に絵を描く
- お題を直接表す絵はNG（関連するものを描く）
- 制限時間: デフォルト60秒

#### 3. 発表フェーズ（`werewolf_reveal`）
- 全員の絵を順番に表示
- アニメーション的に1人ずつ見せる
- 各プレイヤーは自分の絵について簡単に説明できる（オプション）

#### 4. 議論フェーズ（`werewolf_discussion`）
- 全員の絵を一覧表示
- テキストチャットで議論
- 制限時間: デフォルト90秒

#### 5. ラウンド2（描画2 → 発表2 → 議論2）
- 同じ流れを繰り返す
- 2回目の絵は1回目の情報を踏まえて描ける

#### 6. 投票フェーズ（`werewolf_voting`）
- 各プレイヤーが人狼だと思う人に投票
- 自分への投票は不可
- 制限時間: デフォルト30秒

#### 7. 結果発表（`werewolf_result`）
- 人狼が誰だったかを公開
- お題の違いを表示
- スコア計算・表示

### インポスターモード追加フロー
- 投票後、人狼がバレなかった場合
  - お題の選択肢（複数）を表示
  - 人狼が正しいお題を当てられたらボーナス点


## 設定項目

```typescript
interface WerewolfModeSettings {
  // モードタイプ
  werewolfType: 'wordwolf' | 'impostor';
  
  // 時間設定
  assignTimeSec: number;        // お題確認時間（デフォルト: 5秒）
  drawingTimeSec: number;       // 描画時間（デフォルト: 60秒）
  revealTimeSec: number;        // 1人あたりの発表時間（デフォルト: 5秒）
  discussionTimeSec: number;    // 議論時間（デフォルト: 90秒）
  votingTimeSec: number;        // 投票時間（デフォルト: 30秒）
  
  // ゲーム設定
  drawingRounds: number;        // 描画ラウンド数（デフォルト: 2）
  werewolfCount: number;        // 人狼の人数（デフォルト: 1, 自動計算も可）
  autoWerewolfCount: boolean;   // プレイ人数に応じて自動決定
  
  // スコア設定
  scoring: {
    villagerCatchWolf: number;  // 村人が人狼を当てた（デフォルト: 2）
    wolfSurvive: number;        // 人狼がバレなかった（デフォルト: 3）
    wolfGuessPrompt: number;    // 人狼がお題を当てた（インポスター、デフォルト: 1）
  };
  
  // お題設定
  promptDifficulty: 'easy' | 'normal' | 'hard';
  selectedCategories: string[];
}
```


## データモデル

### サーバー側状態（`WerewolfState`）

```typescript
interface WerewolfState {
  // 基本情報
  roomId: string;
  werewolfType: 'wordwolf' | 'impostor';
  
  // お題
  category: string;              // お題ジャンル
  villagerPrompt: string;        // 村人のお題
  werewolfPrompt: string | null; // 人狼のお題（インポスターはnull）
  promptChoices?: string[];      // インポスター用: お題選択肢
  
  // 役職
  werewolves: Set<string>;       // 人狼のplayerId
  
  // ラウンド管理
  currentRound: number;          // 現在のラウンド（1-based）
  totalRounds: number;
  
  // 描画データ
  drawings: Map<string, DrawingEntry[]>;  // playerId -> ラウンドごとの絵
  
  // 投票
  votes: Map<string, string>;    // 投票者 -> 被投票者
  
  // スコア
  scores: Record<string, number>;
  
  // チャット
  chatMessages: ChatMessage[];
}

interface DrawingEntry {
  round: number;
  imageData: string;
  strokes?: DrawingStroke[];
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
}
```


## GamePhase追加

```typescript
export type GamePhase = 
  // 既存
  | 'prompt' | 'first-frame' | 'drawing' | 'guessing' | 'result'
  | 'quiz_prompt' | 'quiz_drawing' | 'quiz_guessing' | 'quiz_reveal'
  // 人狼モード追加
  | 'werewolf_assign'      // お題配布・確認
  | 'werewolf_drawing'     // 描画
  | 'werewolf_reveal'      // 発表
  | 'werewolf_discussion'  // 議論
  | 'werewolf_voting'      // 投票
  | 'werewolf_result';     // 結果
```


## 実装タスク概要

| タスク | ファイル | 内容 |
|--------|----------|------|
| 18 | この文書 | 概要・基盤設計 |
| 19 | 19-werewolf-server.md | サーバー側実装 |
| 20 | 20-werewolf-frontend.md | フロントエンド実装 |
| 21 | 21-werewolf-prompts.md | お題データ・ロジック |


## 人狼人数の自動計算ロジック

```typescript
function getWerewolfCount(playerCount: number, manual?: number): number {
  if (manual !== undefined && manual > 0) {
    return Math.min(manual, Math.floor(playerCount / 2));
  }
  
  // 自動計算
  if (playerCount <= 4) return 1;
  if (playerCount <= 7) return 1;
  if (playerCount <= 10) return 2;
  return 3;
}
```


## 類似ゲームとの差別化ポイント

- **お絵描き要素**: 言葉ではなく絵で表現するため、解釈の幅が広い
- **2回描画**: 1回目の情報を踏まえて2回目で調整できる戦略性
- **直接表現NG**: お題を直接描けないルールで推理要素が増す
- **インポスターモード**: お題がない状態で推測して描く緊張感
