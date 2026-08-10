-- Voco v1.1 Migration: Spaced Repetition + Three-State Mastery
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/dgmatfpwekziyumdfpcu/sql/new

-- 1. Add new columns to vocabulary
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS next_review_date DATE;
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;

-- 2. Migrate existing data: boolean mastered → three-state status
--    If mastered=true → 'mastered'
--    If mastered=false AND review_count > 0 → 'learning'
--    If mastered=false AND review_count = 0 → 'new'
UPDATE vocabulary
SET status = CASE
  WHEN mastered THEN 'mastered'
  WHEN review_count > 0 THEN 'learning'
  ELSE 'new'
END
WHERE status = 'new';

-- 3. Set initial next_review_date for existing items
--    Items with review_count > 0 get a past date so they show up for review
UPDATE vocabulary
SET next_review_date = CURRENT_DATE - 1
WHERE next_review_date IS NULL AND review_count > 0;

-- 4. Index for review queries
CREATE INDEX IF NOT EXISTS idx_vocab_review ON vocabulary(user_id, status, next_review_date);
