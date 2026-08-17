# Voco — Claude Memory File

## 🚨 ALWAYS READ THIS FIRST

**Live URL**: `https://kks-voicelog.onrender.com`
- NOT `voco.onrender.com` — that domain is dead/wrong.
- To verify deploy: `curl -sL "https://kks-voicelog.onrender.com/" | grep 'lang="zh-CN"'`
- New deployments take ~2-3 min on Render free tier.
- Cloudflare sits in front of Render; cache `s-maxage=300`. If stale, wait or purge.

**Backend**: Python FastAPI (`⚙️ 后端/server.py`) — serves frontend static files from `🖥️ 前端/`.
- Render is configured as a **Python web service**, NOT static site.
- DO NOT check `voco.onrender.com` — always use `kks-voicelog.onrender.com`.

## Repository
- **Git remote**: `git@github.com:karaqin929/Voco.git`
- **Repo root**: `📱 产品开发/🗣️ 口语练习/`
- **Frontend code**: `🖥️ 前端/`
- **Branch**: `main`

## Deploy
1. Make changes in `🖥️ 前端/`
2. Commit from repo root (`口语练习/`), NOT from `前端/`:
   ```
   cd "📱 产品开发/🗣️ 口语练习"
   git add -A
   git commit -m "..."
   git push origin main
   ```
3. Render auto-deploys from `main` branch

## Tech Stack
- **Frontend**: Vanilla JS + HTML + Tailwind CSS (CDN) + Lucide icons (CDN)
- **Backend**: Supabase (client: `supabase-client.js`)
- **Parser**: `parser.js` (Markdown daily report → structured data) — 唯一分类源 `classifyErrorType` 驻留于此（经用户授权可修改；其余解析逻辑仍保持不动）
- **Service Worker**: `sw.js` (cache-first, version in `CACHE` const)
- **No build step** — static files served directly

## Key Files
| File | Role |
|------|------|
| `🖥️ 前端/app.js` | All app logic (~2850 lines) |
| `🖥️ 前端/index.html` | Single-page shell |
| `🖥️ 前端/sw.js` | Service worker (bump CACHE + all `?v=` when deploying) |
| `🖥️ 前端/parser.js` | Markdown 解析引擎 + `classifyErrorType` 分类规则提取（唯一分类源） |
| `🖥️ 前端/supabase-client.js` | Supabase init |
| `📋 日报模板/ChatGPT日报Prompt.md` | 新版 JSON 日报模板 |

## 版本机制（两个版本号，都是故意的）
- **`?v=NN`**（当前 v93）：HTTP/Cloudflare 缓存击穿。写在 index.html/sw.js 的资源 URL 上。
- **`voco-vNN`**（当前 voco-v103）：SW CacheStorage 名称——唯一能替换缓存中根文档 `/` 的手段（`/` 无法带 ?v=）。
- 两者历史上漂移差 10（v50 ↔ voco-v60），无碍；**每次部署必须各自 +1**。
- 当前线上：**v93 / voco-v103**（日报僵尸行修复：JSON 判定三处放宽 + 徽章/熊条/Hero 判定对齐）。
- **v93 僵尸行修复**：GPT 省略空数组键（今日无错题 → mistakes 整键不输出）时，JSON 日报被判非日报 → Markdown 空壳入库（reports 有行但 vocabulary/errors/patterns 全空）→ 「徽章亮 / 熊白 / Hero 未对练」三分裂。修复：isDailyReport + importReport + parseSmartReport 三处判定放宽（`summary`/`duration` 任一存在即认 JSON 日报，模板必有键）；L428 todayReport 补 isDailyReport 过滤，徽章与熊条/Hero 绝对同源。
- **v90 日报模板要点**：
  - TEMPLATES.report（App 内复制模板）与 `📋 日报模板/ChatGPT日报Prompt.md` **完全同步**（此前两份不同步：内嵌版缺 fluency/accuracy/naturalness）。
  - duration 反编造指令：ChatGPT 未被告知实际时长时必须先询问用户，禁止照抄示例值 25。
  - mistakes 三类：grammar（红色纠错卡）/ pronunciation（发音纠正卡）/ expression（地道表达 → patterns）。
  - **JSON 链路 pronunciation 分流修复**：normalizeJsonReport 新增 pronunciation 分支（此前 else 兜底降级为 grammar，pronunciation 数组恒空）；importJsonDailyReport 写 errors 表 `type='pronunciation'` 独立入库。
  - summary 新增：dailyThought {en,zh}（想法卡首选契约，替代 thought 字符串兜底提取）、weak_areas（Profile 弱项云，此前 JSON 链路 updateProgress 写死 ''）。
  - 兼容：normalizeDailyData 清洗层未动，老格式日报照常导入。
- **v91 时长槽位**：模板开头【本次口语练习时长：__分钟】由用户复制后填写——GPT 无真实时钟感知（参与对话 ≠ 知道墙上时钟走了多久，纯对话量估计会偏短），槽位为空才允许询问，仍禁照抄 25。
- **v92 专业私教评审逻辑**：评分升级为四维逐项评审——fluency（停顿迟疑语速）/ accuracy（语法错误频率）/ naturalness（地道程度）/ weak_areas（1-3 个真实弱项标签），每项必须基于今天对话的具体证据，禁照抄示例值 7/6.5/6 与「时态, 单复数」；dailyThought.zh 须结合评分点出最值得改进的一点。模板示例值 = 仅格式示范，反照抄指令覆盖 duration/评分/弱项三类。
- **v89 日历升维要点**：
  - **废除 7 天硬编码（两处）**：`renderStreakCard`（打卡日历）与 `renderHeaderBears`（顶部问候熊条）的「6 天前→今天」静态数组全部删除。
  - **动态日期生成**：起点 = 词 `date_added` 与日报 `date` 并集的最早一天（`YYYY-MM-DD` 字典序 = 时间序），终点 = 今天，逐日连续序列；3 年截断仅为脏数据（1970 等）防护，正常数据触碰不到。
  - **横向无限滚动**：`flex overflow-x-auto hide-scrollbar` + cell `shrink-0`（style.css 已有 .hide-scrollbar；index.html header-bears 容器补类）。
  - **全局月历弹窗**：`showMonthPicker()`（点「打卡日历」标题触发）→ 跨月跨年导航（‹›，未来月禁用）+ 任意日一键跳转（有数据 → 历史日报视图；无数据 → toast；「回今天」快捷）；数据源 `_dateScoreCache`（模块级缓存，横滑条与月历同源）。
  - **回溯数据放开**：reports 拉取 `limit(90) → limit(1000)`（4 处：loadHome/loadWords/loadSpeak/loadProfile；Supabase 单次上限，一天一条 ≈ 3 年）。
  - **parseLocalDate**：`'YYYY-MM-DD' → 本地 Date`（严禁 `new Date(str)`，UTC 午夜解析在 0-8 点时区偏移一天）。
  - 保留：Profile 页「近 7 天综合得分」趋势图为语义组件（近 7 天 = 图表设计语义，非历史路由入口）。
