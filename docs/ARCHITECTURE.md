# アーキテクチャ設計書

## システム概要

Drone Managerは、ドローンレース機体管理のためのWebアプリケーションです。
Supabase + Netlify構成で、サーバーレスアーキテクチャを採用しています。

## アーキテクチャ図

```
┌─────────────────────────────────────────────────────────┐
│                    Netlify (CDN)                         │
│  ┌───────────────────────────────────────────────────┐   │
│  │        静的ファイル (HTML/CSS/JS)                 │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Supabase                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Auth API   │  │  REST API    │  │  PostgreSQL  │  │
│  │              │  │  (PostgREST) │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                  │                  │          │
│         └──────────────────┴──────────────────┘          │
│                    Row Level Security                     │
└─────────────────────────────────────────────────────────┘
```

## データフロー

### 認証フロー
1. ユーザーがログイン/登録
2. Supabase Authで認証
3. JWTトークンを取得
4. 以降のリクエストにトークンを含める

### データアクセスフロー
1. フロントエンドからSupabase REST APIを呼び出し
2. JWTトークンで認証
3. SupabaseがRLSポリシーをチェック
4. 許可されたデータのみ返却

## データベース設計

### テーブル構造

#### users
- id (uuid, primary key)
- email (text, unique)
- username (text, unique)
- created_at (timestamp)
- updated_at (timestamp)

#### drone_types
- id (serial, primary key)
- user_id (uuid, foreign key → users.id)
- name (text)
- default_parts (jsonb)
- created_at (timestamp)
- updated_at (timestamp)

#### manufacturers
- id (serial, primary key)
- user_id (uuid, foreign key → users.id)
- name (text)
- created_at (timestamp)
- updated_at (timestamp)

#### drones
- id (serial, primary key)
- user_id (uuid, foreign key → users.id)
- name (text)
- type_id (integer, foreign key → drone_types.id)
- start_date (date)
- photo (text) - Base64エンコード
- status (text)
- created_at (timestamp)
- updated_at (timestamp)

#### parts
- id (serial, primary key)
- user_id (uuid, foreign key → users.id)
- drone_id (integer, foreign key → drones.id)
- name (text)
- start_date (date)
- manufacturer_id (integer, foreign key → manufacturers.id)
- replacement_history (jsonb)
- created_at (timestamp)
- updated_at (timestamp)

#### repairs
- id (serial, primary key)
- user_id (uuid, foreign key → users.id)
- drone_id (integer, foreign key → drones.id)
- part_id (integer, foreign key → parts.id)
- date (date)
- description (text)
- created_at (timestamp)
- updated_at (timestamp)

#### practice_days
- id (serial, primary key)
- user_id (uuid, foreign key → users.id)
- date (date)
- note (text)
- created_at (timestamp)
- updated_at (timestamp)

## セキュリティ

### Row Level Security (RLS)

すべてのテーブルでRLSを有効化し、以下のポリシーを実装：

1. **SELECT**: ユーザーは自分のデータのみ閲覧可能
2. **INSERT**: ユーザーは自分のデータのみ作成可能
3. **UPDATE**: ユーザーは自分のデータのみ更新可能
4. **DELETE**: ユーザーは自分のデータのみ削除可能

### 認証

- Supabase Authを使用
- JWT トークンベース
- セッション管理は自動

## フロントエンド構造

```
static/
├── css/
│   └── style.css
├── js/
│   ├── api.js          # Supabase API呼び出し
│   ├── auth.js         # 認証管理
│   ├── app.js          # アプリケーション初期化
│   ├── drone.js        # 機体管理
│   ├── parts.js        # パーツ管理
│   ├── calendar.js     # カレンダー機能
│   └── storage.js      # データストレージ抽象化
└── templates/
    └── index.html
```

## API設計

### 認証API
- `supabase.auth.signUp()` - ユーザー登録
- `supabase.auth.signIn()` - ログイン
- `supabase.auth.signOut()` - ログアウト
- `supabase.auth.getUser()` - 現在のユーザー取得

### データAPI
Supabase REST APIを使用（自動生成）

- `GET /rest/v1/drones` - 機体一覧取得
- `POST /rest/v1/drones` - 機体作成
- `GET /rest/v1/drones?id=eq.{id}` - 機体詳細取得
- `PATCH /rest/v1/drones?id=eq.{id}` - 機体更新
- `DELETE /rest/v1/drones?id=eq.{id}` - 機体削除

（他のテーブルも同様）

## 環境変数

### 開発環境
```bash
VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=[ANON_KEY]
```

### 本番環境
Netlifyの環境変数で設定

## デプロイメント

### Netlify設定
- ビルドコマンド: なし（静的ファイルのみ）
- 公開ディレクトリ: `/` (ルート)
- 環境変数: Supabase URLとAnon Key

### デプロイフロー
1. Gitリポジトリにプッシュ
2. Netlifyが自動検出
3. 静的ファイルをデプロイ
4. 環境変数を設定

## パフォーマンス

### 最適化
- 静的ファイルのCDN配信（Netlify）
- 画像のBase64エンコード（データベース保存）
- 必要に応じてSupabase Storageへの移行を検討

## 今後の拡張

- Supabase Storageで画像を保存
- Supabase Realtimeでリアルタイム更新
- Supabase Functionsでサーバーレス関数追加

