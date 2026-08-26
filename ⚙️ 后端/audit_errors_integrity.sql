-- audit_errors_integrity.sql
-- v116：errors 表（语法错题库）数据完整性审计 —— 只读巡检，零写库、零删行、零 DDL
--
-- 背景：句型翻卡 bug 的同类审计扩展到错题打卡。链路取证结论：
--   错题 SM-2 调度本身正确（dueErrorCards 到期网关 + sm2 推进 + v115 写回加固），
--   但导入路径从不校验内容完整性 —— 三种脏形态会被忠实排进复习队列：
--     · 回声行（original == correction）→ 翻面「绿色正确句」与「原句」一模一样（句型例 2 同款）
--     · 无正句行（只有 original）→ 翻面答案区全空，用户翻了个寂寞
--     · 占位原句（original = 历史错题）→ 复习卡正面显示「原句：历史错题」
--   v99 一次性清理（errors_sm2_cleanup.sql）删过发音行 + 精确去重 + 8.17 前全量标 correct_in_review，
--   但那是存量清扫 —— 导入层卫生此前缺失，新导入仍可再造脏行。本脚本回答「库里现在还有多少脏行」。
--   v116 前端三层修复：dueErrorCards 内容门（读时）+ 两条导入路径净化查重（写时）+ 模块九审计（核查）。
--
-- ⚠️ 运行方式（重要）：Supabase SQL Editor 一次只显示【最后一条】语句的结果表！
--    → 请【逐段运行】—— 用鼠标选中一段（从该段 -- ══ 注释到结尾分号），再点 Run；或一段一段复制。
--    → 只想要核心答卷：先跑【段 1】就够了（所有统计列合在一张表里）。

-- ═══════════════════════════════════════════════════════════════
-- 段 1（核心答卷）：总览 + 形状分布 + SM-2 字段健康，所有统计列合为一行
--   total           = 总行数
--   mastered        = 已掌握（永久出队）
--   correct_in_review = 已标记纠正（v99 历史清理行，永久出队）
--   pronunciation   = 发音行（v99 起不再进错题体系，应恒为 0）
--   valid_pairs     = 正常错题：原句+正句齐全且文本不同
--   echo_rows       = 回声卡：原句=正句（去空白+小写后相同）
--   no_correction   = 残形卡：只有原句、无正句（翻面答案区为空）
--   placeholder_orig= 占位污染：original 是「历史错题/历史表达/历史导入内容」
--   new_cards       = 从未复习（无 next_review_date）
--   on_curve        = 已在记忆曲线上
--   sm2_*           = 曲线字段健康度（errors.ease_factor 为 NUMERIC 型，NaN 需文本兜底）
-- ═══════════════════════════════════════════════════════════════
SELECT
  count(*)                                                                                AS total,
  count(*) FILTER (WHERE COALESCE(mastered, false))                                       AS mastered,
  count(*) FILTER (WHERE COALESCE(correct_in_review, false))                              AS correct_in_review,
  count(*) FILTER (WHERE type = 'pronunciation')                                          AS pronunciation,
  count(*) FILTER (WHERE btrim(COALESCE(original,'')) <> '' AND btrim(COALESCE(correction,'')) <> ''
                   AND lower(regexp_replace(original, '\s+', ' ', 'g')) <> lower(regexp_replace(correction, '\s+', ' ', 'g')))  AS valid_pairs,
  count(*) FILTER (WHERE btrim(COALESCE(original,'')) <> '' AND btrim(COALESCE(correction,'')) <> ''
                   AND lower(regexp_replace(original, '\s+', ' ', 'g')) = lower(regexp_replace(correction, '\s+', ' ', 'g')))   AS echo_rows,
  count(*) FILTER (WHERE btrim(COALESCE(original,'')) <> '' AND btrim(COALESCE(correction,'')) = '')                             AS no_correction,
  count(*) FILTER (WHERE lower(btrim(COALESCE(original,''))) IN ('历史错题','历史表达','历史导入内容'))                            AS placeholder_orig,
  count(*) FILTER (WHERE next_review_date IS NULL AND NOT COALESCE(mastered, false) AND NOT COALESCE(correct_in_review, false))  AS new_cards,
  count(*) FILTER (WHERE next_review_date IS NOT NULL)                                    AS on_curve,
  count(*) FILTER (WHERE ease_factor::text = 'NaN')                                       AS sm2_ef_nan,
  count(*) FILTER (WHERE ease_factor::text <> 'NaN' AND ease_factor < 1.3)                AS sm2_ef_below_13,
  count(*) FILTER (WHERE (next_review_date IS NOT NULL AND next_review_date::text !~ '^\d{4}-\d{2}-\d{2}$')
                        OR sm2_interval < 0 OR sm2_repetitions < 0 OR review_count < 0)   AS sm2_other_bad
FROM errors;

-- ═══════════════════════════════════════════════════════════════
-- 段 2：重复行 —— 同 user 下「原句+正句」文本对（去空白+小写）出现多行
--   v99 去重只按精确相等（大小写/空白变体漏网）；旧版导入每次盲插。前端 v116 起导入按文本对查重
-- ═══════════════════════════════════════════════════════════════
SELECT
  user_id,
  lower(regexp_replace(original, '\s+', ' ', 'g'))  AS original_normalized,
  lower(regexp_replace(correction, '\s+', ' ', 'g')) AS correction_normalized,
  count(*)                                          AS duplicate_rows
FROM errors
WHERE btrim(COALESCE(original,'')) <> ''
  AND btrim(COALESCE(correction,'')) <> ''
GROUP BY 1, 2, 3
HAVING count(*) > 1
ORDER BY duplicate_rows DESC;

-- ═══════════════════════════════════════════════════════════════
-- 段 3：脏行明细 —— 残形卡（无正句）/ 占位原句，前端一律不入队
--   no_correction 或 placeholder_orig 计数 > 0 时再跑这段看具体行
-- ═══════════════════════════════════════════════════════════════
SELECT id, date_added, original, correction, rule, next_review_date, review_count
FROM errors
WHERE btrim(COALESCE(correction,'')) = ''
   OR lower(btrim(COALESCE(original,''))) IN ('历史错题','历史表达','历史导入内容')
ORDER BY date_added DESC NULLS LAST
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════
-- 段 4：脏行明细 —— 回声卡（原句=正句），前端不入队
--   echo_rows 计数 > 0 时再跑这段看具体行
-- ═══════════════════════════════════════════════════════════════
SELECT id, date_added, original, correction, rule, next_review_date, review_count
FROM errors
WHERE btrim(COALESCE(original,'')) <> ''
  AND lower(regexp_replace(original, '\s+', ' ', 'g')) = lower(regexp_replace(correction, '\s+', ' ', 'g'))
ORDER BY date_added DESC NULLS LAST
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════
-- 段 5（可选）：坏曲线行明细 —— 仅当段 1 的 sm2_* 列任一 > 0 时再跑
-- ═══════════════════════════════════════════════════════════════
SELECT id, date_added, original, correction, ease_factor, sm2_interval, sm2_repetitions, review_count, next_review_date
FROM errors
WHERE ease_factor::text = 'NaN'
   OR (ease_factor::text <> 'NaN' AND ease_factor < 1.3)
   OR (next_review_date IS NOT NULL AND next_review_date::text !~ '^\d{4}-\d{2}-\d{2}$')
   OR sm2_interval < 0 OR sm2_repetitions < 0 OR review_count < 0
ORDER BY date_added DESC NULLS LAST
LIMIT 20;
