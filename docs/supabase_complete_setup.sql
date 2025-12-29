-- ============================================================================
-- Drone Manager - Complete Supabase Database Setup
-- ============================================================================
-- このSQLファイルは、Drone Managerアプリケーションに必要なすべてのテーブル、
-- インデックス、RLSポリシーを一括で作成・設定します。
--
-- 実行方法:
-- 1. Supabaseダッシュボードにログイン
-- 2. 「SQL Editor」を開く
-- 3. このファイルの内容をコピー＆ペースト
-- 4. 「Run」ボタンをクリック
-- ============================================================================

-- ============================================================================
-- 1. テーブルの作成
-- ============================================================================

-- プロファイルテーブル（ユーザー情報）
-- Supabase Authのusersテーブルと連携
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
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

-- ============================================================================
-- 2. インデックスの作成（パフォーマンス向上のため）
-- ============================================================================

-- profilesテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- drone_typesテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_drone_types_user_id ON drone_types(user_id);
CREATE INDEX IF NOT EXISTS idx_drone_types_name ON drone_types(name);

-- manufacturersテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_manufacturers_user_id ON manufacturers(user_id);
CREATE INDEX IF NOT EXISTS idx_manufacturers_name ON manufacturers(name);

-- dronesテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_drones_user_id ON drones(user_id);
CREATE INDEX IF NOT EXISTS idx_drones_type_id ON drones(type_id);
CREATE INDEX IF NOT EXISTS idx_drones_status ON drones(status);

-- partsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_parts_user_id ON parts(user_id);
CREATE INDEX IF NOT EXISTS idx_parts_drone_id ON parts(drone_id);
CREATE INDEX IF NOT EXISTS idx_parts_manufacturer_id ON parts(manufacturer_id);

-- repairsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_repairs_user_id ON repairs(user_id);
CREATE INDEX IF NOT EXISTS idx_repairs_drone_id ON repairs(drone_id);
CREATE INDEX IF NOT EXISTS idx_repairs_part_id ON repairs(part_id);
CREATE INDEX IF NOT EXISTS idx_repairs_date ON repairs(date);

