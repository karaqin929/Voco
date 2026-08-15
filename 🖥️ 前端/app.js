// ═══════════════════════════════════════════════════════
// Voco v5.0 — Tailwind Dashboard + Grouped-List Settings
// ═══════════════════════════════════════════════════════

// ── Tab Switching ──────────────────────────────────────
document.querySelectorAll('.tab-bar .tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-bar .tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');

    // 模块二：真实路径 — 手动切换底部 Tab 即写入规范路由（/review / /shadowing），杜绝死链
    if (!_navigatingViaProgram) {
      _activeFilter = null;
      _activeFilterLabel = '';
      const canonical = { home: '/', words: '/review', speak: '/shadowing', me: '/' }[btn.dataset.tab] || '/';
      if (location.pathname + location.search !== canonical) window.history.pushState({}, '', canonical);
    }

    const t = btn.dataset.tab;
    if (t === 'home') loadHome();
    else if (t === 'words') loadWords();
    else if (t === 'speak') loadSpeak();
    else if (t === 'me') loadMe();
  });
});

// ── Smart Filter / Routing ────────────────────────────
let _activeFilter = null;
let _activeFilterLabel = '';
let _navigatingViaProgram = false;  // guards against state pollution from programmatic tab switches

// Read filter from URL on page load
(function initFilterFromURL() {
  const params = new URLSearchParams(window.location.search);
  _activeFilter = params.get('filter') || null;
  if (_activeFilter) _activeFilterLabel = _activeFilter;
})();

// ── 模块二：精准路由锚定（真实路径，绝不死链）──────────────
// 规范路由：/review?tab=all|grammar|due（复习页严格三 Tab）· /shadowing?id=xxx（跟读页锚定指定句）· /（首页）
// navigateToTab 保留为兼容层：旧调用（?tab= 体系）自动翻译为规范路由
function navigateToTab(tab, filter, label) {
  if (tab === 'words') {
    // 旧参数映射：new→all（决策3：今日新词回归首页看板）/ mistakes→grammar / review→due
    const m = { new: 'all', mistakes: 'grammar', review: 'due' }[filter] || 'all';
    navigateReview(m);
    return;
  }
  if (tab === 'speak') {
    _activeFilter = filter || null;
    _activeFilterLabel = label || filter || '';
    window.history.pushState({}, '', '/shadowing' + (filter ? `?filter=${encodeURIComponent(filter)}` : ''));
    _navigatingViaProgram = true;
    document.querySelector('.tab[data-tab=speak]').click();
    _navigatingViaProgram = false;
    return;
  }
  _activeFilter = null;
  _activeFilterLabel = '';
  window.history.pushState({}, '', '/');
  _navigatingViaProgram = true;
  document.querySelector(`.tab[data-tab=${tab}]`).click();
  _navigatingViaProgram = false;
}

// /review?tab=grammar · /review?tab=due · /review?tab=all&filter=today — 首页按钮的精准锚定入口（绝不写死 ?tab= 死链）
// filter=today：今日单词过滤态（只渲染 isNewToday===true 的词），与三 Tab 正交
function navigateReview(tab, filter) {
  const t = ['all', 'grammar', 'due'].includes(tab) ? tab : 'all';
  const f = (filter === 'today') ? '&filter=today' : '';
  _activeFilter = null; _activeFilterLabel = '';
  window.history.pushState({}, '', '/review' + (t !== 'all' ? `?tab=${t}` : '') + (t === 'all' ? (f ? '?filter=today' : '') : f));
  _navigatingViaProgram = true;
  document.querySelector('.tab[data-tab=words]').click();
  _navigatingViaProgram = false;
}

// /shadowing?id=${item.id} — 跟读页按 id 锚定到指定句（绝不从第 0 句开始）
function navigateShadowing(id) {
  _activeFilter = null; _activeFilterLabel = '';
  const hasId = id !== undefined && id !== null && id !== '';
  window.history.pushState({}, '', '/shadowing' + (hasId ? `?id=${encodeURIComponent(id)}` : ''));
  _navigatingViaProgram = true;
  document.querySelector('.tab[data-tab=speak]').click();
  _navigatingViaProgram = false;
}

function clearFilter() {
  _activeFilter = null;
  _activeFilterLabel = '';
  window.history.pushState({}, '', '/');
}

// 旧路由归一化：?tab=words/new/mistakes/review/speak → /review / /shadowing（历史书签/分享链接无缝兼容）
function normalizeLegacyUrl() {
  if (location.pathname !== '/') return;
  const p = new URLSearchParams(location.search);
  const tab = p.get('tab');
  if (!tab) return;
  const filter = p.get('filter');
  const map = {
    words: '/review',
    new: '/review?tab=all',        // 决策3：「今日新词」回归首页看板，复习页不再占坑
    mistakes: '/review?tab=grammar',
    review: '/review?tab=due',
    speak: '/shadowing' + (filter ? `?filter=${encodeURIComponent(filter)}` : ''),
    home: '/'
  };
  if (map[tab] !== undefined) window.history.replaceState({}, '', map[tab]);
}

// 路由调度器：URL 是唯一事实源 — pathname 分发 Tab，各加载函数自行读取 query 参数
function handleRoute() {
  normalizeLegacyUrl();
  const path = location.pathname;
  let tab = 'home';
  if (path === '/review') {
    tab = 'words';
    _activeFilter = null; _activeFilterLabel = '';
    const sp = new URLSearchParams(location.search);
    const t = sp.get('tab') || 'all';
    // filter=today：首页「复习今日单词」携带的过滤态，正交于三 Tab，只渲染 isNewToday 词
    _wordsFilter = sp.get('filter') === 'today' ? 'today'
      : (['all', 'grammar', 'due', 'new', 'mistakes', 'review'].includes(t) ? t : 'all');
  } else if (path === '/shadowing') {
    tab = 'speak';
    _activeFilter = null; _activeFilterLabel = ''; // URL 的 filter/id 参数才是跟读页唯一事实源
  } else if (path === '/') {
    const t = new URLSearchParams(location.search).get('tab') || 'home';
    const legacy = { words: 'words', new: 'words', mistakes: 'words', review: 'words', speak: 'speak', me: 'me' };
    tab = legacy[t] || 'home';
    if (t === 'new' || t === 'mistakes' || t === 'review') _wordsFilter = t;
  }
  _navigatingViaProgram = true;
  document.querySelector(`.tab[data-tab=${tab}]`).click();
  _navigatingViaProgram = false;
}

// Handle browser back/forward — 统一走路由调度器（含旧路由归一化）
window.addEventListener('popstate', handleRoute);

// ── Auth ──────────────────────────────────────────────
let _authChecked = false;
async function checkAuth() {
  if (_authChecked) return; // prevent double-fire from onAuthStateChange + manual call
  _authChecked = true;
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-main').style.display = 'block';
    document.getElementById('voco-loading').style.display = 'none';
    await loadConfig();
    cleanLegacyLocalStorage(); // 应用初始化：本地缓存遗留日报数据先过清洗层
    handleRoute(); // 模块二：初始 Tab 由 URL 决定（/ /review /shadowing），旧 ?tab= 链接自动归一
    detectClipboard();
  } else {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-main').style.display = 'none';
    document.getElementById('voco-loading').style.display = 'none';
  }
  _authChecked = false;
}

async function signIn() {
  await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/', queryParams: { prompt: 'select_account' } }
  });
}

async function sendMagicLink() {
  const input = document.getElementById('login-email-input');
  const email = input.value.trim();
  const hint = document.getElementById('login-email-hint');
  const btn = document.getElementById('btn-login-email');
  if (!email) { hint.style.display = 'block'; hint.textContent = '请输入邮箱地址'; hint.className = 'login-email-hint error'; return; }
  btn.disabled = true; btn.textContent = '发送中...'; hint.style.display = 'none';
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/' } });
  if (error) {
    hint.style.display = 'block'; hint.textContent = '发送失败: ' + error.message; hint.className = 'login-email-hint error';
    btn.disabled = false; btn.textContent = '发送登录链接';
  } else {
    hint.style.display = 'block'; hint.textContent = '✅ 已发送！请查收邮箱 ' + email; hint.className = 'login-email-hint success';
    btn.textContent = '已发送';
  }
}

async function signOut() { _authChecked = false; await sb.auth.signOut(); checkAuth(); }

// ── Config ─────────────────────────────────────────────
let APP_NAME = 'Voco';

async function loadConfig() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const { data } = await sb.from('user_config').select('*').eq('user_id', session.user.id).maybeSingle();
  if (data) { APP_NAME = data.app_name || 'Voco'; if (data.user_name) localStorage.setItem('voco-username', data.user_name); }
  else { await sb.from('user_config').insert([{ user_id: session.user.id, app_name: 'Voco', user_name: '' }]); }
  document.querySelector('.app-title').textContent = APP_NAME;
  document.title = APP_NAME;
}

// ── Username autosave ──────────────────────────────────
let _usernameSaveTimer = null;
document.getElementById('setting-username').addEventListener('input', function() {
  const val = this.value.trim();
  localStorage.setItem('voco-username', val);
  clearTimeout(_usernameSaveTimer);
  _usernameSaveTimer = setTimeout(async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      await sb.from('user_config').upsert({ user_id: session.user.id, user_name: val }, { onConflict: 'user_id' });
    }
  }, 800);
  // Only update greeting text inline — don't reload entire dashboard
  const name = val || '';
  const el = document.getElementById('greeting-text');
  if (el) {
    const hour = new Date().getHours();
    let g; if (hour < 6) g = '夜深了'; else if (hour < 12) g = '早上好'; else if (hour < 14) g = '中午好'; else if (hour < 18) g = '下午好'; else g = '晚上好';
    el.textContent = name ? `${g}，${name}！` : `${g}！`;
  }
});

// ── Icon SVGs (Feather-style, inherit currentColor) ──────
const ICO_SPEAKER = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:3px"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>';
const ICO_MIC = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:3px"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
const ICO_REPEAT = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:3px"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>';

// ═══════════════════════════════════════════════════════
// TAB 1: HOME (v5.0 Dashboard — Tailwind-only, 5 sections)
// ═══════════════════════════════════════════════════════
let _viewDate = null; // null=today, else 'YYYY-MM-DD' for history view

// ── Mock Dashboard Data (powers all cards when no real report) ──
const mockDashboardData = {
  user: { name: 'kk' },
  status: { hasReport: true, lastSync: '2026-08-12 18:30' },
  quote: {
    en: "The limits of my language mean the limits of my world.",
    zh: "语言的边界，就是世界的边界。",
    author: "Ludwig Wittgenstein",
    category: "PHILOSOPHY"
  },
  metrics: {
    overall: 78, fluency: 75, grammar: 72, vocab: 80, natural: 82,
    speakMin: 18, totalMin: 30,
    topics: 3, newWords: 4, expressions: 10, corrections: 2
  },
  insights: {
    topics: ['personal growth', 'daily routines', 'future plans'],
    thoughts: {
      en: "Personal growth requires patience and time — there's no shortcut to becoming a better version of yourself.",
      zh: "个人成长需要时间和耐心——成为更好的自己，没有捷径可走。"
    },
    strengths: [
      '能够表达抽象观点，如"个人成长需要时间沉淀"',
      '遇到表达困难时，能主动替换近义词汇绕过障碍',
      '语音语调自然，停顿位置合理，语速适中'
    ],
    improvements: [
      // 🔴 Hard Mistake — 硬性语法错误：非黑即白，必须纠正
      { type:'grammar', issue:'语法纠错', wrong:'I have went to three interviews last month.', correct:'I have gone to three interviews last month.', explanation:'注意时态的一致性：现在完成时需用 have + 过去分词（gone），不能用过去式 went', detail:"'I have went' → 应为 'I have gone'", action:'专项攻克', tab:'speak', filter:'tense', filterLabel:'时态句型', errorCategory:'tense' },
      { type:'grammar', issue:'语法纠错', wrong:'I went to store.', correct:'I went to the store.', explanation:'冠词遗漏：单数可数名词 store 前需要冠词 the', detail:"'I went to store' → 应为 'I went to the store'", action:'查看纠错', tab:'words', filter:'mistakes', filterLabel:'高频错词', errorCategory:'article' },
      // 💡 Soft Upgrade — 语法没错，但不够地道：不做删除线，只做升级替换
      { type:'expression', issue:'地道表达', wrong:'I think I can do this job.', correct:"I believe I'm a strong fit for this role.", explanation:'使用更具商务感的词汇：面试场景下 believe / strong fit 比口语化的 I think 更专业自信', detail:"'I think I can do this job' → 'I believe I'm a strong fit for this role'", action:'专项跟读', tab:'speak', filter:'connective', filterLabel:'地道表达', errorCategory:'collocation' },
      // 🎯 Structure — 逻辑断层：连接词让层次更分明
      { type:'structure', issue:'逻辑与结构', wrong:'I wanted to go out. It was raining.', correct:'I wanted to go out. However, it was raining.', explanation:'表达转折时使用 however / therefore 等连接词，让层次更分明', detail:'多处句子之间缺乏 however/therefore 等过渡词', action:'专项跟读', tab:'speak', filter:'connective', filterLabel:'连接词句型', errorCategory:'connective' }
    ],
    nextSteps: [
      { step: '练习使用更复杂的连接词（however, therefore, moreover）', action: '专项跟读', tab: 'speak', filter: 'connective', filterLabel: '连接词句型' },
      { step: '刻意练习过去时态与现在完成时的区分', action: '专项跟读', tab: 'speak', filter: 'tense', filterLabel: '时态句型' },
      { step: '尝试在下次对话中使用至少 3 个本周新学单词', action: '去练习', tab: 'words', filter: 'new', filterLabel: '今日新词' }
    ],
    // ── v6.0 高管摘要（Card F 重构） ──
    executiveSummary: '整体流利度明显提升，但在时态一致性和逻辑连接词的使用上仍有结构化提升空间。',
    highlights: [
      { text: '能够流畅表达抽象观点，语言组织能力较好' },
      { text: '遇到表达困难时能主动替换近义词，沟通策略成熟' },
      { text: '语音语调自然，停顿位置合理，语速适中' }
    ],
    targetAreas: [
      { category:'tense', label:'时态混淆', keyword:'过去时 vs 完成时', count:3, filterKey:'tense', filterLabel:'时态句型', actionLabel:'专项跟读' },
      { category:'connective', label:'连接词缺失', keyword:'however / therefore', count:2, filterKey:'connective', filterLabel:'连接词句型', actionLabel:'专项跟读' },
      { category:'article', label:'冠词遗漏', keyword:'a / an / the', count:2, filterKey:'mistakes', filterLabel:'高频错词', actionLabel:'去纠错' }
    ],
    overallReview: "本次练习围绕个人成长展开，用户能够表达较复杂的观点，在描述抽象概念时展现了较好的语言组织能力。整体流利度有明显提升，但在语法细节和连接词使用上仍有优化空间。建议在下次练习中刻意关注时态一致性和逻辑连接词的运用。"
  },
  contentCards: [
    // num 不再硬编码 — renderContentCards 从 mockWords / mockSentences 动态计算
    { icon: 'pen-line', label: '新学单词', tab: 'words', btn: '复习今日单词', filter: 'new', filterLabel: '今日新词' },
    { icon: 'ruler', label: '核心句型', tab: 'speak', btn: '练习句型', filter: 'core_sentences', filterLabel: '核心句型' },
    { icon: 'wrench', label: '重点纠错', tab: 'words', btn: '查看纠错', filter: 'mistakes', filterLabel: '高频错词' }
  ],
  todos: [
    { text: '复习 5 个今日新单词', done: false, action: '去复习', tab: 'words' },
    { text: '完成影子跟读练习', done: false, action: '开始练习', tab: 'speak' },
    { text: '导入今日 ChatGPT 日报', done: true }
  ]
};

// 2. 跟读/口语数据 (绝对不允许拆分，必须是嵌套对象)
const mockSentences = [
  {
    id: 1,
    targetSentence: "I want to take my English to the next level.",
    replacedSentence: "I want to make my English better.",
    explanation: "表达能力进阶，比 'make better' 更地道、更有目标感。",
    isTodayCore: true
  },
  {
    id: 2,
    targetSentence: "I believe I'm a strong fit for this role.",
    replacedSentence: "I think I can do this job.",
    explanation: "面试/职场语境，show confidence without arrogance。",
    isTodayCore: true
  }
];

// 1. 单词/复习数据 (必须包含布尔值标签)
const mockWords = [
  { id: 1, word: 'competitive', phonetic: "/kəm'petətɪv/", meaning: '有竞争力的', example: 'The industry is highly competitive right now.', isNewToday: true, isMistake: false, needsReview: true },
  { id: 2, word: 'standout', phonetic: "/'stændaʊt/", meaning: '突出的', example: 'Her presentation was the standout.', isNewToday: true, isMistake: false, needsReview: true },
  { id: 3, word: 'went', meaning: 'go 的过去式（易错）', example: 'I have gone to the store.', isNewToday: false, isMistake: true, needsReview: false, correct: 'gone' }
];
// 错词数据（供 _errorsAll 交叉比对 fallback）
const mockMistakeErrors = mockWords.filter(w => w.isMistake).map(w => ({
  id: 'me_' + w.id,
  type: 'grammar',
  original: w.example,
  correction: w.correct || w.example,
  rule: w.meaning || '搭配 / 词性易错',
  date_added: w.date_added || new Date().toISOString().slice(0, 10),
  source_topic: w.source_topic || '易错词'
}));

let _homeLoading = false;
async function loadHome() {
  if (_homeLoading) return;
  _homeLoading = true;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) { _homeLoading = false; return; }

  const [{ data: vocab }, { data: errors }, { data: prog }, { data: reports }, { data: patterns }] = await Promise.all([
    sb.from('vocabulary').select('*'),
    sb.from('errors').select('*'),
    sb.from('progress').select('*').eq('user_id', session.user.id).maybeSingle(),
    sb.from('reports').select('*').order('date', { ascending: false }).limit(90),
    sb.from('patterns').select('*')
  ]);

  const vList = buildWordSnapshot(vocab, errors); // 打标网关：合并内置词库 + 注入布尔标签（渲染层只读布尔）
  const eList = errors || [];
  const pList = stampPatternTags(patterns);      // 句型打标：唯一 id + isTodayCore + 标准嵌套字段
  const rList = reports || [];
  const today = new Date().toISOString().slice(0, 10);

  const activeDate = _viewDate || today;
  const activeReport = rList.find(r => r.date === activeDate);
  const todayReport = rList.find(r => r.date === today);
  // 时间判断上收加载层：hasTodayReport 在此一次性计算，渲染组件零 new Date() 过滤
  const hasTodayReport = rList.some(r => r.date === today && isDailyReport(r));
  // 时间计算上收加载层：渲染组件零 new Date() 过滤
  const reviewedToday = vList.filter(v => v.last_reviewed_at && v.last_reviewed_at.slice(0, 10) === today).length;

  // Section 1: Header
  const dates = [...new Set(vList.map(v => v.date_added).filter(Boolean))].sort().reverse();
  const streak = calcStreak(dates);
  renderGreeting(streak, vList, rList, hasTodayReport);
  renderHistoryBanner(activeReport, activeDate);

  // Section 2: Streak / Check-in Card
  renderStreakCard(streak, todayReport, vList, rList);

  // Section 3: Metrics
  renderMetricsOverview(activeReport, vList, eList, pList, prog);

  // Section 4: Insights (Cards A-F)
  renderInsightsSection(activeReport);

  // Section 5: Content Cards + Todos
  renderContentCards(activeReport, vList, eList, pList);
  renderTodoList(todayReport, vList, eList, rList, streak, reviewedToday);
  _homeLoading = false;
}

