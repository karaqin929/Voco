-- repair_patterns_fragments.sql
-- v116：patterns 表「三胞胎碎片」重组修复 —— 8.10 日报被盲插导入 3 次、8.12 被导入 2 次，
--       旧版导入把每条「地道表达」拆成三行入库（原句行 / 正句行 / 场景行，id 恰为 N, N+1, N+2 连续）。
--       46 行碎片 + 23 张金句卡 = 23 张完整三段式纠错卡。
--
-- 已实锤验证（2026-08-25）：
--   ① 审计段 1：broken 23 + 全空 23 + better-only 23，三组碎片数量严丝合缝；
--   ② 重建预览 JOIN：恰好 23 行，每组「原句+正句+场景」内容完全对得上（用户已逐行核对）；
--   ③ cleanup_2026-08-18.sql 只删 8.18 的行，id 1~69 完好，相邻关系可靠。
--
-- 效果：23 张金句卡补回原句与场景 → 升级为完整纠错卡（SM-2 曲线字段保留在正句行上，复习进度不丢）；
--       46 行碎片物理清除；表 196 行 → 150 行（全部内容完整），随后段 3/4 按正句文本去重 → 约 136 行。
--
-- 执行方式：Supabase Dashboard → SQL Editor。⚠️ 一次只显示最后一条语句的结果 —— 请逐段运行。
--   段 1 + 段 2（重组 + 清碎片）已由预览验证，可依次执行；
--   段 3（去重预览，纯 SELECT）先核对 → 确认后再跑段 4（去重 DELETE）。
--   全程幂等：重复执行零副作用（已重组行不再匹配 / 碎片已删 / 重复已去）。

-- ══ 段 1：重组 —— 23 张金句卡补回原句与场景（曲线字段一行不动）。
--   RETURNING 会返回恰好 23 行，且 original / scene 两列都已填上内容 —— 眼见为实 ──
UPDATE patterns b
SET original = o.original,
    scene = s.scene
FROM patterns o, patterns s
WHERE o.id = b.id - 1 AND o.user_id = b.user_id
  AND s.id = b.id + 1 AND s.user_id = b.user_id
  AND btrim(COALESCE(b.better,'')) <> ''
  AND btrim(COALESCE(b.original,'')) = ''
  AND btrim(COALESCE(b.scene,'')) = ''
  AND btrim(COALESCE(o.better,'')) = '' AND btrim(COALESCE(o.original,'')) <> ''
  AND btrim(COALESCE(s.better,'')) = '' AND btrim(COALESCE(s.original,'')) = ''
  AND btrim(COALESCE(s.scene,'')) <> ''
RETURNING b.id, b.date_added, b.original, b.better, b.scene;

-- ══ 段 2：清碎片 —— 删掉 46 行残形/全空行（重组后 better 为空的行只剩垃圾）。
--   RETURNING 会返回恰好 46 行被删记录，可与你之前预览过的清单逐一对 ──
DELETE FROM patterns
WHERE btrim(COALESCE(better,'')) = ''
RETURNING id, date_added, original, scene, review_count, next_review_date;

-- ══ 段 3：去重预览（纯 SELECT）—— 重组后同一正句文本出现多行（8.10 导入 3 次 → 每组 3 行；
-- 展示层已按文本去重，本段列出将物理删除的重复行，保留曲线最强的那一行。预期约 14 行，核对后再跑段 4 ──
SELECT DISTINCT ON (a.id)
  a.id AS delete_id, a.date_added, a.original, a.better, a.review_count, a.next_review_date
FROM patterns a
JOIN patterns b
  ON a.user_id = b.user_id
 AND lower(regexp_replace(a.better, '\s+', ' ', 'g')) = lower(regexp_replace(b.better, '\s+', ' ', 'g'))
 AND btrim(COALESCE(a.better,'')) <> ''
 AND (COALESCE(a.review_count,0), a.id) < (COALESCE(b.review_count,0), b.id)