-- practice_daysテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_practice_days_user_id ON practice_days(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_days_date ON practice_days(date);

-- ============================================================================
-- 3. プロファイル自動作成トリガー（RLSポリシー違反を防ぐため）
-- ============================================================================

-- auth.usersにユーザーが作成されたときに、自動的にprofilesテーブルにレコードを作成する関数
-- これにより、RLSポリシー違反を防ぎます
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- auth.usersテーブルにトリガーを設定
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 4. 更新日時の自動更新トリガー関数
-- ============================================================================

-- updated_atカラムを自動更新する関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを設定
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drone_types_updated_at
  BEFORE UPDATE ON drone_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manufacturers_updated_at
  BEFORE UPDATE ON manufacturers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drones_updated_at
  BEFORE UPDATE ON drones
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parts_updated_at
  BEFORE UPDATE ON parts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repairs_updated_at
  BEFORE UPDATE ON repairs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_practice_days_updated_at
  BEFORE UPDATE ON practice_days
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. Row Level Security (RLS) の有効化
-- ============================================================================

-- 既存のRLSポリシーを削除（再実行時のため）
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view own drone types" ON drone_types;
DROP POLICY IF EXISTS "Users can insert own drone types" ON drone_types;
DROP POLICY IF EXISTS "Users can update own drone types" ON drone_types;
DROP POLICY IF EXISTS "Users can delete own drone types" ON drone_types;

DROP POLICY IF EXISTS "Users can view own manufacturers" ON manufacturers;
DROP POLICY IF EXISTS "Users can insert own manufacturers" ON manufacturers;
DROP POLICY IF EXISTS "Users can update own manufacturers" ON manufacturers;
DROP POLICY IF EXISTS "Users can delete own manufacturers" ON manufacturers;

DROP POLICY IF EXISTS "Users can view own drones" ON drones;
DROP POLICY IF EXISTS "Users can insert own drones" ON drones;
DROP POLICY IF EXISTS "Users can update own drones" ON drones;
DROP POLICY IF EXISTS "Users can delete own drones" ON drones;

DROP POLICY IF EXISTS "Users can view own parts" ON parts;
DROP POLICY IF EXISTS "Users can insert own parts" ON parts;
DROP POLICY IF EXISTS "Users can update own parts" ON parts;
DROP POLICY IF EXISTS "Users can delete own parts" ON parts;

DROP POLICY IF EXISTS "Users can view own repairs" ON repairs;
DROP POLICY IF EXISTS "Users can insert own repairs" ON repairs;
DROP POLICY IF EXISTS "Users can update own repairs" ON repairs;
DROP POLICY IF EXISTS "Users can delete own repairs" ON repairs;

DROP POLICY IF EXISTS "Users can view own practice days" ON practice_days;
DROP POLICY IF EXISTS "Users can insert own practice days" ON practice_days;
DROP POLICY IF EXISTS "Users can update own practice days" ON practice_days;
DROP POLICY IF EXISTS "Users can delete own practice days" ON practice_days;

-- RLSを有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drone_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE drones ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_days ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. RLSポリシーの作成
-- ============================================================================

-- ==================== Profiles Table Policies ====================

-- ユーザーは自分のプロファイルを閲覧可能
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- ユーザーは自分のプロファイルを更新可能
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ユーザーは自分のプロファイルを挿入可能
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ==================== Drone Types Table Policies ====================

-- ユーザーは自分の機体種類を閲覧可能
CREATE POLICY "Users can view own drone types" ON drone_types
  FOR SELECT USING (auth.uid() = user_id);

-- ユーザーは自分の機体種類を挿入可能
CREATE POLICY "Users can insert own drone types" ON drone_types
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分の機体種類を更新可能
CREATE POLICY "Users can update own drone types" ON drone_types
  FOR UPDATE USING (auth.uid() = user_id);

-- ユーザーは自分の機体種類を削除可能
CREATE POLICY "Users can delete own drone types" ON drone_types
  FOR DELETE USING (auth.uid() = user_id);

-- ==================== Manufacturers Table Policies ====================

-- ユーザーは自分のメーカーを閲覧可能
CREATE POLICY "Users can view own manufacturers" ON manufacturers
  FOR SELECT USING (auth.uid() = user_id);

-- ユーザーは自分のメーカーを挿入可能
CREATE POLICY "Users can insert own manufacturers" ON manufacturers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のメーカーを更新可能
CREATE POLICY "Users can update own manufacturers" ON manufacturers
  FOR UPDATE USING (auth.uid() = user_id);

-- ユーザーは自分のメーカーを削除可能
CREATE POLICY "Users can delete own manufacturers" ON manufacturers
  FOR DELETE USING (auth.uid() = user_id);

-- ==================== Drones Table Policies ====================

-- ユーザーは自分の機体を閲覧可能
CREATE POLICY "Users can view own drones" ON drones
  FOR SELECT USING (auth.uid() = user_id);

-- ユーザーは自分の機体を挿入可能
CREATE POLICY "Users can insert own drones" ON drones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分の機体を更新可能
CREATE POLICY "Users can update own drones" ON drones
  FOR UPDATE USING (auth.uid() = user_id);

-- ユーザーは自分の機体を削除可能
CREATE POLICY "Users can delete own drones" ON drones
  FOR DELETE USING (auth.uid() = user_id);

-- ==================== Parts Table Policies ====================

-- ユーザーは自分のパーツを閲覧可能
CREATE POLICY "Users can view own parts" ON parts
  FOR SELECT USING (auth.uid() = user_id);

-- ユーザーは自分のパーツを挿入可能
CREATE POLICY "Users can insert own parts" ON parts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分のパーツを更新可能
CREATE POLICY "Users can update own parts" ON parts
  FOR UPDATE USING (auth.uid() = user_id);

-- ユーザーは自分のパーツを削除可能
CREATE POLICY "Users can delete own parts" ON parts
  FOR DELETE USING (auth.uid() = user_id);

-- ==================== Repairs Table Policies ====================

-- ユーザーは自分の修理履歴を閲覧可能
CREATE POLICY "Users can view own repairs" ON repairs
  FOR SELECT USING (auth.uid() = user_id);

-- ユーザーは自分の修理履歴を挿入可能
CREATE POLICY "Users can insert own repairs" ON repairs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分の修理履歴を更新可能
CREATE POLICY "Users can update own repairs" ON repairs
  FOR UPDATE USING (auth.uid() = user_id);

-- ユーザーは自分の修理履歴を削除可能
CREATE POLICY "Users can delete own repairs" ON repairs
  FOR DELETE USING (auth.uid() = user_id);

-- ==================== Practice Days Table Policies ====================

-- ユーザーは自分の練習日を閲覧可能
CREATE POLICY "Users can view own practice days" ON practice_days
  FOR SELECT USING (auth.uid() = user_id);

-- ユーザーは自分の練習日を挿入可能
CREATE POLICY "Users can insert own practice days" ON practice_days
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分の練習日を更新可能
CREATE POLICY "Users can update own practice days" ON practice_days
  FOR UPDATE USING (auth.uid() = user_id);

-- ユーザーは自分の練習日を削除可能
CREATE POLICY "Users can delete own practice days" ON practice_days
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 7. ログイン用RPC関数（RLSをバイパス）
-- ============================================================================

-- ログイン時にusernameからemailを取得する関数
-- SECURITY DEFINERにより、RLSポリシーをバイパスして実行される
-- これにより、未認証ユーザーでもログイン時にemailを取得できる
CREATE OR REPLACE FUNCTION get_user_email_by_username(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM profiles WHERE username = p_username;
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. 完了メッセージ
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Database setup completed successfully!';
  RAISE NOTICE 'Created tables: profiles, drone_types, manufacturers, drones, parts, repairs, practice_days';
  RAISE NOTICE 'Created indexes for performance optimization';
  RAISE NOTICE 'Enabled Row Level Security (RLS) on all tables';
  RAISE NOTICE 'Created RLS policies for all tables';
  RAISE NOTICE 'Created RPC function: get_user_email_by_username';
END $$;

