# Supabase セットアップガイド

## 1. Supabaseプロジェクトの作成

1. https://supabase.com にアクセス
2. アカウントを作成（GitHubアカウントでログイン推奨）
3. 「New Project」をクリック
4. プロジェクト情報を入力：
   - **Name**: `drone-manager-dev` (開発環境)
   - **Database Password**: 強力なパスワードを設定
   - **Region**: 最寄りのリージョンを選択
5. 「Create new project」をクリック

## 2. API認証情報の取得

1. プロジェクトダッシュボードで「Settings」→「API」に移動
2. 以下の情報をコピー：
   - **Project URL**: `https://[PROJECT_REF].supabase.co`
   - **anon public key**: `[YOUR_ANON_KEY]`

## 3. 環境変数の設定

`.env.example`を`.env`にコピーし、取得した認証情報を設定：

```bash
cp .env.example .env
```

`.env`ファイルを編集：
```bash
VITE_SUPABASE_URL=https://[PROJECT_REF].supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
```

## 4. データベーススキーマの作成

Supabaseダッシュボードの「SQL Editor」で以下のSQLを実行：

```sql
-- Usersテーブル（Supabase Authのusersテーブルを使用）
-- 追加のユーザー情報を保存するためのprofilesテーブルを作成
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 機体種類テーブル
CREATE TABLE IF NOT EXISTS drone_types (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  default_parts JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- メーカーテーブル
CREATE TABLE IF NOT EXISTS manufacturers (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- 機体テーブル
CREATE TABLE IF NOT EXISTS drones (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type_id INTEGER REFERENCES drone_types(id) ON DELETE RESTRICT NOT NULL,
  start_date DATE NOT NULL,
  photo TEXT,
  status TEXT DEFAULT 'ready',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- パーツテーブル
CREATE TABLE IF NOT EXISTS parts (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  drone_id INTEGER REFERENCES drones(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  manufacturer_id INTEGER REFERENCES manufacturers(id) ON DELETE SET NULL,
  replacement_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 修理履歴テーブル
CREATE TABLE IF NOT EXISTS repairs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  drone_id INTEGER REFERENCES drones(id) ON DELETE CASCADE NOT NULL,
  part_id INTEGER REFERENCES parts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 練習日テーブル
CREATE TABLE IF NOT EXISTS practice_days (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_drone_types_user_id ON drone_types(user_id);
CREATE INDEX IF NOT EXISTS idx_manufacturers_user_id ON manufacturers(user_id);
CREATE INDEX IF NOT EXISTS idx_drones_user_id ON drones(user_id);
CREATE INDEX IF NOT EXISTS idx_drones_type_id ON drones(type_id);
CREATE INDEX IF NOT EXISTS idx_parts_user_id ON parts(user_id);
CREATE INDEX IF NOT EXISTS idx_parts_drone_id ON parts(drone_id);
CREATE INDEX IF NOT EXISTS idx_repairs_user_id ON repairs(user_id);
CREATE INDEX IF NOT EXISTS idx_repairs_drone_id ON repairs(drone_id);
CREATE INDEX IF NOT EXISTS idx_repairs_part_id ON repairs(part_id);
CREATE INDEX IF NOT EXISTS idx_practice_days_user_id ON practice_days(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_days_date ON practice_days(date);
```

## 5. Row Level Security (RLS) ポリシーの設定

すべてのテーブルでRLSを有効化し、ユーザーは自分のデータのみアクセス可能にします：

```sql
-- RLSを有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drone_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE drones ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_days ENABLE ROW LEVEL SECURITY;

-- profilesテーブルのポリシー
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- drone_typesテーブルのポリシー
CREATE POLICY "Users can manage own drone types" ON drone_types
  FOR ALL USING (auth.uid() = user_id);

-- manufacturersテーブルのポリシー
CREATE POLICY "Users can manage own manufacturers" ON manufacturers
  FOR ALL USING (auth.uid() = user_id);

-- dronesテーブルのポリシー
CREATE POLICY "Users can manage own drones" ON drones
  FOR ALL USING (auth.uid() = user_id);

-- partsテーブルのポリシー
CREATE POLICY "Users can manage own parts" ON parts
  FOR ALL USING (auth.uid() = user_id);

-- repairsテーブルのポリシー
CREATE POLICY "Users can manage own repairs" ON repairs
  FOR ALL USING (auth.uid() = user_id);

-- practice_daysテーブルのポリシー
CREATE POLICY "Users can manage own practice days" ON practice_days
  FOR ALL USING (auth.uid() = user_id);
```

## 6. 複数環境の設定

開発、ステージング、本番環境ごとに別々のSupabaseプロジェクトを作成することを推奨します。

### 開発環境
- プロジェクト名: `drone-manager-dev`
- `.env.development`に設定

### ステージング環境
- プロジェクト名: `drone-manager-staging`
- `.env.staging`に設定

### 本番環境
- プロジェクト名: `drone-manager-prod`
- Netlifyの環境変数に設定

## 7. 認証設定

Supabaseダッシュボードの「Authentication」で以下を設定：

### 7.1 Email Provider設定

**Authentication** → **Providers** → **Email**:

1. **Enable Email Provider**: ON（デフォルトでON）
2. **Confirm email**: **OFF**に設定（ローカル開発時）
   - これにより、登録後すぐにログインできます
   - 本番環境ではセキュリティ要件に応じてONにすることを推奨

### 7.2 URL設定

**Authentication** → **URL Configuration**:

1. **Site URL**:
   - 開発環境: `http://localhost:8000`
   - 本番環境: `https://your-site.netlify.app`
2. **Redirect URLs**:
   - `http://localhost:8000/**`（開発用）
   - `https://your-site.netlify.app/**`（本番用）

## 8. 動作確認

1. ローカルでアプリケーションを起動
2. 新規ユーザー登録を試す
3. ログインを試す
4. データの作成・読み取り・更新・削除をテスト

## トラブルシューティング

### RLSポリシーでアクセスできない
- `auth.uid()`が正しく取得できているか確認
- ポリシーが正しく作成されているか確認

### CORSエラー
- Supabaseダッシュボードの「Settings」→「API」でCORS設定を確認

### 認証エラー
- 環境変数が正しく設定されているか確認
- SupabaseプロジェクトのURLとキーが正しいか確認

