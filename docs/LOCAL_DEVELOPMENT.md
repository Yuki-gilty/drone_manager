# ローカル開発環境のセットアップ

**最終更新**: 2025-12-29

## 概要

このドキュメントでは、Drone Managerアプリケーションをローカル環境で開発・テストする方法を説明します。

## 前提条件

- Python 3 または Node.js がインストールされていること
- Supabaseアカウントとプロジェクトが作成されていること

## セットアップ手順

### 1. Supabaseプロジェクトのセットアップ

#### 1.1 データベースのセットアップ

1. Supabaseダッシュボードにログイン
2. 「SQL Editor」を開く
3. `docs/supabase_complete_setup.sql`の内容をコピー＆ペースト
4. 「Run」ボタンをクリックして実行

これにより、以下が作成されます：
- 必要なテーブル（profiles, drones, parts, repairs等）
- インデックス（パフォーマンス最適化用）
- RLSポリシー（Row Level Security）
- トリガー関数（プロファイル自動作成、更新日時自動更新）
- RPC関数（`get_user_email_by_username` - ログイン用）

#### 1.2 認証設定（重要）

Supabaseダッシュボードで以下の設定を行います：

1. **Authentication** → **Providers** → **Email** に移動
2. **「Confirm email」をOFF**に設定（メール確認を無効化）
   - これにより、登録後すぐにログインできるようになります
   - 本番環境では必要に応じてONに戻してください

### 2. ローカル開発用HTMLファイルの作成

`python -m http.server`などの静的ファイルサーバーでは環境変数を読み込めないため、ローカル開発専用のHTMLファイルを使用します。

#### 2.1 ファイルのコピー

```bash
cp templates/index.html templates/index-local.html
```

#### 2.2 Supabase認証情報の追加

`templates/index-local.html`の`<head>`セクション内に以下のmetaタグを追加：

```html
<!-- Supabase Configuration (Local Development Only) -->
<meta name="supabase-url" content="https://[YOUR_PROJECT_REF].supabase.co">
<meta name="supabase-anon-key" content="[YOUR_ANON_KEY]">
```

**認証情報の取得方法**:
1. Supabaseダッシュボード → **Settings** → **API**
2. 「Project URL」と「anon public」キーをコピー

#### 2.3 セキュリティ注意事項

- `index-local.html`は認証情報を含むため、**絶対にGitにコミットしないでください**
- `.gitignore`に`templates/index-local.html`が追加済みです
- Anon Keyは公開されても問題ありませんが、慎重に扱ってください

### 3. ローカルサーバーの起動

#### Python 3を使用する場合（推奨）

```bash
python -m http.server 8000
```

#### Node.jsを使用する場合

```bash
npx serve . -p 8000
```

#### VS Code Live Serverを使用する場合

1. VS Codeでプロジェクトを開く
2. Live Server拡張機能をインストール
3. `templates/index-local.html`を右クリック → 「Open with Live Server」

### 4. アプリケーションへのアクセス

ブラウザで以下のURLにアクセス：

```
http://localhost:8000/templates/index-local.html
```

**注意**: `index.html`ではなく`index-local.html`を使用してください。

## 動作確認

### 新規ユーザー登録

1. 「新規登録」ボタンをクリック
2. ユーザー名、メールアドレス、パスワードを入力
3. 「登録」をクリック
4. ダッシュボードが表示されれば成功

### ログイン

1. ユーザー名（またはメールアドレス）とパスワードを入力
2. 「ログイン」をクリック
3. ダッシュボードが表示されれば成功

**ユーザー名でログインするには**: Supabaseで`get_user_email_by_username`関数が必要です。`supabase_complete_setup.sql`を実行すると自動的に作成されます。

## トラブルシューティング

### 「Supabase credentials are not set」エラー

**原因**: metaタグが正しく設定されていない

**解決策**:
1. `index-local.html`の`<head>`セクションにmetaタグがあるか確認
2. URLとキーが正しいか確認
3. ブラウザのキャッシュをクリア

### 「ユーザー名またはパスワードが正しくありません」エラー

**原因1**: メール確認が有効になっている
- Supabaseダッシュボード → Authentication → Providers → Email → 「Confirm email」をOFFに

**原因2**: パスワードが間違っている
- 登録時に使用したパスワードを確認

**原因3**: ユーザー名でログインしているがRPC関数が未作成
- `supabase_complete_setup.sql`を実行してRPC関数を作成
- または一時的にメールアドレスでログインを試す

### RLSポリシー違反エラー（406エラー）

**原因**: RLSポリシーが正しく設定されていない

**解決策**:
1. `docs/supabase_complete_setup.sql`を再度実行
2. Supabaseダッシュボード → Database → Tables でRLSが有効か確認
3. Policies タブでポリシーが作成されているか確認

### プロファイルが作成されない

**原因**: トリガー関数が設定されていない

**解決策**:
1. Supabaseダッシュボード → Database → Functions で `handle_new_user` が存在するか確認
2. Triggers で `on_auth_user_created` が有効か確認
3. 存在しない場合は`supabase_complete_setup.sql`を再実行

## ファイル構成

```
drone_manager/
├── templates/
│   ├── index.html           # 本番用（環境変数から認証情報を取得）
│   └── index-local.html     # ローカル開発用（gitignore対象）
├── static/
│   └── js/
│       ├── supabase.js      # Supabase Client初期化
│       ├── api.js           # API層（Supabase REST API）
│       └── auth.js          # 認証モジュール
└── docs/
    ├── supabase_complete_setup.sql  # 完全なDB設定SQL
    └── LOCAL_DEVELOPMENT.md         # このファイル
```

## 本番環境との違い

| 項目 | ローカル開発 | 本番（Netlify） |
|------|-------------|----------------|
| HTMLファイル | `index-local.html` | `index.html` |
| 認証情報 | metaタグにハードコード | 環境変数から自動注入 |
| サーバー | `python -m http.server` | Netlify CDN |
| URL | `localhost:8000` | `https://your-site.netlify.app` |

## 関連ドキュメント

- [Supabaseセットアップガイド](./SUPABASE_SETUP.md)
- [デプロイメントガイド](./DEPLOYMENT.md)
- [アーキテクチャ設計書](./ARCHITECTURE.md)
