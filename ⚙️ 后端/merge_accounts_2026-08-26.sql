-- merge_accounts_2026-08-26.sql
-- v116：两账号数据合并执行记录 —— 2026-08-25 发现库内存在两个 user_id 的数据分裂
--
-- 背景（两账号之谜）：去重 JOIN 带 a.user_id = b.user_id 却全部返回 0 行的真因，
--   不是隐形 Unicode 字符，而是 8.13~8.22 期间 App 在旧身份 1b9ea5bc… 下写入，
--   8.23 前后换回当前身份 641d79b5…。四张核心表全部分裂，跨账号双胞胎永远配对不上。
--   分裂规模（GROUP BY user_id 实锤）：
--     patterns   1b9ea5bc=79 行(至8.22) + 641d79b5=31 行(至8.25)
--     vocabulary 1b9ea5bc=65 行(至8.21) + 641d79b5=19 行(至8.25)
--     errors     1b9ea5bc=40 行(至8.22) + 641d79b5=25 行(至8.25)
--     reports    1b9ea5bc=9 篇(至8.22)  + 641d79b5=5 篇(至8.25)
--   topics 表整表为空（v4.0 起弃用话题表，零处理）；user_config 为偏好设置，不迁。
--
-- 执行方式：Supabase SQL Editor 逐条执行（本文件为执行记录，均已实际跑完并核对）。

-- ① 核心三表直接改 user_id（无唯一约束，一步到位；不带 RETURNING 时编辑器显示 No rows returned 属正常）
-- UPDATE patterns   SET user_id = '641d79b5-9a4f-4f3b-8d76-1efcb5072b80' WHERE user_id = '1b9ea5bc-f710-4f4b-b008-472dca338681';  -- 79 行
-- UPDATE vocabulary SET user_id = '641d79b5-9a4f-4f3b-8d76-1efcb5072b80' WHERE user_id = '1b9ea5bc-f710-4f4b-b008-472dca338681';  -- 65 行
-- UPDATE errors     SET user_id = '641d79b5-9a4f-4f3b-8d76-1efcb5072b80' WHERE user_id = '1b9ea5bc-f710-4f4b-b008-472dca338681';  -- 40 行
-- 验证：三表 GROUP BY user_id 均只剩 641d79b5（patterns 120 / vocabulary 84 / errors 69 ——
--   比拆分时多出的行是当天复习写回的正常新增）。

-- ② patterns 合并后重去重（段 9/10 记录见 repair_patterns_fragments.sql）：
--   严格归一化预览恰 5 行 = 8.10 第三批拷贝双胞胎（2↔32/5↔35/8↔38/11↔41/14↔44）；
--   DELETE 删 5 行（id 2/5/8/11/14）→ patterns 115。
--   宽松层（连字符/尾随标点）与终极层（去非字母数字）均 0 行 —— 句型表三层归一化全净。

-- ③ errors 残形清理（cleanup_errors_broken.sql）：只有原句无正句的行预览 10 行 →
--   DELETE 删 10 行（id 7/9/10/13/16/19/68/71/74/77，全部 review_count=0 从未入队）
--   → errors 69 → 59。

-- ④ reports（UNIQUE(user_id,date)）两步走：
--   步 1 迁独有日期 6 篇（8.12/8.13/8.15/8.16/8.17/8.19）；
--   步 2 删重叠日期旧副本 4 篇（8.10/8.21/8.22/8.25 —— 其中 8.25 是旧设备会话当天新写的，
--     证明旧身份会话仍存活，合并后必须切断）。reports 最终 11 篇，全在当前账号。

-- ⑤ topics：整表 0 行，无需处理。

-- ⑥ progress（UNIQUE(user_id) 单行/账号）字段级合并（旧账号数组在前保持时间序）：
-- UPDATE progress b SET total_sessions=b.total_sessions+a.total_sessions,
--   total_minutes=b.total_minutes+a.total_minutes, fluency_trend=a.fluency_trend||b.fluency_trend,
--   accuracy_trend=a.accuracy_trend||b.accuracy_trend, weak_areas=a.weak_areas||b.weak_areas,
--   topics=a.topics||b.topics, words_learned=b.words_learned+a.words_learned,
--   words_mastered=b.words_mastered+a.words_mastered, errors_fixed=b.errors_fixed+a.errors_fixed
-- FROM progress a WHERE a.user_id='1b9ea5bc-f710-4f4b-b008-472dca338681'
--   AND b.user_id='641d79b5-9a4f-4f3b-8d76-1efcb5072b80'
-- RETURNING b.user_id,b.total_sessions,b.total_minutes,b.words_learned,b.errors_fixed;
--   → 24 / 103 / 84 / 33（words_learned=合并后词汇实际行数、errors_fixed=correct_in_review 实际行数，互证吻合）
--   随后 DELETE FROM progress WHERE user_id='1b9ea5bc…'（1 行）。

-- ⑦ vocabulary 跨时代同词双胞胎：GROUP BY lower(btrim(word)) HAVING count(*)>1 → 9 对
--   （augment/coexist/craftsmanship/existential/irreplaceable/leverage/mimic/phase out/pivot）。
--   按 (review_count,id) 元组保留曲线最强行，按预览锁定的 id 清单删除：
-- DELETE FROM vocabulary WHERE id IN (9,10,11,12,13,14,15,16,127);
--   → 删 9 行（其中 id 127 是 8.25 写回时盲插的 leverage 新行——「id 199 式」的词汇版）。
--   → vocabulary 84 → 75。

-- ⚠️ 待办（收尾）：切断旧身份会话（旧设备登出或删除 auth.users 中 1b9ea5bc…），
--   否则旧设备任何操作都会重新写入旧账号、再次分裂。此为本批修复的最后一环。