// ── Section 1: Header ───────────────────────────────────
function renderGreeting(streak, vocabList, reports, hasToday) {
  const hour = new Date().getHours();
  let g; if (hour < 6) g = '夜深了'; else if (hour < 12) g = '早上好'; else if (hour < 14) g = '中午好'; else if (hour < 18) g = '下午好'; else g = '晚上好';
  const name = localStorage.getItem('voco-username') || '';
  document.getElementById('greeting-text').textContent = name ? `${g}，${name}！` : `${g}！`;
  const now = new Date();
  const wd = ['周日','周一','周二','周三','周四','周五','周六'];
  document.getElementById('greeting-date').textContent = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 ${wd[now.getDay()]}`;

  const st = document.getElementById('home-status-text');
  if (st) st.innerHTML = hasToday ? '已导入 ChatGPT 学习记录' : '今天还没有导入日报';
}

function renderHeaderBears(vocab, reports, viewDate) {
  const container = document.getElementById('header-bears');
  const dateScore = {};
  (vocab||[]).forEach(v => { if(v.date_added) dateScore[v.date_added] = (dateScore[v.date_added]||0)+2; });
  (reports||[]).forEach(r => { if(r.date && isDailyReport(r)) dateScore[r.date] = (dateScore[r.date]||0)+5; });
  const today = new Date();
  const days = [];
  for(let i=6;i>=0;i--){ const d=new Date(today); d.setDate(d.getDate()-i); days.push({date:d.toISOString().slice(0,10), day:d.getDate(), month:d.getMonth()+1, active:!!dateScore[d.toISOString().slice(0,10)]}); }
  container.innerHTML = days.map(d => `
    <div class="flex flex-col items-center gap-px shrink-0 cursor-pointer w-8" onclick="showBearDay('${d.date}',${d.active})">
      <img class="w-6 h-6 min-w-6 min-h-6 object-contain rounded-full transition-transform duration-150 ${d.date===viewDate?'shadow-[0_0_0_2px_var(--c-primary)] scale-110':''}" src="${d.active?'/bear-active.png':'/bear-default.png'}" alt="${d.active?'🐻':'🌱'}" onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<span class=flex items-center justify-center w-6 h-6 text-sm>${d.active?'🐻':'🌱'}</span>')" />
      <span class="text-[8px] text-[var(--c-text-ultradim)] whitespace-nowrap text-center">${d.month}/${d.day}</span>
    </div>
  `).join('');
}

function renderHistoryBanner(report, viewDate) {
  const banner = document.getElementById('home-history-banner');
  if(!banner) return;
  if(!viewDate){ banner.className='hidden'; return; }
  if(!report){ banner.className='hidden'; showToast(viewDate+' · 该日期无日报数据'); _viewDate=null; loadHome(); return; }
  const d = new Date(viewDate+'T00:00:00');
  const wd = ['周日','周一','周二','周三','周四','周五','周六'];
  banner.innerHTML = `<span class="inline-flex items-center gap-1">${icon('calendar','w-3.5 h-3.5')} 正在查看 ${viewDate} ${wd[d.getDay()]} 的数据</span> <a onclick="_viewDate=null;loadHome();" class="inline-flex items-center gap-1 cursor-pointer text-[var(--c-blue)] font-semibold">回到今天 ${icon('arrow-right','w-3 h-3')}</a>`;
  banner.className = 'flex justify-between items-center px-3.5 py-2 mb-2.5 text-[13px] text-[var(--c-text)] bg-[var(--c-primary-light)] rounded-2xl border-l-[3px] border-l-[var(--c-primary)]';
  refreshIcons(banner);
}

function showBearDay(date, active) {
  if(!active){ showToast(date+' · 未打卡，无日报数据'); return; }
  _viewDate = date; loadHome();
}

// ── Section 2: Streak / Check-in Card ───────────────────
function renderStreakCard(streak, todayReport, vocab, reports) {
  const el = document.getElementById('home-quote');
  const hasToday = !!todayReport;

  // Same dateScore as header bears
  const dateScore = {};
  (vocab||[]).forEach(v => { if(v.date_added) dateScore[v.date_added] = (dateScore[v.date_added]||0)+2; });
  (reports||[]).forEach(r => { if(r.date && isDailyReport(r)) dateScore[r.date] = (dateScore[r.date]||0)+5; });

  // 7 days: 6 days ago → today
  const now = new Date();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0,10);
    days.push({ date: ds, month: d.getMonth()+1, day: d.getDate(), active: !!dateScore[ds] });
  }

  el.innerHTML = `
    <div class="flex justify-between items-center mb-3">
      <span class="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--c-text-dim)]">
        ${icon('calendar','w-3.5 h-3.5')} 本周打卡
        ${streak > 0 ? `<span class="inline-flex items-center gap-0.5 text-emerald-500">· ${icon('flame','w-3.5 h-3.5')}${streak}天</span>` : ''}
      </span>
      ${hasToday
        ? `<span class="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">${icon('check-circle-2','w-3.5 h-3.5')}已打卡</span>`
        : `<span onclick="showImportDialog()" class="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--c-primary)] cursor-pointer">${icon('upload','w-3.5 h-3.5')}去打卡</span>`
      }
    </div>
    <div class="flex justify-between items-end">
      ${days.map(d => `
        <div class="flex flex-col items-center gap-px cursor-pointer w-8" onclick="showBearDay('${d.date}',${d.active})">
          <img class="w-6 h-6 min-w-6 min-h-6 object-contain rounded-full transition-transform duration-150" src="${d.active ? '/bear-active.png' : '/bear-default.png'}" alt="${d.active ? '🐻' : '🌱'}" onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<span class=flex items-center justify-center w-6 h-6 text-sm>${d.active ? '🐻' : '🌱'}</span>')" />
          <span class="text-[8px] text-[var(--c-text-ultradim)] whitespace-nowrap text-center">${d.month}/${d.day}</span>
        </div>
      `).join('')}
    </div>`;
  refreshIcons(el);
}

// ── Section 3: Metrics Overview ─────────────────────────
// ═══ 打标网关层 (Data Tagging Gateway) ═══════════════════
// 铁律（去时间化）：所有时间/状态计算收敛于此——数据加载后、渲染前一次性注入布尔标签。
// Dashboard / Review / Shadowing 渲染组件只读布尔值，绝不出现 new Date() 数据过滤。
function isDueBySrs(v, today) {
  if (!v || v.status === 'mastered' || v.mastered) return false;
  if (!v.next_review_date) return true;
  return v.next_review_date <= today;
}
function isMistakeByCrossRef(v, errors) {
  const w = (v.word || '').toLowerCase().trim();
  if (!w) return false;
  return (errors || []).some(e => ((e.original || '') + ' ' + (e.correction || '')).toLowerCase().includes(w));
}
// 词条打标：isNewToday / isMistake / needsReview 三标签逐条注入（已打标的不覆盖）
function stampDailyTags(vocabList, errorsList) {
  const today = new Date().toISOString().slice(0, 10);
  return (vocabList || []).map(v => {
    const t = { ...v };
    if (t.isNewToday === undefined) t.isNewToday = !!(t.date_added && t.date_added.slice(0, 10) === today);
    if (t.isMistake === undefined) t.isMistake = isMistakeByCrossRef(t, errorsList);
    if (t.needsReview === undefined) t.needsReview = isDueBySrs(t, today);
    return t;
  });
}
// 内置演示词库与云端词库合并：同名行继承布尔标签，缺词补入（永久合并，绝不允许 0 数据空状态）
function mergeDemoVocab(vocabList) {
  const source = (vocabList && vocabList.length) ? [...vocabList] : [...mockWords];
  const seenWords = new Set((vocabList || []).map(v => (v.word || '').toLowerCase().trim()));
  mockWords.forEach(d => { if (!seenWords.has(d.word.toLowerCase())) source.push({ ...d }); });
  const demoByWord = new Map(mockWords.map(w => [(w.word || '').toLowerCase(), w]));
  const seen = new Map();
  const merged = [];
  source.forEach(v => {
    const key = (v.word || '').toLowerCase().trim();
    if (!key || seen.has(key)) return;
    seen.set(key, true);
    const d = demoByWord.get(key);
    if (d) {
      const item = { ...v };
      if (item.isNewToday === undefined) item.isNewToday = d.isNewToday;
      if (item.isMistake === undefined) item.isMistake = d.isMistake;
      if (item.needsReview === undefined) item.needsReview = d.needsReview;
      if (item.correct === undefined && d.correct) item.correct = d.correct;
      merged.push(item);
    } else merged.push(v);
  });
  return merged;
}
// 词库快照网关：合并内置词库 → 统一打标 → 输出纯布尔驱动的词库
function buildWordSnapshot(vocabList, errorsList) {
  return stampDailyTags(mergeDemoVocab(vocabList), errorsList);
}
// 句型/表达条目打标：唯一 id + isTodayCore + 标准嵌套字段（targetSentence/replacedSentence/explanation）
// 碎片数组合并映射：better→targetSentence / original→replacedSentence / scene→explanation
function stampPatternTags(patterns) {
  return (patterns || []).map((p, index) => {
    const base = (p && typeof p === 'object') ? { ...p } : {};
    const better = base.better || base.targetSentence || (typeof p === 'string' ? p : '');
    const original = base.original || base.replacedSentence || '';
    return {
      ...base,
      id: base.id || `pat_${index}`,
      targetSentence: better || original || '',
      replacedSentence: original,
      explanation: base.explanation || base.scene || '',
      isTodayCore: base.isTodayCore !== undefined ? base.isTodayCore : (base.is_core === true)
    };
  });
}

// ═══ 渲染层计数（纯布尔读取，零时间判断、零兜底逻辑） ═══
// 顶部 SM-2 卡片数字 / 首页待办 / 复习页 tab=review 列表 —— 三处共用同一规则，绝不分叉
function countTodayWords(words) {
  return (words || []).filter(w => w.isNewToday === true).length;
}
function countMistakeWords(words, errors) {
  return (words || []).filter(w => w.isMistake === true).length;
}
function countReviewWords(words) {
  return (words || []).filter(w => w.needsReview === true).length;
}

function renderMetricsOverview(todayReport, vocab, errors, patterns, prog) {
  const grid = document.getElementById('home-metrics');
  if(!todayReport || !isDailyReport(todayReport)) {
    // Show mock data when no report — 数字全部动态计算，严禁硬编码
    const m = mockDashboardData.metrics;
    const words = (vocab || []); // 打标网关已在加载层合并内置词库，此处只读布尔标签
    const newWords = countTodayWords(words);
    const corrections = countMistakeWords(words, errors);
    const expressions = (patterns && patterns.length) ? patterns.length : mockSentences.length;
    grid.innerHTML = metricsHTML(m.overall, m.speakMin, m.totalMin, m.fluency, m.grammar, m.vocab, m.natural, m.topics, newWords, expressions, corrections);
    refreshIcons(grid);
    return;
  }
  const parsed = parseSmartReport(todayReport.content);
  const fluency = Math.min((parsed.summary.fluency||0) * 10, 100);
  const accuracy = Math.min((parsed.summary.accuracy||0) * 10, 100);
  const natural = Math.min((parsed.summary.naturalness||Math.round((parsed.summary.fluency||0)*0.8)) * 10, 100);
  const vocabScore = Math.min(parsed.vocabulary.length * 20, 100);
  const overall = Math.round((fluency+accuracy+natural+vocabScore)/4);
  const duration = parsed.meta.duration||(prog?.total_minutes||0);
  const speakTime = Math.round(duration*0.6);
  const topics = prog?.topics?.length||mockDashboardData.metrics.topics;
  const newWords = parsed.vocabulary.length;
  const expressions = parsed.patterns.length;
  const corrections = (parsed.grammar||[]).length+(parsed.pronunciation||[]).length;
  grid.innerHTML = metricsHTML(overall, speakTime, duration, fluency, accuracy, vocabScore, natural, topics, newWords, expressions, corrections);
  refreshIcons(grid);
}

function metricsHTML(overall, speakMin, totalMin, fluency, grammar, vocab, natural, topics, newWords, expressions, corrections) {
  return `
    <div class="flex items-center gap-5 mb-4">
      <div class="relative shrink-0 w-[88px] h-[88px]">${metricsDonut(overall)}</div>
      <div class="flex flex-col gap-0.5">
        <div class="text-xl font-bold text-[var(--c-text)] flex items-center gap-1">${icon('mic','w-[18px] h-[18px] text-[var(--c-primary)]')} ${speakMin||'--'}m / 共 ${totalMin||'--'}m</div>
        <div class="text-xs text-[var(--c-text-dim)]">开口时长 / 总时长</div>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-x-6 gap-y-4 mb-3.5">${[
      {l:'流利度',s:fluency,c:'var(--c-primary)'},
      {l:'语法',s:grammar,c:'var(--c-blue)'},
      {l:'词汇',s:vocab,c:'var(--c-green)'},
      {l:'自然度',s:natural,c:'var(--c-orange)'}
    ].map(b=>`
      <div class="flex flex-col">
        <div class="flex justify-between text-xs text-[var(--c-text-dim)] mb-1.5">
          <span class="font-medium">${b.l}</span><span>${b.s}/10</span>
        </div>
        <div class="w-full bg-[var(--c-border-light)] rounded-full h-1.5 overflow-hidden">
          <div class="h-1.5 rounded-full transition-all duration-[0.6s]" style="width:${(b.s/10)*100}%;background:${b.c}"></div>
        </div>
      </div>`).join('')}
    </div>
    <div class="flex gap-1.5 flex-wrap pt-3 border-t border-[var(--c-border-light)]">
      <div class="flex-1 min-w-[60px] text-center px-1.5 py-1.5 bg-[var(--c-bg)] rounded-lg text-[11px] text-[var(--c-text-dim)]"><strong class="flex items-center justify-center gap-0.5 text-[15px] text-[var(--c-text)] font-bold">${icon('message-circle','w-3.5 h-3.5')} ${topics}</strong>个话题</div>
      <div class="flex-1 min-w-[60px] text-center px-1.5 py-1.5 bg-[var(--c-bg)] rounded-lg text-[11px] text-[var(--c-text-dim)]"><strong class="flex items-center justify-center gap-0.5 text-[15px] text-[var(--c-text)] font-bold">${icon('pen-line','w-3.5 h-3.5')} ${newWords}</strong>个新词</div>
      <div class="flex-1 min-w-[60px] text-center px-1.5 py-1.5 bg-[var(--c-bg)] rounded-lg text-[11px] text-[var(--c-text-dim)]"><strong class="flex items-center justify-center gap-0.5 text-[15px] text-[var(--c-text)] font-bold">${icon('message-square-text','w-3.5 h-3.5')} ${expressions}</strong>个表达</div>
      <div class="flex-1 min-w-[60px] text-center px-1.5 py-1.5 bg-[var(--c-bg)] rounded-lg text-[11px] text-[var(--c-text-dim)]"><strong class="flex items-center justify-center gap-0.5 text-[15px] text-[var(--c-text)] font-bold">${icon('wrench','w-3.5 h-3.5')} ${corrections}</strong>项纠正</div>
    </div>`;
}

function metricsDonut(score) {
  const r=34,cx=44,cy=44,sw=8,circ=2*Math.PI*r,len=(score/100)*circ;
  const color=score>=70?'var(--c-green)':score>=40?'var(--c-orange)':'var(--c-red)';
  return `<svg viewBox="0 0 88 88" width="88" height="88"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--c-border-light)" stroke-width="${sw}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-dasharray="${len} ${circ-len}" stroke-dashoffset="0" transform="rotate(-90 44 44)" stroke-linecap="round"/></svg><div class="absolute inset-0 flex items-center justify-center text-[26px] font-extrabold text-[var(--c-text)]">${score}</div>`;
}

// ── 「今天需要提升」教练视角分类配置 ─────────────────────
// grammar（硬伤，红线纠正）/ expression（软性升级，灰句+高阶替换，绝不画删除线）/ structure（逻辑衔接）
const IMPROVE_TYPES = {
  grammar:    { badge: '⚠️ 语法纠错',   badgeCls: 'bg-red-50 text-[var(--c-red)]',   wrongCls: 'line-through text-[var(--c-red)]', rightCls: 'text-[var(--c-green)]', btn: '查看纠错' },
  expression: { badge: '💡 地道表达',   badgeCls: 'bg-amber-50 text-amber-600',      wrongCls: 'text-[var(--c-text-dim)]',        rightCls: 'text-[var(--c-blue)]',  btn: '跟读体验' },
  structure:  { badge: '🎯 逻辑与结构', badgeCls: 'bg-blue-50 text-[var(--c-blue)]', wrongCls: 'text-[var(--c-text-dim)]',        rightCls: 'text-[var(--c-blue)]',  btn: '专项跟读' }
};

// ── Section 4: Insights (Cards A-F) ─────────────────────
function renderInsightsSection(todayReport) {
  const container = document.getElementById('home-insights');
  // Merge real data with mock
  let d = JSON.parse(JSON.stringify(mockDashboardData.insights));
  _insightsParsed = null;
  if(todayReport && isDailyReport(todayReport)){
    const p = parseSmartReport(todayReport.content);
    _insightsParsed = p;
    if(p.meta.topic) d.topics = p.meta.topic.split(/[,，、]/).map(t=>t.trim()).filter(Boolean);
    if(p.summary.review||p.summary.thoughts) d.overallReview = [p.summary.review,p.summary.thoughts].filter(Boolean).join('\n\n');
    if(p.summary.strengths){ const lines = p.summary.strengths.split('\n').filter(Boolean).map(l=>l.replace(/^[-•*]\s*/,'')); if(lines.length) d.strengths = lines; }
    const allErr = [...(p.grammar||[]),...(p.pronunciation||[])];
    // 双维度打标：grammar = 硬性错误（红线纠正）；expression = 地道升级（语法没错，只替换不判错）
    const merged = [
      ...allErr.slice(0, 2).map(e => ({
        type: 'grammar', issue: e.type === 'pronunciation' ? '发音纠正' : '语法纠错',
        wrong: e.original || '', correct: e.correction || '', explanation: e.rule || '',
        detail: (e.original||'') + ' → ' + (e.correction||'') + (e.rule ? '（' + e.rule + '）' : ''),
        action: '查看纠错', tab: 'words', filter: 'mistakes', filterLabel: '高频错词'
      })),
      ...(p.patterns || []).filter(x => x.better).slice(0, 2).map(e => ({
        type: 'expression', issue: '地道表达',
        wrong: e.original || '', correct: e.better || '', explanation: e.scene || '',
        detail: (e.original||'') + ' → ' + (e.better||''),
        action: '专项跟读', tab: 'speak', filter: '', filterLabel: '地道表达',
        itemId: e.id || null // 模块二：句型唯一 id，供 /shadowing?id= 精准锚定
      }))
    ];
    if (merged.length) d.improvements = merged;
    if(p.summary.next_suggestions){ const steps = p.summary.next_suggestions.split('\n').filter(Boolean).map(l=>l.replace(/^[-•*\d]+[\.\、]\s*/,'')); if(steps.length) d.nextSteps = steps.slice(0,3).map(s=>({step:s,action:'去练习',tab:'speak'})); }
    // v6.0: derive executive summary fields from real report data
    if(allErr.length) {
      d.targetAreas = allErr.slice(0,3).map(e => ({
        category: detectErrorCategory(e.original, e.correction),
        label: e.rule || e.type || '表达纠正',
        keyword: (e.correction || '').slice(0, 20),
        count: 1,
        filterKey: 'mistakes',
        filterLabel: '高频错词',
        actionLabel: '去纠错'
      }));
    }
    if (d.strengths.length) {
      d.highlights = d.strengths.slice(0, 3).map(s => ({ text: s }));
    }
    if (p.summary.review) {
      d.executiveSummary = p.summary.review.slice(0, 100) + (p.summary.review.length > 100 ? '…' : '');
    }
  }
  const card = (delay,html) => `<div class="bg-[var(--c-surface)] rounded-2xl p-4 mb-2.5 border border-[var(--c-border-light)] opacity-0 animate-[fadeInUp_0.3s_ease-out_forwards]" style="animation-delay:${delay}s;box-shadow:var(--c-shadow-sm)">${html}</div>`;
  const cardBg = (delay,html) => `<div class="bg-[var(--c-bg)] rounded-2xl p-4 mb-2.5 border-l-[3px] border-l-[var(--c-primary)] opacity-0 animate-[fadeInUp_0.3s_ease-out_forwards]" style="animation-delay:${delay}s">${html}</div>`;

  _currentInsights = d;

  let html = '';
  // Card A: Topics
  html += card(0.03, `<div class="flex items-center gap-1.5 text-xs font-semibold text-[var(--c-text-dim)] mb-2.5">${icon('message-circle','w-3.5 h-3.5')} 今日对话主题</div><div class="flex gap-2 flex-wrap">${d.topics.map(t=>`<span class="px-3 py-1 bg-[var(--c-green-light)] text-[var(--c-green)] rounded-full text-xs font-medium">#${h(t)}</span>`).join('')}</div>`);
  // Card B: Thoughts
  html += card(0.06, `<div class="flex items-center gap-1.5 text-xs font-semibold text-[var(--c-text-dim)] mb-2.5">${icon('lightbulb','w-3.5 h-3.5')} 今日对话想法</div><div class="font-[Georgia,serif] text-[15px] italic text-[var(--c-text)] leading-[1.7] mb-2">"${h(d.thoughts.en)}"</div><div class="text-[13px] text-[var(--c-text-dim)]">${h(d.thoughts.zh)}</div>`);
  // Card C: Strengths
  html += card(0.09, `<div class="flex items-center gap-1.5 text-xs font-semibold text-[var(--c-text-dim)] mb-2.5">${icon('thumbs-up','w-3.5 h-3.5 text-emerald-500')} 今天做得好的地方</div>${d.strengths.map(s=>`<div class="flex items-start gap-2 text-[13px] text-[var(--c-text)] py-1.5">${icon('check-circle-2','w-4 h-4 text-emerald-500 shrink-0 mt-px')}<span>${h(s)}</span></div>`).join('')}`);
  // Card D: 进阶引导 — 一条 = 一卡，按 type 分流教练视角（硬伤红线 / 软性升级 / 逻辑结构）
  html += `<div class="flex items-center gap-1.5 text-xs font-semibold text-[var(--c-text-dim)] mb-2 px-1">${icon('alert-circle','w-3.5 h-3.5 text-amber-500')} 今天需要提升</div>`;
  html += d.improvements.map((im, i) => {
    // Legacy fallback: derive structured fields from detail string if new fields absent
    const parts = (im.detail || '').split(' → ');
    const wrong = im.wrong || parts[0] || '';
    const correct = im.correct || (parts.length > 1 ? parts.slice(1).join(' → ').replace(/^应为\s*/, '') : '');
    const explanation = im.explanation || (parts.length > 1 ? '' : parts[0] || '');
    const conf = IMPROVE_TYPES[im.type] || IMPROVE_TYPES.grammar;
    return card(0.12 + i * 0.02, `
      <div class="flex items-start justify-between gap-4 cursor-pointer" onclick="showImprovementDetail(${i})">
        <div class="flex flex-col gap-1.5 flex-1 min-w-0">
          <span class="inline-flex w-fit items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${conf.badgeCls}">${conf.badge}</span>
          ${wrong ? `<p class="text-sm ${conf.wrongCls}">${h(wrong)}</p>` : ''}
          ${correct ? `<p class="text-sm font-semibold ${conf.rightCls}">→ ${h(correct)}</p>` : ''}
          ${explanation ? `<p class="text-xs text-[var(--c-text-ultradim)] mt-1">${h(explanation)}</p>` : ''}
        </div>
        <button class="shrink-0 px-3 py-1.5 bg-[var(--c-bg)] hover:bg-[var(--c-border-light)] text-xs text-[var(--c-text-dim)] rounded-full flex items-center gap-1 transition-colors border-0 cursor-pointer mt-1" onclick="event.stopPropagation();showImprovementDetail(${i})">
          ${conf.btn} ${icon('arrow-right','w-3 h-3')}
        </button>
      </div>
    `);
  }).join('');
  // Card E: Next Steps — contextual action per suggestion
  html += card(0.15, `<div class="flex items-center gap-1.5 text-xs font-semibold text-[var(--c-text-dim)] mb-2.5">${icon('target','w-3.5 h-3.5 text-amber-500')} 下一次学习建议</div>${d.nextSteps.map((ns,i)=>`<div class="flex justify-between items-center py-2.5 border-b border-[var(--c-border-light)] gap-3 last:border-b-0 cursor-pointer active:bg-[var(--c-border-light)] -mx-4 px-4 transition-colors" onclick="showNextStepDetail(${i})"><div class="flex items-start gap-2.5 flex-1 min-w-0"><div class="w-[22px] h-[22px] rounded-full bg-[var(--c-primary-light)] text-[var(--c-primary)] text-xs font-bold flex items-center justify-center shrink-0">${i+1}</div><div class="text-[13px] text-[var(--c-text)] leading-[1.5] line-clamp-2">${h(ns.step)}</div></div><div class="shrink-0 inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-[var(--c-primary)] bg-[var(--c-primary-light)] border-0 rounded-2xl whitespace-nowrap transition-all duration-150">${h(ns.action)} ${icon('arrow-right','w-3 h-3')}</div></div>`).join('')}`);
  container.innerHTML = html;
  refreshIcons(container);
}

// Store current insights for detail popovers
let _currentInsights = null;
let _insightsParsed = null; // 当前日报 parseSmartReport 产物（学习建议锚定句型 / 私教任务 Prompt 用）

// ── Improvement detail: coach advice by type, not a blind error dump ──
function showImprovementDetail(idx) {
  const d = _currentInsights || mockDashboardData.insights;
  const im = d.improvements[idx];
  if (!im) return;
  // 教练视角：硬伤给纠错建议，软性升级给语感建议，绝不把地道表达当错误训斥
  const advice = {
    grammar:    '在下一次口语练习中，刻意注意此类错误。建议将正确表达抄写到单词本中反复朗读，形成肌肉记忆。',
    expression: '你这样说语法完全没错，只是不够地道。下次尝试替换成母语者的自然说法，并跟读 3 遍形成语感。',
    structure:  '长段表达时留意句子之间的逻辑衔接。练习用 however / therefore 等连接词，让层次更分明。'
  }[im.type] || '在下一次口语练习中，刻意注意此类错误。建议将正确表达抄写到单词本中反复朗读，形成肌肉记忆。';
  // 模块二：教练卡按钮精准锚定 — 语法纠错 → /review?tab=grammar；地道表达/逻辑结构 → /shadowing?id=对应句型
  const navArgs = im.type === 'grammar'
    ? `navigateReview('grammar')`
    : (im.itemId ? `navigateShadowing('${String(im.itemId).replace(/'/g, "\\'")}')` : `navigateShadowing()`);
  const btnLabel = im.type === 'grammar' ? '去复习页查看语法错题' : '去跟读页专项跟读';
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/40 z-[300] flex items-end justify-center';
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
  modal.innerHTML = `<div class="bg-[var(--c-surface)] rounded-t-[20px] w-full max-w-[480px] max-h-[70vh] flex flex-col overflow-hidden animate-[slideUp_0.25s_ease-out]">
    <div class="flex justify-between items-center px-5 py-4 border-b border-[var(--c-border-light)]">
      <div class="flex items-center gap-2 text-sm font-bold text-[var(--c-text)]">${icon('alert-circle','w-4 h-4 text-amber-500')} ${h(im.issue)}</div>
      <button class="w-7 h-7 rounded-full border-0 bg-[var(--c-bg)] text-[var(--c-text-dim)] text-base cursor-pointer flex items-center justify-center" onclick="this.closest('.fixed').remove()">✕</button>
    </div>
    <div class="px-5 py-4 overflow-y-auto">
      <div class="text-xs font-semibold text-[var(--c-text-ultradim)] mb-1.5">问题详情</div>
      <div class="text-sm text-[var(--c-text)] leading-relaxed mb-4 p-3 bg-[var(--c-bg)] rounded-xl">${hf(im.detail)}</div>
      <div class="text-xs font-semibold text-[var(--c-text-ultradim)] mb-1.5">教练建议</div>
      <div class="text-sm text-[var(--c-text-dim)] leading-relaxed mb-3">${advice}</div>
      <button class="w-full py-3 bg-[var(--c-primary)] text-white border-0 rounded-2xl text-sm font-bold cursor-pointer transition-all active:scale-[0.98]" onclick="${navArgs};this.closest('.fixed').remove()">${btnLabel} ${icon('arrow-right','w-3.5 h-3.5')}</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  refreshIcons(modal);
}

// ── 学习建议类型分流：sentence=句型练习(锚定跟读) / vocab=词汇(复习页) / coach=私教任务弹窗 ──
function classifySuggestion(step) {
  const s = step || '';
  if (/单词|词汇|生词/.test(s)) return 'vocab';
  if (/复述|听力|自由对话|对话|挑战/.test(s)) return 'coach';
  if (/句型|跟读|朗读|核心句/.test(s)) return 'sentence';
  // 兜底：建议文本包含当前日报某条核心句型原文 → 视作句型练习（可精准锚定）
  const pats = (_insightsParsed && _insightsParsed.sentence_patterns) || [];
  const hit = pats.some(p => {
    const t = String(p.pattern || p.targetSentence || '');
    return t.length > 6 && s.toLowerCase().includes(t.slice(0, 24).toLowerCase());
  });
  return hit ? 'sentence' : 'coach'; // 复述/听力/自由对话/话题挑战等一律进私教任务弹窗，绝不盲目跳跟读页
}

// ── Next-step detail: contextual action, not blind tab switch ──
function showNextStepDetail(idx) {
  const d = _currentInsights || mockDashboardData.insights;
  const ns = d.nextSteps[idx];
  if (!ns) return;
  const kind = classifySuggestion(ns.step);
  if (kind === 'sentence') {
    // 句型练习：从当前日报核心句型中匹配本条建议，携带唯一 id 精准锚定播放器
    const pats = (_insightsParsed && _insightsParsed.sentence_patterns) || [];
    const stepLower = ns.step.toLowerCase();
    const hit = pats.findIndex(p => {
      const t = String(p.pattern || p.targetSentence || '');
      return t.length > 6 && stepLower.includes(t.slice(0, 24).toLowerCase());
    });
    const anchor = hit >= 0 ? `navigateShadowing('core-${hit}')` : `navigateShadowing()`;
    showSuggestionModal(idx, ns.step,
      `${icon('mic','w-3.5 h-3.5 text-blue-500 inline-block mr-1')} 本条为句型练习任务，已为你定位到对应核心句型。`,
      `<button class="w-full py-3 bg-[var(--c-primary)] text-white border-0 rounded-2xl text-sm font-bold cursor-pointer transition-all active:scale-[0.98]" onclick="${anchor};this.closest('.fixed').remove()">去跟读页定位练习 ${icon('arrow-right','w-3.5 h-3.5')}</button>`
    );
    return;
  }
  if (kind === 'vocab') {
    showSuggestionModal(idx, ns.step,
      `${icon('book-open','w-3.5 h-3.5 text-blue-500 inline-block mr-1')} 本条为词汇任务，建议回复习页过一遍相关单词。`,
      `<button class="w-full py-3 bg-[var(--c-primary)] text-white border-0 rounded-2xl text-sm font-bold cursor-pointer transition-all active:scale-[0.98]" onclick="navigateReview('all');this.closest('.fixed').remove()">去复习页浏览词汇 ${icon('arrow-right','w-3.5 h-3.5')}</button>`
    );
    return;
  }
  // coach：复述听力/自由对话挑战 → 私教任务弹窗（练习指引 + 一键复制 ChatGPT Prompt），绝不跳跟读播放器
  const prompt = `你现在是我的英语口语私教。请带我完成下面的专项训练任务：