- **v88 QA 自检要点（全入口跳转/计数审计结论）**：
  - 审计口径：12 个核心跳转入口逐一核对「专属路由传参」+「数量绝对一致性」，发现 4 缺口并修复。
  - ① `showNextStepDetail` vocab 分支：`navigateReview('all')` → `navigateReview('all','today',ctxDate)`（历史日报下点「浏览词汇」不再跳全量词库）。
  - ② `showNextStepDetail` sentence 分支：未命中单句兜底 `navigateShadowing()` → 携带 ctxDate（该日核心句型队列，不再落今日到期混合队列）。
  - ③ 待办任务 3：数字 = `totalDueVocabCount + allGrammarErrorsToday()`（= due tab 卡组 buildDueDeck 真实长度：到期词+今日错题），根治「外面 N 词，点进去 N+M 张」；完成判定 = 词与错题两个会话集合分别达标。
  - ④ `switchWordsView` 切 Tab 清 `_ctxDate`（历史日期残留不再混入 due 卡组；URL 与全局上下文不再脱钩）；新增 `allGrammarErrorsToday()`（无视 _ctxDate 的今日错题集，due 标签与卡组绝对同源）。
  - 已确认无误的 8 入口（审计证据）：统计三卡（新学单词 `vocabulary.length`=getFilteredVocab today 同源；核心句型 `sentence_patterns.length`=coreDeck 无截断；重点纠错 `grammar+pronunciation`=allGrammarErrors _ctxDate 分支，占位符打标保证 filter 全过、碎片已预合并保证 standardize 不丢卡）；提升区双按钮（v86 已带日期）；待办任务 2（数字直接 = `getDueSentencesQueue().length`，含 15 截断同源）；日历熊（无计数声明）；navigateToTab 仅剩空状态回首页。
- v86 要点（三大灾难 bug 根治，parser.js 未改动）：
  - **现象 3 根因**：parser.js `parseItems` 用 `split(/\n(?=-\s*\[)/)` 切块 → 旧 Markdown 日报「- [我说] / - [应为] / - [规则]」三行 = 三个 block = 一条错题裂成 `{original}/{correction}/{rule}` 三个碎片对象；清洗层再给缺 original 的碎片打「历史错题」占位符 → 渲染成 A 错句卡 / B 正句卡(副文「历史错题」) / C「历史错题」+解析卡。
  - **数据层修复**：`normalizeDailyData` 新增 2.5 节 `mergeLabelFragments`（无原句碎片并入上一条，新原句开启新条）——所有链路（首页/历史/复习/导入）必经；`rescueMarkdownErrorSections` 标签宽容救援（冒号式 `- 我说：`/箭头式 `- x → y（规则）`，仅当 parser 该节解析为空时补位）→ 根治 8.12「语法/选词卡片内容全空」；`standardizeErrorCards` 扩展「历史错题」占位碎片合并（DB 存量行渲染前最后防线）。
  - **路由层修复**：`currentContextDate()`（历史视图 `_viewDate` / 今日 `getLocalToday()`）统一上下文日期；`showImprovementDetail`「查看纠错」→ `navigateReview('grammar', null, ctxDate)`（根治丢失 Date 降级渲染 DB 全量错题）；`startImprovementSpeak` 废除 `pat_N` 跨命名空间 id（patterns 数组序号 ≠ coreDeck 的 `core-N`），统一 `?sentence=` 文本锚定 + `?date=`（根治「未找到句子，已从头开始」）；`showNextStepDetail` 的 `core-N` 锚定补 date；`loadSpeak` 文本未命中时以点击句为首卡入队（`sentence-anchor` 契约，反馈时自动 INSERT 入记忆曲线）。
  - 铁律升级：提升区/建议区**一切入口必须携带上下文日期**；锚定**只允许**「`core-N` + date」或「句文本 + date」两种契约，禁止传 patterns 数组序号 id。
  - **v87 全链路补漏（碎片合并覆盖 100%）**：`mergeLabelFragments` 感知「历史错题」占位符（占位 original = 缺失原句，同样并入上一条）；`_errorsAll` 在全局输入构建器（buildGlobalMissionInputs）处一次合并 → 错词交叉打标 / errRows 兜底 / 对练防御池 / due 混合卡组全部消费合并行；`loadProfile` eList 合并（成就 + 错误模式聚合计数不虚高）；`importJSON` 文件导入入库前合并（碎片行无法再进 DB）。至此 fragments 的**解析、渲染、聚合、入库四条路径全部收敛**，与日期无关。
- v85 要点：
  - 核心句型卡今日场景携带 `date=today`（renderContentCards `shadowDate = historyMode ? _viewDate : getLocalToday()`）→ `/shadowing?date=today` → `_ctxDate=today` → 队列 = 当日日报核心句型（coreDeck），**不再**落入 SM-2 到期混合队列（15 句）。navigateShadowing / handleRoute(/shadowing 分支) / loadSpeak 三处放开「today 排除」。**无 date 的 navigateShadowing() 仍是待办打卡专属入口**（到期队列）。
  - 新学单词数口径统一：`getTodayMissionState.todayNewWordsCount = reportParsed.vocabulary.length`（原 `realVocab.filter(isNewToday).length` 含 DB 残留曾致首页 8 / 列表 6 分裂）。
  - `stampDailyTags` 无条件按 `date_added` 重算 isNewToday（防 DB 行残留穿透；mergeReportVocab 在打标后运行，日报词由它重新打 true 不受影响）。
- v84 要点：
  - **7 级字号阶梯（唯一合法字号）**：L1 micro 11px（text-[0.6875rem]，徽章/按钮小字/日历日期）→ L2 caption 12px（text-xs，辅助/计数/提示）→ L3 body 14px（text-sm，正文/按钮/副行）→ L4 title 16px（text-base，区块标题/空态标题）→ L5 headline 20px（text-xl，统计数字/卡片主句/词卡正面/句型卡正面）→ L6 hero 24px（text-[1.5rem]，评分环中心/卡片背面正确答案）→ L7 brand 34px（仅登录页 h1）。数字类只有两级：L5 普通数字 / L6 评分环中心。
  - **全部 rem 化**：app.js 所有 `text-[NNpx]` 任意值（原 14 种碎字号 8/10/11/12/13/15/17/22/24/26px）与 style.css 所有 font-size 全部改为 rem/标准类——设置页「文字大小」（标准/中/大，applyFontSize 改 html font-size）从此**真正全局生效**（旧 px 值不响应缩放）。图标字符字号（lib-search-icon 14px / login-icon 72px / text-2xl ⏳）豁免不动。
  - 新增任意值只有三个合法 rem：`text-[0.6875rem]`（L1）/ `text-[0.875rem]`（L3）/ `text-[1.5rem]`（L6）；其余一律标准类。**新增 UI 严禁再写 text-[NNpx]。**
- v83 要点：
  - JSON 日报时长三层修复：① `normalizeJsonReport` meta.duration 提取（顶层 duration / summary.duration / durationMinutes）；② `importJsonDailyReport` updateProgress 不再硬编码 0（时长 + fluency/accuracy 与 Markdown 路径 importDailyReport 对齐）；③ 模板双处补 duration 必填字段（`📋 日报模板/ChatGPT日报Prompt.md` + app.js `TEMPLATES.report`）。
  - 话题卡字段错位修复：parser.js 新增 `parseTopicTerms`（三段契约 term|definition|example → word/meaning/example，phonetic 留空），parseTopicCard「关键术语/生词/关键词」改走专用解析，严禁混用日报 parseVocabulary 四段契约。
  - 首页开口时长口径：`renderMetricsOverview` speakTime = duration×0.6（总时长来自 parsed.meta.duration）。
