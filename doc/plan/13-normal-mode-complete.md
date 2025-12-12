# 13. ノーマルモード完成

## 概要
既存のノーマルモード実装を完成させ、ゲームモードシステムの基盤を確立する。
設定の反映、結果表示順の切り替え、UIの改善を行う。

## 現状の実装状況
- ✅ 基本的なゲームフロー（お題→絵→回答→...）
- ✅ チェーン管理とターン進行
- ✅ 結果表示（リプレイ機能）
- ✅ タイマー同期
- ⚠️ 設定がハードコードされている
- ❌ 結果表示順の切り替え機能なし
- ❌ モードシステムとの統合なし

## ゴール
- ノーマルモードがモードシステムと統合される
- ロビーで設定した値がゲームに反映される
- 結果画面で表示順（最初から/最後から）を切り替えられる
- 全体的なUX改善

## 実装タスク

### 13.1 モードシステム基盤の構築

#### ゲームモードインターフェース設計
```typescript
// server/src/domain/gameMode.ts

export interface GameModeHandler {
  // モード固有のフェーズ定義
  getPhases(): GamePhase[];
  
  // 次のフェーズを決定
  getNextPhase(currentPhase: GamePhase, turn: number, totalTurns: number): GamePhase | 'result';
  
  // フェーズの制限時間を取得
  getTimeLimit(phase: GamePhase, settings: Settings): number;
  
  // ゲーム初期化
  initializeGame(room: Room): void;
  
  // コンテンツ配布ロジック
  distributeContent(room: Room, chains: Chain[]): Map<string, ContentPayload>;
  
  // 提出処理
  handleSubmission(room: Room, playerId: string, data: SubmissionData): boolean;
  
  // 結果データ生成
  generateResult(room: Room, chains: Chain[]): GameResult;
}
```

#### ノーマルモードハンドラー
```typescript
// server/src/application/gameModes/normalMode.ts

export class NormalModeHandler implements GameModeHandler {
  getPhases(): GamePhase[] {
    return ['prompt', 'drawing', 'guessing'];
  }

  getNextPhase(currentPhase: GamePhase, turn: number, totalTurns: number): GamePhase | 'result' {
    if (currentPhase === 'prompt') return 'drawing';
    if (currentPhase === 'drawing') {
      return turn < totalTurns - 1 ? 'guessing' : 'result';
    }
    if (currentPhase === 'guessing') {
      return 'drawing';
    }
    return 'result';
  }

  // ... 他のメソッド実装
}
```

### 13.2 設定の動的反映

#### サーバー側の設定読み取り
```typescript
// gameUseCases.ts の修正

function getTimeLimitForPhase(room: Room, phase: GamePhase): number {
  const settings = room.settings;
  const normalSettings = settings.normalSettings;
  
  switch (phase) {
    case 'prompt':
      return normalSettings.promptTimeSec;
    case 'drawing':
      return normalSettings.drawingTimeSec;
    case 'guessing':
      return normalSettings.guessTimeSec;
    default:
      return 60;
  }
}
```

#### フロントエンド側のタイマー表示
- 設定値をstoreから取得してUIに表示
- フェーズごとの最大時間を動的に設定

### 13.3 結果表示の改善

#### 表示順切り替え機能
```typescript
// 結果画面の状態
interface ResultState {
  chains: Chain[];
  currentChainIndex: number;
  currentEntryIndex: number;
  displayOrder: 'first-to-last' | 'last-to-first';
}
```

#### GameResult.tsx の改善
- 表示順切り替えボタン追加
- 「最初から」「最後から」の切り替え
- エントリー順序の反転表示ロジック

### 13.4 UI/UX改善

#### お題入力フェーズ
- プレースホルダーにヒント表示
- 文字数カウンター
- 空送信防止（最低1文字）

#### 描画フェーズ
- お題を画面上部に固定表示
- 残り時間の視覚的な進捗バー

#### 回答フェーズ
- 絵を大きく表示
- 入力フォームは下部に固定

#### 結果フェーズ
- チェーン選択UI改善（サムネイル表示）
- アニメーション付きトランジション
- 共有ボタン（URLコピー、スクリーンショット）

### 13.5 実装ステップ

#### Step 1: モードシステム基盤
1. `GameModeHandler` インターフェース作成
2. `NormalModeHandler` 実装
3. 既存の `gameUseCases.ts` をリファクタリング

#### Step 2: 設定反映
1. ロビーからゲームへの設定引き継ぎ確認
2. 各フェーズで設定値を使用するよう修正
3. フロントエンドのタイマー表示修正

#### Step 3: 結果画面改善
1. 表示順切り替えUI追加
2. 切り替えロジック実装
3. ホスト同期（オプション）

#### Step 4: UI磨き込み
1. 各フェーズのUI改善
2. トランジション追加
3. エラーハンドリング強化

## ファイル変更一覧

### 新規作成
- `server/src/domain/gameMode.ts` - モードインターフェース
- `server/src/application/gameModes/normalMode.ts` - ノーマルモードハンドラー
- `server/src/application/gameModes/index.ts` - モード管理

### 修正
- `server/src/domain/entities.ts` - Settings型拡張
- `server/src/application/gameUseCases.ts` - モードシステム統合
- `frontend/src/shared/types/index.ts` - 型定義追加
- `frontend/src/features/game/components/GameResult.tsx` - 表示順切り替え
- `frontend/src/features/game/pages/GamePage.tsx` - UI改善
- `frontend/src/features/game/components/PromptInput.tsx` - UX改善
- `frontend/src/features/game/components/DrawingCanvas.tsx` - お題表示
- `frontend/src/features/game/components/GuessInput.tsx` - レイアウト改善

## テスト項目

### 機能テスト
- [ ] ロビーで設定した時間がゲームに反映される
- [ ] 各フェーズが正しく進行する
- [ ] 結果表示順を切り替えられる
- [ ] 全プレイヤーに結果が正しく表示される

### エッジケース
- [ ] お題が空の場合のデフォルト値
- [ ] プレイヤー切断時の処理
- [ ] タイムアウト時の自動提出

## 完了条件
- [ ] モードシステム基盤が実装される
- [ ] ノーマルモードがモードシステム経由で動作する
- [ ] 設定がゲームに正しく反映される
- [ ] 結果画面で表示順を切り替えられる
- [ ] 既存機能が壊れていない