【任务】${ns.step}

请按以下步骤引导我：
1. 先用英文简单介绍这个任务的练习目标；
2. 给我一段相关主题的听力/阅读材料，让我先听/读一遍；
3. 请我用英语复述要点，实时指出我的语法、发音和用词问题并给出纠正；
4. 最后给我一个围绕同一主题的自由对话挑战，至少追问 3 个回合。`;
  showSuggestionModal(idx, ns.step,
    `${icon('lightbulb','w-3.5 h-3.5 text-amber-500 inline-block mr-1')} 这是私教任务，不是跟读练习。点击下方按钮复制对话 Prompt，到 ChatGPT 开启专项训练。`,
    `<div class="text-xs text-[var(--c-text-dim)] bg-[var(--c-bg)] p-3 rounded-xl mb-3 whitespace-pre-wrap max-h-32 overflow-y-auto">${h(prompt)}</div>
     <button class="w-full py-3 bg-[var(--c-primary)] text-white border-0 rounded-2xl text-sm font-bold cursor-pointer transition-all active:scale-[0.98]" onclick="copyText(\`${prompt.replace(/`/g, '\\`')}\`);this.closest('.fixed').remove()">📋 一键复制 ChatGPT Prompt</button>`
  );
}

function showSuggestionModal(idx, step, hint, actionHtml) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/40 z-[300] flex items-end justify-center';
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
  modal.innerHTML = `<div class="bg-[var(--c-surface)] rounded-t-[20px] w-full max-w-[480px] max-h-[70vh] flex flex-col overflow-hidden animate-[slideUp_0.25s_ease-out]">
    <div class="flex justify-between items-center px-5 py-4 border-b border-[var(--c-border-light)]">
      <div class="flex items-center gap-2 text-sm font-bold text-[var(--c-text)]">${icon('target','w-4 h-4 text-amber-500')} 学习建议 ${idx+1}</div>
      <button class="w-7 h-7 rounded-full border-0 bg-[var(--c-bg)] text-[var(--c-text-dim)] text-base cursor-pointer flex items-center justify-center" onclick="this.closest('.fixed').remove()">✕</button>
    </div>
    <div class="px-5 py-4 overflow-y-auto">
      <div class="text-sm text-[var(--c-text)] leading-relaxed mb-4 p-3 bg-[var(--c-primary-light)] rounded-xl">${h(step)}</div>
      <div class="text-xs text-[var(--c-text-dim)] leading-relaxed mb-4">${hint}</div>
      ${actionHtml}
    </div>
  </div>`;
  document.body.appendChild(modal);
  refreshIcons(modal);
}

// 剪贴板复制（Clipboard API 优先，execCommand 兜底）
async function copyText(txt) {
  try {
    await navigator.clipboard.writeText(txt);
    showToast('📋 已复制 Prompt，去 ChatGPT 粘贴开始练习');
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); showToast('📋 已复制 Prompt，去 ChatGPT 粘贴开始练习'); }
    catch (e2) { showToast('复制失败，请长按文本手动复制'); }
    ta.remove();
  }
}
function renderContentCards(todayReport, vocab, errors, patterns) {
  const container = document.getElementById('home-summary-cards');
  // 统一布尔数据源：内置词库已在打标网关合并，此处纯布尔读取
  const words = (vocab || []);
  const pats = (patterns && patterns.length) ? patterns : mockSentences;
  let newCount = countTodayWords(words);
  let coreCount = pats.filter(p => p.isTodayCore === true || p.is_core === true).length;
  if (!coreCount) coreCount = mockSentences.filter(s => s.isTodayCore === true).length || pats.length; // 无打标时以内置核心句型数为准
  let errCount = countMistakeWords(words, errors);

  // 真实日报存在时以解析数据为准
  if (todayReport && isDailyReport(todayReport)) {
    const p = parseSmartReport(todayReport.content);
    const allErr = [...(p.grammar||[]),...(p.pronunciation||[])];
    newCount = p.vocabulary.length;
    coreCount = (p.sentence_patterns||[]).length || coreCount;
    errCount = allErr.length;
  }

  // 红线1: 3 张卡片永驻 grid — 数据为 0 也强制渲染，绝不消失
  // 模块二：卡片按钮全部走规范路由（/review?tab=… · /shadowing），零死链
  const cards = [
    { icon:'pen-line', num:newCount,  label:'新学单词', btn:'复习今日单词', nav:`navigateReview('all', 'today')` },
    { icon:'ruler',    num:coreCount, label:'核心句型', btn:'练习句型',   nav:`navigateShadowing()` },
    { icon:'wrench',   num:errCount,  label:'重点纠错', btn:'查看纠错',   nav:`navigateReview('grammar')` }
  ];
  container.innerHTML = cards.map(c=>`
    <div class="bg-[var(--c-surface)] rounded-2xl px-2.5 py-3.5 text-center cursor-pointer transition-all duration-150 border border-[var(--c-border-light)] active:scale-[0.96] active:bg-[var(--c-border-light)]" style="box-shadow:var(--c-shadow-sm)" onclick="${c.nav}">
      <div class="flex justify-center mb-1">${icon(c.icon,'w-[22px] h-[22px] text-[var(--c-primary)]')}</div>
      <div class="text-[22px] font-extrabold text-[var(--c-primary)]">${c.num}</div>
      <div class="text-[11px] text-[var(--c-text-dim)] mt-0.5">${c.label}</div>
      <div class="inline-flex items-center gap-0.5 text-[11px] text-[var(--c-blue)] mt-1.5 font-medium">${c.btn} ${icon('arrow-right','w-3 h-3')}</div>
    </div>
  `).join('');
  refreshIcons(container);
}

function renderTodoList(todayReport, vocab, errors, reports, streak, reviewedToday) {
  let todos = JSON.parse(JSON.stringify(mockDashboardData.todos));
  // Merge real state
  const hasTodayReport = todayReport && isDailyReport(todayReport);
  // reviewedToday 由加载层计算传入（时间逻辑收敛于打标网关，渲染组件零 new Date()）
  // 与复习页 SM-2 卡片、tab=review 列表共用同一计数规则（纯布尔读取）
  const reviewSource = (_wordsAll && _wordsAll.length) ? _wordsAll : (vocab || []);
  const reviewCount = countReviewWords(reviewSource);
  todos = [
    {text:'导入今日日报',sub:hasTodayReport?'已完成':'把 ChatGPT 练习报告粘贴进来',done:hasTodayReport,action:hasTodayReport?null:()=>{showImportDialog();},tab:null},
    {text:`复习 ${reviewCount} 个单词`,sub:reviewedToday>=reviewCount?`已复习 ${reviewedToday} 个`:`今日进度: ${reviewedToday}/${reviewCount}`,done:reviewedToday>=reviewCount,action:()=>{navigateReview('due');},tab:'words'},
    {text:'完成一次口语练习',sub:hasTodayReport?'今天练习过了！':'打开 ChatGPT 开口说英语',done:hasTodayReport,action:hasTodayReport?null:()=>{navigateShadowing();},tab:'speak'}
  ];
  const done = todos.filter(q=>q.done).length;
  const container = document.getElementById('home-quests');
  container.innerHTML = `
    <div class="flex justify-between items-center mb-2"><span class="inline-flex items-center gap-1.5 text-[15px] font-bold text-[var(--c-text)]">${icon('list-todo','w-[18px] h-[18px]')} 今日待办</span><span class="text-[13px] text-[var(--c-primary)] font-semibold">${done}/3</span></div>
    <div class="h-1.5 bg-[var(--c-border-light)] rounded-full overflow-hidden mb-3"><div class="h-full bg-[var(--c-primary)] rounded-full transition-all duration-400" style="width:${(done/3)*100}%"></div></div>
    <div class="flex flex-col gap-1.5">${todos.map((q,i)=>`
      <div class="flex items-center gap-2.5 px-3.5 py-3 bg-[var(--c-bg)] rounded-lg cursor-pointer transition-all duration-200 border-l-[3px] ${q.done?'border-l-transparent opacity-55':'border-l-[var(--c-blue)]'} active:scale-[0.98]" data-todo-idx="${i}">
        <div class="shrink-0">${q.done?icon('check-circle','w-[22px] h-[22px] text-emerald-500'):icon('circle','w-[22px] h-[22px] text-[var(--c-border)]')}</div>
        <div class="flex-1 min-w-0">
          <div class="text-[13px] font-semibold text-[var(--c-text)] ${q.done?'line-through':''}">${q.text}</div>
          <div class="text-[11px] text-[var(--c-text-dim)]">${q.sub||''}</div>
        </div>
        ${q.action&&!q.done?icon('chevron-right','w-5 h-5 text-[var(--c-text-ultradim)] shrink-0'):''}
      </div>
    `).join('')}</div>`;
  refreshIcons(container);
  // Wire click handlers
  container.querySelectorAll('[data-todo-idx]').forEach(el=>{
    el.addEventListener('click',function(){
      const idx = parseInt(this.dataset.todoIdx);
      const q = todos[idx]; if(q&&q.action) q.action();
    });
  });
}

function isDailyReport(report) {
  if(!report||!report.content) return false;
  const c=report.content;
  // 兼容两种上游格式：传统 Markdown 日报 + 新版 JSON 日报
  return c.includes('type: daily-report')||c.includes('## 语法纠正')||c.includes('## 发音纠正')||c.includes('## 今日生词')||c.includes('## 表现总结')||c.includes('## 地道表达')
    || c.includes('"mistakes"')||c.includes('"coreSentences"')||c.includes('"newWords"');
}

// ── 无损数据迁移与清洗层 (Data Migration & Normalization) ──
// 任意历史日报（如 8.10 / 8.12）在渲染前必须经过本函数：
//   · sentences（跟读句型）与 mistakes（错题）老格式（字符串 / 数组元组 / 残缺对象）→ 结构校验补齐为对象
//   · 新格式 → 原样透传（spread 保留全部原始键，绝不删改、绝不丢弃任何历史数据）
// 幂等设计：对同一份数据重复清洗，结果不变。
function normalizeDailyData(rawDailyData) {
  if (!rawDailyData || typeof rawDailyData !== 'object') return rawDailyData;
  const d = { ...rawDailyData };

  // 1) 跟读句型清洗：sentences / coreSentences / sentence_patterns 三态统一
  const sentSrc = Array.isArray(d.sentences) ? d.sentences
    : Array.isArray(d.coreSentences) ? d.coreSentences
    : Array.isArray(d.sentence_patterns) ? d.sentence_patterns : null;
  if (sentSrc) {
    const cleaned = sentSrc.map((item, index) => {
      if (typeof item === 'string' && item.trim()) {
        return { id: `migrated_${index}`, targetSentence: item, replacedSentence: '', explanation: '历史导入内容', isTodayCore: true };
      }
      if (!item || typeof item !== 'object') {
        return { id: `migrated_${index}`, targetSentence: '有效跟读训练', replacedSentence: '', explanation: '历史导入内容', isTodayCore: true };
      }
      const target = item.targetSentence || item.pattern || item.text || '有效跟读训练';
      return {
        ...item,
        id: item.id || `migrated_${index}`,
        targetSentence: target,
        replacedSentence: item.replacedSentence || '',
        explanation: item.explanation || (typeof item.example === 'string' ? item.example : '') || '历史导入内容',
        isTodayCore: item.isTodayCore === undefined ? true : item.isTodayCore
      };
    });
    d.sentences = cleaned;
    if (Array.isArray(d.coreSentences)) d.coreSentences = cleaned;
    if (Array.isArray(d.sentence_patterns)) d.sentence_patterns = cleaned;
  }

  // 2) 错题清洗：mistakes 老格式 → {id,type,wrongSentence,correctSentence,explanation}
  //    同时补 original/improved 别名（桥接归一化层与纠错卡读取，保证一行不丢）
  if (Array.isArray(d.mistakes)) {
    d.mistakes = d.mistakes.map((item, index) => {
      let wrong = '', correct = '', extra = '';
      if (typeof item === 'string') {
        wrong = item;
      } else if (Array.isArray(item)) {
        wrong = item[0] || ''; correct = item[1] || ''; extra = item[2] || '';
      } else if (item && typeof item === 'object') {
        wrong = item.wrongSentence || item.wrong || '';
        correct = item.correctSentence || item.correct || '';
        extra = item.explanation || '';
      }
      wrong = wrong || '历史错题';
      const base = (item && typeof item === 'object' && !Array.isArray(item)) ? { ...item } : {};
      return {
        ...base,
        id: base.id || `mistake_${index}`,
        type: base.type || 'grammar',
        wrongSentence: wrong,
        correctSentence: correct,
        explanation: base.explanation || extra,
        original: base.original || wrong,
        improved: base.improved || correct
      };
    });
  }

  // 3) 内部管道兜底：grammar / patterns 结构校验 + 唯一 id + 标准嵌套字段（碎片数组合并映射）
  //    老 Markdown 解析产物同样无损适配；每一条数据生成唯一 id（路由锚定 / 卡片状态键）
  if (Array.isArray(d.grammar)) {
    d.grammar = d.grammar.map((g, index) => {
      const base = (g && typeof g === 'object') ? { ...g } : {};
      const original = base.original || ((g && typeof g === 'string') ? g : '历史错题');
      return { ...base, id: base.id || `err_${index}`, original, correction: base.correction || '', rule: base.rule || '' };
    });
  }
  if (Array.isArray(d.patterns)) {
    d.patterns = d.patterns.map((p, index) => {
      const base = (p && typeof p === 'object') ? { ...p } : {};
      const better = base.better || base.targetSentence || (typeof p === 'string' ? p : '');
      const original = base.original || base.replacedSentence || '历史表达';
      return {
        ...base,
        id: base.id || `pat_${index}`,
        original,
        better: better || '',
        scene: base.scene || '',
        // 标准嵌套对象（播放器/锚定统一契约）：better→targetSentence / original→replacedSentence / scene→explanation
        targetSentence: better || original,
        replacedSentence: original,
        explanation: base.explanation || base.scene || '',
        isTodayCore: base.isTodayCore !== undefined ? base.isTodayCore : (base.is_core === true)
      };
    });
  }
  return d;
}

// ── 应用初始化清洗：本地缓存中的遗留日报数据（若有）统一过清洗层 ──
function cleanLegacyLocalStorage() {
  const legacyKeys = ['voco-daily-cache', 'voco-reports', 'voco-speak-sentences', 'lingotrace-report'];
  legacyKeys.forEach(k => {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      localStorage.setItem(k, JSON.stringify(normalizeDailyData(parsed)));
    } catch (e) { /* 非法 JSON 保留原样，读取端已有兜底 */ }
  });
}

// ── 智能解析路由：新版 JSON 日报 → 归一化为内部结构；否则回退 Markdown 解析器 ──
// 所有链路（首页 / 历史日期切换 / 单词页 / 跟读页 / 导入预览）读到的数据
// 都先经 normalizeDailyData 无损清洗，再进入 UI 渲染。
function parseSmartReport(content) {
  const t = String(content || '').trim();
  if (t.startsWith('{')) {
    try {
      const j = JSON.parse(t);
      if (j && typeof j === 'object' && (j.mistakes || j.coreSentences || j.newWords)) {
        // ① 原始数据清洗：老格式字符串/残缺字段 → 结构补齐（无损，绝不丢行）
        const cleanedRaw = normalizeDailyData(j);
        // ② 归一化产物兜底清洗：UI 契约字段必有值
        const normalized = normalizeJsonReport(cleanedRaw, t);
        // ③ 评分无损透传：summary.fluency/accuracy/naturalness 归一化层不携带，原样补回（仪表盘指标用）
        const s = (cleanedRaw && typeof cleanedRaw.summary === 'object' && cleanedRaw.summary) || {};
        for (const k of ['fluency', 'accuracy', 'naturalness']) {
          if (typeof s[k] === 'number' && normalized.summary[k] === undefined) normalized.summary[k] = s[k];
        }
        return normalizeDailyData(normalized);
      }
    } catch (e) { /* 非法 JSON → 回退 Markdown 解析器 */ }
  }
  // ③ 传统 Markdown 解析产物同样过清洗层（原解析引擎 parser.js 不修改）
  return normalizeDailyData(parseReport(t));
}

// ── JSON 日报归一化 + 前端约定标签自动打标 ──────────────
// 上游 ChatGPT JSON → 内部 parsed 结构；在此处统一打上布尔标签：
//   newWords → isNewToday:true   coreSentences → isTodayCore:true   mistakes → type:grammar/expression
function normalizeJsonReport(j, raw) {
  const s = j.summary || {};
  const mistakes = Array.isArray(j.mistakes) ? j.mistakes : [];
  const core = Array.isArray(j.coreSentences) ? j.coreSentences : [];
  const words = Array.isArray(j.newWords) ? j.newWords : [];
  const grammar = [], patterns = [];
  for (const m of mistakes) {
    if (!m || !m.original) continue;
    if (m.type === 'expression') {
      // 软性升级 → patterns（地道表达），无删除线语义
      patterns.push({ original: m.original, better: m.improved || '', scene: m.explanation || '', type: 'expression' });
    } else {
      // 硬伤 → grammar
      grammar.push({ original: m.original, correction: m.improved || '', rule: m.explanation || '', type: 'grammar' });
    }
  }
  return {
    meta: { type: 'daily-report', topic: s.topic || '', date: new Date().toISOString().slice(0, 10) },
    grammar,
    pronunciation: [],
    patterns,
    sentence_patterns: core.filter(c => c && c.targetSentence).map(c => ({
      pattern: c.targetSentence,
      example: [c.replacedSentence, c.explanation].filter(Boolean).join(' — '),
      isTodayCore: true          // 自动打标：核心句型布尔过滤直接命中
    })),
    vocabulary: words.filter(w => w && w.word).map(w => ({
      word: w.word, phonetic: w.phonetic || '', meaning: w.meaning || '', example: w.example || '',
      isNewToday: true           // 自动打标：今日新词布尔过滤直接命中
    })),
    summary: {
      topic: s.topic || '',
      thoughts: s.thought || '',
      strengths: Array.isArray(s.strengths) ? s.strengths.join('\n') : '',
      next_suggestions: Array.isArray(s.nextSteps) ? s.nextSteps.join('\n') : ''
    },
    raw
  };
}

// ── Import Dialog (updated for Tailwind) ────────────────
function showImportDialog() {
  const dlg = document.getElementById('import-dialog');
  dlg.classList.remove('hidden');
  document.getElementById('dialog-report-input').value = '';
  document.getElementById('dialog-import-result').innerHTML = '';
}
function hideImportDialog() {
  document.getElementById('import-dialog').classList.add('hidden');
}

// ── 🔥 Streak calc ────────────────────────────────────
function calcStreak(dates) {
  if (!dates.length) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  const hasToday = dates.includes(today);
  const hasYesterday = dates.includes(yStr);
  if (!hasToday && !hasYesterday) return 0;
  let check = hasToday ? new Date(today) : yesterday;
  let streak = 0;
  while (true) {
    const s = check.toISOString().slice(0, 10);
    if (dates.includes(s)) { streak++; check.setDate(check.getDate() - 1); }
    else break;
  }
  return streak;
}

// ── Zone 3: Report Details (5 cards — learning-flow order) ──
function renderDetails(todayReport, vocab, errors, patterns, prog) {
  // [deprecated v4.0] replaced by 5-block dashboard (renderMetricsGrid + renderInsights + renderSummaryCards)
  return;
  const container = document.getElementById('home-detail-cards');
  if (!todayReport || !isDailyReport(todayReport)) { container.style.display = 'none'; return; }
  container.style.display = 'block';

  const parsed = parseSmartReport(todayReport.content);
  const topic = parsed.meta.topic || '';
  const duration = parsed.meta.duration || (prog?.total_minutes || 0);
  const strengths = parsed.summary.strengths || '';
  const thoughts = parsed.summary.thoughts || '';
  const review = parsed.summary.review || '';
  const nextSuggestions = parsed.summary.next_suggestions || '';
  const allErrors = [...(parsed.grammar || []), ...(parsed.pronunciation || [])];
  const sentencePatterns = parsed.sentence_patterns || [];

  // Error pattern summary
  const errPatterns = {};
  (errors || []).forEach(e => {
    (e.error_pattern || '其他').split(',').map(s => s.trim()).filter(Boolean).forEach(p => {
      errPatterns[p] = (errPatterns[p] || 0) + 1;
    });
  });
  const topPatterns = Object.entries(errPatterns).sort((a,b) => b[1]-a[1]).slice(0,3);

  const cards = [];

  // ── Card 1: 今日表现 (topic + strengths, no score repeat) ──
  const parts = [];
  if (topic) parts.push(`💬 ${h(topic)}${duration ? ' · ⏱️' + duration + '分钟' : ''}`);
  if (strengths) parts.push(h(strengths.length > 120 ? strengths.slice(0,120) + '…' : strengths));
  if (parts.length) {
    const isLong = parts.join('<br>').length > 100;
    cards.push(`<div class="detail-card${isLong ? ' has-arrow' : ''}" style="animation-delay:0.05s" id="card-performance">
      <div class="detail-card-title">🌟 今日表现</div>
      <div class="detail-card-text">${isLong ? '<span class="review-preview">' + parts.join('<br>').slice(0,100) + '…</span><span class="review-full" style="display:none">' + parts.join('<br>') + '</span>' : parts.join('<br>')}</div>
      ${isLong ? '<span class="detail-card-arrow">›</span>' : ''}
    </div>`);
  }

  // ── Card 2: 需要巩固 (errors first — biggest learning lever) ──
  if (allErrors.length > 0) {
    cards.push(`<div class="detail-card has-arrow" style="animation-delay:0.08s" id="card-improve">
      <div class="detail-card-title">📈 需要巩固 · ${allErrors.length} 项</div>
      <div class="detail-card-text">${allErrors.slice(0,3).map(e => '• ' + h(e.original) + ' → ' + h(e.correction) + (e.rule ? ' (' + h(e.rule) + ')' : '')).join('<br>')}${allErrors.length > 3 ? '<br>…等' : ''}</div>
      <span class="detail-card-action" onclick="event.stopPropagation();document.querySelector('.tab[data-tab=words]').click()">去复习 ›</span>
    </div>`);
  }

  // ── Card 3: 新学内容汇总 (4 sub-cards, clickable) ──
  const subItems = [
    { label: '新增单词', num: parsed.vocabulary.length, icon: '📝', tab: 'words' },
    { label: '地道表达', num: parsed.patterns.length, icon: '🗣️', tab: 'speak' },
    { label: '核心句型', num: sentencePatterns.length, icon: '📐', tab: 'speak' },
    { label: '重点纠错', num: allErrors.length, icon: '🔧', tab: 'words' },
  ].filter(s => s.num > 0);

  if (subItems.length > 0) {
    const subCardsHTML = subItems.map(s => `
      <div class="detail-sub-card" onclick="event.stopPropagation();showDetailModal('${s.label}', ${s.num}, '${s.tab}')">
        <div class="detail-sub-card-num">${s.num}</div>
        <div class="detail-sub-card-label">${s.icon} ${s.label}</div>
        <div class="detail-sub-card-arrow">查看 →</div>
      </div>
    `).join('');

    cards.push(`<div class="detail-card" style="animation-delay:0.12s">
      <div class="detail-card-title">📊 新学内容汇总</div>
      <div class="detail-sub-cards">${subCardsHTML}</div>
    </div>`);
  }

  // ── Card 4: 复盘 & 建议 (review + thoughts + next, merged) ──
  const reflectionParts = [];
  if (review) reflectionParts.push(review);
  if (thoughts) reflectionParts.push(thoughts);
  const reflectionText = reflectionParts.join('\n\n');
  const hasNext = !!nextSuggestions;

  if (reflectionText || hasNext) {
    const displayText = reflectionText || nextSuggestions;
    const isLong = displayText.length > 100;
    cards.push(`<div class="detail-card${isLong ? ' has-arrow' : ''}" style="animation-delay:0.16s" id="card-reflection">
      <div class="detail-card-title">🧠 复盘 & 下次建议</div>
      <div class="detail-card-text">${isLong ? '<span class="review-preview">' + h(displayText.slice(0,100)) + '…</span><span class="review-full" style="display:none">' + h(displayText) + '</span>' : h(displayText)}</div>
      ${hasNext ? '<span class="detail-card-action" onclick="event.stopPropagation();document.querySelector(\'.tab[data-tab=me]\').click()">去练习 ›</span>' : ''}
      ${isLong ? '<span class="detail-card-arrow">›</span>' : ''}
    </div>`);
  }

  // ── Card 5: 错误模式分析 ──
  if (topPatterns.length > 0) {
    cards.push(`<div class="detail-card has-arrow" style="animation-delay:0.20s" onclick="document.querySelector('.tab[data-tab=me]').click();setTimeout(()=>document.getElementById('error-patterns-group').scrollIntoView({behavior:'smooth'}),200)">
      <div class="detail-card-title">🔍 错误模式分析</div>
      <div class="detail-card-text">${topPatterns.map(([name, count]) => '• ' + name + ' ' + count + '次').join('<br>')}</div>
      <span class="detail-card-arrow">›</span>
    </div>`);
  }

  container.innerHTML = cards.join('');

  // Wire up expand/collapse for long text cards
  ['card-performance', 'card-reflection'].forEach(id => {
    const card = document.getElementById(id);
    if (!card) return;
    const preview = card.querySelector('.review-preview');
    const full = card.querySelector('.review-full');
    const arrow = card.querySelector('.detail-card-arrow');
    if (!preview || !full) return;
    card.addEventListener('click', function() {
      if (preview.style.display !== 'none') {
        preview.style.display = 'none';
        full.style.display = 'block';
        if (arrow) arrow.textContent = '⌃';
      } else {
        preview.style.display = 'block';
        full.style.display = 'none';
        if (arrow) arrow.textContent = '›';
      }
    });
  });
}

// ── Detail Modal [deprecated v4.0] ──
let _detailModalData = null; // [deprecated v4.0]
function showDetailModal(label, count, tab) {
  // [deprecated v4.0] detail modal system replaced by 5-block dashboard + tab navigation
  return;
  const container = document.getElementById('home-detail-cards');
  const reportEl = container?.previousElementSibling;
  // Re-fetch parsed from today's report
  const cards = document.getElementById('home-detail-cards');
  if (!cards) return;
  // Get data from the report already loaded
  const { data: { session } } = sb.auth.getSession();
  if (!session) return;
  sb.from('reports').select('*').order('date', { ascending: false }).limit(1).then(({ data: reports }) => {
    const today = new Date().toISOString().slice(0, 10);
    const report = (reports || []).find(r => r.date === today);
    if (!report) return;
    const parsed = parseSmartReport(report.content);
    let items = [];
    if (label === '新增单词') items = parsed.vocabulary;
    else if (label === '地道表达') items = parsed.patterns;
    else if (label === '核心句型') items = parsed.sentence_patterns || [];
    else if (label === '重点纠错') items = [...(parsed.grammar || []), ...(parsed.pronunciation || [])];

    let html = '';
    if (label === '新增单词') {
      html = items.map(v => `<div class="dm-item"><strong>${h(v.word)}</strong> ${h(v.phonetic||'')}<br><span class="text-dim">${h(v.meaning||'')}${v.example ? ' · 💬 ' + h(v.example) : ''}</span></div>`).join('');
    } else if (label === '地道表达') {
      html = items.map(p => `<div class="dm-item"><strong>${h(p.better)}</strong><br><span class="text-dim">代替: ${h(p.original||'')}${p.scene ? ' · 🎬 ' + h(p.scene) : ''}</span></div>`).join('');
    } else if (label === '核心句型') {
      html = items.map(p => `<div class="dm-item"><strong>${h(p.pattern || p.targetSentence || p.text || '')}</strong>${(p.example || p.explanation) ? '<br><span class="text-dim">💬 ' + h(p.example || p.explanation) + '</span>' : ''}</div>`).join('');
    } else if (label === '重点纠错') {
      html = items.map(e => `<div class="dm-item"><span class="text-red">✗</span> ${h(e.original||'')}<br><span class="text-green">✓</span> ${h(e.correction||'')}${e.rule ? ' <span class="text-ultradim">(' + h(e.rule) + ')</span>' : ''}</div>`).join('');
    }

    if (!items.length) { showToast('暂无数据'); return; }

    const overlay = document.createElement('div');
    overlay.className = 'detail-modal-overlay';
    overlay.innerHTML = `<div class="detail-modal">
      <div class="detail-modal-header">
        <span>${label} · ${count} 项</span>
        <button class="detail-modal-close">✕</button>
      </div>
      <div class="detail-modal-body">${html}</div>
      <div class="detail-modal-footer">
        <button class="btn-primary detail-modal-goto">去${tab === 'words' ? '单词' : '口语'}页查看 ›</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('.detail-modal-close').onclick = () => overlay.remove();
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('.detail-modal-goto').onclick = () => {
      overlay.remove();
      document.querySelector(`.tab[data-tab=${tab}]`).click();
    };
  }).catch(() => showToast('加载失败'));
}

