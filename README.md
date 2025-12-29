# ドローンレース機体管理Webアプリ

ドローンレースで使用する複数の機体（5〜10機）を効率的に管理するためのWebアプリケーションです。

## 機能

- **機体管理**: 機体の登録、一覧表示、詳細表示
- **機体の種類管理**: カスタム可能な機体の種類（5inch、Whoop、FPV Wingなど）
- **パーツ管理**: 各機体に使用しているパーツの登録と管理
- **交換履歴**: パーツの交換履歴の記録と確認
- **修理履歴**: 機体やパーツの修理履歴の記録と確認
- **カレンダー機能**: パーツ交換日、修理日、練習日をカレンダー上で確認

## 技術スタック

- **フロントエンド**: HTML/CSS/バニラJavaScript（ES6+ モジュール）
- **バックエンド**: Supabase（PostgreSQL + REST API + Auth）
- **ホスティング**: Netlify（静的ホスティング）
- **データベース**: Supabase PostgreSQL
- **認証**: Supabase Auth（JWT トークンベース）
- **セキュリティ**: Row Level Security (RLS)

## アーキテクチャ

このアプリケーションはサーバーレスアーキテクチャを採用しています：

```
[HTML/CSS/JS] → Netlify (静的ホスティング)
    ↓
[Supabase REST API + Auth]
    ↓
[Supabase PostgreSQL]
```

詳細は [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) を参照してください。

## セットアップ

### 前提条件

- Supabaseアカウント（無料プランで利用可能）
- Netlifyアカウント（無料プランで利用可能）
- 静的ファイルサーバー（開発用、オプション）

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com) でアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクトのAPI認証情報を取得（Settings → API）

詳細は [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md) を参照してください。

### 2. データベーススキーマの作成

Supabaseダッシュボードの「SQL Editor」で以下のSQLを実行：

1. テーブル作成: [docs/SUPABASE_SETUP.md](./docs/SUPABASE_SETUP.md) の「データベーススキーマの作成」セクションを参照
2. RLSポリシー設定: [docs/supabase_rls_policies.sql](./docs/supabase_rls_policies.sql) を実行

### 3. 環境変数の設定

`.env.example`を`.env`にコピーし、Supabaseの認証情報を設定：

```bash
cp .env.example .env
```

`.env`ファイルを編集：
```bash
VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
```

### 4. ローカル開発環境（オプション）

静的ファイルを配信するための簡単なHTTPサーバーを使用：

```bash
# Python 3の場合
python -m http.server 8000

# Node.jsの場合
npx serve .

# または、VS CodeのLive Server拡張機能を使用
```

ブラウザで `http://localhost:8000` にアクセス

### 5. Netlifyへのデプロイ

1. [Netlify](https://netlify.com) でアカウントを作成
2. GitHubリポジトリと連携、または手動でデプロイ
3. 環境変数を設定：
   - `VITE_SUPABASE_URL`: SupabaseプロジェクトURL
   - `VITE_SUPABASE_ANON_KEY`: Supabase Anon Key

詳細は [netlify.toml](./netlify.toml) を参照してください。

## 使用方法

### 初回アクセス

1. アプリケーションにアクセス
2. 「新規登録」ボタンをクリック
3. ユーザー名、パスワード（8文字以上）、メールアドレス（任意）を入力
4. 登録後、自動的にログインされます

### 機体の追加

1. ホーム画面で「機体を追加」ボタンをクリック
2. 機体名、種類、使用開始日、写真を入力
3. 「追加」ボタンをクリック

### 機体の種類の管理

1. ホーム画面で「カテゴリー管理」ボタンをクリック
2. 新しい種類を追加、または既存の種類を削除

### パーツの追加

1. 機体詳細画面で「パーツを追加」ボタンをクリック
2. パーツ名と使用開始日を入力
3. 「追加」ボタンをクリック

### 交換履歴の追加

1. パーツ詳細画面で「交換履歴を追加」ボタンをクリック
2. 交換日と内容を入力
3. 「追加」ボタンをクリック

### 修理履歴の追加

1. 機体詳細画面で「修理履歴を追加」ボタンをクリック
2. 修理日と内容を入力
3. 「追加」ボタンをクリック

### カレンダーの確認

1. ナビゲーションバーで「カレンダー」をクリック
2. 月次カレンダーでイベントを確認
3. 「練習日を追加」ボタンで練習日を登録

## セキュリティ

- **Row Level Security (RLS)**: すべてのテーブルでRLSを有効化し、ユーザーは自分のデータのみアクセス可能
- **Supabase Auth**: JWT トークンベースの認証
- **パスワード**: Supabaseが自動的にハッシュ化して保存
- **SQLインジェクション対策**: SupabaseのPostgRESTが自動的にパラメータ化クエリを使用

## データベース

データはSupabase PostgreSQLに保存されます。ユーザーごとにデータが分離され、RLSポリシーによって保護されています。

### テーブル構造

- `profiles`: ユーザープロファイル情報
- `drone_types`: 機体の種類
- `manufacturers`: メーカー情報
- `drones`: 機体情報
- `parts`: パーツ情報
- `repairs`: 修理履歴
- `practice_days`: 練習日

詳細は [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) を参照してください。

## 移行

### FlaskサーバーからSupabaseへの移行

既存のFlaskサーバーベースのアプリケーションから移行する場合は、[SUPABASE_MIGRATION.md](./SUPABASE_MIGRATION.md) を参照してください。

## 開発

### プロジェクト構造

```
drone_manager/
├── docs/                    # ドキュメント
│   ├── ARCHITECTURE.md      # アーキテクチャ設計書
│   ├── SUPABASE_SETUP.md    # Supabaseセットアップガイド
│   └── supabase_rls_policies.sql  # RLSポリシーSQL
├── static/                  # 静的ファイル
│   ├── css/                 # スタイルシート
│   └── js/                  # JavaScriptモジュール
│       ├── api.js           # Supabase API呼び出し
│       ├── auth.js          # 認証管理
│       ├── supabase.js      # Supabase Client初期化
│       └── ...
├── templates/               # HTMLテンプレート
│   └── index.html
├── .env.example            # 環境変数テンプレート
├── netlify.toml            # Netlify設定
└── README.md               # このファイル
```

### 環境変数

開発環境では`.env`ファイルを使用し、本番環境（Netlify）では環境変数を設定します。

## トラブルシューティング

### 認証エラー

- Supabaseの認証情報が正しく設定されているか確認
- ブラウザのコンソールでエラーメッセージを確認

### RLSポリシーエラー

- SupabaseダッシュボードでRLSが有効になっているか確認
- RLSポリシーが正しく作成されているか確認

### CORSエラー

- Supabaseダッシュボードの「Settings」→「API」でCORS設定を確認

## ライセンス

このプロジェクトはPOCのため、ライセンスは特に指定されていません。
