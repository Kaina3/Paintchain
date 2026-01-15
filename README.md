# Paintchain 🎨

様々なモードで遊べるお絵描きゲームプラットフォーム

![Lobby Screenshot](img/lobby_img.png)

## 概要

複数のお絵描きゲームモードを楽しめるマルチプレイヤーWebアプリケーションです。プレイヤーはアーティストとして様々な創作ゲームに参加できます。

## ゲームモード

### 🖼️ スタンダードモード
伝言ゲーム形式のお絵描きゲーム。お題を描き、次の人がそれを見て何か推測し、またそれを描く...を繰り返します。
- お題入力 → 描画 → 推測 のサイクル
- 結果表示順序の選択（最初から/最後から）

### 🎬 アニメーションモード
みんなで協力してアニメーションを作成します。
- 前フレームを参考に次のフレームを描画
- オニオンスキン機能で前のフレームを半透明表示
- 完成後はタイムラプス＆アニメーション再生

### 📝 絵しりとりモード
絵でしりとりをするゲームモード。
- ひらがなでの回答入力
- リアルタイムでギャラリー表示
- 順番にターンが回ってくる形式

### ❓ クイズモード
一人が出題者となり絵を描き、他のプレイヤーが答えを当てます。
- **リアルタイム形式**: 描画中にリアルタイムで回答
- **先描きモード**: 完成後に一斉回答
- ニコニコ風の弾幕コメント表示
- カテゴリ別お題（動物、食べ物、アニメキャラ、歴史など15カテゴリ）
- 詳細なスコア設定（順位別得点、出題者ボーナスなど）

## 主な機能

### 🎨 お絵描き機能
- **多彩な描画ツール**: ブラシ、消しゴム、バケツ、スタンプ、直線ツール
- **カスタマイズ**: 色選択（12色）、透明度調整、ブラシサイズ調整
- **スタンプ**: 丸、楕円、四角、三角、星、ハートなど7種類
- **タイムラプス記録**: 描画過程を記録・再生可能
- **オニオンスキン**: アニメーションモードで前フレームを半透明表示
- **キーボード描画**: Wキー押しながらマウス移動で描画

### 🎭 プレイヤー管理
- **12種類のアバター**: 名画をモチーフにしたユニークなアバター
- **プレイヤーカラー**: 各アバターに対応した専用カラー（重複なし）
- **ドラッグ&ドロップ**: ホストは順番を自由に並び替え可能
- **準備状態管理**: 各プレイヤーの準備完了状態を表示

### 🏛️ 美術館テーマUI
- 美術館風の背景とフレームデザイン
- 名画風のゴールドフレーム装飾
- セリフ体フォントとクラシカルな配色
- ペイント飛沫アニメーション
- 統一感のあるビジュアルデザイン

### 🎮 ゲーム体験
- ⏱️ 円グラフ形式のタイマー（残り時間で色が変化）
- 🔄 時間切れ時の自動提出
- 📊 提出進捗のリアルタイム表示
- 💬 ロビーチャット（弾幕形式）
- 🔌 自動再接続機能
- 📱 モバイル対応レスポンシブデザイン
- 🌐 部屋共有リンク生成

## 技術スタック

### Frontend
- **フレームワーク**: React 18 + TypeScript
- **ビルドツール**: Vite
- **状態管理**: Zustand
- **スタイリング**: TailwindCSS + カスタムCSS
- **ルーティング**: React Router
- **リアルタイム通信**: WebSocket

### Backend
- **ランタイム**: Node.js
- **Webフレームワーク**: Fastify
- **WebSocket**: @fastify/websocket
- **CORS**: @fastify/cors
- **型安全性**: TypeScript

### アーキテクチャ
- **フロントエンド**: コンポーネントベース、機能別モジュール構成
- **バックエンド**: Clean Architecture（Domain, Application, Infrastructure層）
- **通信**: WebSocketによる双方向リアルタイム通信
- **状態管理**: クライアント側はZustand、サーバー側はインメモリ

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

## デプロイ

### Frontend（静的サイト）

Renderなどの静的サイトホスティングサービスでデプロイ:

- **Build Command**: `npm run build`
- **Publish Directory**: `frontend/dist`
- **環境変数**: `VITE_WS_URL` にWebSocketサーバーのURLを設定

`_redirects`ファイルによりSPAルーティングが正しく動作します。

### Backend（WebSocketサーバー）

Node.jsをサポートするプラットフォーム（Render Web Service等）でデプロイ:

- **Build Command**: `npm run build`
- **Start Command**: `npm run start`
- **環境変数**: 
  - `PORT`: サーバーポート（デフォルト4000）
  - `CORS_ORIGIN`: フロントエンドのURLを設定

## 開発のヒント

### 新しいゲームモードの追加

1. `server/src/application/gameModes/` に新モードのハンドラーを作成
2. `GameModeHandler` インターフェースを実装
3. `server/src/application/gameModes/index.ts` に登録
4. フロントエンドに対応するコンポーネントを追加

### デバッグ

- WebSocket通信はブラウザの開発者ツールのNetworkタブで確認可能
- `localStorage` に部屋IDとプレイヤー情報が保存されます
- Practice Pageでキャンバス機能を単独テスト可能

## プロジェクト構成

```
├── frontend/                    # React フロントエンド
│   ├── public/
│   │   ├── avatars/            # プレイヤーアバター画像（名画モチーフ）
│   │   └── img/                # 背景画像など
│   └── src/
│       ├── features/           # 機能別モジュール
│       │   ├── game/          # ゲーム画面
│       │   │   ├── components/  # Canvas, Timer, 各モード用コンポーネント
│       │   │   ├── pages/       # GamePage, PracticePage
│       │   │   └── store/       # ゲーム状態管理（Zustand）
│       │   └── room/          # 部屋管理
│       │       ├── components/  # Lobby, PlayerList, ModeSelection
│       │       ├── pages/       # HomePage, LobbyPage
│       │       └── store/       # 部屋状態管理（Zustand）
│       ├── shared/            # 共通モジュール
│       │   ├── components/    # Canvas, PaintSplash, Reconnecting
│       │   ├── hooks/         # useWebSocket
│       │   ├── lib/           # websocket, api
│       │   └── types/         # 型定義
│       └── assets/           # 画像・背景素材
│
├── server/                     # Node.js バックエンド
│   └── src/
│       ├── application/       # アプリケーション層
│       │   ├── gameModes/    # 各モードのゲームロジック
│       │   ├── gameUseCases.ts
│       │   └── roomUseCases.ts
│       ├── domain/           # ドメイン層
│       │   ├── entities.ts   # Room, Player, Chain等
│       │   └── gameMode.ts   # ゲームモードインターフェース
│       ├── infra/            # インフラ層
│       │   ├── http/         # REST API
│       │   ├── ws/           # WebSocketハンドラー
│       │   └── services/     # ID生成など
│       └── data/             # マスタデータ
│           └── quizPrompts.ts # クイズお題データ
│
└── doc/                       # 設計ドキュメント
    ├── overview-prd.md
    └── plan/                 # 各機能の設計書
```

## ライセンス

MIT
