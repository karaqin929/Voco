-- Voco Schema Migration
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/dgmatfpwekziyumdfpcu/sql/new

-- 1. VOCABULARY TABLE
CREATE TABLE vocabulary (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  word TEXT NOT NULL,
  phonetic TEXT DEFAULT '',
  meaning TEXT DEFAULT '',
  example TEXT DEFAULT '',
  date_added DATE DEFAULT CURRENT_DATE,
  source_topic TEXT DEFAULT '',
  review_count INTEGER DEFAULT 0,
  mastered BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'new',
  next_review_date DATE,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ERRORS TABLE
CREATE TABLE errors (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('grammar', 'pronunciation')),
  original TEXT NOT NULL,
  correction TEXT NOT NULL,
  rule TEXT DEFAULT '',
  date_added DATE DEFAULT CURRENT_DATE,
  source_topic TEXT DEFAULT '',
  reviewed_at JSONB DEFAULT '[]'::jsonb,
  correct_in_review BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PATTERNS TABLE
CREATE TABLE patterns (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  original TEXT NOT NULL,
  better TEXT NOT NULL,
  scene TEXT DEFAULT '',
  date_added DATE DEFAULT CURRENT_DATE,
  source_topic TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PROGRESS TABLE
CREATE TABLE progress (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  topics JSONB DEFAULT '[]'::jsonb,
  fluency_trend JSONB DEFAULT '[]'::jsonb,
  accuracy_trend JSONB DEFAULT '[]'::jsonb,
  weak_areas JSONB DEFAULT '[]'::jsonb,
  words_learned INTEGER DEFAULT 0,
  words_mastered INTEGER DEFAULT 0,
  errors_fixed INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. REPORTS TABLE (archive)
CREATE TABLE reports (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  date DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 6. USER_CONFIG TABLE
CREATE TABLE user_config (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  app_name TEXT DEFAULT 'Voco',
  user_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;
ALTER TABLE errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_config ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own data
CREATE POLICY "vocabulary_user_policy" ON vocabulary FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "errors_user_policy" ON errors FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "patterns_user_policy" ON patterns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "progress_user_policy" ON progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "reports_user_policy" ON reports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "config_user_policy" ON user_config FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_vocabulary_user ON vocabulary(user_id);
CREATE INDEX idx_errors_user ON errors(user_id);
CREATE INDEX idx_patterns_user ON patterns(user_id);
CREATE INDEX idx_reports_user ON reports(user_id);
