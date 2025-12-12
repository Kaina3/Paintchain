# 12. ゲームモード選択UI

## 概要
ロビー画面をリデザインし、ゲームモードを選択できるUIを実装する。
プレイヤーリストを左パネルに、モード選択カードを右側に大きく表示する。

## 現状
- ロビー画面は単純なプレイヤーリストと準備ボタンのみ
- ゲームモードの概念がない（ノーマルモード固定）
- 設定項目が存在しない

## ゴール
- 3つのゲームモード（ノーマル、アニメーション、絵しりとり）を選択可能にする
- ホストのみがモードと設定を変更できる
- 視覚的に分かりやすいカードUIでモードを表示

## 実装タスク

### 12.1 データモデルの拡張

#### フロントエンド型定義 (`frontend/src/shared/types/index.ts`)
```typescript
// ゲームモードの定義
export type GameMode = 'normal' | 'animation' | 'shiritori';

// モード別設定
export interface NormalModeSettings {
  promptTimeSec: number;      // お題入力時間 (default: 20)
  drawingTimeSec: number;     // 描画時間 (default: 90)
  guessTimeSec: number;       // 回答時間 (default: 50)
  resultOrder: 'first' | 'last'; // 結果表示順 (default: 'first')
}

export interface AnimationModeSettings {
  drawingTimeSec: number;           // 描画時間 (default: 90)
  viewMode: 'previous' | 'sequence'; // 前の絵の表示方法 (default: 'sequence')
  firstFrameMode: 'free' | 'prompt'; // 最初のフレーム (default: 'free')
  promptTimeSec?: number;           // firstFrameMode='prompt'の場合のお題時間
}

export interface ShiritoriModeSettings {
  drawingTimeSec: number;  // 描画時間 (default: 60)
  totalDrawings: number;   // 総絵枚数 (default: 12, min: 4, max: 40)
}

// 統合設定
export interface Settings {
  maxPlayers: number;
  gameMode: GameMode;
  normalSettings: NormalModeSettings;
  animationSettings: AnimationModeSettings;
  shiritoriSettings: ShiritoriModeSettings;
}
```

#### サーバー側エンティティ (`server/src/domain/entities.ts`)
- 同様の型定義を追加
- `createDefaultSettings()` を拡張してモード別デフォルト値を設定

### 12.2 WebSocketイベントの追加

```typescript
// クライアント → サーバー
| { type: 'update_settings'; payload: { settings: Partial<Settings> } }
| { type: 'select_mode'; payload: { mode: GameMode } }

// サーバー → クライアント
| { type: 'settings_updated'; payload: { settings: Settings } }
| { type: 'mode_changed'; payload: { mode: GameMode } }
```

### 12.3 ロビーUIのリデザイン

#### レイアウト構成
```
┌─────────────────────────────────────────────────────────┐
│  ルーム: XXXX-XXXX                          [URLコピー] │
├────────────────┬────────────────────────────────────────┤
│                │                                        │
│  プレイヤー    │     ゲームモード選択                   │
│  ──────────    │                                        │
│  👑 ホスト名   │  ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  ✓ Player2    │  │ ノーマル │ │アニメ    │ │しりとり│ │
│  ○ Player3    │  │  モード  │ │  ーション│ │  モード│ │
│  ...          │  │          │ │          │ │        │ │
│                │  │ [選択中] │ │          │ │        │ │
│  (4/12人)      │  └──────────┘ └──────────┘ └────────┘ │
│                │                                        │
│  [準備OK]      │  ── 設定 ──────────────────────────── │
│                │  お題時間: [20秒 ▼]                   │
│                │  描画時間: [90秒 ▼]                   │
│                │  回答時間: [50秒 ▼]                   │
│                │                                        │
├────────────────┴────────────────────────────────────────┤
│              [ゲームを開始] (ホストのみ)                │
└─────────────────────────────────────────────────────────┘
```

#### コンポーネント構成
```
LobbyPage.tsx
├── PlayerPanel.tsx (左パネル)
│   ├── PlayerList.tsx (既存を流用)
│   └── ReadyButton.tsx
├── ModeSelectionPanel.tsx (右パネル)
│   ├── ModeCard.tsx (各モードのカード)
│   └── ModeSettings.tsx (選択中モードの設定)
│       ├── NormalModeSettings.tsx
│       ├── AnimationModeSettings.tsx
│       └── ShiritoriModeSettings.tsx
└── StartGameButton.tsx
```

### 12.4 実装ステップ

#### Step 1: 型定義とデータモデル
1. `frontend/src/shared/types/index.ts` にGameMode、各モード設定の型を追加
2. `server/src/domain/entities.ts` に同様の型を追加
3. `createDefaultSettings()` を更新

#### Step 2: ストア更新
1. `roomStore.ts` に設定管理のステートを追加
2. 設定更新アクションを追加

#### Step 3: WebSocket対応
1. クライアント側イベント追加（`update_settings`, `select_mode`）
2. サーバー側ハンドラー追加
3. ブロードキャスト処理（設定変更時に全員に通知）

#### Step 4: UIコンポーネント作成
1. `ModeCard.tsx` - モード選択カード
2. `ModeSelectionPanel.tsx` - 右パネル全体
3. `PlayerPanel.tsx` - 左パネル（既存PlayerListをラップ）
4. 各モードの設定コンポーネント

#### Step 5: LobbyPage統合
1. 新レイアウトに変更
2. ホスト判定による編集制限
3. レスポンシブ対応（モバイルでは縦積み）

## UIデザイン詳細

### モードカード
- 選択中: ボーダーハイライト + チェックマーク
- ホスト以外: クリック不可（視覚的にグレーアウトはしない、カーソルのみ変更）
- 各カードにアイコンと簡単な説明文

### 設定パネル
- ホストのみ編集可能
- 他プレイヤーは現在の設定を閲覧のみ
- 変更時はリアルタイムで全員に反映

## モバイル対応
- 768px以下で縦積みレイアウト
- プレイヤーパネルは上部に折りたたみ可能
- モードカードは横スクロール or 縦積み

## 完了条件
- [ ] 3つのモードカードが表示される
- [ ] ホストがモードを選択できる
- [ ] ホストが各モードの設定を変更できる
- [ ] 設定変更が全プレイヤーにリアルタイム同期される
- [ ] 非ホストは閲覧のみ可能
- [ ] モバイルで適切に表示される
