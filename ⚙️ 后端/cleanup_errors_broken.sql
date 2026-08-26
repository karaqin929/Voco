-- cleanup_errors_broken.sql
-- v116：errors 表（语法错题库）残形行清理 —— 只删「只有原句、无正句」的行
--
-- 审计依据（audit_errors_integrity.sql 段 1，用户已跑过）：
--   total=62 = valid_pairs 43（保留）+ no_correction 9（本脚本删除目标）+ correction-only 10（保留）；
--   其中 correct_in_review=33（v99 历史清理行）是前两类的一部分，全部保留。
--   echo / 占位 / 发音 / SM-2 坏曲线全部为 0 —— 错题表没有别的脏形态。
--
-- 为什么删：这类行翻面「正确句」区为空，用户翻了个寂寞；
--   前端 v116 的 dueErrorCards 内容门已把它们永久挡在队列外（读时防御），
--   物理删除是让表本身也干净。
-- 为什么保留：correct_in_review 33 行是 v99 标的历史战绩（成就「纠正20次」计数来源）；
--   correction-only 10 行（只有正句、无原句）从未入队，零危害，留作史料。
--
-- ⚠️ 运行方式：Supabase SQL Editor 一次只显示最后一条语句的结果 —— 请逐段运行。
--   段 1（预览，纯 SELECT）：应恰好 9 行，核对后再跑段 2。
--   幂等：删完后再跑段 2 零影响。

-- ══ 段 1：预览 —— 将删除的残形行（应恰好 9 行）──
SELECT id, date_added, original, correction, rule, next_review_date, review_count
FROM errors
WHERE btrim(COALESCE(correction,'')) = '';

-- ══ 段 2：删除 —— 只有原句、无正句的残形行（RETURNING 返回 9 行被删记录）──
DELETE FROM errors
WHERE btrim(COALESCE(correction,'')) = ''
RETURNING id, date_added, original, correction, review_count, next_review_date;