- v82 架构要点：
  - 日期路由：`_ctxDate`（URL `?date=YYYY-MM-DD` 非今日上下文）+ `_reportsCache`（最近 90 条 reports 行）+ `parsedReportFor(date)`（今日→_reportParsed / _viewDate→_historyParsed / 其余现解析，Map 缓存）；解析点：handleRoute / loadWords / loadSpeak 三处读 URL。
  - `navigateReview(tab, filter, date)` / `navigateShadowing(id, sentence, date)` 第三参 date：历史视图（historyMode）下统计三卡携带 `_viewDate`；待办打卡动作先清 `_viewDate/_historyParsed/_ctxDate` 再导航（保证今日到期队列严格，绝不历史劫持）。
  - 首页 Prompt 模块已删：generateDailyMissionPrompt / missionCapsuleHTML / fireDailyMissionPrompt + Card E；🛡️ 对练防御注入迁至灵感舱 fireTopicGeneratorPrompt（getDefenseSigs 双源检索，最多 3 条）。
  - `getFilteredVocab` mode today/new 与 `allGrammarErrors` 增加 `_ctxDate` 早分支（该日日报唯一数据源，无报 → 空，绝不回退今日）；`prependCtxDateBanner` 复习页顶部日期横幅；loadSpeak `_ctxDate` 存在时队列 = `coreDeck(parsedReportFor(date))`（不混 SM-2 到期）。
- v81 已发布（错题卡数据腰斩配对合并 + 图鉴列表去复习按钮 + 主视觉降级链去横杠）。
- v80 已发布（想法卡字号拉平 14px normal + dailyThought 解析兜底：thoughts 回退 + Markdown 标题变体加宽）。
- v79 已发布（全局重构：due 卡组件化 + 死 CSS 清理 + emoji/斜体清零）。
- v78 已发布（对话想法卡片排版统一：cleanThoughtText 净化 + 恒定层级规格）。
- **⚠️ 待用户手动执行：`⚙️ 后端/migration_v2.1.sql`**（Supabase SQL Editor，project dgmatfpwekziyumdfpcu）——patterns 表 SM-2 列（status/mastered/ease_factor/sm2_interval/sm2_repetitions/review_count/next_review_date/last_reviewed_at）+ 到期回填 + 索引。跑之前句型写回静默降级本地会话态（不报错）。

## Architecture Notes
- Tab 结构：首页 / **复习**（原「单词」）/ **句型复习**（原「口语/跟读」，data-tab 仍为 'speak'）/ 我的
- 路由即状态（URL 单一数据源，P2 规范化路由中枢）：
  - 规范路由：`/review?tab=all|grammar|due`（复习页）、`/review?filter=today`（首页「复习今日单词」过滤态，正交于三 Tab）、`/shadowing?id=xxx`（句型复习页锚定）、`/shadowing?sentence=xxx`（教练卡点击句作为起始卡片）、`/`（首页）
  - 导航器：`navigateReview` / `navigateShadowing` / `navigateToTab`（兼容层）/ `normalizeLegacyUrl()` / `handleRoute()` / popstate
  - 旧参数兼容：`?tab=new→all`、`?tab=mistakes→grammar`、`?tab=review→due`（loadWords 归一）、`?tab=words→/review`、`?tab=speak→/shadowing`
  - server.py SPA catch-all 在全部 API 路由之后（最后一条路由）
- 状态隔离：`_activeFilter`（句型复习页专用）vs `_wordsFilter`（复习页专用）vs `_navigatingViaProgram` 守卫
- 复习页 = **混合记忆引擎**（P3）：
  - 严格三 Tab：全部词汇（仅词卡）/ 语法错题（仅错题卡，原句删除线+正确句高亮）/ 待复习（needsReview 词 + 错题统一混合卡组）
  - Active Recall 双阶段：正面仅英文+音标（错题仅错句），中央 [👁️ 点击显示答案]；背面释义+[🔴 没记住][🟢 记住了]
  - SM-2 驱动：🔴 quality=0 留队列 / 🟢 quality=3 星+1、计算下次复习时间、平滑收起；`_reviewedErrorIds` 会话去重
  - 卡片布局分离：熟练度星点左、操作按钮右、来源行独立截断
- 句型复习页 = **句型记忆卡片模式（v73，单卡翻转视口；铁律：禁止 .map 瀑布流；DOM 结构不许擅自更改）**：
  - `#speak-player` 单卡视口（calc(100dvh - 92px)），`renderSentenceReview(sentences, startIndex)` 状态驱动：`_srsQueue/_srsIdx/_srsReviewed/_srsTotal/_srsResults/_srsFlipped`
  - 翻转卡片：正面英文原句（`#srs-card-front` 衬线体）→ 点击 `flipSrsCard()` 翻转背面（划线 replacedSentence + 🎬 解析）；3D 翻转 CSS（.srs-flip-scene perspective / .srs-flip-inner.flipped rotateY(180deg) / backface-visibility）在 style.css
  - 反馈双键**完全克隆词汇复习图18**：`😅 还没记住` = bg-red-50/hover:bg-red-100/rounded-2xl/红字、`🚀 记住了` = 绿色同构——高度/圆角/内边距逐字一致，严禁第二套按钮
  - **机械录音（听原音/按住录音/听自己）整体下线**：startPlayerRecording/stopPlayerRecording/releasePlayerAudio/updatePlayerView/wirePlayerHandlers/handlePlayerNext/renderShadowingPlayer 全部物理删除；`speakWord` TTS 保留（词汇列表发音按钮在用）
  - `resolveAnchorIndex`：?id= 驱动起始卡（仅决定起点，绝不改变队列内容），找不到/越界钳制回 0；?sentence= 文本比对同源
  - 死代码物理清理铁律：删掉的 DOM/CSS/JS 必须三处同步物理删除，不留残影
