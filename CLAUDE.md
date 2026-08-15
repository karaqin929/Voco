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
- **`?v=NN`**（当前 v57）：HTTP/Cloudflare 缓存击穿。写在 index.html/sw.js 的资源 URL 上。
- **`voco-vNN`**（当前 voco-v67）：SW CacheStorage 名称——唯一能替换缓存中根文档 `/` 的手段（`/` 无法带 ?v=）。
- 两者历史上漂移差 10（v50 ↔ voco-v60），无碍；**每次部署必须各自 +1**。
- 当前线上：**v57 / voco-v67**。

## Architecture Notes
- Tab 结构：首页 / **复习**（原「单词」）/ **跟读**（原「口语」）/ 我的
- 路由即状态（URL 单一数据源，P2 规范化路由中枢）：
  - 规范路由：`/review?tab=all|grammar|due`（复习页）、`/review?filter=today`（首页「复习今日单词」过滤态，正交于三 Tab）、`/shadowing?id=xxx`（跟读页锚定）、`/shadowing?sentence=xxx`（教练卡点击句动态单句队列）、`/`（首页）
  - 导航器：`navigateReview` / `navigateShadowing` / `navigateToTab`（兼容层）/ `normalizeLegacyUrl()` / `handleRoute()` / popstate
  - 旧参数兼容：`?tab=new→all`、`?tab=mistakes→grammar`、`?tab=review→due`（loadWords 归一）、`?tab=words→/review`、`?tab=speak→/shadowing`
  - server.py SPA catch-all 在全部 API 路由之后（最后一条路由）
- 状态隔离：`_activeFilter`（跟读页专用）vs `_wordsFilter`（复习页专用）vs `_navigatingViaProgram` 守卫
- 复习页 = **混合记忆引擎**（P3）：
  - 严格三 Tab：全部词汇（仅词卡）/ 语法错题（仅错题卡，原句删除线+正确句高亮）/ 待复习（needsReview 词 + 错题统一混合卡组）
  - Active Recall 双阶段：正面仅英文+音标（错题仅错句），中央 [👁️ 点击显示答案]；背面释义+[🔴 没记住][🟢 记住了]
  - SM-2 驱动：🔴 quality=0 留队列 / 🟢 quality=3 星+1、计算下次复习时间、平滑收起；`_reviewedErrorIds` 会话去重
  - 卡片布局分离：熟练度星点左、操作按钮右、来源行独立截断
- 跟读页 = **沉浸式单卡播放器 ShadowingPlayer**（P4 收尾；铁律：禁止 .map 瀑布流；DOM 结构不许擅自更改）：
  - `#speak-player` 单卡视口（calc(100dvh - 92px)），主句衬线体居中，划线弱化 replacedSentence + 解释胶囊
  - 底部固定流式交互台：[🔊 听原音] 次按钮 / [🎙️ 按住录音] 主按钮（按压缩放反馈）/ [🗣️ 听自己] 未录音 disabled / [下一句 →] 递增并重置录音态 / 末句 [🎉 训练完成] disabled
  - `resolveAnchorIndex`：?id= 驱动首卡，找不到/越界钳制回 0
  - 死代码物理清理铁律：删掉的 DOM/CSS/JS 必须三处同步物理删除，不留残影
- **真实数据流铁律（v56 紧急整改后固化）**：
  - `resolveActiveReport(reports)`：日报解析一律经此网关（今天 → _viewDate 历史视图 → 最新有效日报 → null），播放器/生词/错题共用，禁止 `r.date === today` 直连
  - `mergeReportVocab(snapshot, reportParsed)`：日报 newWords 完整并入全局词库（同名继承真实 id + 打 isNewToday，缺词 `rep-N` 追加）——首页/复习页绝对同源；`getFilteredVocab 'today'` 以日报生词为唯一事实源（与首页 `newCount = parsed.vocabulary.length` 一致），禁止打标词短路
  - `standardizeErrorCards(rawItems)`：所有错题渲染前必经清洗——碎片合并（`→`/`➡️`/`-` 开头的延续行并入前一条）+ 结构归一 `{id, original, correction, rule, type}`；单卡单外层容器
  - `classifyErrorType(o, c, rule)`（parser.js 唯一分类源）：发音纠偏/时态语态/冠词使用/逻辑衔接/地道表达/其他 六类关键词+特征推断，`aggregateErrorPatterns` 与解析入库共用
  - 学习建议分流 `classifySuggestion`：sentence → `navigateShadowing('core-N')` 锚定 / vocab → `navigateReview` / coach → 私教任务弹窗（指引 + 一键复制 ChatGPT Prompt），**禁止盲跳播放器**
  - 教练卡跟读入口 `startImprovementSpeak(idx)`：携带用户点击句经 `navigateShadowing(undefined, sentence)` → `?sentence=` → loadSpeak 单句队列最高优先，**禁止无参 navigateShadowing 默认句开头**
  - 字段名唯一：`isNewToday`（打标/计数/过滤/兜底四处同源，历史教训 isTodayNew 分叉已修）
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
- 内置演示数据：`mockWords`（3 词，布尔标签齐全）、`mockSentences`（2 句，isTodayCore:true）——永久合并进词库，布尔打标优先驱动

## Version Bump Checklist
When deploying frontend changes:
- [ ] `sw.js`: bump `CACHE` name (e.g. `voco-v65` → `voco-v66`)
- [ ] `sw.js`: bump all `?v=XX` in FILES array (v55 → v56)
- [ ] `index.html`: bump `style.css?v=XX` and script `?v=XX` params
- [ ] `app.js`: bump `sw.js?v=XX` in service worker registration
- [ ] `node --check app.js` passes
- [ ] E2E 回归：`.voco-e2e-test.js`（grabDecl 声明抓取器）全绿后删除临时文件
- [ ] Commit from repo root, push, wait ~2-3 min, curl verify `app.js?v=NN`
