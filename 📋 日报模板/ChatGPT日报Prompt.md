# 📝 日报模板（新版 JSON 格式 · 2026-08-13 起 · v83 增补 duration 时长字段）

把下面这段指令发给 ChatGPT（或直接让 Claudian 生成），再把生成的 JSON **原样粘贴进 Voco「导入日报」对话框**即可解析入库。

---

请根据刚才的口语对话，严格生成以下 JSON 格式的学习日报。不要 Markdown 包装，不要省略任何字段，不要添加额外说明文字：

```json
{
  "duration": 25,
  "summary": {
    "topic": "练习话题（英文）",
    "thought": "对话后的反思（中文，第一人称）",
    "strengths": ["做得好的地方 1", "做得好的地方 2", "..."],
    "nextSteps": ["下次要练的重点 1", "重点 2", "..."],
    "fluency": 7,
    "accuracy": 6.5,
    "naturalness": 6
  },
  "mistakes": [
    { "type": "grammar", "original": "我说的原话（英文）", "improved": "正确说法", "explanation": "涉及的语法规则" },
    { "type": "expression", "original": "我的表达", "improved": "更地道的说法", "explanation": "什么场景下用" }
  ],
  "coreSentences": [
    { "targetSentence": "地道句型（跟读训练用）", "replacedSentence": "普通/生硬的表达", "explanation": "为什么这个更地道" }
  ],
  "newWords": [
    { "word": "单词", "phonetic": "/音标/", "meaning": "中文释义", "example": "例句" }
  ]
}
```

## 字段约定

| 字段 | 约定 |
|------|------|
| `duration` | **必填**。本次对话练习的总时长（分钟，数字）——首页「开口时长 / 总时长」直接消费（开口时长按 60% 折算） |
| `mistakes[].type` | 只能是 `"grammar"`（硬伤 → 首页红色纠错卡）或 `"expression"`（地道表达 → 无删除线卡） |
| `summary.fluency/accuracy/naturalness` | 0-10 数字，驱动首页 4 维指标 |
| `summary.thought` | 对话后的反思（中文，第一人称，一段话）——首页「当日对话想法」卡片 |
| `coreSentences` | 成为跟读页沉浸式播放器队列（1/N）；建议 5~8 句 |
| `newWords` | 自动打标「今日新词」；建议 5~12 个当天实际出现的生词 |

## 兼容说明

旧版 Markdown 模板日报**仍然可以正常导入**——App 内置无损清洗层 `normalizeDailyData` 会自动把老格式适配到新界面，历史记录一条不丢（8.10 / 8.12 等历史日报已验证）。
