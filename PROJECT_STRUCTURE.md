# プロジェクト構造

## 概要

このプロジェクトはSupabase + Netlify構成の静的Webアプリケーションです。

## ディレクトリ構造

```
drone_manager/
├── docs/                          # ドキュメント
│   ├── ARCHITECTURE.md            # アーキテクチャ設計書
│   ├── DEPLOYMENT.md              # デプロイメントガイド
│   ├── IMPLEMENTATION_STATUS.md   # 実装進捗状況
│   ├── SUPABASE_SETUP.md          # Supabaseセットアップガイド
│   └── supabase_rls_policies.sql  # RLSポリシーSQL
├── static/                        # 静的ファイル
│   ├── css/
│   │   └── style.css              # スタイルシート
│   └── js/                        # JavaScriptモジュール
│       ├── api.js                 # Supabase API呼び出し
│       ├── app.js                 # アプリケーション初期化
│       ├── auth.js                # 認証管理
│       ├── calendar.js            # カレンダー機能
│       ├── drone.js               # 機体管理
│       ├── parts.js               # パーツ管理
│       ├── storage.js             # データストレージ抽象化
│       └── supabase.js            # Supabase Client初期化
├── templates/                     # HTMLテンプレート
│   └── index.html                 # メインHTML
├── .env.example                   # 環境変数テンプレート
├── .gitignore                     # Git除外設定
├── netlify.toml                   # Netlify設定
├── README.md                      # プロジェクト説明
├── SUPABASE_MIGRATION.md          # Supabase移行計画
└── PROJECT_STRUCTURE.md           # このファイル
```

## ファイル説明

### ドキュメント

- **docs/ARCHITECTURE.md**: システムアーキテクチャの詳細説明
- **docs/DEPLOYMENT.md**: Netlifyへのデプロイ手順
- **docs/IMPLEMENTATION_STATUS.md**: 実装の進捗状況
- **docs/SUPABASE_SETUP.md**: Supabaseプロジェクトのセットアップ手順
- **docs/supabase_rls_policies.sql**: Row Level SecurityポリシーのSQLスクリプト
- **SUPABASE_MIGRATION.md**: FlaskからSupabaseへの移行計画

### 設定ファイル

- **.env.example**: 環境変数のテンプレート（`.env`にコピーして使用）
- **.gitignore**: Gitで除外するファイル・ディレクトリ
- **netlify.toml**: Netlifyのデプロイ設定

### ソースコード

- **templates/index.html**: メインのHTMLファイル
- **static/css/style.css**: アプリケーションのスタイル
- **static/js/**: JavaScriptモジュール群
  - `supabase.js`: Supabase Clientの初期化
  - `api.js`: Supabase REST APIへの呼び出し
  - `auth.js`: 認証管理
  - `app.js`: アプリケーションの初期化とルーティング
  - `drone.js`: 機体管理機能
  - `parts.js`: パーツ管理機能
  - `calendar.js`: カレンダー機能
  - `storage.js`: データストレージの抽象化レイヤー

## 削除されたファイル

以下のファイルはSupabase + Netlify移行により不要になったため削除されました：

- `server.py`: Flaskサーバー
- `database.py`: Flask用データベース接続
- `pyproject.toml`: Python依存関係
- `uv.lock`: Python依存関係のロックファイル
- `render.yaml`: Render用設定
- `MIGRATION.md`: 古い移行ドキュメント（localStorage → SQLite）
- `DESIGN.md`: 古い設計書
- `__pycache__/`: Pythonキャッシュ
- `flask_session/`: Flaskセッションファイル

## 開発環境

### 必要なもの

- 静的ファイルサーバー（開発用）
- Supabaseアカウント
- Netlifyアカウント（デプロイ用）

### 不要なもの

- Python環境
- Flask
- データベースサーバー（Supabaseが提供）

## デプロイ

詳細は [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) を参照してください。

