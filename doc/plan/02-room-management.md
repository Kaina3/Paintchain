# Phase 02: ルーム管理

## 概要
ルーム作成・参加・退出の基本フローを実装する。

## ゴール
- ユーザーがニックネームを入力してルームを作成できる。
- 他のユーザーが URL（ルーム ID）で参加できる。
- プレイヤー一覧がリアルタイムで同期される。

---

## 成果物
- ルーム作成 API / WS イベント
- ルーム参加 API / WS イベント
- プレイヤー一覧の同期
- フロント: ホーム画面、ロビー画面

---

## 機能要件

### サーバ側
| 機能 | エンドポイント / イベント | 説明 |
|------|--------------------------|------|
| ルーム作成 | `POST /rooms` | ルーム ID 発行、作成者を host として登録 |
| ルーム参加 | `WS: join_room` | ニックネーム + ルーム ID で参加 |
| プレイヤー一覧取得 | `WS: players_updated` | 参加/退出時に全員へブロードキャスト |
| ルーム退出 | `WS: leave_room` / 切断検知 | プレイヤーリストから除外 |

### フロント側
| 画面 | 機能 |
|------|------|
| ホーム (`/`) | ニックネーム入力、ルーム作成ボタン、ルーム ID 入力して参加 |
| ロビー (`/room/:id`) | プレイヤー一覧表示、準備ボタン、URL 共有ボタン |

---

## データモデル

```ts
interface Room {
  id: string;          // 6文字の英数字など
  status: 'waiting' | 'playing' | 'finished';
  hostId: string;
  players: Player[];
  settings: Settings;
  createdAt: Date;
}

interface Player {
  id: string;          // UUID
  name: string;
  ready: boolean;
  connected: boolean;
}

interface Settings {
  maxPlayers: 12;
  drawingTimeSec: 90;
  guessTimeSec: 50;
}
```

---

## タスク

### サーバ
- [x] Room エンティティ定義
- [x] Player エンティティ定義
- [x] RoomRepository (in-memory / Redis)
- [x] `POST /rooms` — ルーム作成
- [x] `GET /rooms/:id` — ルーム情報取得
- [x] WS: `join_room` ハンドラ
- [x] WS: `leave_room` ハンドラ
- [x] WS: `players_updated` ブロードキャスト

### フロント
- [x] ホーム画面 UI
- [x] ニックネーム入力フォーム
- [x] ルーム作成 → ID 取得 → 遷移
- [x] ルーム参加フォーム（ID 入力 or URL パラメータ）
- [x] ロビー画面 UI
- [x] WebSocket 接続管理 (hook)
- [x] プレイヤー一覧コンポーネント
- [x] URL 共有ボタン (clipboard API)

---

## 受け入れ条件
- [x] ルーム作成後、6 文字程度の ID が発行される
- [x] 別ブラウザ/タブから同じ ID で参加できる
- [x] 参加/退出がリアルタイムで反映される
- [x] 12 人を超える参加は拒否される

---

## 依存関係
- Phase 01 完了（プロジェクト起動可能）

## 次フェーズへの引き継ぎ
- Room / Player の永続化基盤
- WS 接続管理の仕組み
