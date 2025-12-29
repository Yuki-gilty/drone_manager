# セキュリティガイド

## クレデンシャル管理

### コミットしてはいけないファイル

以下のファイルは**絶対に**Gitリポジトリにコミットしないでください：

- `.env` - 環境変数ファイル（実際の認証情報を含む）
- `.env.local` - ローカル環境変数
- `.env.development` - 開発環境変数
- `.env.staging` - ステージング環境変数
- `.env.production` - 本番環境変数
- `*.key` - 秘密鍵ファイル
- `*.pem` - PEM形式の証明書・鍵
- `*.p12`, `*.pfx` - PKCS形式の証明書
- `*secret*` - 秘密情報を含むファイル
- `*credential*` - 認証情報ファイル
- `credentials.json` - 認証情報JSON
- `secrets.json` - 秘密情報JSON

### 安全にコミットできるファイル

以下のファイルはテンプレートとしてコミット可能です：

- `.env.example` - 環境変数のテンプレート（プレースホルダーのみ）
- `netlify.toml` - Netlify設定（認証情報は含まない）
- ドキュメント内の例（実際の値ではなく説明用）

## 環境変数の設定

### ローカル開発環境

1. `.env.example`を`.env`にコピー：
   ```bash
   cp .env.example .env
   ```

2. `.env`ファイルを編集し、実際の認証情報を設定：
   ```bash
   VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
   VITE_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
   ```

3. `.env`ファイルは`.gitignore`で除外されているため、コミットされません

### Netlify（本番環境）

Netlifyダッシュボードで環境変数を設定：

1. Netlifyダッシュボードにログイン
2. サイトを選択
3. 「Site settings」→「Environment variables」に移動
4. 以下の環境変数を追加：
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## クレデンシャル漏洩の対処

### もしクレデンシャルをコミットしてしまった場合

1. **即座に認証情報を無効化**：
   - Supabaseダッシュボードで新しいAnon Keyを生成
   - 古いキーを無効化

2. **Git履歴から削除**（注意：共有リポジトリの場合はチームと相談）：
   ```bash
   # 危険な操作：履歴を書き換えます
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **新しい認証情報を設定**：
   - ローカル環境の`.env`を更新
   - Netlifyの環境変数を更新

## セキュリティベストプラクティス

### 1. 認証情報の管理

- **Anon Key**: 公開されても問題ありませんが、不要な公開は避けましょう
- **Service Role Key**: **絶対に公開しないでください**（このプロジェクトでは使用していません）
- **Database Password**: **絶対に公開しないでください**

### 2. Row Level Security (RLS)

SupabaseのRLSポリシーにより、ユーザーは自分のデータのみアクセス可能です。これはAnon Keyが公開されても安全な理由です。

### 3. 環境変数の検証

アプリケーション起動時に環境変数が設定されているか確認：

```javascript
if (!config.url || !config.key) {
    console.error('Supabase credentials are not set.');
    // エラーメッセージを表示
}
```

### 4. コードレビュー

プルリクエストを作成する前に、以下を確認：

- [ ] `.env`ファイルが含まれていないか
- [ ] ハードコードされた認証情報がないか
- [ ] 認証情報を含むファイルが`.gitignore`に含まれているか

## .gitignoreの確認

`.gitignore`には以下のパターンが含まれています：

```
# Environment variables
.env
.env.*
!.env.example

# Credentials
*.key
*.pem
*secret*
*credential*
```

定期的に`.gitignore`を確認し、新しい機密ファイルタイプが追加されていないか確認してください。

## 参考資料

- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [OWASP Secrets Management](https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_cryptographic_key)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security/secret-scanning)