// ═══════════════════════════════════════════════════════
// TAB 2: WORDS
// ═══════════════════════════════════════════════════════
async function loadWords() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const today = new Date().toISOString().slice(0, 10);

  document.getElementById('words-content').innerHTML = LoadingState();

  const [{ data: vocab }, { data: errors }, { data: reports }] = await Promise.all([
    sb.from('vocabulary').select('*').order('created_at', { ascending: false }),
    sb.from('errors').select('*'),
    sb.from('reports').select('*').order('date', { ascending: false }).limit(90)
  ]);
  // 真实解析数据源：当前日报（今天 → 历史视图日期 → 最新有效），parseSmartReport 原样输出，只消费不修改
  const todayReport = resolveActiveReport(reports);
  _reportParsed = todayReport ? parseSmartReport(todayReport.content) : null;

  // 打标网关：内置词库合并 + 布尔标签一次性注入（渲染层只读布尔值，零时间判断）
  _errorsAll = (errors && errors.length) ? errors : mockMistakeErrors;
  _wordsAll = buildWordSnapshot(vocab, _errorsAll);

  // URL 是唯一事实源：/review?tab=all|grammar|due（规范三 Tab；兼容旧 new|mistakes|review 参数）+ filter=today 过滤态
  const params = new URLSearchParams(window.location.search);
  const activeTab = params.get('tab') || 'all';
  let mode = ['new', 'mistakes', 'review', 'grammar', 'due'].includes(activeTab) ? activeTab : 'all';
  if (params.get('filter') === 'today') mode = 'today';
  if (mode === 'all') {
    // 兼容旧参数 wordsView/view 与历史键名（today→new / errors→mistakes）
    const legacy = (params.get('wordsView') || params.get('view') || '').toLowerCase();
    if (legacy === 'today' || legacy === 'today_new' || legacy === 'new') mode = 'new';
    else if (legacy === 'errors' || legacy === 'mistakes') mode = 'mistakes';
    else if (legacy === 'review') mode = 'review';
  }
  // 模块三：旧视图参数归一为规范三 Tab（new→all / mistakes→grammar / review→due），绝不渲染第 4 个 Tab
  if (mode === 'new') { mode = 'all'; }
  else if (mode === 'mistakes') { mode = 'grammar'; }
  else if (mode === 'review') { mode = 'due'; }
  _wordsFilter = mode;
  renderWordsSubTabs(mode);
  renderWordsList(mode);
}

