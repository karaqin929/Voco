-- Voco v2.0 Migration: Topics, SM-2, Error Patterns
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/dgmatfpwekziyumdfpcu/sql/new

-- 1. TOPICS TABLE
CREATE TABLE IF NOT EXISTS topics (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  source_url TEXT DEFAULT '',
  source_type TEXT DEFAULT 'custom',
  key_terms TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  practice_count INTEGER DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "topics_user_policy" ON topics FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_topics_user ON topics(user_id);

-- 2. SM-2 columns for vocabulary
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS ease_factor REAL DEFAULT 2.5;
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS sm2_interval INTEGER DEFAULT 0;
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS sm2_repetitions INTEGER DEFAULT 0;

-- 3. Error pattern tracking
ALTER TABLE errors ADD COLUMN IF NOT EXISTS error_pattern TEXT DEFAULT '';

-- Backfill SM-2 from existing review_count
UPDATE vocabulary SET sm2_repetitions = review_count WHERE sm2_repetitions = 0 AND review_count > 0;
