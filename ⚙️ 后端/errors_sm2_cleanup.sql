-- ════════════════════════════════════════════════════════════════════
-- Voco 错题体系升级（v99）：SM-2 记忆曲线 + 发音错题清除 + 去重 + 历史批量纠正
-- 执行位置：Supabase SQL Editor（project dgmatfpwekziyumdfpcu）
-- https://supabase.com/dashboard/project/dgmatfpwekziyumdfpcu/sql/new
-- 建议执行顺序：① cleanup_2026-08-18.sql（清 8.18 旧日报）→ ② 本脚本 → ③ migration_v2.1.sql（若尚未执行）
-- 幂等：全部语句可重复执行（ADD COLUMN IF NOT EXISTS / DELETE 无行则无操作 / UPDATE 已置位则跳过）
-- ════════════════════════════════════════════════════════════════════

-- ── 第 1 节：errors 表补 SM-2 记忆曲线列（与 vocabulary 表同构）──
ALTER TABLE errors ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new';
ALTER TABLE errors ADD COLUMN IF NOT EXISTS mastered BOOLEAN DEFAULT FALSE;
ALTER TABLE errors ADD COLUMN IF NOT EXISTS ease_factor NUMERIC DEFAULT 2.5;
ALTER TABLE errors ADD COLUMN IF NOT EXISTS sm2_interval INTEGER DEFAULT 0;
ALTER TABLE errors ADD COLUMN IF NOT EXISTS sm2_repetitions INTEGER DEFAULT 0;
ALTER TABLE errors ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE errors ADD COLUMN IF NOT EXISTS next_review_date DATE;
ALTER TABLE errors ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;

-- ── 第 2 节：发音错题物理删除（用户指令：错题本只留语法）──
-- 2a. 明确标为 pronunciation 的行
DELETE FROM errors WHERE type = 'pronunciation';

-- 2b. 误标为 grammar 的发音行（打标修复，如 algorithm）：
--     rule 含发音特征关键词，或 correction 含 IPA 音标斜杠（/ˈælɡərɪðəm/）
--     斜杠内只允许字母与 IPA 符号——排除「原句 / 正句」斜杠分隔的纯语法对（斜杠内有空格则必然不是音标）
DELETE FROM errors
WHERE type = 'grammar'
  AND (
    rule ~* '发音|读音|音标|重音|音节|元音|辅音|读作|的音|pronunciation|pronunc'
    OR correction ~ '/[A-Za-zæəɜːɪʊθðʃʒŋʌɔɛˈˌ.]+/'
  );

-- ── 第 3 节：去重（同一「原句+正句」只保留最早一条，如 creativity 重复）──
DELETE FROM errors a
USING errors b
WHERE a.id > b.id
  AND a.original = b.original
  AND a.correction = b.correction;

-- ── 第 4 节：历史错题批量标记已纠正（A+B 组合的 A 半）──
-- 承认事实：这批错题过去实际复习过，只是旧版「记住了」结果从未落库（每会话全量回炉的根因）；
-- 清理后永久出队（correct_in_review=true），错题本数字归零，此后新错题按第 1 节 SM-2 曲线走。
-- 范围限定 date_added <= '2026-08-17'——绝不触碰今日（8.18）新导入的错题，执行顺序无关。
UPDATE errors
SET correct_in_review = TRUE
WHERE correct_in_review IS NOT TRUE
  AND date_added <= '2026-08-17';

-- 完成后核对：SELECT COUNT(*) FROM errors; 应趋近 0（仅剩今日新错题）