// ── Words list ─────────────────────────────────────────
let _wordsAll = [];
let _errorsAll = [];
let _wordsFilter = 'all';
let _reportParsed = null; // 当日日报的 parseSmartReport() 结果（只读消费，不修改解析逻辑）
// 模块三：待复习混合记忆引擎状态（needsReview 单词 + 语法错题统一卡组流式打卡）
let _dueDeck = [];
let _dueIdx = 0;
let _dueRevealed = false;
let _dueResults = { remembered: 0, forgot: 0 };
const _reviewedErrorIds = new Set(); // 本会话已通过的错题 id（🟢记住了 后从混合卡组移除，不重复打卡）

// ── 真实纠错数据源：日报解析 grammar + pronunciation ───
// 真实字段：item.original（错句）/ item.correction（正句）/ item.rule（规则）
function realReportErrors() {
  if (!_reportParsed) return [];
  const g = (_reportParsed.grammar || []).map(e => Object.assign({ issue: '语法纠正' }, e));
  const p = (_reportParsed.pronunciation || []).map(e => Object.assign({ issue: '发音纠正' }, e));
  return [...g, ...p].filter(e => e && (e.original || e.correction));
}

// ── 模块三：语法错题单一数据源（日报解析优先 → 错题表 → isMistake 词兜底）──
// 统一输出形状 {id, issue, original, correction, rule, type}，供 tab=grammar 卡片流与待复习混合卡组共用
function allGrammarErrors() {
  const real = realReportErrors();
  if (real.length) return standardizeErrorCards(real);
  const errRows = (_errorsAll || []).map((e, i) => ({
    id: e.id || ('errrow-' + i),
    issue: e.type === 'expression' ? '地道表达' : '语法纠错',
    original: e.original || e.wrongSentence || '',
    correction: e.correction || e.correctSentence || '',
    rule: e.rule || e.explanation || ''
  })).filter(e => e.original || e.correction);
  if (errRows.length) return standardizeErrorCards(errRows);
  return standardizeErrorCards(_wordsAll.filter(v => v.isMistake === true).map(v => ({
    id: 'verr-' + v.id,
    issue: '易错词',
    original: v.example || v.word,
    correction: v.correct || '',
    rule: v.meaning || ''
  })));
}

// ── 错题标准化清洗层：任何数据源在进入渲染前收敛为 {id, issue, original, correction, rule, type} ──
// ① 碎片合并：以 →/-/（ 开头且无独立正句的条目 = 上一条记录的前后文延续，并入上一条 —— 一条记录绝不拆成两张卡
// ② 形状归一：字符串/元组/残缺对象 → 标准六字段；original/correction 为数组时合并为单字符串
// ③ 分类提取：type 缺失时按内容动态推断（发音纠偏/时态语态/冠词使用/逻辑衔接/地道表达/其他）
function standardizeErrorCards(rawItems) {
  const std = [];
  for (const raw of rawItems || []) {
    if (!raw) continue;
    let o = '', c = '', r = '', t = '', id = null, issue = '';
    if (typeof raw === 'string') { o = raw; }
    else if (Array.isArray(raw)) { o = raw[0] || ''; c = raw[1] || ''; r = raw[2] || ''; }
    else {
      o = raw.original || raw.wrongSentence || raw.wrong || '';
      c = raw.correction || raw.correctSentence || raw.correct || raw.improved || '';
      r = raw.rule || raw.explanation || '';
      t = raw.type || '';
      id = raw.id || null;
      issue = raw.issue || '';
    }
    if (Array.isArray(o)) o = o.join(' ');
    if (Array.isArray(c)) c = c.join(' ');
    o = String(o || '').replace(/\s*\n\s*/g, ' ').trim();
    c = String(c || '').replace(/\s*\n\s*/g, ' ').trim();
    r = String(r || '').trim();
    if (!o && !c) continue;
    if (!t) t = classifyErrorType(o, c, r);
    const autoIssue = t === '地道表达' ? '地道表达' : (t === '发音纠偏' ? '发音纠正' : '语法纠错');
    std.push({ id, original: o, correction: c, rule: r, type: t, issue: issue || autoIssue });
  }
  const merged = [];
  for (const item of std) {
    const isFrag = /^[→➡️\-—–（(]/.test(item.original) && !item.correction;
    if (isFrag && merged.length) {
      const prev = merged[merged.length - 1];
      prev.original = [prev.original, item.original].filter(Boolean).join(' ');
    } else {
      merged.push(item);
    }
  }
  return merged.map((m, i) => ({ ...m, id: m.id || `err_${i}` }));
}

// ── 模块三：复习页严格三 Tab（全部词汇 / 语法错题 / 待复习）────────────────
// 待复习计数 = 到期单词（needsReview 布尔）+ 语法错题 —— 与混合卡组队列完全同源
function renderWordsSubTabs(activeMode) {
  const el = document.getElementById('words-subtabs');
  el.style.display = 'flex';
  const grammarCount = allGrammarErrors().length;
  const dueCount = countReviewWords(_wordsAll) + grammarCount;
  const tabs = [
    { key: 'all', label: '全部词汇', count: _wordsAll.length },
    { key: 'grammar', label: '语法错题', count: grammarCount },
    { key: 'due', label: '待复习', count: dueCount },
  ];
  el.innerHTML = tabs.map(t =>
    `<span class="lib-subtab${t.key===activeMode?' active':''}" data-words-filter="${t.key}" onclick="switchWordsView('${t.key}')">${t.label}<small style="opacity:0.6;margin-left:3px">${t.count}</small></span>`
  ).join('');
}

function switchWordsView(mode) {
  _wordsFilter = mode;
  // 模块二：单词页内部视图写入规范路由 /review?tab=…（绝不写入 _activeFilter）
  window.history.replaceState({}, '', mode === 'all' ? '/review' : `/review?tab=${mode}`);
  renderWordsSubTabs(mode);
  renderWordsList(mode);
}

// ── 模块三：三 Tab 严格渲染隔离 ─────────────────────────────────
// all=仅全量词汇卡 / grammar=仅语法错题卡（删除线原句+绿色正句） / due=混合记忆卡组（Active Recall）
function renderWordsList(mode) {
  if (mode === 'grammar' || mode === 'mistakes') { renderErrorCards(allGrammarErrors()); return; }
  if (mode === 'due' || mode === 'review') { renderDueDeck(); return; }
  // filter=today：今日单词过滤态（isNewToday 纯布尔），不污染三 Tab 渲染
  if (mode === 'today') { renderVocabList(getFilteredVocab(_wordsAll, 'today')); return; }
  renderVocabList(getFilteredVocab(_wordsAll, 'all'));
}

// 一条纠错 = 一张卡片（单外层容器铁律）：顶部标签 → 遮罩正面（删除线原句）→ 中央 [👁️] 揭示按钮
// → 遮罩背面（正确表达 + 解析 + 🔴/🟢 双反馈按钮）。Active Recall 双阶段：未展开绝不显示纠正与规则。
function renderErrorCards(items) {
  const container = document.getElementById('words-content');
  if (!items.length) {
    container.innerHTML = EmptyState({ message: '没有语法错题，继续保持！', size: 80 });
    return;
  }
  container.innerHTML = items.map((e, i) => `
    <div class="err-card bg-[var(--c-surface)] rounded-2xl p-4 mb-3 border border-[var(--c-border-light)] transition-all duration-300" style="box-shadow:var(--c-shadow-sm)">
      <div class="flex justify-between items-center mb-2">
        <span class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700">⚠️ ${h(e.issue || '语法纠错')}</span>
      </div>
      <div class="text-sm text-[var(--c-red)] line-through mb-2">${h(e.original)}</div>
      <button class="btn-reveal w-full py-2 bg-[var(--c-bg)] hover:bg-[var(--c-border-light)] border-0 text-[var(--c-text-dim)] text-xs rounded-xl cursor-pointer transition-colors">👁️ 点击查看纠正与解析</button>
      <div class="revealed-content hidden">
        <div class="text-sm font-semibold text-[var(--c-green)] mb-1">${h(e.correction || '—')}</div>
        ${e.rule ? `<div class="text-xs text-[var(--c-text-dim)] bg-[var(--c-bg)] p-2 rounded-lg mb-3">${h(e.rule)}</div>` : ''}
        <div class="flex justify-end gap-2 pt-2 border-t border-[var(--c-border-light)]">
          <button class="btn-again px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg border-0 cursor-pointer">🔴 没记住</button>
          <button class="btn-good px-3 py-1.5 text-xs bg-emerald-50 text-emerald-600 rounded-lg border-0 cursor-pointer">🟢 记住了</button>
        </div>
      </div>
    </div>
  `).join('');
  // 双阶段交互接线：揭示 → 展开背面；🔴 → 收起遮罩复位；🟢 → 会话去重 + 平滑收起
  container.querySelectorAll('.err-card').forEach((card, idx) => {
    const item = items[idx];
    const reveal = card.querySelector('.btn-reveal');
    const back = card.querySelector('.revealed-content');
    reveal.addEventListener('click', () => { reveal.classList.add('hidden'); back.classList.remove('hidden'); });
    card.querySelector('.btn-again').addEventListener('click', () => {
      back.classList.add('hidden'); reveal.classList.remove('hidden');
    });
    card.querySelector('.btn-good').addEventListener('click', () => {
      if (item && item.id) _reviewedErrorIds.add(String(item.id));
      card.style.opacity = '0';
      card.style.transform = 'translateY(-8px)';
      showToast('🟢 已记住这条纠错');
      setTimeout(() => { card.remove(); if (!container.querySelector('.err-card')) container.innerHTML = EmptyState({ message: '没有语法错题，继续保持！', size: 80 }); }, 250);
    });
  });
  refreshIcons(container);
}

// ── 模块三：待复习混合记忆引擎（Active Recall + SM-2 双阶段交互）──────────
// 队列 = needsReview===true 的单词 + 语法错题，统一卡组流式打卡；
// 正面遮罩（词卡仅英文+音标 / 错题仅错误句）→ [👁️ 点击显示答案] → 背面完整解析 + 双反馈按钮
function buildDueDeck() {
  const words = _wordsAll.filter(v => v.needsReview === true)
    .sort((a, b) => (a.next_review_date || '0000') < (b.next_review_date || '0000') ? -1 : 1)
    .map(v => ({ kind: 'word', id: 'w-' + v.id, word: v.word, phonetic: v.phonetic || '', meaning: v.meaning || '', example: v.example || '', ref: v }));
  const errs = allGrammarErrors()
    .filter(e => e && e.id && !_reviewedErrorIds.has(String(e.id)))
    .map(e => ({ kind: 'error', id: e.id, error: e }));
  return [...words, ...errs];
}

// 纯逻辑：SM-2 反馈映射（🔴没记住 quality=0 / 🟢记住了 quality=3）—— UI 与测试共用
function applyDueRating(item, rating) {
  const quality = rating === 'again' ? 0 : 3;
  if (item.kind === 'word') {
    const v = item.ref;
    const result = sm2(v.ease_factor, v.sm2_interval, v.sm2_repetitions, quality);
    const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + result.interval);
    const status = rating === 'again' ? 'learning' : (result.repetitions >= 5 ? 'mastered' : 'learning');
    return { quality, sm2: result, next_review_date: nextDate.toISOString().slice(0, 10), status, mastered: status === 'mastered' };
  }
  return { quality };
}

// 纯逻辑：卡组流转（🔴没记住→移回队尾继续循环；🟢记住了→移出队列；清空返回 -1）
function flowDueDeck(rating) {
  if (rating === 'again') {
    if (_dueDeck.length > 1) { const cur = _dueDeck.splice(_dueIdx, 1)[0]; _dueDeck.push(cur); }
    return _dueIdx;
  }
  _dueDeck.splice(_dueIdx, 1);
  if (_dueDeck.length === 0) return -1;
  _dueIdx = _dueIdx % _dueDeck.length;
  return _dueIdx;
}

function renderDueDeck() {
  _dueDeck = buildDueDeck();
  _dueIdx = 0;
  _dueRevealed = false;
  _dueResults = { remembered: 0, forgot: 0 };
  const container = document.getElementById('words-content');
  if (!_dueDeck.length) {
    container.innerHTML = EmptyState({ message: '🎉 没有待复习的内容，太棒了！', size: 80 });
    return;
  }
  container.innerHTML = `
    <div class="flex items-center gap-2 mb-3">
      <span id="due-progress-text" class="text-xs font-semibold text-[var(--c-text-ultradim)] shrink-0">待复习 1/${_dueDeck.length}</span>
      <div class="flex-1 h-1.5 bg-[var(--c-border-light)] rounded-full overflow-hidden"><div id="due-progress-fill" class="h-full bg-[var(--c-primary)] rounded-full transition-all duration-300" style="width:${(1 / _dueDeck.length) * 100}%"></div></div>
    </div>
    <div id="due-card"></div>`;
  showDueCard();
}

// 未展开（正面）：词卡仅英文+音标（遮挡中文释义与例句）；错题卡仅错误句（遮挡纠正与规则）
// 中央统一 [👁️ 点击显示答案]；展开后（背面）底部切换 [🔴 没记住] [🟢 记住了]
function showDueCard() {
  const item = _dueDeck[_dueIdx];
  if (!item) return;
  _dueRevealed = false;
  const front = item.kind === 'word'
    ? `<div class="text-[22px] font-bold text-[var(--c-text)]">${h(item.word)}</div>${item.phonetic ? `<div class="text-sm text-[var(--c-primary)] mt-1">${h(item.phonetic)}</div>` : ''}`
    : `<span class="inline-flex w-fit items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-red-50 text-[var(--c-red)] mb-2">⚠️ ${h(item.error.issue || '语法纠错')}</span><div class="text-[16px] text-[var(--c-text)] leading-relaxed">${h(item.error.original)}</div>`;
  document.getElementById('due-card').innerHTML = `
    <div id="due-card-body" class="bg-[var(--c-surface)] rounded-2xl p-6 border border-[var(--c-border-light)] text-center transition-all duration-300" style="box-shadow:var(--c-shadow-sm)">
      ${front}
      <div id="due-answer-area"></div>
      <button id="due-reveal-btn" class="w-full mt-5 py-3 bg-[var(--c-bg)] hover:bg-[var(--c-border-light)] border-0 rounded-2xl text-sm font-semibold text-[var(--c-primary)] cursor-pointer transition-all">👁️ 点击显示答案</button>
      <div id="due-feedback" class="hidden"></div>
    </div>`;
  document.getElementById('due-reveal-btn').addEventListener('click', revealDueAnswer);
  document.getElementById('due-progress-text').textContent = `待复习 ${_dueIdx + 1}/${_dueDeck.length}`;
  document.getElementById('due-progress-fill').style.width = `${((_dueIdx + 1) / _dueDeck.length) * 100}%`;
}

function revealDueAnswer() {
  _dueRevealed = true;
  const item = _dueDeck[_dueIdx];
  document.getElementById('due-reveal-btn').remove();
  const ansArea = document.getElementById('due-answer-area');
  if (item.kind === 'word') {
    ansArea.innerHTML = `<div class="text-sm text-[var(--c-text-dim)] mt-4 pt-4 border-t border-[var(--c-border-light)]">${h(item.meaning || '（暂无释义）')}</div>${item.example ? `<div class="text-xs text-[var(--c-text-dim)] italic mt-2 p-2.5 bg-[var(--c-bg)] rounded-lg text-left">💬 ${h(item.example)}</div>` : ''}`;
  } else {
    const e = item.error;
    ansArea.innerHTML = `${e.correction ? `<div class="text-[16px] font-semibold text-[var(--c-green)] mt-4 pt-4 border-t border-[var(--c-border-light)] text-left">→ ${h(e.correction)}</div>` : ''}${e.rule ? `<div class="text-xs text-[var(--c-text-ultradim)] text-left mt-2 p-2.5 bg-[var(--c-bg)] rounded-lg">📖 ${h(e.rule)}</div>` : ''}`;
  }
  const fb = document.getElementById('due-feedback');
  fb.className = 'mt-5 flex items-center justify-center gap-3';
  fb.innerHTML = `
    <button id="due-forgot" class="flex-1 py-3 bg-red-50 hover:bg-red-100 border-0 rounded-2xl text-sm font-bold text-[var(--c-red)] cursor-pointer transition-all">🔴 没记住</button>
    <button id="due-remembered" class="flex-1 py-3 bg-green-50 hover:bg-green-100 border-0 rounded-2xl text-sm font-bold text-[var(--c-green)] cursor-pointer transition-all">🟢 记住了</button>`;
  document.getElementById('due-forgot').addEventListener('click', () => rateDueCard('again'));
  document.getElementById('due-remembered').addEventListener('click', () => rateDueCard('good'));
}

async function rateDueCard(rating) {
  const item = _dueDeck[_dueIdx];
  if (!item || !_dueRevealed) return;
  const r = applyDueRating(item, rating);
  if (item.kind === 'word') {
    const v = item.ref;
    // 本地快照即时同步：熟练度星级随 review_count 推进（圆点填充），到期时间随 SM-2 推进
    v.review_count = (v.review_count || 0) + 1;
    v.ease_factor = r.sm2.ease_factor; v.sm2_interval = r.sm2.interval; v.sm2_repetitions = r.sm2.repetitions;
    v.status = r.status; v.mastered = r.mastered;
    v.next_review_date = r.next_review_date; v.last_reviewed_at = new Date().toISOString();
    if (rating === 'good') v.needsReview = false; // 🟢记住了：移出待复习队列（下次到期再回来）
    // 云端词库回写（演示词无数据库行时静默降级为本地会话态，绝不报错打扰）
    try {
      const { data: row, error } = await sb.from('vocabulary').select('*').eq('id', v.id).single();
      if (!error && row) {
        await sb.from('vocabulary').update({
          status: r.status, mastered: r.mastered,
          ease_factor: r.sm2.ease_factor, sm2_interval: r.sm2.interval, sm2_repetitions: r.sm2.repetitions,
          review_count: v.review_count, next_review_date: r.next_review_date, last_reviewed_at: new Date().toISOString()
        }).eq('id', v.id);
      }
    } catch (e) { /* 演示数据：仅本地会话态 */ }
  } else if (rating === 'good') {
    _reviewedErrorIds.add(String(item.id)); // 错题🟢记住：本会话不再重复打卡
  }
  _dueResults[rating === 'good' ? 'remembered' : 'forgot'] += 1;
  if (rating === 'again') {
    flowDueDeck('again'); // 🔴 没记住：保留在当前待复习队列（移回队尾继续循环）
    showDueCard();
    return;
  }
  const body = document.getElementById('due-card-body');
  if (body) { body.style.opacity = '0'; body.style.transform = 'translateY(-8px)'; }
  setTimeout(() => {
    const next = flowDueDeck('good'); // 🟢 记住了：平滑过渡收起后移除当前卡片
    if (next === -1) endDueReview();
    else showDueCard();
  }, 250);
}

function endDueReview() {
  const container = document.getElementById('words-content');
  container.innerHTML = `
    <div class="bg-[var(--c-surface)] rounded-2xl p-8 text-center border border-[var(--c-border-light)]" style="box-shadow:var(--c-shadow-sm)">
      <div class="text-4xl mb-3">🎉</div>
      <div class="text-base font-bold text-[var(--c-text)] mb-2">复习完成！</div>
      <div class="text-sm text-[var(--c-text-dim)] mb-4">🟢 记住了 <strong>${_dueResults.remembered}</strong> 个 · 🔴 没记住 <strong>${_dueResults.forgot}</strong> 个</div>
      <button class="btn-primary" style="width:auto;padding:10px 24px;" onclick="loadWords()">再来一轮</button>
    </div>`;
}