ORDER BY a.id;

-- ══ 段 4：去重 —— 同一正句文本只留曲线最强（review_count 最高，并列取 id 最大）那一行 ──
-- 实际执行记录（2026-08-25）：删 45 行 = 预览 44 行 + id 199（8.25 当天在段 3→段 4 之间新入库的
--   重复行，被当场拿下——证明「导入即查重」的必要性，v116 前端已内建同一逻辑）──
DELETE FROM patterns a
USING patterns b
WHERE a.user_id = b.user_id
  AND lower(regexp_replace(a.better, '\s+', ' ', 'g')) = lower(regexp_replace(b.better, '\s+', ' ', 'g'))
  AND btrim(COALESCE(a.better,'')) <> ''
  AND (COALESCE(a.review_count,0), a.id) < (COALESCE(b.review_count,0), b.id);

-- ══ 段 5：变体收尾预览（纯 SELECT）—— 段 4 的精确归一化认不出的「标点/尾随空格/连字符变体」重复行。
--   宽松归一化 = 连字符变体(—–−-)→空格 + 去尾部非字母数字 + 折叠空白 + trim + lower。
--   预期 ≥5 行（8.10 三胞胎每组的第 3 份拷贝），delete 与 keep 两侧文本并排供核对 ──
SELECT DISTINCT ON (a.id)
  a.id AS delete_id, a.review_count AS a_rc, a.better AS a_better,
  b.id AS keep_id, b.review_count AS b_rc, b.better AS b_better
FROM patterns a
JOIN patterns b
  ON a.user_id = b.user_id
 AND lower(btrim(regexp_replace(regexp_replace(regexp_replace(a.better, '[-—–]+', ' ', 'g'), '[^A-Za-z0-9]+$', '', 'g'), '\s+', ' ', 'g')))
   = lower(btrim(regexp_replace(regexp_replace(regexp_replace(b.better, '[-—–]+', ' ', 'g'), '[^A-Za-z0-9]+$', '', 'g'), '\s+', ' ', 'g')))
 AND btrim(COALESCE(a.better,'')) <> ''
 AND (COALESCE(a.review_count,0), a.id) < (COALESCE(b.review_count,0), b.id)
ORDER BY a.id, b.id;

-- ══ 段 6：变体去重 —— 段 5 核对无误后执行，同一宽松归一化文本只留曲线最强行 ──
-- 执行记录（2026-08-25）：段 5 预览返回 0 行 → 剩余双行差异为隐形 Unicode 字符（弯引号/直引号、
--   不换行空格等），段 5/6 宽松归一化不适用，改走段 7/8（去除非字母数字全量比对）。段 6 保留备用。
DELETE FROM patterns a
USING patterns b
WHERE a.user_id = b.user_id
  AND lower(btrim(regexp_replace(regexp_replace(regexp_replace(a.better, '[-—–]+', ' ', 'g'), '[^A-Za-z0-9]+$', '', 'g'), '\s+', ' ', 'g')))
    = lower(btrim(regexp_replace(regexp_replace(regexp_replace(b.better, '[-—–]+', ' ', 'g'), '[^A-Za-z0-9]+$', '', 'g'), '\s+', ' ', 'g')))
  AND btrim(COALESCE(a.better,'')) <> ''
  AND (COALESCE(a.review_count,0), a.id) < (COALESCE(b.review_count,0), b.id)
RETURNING a.id, a.date_added, a.better, a.review_count, a.next_review_date;

-- ══ 段 7：隐形字符变体预览（纯 SELECT）—— 段 5 为 0 行后的最后手段：
--   去掉一切非字母数字字符（空格/标点/弯引号/不换行空格全移除）再比对，揪出 Unicode 级变体双行。
--   预期约 5 行（8.10 三胞胎剩余双行），delete 与 keep 两侧文本并排供肉眼核对 ──
SELECT DISTINCT ON (a.id)
  a.id AS delete_id, a.review_count AS a_rc, a.better AS a_better,
  b.id AS keep_id, b.review_count AS b_rc, b.better AS b_better
