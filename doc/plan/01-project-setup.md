# Phase 01: プロジェクトセットアップ

## 概要
フロントエンド・バックエンドの基盤を構築し、開発環境を整える。

## ゴール
- モノレポ構成で frontend / server を管理できる状態にする。
- ローカルで両方を起動し、疎通確認ができる。

---

## 成果物
- `frontend/` — Vite + React + TypeScript プロジェクト
- `server/` — Node.js + Fastify + TypeScript プロジェクト
- ルート `package.json` (workspaces)
- 共通設定: ESLint, Prettier, tsconfig base

---

## タスク

### 1. リポジトリ初期化
- [x] `git init` 済み
- [x] `.gitignore` 作成（node_modules, dist, .env など）
- [x] README.md 作成

### 2. モノレポ構成
- [x] ルート `package.json` 作成（npm workspaces or pnpm）
- [x] `frontend/package.json` 作成
- [x] `server/package.json` 作成

### 3. フロントエンド初期化
- [x] Vite + React + TypeScript テンプレート生成
- [x] Zustand インストール
- [x] TailwindCSS or CSS Modules 設定（任意）
- [x] dev サーバ起動確認 (`npm run dev`)

### 4. バックエンド初期化
- [x] Fastify + TypeScript セットアップ
- [x] WebSocket プラグイン (`@fastify/websocket`) 追加
- [x] ヘルスチェック API `/health` 実装
- [x] dev サーバ起動確認 (`npm run dev`)

### 5. 共通設定
- [x] ESLint 共通設定（ルートに `.eslintrc`）
- [x] Prettier 設定
- [x] tsconfig base（paths alias など）

### 6. 疎通確認
- [x] フロントから `/health` を fetch して表示
- [x] CORS 設定確認

---

## 依存関係
- なし（最初のフェーズ）

## 次フェーズへの引き継ぎ
- 起動可能な frontend / server
- 基本的な開発ツールチェーン
