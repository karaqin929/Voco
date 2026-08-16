-- Voco v2.1 Migration: Sentence SRS (SM-2 for patterns)
-- 句型记忆卡片模式数据层：patterns 表接入 SM-2 记忆曲线（与 vocabulary 完全同构）
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/dgmatfpwekziyumdfpcu/sql/new

-- 1. SM-2 columns for patterns
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS mastered BOOLEAN DEFAULT FALSE;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS ease_factor REAL DEFAULT 2.5;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS sm2_interval INTEGER DEFAULT 0;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS sm2_repetitions INTEGER DEFAULT 0;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS next_review_date DATE;
ALTER TABLE patterns ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;

-- 2. Backfill: 历史句型从未复习 → 置为待复习（next_review_date 置为过去，前端 isDueBySrs 判到期）
UPDATE patterns SET next_review_date = CURRENT_DATE - 1 WHERE next_review_date IS NULL;

-- 3. Index for review queries
CREATE INDEX IF NOT EXISTS idx_patterns_review ON patterns(user_id, status, next_review_date);
