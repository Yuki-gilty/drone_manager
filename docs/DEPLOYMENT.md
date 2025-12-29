# デプロイメントガイド

## Netlifyへのデプロイ

### 1. Netlifyアカウントの作成

1. [Netlify](https://netlify.com) にアクセス
2. GitHubアカウントでサインアップ（推奨）

### 2. プロジェクトのデプロイ

#### 方法A: GitHub連携（推奨）

1. GitHubリポジトリにプッシュ
2. Netlifyダッシュボードで「New site from Git」を選択
3. GitHubリポジトリを選択
4. ビルド設定：
   - **Build command**: （空欄、静的ファイルのみ）
   - **Publish directory**: `/` または `.`（ルートディレクトリ）

#### 方法B: 手動デプロイ

1. プロジェクトをZIPファイルに圧縮
2. Netlifyダッシュボードで「Add new site」→「Deploy manually」
3. ZIPファイルをアップロード

### 3. 環境変数の設定

Netlifyダッシュボードで「Site settings」→「Environment variables」に移動し、以下を追加：

- `VITE_SUPABASE_URL`: SupabaseプロジェクトURL
  - 例: `https://abcdefghijklmnop.supabase.co`
- `VITE_SUPABASE_ANON_KEY`: Supabase Anon Key
  - 例: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**重要**: Netlifyはビルド時に環境変数を注入しますが、静的サイトの場合は実行時に環境変数にアクセスできません。そのため、以下のいずれかの方法を使用します：

#### 方法1: Netlifyの環境変数注入スクリプト

`netlify.toml`に以下を追加：

```toml
[build]
  command = "echo 'Building...'"
  publish = "."

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

または、ビルド時に環境変数をHTMLに注入するスクリプトを作成：

```bash
# build.sh
#!/bin/bash
# Replace placeholders in HTML with environment variables
sed -i "s|VITE_SUPABASE_URL|${VITE_SUPABASE_URL}|g" templates/index.html
sed -i "s|VITE_SUPABASE_ANON_KEY|${VITE_SUPABASE_ANON_KEY}|g" templates/index.html
```

#### 方法2: メタタグを使用（推奨）

`templates/index.html`の`<head>`セクションに以下を追加：

```html
<meta name="supabase-url" content="https://[PROJECT_REF].supabase.co">
<meta name="supabase-anon-key" content="[YOUR_ANON_KEY]">
```

**注意**: この方法では、認証情報がHTMLに含まれるため、Anon Keyのみを使用してください（Service Role Keyは使用しないでください）。

### 4. カスタムドメインの設定（オプション）

1. Netlifyダッシュボードで「Domain settings」に移動
2. 「Add custom domain」をクリック
3. ドメイン名を入力
4. DNS設定を更新（Netlifyが指示を提供）

### 5. HTTPS設定

Netlifyは自動的にHTTPS証明書を発行・更新します。追加の設定は不要です。

## 環境別の設定

### 開発環境

- Supabaseプロジェクト: `drone-manager-dev`
- Netlifyサイト: `drone-manager-dev.netlify.app`
- 環境変数: Netlifyの「Environment variables」で設定

### ステージング環境

- Supabaseプロジェクト: `drone-manager-staging`
- Netlifyサイト: `drone-manager-staging.netlify.app`
- 環境変数: Netlifyの「Environment variables」で設定

### 本番環境

- Supabaseプロジェクト: `drone-manager-prod`
- Netlifyサイト: `drone-manager.netlify.app` またはカスタムドメイン
- 環境変数: Netlifyの「Environment variables」で設定

## デプロイ後の確認

1. サイトにアクセスして動作確認
2. ブラウザの開発者ツールでエラーを確認
3. Supabaseダッシュボードでリクエストログを確認
4. 認証フローをテスト
5. データの作成・読み取り・更新・削除をテスト

## トラブルシューティング

### 環境変数が読み込まれない

- Netlifyの環境変数が正しく設定されているか確認
- ブラウザのコンソールでエラーメッセージを確認
- メタタグを使用する方法に切り替え

### CORSエラー

- Supabaseダッシュボードの「Settings」→「API」でCORS設定を確認
- NetlifyのURLを許可リストに追加

### 認証エラー

- Supabaseの認証情報が正しいか確認
- RLSポリシーが正しく設定されているか確認

## 継続的デプロイ（CI/CD）

GitHubと連携している場合、`main`ブランチにプッシュすると自動的にデプロイされます。

### ブランチデプロイ

Netlifyは自動的にプルリクエストごとにプレビューデプロイを作成します。

### デプロイ通知

- Slack
- Email
- Discord
- その他のWebhook

Netlifyダッシュボードの「Site settings」→「Build & deploy」→「Deploy notifications」で設定できます。

