# Phase 04: お題入力フェーズ

## 概要
ゲーム開始後、各プレイヤーが最初のお題（テキスト）を入力する。

## ゴール
- 全員がお題を入力して提出できる。
- 全員提出完了後、次のフェーズ（描画）へ自動遷移。
- 制限時間（50秒）でタイムアウト → 空文字で自動提出。

---

## 成果物
- お題入力画面
- お題提出 WS イベント
- タイマー（サーバ主導）
- Chain データ構造の初期化

---

## 機能要件

### サーバ側
| イベント | 方向 | 説明 |
|----------|------|------|
| `phase_changed` | Server → All | 現在のフェーズを通知 |
| `submit_prompt` | Client → Server | お題テキストを提出 |
| `submission_received` | Server → All | 誰が提出したか通知（プログレス表示用） |
| `timer_tick` | Server → All | 残り時間を定期通知（オプション） |
| `phase_complete` | Server → All | 全員提出 or タイムアウトで次へ |

### フロント側
| 機能 | 説明 |
|------|------|
| お題入力フォーム | テキスト入力 + 提出ボタン |
| タイマー表示 | 残り時間をカウントダウン |
| 提出状況 | 「3/5 人提出」のような表示 |

---

## データモデル

```ts
interface Chain {
  id: string;
  roomId: string;
  ownerPlayerId: string;  // お題を最初に書いた人
  entries: Entry[];
}

interface Entry {
  order: number;          // 0, 1, 2, ...
  type: 'text' | 'drawing';
  authorId: string;
  payload: string;        // text or imageUrl
  submittedAt: Date;
}
```

---

## タスク

### サーバ
- [x] Chain エンティティ定義
- [x] Entry エンティティ定義
- [x] ChainRepository (in-memory / Redis)
- [x] ゲーム開始時に各プレイヤー用 Chain を初期化
- [x] `submit_prompt` ハンドラ
- [x] 提出状況の管理（Set で管理）
- [x] タイマー管理（setTimeout / setInterval）
- [x] タイムアウト時の自動提出処理
- [x] 全員提出完了チェック → `phase_complete`

### フロント
- [x] お題入力画面 UI
- [x] テキスト入力フォーム（140文字程度上限）
- [x] 提出ボタン + 提出済み状態表示
- [x] タイマーコンポーネント
- [x] 提出状況表示
- [x] `phase_complete` 受信 → 次画面へ遷移

---

## 受け入れ条件
- [x] お題を入力して提出できる
- [x] 提出後は編集不可
- [x] 全員提出で自動的に次フェーズへ
- [x] 50秒経過で未提出者は空文字で自動提出される
- [x] タイマーが全員で同期している

---

## 依存関係
- Phase 03 完了（ゲーム開始可能）

## 次フェーズへの引き継ぎ
- Chain / Entry データ構造
- タイマー管理の仕組み
- フェーズ遷移ロジック