- **真实数据流铁律（v56 紧急整改后固化）**：
  - `resolveActiveReport(reports)`：日报解析一律经此网关（今天 → _viewDate 历史视图 → 最新有效日报 → null），播放器/生词/错题共用，禁止 `r.date === today` 直连
  - `mergeReportVocab(snapshot, reportParsed)`：日报 newWords 完整并入全局词库（同名继承真实 id + 打 isNewToday，缺词 `rep-N` 追加）——首页/复习页绝对同源；`getFilteredVocab 'today'` 以日报生词为唯一事实源（与首页 `newCount = parsed.vocabulary.length` 一致），禁止打标词短路
  - `standardizeErrorCards(rawItems)`：所有错题渲染前必经清洗——碎片合并（`→`/`➡️`/`-` 开头的延续行并入前一条）+ 结构归一 `{id, original, correction, rule, type}`；单卡单外层容器
  - `classifyErrorType(o, c, rule)`（parser.js 唯一分类源）：**4 标准分类**——发音与重音/语法与句式/地道表达/逻辑与衔接（未命中→其他）；`normalizeErrorCategory(type,o,c,r)` 归一化器：旧标签（发音纠偏/时态语态/冠词使用/逻辑衔接/时态/冠词/preposition…）强制映射为 4 标准，存量「其他」按内容重算；`aggregateErrorPatterns` 聚合前必经归一化器（输出键只可能是 4 标准+其他，零同义分桶）+ **排序铁律：明确分类按次数降序、「其他」固定沉底最后一行**；`showErrorPatterns` 建议优先练习**剔除「其他」**取真实最高具体弱点、左侧标签 `whitespace-nowrap min-w-[72px]` 禁折行；`showErrorDetail` 逐行归一化过滤
  - v60 词表：语法与句式增补 主谓/词性/搭配/in\/on\/at/plural（**搭配 从地道表达移入语法**）；地道表达增补 表达/换成/建议/更好的说法/better。**in/on/at 捕获限定**：仅字面 "in/on/at" 或规则文本中单独介词与介词语义词（用法/混淆/搭配/区别/用错/误用）共现才命中——防止误伤地道表达例句里的普通 in（如 breathtaking in IMAX）
  - 学习建议分流 `classifySuggestion`：sentence → `navigateShadowing('core-N')` 锚定 / vocab → `navigateReview` / coach → 私教任务弹窗（指引 + 一键复制 ChatGPT Prompt），**禁止盲跳句型复习页**
  - 教练卡句型入口 `startImprovementSpeak(idx)`：携带用户点击句经 `navigateShadowing(undefined, sentence)` → `?sentence=` → loadSpeak 以该句为起始卡片，**禁止无参 navigateShadowing 默认句开头**
  - 字段名唯一：`isNewToday`（打标/计数/过滤/兜底四处同源，历史教训 isTodayNew 分叉已修）
- 首页打分（v61）：`metricsHTML` 四维度（流利度/语法/词汇/自然度）统一 `norm100()` 归一 0–100 后展示 `${score}/100`，进度条宽度 = 分数本身（%）；**严禁 /10 硬编码分母**；`norm100` 对 ≤10 的 0–10 刻度自动 ×10 对齐
- 今日待办三闭环（v61，v73 更新任务 2 文案）：`renderTodoList` 动态生成，mock todos 字段已物理删除——① 对练打卡·导入今日日报（hasTodayReport 自动完成）② **句型复习打卡**·完成(今日)句型复习 (${patternTaskCount}句)（点击 navigateShadowing 直达今日到期队列；`showSrsDone` 队列清空时写 `voco-speak-done` 当日戳，加载层比对传入 speakDoneToday；任务数来自 `ms.totalPatternTaskCount`）③ 复习打卡·完成今日到期复习 (${dueCount}词)（countReviewWords 纯布尔计数，文案标明「到期复习」区别于「今日新词」；点击 navigateReview('due')）
- 计数铁律（单一数据源，绝不分叉）：
  - 今日新词 `countTodayWords`：isNewToday 布尔优先，date_added 兜底
  - 错词 `countMistakeWords`：isMistake 优先，errors 交叉比对兜底
  - 待复习 `countReviewWords`：纯布尔 `needsReview === true`；SM-2 `isDueBySrs` 兜底发生在**打标层**（stampDailyTags），不在计数层 —— 首页 todo / 复习页 tab=due 两处共用
- SM-2：quality again=0/good=3/easy=5；interval 1→6→~15→~37 天；easeFactor 2.5 起、1.3 底
- **无损数据清洗层 `normalizeDailyData`**（历史日报 8.10/8.12 等渲染前必经，幂等）：
  - 挂载：`parseSmartReport` JSON 分支（归一化前 ① + 归一化后 ②）、Markdown 分支 ③、`importJsonDailyReport` 导入入口
  - 字符串/元组/残缺对象 → 结构补齐；spread 保留全部原始键；数据库原文永不动（读取时内存转换）
  - 桥接：mistakes 的 wrongSentence/correctSentence ↔ 内部 original/improved 契约；评分 fluency/accuracy/naturalness 无损透传
- JSON 日报 schema：`{summary:{topic,thought,strengths[],nextSteps[],fluency,accuracy,naturalness}, mistakes:[{type:'grammar'|'expression',original,improved,explanation}], coreSentences:[{targetSentence,replacedSentence,explanation}], newWords:[{word,phonetic,meaning,example}]}`
  - 自动打标：newWords→isNewToday、coreSentences→isTodayCore、mistakes→grammar/patterns 分流
- 今日对话想法（v62，零硬编码金句）：`parseDailyThought(text)`（parser.js）产出 `{en, zh}`（支持 EN/ZH 双行标注、单行按中英文占比判断）；Markdown「对话想法/今日心得」→ `summary.dailyThought`；JSON `summary.dailyThought` 对象透传，否则从 `thought` 提取；首页 Card B 优先读 `_reportParsed.summary.dailyThought`，空值显示引导文案「💡 导入今日日报后…」；**parser 铁律：`表现总结` 分支必须 Object.assign 原地合并，严禁整体替换 summary（会抹掉 dailyThought/thoughts）**
- **v63 架构重构（时间网关 + 任务状态中心 + 业务概念分离）**：
  - **Date-Scoping 时间网关**：`loadWords` 强制 `_reportParsed` 只来自报表行 `r.date === today`（**严禁 resolveActiveReport 的「最新有效日报」历史回退产物流入**——历史报告会被打 isNewToday 造成时间轴穿透），并回写 `meta.date = 行日期`；任何「今日」前缀数据放行前必须过 `isTodayParsedGate()`（校验 `_reportParsed.meta.date === today`）。无今日日报 → 今日想法/做得好的地方/新学单词句型数全部清零或空状态「⏳ 等待导入今日报告」（insights 整区空状态卡；metrics 四维度 0/100 + 综合 `--`，metricsDonut 对非数字出空环禁 NaN）
  - **全局任务状态中心**：`getTodayMissionState()` 单一事实源——`hasTodayReport` / `todayNewWordsCount`（今日日报 vocabulary）/ `todayCorePatternCount`（今日日报 sentence_patterns）/ `todayCorrectionsCount` / `totalDueVocabCount`（needsReview 全量，与 tab=due 同源）/ `reviewedVocabToday`（加载层 last_reviewed_at 比对上收进 `_reviewedVocabToday`）。首页四组件（renderMetricsOverview/renderInsightsSection/renderContentCards/renderTodoList）**全部只读任务状态中心，禁止自行 .length/parseSmartReport/Mock 兜底**；有真实数据时严禁回退 mockWords 3 词 / mockSentences 2 句
  - **业务概念分离**：顶部数据卡=今日增量（新学单词只算今日日报 vocabulary → `/review?filter=today`；核心句型只算今日日报解析数 → 今日句型队列）；底部待办=SM-2 记忆任务（复习打卡读 needsReview 全量含今日新词+历史到期词 → `/review?tab=due`）
  - **打卡严格条件**：复习打卡 `done = totalDueVocabCount > 0 && reviewedVocabToday >= totalDueVocabCount`——dueCount===0 保持未完成，严禁加载默认值误判
  - **句型复习页今日队列闸**：loadSpeak 默认队列严格今日（无 _viewDate 时只认 r.date===today 的日报）；队列 = `getDueSentencesQueue(parsed, _speakAll)` 唯一事实源；`coreDeck(parsed,…)` parsed 存在即唯一事实源（0 句就 0 句），回退链仅服务显式 `?filter=core_sentences` 视图
  - **UI 清理**：Profile「预览登录页」整行 DOM 已物理删除；错误模式分析「其他」固定沉底（aggregateErrorPatterns rest.concat(others)）复核通过
