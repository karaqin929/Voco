# 📝 日报模板（新版 JSON 格式 · 2026-08-13 起 · v83 增补 duration · v90 三模块补全 · v94 弯引号禁令）

把下面这段指令发给 ChatGPT（或直接让 Claudian 生成），再把生成的 JSON **原样粘贴进 Voco「导入日报」对话框**即可解析入库。

> ⚠️ v90 起 App 内「复制模板」按钮与本文档完全同步，直接复制即可。

---

请根据刚才的口语对话，严格生成以下 JSON 格式的学习日报。不要 Markdown 包装，不要省略任何字段，不要添加额外说明文字：

> 【本次口语练习时长：__分钟】（发出去前先填上实际分钟数）

> ⚠️ **引号铁律：整份 JSON 只允许英文直引号 `"`（半角），严禁弯引号/智能引号 “ ” ‘ ’——任何弯引号都会让 JSON 解析直接失败、整份日报报废。生成完成后自查一遍：看到任何 “ ” ‘ ’ 立即改回直引号。**

```json
{
  "duration": 25,
  "summary": {
    "topic": "练习话题（英文）",
    "dailyThought": { "en": "英文一句反思金句", "zh": "对话后的反思（中文，第一人称，一段话）" },
    "strengths": ["做得好的地方 1", "做得好的地方 2", "..."],
    "nextSteps": ["下次要练的重点 1", "重点 2", "..."],
    "fluency": 7,
    "accuracy": 6.5,
    "naturalness": 6,
    "weak_areas": "时态, 单复数"
  },
  "mistakes": [
    { "type": "grammar", "original": "我说的原话（英文）", "improved": "正确说法", "explanation": "涉及的语法规则" },
    { "type": "pronunciation", "original": "发音错误的词或句子", "improved": "正确发音写法", "explanation": "音标或发音要点" },
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
| 引号（全局铁律） | **只允许英文直引号 `"`（半角）**，严禁弯引号 “ ” ‘ ’（智能引号会让 JSON 解析失败 → 日报变空壳）。v94 起 App 解析层有归一化兜底，但源头必须遵守此铁律 |
| `duration` | **必填**。本次对话练习的**真实**总时长（分钟，数字）——首页「开口时长 / 总时长」直接消费（开口时长按 60% 折算）。**开头【】里已写明本次练习时长，直接使用该数字；若【】为空，先询问用户再生成，绝不允许照抄示例值 25 或编造** |
| `summary.dailyThought` | **必填双语**：`en` 英文一句总结，`zh` 中文第一人称反思（一段话，结合评分表现点出今天最值得改进的一点）——首页「当日对话想法」卡片 |
| `summary.fluency/accuracy/naturalness` | **必填**，0-10 数字（可含一位小数），驱动首页 4 维指标与 Profile 趋势图。**以专业口语私教评审逻辑，基于今天对话的具体表现逐项打分**：fluency 看停顿迟疑与语速、accuracy 看语法错误频率、naturalness 看地道程度。禁止照抄示例值 7/6.5/6 |
| `summary.weak_areas` | 弱项标签（逗号分隔，1-3 个）——Profile 页弱项云。**归纳今天对话暴露最明显的弱点，禁止照抄示例「时态, 单复数」** |
| `mistakes[].type` | 严格三类，绝不混用：`"grammar"`（语法硬伤 → 红色纠错卡）、`"pronunciation"`（发音错误 → 发音纠正卡）、`"expression"`（地道表达升级 → 句型库）。今天没有某类错误的条目直接省略 |
| `coreSentences` | 成为跟读页沉浸式播放器队列（1/N）；建议 5~8 句；`targetSentence` 与 `replacedSentence` 必须同时存在 |
| `newWords` | 自动打标「今日新词」；建议 5~12 个当天实际出现的生词 |

## 兼容说明

旧版 Markdown 模板日报**仍然可以正常导入**——App 内置无损清洗层 `normalizeDailyData` 会自动把老格式适配到新界面，历史记录一条不丢（8.10 / 8.12 等历史日报已验证）。
