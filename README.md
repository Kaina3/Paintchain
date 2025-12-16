# Paintchain 🎨

伝言ゲームの「耳打ち」の部分を「お絵描き」と「文章」で交互に行うパーティーゲーム。

## ゲームの流れ

1. **お題入力フェーズ**: 各プレイヤーが自分のお題を入力
2. **お絵描きフェーズ**: 他のプレイヤーのお題を絵で表現
3. **推測フェーズ**: 絵を見て何を描いたか推測
4. **結果発表**: チェーンがどのように変化したか確認して楽しむ

## 主な機能

- 🎮 リアルタイムマルチプレイヤー対応
- ⏱️ 円グラフ形式のタイマー表示（残り時間に応じて色が変化）
- 🔄 時間切れ時の自動提出機能
- 📱 モバイル対応のレスポンシブデザイン
- 🔌 切断時の自動再接続機能

## 技術スタック

- **Frontend**: React + TypeScript + Vite + Zustand + TailwindCSS
- **Backend**: Node.js + Fastify + WebSocket

## セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動（frontend + server）
npm run dev
```

## 開発コマンド

```bash
# フロントエンドのみ起動
npm run dev:frontend

# サーバーのみ起動
npm run dev:server

# ビルド
npm run build

# リント
npm run lint

# フォーマット
npm run format
```

## デプロイ（Render）

### 静的サイト（Frontend）

Renderで静的サイトとしてフロントエンドをデプロイする場合:

- **Build Command**: `npm run build`
- **Publish Directory**: `dist`

`_redirects`ファイルが自動的にデプロイされ、全てのルートが`index.html`にリダイレクトされるため、React Routerの動的ルート（`/room/:roomId`など）が正しく動作します。

### バックエンド（Server）

WebSocketサーバーは別途デプロイし、フロントエンドの環境変数でAPIエンドポイントを設定してください。

## プロジェクト構成

```
├── frontend/          # React フロントエンド
│   └── src/
│       ├── features/  # 機能別モジュール
│       │   ├── game/  # ゲーム関連（Canvas, Timer, 結果表示など）
│       │   └── room/  # 部屋管理（ロビー、プレイヤーリスト）
│       └── shared/    # 共通コンポーネント・フック
├── server/            # Fastify バックエンド
│   └── src/
│       ├── application/  # ユースケース
│       ├── domain/       # エンティティ
│       └── infra/        # HTTP/WebSocket ハンドラー
└── doc/               # ドキュメント
```

## ライセンス

MIT