- **v64 时区安全（铁律：严禁 toISOString().slice(0,10) 定义 today）**：UTC 日期会让东八区用户 0:00–8:00 滞留在「昨天」，跨日复习任务不刷新、待办锁死。全局唯一「今天」来源 `getLocalToday()`（app.js 顶部，setMinutes 减时区偏移后截断）；辅助 `fmtLocalDate(d)`（任意 Date → 本地 YYYY-MM-DD，SM-2 next_review_date / streak 昨日回推用）、`localDateOf(isoTs)`（存储层 UTC 时间戳 → 本地日历日，**last_reviewed_at 比对必须换算后比今天**——存储写入保持 `new Date().toISOString()` 全量 UTC 不变，只在读取比对时换算）。替换位置：calcStreak、loadHome、loadWords、loadSpeak、isTodayParsedGate、parseSmartReport meta.date、SM-2 next_review_date、voco-speak-done 打卡戳、导入打点 date/date_added、导出文件名等全部 16 处 today 计算点 + 2 处 nextDate 格式化 + 1 处 last_reviewed_at 比对
- **Voco 2.0 第一步（v65，用户骨架强制签名）**：
  - `getTodayMissionState(vocabAll, patternsAll, reportParsed, reviewedVocabIds = new Set())` 纯函数 SSOT：① 时间轴拦截 `isTodayParsedGate(reportParsed)`（读 `meta.date || date`，startsWith(getLocalToday())——骨架的 toISOString 已按 v64 铁律替换）② Mock 隔离 `!String(v.id).startsWith('mock-')`（mockWords id 已统一 mock-1/2/3 前缀）③ 今日增量 todayNewWordsCount（isNewToday）/todayCorePatternCount（patternsAll）/todayCorrectionsCount 仅 hasRealTodayReport 时计数 ④ SM-2 totalDueVocabCount = needsReview 全量 ⑤ reviewedVocabToday = reviewedVocabIds.size ⑥ **isReviewFinished = totalDueVocabCount > 0 && reviewedVocabToday >= totalDueVocabCount**（打卡完成唯一判定）
  - **状态孤岛断根**：新 `buildGlobalMissionInputs(vocab, errors, reports)` —— loadHome 与 loadWords 共用（此前首页直连 / 时 _reportParsed/_wordsAll 从未初始化，首页空状态假象）；产出 _reportParsed（strictToday 严格今日）/ _dailyPatterns / _wordsAll（mergeReportVocab 合并）/ _reviewedVocabTodayIds（last_reviewed_at 本地日历日比对 id 集合，**严禁用 _reviewedErrorIds 会话错题 id 冒充**）
  - UI 渲染保护：loadHome 先解构 missionState → displayThoughts/displayGoodPoints 无今日报告强制 null/[]，直传 renderInsightsSection(displayThoughts, displayGoodPoints)；renderGreeting 状态文案用 ms.hasRealTodayReport
  - 复习页 Tab 数字强绑定 SSOT：renderWordsSubTabs dueCount = ms.totalDueVocabCount + grammarCount（UI 层不再自行 .filter）
  - `generateDailyMissionPrompt(dueVocabList, corePatterns, grammarErrors)` 3+1+1 组装器：3 个待复习词 + 1 核心句型（targetSentence）+ 1 历史语法错误（rule||original），全防空 fallback，输出纯文本私教 Prompt（对战胶囊大按钮 UI 在后续步骤接入）
  - 熊爪 7 天条 / streak 卡日期标签 fmtLocalDate 补漏（UTC 截断残留）
- **Voco 2.0 第二三步（v66）**：
  - 对话占比：parser.js 新增 `parseSpeakingRatio(text)` + `countTranscriptWords(s)`（英文分词 + 中文单字口径）——扫行首角色标注 `User/Assistant/AI/Me/You/你/我/用户:`；Markdown「对话记录/Transcript/逐字稿」节 + JSON `transcript/conversation` 数组（role/content）双入口；parseSmartReport 两分支兜底全文扫描；产出 `summary.speakingRatio = {user, ai}`，无有效记录 → null（UI 优雅降级「导入含对话记录的日报后展示」）。首页 metricsHTML 在开口时长下方渲染双色占比条（你% 主色 / AI% 灰蓝），字数明细随条
  - 更名：评分维度「自然度」→「地道与英文思维」（仅 UI 文案；数据键 naturalness 不变）；parser.js parseSummary 正则兼容新旧双标签（`(?:自然度|地道与英文思维)`）
  - Chart.js（CDN jsdelivr）趋势图：index.html Profile 新增 `#trendChart` canvas（h-180px 容器）；`renderTrendChart()` 拉 reports 近 7 个本地日历日，综合得分口径与首页打分板一致（四维度 norm100 均值），缺日 null 留空（spanGaps:false）；tension 0.4 平滑曲线 + 数据点；莫兰迪色系：线 #8A9B6E 鼠尾草绿 / 点 #6B7D54 橄榄绿 / 填充 rgba(138,155,110,0.15) / 刻度 #A49A87 / 网格 rgba(164,154,135,0.18) / tooltip #4A4438；`typeof Chart === 'undefined'` 静默降级
  - 今日对战胶囊：Card E「下一次学习建议」3 条分散列表已删除 → `missionCapsuleHTML()` 主视觉大按钮「🎯 获取今日私教对战 Prompt」（主色→绿渐变 + 投影）；`fireDailyMissionPrompt(btn)` 直取 SSOT（ms.dueVocabList + _dailyPatterns + _errorsAll）→ generateDailyMissionPrompt → navigator.clipboard.writeText（失败降级 execCommand textarea）→ 按钮变「✅ 已复制！去 ChatGPT 开口吧」绿色态，2s setTimeout 恢复原样
- **Voco 2.0 第四步（v67）聊前灵感配置舱**：产品决策——只放在【我的】页（严禁首页），位置=头像/打卡卡正下方、数据管理面板上方（index.html 静态组，插入在 Profile Header Card 与成就徽章之间）：
  - DOM：🔗 单行 URL input（#input-topic-url）+ 💡 rows=3 textarea（#input-topic-thoughts）+ 话题池 #topic-pill-slot（flex overflow-x-auto whitespace-nowrap hide-scrollbar，7 固定标签由 `renderTopicPills()` JS 渲染：✈️跨国旅行/🏃♀️健身与普拉提/💼职场与商业/📖文学评论/🐾养宠日常/☕咖啡与生活/📈宏观经济）+ 生成按钮 #btn-topic-generate（对战胶囊同款 135deg 渐变主视觉「✨ 生成专属对话 Prompt」）
  - 交互：全局 `_selectedTopicTag = ''` 单选；`toggleTopicPill(btn)` 全量重算 .active（主题色背景+白字，CSS `.topic-pill.active` 在 style.css），再点已选中 → 取消
  - `fireTopicGeneratorPrompt(btn)`（用户骨架原样落地）：防空 alert → 话题/URL/想法三段拼接私教开场 Prompt → `copyToClipboardWithFallback()` → 按钮「✅ Prompt 已复制！去贴给 GPT 吧」变绿 2s 恢复（注意：恢复时还原完整内联 style，不能 `btn.style.background = ''` 否则渐变主视觉丢失）
  - 共享工具重构：`copyToClipboardWithFallback(text)`（clipboard API → textarea+execCommand 降级），fireDailyMissionPrompt 与 fireTopicGeneratorPrompt 共用
  - CSS 新增：`.topic-pill` / `.topic-pill.active` / `.hide-scrollbar`（style.css 尾部）
