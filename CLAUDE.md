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
- **Parser**: `parser.js` (ChatGPT daily report → structured data)
- **Service Worker**: `sw.js` (cache-first, version in `CACHE` const)
- **No build step** — static files served directly

## Key Files
| File | Role |
|------|------|
| `🖥️ 前端/app.js` | All app logic (2085 lines) |
| `🖥️ 前端/index.html` | Single-page shell |
| `🖥️ 前端/style.css` | Legacy CSS (v5.0, mostly replaced by Tailwind) |
| `🖥️ 前端/sw.js` | Service worker (bump CACHE + all `?v=` when deploying) |
| `🖥️ 前端/supabase-client.js` | Supabase init |
| `🖥️ 前端/parser.js` | Report parser |
| `🖥️ 前端/types.ts` | TypeScript schema (reference only, not compiled) |
| `🖥️ 前端/ExecutiveSummary.tsx` | React blueprint (future migration) |

## Architecture Notes
- Tab-based SPA: `#tab-home`, `#tab-words`, `#tab-speak`, `#tab-me`
- Smart routing: `navigateToTab(tab, filter, label)` → URL params `?tab=X&filter=Y`
- Filter state: `_activeFilter`, `_activeFilterLabel` (read from URL on load)
- Focus mode: speak page supports `?filter=tense` → filtered cards + large breathing-room UI
- Words sub-tabs: `_wordsFilter` → `'all' | 'today' | 'errors'`
- SM-2 spaced repetition: `sm2()` function for flashcard review
- Morandi theme system: CSS variables via `data-theme` + `data-mode` on `<html>`

## Version Bump Checklist
When deploying frontend changes:
- [ ] `sw.js`: bump `CACHE` name (e.g. `voco-v51` → `voco-v52`)
- [ ] `sw.js`: bump all `?v=XX` in FILES array
- [ ] `index.html`: bump `style.css?v=XX` and script `?v=XX` params
- [ ] `app.js`: bump `sw.js?v=XX` in service worker registration
