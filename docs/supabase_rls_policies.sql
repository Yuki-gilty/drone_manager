-- Row Level Security (RLS) Policies for Drone Manager
-- Execute this SQL in Supabase SQL Editor after creating tables

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE drone_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE drones ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_days ENABLE ROW LEVEL SECURITY;

-- ==================== Profiles Table Policies ====================

-- Users can view own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ==================== Drone Types Table Policies ====================

-- Users can view own drone types
CREATE POLICY "Users can view own drone types" ON drone_types
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert own drone types
CREATE POLICY "Users can insert own drone types" ON drone_types
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own drone types
CREATE POLICY "Users can update own drone types" ON drone_types
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete own drone types
CREATE POLICY "Users can delete own drone types" ON drone_types
  FOR DELETE USING (auth.uid() = user_id);

-- ==================== Manufacturers Table Policies ====================

-- Users can view own manufacturers
CREATE POLICY "Users can view own manufacturers" ON manufacturers
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert own manufacturers
CREATE POLICY "Users can insert own manufacturers" ON manufacturers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own manufacturers
CREATE POLICY "Users can update own manufacturers" ON manufacturers
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete own manufacturers
CREATE POLICY "Users can delete own manufacturers" ON manufacturers
  FOR DELETE USING (auth.uid() = user_id);

-- ==================== Drones Table Policies ====================

-- Users can view own drones
CREATE POLICY "Users can view own drones" ON drones
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert own drones
CREATE POLICY "Users can insert own drones" ON drones
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own drones
CREATE POLICY "Users can update own drones" ON drones
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete own drones
CREATE POLICY "Users can delete own drones" ON drones
  FOR DELETE USING (auth.uid() = user_id);

-- ==================== Parts Table Policies ====================

-- Users can view own parts
CREATE POLICY "Users can view own parts" ON parts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert own parts
CREATE POLICY "Users can insert own parts" ON parts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own parts
CREATE POLICY "Users can update own parts" ON parts
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete own parts
CREATE POLICY "Users can delete own parts" ON parts
  FOR DELETE USING (auth.uid() = user_id);

-- ==================== Repairs Table Policies ====================

-- Users can view own repairs
CREATE POLICY "Users can view own repairs" ON repairs
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert own repairs
CREATE POLICY "Users can insert own repairs" ON repairs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own repairs
CREATE POLICY "Users can update own repairs" ON repairs
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete own repairs
CREATE POLICY "Users can delete own repairs" ON repairs
  FOR DELETE USING (auth.uid() = user_id);

-- ==================== Practice Days Table Policies ====================

-- Users can view own practice days
CREATE POLICY "Users can view own practice days" ON practice_days
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert own practice days
CREATE POLICY "Users can insert own practice days" ON practice_days
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update own practice days
CREATE POLICY "Users can update own practice days" ON practice_days
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete own practice days
CREATE POLICY "Users can delete own practice days" ON practice_days
  FOR DELETE USING (auth.uid() = user_id);