- **Voco 2.0 空状态 UX 重构（v68）**：未导入今日日报 → 首页今天视图折叠零数据组件（#home-metrics 打分面板 / #home-insights 洞察卡 / #home-summary-cards 三数据卡），打分面板位置顶替 `#home-empty-hero` Hero 引导卡（温润极简：w-12 圆底块 + sparkles 线性图标锚点 + 文案「今日尚未对练 / 导入 ChatGPT 日报…」+ 📥 导入今日日报 CTA → showImportDialog；v70 移除 🐻 大插画，rounded-3xl + tracking-wide 呼吸排版，圆底块加 inset 1px 主色内描边与同色渐变底分离）；常驻：本周打卡卡 #home-quote 与今日待办 #home-quests（复习打卡任务独立于日报）；门控在 loadHome：`const showEmptyHero = !missionState.hasRealTodayReport && !_viewDate;`（历史视图 _viewDate 不受影响）；渲染函数照常执行，仅由 classList.toggle('hidden') 控显隐
- **Voco 2.0 话题库（v69）四维复习体系收官**：复习页 Tab 三扩四（全部词汇/语法错题/待复习/**话题库**），路由 `/review?tab=topics`（白名单扩展三处：navigateReview / handleRoute / loadWords mode 解析；switchWordsView 天然兼容）
  - `renderTopicLibrary()`：topics 表 + vocabulary.source_topic 关联词一次取全（零 N+1），`_topicLibraryCache` 缓存 {id,title,description,keyTerms,words}；卡片墙：📖 标题 + 右上「N 个关键术语」徽章 + 描述 + 关联词横向截断预览（3-5 词 chip 行 overflow-hidden whitespace-nowrap，超 5 显示 +N）；空库 → EmptyState 引导文案；topics 模式下隐藏搜索框（renderWordsSubTabs 内 toggle .lib-search-wrap）
  - `fireTopicRevivalPrompt(btn, idx)`：话题复盘 Prompt 严格按产品模板（`我们之前探讨过【title】…引导我使用这些词汇：[words]…你先向我提问吧`）→ copyToClipboardWithFallback → 绿色 Toast（showToast 扩展 type='success'，绿底白字，默认深色向后兼容）
  - 数据链：importTopicCard 已写 topics + vocabulary.source_topic（v4.0 遗留资产直接盘活）
- **Voco 2.0 句型间隔重复引擎（v71）Sentence SRS —— 根治「(0句)」Bug**：句型复习接入 SM-2 记忆曲线，与单词同构
  - 数据层：`stampPatternTags` 新增 needsReview 打标（isDueBySrs 同源：无 next_review_date → 到期；mastered → 永久出队）；patterns 表 SM-2 字段（status/ease_factor/sm2_interval/sm2_repetitions/review_count/next_review_date/last_reviewed_at）与 vocabulary 完全同构——**列由 migration_v2.1.sql 提供，需手动执行（见版本机制）**
  - 队列混合（SSOT 第 6 块）：`getTodayMissionState(vocabAll, patternsAll, reportParsed, reviewedVocabIds, patternLibrary = [])` 新增可选第 5 参；`totalPatternTaskCount = 今日新句型数 + totalDuePatternCount`；duePatternList 对今日已含句做文本去重（targetSentence 小写比对）绝无双计；7 处调用点全部传 `_patternLibrary`
  - 输入管线：`buildGlobalMissionInputs(vocab, errors, reports, patterns)` 第 4 参 → `_patternLibrary = stampPatternTags(patterns)`（空表 [] 兜底，绝不回退 Mock）；loadWords 补拉 patterns 表（Promise.all 第四项）；loadSpeak 分离真实库与展示库：`_speakAll = taggedPatterns.length ? taggedPatterns : mockSentences`（Mock 仅兜底展示，绝不进 SRS 写回），`_patternLibrary = taggedPatterns`
  - 句型复习队列：`getDueSentencesQueue(parsed, speakAll)`（v73 由 mergedPatternQueue 更名）= coreDeck 今日句 + needsReview 到期句（toPlayerItem 映射、文本去重）；无日报有 5 句到期 → 队列 5 句「完成句型复习」
  - SM-2 写回（v73 重构为统一服务）：`handleReviewFeedback(id, status, itemRef)` —— 单词/句型共用同一出口；`reviewPatternItem` 数字主键（BIGSERIAL）→ patterns UPDATE、core-N/sentence-anchor → INSERT 入库（user_id 取 session，正式进入记忆曲线）、Mock 一律跳过；本地快照同步 + 静默 catch。**v71 教训：patterns.id 是 BIGSERIAL 数字主键，`_UUID_RE` 正则从未匹配，写回静默失败——已废弃该正则**
  - UI 防御（0句态）：待办任务 2 三态 —— 总数为 0 → 置灰 disabled「句型复习打卡 · 暂无复习任务」（minus-circle 图标、无 chevron、action null、opacity-45，绝无空心圆圈+0句）；有日报 →「完成今日句型复习 (N句)」；无日报有到期 →「完成句型复习 (N句)」；句型复习页空状态主视觉与首页 #home-empty-hero 温润极简同构（160deg 渐变卡 + book-open 内描边圆底块 + 📥 CTA）
- **Voco 2.0 终极交互重构（v72，已被 v74 取代）学习工作台 Learning Workbench**：灵感舱曾从【我的】迁至首页工作台（折叠式 Accordion）——v74 PM 指令再次推翻：首页清爽化、灵感舱迁回 Profile、交互形态改居中模态
- **Voco 2.0 灵感舱定位终局（v74）：Profile 居中模态 + 首页清爽化**：
  - 首页清爽化：`#home-workbench`（学习工作台 + 折叠式灵感舱）DOM 与 toggleWorkbenchCabin/collapseWorkbenchCabin/_workbenchCabinOpen 全部物理删除——首页只保留看板与今日待办（#home-empty-hero 空状态导入 CTA 保留，属看板组件）
  - Profile 新卡片：数据导入板块「ChatGPT 日报导入」胶囊卡**上方**新增 1:1 克隆卡「✨ 开启今日私教对话灵感」（副标题：输入 URL / 灵感 / 选话题）——同容器同阴影同圆角同 chevron-right 同字号，onclick `openInspirationDialog()`
  - 居中模态 `#inspiration-dialog`（**严禁 Bottom Sheet**）：外层 `fixed inset-0 z-[300] hidden` + `absolute inset-0 bg-black/40 backdrop-blur-sm`（点击蒙版关闭）+ `pointer-events-none` 居中包层 + `pointer-events-auto` 圆角卡（rounded-[20px] max-w-[480px] max-h-[85vh] animate modalPop）；头部=标题 + ✕ 关闭钮（克隆 import-dialog 的 `w-[30px] h-[30px] rounded-full bg-[var(--c-bg)]` 样式）；体部=🔗 URL 输入 / 💡 灵感 textarea / #topic-pill-slot 7 Pill（`-ml-1 pl-1 pr-4` 右缘防切断）/ 全宽渐变生成按钮
  - 交互闭环：fireTopicGeneratorPrompt 复制成功 → ✅ 反馈 900ms 后 `hideInspirationDialog()`（按钮 2000ms 恢复逻辑不变）；Pill 单选 toggleTopicPill 与 Prompt 组装逻辑零改动（id 不变直接迁入模态）
  - **既存代码保护铁律（v74）**：`#import-dialog` DOM 与 showImportDialog/hideImportDialog/importReport 一律零修改（注意 import-dialog 现状是 bottom-sheet 形态，属历史事实不可动；新模态不得照抄 items-end 定位，必须居中）
- **v75 历史日报视图修复（_historyParsed 渲染链路）**：点小熊日历历史日期（showBearDay → `_viewDate = date`）此前指标/洞察/三卡全部显示 0——根因是 v63 时间网关：`buildGlobalMissionInputs` 只解析今日日报进 `_reportParsed`，三个渲染组件的 `hasRealTodayReport` 门对无今日日报的用户全拦（用户无 8/16 日报 → 点 12号/15号 全零，观感「功能全塌」，实为设计缺陷非 v73/v74 回归）
  - 修复：新增全局 `_historyParsed`（buildGlobalMissionInputs 内 `_viewDate && _viewDate !== today` 时解析所选日期 isDailyReport 行，meta.date 回写；回到今天/未选 → null，今日链路零影响）
  - 四个渲染点早分支 `historyMode = !!(_viewDate && _historyParsed)`（先于今日时间网关判定）：renderMetricsOverview（评分公式同今日分支，newWords/corrections 改直取 parsed 数组长度，因 ms.today* 只对今日有意义）、renderContentCards（三卡增量=该日日报数量）、renderInsightsSection（跳过内部 730 行今日门，`p = _historyParsed`，dt 改从 `p` 取 dailyThought）、loadHome（displayThoughts/displayGoodPoints 直取历史解析）
  - 洞察卡标题历史语境：`dayLabel = historyMode ? '当日' : '今日'`（对话主题/对话想法/做得好的地方/需要提升 四标签）；Card E 私教对战胶囊不改（其按钮动作本质是「生成今日 Prompt」，与浏览历史无关）
  - 边界：所选日期无日报行 → banner toast「该日期无日报数据」并自动回今天（原有逻辑）；有行非 daily-report → `_historyParsed` null → 走今日门（零/空状态，无崩溃）
- **v76 CODE RED 全局审计（5 Bug 集中修复）**：
  - Bug 1 TabBar：`.tab-bar` 本就 `fixed bottom-0 z-100`（审计确认非回归），v76 加固 `width:100%` 显式声明；body 底部补偿 80px→**96px（pb-24）**——注意 body 规则在 style.css 与 index.html 内联 `<style>` 各一份，**两处必须同步改**（内联后加载会覆盖外链）
  - Bug 2 字体污染：Card B EN 引语删 `font-[Georgia,serif] italic` → `font-sans not-italic`（该衬线斜体实为 v62 起的引语设计样式，非 v75 回归，按指令废弃）
  - Bug 3 空状态：「无/暂无/没有/未记录/none/n/a」正则判空（`NO_THOUGHT_RE`）+ dt trim 净化 → 历史视图渲染「当日未记录想法」；根治日报数据里 thoughts: "无" 直接渲染的裸露单字
  - Bug 4 SRS 绑定：首页待办任务 2 数字改绑 `getDueSentencesQueue(_reportParsed, _patternLibrary).length`（与句型复习页实际队列 100% 同源）。**审计结论：过滤链从未被绕过**（needsReview===true 由 `isDueBySrs` 判定，null next_review_date → 到期），102 句 = 全部未复习句型的合法到期集合（bootstrap 态）；每张卡复习后 SM-2 即推进，数字自然下降；若需「每日新卡配额」属产品决策，未擅自实施
  - Bug 5 统一模板：`reviewButtonHTML({id, kind, label, cls})` 全局 ReviewButton（浅粉/浅绿底 + CSS 纯色圆点 + 红/绿文字，零 emoji）——三个调用点：句型复习卡（srs-*）、单词卡组（due-*）、语法错题卡（btn-again/btn-good，事件绑定 class 保留）；进度条审计确认 v73 已存在（renderSrsCard `🎯 句型复习 (已复习 x / 总计 y)`），未重复造轮子；全库按钮/注释/完成统计 emoji 清零（grep 验证 0 残留）
- **v77 系统级重构（错题本组件化 + 句型卡认知重塑）**：
  - 错题本 CorrectionCard 组件化：👁️ 双阶段揭示（btn-reveal/revealed-content）整体物理删除；卡片 = 动态徽章（errorBadge：📖 语法 blue-50 / 🗣️ 发音 orange-50 / 🎯 选词 green-50，按 type/issue 判定）+ 大字绿色正确句（17px bold green 主视觉）+ 原句小字灰显（无删除线）+ 📖 规则框 + ReviewButton 反馈；btn-again → 轻提示保留、btn-good → _reviewedErrorIds + 平滑移除（原逻辑保留）
  - 正向输入原则全局化：IMPROVE_TYPES.grammar.wrongCls 由 `line-through text-[var(--c-red)]` → `text-[var(--c-text-ultradim)]`（首页 Card D 同步受益，全句红色删除线绝迹）
  - 🛡️ 对练防御闭环：toggleDefense 以「原句|正确句」签名为键持久化 localStorage（voco-defense-sigs，err_N 顺序 id 不稳定故用签名）；fireDailyMissionPrompt 生成 Prompt 时签名匹配 _errorsAll ∪ allGrammarErrors → generateDailyMissionPrompt 第 4 参 defenseItems 注入「请重点盯防以下毛病：[…]」（最多 3 条）
  - 句型卡认知重塑（防错误石化）：正面 = 💡 想要表达[explanation 中文情境] + buildCloze 完形填空（地道句挖空 1–3 个 ≥4 字母内容词，STOP 功能词表跳过，不足从末尾倒序补足）——**用户原句（replacedSentence/Chinglish）正面背面均不再出现**；背面 = 24px 绿色加粗地道句 + 🎬 解析；srs-card-back-original 删除线背面整体移除
  - 排版降噪：style.css 去 Georgia 报纸衬线（#srs-card-front font-family: inherit）；.srs-flip-inner 改 min-height:250px 自适应内容（正面 static 定义高度，背面 absolute inset-0 overflow-y auto），删除 flex-1 撑满全屏
  - SM-2 漏斗：`PATTERN_SESSION_CAP = 15` → getDueSentencesQueue 末尾 `slice(0, 15)` 单日截断（92 → 15）；首页待办与复习页同源绑定自动同步为 15；未入队到期句次日仍到期（SM-2 未推进），逐日消化无丢失
- **v78 对话想法卡片排版统一（净化 + 恒定层级规格）**：
  - 根因：Card B 旧渲染按 en 有无分支——有 en = 15px 主色英文 + 13px 灰中文，无 en = 仅 13px 灰中文，且日报文本混入 markdown 星号/残留 HTML/换行 → 每天字体颜色字号漂移
  - `cleanThoughtText(s)` 纯函数（app.js Helpers 区，h/hf 旁）：剥 HTML 标签 → 剥列表符 → 成对强调标记去符号 → 残余 `*_`~#` 兜底清除 → 空白折叠 → 换行并入单行 → 去包裹引号（渲染层统一加中文弯引号“”）
  - 恒定规格：主体 `(dt.en || dt.zh)` 恒为 15px font-medium 主色（en 缺失时 zh 升主）；副行仅当 en 在场时显示 zh 释义，恒为 13px 灰 dim；外层 `border-l-[3px] border-l-[var(--c-primary)] pl-3` 引语块——层级不再随数据完整度变化
  - 数据源不变：`_reportParsed/_historyParsed.summary.dailyThought`（parser.js parseDailyThought 归一化 {en, zh}），净化只发生在渲染层，上游消费方不受影响
- **v79 全局重构（架构师审计后一次性补丁 —— due 卡组件化 + 死代码清理）**：
  - due 卡错题分支组件化：徽章复用 `errorBadge(item.error.type, type==='pronunciation'?'发音纠正':'语法纠错')`（删除硬编码「⚠️ 语法纠错」红底徽章）；正面按正向输入原则 = 动态徽章 + 原句小字灰显 + icon('lightbulb') 回忆引导（大字号错误句主视觉废弃）；背面 CorrectionCard 规格 = 17px 绿色正确句居中为主 + 规则框（删除「→ 正确句」箭头旧碎片）
  - `due-reveal-btn` 去 emoji：`icon('eye') + 点击显示答案`，showDueCard 尾部补 `refreshIcons(document.getElementById('due-card'))`（Lucide 动态渲染必须）
  - 例句斜体清零：style.css `.vocab-card .example` 删 font-style:italic + due 卡例句 `italic`→`not-italic`，💬→icon('message-circle')
  - 死 CSS 删除：style.css `.error-card` 整块 + `[data-mode="dark"] .error-card` 关联——`.err-orig { line-through }` 从此绝迹（线上 grep 0）；app.js:1069 的 line-through 是待办完成态勾选（任务语义，合法保留）
  - mock 去硬编码：`lastSync: getLocalToday() + ' 18:30'`（types.ts 同步为空串）
  - 审计确认健康（未动）：buildGlobalMissionInputs 时间网关 / getTodayMissionState 7 调用点 SSOT / PATTERN_SESSION_CAP=15 截断 / 录音函数族已删 / 灵感舱为活代码
  - 遗留提示：`ExecutiveSummary.tsx` / `refactor-card-f.md` 为非运行时历史文件，内含 Georgia italic 引用，不参与部署（如需彻底清理另议）
- **v80 排版拉平 + dailyThought 兜底**：Card B 主行 v78 的 15px font-medium 过于突出 → `text-sm(14px) font-normal`（与 Card C/D 正文同级）；dtRaw 兜底链扩为 `summary.dailyThought → parseDailyThought(summary.thoughts) → d.thoughts`（老数据只有 thoughts 字段也能提取）；parser.js Markdown 想法标题变体加宽：对话想法/今日心得/今日想法/我的想法/我的心得/今日思考
- **v81 错题卡数据腰斩根治 + 图鉴定位**：
  - `standardizeErrorCards` 配对合并（v81 段）：相邻两条中 A 只有原句无正句 + B 只有正句无原句（且无 rule）→ 合成一张 CorrectionCard；双向覆盖（原句-only 在前或正句-only 在前均可）。根因：日报「我说/应为」解析拆行时产出两条相邻残卡
  - `renderErrorCards` 重写：主视觉降级链 `correction → original → 隐藏`（**绝不渲染 '-'/'—' 占位**；降级显示 original 时用主色非绿色）；辅助区「原句：…」仅在主视觉为正确句且原句存在时展示（避免与降级主视觉重复）；**复习按钮（btn-again/btn-good 及接线）整体删除**——错题库总览 = 错题图鉴/仪表盘，非 SM-2 复习模式，仅保留右上角 🛡️ 对练防御开关；reviewButtonHTML 注释同步（调用点剩 due-*/srs-* 两处）
