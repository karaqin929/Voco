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
- **Parser**: `parser.js` (Markdown daily report → structured data) — **铁律：NEVER MODIFY**
- **Service Worker**: `sw.js` (cache-first, version in `CACHE` const)
- **No build step** — static files served directly

## Key Files
| File | Role |
|------|------|
| `🖥️ 前端/app.js` | All app logic (~2730 lines) |
| `🖥️ 前端/index.html` | Single-page shell |
| `🖥️ 前端/sw.js` | Service worker (bump CACHE + all `?v=` when deploying) |
| `🖥️ 前端/parser.js` | Markdown 解析引擎（不修改，清洗层在 app.js 包一层） |
| `🖥️ 前端/supabase-client.js` | Supabase init |
| `📋 日报模板/ChatGPT日报Prompt.md` | 新版 JSON 日报模板 |

## 版本机制（两个版本号，都是故意的）
- **`?v=NN`**（当前 v54）：HTTP/Cloudflare 缓存击穿。写在 index.html/sw.js 的资源 URL 上。
- **`voco-vNN`**（当前 voco-v64）：SW CacheStorage 名称——唯一能替换缓存中根文档 `/` 的手段（`/` 无法带 ?v=）。
- 两者历史上漂移差 10（v50 ↔ voco-v60），无碍；**每次部署必须各自 +1**。
- 当前线上：**v54 / voco-v64**。

## Architecture Notes
- Tab 结构：首页 / **复习**（原「单词」）/ **跟读**（原「口语」）/ 我的
- 路由即状态（URL 单一数据源）：
  - `?tab=words` 复习页；`?tab=new|mistakes|review` 复习页内部视图（`switchWordsView`，绝不写 `_activeFilter`）
  - `?tab=speak&filter=core_sentences` 跟读页核心句型队列
- 状态隔离：`_activeFilter`（跟读页专用）vs `_wordsFilter`（复习页专用）vs `_navigatingViaProgram` 守卫
- 跟读页 = **沉浸式单卡播放器 ShadowingPlayer**（铁律：禁止 .map 瀑布流；DOM 结构不许擅自更改）
- 计数铁律（单一数据源，绝不分叉）：
  - 今日新词 `countTodayWords`：isNewToday 布尔优先，date_added 兜底
  - 错词 `countMistakeWords`：isMistake 优先，errors 交叉比对兜底
  - 待复习 `countReviewWords`：needsReview 优先，SM-2 `isDueBySrs` 兜底 —— 首页 todo / SM-2 卡片 / tab=review 三处共用
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
- [ ] `sw.js`: bump `CACHE` name (e.g. `voco-v64` → `voco-v65`)
- [ ] `sw.js`: bump all `?v=XX` in FILES array (v54 → v55)
- [ ] `index.html`: bump `style.css?v=XX` and script `?v=XX` params
- [ ] `app.js`: bump `sw.js?v=XX` in service worker registration
- [ ] `node --check app.js` passes
- [ ] Commit from repo root, push, wait ~2-3 min, curl verify `app.js?v=NN`