function getFilteredVocab(items, mode) {
  // 去时间化：纯布尔标签过滤（isNewToday/isMistake/needsReview 由打标网关注入）
  if (mode === 'review' || mode === 'due') {
    return items.filter(v => v.needsReview === true);
  }
  if (mode === 'new' || mode === 'today') {
    // 1) 词库中 isNewToday 打标词优先（纯布尔过滤，与首页计数同源）
    const tagged = items.filter(v => v.isNewToday === true);
    if (tagged.length) return tagged;
    // 2) 兜底：真实日报解析的「今日生词」—— 词库尚未入库时依然渲染当日 12 词（按词名回填真实 id，复习+1 可写回）
    const realVocab = (_reportParsed && _reportParsed.vocabulary) || [];
    if (realVocab.length) {
      return realVocab.map((w, i) => {
        const existing = items.find(x => String(x.word || '').toLowerCase() === String(w.word || '').toLowerCase());
        return {
          id: (existing && existing.id !== undefined) ? existing.id : 'rep-' + i,
          word: w.word, phonetic: w.phonetic, meaning: w.meaning,
          example: w.example, source_topic: '今日日报', status: existing ? existing.status : 'new',
          review_count: existing ? (existing.review_count || 0) : 0, isNewToday: true
        };
      });
    }
    return [];
  }
  if (mode === 'mistakes' || mode === 'errors' || mode === 'grammar') {
    return items.filter(v => v.isMistake === true);
  }
  return items;
}

function renderVocabList(items) {
  const container = document.getElementById('words-content');
  const q = (document.getElementById('words-search')?.value || '').trim().toLowerCase();
  let filtered = items;
  if (q) filtered = items.filter(v => [v.word, v.phonetic, v.meaning, v.example].some(f => f && f.toLowerCase().includes(q)));

  if (!filtered.length) {
    container.innerHTML = EmptyState({ message: q ? `没有找到"${q}"相关的单词` : '今天没有要复习的单词哦，去休息一下吧～', size: 80 });
    return;
  }

  container.innerHTML = filtered.map(v => vocabCard(v)).join('');

  container.querySelectorAll('.vocab-card').forEach(card => {
    card.addEventListener('click', function(e) { if (!e.target.closest('button')) this.classList.toggle('expanded'); });
  });
}

function vocabCard(v) {
  const s = v.status || (v.mastered ? 'mastered' : 'new');
  const rc = v.review_count || 0;
  const srsHtml = `<div class="srs-dots">${[1,2,3,4,5].map(i => {
    if (s === 'mastered') return '<span class="srs-dot mastered"></span>';
    return `<span class="srs-dot${i <= Math.min(rc, 5) ? ' filled' : ''}"></span>`;
  }).join('')}</div>`;
  const btn = s === 'mastered'
    ? '<span class="badge-status mastered">✅ 已掌握</span>'
    : `<button onclick="markMastered(${v.id});event.stopPropagation();" class="btn-small">复习 +1</button>`;
  const sourceLabel = v.source_topic ? `<span class="badge-source">📂 ${h(v.source_topic)}</span>` : '';

  // Show associated errors
  const errInfo = v.errors_count ? `<span style="font-size:10px;color:var(--red);">🔧 ${v.errors_count} 项</span>` : '';

  // 模块三：底栏布局分离 —— 熟练度星级/圆点靠左，反馈与操作按钮靠右，出处长标签独立一行截断防溢出
  return `<div class="vocab-card">
    <div class="card-row"><span class="word">${h(v.word)}</span><span class="phonetic">${h(v.phonetic)}</span></div>
    <div class="meaning">${h(v.meaning)}</div>
    ${v.example ? `<div class="example">💬 ${h(v.example)}</div>` : ''}
    <div class="card-actions">
      <div class="card-proficiency">
        ${srsHtml}
        <span class="card-count">${rc} 次</span>
      </div>
      <div class="card-action-buttons">
        ${btn}
        <button onclick="speakWord('${h(v.word).replace(/'/g, "\\'")}');event.stopPropagation();" class="btn-soft">${ICO_SPEAKER}</button>
      </div>
    </div>
    <div class="card-source-row">${sourceLabel}${errInfo}</div>
    <div class="card-detail"><div class="card-detail-row"><strong>状态：</strong>${statusLabel(s)}</div><div class="card-detail-row"><strong>添加：</strong>${v.date_added || ''}</div><div class="card-detail-row"><strong>复习：</strong>${v.review_count || 0} 次</div></div>
  </div>`;
}

// ── Status label ───────────────────────────────────────
function statusLabel(status) {
  if (status === 'mastered') return '已掌握';
  if (status === 'learning') return '学习中';
  return '新词';
}

// ── SM-2 ──────────────────────────────────────────────
function sm2(easeFactor, interval, repetitions, quality) {
  let ef = easeFactor || 2.5;
  let ivl = interval || 0;
  let reps = repetitions || 0;
  if (quality < 3) { reps = 0; ivl = 1; }
  else {
    if (reps === 0) ivl = 1;
    else if (reps === 1) ivl = 6;
    else { ivl = Math.round(ivl * ef); if (quality === 5) ivl = Math.round(ivl * 1.3); }
    reps += 1;
  }
  ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ef < 1.3) ef = 1.3;
  return { ease_factor: ef, interval: ivl, repetitions: reps };
}

async function markMastered(id) {
  const { data: v, error } = await sb.from('vocabulary').select('*').eq('id', id).single();
  if (error || !v) { showToast('演示数据：此操作仅对云端词库生效'); return; }
  const result = sm2(v.ease_factor, v.sm2_interval, v.sm2_repetitions, 3);
  const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + result.interval);
  const status = result.repetitions >= 5 ? 'mastered' : 'learning';
  await sb.from('vocabulary').update({
    mastered: status === 'mastered', status,
    ease_factor: result.ease_factor, sm2_interval: result.interval, sm2_repetitions: result.repetitions,
    review_count: (v.review_count || 0) + 1, next_review_date: nextDate.toISOString().slice(0, 10),
    last_reviewed_at: new Date().toISOString()
  }).eq('id', id);
  loadWords();
  showToast(status === 'mastered' ? '🎉 已掌握！' : '📖 已复习');
}

// ═══════════════════════════════════════════════════════
// TAB 3: SPEAK
// ═══════════════════════════════════════════════════════
// ── Speak 智能过滤匹配（路由 → 严格 .filter()） ─────────
const SPEAK_PATTERN_TOPICS = ['句型','条件句','连接词','完成时','比较级','过去时','主谓一致','时态','虚拟语气'];
// English ErrorCategory 键 → 中文话题别名（兼容历史路由参数）
const SPEAK_FILTER_ALIASES = {
  'tense': '过去时', 'connective': '连接词', 'article': '冠词', 'preposition': '介词',
  'word-order': '语序', 'vocabulary': '词汇', 'subject-verb': '主谓一致',
  'singular-plural': '单复数', 'pronunciation': '发音', 'collocation': '搭配',
  'conditional': '条件句', 'comparative': '比较级'
};

function matchSpeakFilter(p, filter) {
  if (!filter) return true;
  const q = String(filter).toLowerCase();
  // 红线3: 标准英文路由键 — 布尔标识精确过滤
  if (q === 'core_sentences' || q === 'core') {
    return p.isTodayCore === true || p.is_core === true;
  }
  const key = SPEAK_FILTER_ALIASES[q] || q;
  const topic = ((p.source_topic || '') + '').toLowerCase();
  // 聚合过滤（兼容历史中文键）
  if (key === '句型' || key === '核心句型') {
    return SPEAK_PATTERN_TOPICS.some(t => topic.includes(t.toLowerCase())) || p.isTodayCore === true;
  }
  const hay = [topic, p.better, p.original, p.scene, p.topic_tag]
    .filter(Boolean).map(x => (x + '').toLowerCase()).join(' ');
  return hay.includes(key);
}

// 当前日报解析器：今天日报 → 用户正在查看的历史日期 → 最新一份有效日报（三级回退）
// 跟读页/复习页共用 —— 绝不再因为日报不是「今天」生成的就回退到 Mock 数据断流
function resolveActiveReport(reports) {
  const list = reports || [];
  const today = new Date().toISOString().slice(0, 10);
  return list.find(r => r.date === today && isDailyReport(r))
    || (_viewDate ? list.find(r => r.date === _viewDate && isDailyReport(r)) : null)
    || list.find(r => isDailyReport(r)) || null;
}

async function loadSpeak() {
  const container = document.getElementById('speak-player');
  container.innerHTML = LoadingState();
  const [{ data: patterns }, { data: reports }] = await Promise.all([
    sb.from('patterns').select('*').order('created_at', { ascending: false }),
    sb.from('reports').select('*').order('date', { ascending: false }).limit(90)
  ]);
  _speakAll = (patterns && patterns.length) ? stampPatternTags(patterns) : mockSentences; // 打标网关：唯一 id + isTodayCore + 标准嵌套字段

  // 真实解析数据源：当前日报的核心句型（parser 原样输出，只消费不修改）
  // 铁律：优先加载当前日报的全部句型 —— 日报有 8 句就必须 (1/8)~(8/8)，绝不回退 2 条内置 Mock
  const todayReport = resolveActiveReport(reports);
  const parsed = todayReport ? parseSmartReport(todayReport.content) : null;

  // /speaking?filter=core_sentences — 专注模式的唯一事实源是 URL 的 filter 参数
  const params = new URLSearchParams(window.location.search);
  const urlFilter = params.get('filter') || null;
  const activeFilter = _activeFilter || urlFilter;

  let sentences;
  if (activeFilter) {
    const q = String(activeFilter).toLowerCase();
    if (q === 'core_sentences' || q === 'core') {
      // 核心句型队列：真实解析 > isTodayCore 打标 > 内置核心句型（嵌套对象，绝不拆分）
      sentences = coreDeck(parsed, _speakAll);
    } else {
      sentences = _speakAll.filter(p => matchSpeakFilter(p, activeFilter)).map(toPlayerItem);
    }
  } else {
    // 默认训练队列 = 今日核心句型（沉浸式单卡片训练，绝不把全库切碎成瀑布流）
    sentences = coreDeck(parsed, _speakAll);
  }

  // 模块二：/shadowing?id=xxx — 精准锚定：收到 id 直接定位到对应句，绝不从第 0 句开始
  const anchorId = params.get('id') || null;
  const startIndex = resolveAnchorIndex(sentences, anchorId);
  if (anchorId && startIndex === 0 && !(sentences[0] && String(sentences[0].id) === String(anchorId))) {
    showToast('未找到指定句子，已从头开始');
  }
  renderShadowingPlayer(sentences, startIndex);
}

// 纯逻辑：id 锚定定位（缺失/越界/无匹配 → 0；字符串化比对，绝不误判数字 id）
function resolveAnchorIndex(sentences, anchorId) {
  if (anchorId === undefined || anchorId === null || anchorId === '') return 0;
  const idx = sentences.findIndex(s => s.id !== undefined && String(s.id) === String(anchorId));
  return idx >= 0 ? idx : 0;
}

// 核心句型训练队列组装：真实解析 sentence_patterns > isTodayCore 打标 > 内置核心句型
function coreDeck(parsed, speakAll) {
  const realCore = (parsed && parsed.sentence_patterns && parsed.sentence_patterns.length)
    ? parsed.sentence_patterns.map((s, i) => ({
        id: 'core-' + i,
        targetSentence: s.pattern || s.targetSentence || s.text || '',
        replacedSentence: '',
        explanation: s.example || s.explanation || ''
      }))
    : null;
  if (realCore) return realCore;
  const tagged = (speakAll || []).filter(p => p.isTodayCore === true || p.is_core === true).map(toPlayerItem);
  if (tagged.length) return tagged;
  const demo = mockSentences.filter(s => s.isTodayCore === true).map(toPlayerItem);
  return demo.length ? demo : (speakAll || []).map(toPlayerItem);
}

// 词条 → 提词器句子：兼容两种数据形状（嵌套对象 targetSentence / 云端 better+original+scene）
// 碎裂防护：主句缺失降级为原句，绝不允许空主句卡片；唯一 id 随条目流转（路由锚定）
function toPlayerItem(p) {
  if (p && p.targetSentence !== undefined) {
    return {
      id: p.id,
      targetSentence: p.targetSentence,
      replacedSentence: p.replacedSentence || '',
      explanation: p.explanation || '',
      isTodayCore: p.isTodayCore, is_core: p.is_core
    };
  }
  const main = p.better || p.original || '';
  return {
    id: p.id,
    targetSentence: main,
    replacedSentence: p.better ? (p.original || '') : '',
    explanation: p.scene || '',
    isTodayCore: p.isTodayCore, is_core: p.is_core
  };
}

let _speakAll = [];

// ═══════════════════════════════════════════════════════
// 沉浸式跟读播放器 — ShadowingPlayer
// React 组件 1:1 移植为 vanilla JS（本应用无 React 构建步骤）
// 铁律：单卡片视图，绝不允许 .map 瀑布流列表；DOM 结构与组件逐字对应
// ═══════════════════════════════════════════════════════
let _playerSentences = [];
let _playerIndex = 0;
let _playerIsRecording = false;
let _playerHasRecorded = false;
let _playerRecorder = null;
let _playerChunks = [];
let _playerAudioUrl = null;

function renderShadowingPlayer(sentences, startIndex) {
  const container = document.getElementById('speak-player');
  _playerSentences = sentences || [];
  // 模块二：id 锚定入口 — startIndex 越界/缺省时安全回退到第 0 句
  _playerIndex = (Number.isInteger(startIndex) && startIndex >= 0 && startIndex < _playerSentences.length) ? startIndex : 0;
  _playerIsRecording = false;
  _playerHasRecorded = false;
  releasePlayerAudio();

  // 边界处理：没有数据 → 与组件一致的空状态
  if (_playerSentences.length === 0) {
    container.innerHTML = '<div class="flex h-full items-center justify-center text-gray-400">没有要训练的内容</div>';
    return;
  }

  container.innerHTML = `
    <div class="flex flex-col h-full">
      <div class="text-center text-xs font-medium text-gray-400 pt-4 mb-6 tracking-widest" id="player-progress"></div>
      <div class="flex-1 flex flex-col justify-center min-h-0 mb-4">
        <div class="bg-white p-7 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col items-center text-center relative min-h-[220px] justify-center">
          <h2 class="text-[28px] font-serif font-bold text-gray-800 leading-snug mb-6" id="player-sentence"></h2>
          <div class="flex flex-col gap-3 w-full pt-6 border-t border-gray-50" id="player-context">
            <p class="text-xs text-gray-400" id="player-replaced">代替: <span class="line-through"></span></p>
            <div class="flex justify-center" id="player-explanation-wrap">
              <p class="text-[11px] text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg" id="player-explanation"></p>
            </div>
          </div>
        </div>
      </div>
      <div id="player-dock">
        <div>
          <div class="flex items-center justify-center gap-6">
            <button id="player-listen" class="flex flex-col items-center gap-2 w-20 group">
              <div class="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl text-gray-600 transition-colors group-hover:bg-gray-300">🔊</div>
              <span class="text-xs text-gray-500">听原音</span>
            </button>
            <button id="player-record" class="flex flex-col items-center gap-2 z-10">
              <div class="w-20 h-20 rounded-full flex items-center justify-center text-3xl text-white shadow-xl transition-all duration-200" id="player-record-btn">🎙️</div>
              <span class="text-xs font-medium transition-colors" id="player-record-label"></span>
            </button>
            <button id="player-hear" disabled class="flex flex-col items-center gap-2 w-20 transition-opacity">
              <div class="w-12 h-12 rounded-full flex items-center justify-center text-xl transition-colors" id="player-hear-btn">🗣️</div>
              <span class="text-xs text-gray-500">听自己</span>
            </button>
          </div>
          <button id="player-next" class="w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200"></button>
        </div>
      </div>
    </div>`;
  updatePlayerView();
  wirePlayerHandlers();
}

// 状态驱动渲染：对应 React 的 isRecording / hasRecorded / currentIndex 条件分支
function updatePlayerView() {
  const item = _playerSentences[_playerIndex];
  if (!item) return;

  // 进度指示器
  document.getElementById('player-progress').textContent = `🎯 专注训练 (${_playerIndex + 1}/${_playerSentences.length})`;

  // 核心提词器大卡片（衬线主句居中）
  const sEl = document.getElementById('player-sentence');
  const nextText = item.targetSentence || '';
  if (sEl.textContent !== nextText) {
    sEl.textContent = nextText;
    // 平滑递增 currentIndex：仅主句变化时重触发入场动画（reflow 手法），录音状态刷新绝不闪动主句
    sEl.style.animation = 'none';
    void sEl.offsetWidth;
    sEl.style.animation = '';
  }
  const replaced = document.getElementById('player-replaced');
  if (item.replacedSentence) {
    replaced.style.display = '';
    replaced.querySelector('span').textContent = item.replacedSentence;
  } else {
    replaced.style.display = 'none';
  }
  const expWrap = document.getElementById('player-explanation-wrap');
  if (item.explanation) {
    expWrap.style.display = '';
    document.getElementById('player-explanation').textContent = `🎬 ${item.explanation}`;
  } else {
    expWrap.style.display = 'none';
  }

  // 巨大的核心录音键（按下变色缩放）
  const recBtn = document.getElementById('player-record-btn');
  const recLabel = document.getElementById('player-record-label');
  if (_playerIsRecording) {
    recBtn.className = 'w-20 h-20 rounded-full flex items-center justify-center text-3xl text-white shadow-xl transition-all duration-200 bg-teal-800 scale-90 shadow-inner';
    recLabel.className = 'text-xs font-medium transition-colors text-teal-700';
    recLabel.textContent = '松开结束';
  } else {
    recBtn.className = 'w-20 h-20 rounded-full flex items-center justify-center text-3xl text-white shadow-xl transition-all duration-200 bg-teal-600 hover:bg-teal-700 hover:scale-105';
    recLabel.className = 'text-xs font-medium transition-colors text-gray-600';
    recLabel.textContent = '按住录音';
  }

  // 听自己（仅在录音后可用）
  const hear = document.getElementById('player-hear');
  const hearBtn = document.getElementById('player-hear-btn');
  if (_playerHasRecorded) {
    hear.disabled = false;
    hear.className = 'flex flex-col items-center gap-2 w-20 transition-opacity opacity-100';
    hearBtn.className = 'w-12 h-12 rounded-full flex items-center justify-center text-xl transition-colors bg-amber-100 text-amber-700 hover:bg-amber-200';
  } else {
    hear.disabled = true;
    hear.className = 'flex flex-col items-center gap-2 w-20 transition-opacity opacity-30 cursor-not-allowed';
    hearBtn.className = 'w-12 h-12 rounded-full flex items-center justify-center text-xl transition-colors bg-gray-100 text-gray-400';
  }

  // 流式切换：下一句
  const next = document.getElementById('player-next');
  const last = _playerIndex === _playerSentences.length - 1;
  next.disabled = last;
  next.textContent = last ? '🎉 训练完成' : '下一句 →';
  next.className = `w-full py-4 rounded-2xl font-semibold text-base transition-all duration-200 ${last ? 'bg-gray-100 text-gray-400' : 'bg-gray-900 text-white hover:bg-gray-800 shadow-md hover:shadow-lg'}`;
}

function wirePlayerHandlers() {
  // 听原音
  document.getElementById('player-listen').addEventListener('click', () => {
    const item = _playerSentences[_playerIndex];
    if (item && item.targetSentence) speakWord(item.targetSentence);
  });

  // 巨大的核心录音键：按住录音 / 松开结束（鼠标 + 触屏双端）
  const rec = document.getElementById('player-record');
  rec.addEventListener('mousedown', e => { e.preventDefault(); startPlayerRecording(); });
  rec.addEventListener('mouseup', e => { e.preventDefault(); stopPlayerRecording(); });
  rec.addEventListener('mouseleave', () => { if (_playerIsRecording) stopPlayerRecording(); });
  rec.addEventListener('touchstart', e => { e.preventDefault(); startPlayerRecording(); }, { passive: false });
  rec.addEventListener('touchend', e => { e.preventDefault(); stopPlayerRecording(); }, { passive: false });

  // 听自己（仅在录音后可用）
  document.getElementById('player-hear').addEventListener('click', () => {
    if (!_playerHasRecorded || !_playerAudioUrl) return;
    new Audio(_playerAudioUrl).play();
  });

  // 流式切换：下一句
  document.getElementById('player-next').addEventListener('click', handlePlayerNext);
}