- **Voco 2.0 跟读页转型（v73）句型记忆卡片模式 —— SM-2 全链路闭环**：
  - 页面重构：`renderSentenceReview(sentences, startIndex)` 渲染单卡翻转视口（正面英文原句 → 点击翻转翻译解析）；**机械录音三键（听原音/按住录音/听自己）与录音函数族整体物理删除**（speakWord TTS 保留，词汇列表发音在用）；底部导航更名「句型复习」（icon repeat，data-tab 仍 'speak'，全部 ?tab=speak 兼容链不动）
  - 反馈双键完全克隆词汇复习（图18）：😅 还没记住 = `bg-red-50 hover:bg-red-100 border-0 rounded-2xl text-sm font-bold text-[var(--c-red)]`、🚀 记住了 = 绿色同构——高度/圆角/内边距逐字一致，严禁第二套按钮样式
  - 点击闭环：`rateSentenceCard(status)` → `handleReviewFeedback(String(item.id), status, item)`（fire-and-forget 不阻塞出队）→ `_srsQueue.splice(_srsIdx, 1)` 当前句自动出队 → 进度 `🎯 句型复习 (已复习 x / 总计 y)` 即时更新（顶部进度栏深灰 text-[var(--c-text)]，与词汇复习统一）
  - 完成态：队列清空 → `showSrsDone()` 精致 Done 卡（party-popper 绿圆底 + 「记住了 N · 还没记住 M」+ 🏠 回到首页）+ `localStorage['voco-speak-done'] = getLocalToday()` 当日戳 → 首页【句型复习打卡】即时点亮（loadHome 只读比对）
  - 单词复习共用：`rateDueCard` 单词分支改为 `handleReviewFeedback(String(item.ref.id), rating)`（deck item id 带 'w-' 前缀，必须传 ref.id）；`reviewWordItem` = 原 applyDueRating + 写回逻辑无损提取（🔴不清 needsReview / 🟢星+1 出队）
  - 空状态：`_srsQueue.length === 0` → 「暂无待复习句型」温润极简卡（book-open 图标 + 📥 导入今日日报 CTA），严禁 0 句空心圆圈
- 内置演示数据：`mockWords`（3 词，布尔标签齐全）、`mockSentences`（2 句，isTodayCore:true）——永久合并进词库，布尔打标优先驱动

## Version Bump Checklist
When deploying frontend changes:
- [ ] `sw.js`: bump `CACHE` name (e.g. `voco-v65` → `voco-v66`)
- [ ] `sw.js`: bump all `?v=XX` in FILES array (v55 → v56)
- [ ] `index.html`: bump `style.css?v=XX` and script `?v=XX` params
- [ ] `app.js`: bump `sw.js?v=XX` in service worker registration
- [ ] `node --check app.js` passes（唯一允许的校验；禁止编写/运行任何本地测试脚本）
- [ ] Commit from repo root, push, wait ~85s, curl verify `app.js?v=NN` + `index.html`