FROM patterns a
JOIN patterns b
  ON a.user_id = b.user_id
 AND lower(regexp_replace(a.better, '[^a-zA-Z0-9]', '', 'g'))
   = lower(regexp_replace(b.better, '[^a-zA-Z0-9]', '', 'g'))
 AND btrim(COALESCE(a.better,'')) <> ''
 AND (COALESCE(a.review_count,0), a.id) < (COALESCE(b.review_count,0), b.id)
ORDER BY a.id, b.id;

-- ═══════════════════════════════════════════════════════════════════════
-- 2026-08-25 重大发现（两账号之谜）：段 5/段 7 均返回 0 行的真因不是隐形 Unicode 字符，
--   而是表里存在两个 user_id（1b9ea5bc…79 行 = 8.13~8.22 期间的旧会话账号；
--   641d79b5…= 当前账号）。所有去重 JOIN 都带 a.user_id = b.user_id，跨账号双胞胎永远配对不上。
--   四张核心表全部分裂（patterns 79+31 / vocabulary 65+19 / errors 40+25 / reports 9+5），
--   合并方案：全部 UPDATE user_id 迁回当前账号 641d79b5-9a4f-4f3b-8d76-1efcb5072b80。
-- 2026-08-26 合并后重去重（段 9/10）：严格归一化预览恰 5 行 = 8.10 第三批拷贝
--   （2↔32 / 5↔35 / 8↔38 / 11↔41 / 14↔44），文本完全一致；DELETE 删 5 行（id 2/5/8/11/14），
--   保留曲线更强侧（32/35/38/41/44）。patterns 120 → 115。
-- ═══════════════════════════════════════════════════════════════════════

-- ══ 段 9：合并后严格去重预览（两账号合并后同池，5 对双胞胎终于配对）—— 已执行，恰 5 行 ══
-- SELECT DISTINCT ON (a.id)
--   a.id AS delete_id, a.date_added, a.original, a.better, a.review_count, a.next_review_date
-- FROM patterns a
-- JOIN patterns b
--   ON a.user_id = b.user_id
--  AND lower(regexp_replace(a.better, '\s+', ' ', 'g')) = lower(regexp_replace(b.better, '\s+', ' ', 'g'))
--  AND btrim(COALESCE(a.better,'')) <> ''
--  AND (COALESCE(a.review_count,0), a.id) < (COALESCE(b.review_count,0), b.id)
-- ORDER BY a.id;

-- ══ 段 10：合并后严格去重 —— 已执行，删 5 行（id 2/5/8/11/14，review_count 均 0），
--    保留 32/35/38/41/44（曲线更强侧）。patterns 120 → 115 ══
-- DELETE FROM patterns a
-- USING patterns b
-- WHERE a.user_id = b.user_id
--   AND lower(regexp_replace(a.better, '\s+', ' ', 'g')) = lower(regexp_replace(b.better, '\s+', ' ', 'g'))
--   AND btrim(COALESCE(a.better,'')) <> ''
--   AND (COALESCE(a.review_count,0), a.id) < (COALESCE(b.review_count,0), b.id)
-- RETURNING a.id, a.date_added, a.better, a.review_count;

-- ══ 段 8：隐形字符变体去重 —— 段 7 核对无误后执行，同文本只留曲线最强行 ──
DELETE FROM patterns a
USING patterns b
WHERE a.user_id = b.user_id
  AND lower(regexp_replace(a.better, '[^a-zA-Z0-9]', '', 'g'))
    = lower(regexp_replace(b.better, '[^a-zA-Z0-9]', '', 'g'))
  AND btrim(COALESCE(a.better,'')) <> ''
  AND (COALESCE(a.review_count,0), a.id) < (COALESCE(b.review_count,0), b.id)
RETURNING a.id, a.date_added, a.better, a.review_count, a.next_review_date;
