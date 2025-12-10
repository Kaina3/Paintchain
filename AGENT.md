# Agent Guide - Paintchain Project

このドキュメントは、AIエージェントがこのプロジェクトを理解し、適切に作業するためのガイドです。

## プロジェクト概要

**Paintchain**は、伝言ゲームの「耳打ち」を「お絵描き」と「文章」で交互に行うリアルタイムマルチプレイヤーゲームです。

### ゲームフロー

1. **お題入力フェーズ (`prompt`)**: 各プレイヤーが自分のお題（テキスト）を入力
2. **お絵描きフェーズ (`drawing`)**: 他のプレイヤーのお題を受け取り、絵で表現
3. **推測フェーズ (`guessing`)**: 他のプレイヤーの絵を見て、何を描いたか推測
4. **結果発表フェーズ (`result`)**: チェーンの変化を順番に表示

### 主な機能

- リアルタイムマルチプレイヤー（WebSocket使用）
- 円グラフ形式のタイマー表示（残り時間で色が変化）
- 時間切れ時の自動提出機能
- 切断時の自動再接続とゲーム状態の復元
- モバイル対応のレスポンシブデザイン

## 技術スタック

### Frontend
- **React 18** + **TypeScript**
- **Vite**: ビルドツール
- **Zustand**: 状態管理
- **TailwindCSS**: スタイリング
- **React Router**: ルーティング

### Backend
- **Node.js** + **TypeScript**
- **Fastify**: HTTPサーバーフレームワーク
- **@fastify/websocket**: WebSocket通信
- **@fastify/cors**: CORS対応

## プロジェクト構成

```
Paintchain/
├── frontend/                    # フロントエンドアプリケーション
│   ├── src/
│   │   ├── features/           # 機能別モジュール
│   │   │   ├── game/           # ゲーム関連機能
│   │   │   │   ├── components/ # ゲームコンポーネント
│   │   │   │   │   ├── DrawingCanvas.tsx    # お絵描きキャンバス
│   │   │   │   │   ├── GuessInput.tsx       # 推測入力
│   │   │   │   │   ├── PromptInput.tsx      # お題入力
│   │   │   │   │   ├── Timer.tsx            # 円グラフタイマー
│   │   │   │   │   ├── GameResult.tsx       # 結果表示
│   │   │   │   │   ├── SubmissionProgress.tsx
│   │   │   │   │   └── TurnIndicator.tsx
│   │   │   │   ├── pages/
│   │   │   │   │   ├── GamePage.tsx         # ゲームメインページ
│   │   │   │   │   └── PracticePage.tsx     # 練習モード
│   │   │   │   └── store/
│   │   │   │       └── gameStore.ts          # ゲーム状態管理
│   │   │   └── room/           # 部屋・ロビー機能
│   │   │       ├── components/
│   │   │       │   └── PlayerList.tsx        # プレイヤーリスト
│   │   │       ├── pages/
│   │   │       │   ├── HomePage.tsx          # ホームページ
│   │   │       │   └── LobbyPage.tsx         # ロビーページ
│   │   │       └── store/
│   │   │           └── roomStore.ts          # 部屋状態管理
│   │   └── shared/             # 共通モジュール
│   │       ├── components/
│   │       │   ├── Canvas.tsx                # 共通キャンバス
│   │       │   └── ReconnectingOverlay.tsx   # 再接続オーバーレイ
│   │       ├── hooks/
│   │       │   └── useWebSocket.ts           # WebSocketフック
│   │       ├── lib/
│   │       │   ├── api.ts                    # HTTP API
│   │       │   └── websocket.ts              # WebSocketクライアント
│   │       └── types/
│   │           └── index.ts                  # 共通型定義
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
│
├── server/                      # バックエンドアプリケーション
│   ├── src/
│   │   ├── application/        # アプリケーション層（ユースケース）
│   │   │   ├── gameUseCases.ts          # ゲームロジック
│   │   │   └── roomUseCases.ts          # 部屋管理ロジック
│   │   ├── domain/             # ドメイン層（エンティティ）
│   │   │   └── entities.ts              # Room, Player, Chain等
│   │   ├── infra/              # インフラ層
│   │   │   ├── http/
│   │   │   │   └── roomRoutes.ts        # HTTP APIルート
│   │   │   ├── ws/
│   │   │   │   └── wsHandler.ts         # WebSocketハンドラー
│   │   │   └── services/
│   │   │       └── idGenerator.ts       # ID生成サービス
│   │   └── index.ts            # エントリーポイント
│   ├── tsconfig.json
│   └── package.json
│
├── doc/                         # ドキュメント
│   ├── overview-prd.md         # PRD（製品要求ドキュメント）
│   └── plan/                   # 実装計画
│
├── README.md                    # プロジェクト概要
├── AGENT.md                     # このファイル
├── package.json                 # ルートpackage.json（workspace）
└── tsconfig.base.json          # 共通TypeScript設定
```

## アーキテクチャ

### フロントエンド

- **状態管理**: Zustandを使用した軽量な状態管理
  - `gameStore`: ゲーム状態（フェーズ、タイマー、提出状態など）
  - `roomStore`: 部屋状態（プレイヤーリスト、接続状態など）

