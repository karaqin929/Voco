# 📝 完美日报生成指令（唯一权威版 · v105：新增 coach_insights 私教洞察四维诊断）

> **和 ChatGPT 结束对练时，把下面整段指令发过去**（或直接点 App 内「导入日报」弹窗的「复制模板」按钮——两者完全同步）。
> 生成的 JSON **原样粘贴进 Voco「导入日报」对话框**即可解析入库。
> ⚠️ 此版已锁定系统认可的完整字段结构：任何键名偏差、弯引号、Markdown 包装都会导致整份日报被拒收。

---

你现在是我的资深英语口语教练。请根据我们今天的对话，生成一份结构化的学习日报。这份日报会被我的学习系统直接读取入库，必须一次成型、零修改。

只输出一段纯 JSON 文本：从第一个 { 开始、到最后一个 } 结束。前后严禁出现任何说明文字、标题、Markdown 代码块标记（```）。全篇所有引号必须是英文半角直引号 "——严禁弯引号 “ ” ‘ ’，尤其严禁用 ” 同时作开闭引号（详见【引号铁律】）。JSON 结构必须严格如下：

```json
{
  "speakingRatio": 62,
  "summary": {
    "topic": "今天对话的核心主题标签",
    "dailyThought": { "en": "英文一句反思金句", "zh": "对话后的反思（中文，第一人称，一段话）" },
    "strengths": ["优点1", "优点2", "优点3"],
    "nextSteps": ["下一次练习建议1", "建议2"],
    "fluency": 7,
    "accuracy": 6.5,
    "naturalness": 6,
    "vocabulary": 7,
    "weak_areas": "时态, 冠词"
  },
  "mistakes": [
    { "type": "grammar", "original": "错误的句子", "improved": "正确的句子", "explanation": "简短的语法解释", "category": "动词与时态" },
    { "type": "pronunciation", "original": "发音错误的词或句子", "improved": "正确发音写法", "explanation": "音标或发音要点" },
    { "type": "expression", "original": "中式或普通的句子", "improved": "更地道高阶的表达", "explanation": "为什么这样说更好：重点词汇（固定搭配、高频词）与句型结构提示", "pattern": "直译语序" }
  ],
  "coreSentences": [
    { "targetSentence": "高阶金句", "replacedSentence": "被替代的普通表达", "explanation": "为什么这个更地道：重点词汇（固定搭配、高频词）与句型结构提示" }
  ],
  "newWords": [
    { "word": "单词", "phonetic": "/音标/", "meaning": "中文释义", "example": "包含该词的例句" }
  ],
  "coach_insights": {
    "vocabulary": "总结今日词汇痛点。例如：在描述抽象概念时词汇受限，过度依赖基础词汇。",
    "grammar": "总结今日最高频的语法错误模式。例如：频繁在从句时态和介词搭配上出错。",
    "expression": "点出不够地道的思维原因。例如：习惯中文主谓直译，缺乏地道的物称主语思维。",
    "core_patterns": "总结今日金句的交际场景。例如：适合用于职场深度探讨和表达个人复盘的复杂句式。"
  }
}
```

【字段结构铁律】——键名一字不差、类型严格一致，任何一条违反都会导致日报被系统拒绝：
1. 顶层必须正好是 speakingRatio、summary、mistakes、coreSentences、newWords、coach_insights 这 6 个键，一个都不能少。今天没有某类内容时输出空数组 []，绝不允许删除键、改成 null 或写成别的名字。
2. speakingRatio 是你说话量占总对话量的比例（百分比数字，0-100，可含一位小数，纯数字不是字符串）。基于本次对话的真实内容估算：按你的发言字数（或句数）÷ 双方总发言量计算——例如你说了约六成的话，就输出 62。这是从对话内容推导出的客观统计，严禁凭空编造或照抄示例值 62。
3. summary 必须是对象，且包含以下 9 个键：topic（字符串，单个主题标签，严禁用逗号分隔多个话题）、dailyThought（对象，必含 en 和 zh 两个字符串）、strengths（字符串数组）、nextSteps（字符串数组）、fluency（数字）、accuracy（数字）、naturalness（数字）、vocabulary（数字）、weak_areas（字符串）。9 键一个都不能少。
4. mistakes 数组的每一项必须同时包含 type、original、improved、explanation 四个键。type 只允许以下三个值之一，绝不混用、绝不自造其他值：
   - "grammar"：语法硬伤——还必须包含第五个键 category（语法弱点分类，只允许以下三个值之一，按错误的本质归类）：
     "动词与时态"（时态错误、主谓一致、第三人称单数等动词形态问题）、
     "名词与冠词"（冠词 a/an/the 的缺失或误用、名词单复数等名词属性问题）、
     "句式与搭配"（介词误用、固定搭配、词性误用、句式结构、其他语法问题）；
     explanation 必须写明具体的语法规则和改正要点（如「一般过去时用 went」），严禁用分类名代替解释。
   - "pronunciation"：发音错误（读错的词、重音、元音等）；
   - "expression"：语法正确但不够地道的表达升级——type 为 expression 的项还必须包含第五个键 pattern（不自然根因，只允许以下四个值之一）："直译语序"（中文语序/逐字直译，如 I very like it）、"用词搭配"（用词不当、词性误用或搭配错误，如 learn knowledge）、"冗余啰嗦"（多余的重复或填充，如 more better）、"表达习惯"（语法没错但不符合母语者习惯的说法）。explanation 必须写「为什么这样说更好」：具体写出重点词汇与固定搭配、句型结构，作为复习时回忆整句的线索；只写场景、不给词汇与句型提示的 explanation 视为不合格。
5. coreSentences 数组的每一项必须同时包含 targetSentence（高阶金句）、replacedSentence（被替代的平庸表达）、explanation 三个键。explanation 必须写「为什么这个更地道」：具体写出①重点词汇与固定搭配（如「take the time to do sth」）；②句型结构/句式骨架，作为复习时回忆整句的线索。只写场景、不给词汇与句型提示的 explanation 视为不合格。
6. newWords 数组的每一项必须同时包含 word、phonetic、meaning、example 四个键，word 不能为空字符串。
7. coreSentences 与 newWords 不设数量上限：只把今天对话中真实出现、值得收录的内容整理出来——coreSentences 收录所有值得内化的地道句型（高阶、高频、有明显改进价值的表达）；newWords 只收录「你不会的生词」：对话中你不认识、说不出、卡壳、查过、用错或被纠正过的词。严禁收录你本来就认识的常用词。宁缺毋滥：今天没有就输出空数组 []，绝不允许为了凑数量编造内容，也不允许因为觉得太少而凑词。
8. coach_insights 必须是对象，包含以下 4 个键：vocabulary（今日词汇痛点）、grammar（今日最高频的语法错误模式）、expression（不够地道的思维原因）、core_patterns（今日金句适用的交际场景）。每句用中文写 1-2 句诊断评语，以严厉且专业的私教口吻直接指出问题：基于今天对话中的具体表现（结合 mistakes 的 category/pattern 分布与 weak_areas），严禁空泛表扬、严禁套话、严禁编造。

【评分与点评铁律】（专业口语私教评审）：
- 逐项回看今天对话中用户的实际表现，基于对话里的具体证据打分（0-10，可含一位小数）：fluency 流利度（停顿、迟疑、重复、语速）；accuracy 准确度（时态、单复数、冠词、句式等语法错误频率）；naturalness 自然度（是否地道、搭配是否自然、有无中式英语）；vocabulary 词汇丰富度（用词是否丰富准确：是否反复依赖简单词、是否用上对话中学到的新表达）。
- weak_areas：归纳今天暴露最明显的 1-3 个弱点（中文标签，逗号分隔）。
- 每一项评分与弱项都必须来自今天的真实对话，禁止照抄示例值 7 / 6.5 / 6 / 7 / "时态, 单复数"。
- summary.dailyThought：en 用英文一句话总结今天最值得改进的一点；zh 用中文第一人称写一段反思，结合上面的评分点出今天最值得改进的一点。

【引号铁律】——违反任何一条 = 整份日报报废，系统直接拒收：
1. 全篇只允许英文半角直引号 "——包裹键名的引号和包裹字符串值的引号都必须用它。严禁弯引号 “ ” 和弯单引号 ‘ ’，包括字符串值内部（本指令文本中出现的 “ ” ‘ ’ 仅为反面示例，绝不要复制进 JSON）。特别警惕「右引号双边」硬错误：部分 GPT 版本会把某个字符串的开闭引号都写成弯右引号 ”（高频出现在 phonetic 音标字段，如 ”/ˈsiːlɪŋ/”），这同样是硬错误——开引号与闭引号必须同为半角直引号 "（写成 "/ˈsiːlɪŋ/"）。
2. 字符串值内部需要中文强调时（如 explanation 里引用某个中文词），一律使用「」（方角括号），或者不加任何引号。严禁在值内出现弯引号。
3. 英文缩写（I'm、aren't、don't）用英文直单引号 '（半角），绝不用弯单引号 ’。
4. 所有字符串值必须写成单行——严禁在字符串值内部换行（值内换行会直接导致 JSON 失效）。
5. 字符串值内如需英文引述（如例句 He said "hi"），请改用英文单引号 '（写成 He said 'hi'）或加反斜杠转义（写成 He said \"hi\"），严禁出现未转义的直双引号。

【输出前自检】——必须逐条确认，全部通过才允许输出：
□ 整篇无任何 “ ” ‘ ’ 弯引号，值内中文强调用的是「」；
□ 从第一个 { 到最后一个 } 是完整合法 JSON，无 Markdown 围栏、无说明文字；
□ 顶层 6 个键齐全（含 coach_insights），summary 的 9 个键齐全，空内容用 [] 不用 null；
□ mistakes 每项的 type 只有 grammar / pronunciation / expression 三种，grammar 项含 category 键且取值只有动词与时态 / 名词与冠词 / 句式与搭配 三种，expression 项含 pattern 键且取值只有直译语序 / 用词搭配 / 冗余啰嗦 / 表达习惯 四种；
□ speakingRatio 是基于本次对话内容估算的百分比数字（0-100），不是示例值 62；
□ 所有字符串值均为单行，值内无未转义的直双引号；
□ 无任何以 ” 开头的字符串——开闭引号必须同为半角直引号 "（逐字段检查 phonetic 音标字段）；
□ newWords 的每个词都是我今天不会/卡壳/被纠正的生词，没有一个是我本来就认识的常用词；
□ coach_insights 四句诊断都基于今日对话的具体表现，严厉专业、直接指出问题，无空泛套话；
□ 所有键名与上面示例结构一字不差。

---

## 系统认可的字段全链路对照表（调研结论）

GPT 日报 JSON → Voco 系统消费链路的完整映射，字段名即契约：

| GPT JSON 字段 | 类型 | 系统消费位置 |
|------|------|------|
| `speakingRatio` | 数字（0-100 百分比） | 首页「对话占比」头部行（你% / AI%）+ 导入预览卡「对话占比」 |
| `duration`（旧版兼容，可选） | 数字（分钟） | 首页「开口时长/总时长」×0.6、`progress.total_minutes`（旧日报仍可用，新模板不再输出） |
| `summary.topic` | 字符串 | 首页话题标签、`topics` 表、各表 `source_topic` |
| `summary.dailyThought.en/.zh` | 字符串 | 首页「当日对话想法」卡片 |
| `summary.strengths[]` | 数组 | 首页「优点」列表 |
| `summary.nextSteps[]` | 数组 | 首页「下一次练习建议」 |
| `summary.fluency/accuracy/naturalness/vocabulary` | 0-10 数字 | 首页 4 维指标 + Profile 趋势图（vocabulary = 词汇丰富度私教评分，替代旧版「词数×20」折算） |
| `summary.weak_areas` | 逗号分隔字符串 | Profile 弱项云 |
| `mistakes[].type` | 枚举：grammar/pronunciation/expression | 分流三路：grammar+pronunciation → `errors` 表（红卡）；expression → `patterns` 表（句型库） |
| `mistakes[].original/improved/explanation` | 字符串 | `errors.original/correction/rule` 或 `patterns.original/better/scene` |
| `mistakes[].pattern`（expression 专属） | 枚举：直译语序/用词搭配/冗余啰嗦/表达习惯 | Profile「不自然表达分析」根因分布 + 高频句式 |
| `mistakes[].category`（grammar 专属） | 枚举：动词与时态/名词与冠词/句式与搭配 | 入库写入 `errors.error_pattern` 列 → Profile「语法弱点分析」三类分布（旧行无标签按内容自动归类） |
| `coreSentences[].targetSentence/replacedSentence/explanation` | 字符串 | `patterns` 表 + 跟读页沉浸式播放器队列（1/N） |
| `newWords[].word/phonetic/meaning/example` | 字符串 | `vocabulary` 表（word/phonetic/meaning/example）+ 自动打标「今日新词」 |
| `coach_insights.vocabulary/grammar/expression/core_patterns` | 字符串 ×4 | 首页「需要提升」四卡第 1 行「洞察」（v105 新增；旧日报无该字段 → 同一行静默回落基础统计文案） |

## 兼容说明

- 旧版 Markdown 模板日报**仍然可以正常导入**——App 内置无损清洗层 `normalizeDailyData` 会把老格式适配到新界面，历史记录一条不丢。
- v96 起 App 解析层内置「智能引号状态机」兜底：即使 GPT 输出含弯引号或值内嵌套中文引号，也能安全归一化后解析（兜底网，不替代本指令的源头铁律）。
- v97 起**不再需要手动填写练习时长**：会话维度由 `speakingRatio`（对话占比）承载——这是 ChatGPT 能从对话内容里直接统计出的客观数字。旧版含 `duration` 的日报仍可正常导入（时长保留，新日报不再新增时长）。
- v105 起新增 `coach_insights`（私教洞察四维诊断）：新版模板必含；旧版模板生成的日报（无该字段）**仍可正常导入**——首页「需要提升」四卡的「洞察」行静默回落为基础统计文案（如「不地道的表达 8 句 · 主要问题：表达习惯」），三行排版结构完全一致、绝不开天窗。用新版模板重新生成当日日报即可获得真正的私教诊断。
