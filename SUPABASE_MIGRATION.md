# Supabase + Netlify 移行計画

## 概要

Flaskサーバーベースのアーキテクチャから、Supabase + Netlifyの静的ホスティング構成への移行計画です。

## アーキテクチャ

### 現在の構成
```
[HTML/CSS/JS] → Flask Server → PostgreSQL/SQLite
```

### 移行後の構成
```
[HTML/CSS/JS] → Netlify (静的ホスティング)
    ↓
[Supabase REST API + Auth]
    ↓
[Supabase PostgreSQL]
```

## 実装フェーズ

### Phase 1: 環境準備 ✅
- [x] ブランチ作成
- [x] Supabaseプロジェクト設定ドキュメント作成
- [x] 環境変数テンプレート作成
- [x] Netlify設定ファイル作成

### Phase 2: Supabase統合 ✅
- [x] Supabase JavaScript Clientの追加
- [x] `api.js`の書き換え（Supabase REST API使用）
- [x] 認証システムの移行（Supabase Auth）
- [x] Row Level Security (RLS) ポリシー設計

### Phase 3: データベース移行 ✅
- [x] Supabaseでテーブル作成
- [x] RLSポリシーの実装
- [x] 完全なセットアップSQL作成（`docs/supabase_complete_setup.sql`）
- [x] RPC関数の実装（ユーザー名ログイン用）

### Phase 4: フロントエンド更新 ✅
- [x] 認証フローの更新
- [x] API呼び出しの更新
- [x] エラーハンドリングの更新

### Phase 5: デプロイ設定 ✅
- [x] Netlify設定ファイル作成
- [x] 環境変数設定
- [x] ローカル開発環境対応（metaタグ方式）

### Phase 6: ドキュメント ✅
- [x] README更新
- [x] セットアップガイド作成
- [x] アーキテクチャドキュメント更新
- [x] ローカル開発ガイド作成（`docs/LOCAL_DEVELOPMENT.md`）

## 技術スタック

### フロントエンド
- HTML/CSS/JavaScript (ES6+ モジュール)
- Supabase JavaScript Client (@supabase/supabase-js)

### バックエンド
- Supabase PostgreSQL
- Supabase Auth
- Supabase REST API (自動生成)

### ホスティング
- Netlify (静的ホスティング)

## セキュリティ

### Row Level Security (RLS)
すべてのテーブルでRLSを有効化し、ユーザーは自分のデータのみアクセス可能にする。

### 認証
- Supabase Authを使用
- JWT トークンベースの認証
- セッション管理はSupabaseが自動処理

## 移行チェックリスト

- [x] Supabaseプロジェクト作成（開発・ステージング・本番）
- [x] データベーススキーマ移行
- [x] RLSポリシー実装
- [x] API層の書き換え
- [x] 認証システム移行
- [x] フロントエンド更新
- [x] Netlify設定
- [x] ローカル開発テスト実施
- [x] ドキュメント更新

## 進捗状況

- 2025-12-29: ブランチ作成完了
- 2025-12-29: 実装計画作成完了
- 2025-12-29: Supabase統合完了
- 2025-12-29: 認証システム移行完了
- 2025-12-29: ローカル開発環境対応完了
- 2025-12-29: ユーザー名ログイン機能完了
- 2025-12-29: ドキュメント更新完了

## 完了状況

✅ **移行完了**: すべてのフェーズが完了しました。

### 次のステップ（オプション）

1. Netlifyへの本番デプロイ
2. 既存データの移行（必要に応じて）
3. 本番環境での動作確認