- **通信**: WebSocketによるリアルタイム双方向通信
  - クライアント→サーバー: ユーザーアクション（提出、準備完了など）
  - サーバー→クライアント: 状態更新、フェーズ変更、タイマー同期など

- **コンポーネント設計**: 機能別・責務別に分割
  - `features/`: 機能固有のコンポーネント・ロジック
  - `shared/`: 再利用可能な共通コンポーネント

### バックエンド

- **クリーンアーキテクチャ風の層分離**:
  - `domain`: ビジネスロジックとエンティティ
  - `application`: ユースケース（ゲームロジック）
  - `infra`: 外部とのやり取り（HTTP、WebSocket）

- **インメモリデータ管理**: Map構造で部屋・チェーン・タイマーを管理

- **WebSocket通信**: 
  - コネクション管理（切断・再接続処理）
  - タイマー同期（10秒ごと）
  - フェーズ管理とタイムアウト処理

## 開発ワークフロー

### セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動（frontend + server同時起動）
npm run dev

# フロントエンドのみ
npm run dev:frontend

# サーバーのみ
npm run dev:server
```

### ビルド

```bash
# 全体ビルド
npm run build

# フロントエンドのみ
npm run build -w frontend

# サーバーのみ
npm run build -w server
```

### コード品質

```bash
# リント
npm run lint

# フォーマット
npm run format
```

## Git使用ガイド

### ブランチ戦略

- `main`: 本番デプロイ可能な安定版
- 機能開発は適宜ブランチを作成

### コミットメッセージ規約

[Conventional Commits](https://www.conventionalcommits.org/ja/v1.0.0/)に従います。

#### 基本フォーマット

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Type（必須）

- `feat`: 新機能の追加
- `fix`: バグ修正
- `docs`: ドキュメントのみの変更
- `style`: コードの動作に影響しない変更（フォーマット、セミコロン等）
- `refactor`: バグ修正や機能追加を伴わないコードの改善
- `perf`: パフォーマンス改善
- `test`: テストの追加・修正
- `build`: ビルドシステムや依存関係の変更
- `ci`: CI設定ファイルやスクリプトの変更
- `chore`: その他の変更（ビルドプロセス、補助ツール等）

#### Scope（任意）

変更の範囲を示す（例: `timer`, `canvas`, `websocket`, `auth`）

#### 例

```bash
# 新機能追加
git commit -m "feat(timer): 円グラフ形式のタイマー表示を実装"

# バグ修正
git commit -m "fix(websocket): 再接続時にゲーム状態が復元されない問題を修正"

# ドキュメント更新
git commit -m "docs: READMEにセットアップ手順を追加"

# リファクタリング
git commit -m "refactor(game): ゲームロジックをユースケースに分離"

# 破壊的変更（BREAKING CHANGE）
git commit -m "feat(api)!: WebSocketメッセージフォーマットを変更

BREAKING CHANGE: メッセージのpayload構造が変更されました"
```

#### 複数行コミットメッセージ

```bash
git commit -m "feat(timer): 時間切れ時の自動提出機能を実装" -m "
- DrawingCanvas、PromptInput、GuessInputに自動提出を追加
- useRefを使用してクロージャ問題を解決
- サーバー側のタイムアウトに2秒の猶予を追加
"
```

### よく使うGitコマンド

```bash
# 変更確認
git status
git diff

# ステージング
git add <file>
git add -A  # すべての変更

# コミット
git commit -m "type(scope): description"

# プッシュ
git push origin <branch-name>

# ブランチ作成・切り替え
git checkout -b <new-branch>
git checkout <existing-branch>

# 変更の取り消し（未コミット）
git checkout -- <file>
git restore <file>

# ログ確認
git log --oneline
git log --graph --oneline --all
```

## 重要な実装パターン

### 1. WebSocket通信

クライアント側は`useWebSocket`フックを使用：

```typescript
const { send, connected } = useWebSocket(roomId);

// メッセージ送信
send({ type: 'submit_drawing', payload: { imageData: '...' } });
```

### 2. タイマー管理

- サーバー側でdeadlineを管理
- クライアント側で250msごとに残り時間を計算・表示
- 10秒ごとにサーバーと同期

### 3. 時間切れ処理

- クライアント側: `Timer`の`onTimeout`で自動提出
- サーバー側: タイムアウト2秒前にクライアントの提出を待つ猶予期間
- 提出なしの場合: サーバーがデフォルト値を設定

### 4. 再接続処理

- WebSocket切断時に自動再接続を試行
- 再接続時に`rejoin_room`メッセージでゲーム状態を復元
- 30秒の猶予期間（サーバー側）

## トラブルシューティング

### WebSocketが接続できない

```bash
# サーバーが起動しているか確認
curl http://localhost:3001/health

# ポートが使用されているか確認
lsof -i :3001
```

### ビルドエラー

```bash
# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install

# キャッシュをクリア
npm run build -- --force
```

### TypeScriptエラー

```bash
# 型チェック
npx tsc --noEmit

# 特定のワークスペース
npx tsc --noEmit -p frontend/tsconfig.json
```

## 今後の拡張予定

- ユーザー認証機能
- 永続化（データベース導入）
- リプレイ機能の強化
- ランキング・スコア機能
- カスタムルーム設定の拡張

---

**Note**: このドキュメントは開発の進行に応じて随時更新してください。