// 切换下一句：与组件 handleNext 一致 — 切换句子时重置对比状态
function handlePlayerNext() {
  if (_playerIndex < _playerSentences.length - 1) {
    _playerIndex += 1;
    _playerHasRecorded = false;
    releasePlayerAudio();
    if (window.speechSynthesis) speechSynthesis.cancel(); // 切句即停上一句 TTS，避免串音
    updatePlayerView();
  }
}

async function startPlayerRecording() {
  if (_playerIsRecording) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
    showToast('当前浏览器不支持录音，请使用 Chrome / Safari');
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    _playerChunks = [];
    const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
      : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '');
    _playerRecorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    _playerRecorder.ondataavailable = e => { if (e.data && e.data.size) _playerChunks.push(e.data); };
    _playerRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      if (!_playerChunks.length) { updatePlayerView(); return; }
      const blob = new Blob(_playerChunks, { type: _playerRecorder.mimeType || 'audio/webm' });
      releasePlayerAudio();
      _playerAudioUrl = URL.createObjectURL(blob);
      _playerHasRecorded = true;
      updatePlayerView();
    };
    _playerRecorder.start();
    _playerIsRecording = true;
    updatePlayerView();
  } catch (err) {
    showToast('无法访问麦克风，请检查浏览器权限设置');
  }
}

function stopPlayerRecording() {
  if (!_playerIsRecording || !_playerRecorder) return;
  _playerIsRecording = false;
  try { _playerRecorder.stop(); } catch (e) {}
  updatePlayerView();
}

function releasePlayerAudio() {
  if (_playerAudioUrl) { URL.revokeObjectURL(_playerAudioUrl); _playerAudioUrl = null; }
}

// ═══════════════════════════════════════════════════════
// TAB 4: ME (v5.0 Grouped List)
// ═══════════════════════════════════════════════════════
async function loadMe() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;

  document.getElementById('settings-email').textContent = session.user.email || '---';
  document.getElementById('me-subtitle').textContent = session.user.email || '';

  const { data: cfg } = await sb.from('user_config').select('*').eq('user_id', session.user.id).maybeSingle();
  const username = cfg?.user_name || localStorage.getItem('voco-username') || '';
  document.getElementById('setting-username').value = username;
  document.getElementById('me-name').textContent = username || '无名小熊';

  // Update last sync
  const el = document.getElementById('home-last-sync');
  if (el) {
    const { data: reports } = await sb.from('reports').select('date').order('date',{ascending:false}).limit(1);
    if (reports?.length) el.textContent = '最近同步: '+reports[0].date;
  }

  const [{ data: prog }, { data: vocab }, { data: errors }] = await Promise.all([
    sb.from('progress').select('*').eq('user_id', session.user.id).maybeSingle(),
    sb.from('vocabulary').select('*'),
    sb.from('errors').select('*')
  ]);

  const vList = vocab || [];
  const eList = errors || [];
  const dates = [...new Set(vList.map(v => v.date_added).filter(Boolean))].sort().reverse();
  const streak = calcStreak(dates);
  const level = calcLevel(prog?.total_sessions || 0, streak, vList.length);

  document.getElementById('me-streak').innerHTML = `${icon('flame','w-4 h-4 text-[var(--c-orange)]')} ${streak} 天`;
  document.getElementById('me-level').innerHTML = `${icon('star','w-4 h-4 text-[var(--c-orange)]')} Lv.${level.level}`;
  document.getElementById('me-level-bar-fill').style.width = `${(level.progress / level.threshold) * 100}%`;
  document.getElementById('me-level-hint').textContent = level.hint;

  renderAchievements(prog, vList, eList, streak);

  if (eList.length > 0) {
    showErrorPatterns(eList);
  } else {
    document.getElementById('error-patterns-group').classList.add('hidden');
  }
}

// ── Level System ───────────────────────────────────────
function calcLevel(sessions, streak, vocabCount) {
  const xp = (sessions || 0) * 50 + (streak || 0) * 10 + (vocabCount || 0) * 5;
  const levels = [
    { lv: 1, min: 0, max: 200, title: '初学者' }, { lv: 2, min: 200, max: 500, title: '探索者' },
    { lv: 3, min: 500, max: 1000, title: '练习者' }, { lv: 4, min: 1000, max: 1800, title: '进阶者' },
    { lv: 5, min: 1800, max: 3000, title: '挑战者' }, { lv: 6, min: 3000, max: 4500, title: '口语达人' },
    { lv: 7, min: 4500, max: 6500, title: '英语高手' }, { lv: 8, min: 6500, max: 9000, title: '语言大师' },
    { lv: 9, min: 9000, max: 12000, title: '传奇' }, { lv: 10, min: 12000, max: Infinity, title: '终极王者' },
  ];
  for (const l of levels) {
    if (xp < l.max) {
      const progress = xp - l.min, threshold = l.max - l.min;
      const nextTitle = levels.find(ll => ll.lv === l.lv + 1);
      return { level: l.lv, title: l.title, progress, threshold, hint: nextTitle ? `${xp}XP · 距 Lv.${nextTitle.lv} ${nextTitle.title} 还差 ${l.max - xp}XP` : `${xp}XP · 已达最高等级！` };
    }
  }
  return { level: 10, title: '终极王者', progress: 1, threshold: 1, hint: `${xp}XP · 已达最高等级！` };
}

// ── Achievements ──────────────────────────────────────
function renderAchievements(prog, vocab, errors, streak) {
  const badges = [
    { icon: 'target', label: '首次练习', unlocked: (prog?.total_sessions || 0) >= 1 },
    { icon: 'flame', label: '7天坚持', unlocked: streak >= 7 },
    { icon: 'sparkles', label: '14天坚持', unlocked: streak >= 14 },
    { icon: 'book-open', label: '掌握50词', unlocked: (vocab || []).filter(v => v.status === 'mastered' || v.mastered).length >= 50 },
    { icon: 'wrench', label: '纠正20次', unlocked: (errors || []).filter(e => e.correct_in_review).length >= 20 },
    { icon: 'gem', label: '30天坚持', unlocked: streak >= 30 },
    { icon: 'star', label: '练习10次', unlocked: (prog?.total_sessions || 0) >= 10 },
  ];
  const container = document.getElementById('me-badges');
  container.innerHTML = badges.map(b =>
    `<div class="flex flex-col items-center gap-1 px-3 py-3 bg-[var(--c-surface)] rounded-2xl border border-[var(--c-border-light)] min-w-[70px] ${b.unlocked?'':'opacity-40 grayscale-[0.8]'}">${icon(b.icon, 'w-8 h-8')}<small class="text-[10px] text-[var(--c-text-dim)]">${b.label}</small></div>`
  ).join('');
  refreshIcons(container);
}

// ── Error patterns ─────────────────────────────────────
// 高频错误模式聚合（纯函数，UI 与测试共用）：历史行没有 error_pattern（或存了「其他」）时按内容动态推断
function aggregateErrorPatterns(errors) {
  const patternCount = {};
  (errors || []).forEach(e => {
    const raw = (e.error_pattern && e.error_pattern !== '其他') ? e.error_pattern
      : classifyErrorType(e.original || '', e.correction || '', e.rule || '');
    raw.split(',').map(s => s.trim()).filter(Boolean).forEach(p => {
      patternCount[p] = (patternCount[p] || 0) + 1;
    });
  });
  return Object.entries(patternCount).sort((a, b) => b[1] - a[1]);
}

function showErrorPatterns(errors) {
  const grp = document.getElementById('error-patterns-group');
  grp.classList.remove('hidden');
  const epDiv = document.getElementById('error-patterns');
  const sorted = aggregateErrorPatterns(errors);
  const max = sorted[0]?.[1] || 1;
  const fixedCount = errors.filter(e => e.correct_in_review).length;
  const fixRate = errors.length > 0 ? Math.round((fixedCount / errors.length) * 100) : 0;

  epDiv.innerHTML = `
    <div class="flex gap-3 mb-4">${[
      `<div class="flex-1 px-3 py-3 bg-[var(--c-bg)] rounded-lg text-center text-xs text-[var(--c-text-dim)]"><strong class="block text-lg text-[var(--c-text)] mb-0.5">${errors.length}</strong>个错误</div>`,
      `<div class="flex-1 px-3 py-3 bg-[var(--c-bg)] rounded-lg text-center text-xs text-[var(--c-text-dim)]"><strong class="block text-lg text-[var(--c-text)] mb-0.5">${fixRate}%</strong>已纠正</div>`
    ].join('')}</div>
    <div class="mb-3"><div class="text-xs font-semibold text-[var(--c-text-dim)] mb-2">高频错误模式</div>${sorted.map(([name, count]) =>
      `<div class="flex items-center gap-2.5 mb-2 cursor-pointer" onclick="showErrorDetail('${name}')">
        <span class="w-[50px] text-xs text-[var(--c-text-dim)] text-right shrink-0">${name}</span>
        <div class="flex-1 h-2 bg-[var(--c-border-light)] rounded-full overflow-hidden"><div class="h-full bg-[var(--c-primary)] rounded-full transition-all duration-500" style="width:${(count/max)*100}%;"></div></div>
        <span class="w-[30px] text-[11px] text-[var(--c-text-ultradim)] shrink-0">${count}次</span>
      </div>`
    ).join('')}</div>
    <div class="text-xs text-[var(--c-primary)] px-3 py-2 bg-[var(--c-primary-light)] rounded-lg inline-flex items-center gap-1">${icon('lightbulb','w-3.5 h-3.5')} 建议优先练习 <strong>${sorted[0]?.[0] || '无'}</strong> 类型的错误</div>`;
  refreshIcons(epDiv);
}

async function showErrorDetail(pattern) {
  const { data: errors } = await sb.from('errors').select('*').filter('error_pattern', 'ilike', `%${pattern}%`);
  const items = (errors || []).slice(0, 5);
  let msg = `${pattern} 类型错误 (共 ${errors?.length || 0} 个):\n\n`;
  items.forEach(e => { msg += `• ${e.original} → ${e.correction}${e.rule ? ' (' + e.rule + ')' : ''}\n`; });
  showToast(msg);
}

// ═══════════════════════════════════════════════════════
// Template & Import
// ═══════════════════════════════════════════════════════
const TEMPLATES = {
  report: `你现在是我的资深英语口语教练。请根据我们今天的对话，生成一份结构化的复盘日报。

请务必仅返回合法的 JSON 格式数据，不要包含任何额外的解释文本，不要使用 Markdown 代码块标记。JSON 结构必须严格如下：

{
  "summary": {
    "topic": "今天对话的核心主题标签",
    "thought": "一句鼓励性的学习金句（英文及中文翻译）",
    "strengths": ["优点1", "优点2", "优点3"],
    "nextSteps": ["下一次练习建议1", "建议2"]
  },
  "mistakes": [
    { "type": "grammar", "original": "错误的句子", "improved": "正确的句子", "explanation": "简短的语法解释" },
    { "type": "expression", "original": "中式或普通的句子", "improved": "更地道高阶的表达", "explanation": "为什么这样说更好" }
  ],
  "coreSentences": [
    { "targetSentence": "高阶金句", "replacedSentence": "被替代的普通表达", "explanation": "使用场景或提示" }
  ],
  "newWords": [
    { "word": "单词", "phonetic": "音标", "meaning": "释义", "example": "包含该词的例句" }
  ]
}

硬性要求：
1. mistakes 数组必须严格区分两类：type 为 "grammar" 的条目是语法硬伤（时态、单复数、冠词等）；type 为 "expression" 的条目是语法正确但不够地道的表达升级，两者绝不能混用。
2. coreSentences 必须同时包含高阶金句 targetSentence 和被替换的平庸句 replacedSentence。
3. 每个数组至少提供 1 条、最多 5 条；newWords 给出 3 到 5 个今天实际出现过的生词。`,
  topic: `请为以下内容生成 Voco 话题卡：

[在此粘贴视频描述、文章内容或链接]

---
type: topic-card
title: [话题标题]
description: [简短描述]
---

## 关键术语
- term | definition | example sentence

## 讨论问题
- question 1
- question 2`,
  insight: `请分析以下 Voco 日报数据中的口语弱点：

[粘贴最近的日报数据]

---
type: insight-report
---

## 反复出现的问题
- [问题模式] | [出现频率] | [典型例句]

## 根本原因
- [分析]

## 改进建议
- [建议]`
};

function copyTemplate(type) {
  const text = TEMPLATES[type];
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => showToast('📋 已复制！')).catch(() => {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); showToast('📋 已复制！');
  });
}

async function importReport(text) {
  if (!text) text = document.getElementById('dialog-report-input').value.trim();
  if (!text) return;
  const btn = document.getElementById('btn-dialog-submit');
  const resultEl = document.getElementById('dialog-import-result');
  if (btn) { btn.disabled = true; btn.textContent = '解析中...'; }

  const trimmed = text.trim();

  // 新版 JSON 日报：JSON.parse 成功后走专用入库器（自动打标）
  let jsonReport = null;
  if (trimmed.startsWith('{')) {
    try { jsonReport = JSON.parse(trimmed); } catch (e) { jsonReport = null; }
  }
  const isJsonDaily = jsonReport && typeof jsonReport === 'object' &&
    (jsonReport.mistakes || jsonReport.coreSentences || jsonReport.newWords);

  if (isJsonDaily) {
    await importJsonDailyReport(jsonReport, trimmed);
  } else {
    // 传统 Markdown 日报 / 话题卡 / 洞察报告：原链路保持不变
    const parsed = parseSmartReport(trimmed);
    const type = parsed.meta.type || 'daily-report';
    if (type === 'daily-report' || (!parsed.meta.type && Object.keys(parsed.meta).length > 0)) {
      await importDailyReport(parsed);
    } else if (type === 'topic-card') {
      await importTopicCard(parsed);
    } else if (type === 'insight-report') {
      await importInsightReport(parsed);
    } else {
      if (resultEl) resultEl.innerHTML = '<span class="toast-error">❌ 无法识别内容格式</span>';
      if (btn) { btn.disabled = false; btn.textContent = '解析入库'; }
      return;
    }
  }

  document.getElementById('dialog-report-input').value = '';
  if (btn) { btn.disabled = false; btn.textContent = '解析入库'; }
  if (resultEl) resultEl.innerHTML = '<span class="toast-success">✅ 导入成功！</span>';
  setTimeout(() => { hideImportDialog(); loadHome(); }, 1200);
}

// ── 新版 JSON 日报入库器：写入时自动打上前端约定标签 ────
async function importJsonDailyReport(jsonReport, rawText) {
  const { data: { session } } = await sb.auth.getSession();
  const uid = session.user.id;
  // 无损清洗：老格式 mistakes/coreSentences（字符串、元组、残缺对象）先补齐结构再入库，
  // 下方所有 `!m.original` / `!c.targetSentence` 过滤从此一行都不会丢。
  jsonReport = normalizeDailyData(jsonReport || {});
  const date = new Date().toISOString().slice(0, 10);
  const topic = (jsonReport.summary && jsonReport.summary.topic) || '';

  // 归一化 + 打标：newWords → isNewToday:true；coreSentences → isTodayCore:true
  const parsed = normalizeJsonReport(jsonReport, rawText);

  // 1) 今日新词 → vocabulary（打标字段随日报 JSON 流转，表写入保持 schema 安全）
  if (parsed.vocabulary.length) {
    await sb.from('vocabulary').insert(parsed.vocabulary.map(v => ({
      user_id: uid, word: v.word, phonetic: v.phonetic, meaning: v.meaning,
      example: v.example, date_added: date, source_topic: topic, status: 'new'
    })));
  }

  // 2) 语法硬伤（type:'grammar'）→ errors 表
  const allErrors = [];
  for (const m of (Array.isArray(jsonReport.mistakes) ? jsonReport.mistakes : [])) {
    if (!m || !m.original || m.type === 'expression') continue;
    allErrors.push({
      user_id: uid, type: 'grammar', original: m.original || '',
      correction: m.improved || '', rule: m.explanation || '',
      date_added: date, source_topic: topic,
      error_pattern: classifyErrorType(m.original, m.improved, m.explanation)
    });
  }
  if (allErrors.length) await sb.from('errors').insert(allErrors);

  // 3) 地道表达（type:'expression'）+ 核心句型 → patterns 表
  const patRows = [];
  for (const c of (Array.isArray(jsonReport.coreSentences) ? jsonReport.coreSentences : [])) {
    if (!c || !c.targetSentence) continue;
    patRows.push({
      user_id: uid, original: c.replacedSentence || '', better: c.targetSentence,
      scene: c.explanation || '', date_added: date, source_topic: '核心句型'
    });
  }
  for (const m of (Array.isArray(jsonReport.mistakes) ? jsonReport.mistakes : [])) {
    if (!m || m.type !== 'expression' || !m.original) continue;
    patRows.push({
      user_id: uid, original: m.original, better: m.improved || '',
      scene: m.explanation || '', date_added: date, source_topic: topic
    });
  }
  if (patRows.length) await sb.from('patterns').insert(patRows);

  // 4) 原始 JSON 原样入库（下游 parseSmartReport 每次读取时统一归一化打标 → 上下游绝对对齐）
  await sb.from('reports').upsert({ user_id: uid, date, content: rawText }, { onConflict: 'user_id,date' });
  await updateProgress(uid, 0, 0, '', topic, 0);

  if (topic) {
    const { data: existingTopic } = await sb.from('topics').select('id').eq('title', topic).maybeSingle();
    if (existingTopic) {
      await sb.from('topics').update({
        practice_count: sb.raw('practice_count + 1'),
        last_practiced_at: new Date().toISOString()
      }).eq('id', existingTopic.id);
    }
  }

  document.getElementById('dialog-import-result').innerHTML =
    `<span class="toast-success">✅ 入库完成！单词 ${parsed.vocabulary.length} · 语法纠错 ${allErrors.length} · 地道表达/句型 ${patRows.length}</span>`;
}

async function importDailyReport(parsed) {
  const { data: { session } } = await sb.auth.getSession();
  const uid = session.user.id;
  const date = parsed.meta.date || new Date().toISOString().slice(0, 10);
  const topic = parsed.meta.topic || '';
  const duration = parseInt(parsed.meta.duration) || 0;

  if (parsed.vocabulary.length) {
    await sb.from('vocabulary').insert(parsed.vocabulary.map(v => ({
      user_id: uid, word: v.word, phonetic: v.phonetic, meaning: v.meaning,
      example: v.example, date_added: date, source_topic: topic, status: 'new'
    })));
  }

  const allErrors = [];
  for (const e of parsed.pronunciation) allErrors.push({
    user_id: uid, type: 'pronunciation', original: e.original || '', correction: e.correction || '',
    date_added: date, source_topic: topic, error_pattern: classifyErrorType(e.original, e.correction, '')
  });
  for (const e of parsed.grammar) allErrors.push({
    user_id: uid, type: 'grammar', original: e.original || '', correction: e.correction || '',
    rule: e.rule || '', date_added: date, source_topic: topic, error_pattern: classifyErrorType(e.original, e.correction, e.rule || '')
  });
  if (allErrors.length) await sb.from('errors').insert(allErrors);

  if (parsed.patterns.length) {
    await sb.from('patterns').insert(parsed.patterns.map(p => ({
      user_id: uid, original: p.original || '', better: p.better || '',
      scene: p.scene || '', date_added: date, source_topic: topic
    })));
  }

  await sb.from('reports').upsert({ user_id: uid, date, content: parsed.raw }, { onConflict: 'user_id,date' });
  await updateProgress(uid, parsed.summary.fluency || 0, parsed.summary.accuracy || 0, parsed.summary.weak_areas, topic, duration);

  if (topic) {
    const { data: existingTopic } = await sb.from('topics').select('id').eq('title', topic).maybeSingle();
    if (existingTopic) {
      await sb.from('topics').update({
        practice_count: sb.raw('practice_count + 1'),
        last_practiced_at: new Date().toISOString()
      }).eq('id', existingTopic.id);
    }
  }

  document.getElementById('dialog-import-result').innerHTML =
    `<span class="toast-success">✅ 入库完成！单词 ${parsed.vocabulary.length} · 纠错 ${allErrors.length} · 句型 ${parsed.patterns.length}</span>`;
}

async function importTopicCard(parsed) {
  const { data: { session } } = await sb.auth.getSession();
  const uid = session.user.id;
  const title = parsed.meta.title || '未命名话题';
  const description = parsed.meta.description || '';
  const keyTerms = (parsed.vocabulary || []).map(v => v.word).filter(Boolean);
  const { data: topic } = await sb.from('topics').insert([{
    user_id: uid, title, description, source_type: 'chatgpt', key_terms: keyTerms, notes: ''
  }]).select().single();

  if (parsed.vocabulary.length && topic) {
    await sb.from('vocabulary').insert(parsed.vocabulary.map(v => ({
      user_id: uid, word: v.word, phonetic: v.phonetic || '', meaning: v.meaning || '',
      example: v.example || '', date_added: new Date().toISOString().slice(0, 10), source_topic: title, status: 'new'
    })));
  }
  document.getElementById('dialog-import-result').innerHTML = `<span class="toast-success">✅ 话题「${h(title)}」已添加！词汇 ${parsed.vocabulary.length} 个</span>`;
}

