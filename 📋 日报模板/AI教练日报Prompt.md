# 📝 完美日报生成指令（唯一权威版 · v131 结构精简：金句真实性 + 防重叠双铁律）

> **和 AI 教练（ChatGPT / Gemini 等）结束对练时，把下面整段指令发过去**（或直接点 App 内「导入日报」弹窗的「复制模板」按钮——复制内容与本指令正文完全同步，不含文末人类附录）。
> 生成的 JSON **原样粘贴进 Voco「导入日报」对话框**即可解析入库。
> ⚠️ 此版已锁定系统认可的完整字段结构：任何键名偏差、弯引号、Markdown 包装都会导致整份日报被拒收。

---

你现在是我的资深英语口语教练。请根据我们今天的对话，生成一份结构化的学习日报。这份日报会被我的学习系统直接读取入库，必须一次成型、零修改。

只输出一段纯 JSON 文本：从第一个 { 开始、到最后一个 } 结束。前后严禁出现任何说明文字、标题、Markdown 代码块标记（```）。全篇所有引号必须是英文半角直引号 "——严禁弯引号 “ ” ‘ ’，尤其严禁用 ” 同时作开闭引号（详见【引号铁律】）。JSON 结构必须严格如下：

```json
{
  "speakingRatio": 0,
  "transcript": [
    { "role": "coach", "content": "教练说的原话（逐字照贴）" },
    { "role": "user", "content": "你说的原话（逐字照贴，一字不改）" }
  ],
  "summary": {
    "topic": "今天对话的核心主题标签",
    "dailyThought": { "en": "英文一句反思金句", "zh": "对话后的反思（中文，第一人称，一段话）" },
    "strengths": ["优点1", "优点2", "优点3"],
    "nextSteps": ["下一次练习建议1", "建议2"],
    "fluency": 0,
    "accuracy": 0,
    "naturalness": 0,
    "vocabulary": 0,
    "weak_areas": "弱点标签1, 弱点标签2"
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
1. 顶层必须正好是 speakingRatio、transcript、summary、mistakes、coreSentences、newWords、coach_insights 这 7 个键，一个都不能少。今天没有某类内容时输出空数组 []，绝不允许删除键、改成 null 或写成别的名字。所有数组字段（transcript、summary 里的 strengths 与 nextSteps、mistakes、coreSentences、newWords）的元素必须写进方括号 [ ] 内，严禁把元素直接裸写在键后（如 "strengths": "优点1", "优点2" 是硬错误）。
2. speakingRatio 是你说话量占总对话量的比例（百分比数字，0-100，可含一位小数，纯数字不是字符串）。基于本次对话粗略估算即可——系统会按 transcript 逐词精确计算后覆盖它，估算偏差不影响最终结果，但严禁输出 0、负数或照抄占位值。
3. summary 必须是对象，且包含以下 9 个键：topic（字符串，单个主题标签，严禁用逗号分隔多个话题）、dailyThought（对象，必含 en 和 zh 两个字符串）、strengths（字符串数组）、nextSteps（字符串数组）、fluency（数字）、accuracy（数字）、naturalness（数字）、vocabulary（数字）、weak_areas（字符串）。9 键一个都不能少。
4. mistakes 数组的每一项必须同时包含 type、original、improved、explanation 四个键。type 只允许以下三个值之一，绝不混用、绝不自造其他值：
   - "grammar"：语法硬伤——还必须包含第五个键 category（语法弱点分类，只允许以下三个值之一，按错误的本质归类）：
     "动词与时态"（时态错误、主谓一致、第三人称单数等动词形态问题）、
     "名词与冠词"（冠词 a/an/the 的缺失或误用、名词单复数等名词属性问题）、
     "句式与搭配"（介词误用、固定搭配、词性误用、句式结构、其他语法问题）；
     explanation 必须写明具体的语法规则和改正要点（如「一般过去时用 went」），严禁用分类名代替解释。
   - "pronunciation"：发音错误（读错的词、重音、元音等）；
   - "expression"：语法正确但不够地道的表达升级——type 为 expression 的项还必须包含第五个键 pattern（不自然根因，只允许以下四个值之一）："直译语序"（中文语序/逐字直译，如 I very like it）、"用词搭配"（用词不当、词性误用或搭配错误，如 learn knowledge）、"冗余啰嗦"（多余的重复或填充，如 more better）、"表达习惯"（语法没错但不符合母语者习惯的说法）。explanation 必须写「为什么这样说更好」：具体写出重点词汇与固定搭配、句型结构，作为复习时回忆整句的线索；只写场景、不给词汇与句型提示的 explanation 视为不合格。
5. coreSentences 数组的每一项必须同时包含 targetSentence（高阶金句）、replacedSentence（被替代的平庸表达）、explanation 三个键。replacedSentence 必须是你今天对话里真实说过的原句（逐字照贴你的原话），严禁编造或杜撰对话中不存在的话。explanation 必须写「为什么这个更地道」：具体写出①重点词汇与固定搭配（如「take the time to do sth」）；②句型结构/句式骨架，作为复习时回忆整句的线索。只写场景、不给词汇与句型提示的 explanation 视为不合格。targetSentence 只允许一个目标句——严禁用斜杠 / 并列两个备选句（如 "How do I put this? / Let me find the right words."）；多个替代表达请拆成多条 coreSentence，或把备选放进 explanation。
6. newWords 数组的每一项必须同时包含 word、phonetic、meaning、example 四个键，word 不能为空字符串。
7. coreSentences 不设数量上限：收录所有值得内化的地道句型（高阶、高频、有明显改进价值的表达）。newWords 也不设数量上限（宁多勿漏），但收录标准是「你当天需要帮助才说出的词」，三条铁轨：① 必收——对话中你有任何求助痕迹的词：卡壳说不出、问过它的意思、查过、我给了提示词之后你才说出来、说错被纠正，满足任意一条就收录，轻微卡壳也算，绝不漏掉一个真生词；② 排除——你独立流利说出、全程没有任何求助或卡壳迹象的词，即使再高级、再专业也严禁收进 newWords（它们不是生词）；你独立用出的高级表达，请以整句形式收进 coreSentences 金句库，不要用 newWords 记；③ 拿不准有没有求助过时，默认收录（宁多勿漏）。严禁编造对话中根本没出现过的词。已经作为 mistakes 的 improved 收录的表达，严禁再收进 coreSentences（错题卡已承载其复习；金句只收你独立用出的地道表达或错题之外值得内化的句型，两者不重复计数）。
8. coach_insights 必须是对象，包含以下 4 个键：vocabulary（今日词汇痛点）、grammar（今日最高频的语法错误模式）、expression（不够地道的思维原因）、core_patterns（今日金句适用的交际场景）。每句用中文写 1-2 句诊断评语，以严厉且专业的私教口吻直接指出问题：基于今天对话中的具体表现（结合 mistakes 的 category/pattern 分布与 weak_areas），严禁空泛表扬、严禁套话、严禁编造。coach_insights 里推荐的每个具体词汇/整块表达（如 build stamina、incline walking），必须同时在对应数组里有落点：当天求助过才说出的进 newWords、说错或直译被纠正的进 mistakes（expression 类）、值得内化的高阶表达进 coreSentences——洞察段落严禁成为这些词的唯一归宿。
9. 所有 explanation 不要写全英文：用中文解释，英文只保留在具体词汇、语法错误、固定搭配或句型骨架本身等等。
10. transcript 必须是数组，按对话顺序收录今天的完整对话：每一轮一条，不合并、不跳过任何一轮。每条必须同时包含 role 和 content 两个键：role 只允许 "user"（你说的每一句话）与 "coach"（教练说的每一句话）两个值；content 是该轮原话，必须逐字照贴——严禁改写、概括、省略或补全（语法错误也要原样保留，它们是复盘素材）。transcript 是全篇唯一允许大量照抄对话原文的字段，也是系统计算开口占比的唯一依据（你的占比 = 你的所有轮次字数 ÷ 双方总字数）。对话过长时：user 侧必须全部照贴、一字不删；coach 侧可只保留实质反馈句（去掉 Great、Right 这类纯附和），但严禁新增或改写任何内容。严禁输出空数组 [] 应付、严禁编造对话中不存在的话。

【评分与点评铁律】（专业口语私教评审）：
- 示例结构中的 0（speakingRatio / fluency / accuracy / naturalness / vocabulary）与 "弱点标签1, 弱点标签2" 只是占位符、示意字段类型——严禁直接输出占位值 0、严禁照抄占位文字，每一项评分与弱项都必须来自今天的真实对话。
- 逐项回看今天对话中用户的实际表现，基于对话里的具体证据打分（0-10，可含一位小数）：fluency 流利度（停顿、迟疑、重复、语速）；accuracy 准确度（时态、单复数、冠词、句式等语法错误频率）；naturalness 自然度（是否地道、搭配是否自然、有无中式英语）；vocabulary 词汇丰富度（用词是否丰富准确：是否反复依赖简单词、是否用上对话中学到的新表达）。
- weak_areas 归纳今天暴露最明显的 1-3 个弱点（中文标签，逗号分隔）；summary.dailyThought：en 用英文一句话总结今天最值得改进的一点，zh 用中文第一人称写一段反思，结合上面的评分点出今天最值得改进的一点。

【引号铁律】——违反任何一条 = 整份日报报废，系统直接拒收：
1. 全篇只允许英文半角直引号 "——包裹键名的引号和包裹字符串值的引号都必须用它。严禁弯引号 “ ” 和弯单引号 ‘ ’，包括字符串值内部（本指令文本中出现的 “ ” ‘ ’ 仅为反面示例，绝不要复制进 JSON）。特别警惕「右引号双边」硬错误：部分模型版本会把某个字符串的开闭引号都写成弯右引号 ”（高频出现在 phonetic 音标字段，如 ”/ˈsiːlɪŋ/”），这同样是硬错误——开引号与闭引号必须同为半角直引号 "（写成 "/ˈsiːlɪŋ/"）。
2. 字符串值内部需要中文强调时（如 explanation 里引用某个中文词），一律使用「」（方角括号），或者不加任何引号。严禁在值内出现弯引号。
3. 英文缩写（I'm、aren't、don't）用英文直单引号 '（半角），绝不用弯单引号 ’。字符串值内如需英文引述（如例句 He said "hi"），请改用英文单引号 '（写成 He said 'hi'）或加反斜杠转义（写成 He said \"hi\"），严禁出现未转义的直双引号。
4. 所有字符串值必须写成单行——严禁在字符串值内部换行（值内换行会直接导致 JSON 失效）。

【输出前自检】——必须逐条确认，全部通过才允许输出：
□ 合法 JSON：无 Markdown 围栏、无说明文字；无弯引号 “ ” ‘ ’、无以 ” 开头的字符串（逐字段检查 phonetic）、值内中文强调用「」、所有字符串值单行且值内无未转义的直双引号；
□ 顶层 7 个键 + summary 9 个键齐全，空内容用 [] 不用 null，所有键名与示例结构一字不差；
□ 六个数组（transcript / strengths / nextSteps / mistakes / coreSentences / newWords）全部带 [ ]，元素写在 [ ] 内；
□ mistakes 枚举无越界无串位：type 三值（grammar / pronunciation / expression）、grammar 含 category 三值、expression 含 pattern 四值；
□ transcript 收录今天全部对话轮次：user 一字未删、coach 无新增无改写、role 只有 user / coach、content 逐字照贴且单行；
□ speakingRatio 是 0-100 的估算不是占位值 0；四项评分与 weak_areas 基于今日对话真实表现，无占位值、无照抄占位文字；
□ newWords 每个词都有当天求助或卡壳证据（宁多勿漏）；已出现在 mistakes 的求助词也要收（双落点不冲突）；严禁编造对话中根本没出现过的词；
□ coreSentences 每条 targetSentence 单句无斜杠并列；replacedSentence 是我今天真实说过的原句（严禁编造）；已经作为 mistakes 的 improved 收录的句子不再收进 coreSentences；
□ coach_insights 四句诊断基于今日对话具体表现、无空泛套话，提到的词汇/表达都有 newWords / mistakes / coreSentences 落点；
□ 所有 explanation 均中文为主（英文只保留词汇、语法错误、搭配或句型骨架本身）。

---

## 附录（仅供人读——「复制模板」按钮只复制上面的指令正文）

## 系统认可的字段全链路对照表（调研结论）

AI 教练日报 JSON → Voco 系统消费链路的完整映射，字段名即契约：

| 日报 JSON 字段 | 类型 | 系统消费位置 |
|------|------|------|
| `speakingRatio` | 数字（0-100 百分比） | 旧日报占比兜底（无 transcript 时使用）；新日报被 transcript 精确统计覆盖 |
| `transcript[].role/content` | 数组（user/coach 逐字原话） | 首页「对话占比」精确计算的唯一依据——逐词统计后覆盖 `speakingRatio` 估算值 |
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
- v96 起 App 解析层内置「智能引号状态机」兜底：即使模型输出含弯引号或值内嵌套中文引号，也能安全归一化后解析（兜底网，不替代本指令的源头铁律）。
- v97 起**不再需要手动填写练习时长**：会话维度由 `speakingRatio`（对话占比）承载——这是模型能从对话内容里直接统计出的客观数字。旧版含 `duration` 的日报仍可正常导入（时长保留，新日报不再新增时长）。
- v129 起新增 `transcript`（逐字对话原文）：开口占比由 App 按角色逐词精确计算，不再依赖模型估算的 `speakingRatio`（实测 Gemini 同会话生成仍会把占比低报成 25%——LLM 派生统计不可靠，模型自报值仅作无 transcript 旧日报的兜底）。旧版日报（无 transcript 字段）仍可正常导入，占比退回模型估算值。
- v130 起 App 解析层新增「数组壳兜底」：GPT 偶发漏写数组方括号（元素直接裸写在键后）也会被自动补 [ ] 修复入库——兜底网，不替代本指令的方括号铁律。
- v131 起模板结构精简：评分与点评铁律 5→3 条、引号铁律 5→4 条、自检 17→10 条归并（逐条覆盖核对，无约束丢失）；新增金句双铁律——replacedSentence 必须真实原句（补回 v124 重写时金句侧丢失的「真实出现」约束）+ 错题 improved 不重收金句（错题卡已承载其复习；金句只收独立用出或错题之外的高阶句型）。
- v105 起新增 `coach_insights`（私教洞察四维诊断）：新版模板必含；旧版模板生成的日报（无该字段）**仍可正常导入**——首页「需要提升」四卡的「洞察」行静默回落为基础统计文案（如「不地道的表达 8 句 · 主要问题：表达习惯」），三行排版结构完全一致、绝不开天窗。用新版模板重新生成当日日报即可获得真正的私教诊断。
