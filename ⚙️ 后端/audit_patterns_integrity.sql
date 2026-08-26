-- audit_patterns_integrity.sql
-- v116：patterns 表（句型库）数据完整性审计 —— 只读巡检，零写库、零删行、零 DDL
--
-- 背景：翻卡页出现两种离谱卡型 —— ① 只有一句正句（无原句、无解析提示）② 原句=正句的回声卡。
--       取证结论：v103 以来 6 条导入路径（JSON coreSentences / JSON expression 错题 / Markdown 地道表达 /
--       Markdown 核心句型 / 复习锚定 INSERT / 备份恢复）共产生 10 种错误形态，核心是三种基础数据形状：
--         · better-only（有正句无原句）→ 前端降级为「金句卡」（正面回忆地道表达，背面单句）
--         · original==better（回声行）→ 前端 stamp 层剥原句降级金句卡，杜绝「原句=正句」展示
--         · original-only / better 占位（残缺行）→ 前端打 broken 强制出队，绝不进 SRS 队列训练
--
-- ⚠️ 运行方式（重要）：Supabase SQL Editor 一次只显示【最后一条】语句的结果表！
--    → 本文件每段独立：请【逐段运行】—— 用鼠标选中一段（从该段 -- ── 注释到结尾分号），再点 Run；
--      或把某一段单独复制进编辑区运行。每段都会返回一张结果表。
--    → 只想要核心答卷：先跑【段 1】就够了（所有统计列合在一张表里）。

-- ═══════════════════════════════════════════════════════════════
-- 段 1（核心答卷）：总览 + 形状分布 + SM-2 字段健康，全部统计列合为一行
--   total               = 总行数
--   mastered            = 已掌握（永久出队）
--   new_cards           = 从未复习（无 next_review_date）
--   on_curve            = 已在记忆曲线上
--   expr_better_only    = 金句卡：只有正句、无原句（正常形态之一）
--   echo_rows           = 回声卡：原句=正句（你报告的第 2 种离谱卡型）
--   broken_original_only= 残形卡：只有原句、无正句（前端 broken 强制出队）
--   placeholder_better  = 占位污染：better 是「历史表达/历史错题/历史导入内容」
--   correction_valid    = 正常纠错卡：原句+正句且文本不同
--   full_triad          = 三件套齐全：原句+正句+场景
--   scene_missing       = 有原句+正句但无场景（背面解析框为空，信息性）
--   sm2_*               = 曲线字段健康度（v115 取证口径：坏日期/NaN/EF<1.3/负数）
-- ═══════════════════════════════════════════════════════════════
SELECT
  count(*)                                                                                AS total,
  count(*) FILTER (WHERE COALESCE(mastered, false))                                       AS mastered,
  count(*) FILTER (WHERE next_review_date IS NULL AND NOT COALESCE(mastered, false))      AS new_cards,
  count(*) FILTER (WHERE next_review_date IS NOT NULL)                                    AS on_curve,
  count(*) FILTER (WHERE btrim(COALESCE(better,'')) <> '' AND btrim(COALESCE(original,'')) = '')                              AS expr_better_only,
  count(*) FILTER (WHERE btrim(COALESCE(better,'')) <> ''
                   AND lower(regexp_replace(better, '\s+', ' ', 'g')) = lower(regexp_replace(original, '\s+', ' ', 'g')))   AS echo_rows,
  count(*) FILTER (WHERE btrim(COALESCE(better,'')) = '' AND btrim(COALESCE(original,'')) <> '')                              AS broken_original_only,
  count(*) FILTER (WHERE lower(btrim(COALESCE(better,''))) IN ('历史表达','历史错题','历史导入内容'))                           AS placeholder_better,
  count(*) FILTER (WHERE btrim(COALESCE(better,'')) <> '' AND btrim(COALESCE(original,'')) <> ''
                   AND lower(regexp_replace(better, '\s+', ' ', 'g')) <> lower(regexp_replace(original, '\s+', ' ', 'g')))  AS correction_valid,
  count(*) FILTER (WHERE btrim(COALESCE(better,'')) <> '' AND btrim(COALESCE(original,'')) <> ''
                   AND btrim(COALESCE(scene,'')) <> '')                                                                    AS full_triad,
  count(*) FILTER (WHERE btrim(COALESCE(better,'')) <> '' AND btrim(COALESCE(scene,'')) = '')                                AS scene_missing,
  count(*) FILTER (WHERE next_review_date IS NOT NULL AND next_review_date::text !~ '^\d{4}-\d{2}-\d{2}$')                    AS sm2_bad_date,
  count(*) FILTER (WHERE ease_factor::text = 'NaN')                                                                           AS sm2_ef_nan,
  count(*) FILTER (WHERE ease_factor::text <> 'NaN' AND ease_factor < 1.3)                                                    AS sm2_ef_below_13,
  count(*) FILTER (WHERE sm2_interval < 0 OR sm2_repetitions < 0 OR review_count < 0)                                         AS sm2_negative_fields
FROM patterns;

-- ═══════════════════════════════════════════════════════════════
-- 段 2：重复行 —— 同 user 下 better 文本（去空白+小写）出现多行
--   v103 之前导入盲插无按句查重 → 跨天日报同一句插多行；前端 stamp 层文本去重兜底，本段看存量规模
-- ═══════════════════════════════════════════════════════════════
SELECT
  user_id,
  lower(regexp_replace(better, '\s+', ' ', 'g')) AS better_normalized,
  count(*)                                       AS duplicate_rows
FROM patterns
WHERE btrim(COALESCE(better,'')) <> ''
GROUP BY 1, 2
HAVING count(*) > 1
ORDER BY duplicate_rows DESC;

-- ═══════════════════════════════════════════════════════════════
-- 段 3：脏行明细 —— 残形卡（original-only / better 占位），前端一律 broken 出队
--   broken_original_only 或 placeholder_better 计数 > 0 时再跑这段看具体行
-- ═══════════════════════════════════════════════════════════════
SELECT id, date_added, original, better, scene, next_review_date, review_count
FROM patterns
WHERE btrim(COALESCE(better,'')) = ''
   OR lower(btrim(COALESCE(better,''))) IN ('历史表达','历史错题','历史导入内容')
ORDER BY date_added DESC NULLS LAST
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════
-- 段 4：脏行明细 —— 回声卡（原句=正句），前端剥原句降级金句卡
--   echo_rows 计数 > 0 时再跑这段看具体行
-- ═══════════════════════════════════════════════════════════════
SELECT id, date_added, original, better, scene, next_review_date, review_count
FROM patterns
WHERE btrim(COALESCE(better,'')) <> ''
  AND lower(regexp_replace(better, '\s+', ' ', 'g')) = lower(regexp_replace(original, '\s+', ' ', 'g'))
ORDER BY date_added DESC NULLS LAST
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════
-- 段 5（可选）：坏曲线行明细 —— 仅当段 1 的 sm2_* 列任一 > 0 时再跑
-- ═══════════════════════════════════════════════════════════════
SELECT id, date_added, better, ease_factor, sm2_interval, sm2_repetitions, review_count, next_review_date
FROM patterns
WHERE (next_review_date IS NOT NULL AND next_review_date::text !~ '^\d{4}-\d{2}-\d{2}$')
   OR ease_factor::text = 'NaN'
   OR (ease_factor::text <> 'NaN' AND ease_factor < 1.3)
   OR sm2_interval < 0 OR sm2_repetitions < 0 OR review_count < 0
ORDER BY date_added DESC NULLS LAST
LIMIT 20;
