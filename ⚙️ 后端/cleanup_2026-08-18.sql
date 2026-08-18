-- ════════════════════════════════════════════════════════════════
-- Voco 数据清理脚本：清除 2026-08-18 日报（狗狗话题属于 8.17，8.18 待重新上传）
-- 执行位置：Supabase SQL Editor
--   https://supabase.com/dashboard/project/dgmatfpwekziyumdfpcu/sql/new
-- 全选 → Run。执行前无需手工改任何内容；脚本自带保护（无该日日报则直接跳过）。
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_content text;
  v_json jsonb;
  v_topic text := '';
  v_dur int := 0;
  v_other_report_count int := 0;
BEGIN
  -- ① 先取出 8.18 日报原文（删除前），用于精确回滚 progress 与 topics
  SELECT content INTO v_content FROM reports WHERE date = '2026-08-18' LIMIT 1;

  IF v_content IS NULL THEN
    RAISE NOTICE '✅ 未找到 2026-08-18 的日报，无需清理。';
    RETURN;
  END IF;

  -- ② 从 JSON 原文提取 topic / duration（旧版模板 duration 可能在顶层或 summary 内）
  BEGIN
    v_json := v_content::jsonb;
    v_topic := COALESCE(v_json->'summary'->>'topic', '');
    v_dur := COALESCE(
      (v_json->>'duration')::int,
      (v_json->'summary'->>'duration')::int,
      (v_json->'summary'->>'durationMinutes')::int,
      0
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ 8.18 日报内容不是合法 JSON，按 topic='''' / duration=0 回滚。';
    v_json := NULL;
  END;

  -- ③ 删除该日派生数据（词 / 错题 / 句型 / 日报原文）
  DELETE FROM vocabulary WHERE date_added = '2026-08-18';
  DELETE FROM errors     WHERE date_added = '2026-08-18';
  DELETE FROM patterns   WHERE date_added = '2026-08-18';
  DELETE FROM reports    WHERE date = '2026-08-18';

  -- ④ progress 回滚：
  --    · total_sessions −1、total_minutes −该日报时长（下限 0）
  --    · fluency_trend / accuracy_trend 去掉最后一项（8.18 是该表最后一次写入）
  --    · topics 数组：仅当其他日报不再包含该话题时才移除（避免误删 8.17 等历史话题）
  --    · words_learned / errors_fixed 按表实况重算（自愈）
  --    · weak_areas 保留（全时期去重列表，删除反而可能误伤历史累积）
  IF v_topic <> '' THEN
    SELECT count(*) INTO v_other_report_count
    FROM reports
    WHERE date <> '2026-08-18' AND content LIKE '%' || v_topic || '%';
  END IF;

  UPDATE progress SET
    total_sessions = GREATEST(total_sessions - 1, 0),
    total_minutes  = GREATEST(total_minutes - v_dur, 0),
    fluency_trend  = CASE WHEN jsonb_array_length(fluency_trend) > 0
                          THEN fluency_trend - (jsonb_array_length(fluency_trend) - 1)
                          ELSE fluency_trend END,
    accuracy_trend = CASE WHEN jsonb_array_length(accuracy_trend) > 0
                          THEN accuracy_trend - (jsonb_array_length(accuracy_trend) - 1)
                          ELSE accuracy_trend END,
    topics         = CASE WHEN v_topic <> '' AND v_other_report_count = 0
                          THEN topics - v_topic
                          ELSE topics END,
    words_learned  = (SELECT count(*) FROM vocabulary),
    errors_fixed   = (SELECT count(*) FROM errors WHERE correct_in_review),
    updated_at     = NOW();

  -- ⑤ topics 表回滚：8.18 导入给该话题 +1，此处 −1（8.17 的 +1 保留）
  IF v_topic <> '' THEN
    UPDATE topics
    SET practice_count = GREATEST(practice_count - 1, 0)
    WHERE title = v_topic AND practice_count > 0;
  END IF;

  RAISE NOTICE '✅ 8.18 日报已清除：topic=% , 时长回滚=% 分钟', v_topic, v_dur;
END $$;
