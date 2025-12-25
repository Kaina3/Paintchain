# 17. プレイヤーカラー機能

## 概要

各プレイヤーに固有のカラーを割り当てる機能を実装する。デフォルトで自動割り当てされるが、ロビーでアイコンをクリックして好きな色に変更できる。色の重複は禁止し、最大12人まで対応。

## 目的

- プレイヤーの識別性向上
- クイズモードの弾幕で誰の回答か一目で分かるようにする
- 将来的に他モードでも活用可能な基盤を作る

## カラーパレット

キャンバスと同じ12色を使用（`COLORS`配列から流用）：

```typescript
export const PLAYER_COLORS = [
  '#FF0000', // Red
  '#0000FF', // Blue
  '#00AA00', // Green
  '#FFCC00', // Yellow
  '#FF6600', // Orange
  '#9900FF', // Purple
  '#FF69B4', // Pink
  '#00BFFF', // Light Blue
  '#7CFC00', // Yellow Green
  '#8B4513', // Brown
  '#000000', // Black
  '#808080', // Gray（白は見にくいのでグレーに変更）
];
```

> 注: 白（#FFFFFF）は背景と被って見にくいため、グレー（#808080）に置き換える

## 実装タスク

### Phase 1: データモデルとサーバー側

#### 1.1 型定義の更新

**server/src/domain/entities.ts**
```typescript
export interface Player {
  id: string;
  name: string;
  ready: boolean;
  connected: boolean;
  color: string;  // 追加: プレイヤーカラー（hex）
}
```

**frontend/src/shared/types/index.ts**
```typescript
export interface Player {
  id: string;
  name: string;
  ready: boolean;
  connected: boolean;
  color: string;  // 追加
}
```

#### 1.2 カラー定数の共有

**shared/constants/playerColors.ts**（新規作成）
- サーバーとフロントで共通のカラー定数を定義
- または、server側とfrontend側それぞれに同じ定数を定義

#### 1.3 カラー割り当てロジック

**server/src/application/roomUseCases.ts**
- `joinRoom`: 入室時に未使用のカラーを自動割り当て
- `changePlayerColor`: カラー変更リクエストを処理
  - 他プレイヤーが使用中のカラーはエラーを返す
  - 変更成功時は`players_updated`をブロードキャスト

#### 1.4 WebSocketイベント追加

**クライアント → サーバー:**
```typescript
| { type: 'change_color'; payload: { color: string } }
```

**サーバー → クライアント:**
- 既存の`players_updated`イベントでカラー情報を含めて送信

### Phase 2: フロントエンド - ロビーUI

#### 2.1 カラーピッカーコンポーネント

**frontend/src/features/room/components/ColorPicker.tsx**（新規）

```tsx
interface ColorPickerProps {
  currentColor: string;
  usedColors: string[];  // 他プレイヤーが使用中のカラー
  onSelect: (color: string) => void;
  onClose: () => void;
}
```

- ポップアップ形式で表示
- 使用中のカラーはグレーアウト＆選択不可
- 自分の現在のカラーにはチェックマーク表示
- 外側クリックで閉じる

#### 2.2 PlayerListの更新

**frontend/src/features/room/components/PlayerList.tsx**

- アイコンの背景色をプレイヤーカラーで表示
- 自分のアイコンをクリック可能に
- クリック時にColorPickerをポップアップ表示
- 色変更時にサーバーへ`change_color`イベント送信

#### 2.3 roomStoreの更新

**frontend/src/features/room/store/roomStore.ts**

- カラー変更のアクション追加（不要かも - WebSocket経由で更新されるため）

### Phase 3: クイズモード対応

#### 3.1 弾幕へのカラー適用

**frontend/src/features/game/components/QuizRound.tsx**

`QuizFeedItem`にプレイヤーカラーを追加：
```typescript
export interface QuizFeedItem {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: string;  // 追加
  text: string;
  kind: 'guess' | 'correct' | 'system';
  createdAt: number;
  rank?: number;
}
```

`DanmakuItem`コンポーネントで色を適用：
```tsx
<span style={{ color: item.playerColor }}>
  {item.playerName}: {item.text}
</span>
```

#### 3.2 スコアボードへのカラー適用

スコアボード表示でもプレイヤーカラーを使用（背景色またはアクセント色として）

### Phase 4: 他モードへの展開（将来）

以下は将来の拡張として記録：

- **ノーマルモード**: 結果画面でのプレイヤー識別
- **アニメーションモード**: フレーム作成者の表示
- **しりとりモード**: ギャラリーでの描画者表示
- **全モード共通**: ターン表示、プレイヤーリスト

## ファイル変更一覧

### 新規作成
- `frontend/src/features/room/components/ColorPicker.tsx`

### 変更
- `server/src/domain/entities.ts` - Player型にcolor追加
- `server/src/application/roomUseCases.ts` - カラー割り当て・変更ロジック
- `server/src/infra/ws/wsHandler.ts` - change_colorイベント処理
- `frontend/src/shared/types/index.ts` - Player型にcolor追加
- `frontend/src/features/room/components/PlayerList.tsx` - カラー表示・選択UI
- `frontend/src/features/game/components/QuizRound.tsx` - 弾幕カラー対応
- `server/src/application/gameModes/quizMode.ts` - feedにカラー情報追加

## UI仕様

### ロビーでのカラー選択

```
┌─────────────────────────────────┐
│  プレイヤー                      │
│  ┌────────────────────────────┐ │
│  │ 🔴 Taro     👑ホスト  ✅   │ │  ← アイコンクリックで↓が開く
│  └────────────────────────────┘ │
│  ┌────────────────────────────┐ │
│  │ 🔵 Hanako   あなた    ⭕   │ │
│  └─┬──────────────────────────┘ │
│    │  ┌─────────────────┐       │
│    └──│ 色を選択         │       │
│       │ 🔴 🔵 🟢 🟡     │       │  ← 使用中はグレーアウト
│       │ 🟠 🟣 🩷 🩵     │       │
│       │ 🟩 🟤 ⚫ ⚪     │       │
│       └─────────────────┘       │
└─────────────────────────────────┘
```

### 弾幕表示（クイズモード）

```
┌─────────────────────────────────────┐
│  🎨 描画中...                        │
│                                     │
│  ← Taro: りんご ─────────────────   │  ← 赤色
│      ← Hanako: バナナ ───────────   │  ← 青色
│          ← Jiro: りんご！ 🎉 ─────  │  ← 緑色（正解）
│                                     │
└─────────────────────────────────────┘
```

## 注意事項

1. **既存ルームへの後方互換性**: カラーが未設定の既存プレイヤーには、rejoin時にデフォルトカラーを割り当てる

2. **切断・再接続時**: カラーは保持される（プレイヤーデータに含まれるため）

3. **ホスト移譲時**: カラーは変わらない（カラーとホスト権限は独立）

4. **満員時のカラー**: 12人が全て異なるカラーを使用している状態で、13人目は入室不可（maxPlayersで制限）

## テスト項目

- [ ] 入室時にデフォルトカラーが割り当てられる
- [ ] ロビーでアイコンをクリックするとカラーピッカーが表示される
- [ ] 他プレイヤーが使用中のカラーは選択できない
- [ ] カラー変更が全プレイヤーに同期される
- [ ] クイズモードの弾幕がプレイヤーカラーで表示される
- [ ] 再接続時にカラーが保持される
- [ ] 12人全員が異なるカラーを持てる