async function importInsightReport(parsed) {
  const { data: { session } } = await sb.auth.getSession();
  await sb.from('reports').upsert({
    user_id: session.user.id, date: new Date().toISOString().slice(0, 10), content: parsed.raw
  }, { onConflict: 'user_id,date' });
  document.getElementById('dialog-import-result').innerHTML = '<span class="toast-success">✅ 分析报告已保存！</span>';
}

// ── v6.0: error category detection (typed linguistic classification) ──
function detectErrorCategory(original, correction) {
  if (!original || !correction) return 'vocabulary';
  if (/(ed|ing|was|were|have|has|had|will)\b/i.test(original) || /(ed|ing|was|were|have|has|had|will)\b/i.test(correction)) return 'tense';
  if (/\b(in|on|at|for|to|of|with|by|from)\b/i.test(correction) && original.replace(/\b(in|on|at|for|to|of|with|by|from)\b/gi,'')===correction.replace(/\b(in|on|at|for|to|of|with|by|from)\b/gi,'')) return 'preposition';
  if (/\b(a|an|the)\b/i.test(original) || /\b(a|an|the)\b/i.test(correction)) return 'article';
  const oWords = original.toLowerCase().split(/\s+/).sort().join(' ');
  const cWords = correction.toLowerCase().split(/\s+/).sort().join(' ');
  if (oWords===cWords && original!==correction) return 'word-order';
  if (/(s|es)\b/i.test(original) !== /(s|es)\b/i.test(correction)) return 'singular-plural';
  return 'vocabulary';
}

// 单一分类源：全部错误模式归类收敛于 parser.js 的 classifyErrorType（发音纠偏/时态语态/冠词使用/逻辑衔接/地道表达/其他）
// 旧实现的零散正则已废弃 —— 严禁与分类引擎分叉
function detectErrorPattern(original, correction) {
  return classifyErrorType(original, correction, '') || '其他';
}

async function updateProgress(uid, fluency, accuracy, weak_areas, topic, duration) {
  const { data: prog } = await sb.from('progress').select('*').eq('user_id', uid).maybeSingle();
  let p = prog || {
    user_id: uid, total_sessions: 0, total_minutes: 0, topics: [],
    fluency_trend: [], accuracy_trend: [], weak_areas: [],
    words_learned: 0, words_mastered: 0, errors_fixed: 0
  };
  p.total_sessions += 1;
  p.total_minutes += duration;
  if (topic && !p.topics.includes(topic)) p.topics = [...p.topics, topic];
  p.fluency_trend = [...p.fluency_trend, fluency];
  p.accuracy_trend = [...p.accuracy_trend, accuracy];
  (weak_areas || '').split(/[、,，]/).map(s => s.trim()).filter(Boolean).forEach(w => {
    if (!p.weak_areas.includes(w)) p.weak_areas.push(w);
  });
  const { count: vCount } = await sb.from('vocabulary').select('*', { count: 'exact', head: true });
  const { count: eCount } = await sb.from('errors').select('*', { count: 'exact', head: true }).eq('correct_in_review', true);
  p.words_learned = vCount;
  p.errors_fixed = eCount;
  await sb.from('progress').upsert(p, { onConflict: 'user_id' });
}

// ═══════════════════════════════════════════════════════
// Theme System (v5.0 — data-theme + data-mode on <html>)
// ═══════════════════════════════════════════════════════
function initTheme() {
  const savedTheme = localStorage.getItem('voco-theme') || 'warm';
  const savedMode = localStorage.getItem('voco-mode') || 'light';
  applyTheme(savedTheme, savedMode);
  initFontSize();
}

function applyTheme(theme, mode) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-mode', mode);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = mode === 'dark' ? '#1E1E2E' : (mode === 'eye-care' ? '#E5EBE0' : '#FBF7F0');
  localStorage.setItem('voco-theme', theme);
  localStorage.setItem('voco-mode', mode);

  // Update theme picker (circle buttons)
  document.querySelectorAll('#theme-picker button').forEach(b => {
    b.style.borderColor = b.dataset.theme === theme ? 'var(--c-primary)' : 'transparent';
    if (b.dataset.theme === theme) b.classList.add('ring-2'); else b.classList.remove('ring-2');
  });

  // Update mode toggle
  document.querySelectorAll('#mode-toggle button').forEach(b => {
    if (b.dataset.mode === mode) { b.classList.add('active'); b.style.background='var(--c-surface)'; b.style.color='var(--c-primary)'; b.style.fontWeight='600'; b.style.boxShadow='var(--c-shadow-sm)'; }
    else { b.classList.remove('active'); b.style.background='transparent'; b.style.color=''; b.style.fontWeight=''; b.style.boxShadow=''; }
  });
}

function selectTheme(theme) {
  const mode = document.documentElement.getAttribute('data-mode') || 'light';
  applyTheme(theme, mode);
}

function selectMode(mode) {
  const theme = document.documentElement.getAttribute('data-theme') || 'warm';
  applyTheme(theme, mode);
}

function initFontSize() {
  const saved = localStorage.getItem('voco-font-size') || 'normal';
  applyFontSize(saved);
  document.querySelectorAll('#font-size-toggle button').forEach(b => {
    if (b.dataset.size === saved) { b.classList.add('active'); b.style.background='var(--c-surface)'; b.style.color='var(--c-primary)'; b.style.fontWeight='600'; b.style.boxShadow='var(--c-shadow-sm)'; }
  });
}

function applyFontSize(size) {
  localStorage.setItem('voco-font-size', size);
  const scale = size === 'large' ? '1.15' : size === 'medium' ? '1.07' : '1';
  document.documentElement.style.fontSize = (16 * parseFloat(scale)) + 'px';
  document.querySelectorAll('#font-size-toggle button').forEach(b => {
    if (b.dataset.size === size) { b.classList.add('active'); b.style.background='var(--c-surface)'; b.style.color='var(--c-primary)'; b.style.fontWeight='600'; b.style.boxShadow='var(--c-shadow-sm)'; }
    else { b.classList.remove('active'); b.style.background='transparent'; b.style.color=''; b.style.fontWeight=''; b.style.boxShadow=''; }
  });
}

// ═══════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════
async function exportData() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const [vocab, errors, patterns, progress, reports, topics] = await Promise.all([
    sb.from('vocabulary').select('*'), sb.from('errors').select('*'), sb.from('patterns').select('*'),
    sb.from('progress').select('*').eq('user_id', session.user.id).maybeSingle(),
    sb.from('reports').select('*'), sb.from('topics').select('*')
  ]);
  const json = JSON.stringify({
    vocabulary: vocab.data, errors: errors.data, patterns: patterns.data,
    progress: progress.data, reports: reports.data, topics: topics.data,
    exported_at: new Date().toISOString()
  }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `voco-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('📥 数据已导出');
}

async function importJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return;
      let imported = 0;
      if (data.vocabulary?.length) {
        const items = data.vocabulary.map(v => ({ ...v, id: undefined, user_id: session.user.id }));
        await sb.from('vocabulary').insert(items);
        imported += items.length;
      }
      if (data.errors?.length) {
        const items = data.errors.map(e => ({ ...e, id: undefined, user_id: session.user.id }));
        await sb.from('errors').insert(items);
        imported += items.length;
      }
      if (data.patterns?.length) {
        const items = data.patterns.map(p => ({ ...p, id: undefined, user_id: session.user.id }));
        await sb.from('patterns').insert(items);
        imported += items.length;
      }
      showToast(`📥 已导入 ${imported} 条数据`);
      loadHome();
    } catch (err) {
      showToast('❌ 导入失败：文件格式错误');
    }
  };
  input.click();
}

// ═══════════════════════════════════════════════════════
// TTS
// ═══════════════════════════════════════════════════════
let _ttsVoice = null;

function getBestVoice() {
  if (_ttsVoice) return _ttsVoice;
  const voices = speechSynthesis.getVoices();
  // Prefer Google US English or Samantha (macOS)
  const preferred = voices.find(v => v.name === 'Google US English') ||
                    voices.find(v => v.name === 'Samantha') ||
                    voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) ||
                    voices.find(v => v.lang === 'en-US');
  _ttsVoice = preferred || voices[0];
  return _ttsVoice;
}

// Preload voices
if ('speechSynthesis' in window) {
  speechSynthesis.getVoices();
  speechSynthesis.onvoiceschanged = () => { _ttsVoice = null; getBestVoice(); };
}

function speakWord(text) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel(); // Cancel any in-progress speech
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.85;
  u.pitch = 1.0;
  const voice = getBestVoice();
  if (voice) u.voice = voice;
  speechSynthesis.speak(u);
}

// ═══════════════════════════════════════════════════════
// Practice Flow [deprecated v4.0 — replaced by import dialog + tab-based navigation]
// ═══════════════════════════════════════════════════════
let _flowStep = 0;

function renderFlowStep() {
  // [deprecated v4.0]
  return;
  const steps = ['选择话题', '练习准备', '开始练习', '导入报告'];
  const flowContainer = document.getElementById('practice-flow');
  if (!flowContainer) return;

  const progressHTML = steps.map((s, i) => {
    let cls = 'flow-dot';
    if (i < _flowStep) cls += ' done';
    if (i === _flowStep) cls += ' active';
    return `<span class="${cls}">${i < _flowStep ? '✓' : i + 1}</span>${i < steps.length - 1 ? '<span class="flow-line"></span>' : ''}`;
  }).join('');

  let bodyHTML = '';
  if (_flowStep === 0) {
    bodyHTML = `<div style="padding:16px;">
      <p style="font-size:14px;color:var(--text-dim);margin-bottom:12px;">${steps[0]}</p>
      <p style="font-size:12px;color:var(--text-ultradim);margin-bottom:12px;">从话题库选择一个话题开始今天的口语练习</p>
      <select id="flow-topic-select" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:14px;font-family:inherit;">
        <option value="">选择话题...</option>
      </select>
      <button class="btn-primary" id="flow-next" style="margin-top:12px;" disabled>下一步 →</button>
    </div>`;
  } else if (_flowStep === 1) {
    bodyHTML = `<div style="padding:16px;">
      <p style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:8px;">${steps[1]}</p>
      <div id="flow-preview-content"><p style="font-size:12px;color:var(--text-ultradim);">正在加载话题信息...</p></div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button class="btn-small" id="flow-prev">← 上一步</button>
        <button class="btn-primary" id="flow-next" style="flex:1;">开始练习 →</button>
      </div>
    </div>`;
  } else if (_flowStep === 2) {
    bodyHTML = `<div style="padding:16px;">
      <p style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:8px;">${steps[2]}</p>
      <p style="font-size:12px;color:var(--text-dim);margin-bottom:12px;">打开 ChatGPT，用准备好的话题开始口语对话练习。<br>练完后回到这里导入日报。</p>
      <div style="display:flex;gap:8px;">
        <button class="btn-small" id="flow-prev">← 上一步</button>
        <button class="btn-primary" id="flow-next" style="flex:1;">我已练完 →</button>
      </div>
    </div>`;
  } else if (_flowStep === 3) {
    bodyHTML = `<div style="padding:16px;">
      <p style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:8px;">${steps[3]}</p>
      <p style="font-size:12px;color:var(--text-dim);margin-bottom:8px;">用模板生成日报 → 粘贴到 ChatGPT → 把结果粘贴回来</p>
      <div class="template-btns" style="margin-bottom:10px;"><button class="tpl-btn" data-tpl="report">📝 日报模板</button></div>
      <textarea id="flow-report-input" rows="5" placeholder="将 ChatGPT 生成的日报内容粘贴到这里..."></textarea>
      <div style="display:flex;gap:8px;">
        <button class="btn-small" id="flow-prev">← 上一步</button>
        <button class="btn-primary" id="flow-finish" style="flex:1;">解析入库 ✓</button>
      </div>
    </div>`;
  }

  flowContainer.innerHTML = `<div class="flow-progress">${progressHTML}</div>${bodyHTML}`;

  // Bind
  const prevBtn = document.getElementById('flow-prev');
  const nextBtn = document.getElementById('flow-next');
  const finishBtn = document.getElementById('flow-finish');

  if (prevBtn) prevBtn.onclick = () => { if (_flowStep > 0) { _flowStep--; renderFlowStep(); } };
  if (nextBtn) nextBtn.onclick = () => { if (_flowStep < 3) { _flowStep++; renderFlowStep(); } };
  if (finishBtn) finishBtn.onclick = async () => {
    const text = document.getElementById('flow-report-input')?.value;
    if (text) await importReport(text);
    _flowStep = 4;
    renderCompletion();
  };

  if (_flowStep === 0) {
    loadTopicsForFlow();
    const sel = document.getElementById('flow-topic-select');
    if (sel) sel.onchange = function() {
      const btn = document.getElementById('flow-next');
      if (btn) btn.disabled = !this.value;
    };
  }

  if (_flowStep === 1) {
    const sel = document.getElementById('flow-topic-select');
    if (sel) showFlowPreview(sel.value);
  }

  if (_flowStep === 3) {
    document.querySelectorAll('#practice-flow .tpl-btn').forEach(btn => {
      btn.onclick = () => copyTemplate(btn.dataset.tpl);
    });
  }
}

async function loadTopicsForFlow() { return; // [deprecated v4.0]
  const { data: topics } = await sb.from('topics').select('*').order('created_at', { ascending: false });
  const sel = document.getElementById('flow-topic-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">选择话题...</option>' + (topics || []).map(t => `<option value="${t.id}">${h(t.title)}</option>`).join('');
}

async function showFlowPreview(topicId) { return; // [deprecated v4.0]
  const { data: topic } = await sb.from('topics').select('*').eq('id', topicId).single();
  if (!topic) return;
  const { data: vocab } = await sb.from('vocabulary').select('*').or(`source_topic.ilike.%${topic.title}%`);
  const terms = (vocab || []).slice(0, 5);
  const div = document.getElementById('flow-preview-content');
  if (!div) return;
  div.innerHTML = `
    <div style="font-size:16px;font-weight:700;color:var(--text);">${h(topic.title)}</div>
    ${topic.description ? `<div style="font-size:13px;color:var(--text-dim);margin-top:6px;">${h(topic.description)}</div>` : ''}
    ${terms.length ? `<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">${terms.map(v => `<span style="padding:4px 10px;background:var(--bg);border-radius:12px;font-size:12px;color:var(--text-dim);">${h(v.word)}</span>`).join('')}</div>` : ''}
    <div style="margin-top:12px;font-size:13px;color:var(--primary);">💪 用英语描述你与 "${h(topic.title)}" 相关的经历</div>`;
}

function renderCompletion() { return; // [deprecated v4.0]
  const flowContainer = document.getElementById('practice-flow');
  if (!flowContainer) return;
  flowContainer.innerHTML = `
    <div class="flow-progress"><span class="flow-dot done">✓</span><span class="flow-line"></span><span class="flow-dot done">✓</span><span class="flow-line"></span><span class="flow-dot done">✓</span><span class="flow-line"></span><span class="flow-dot done">✓</span></div>
    <div style="text-align:center;padding:20px;">
      <div style="font-size:48px;margin:16px 0;">🎉</div>
      <div style="font-size:18px;font-weight:700;">练习完成！</div>
      <p style="font-size:13px;color:var(--text-dim);margin:8px 0;">日报已入库，去首页查看学习成果</p>
      <button class="btn-primary" onclick="document.querySelector('.tab[data-tab=home]').click();">查看日报 →</button>
    </div>`;
}

// ═══════════════════════════════════════════════════════
// Clipboard Detection
// ═══════════════════════════════════════════════════════
async function detectClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (text && (text.includes('type: daily-report') || text.includes('type: topic-card') || text.includes('type: insight-report'))) {
      showToast('📋 检测到 Voco 内容，点击任务"导入日报"进行导入');
    }
  } catch(e) {}
}

// Share target
(function handleShareTarget() {
  const params = new URLSearchParams(window.location.search);
  const sharedText = params.get('text') || params.get('body') || params.get('title');
  if (sharedText && (sharedText.includes('type: daily-report') || sharedText.includes('type: topic-card') || sharedText.includes('type: insight-report'))) {
    checkAuth().then(() => { setTimeout(async () => { await importReport(sharedText); window.history.replaceState({}, '', '/'); }, 500); });
  }
})();

// ═══════════════════════════════════════════════════════
// Global Components: EmptyState & LoadingState
// ═══════════════════════════════════════════════════════
function EmptyState({ message = '暂无数据', size = 96 } = {}) {
  return `<div class="state-empty">
    <img class="state-img" src="/bear-default.png" alt="💤" style="width:${size}px;height:${size}px"
      onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<span class=state-fallback style=font-size:${size>80?48:32}px>💤</span>')" />
    <p class="state-text">${h(message)}</p>
  </div>`;
}

function LoadingState({ message = 'Voco小熊正一路小跑赶来...', size = 80 } = {}) {
  return `<div class="state-loading">
    <img class="state-img animate-pulse" src="/bear-default.png" alt="⏳" style="width:${size}px;height:${size}px"
      onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<span class=state-fallback style=font-size:${size>80?48:32}px>⏳</span>')" />
    <p class="state-text">${h(message)}</p>
  </div>`;
}

// ═══════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════
function h(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function hf(s) { return h(s).replace(/\n/g, '<br>'); }

// ── Lucide Icon Helper (data-lucide → SVG via CDN) ──────
function icon(name, cls = '') {
  return `<i data-lucide="${name}" class="${cls}"></i>`;
}
let _iconsTimer = null;
let _iconsPending = new Set();
function refreshIcons(el) {
  if (typeof lucide === 'undefined' || !lucide.createIcons) return;
  if (el) _iconsPending.add(el);
  clearTimeout(_iconsTimer);
  _iconsTimer = setTimeout(() => {
    if (_iconsPending.size) {
      _iconsPending.forEach(e => lucide.createIcons({ root: e }));
      _iconsPending.clear();
    } else {
      lucide.createIcons();
    }
  }, 32);
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:var(--text);color:var(--bg);padding:10px 20px;border-radius:12px;font-size:14px;font-weight:500;z-index:200;box-shadow:0 4px 20px rgba(0,0,0,0.25);pointer-events:none;max-width:90vw;white-space:pre-line;';
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ═══════════════════════════════════════════════════════
// Event Bindings (v5.0)
// ═══════════════════════════════════════════════════════
document.getElementById('btn-login').addEventListener('click', signIn);
document.getElementById('btn-login-email').addEventListener('click', sendMagicLink);
document.getElementById('btn-dialog-submit')?.addEventListener('click', () => importReport());
document.getElementById('btn-export-data').addEventListener('click', exportData);
document.getElementById('btn-logout-me').addEventListener('click', signOut);
document.getElementById('btn-import-json')?.addEventListener('click', importJSON);

// Import dialog overlay click-to-close
document.getElementById('import-dialog')?.addEventListener('click', function(e) {
  if (e.target === this) hideImportDialog();
});

// Theme picker (circle buttons)
document.querySelectorAll('#theme-picker button').forEach(b => {
  b.addEventListener('click', () => selectTheme(b.dataset.theme));
});

// Mode toggle
document.querySelectorAll('#mode-toggle button').forEach(b => {
  b.addEventListener('click', () => selectMode(b.dataset.mode));
});

// Font size toggle
document.querySelectorAll('#font-size-toggle button').forEach(b => {
  b.addEventListener('click', () => applyFontSize(b.dataset.size));
});

// Search（模块三：搜索仅作用于「全部词汇」Tab；语法错题/待复习为专用卡组流，不受搜索干扰）
document.getElementById('words-search')?.addEventListener('input', () => {
  if (_wordsFilter === 'all') renderVocabList(getFilteredVocab(_wordsAll, 'all'));
});

// Speak — 沉浸式跟读播放器（renderShadowingPlayer 内部自接线，无全局按钮绑定）

// ═══════════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════════
initTheme();
// Replace all static <i data-lucide> elements with SVG icons
if (typeof lucide !== 'undefined' && lucide.createIcons) {
  lucide.createIcons();
}

sb.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') checkAuth();
  if (event === 'SIGNED_OUT') checkAuth();
});

checkAuth();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js?v=56');
}
