-- cleanup_vocab_dupes.sql
-- v103：清理 vocabulary 表历史重复行（导入盲插遗留）
--
-- 背景：v103 之前「今日新词 → vocabulary」是盲 INSERT（无 upsert、无按词查重），
--       同词跨天出现 / 同日报重导 → 同一单词多行并存 → 今日待办按行渲染，满屏重复单词。
--       v103 起前端已双层修复：① 导入前按词查重（只插新词）② _wordsAll 渲染层按词去重。
--       本脚本物理清理存量重复行，让词汇表与前端口径一致。
--
-- 规则：每个 (user_id, 小写word) 只保留复习记录最多的那一行（并列取 id 最大 = 最新插入），其余删除。
--       SM-2 状态保留最完整的一行，复习进度不丢。
--
-- 执行方式：Supabase Dashboard → SQL Editor → 粘贴整段执行（幂等，可重复跑；跑完即无重复行）。

DELETE FROM vocabulary a
USING vocabulary b
WHERE a.user_id = b.user_id
  AND lower(a.word) = lower(b.word)
  AND (COALESCE(a.review_count, 0), a.id) < (COALESCE(b.review_count, 0), b.id);
