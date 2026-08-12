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

    // Clear global filter on manual tab switches (not programmatic navigateToTab)
    if (!_navigatingViaProgram) {
      _activeFilter = null;
      _activeFilterLabel = '';
      if (window.location.search) window.history.replaceState({}, '', '/');
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

function navigateToTab(tab, filter, label) {
  if (filter) {
    _activeFilter = filter;
    _activeFilterLabel = label || filter;
    window.history.replaceState({}, '', `/?tab=${tab}&filter=${encodeURIComponent(filter)}`);
  } else {
    _activeFilter = null;
    _activeFilterLabel = '';
    window.history.replaceState({}, '', '/');
  }
  _navigatingViaProgram = true;
  document.querySelector(`.tab[data-tab=${tab}]`).click();
  _navigatingViaProgram = false;
}

function clearFilter() {
  _activeFilter = null;
  _activeFilterLabel = '';
  window.history.replaceState({}, '', '/');
}

// Handle browser back/forward
window.addEventListener('popstate', () => {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab') || 'home';
  const filter = params.get('filter') || null;
  _activeFilter = filter;
  _activeFilterLabel = filter || '';
  _navigatingViaProgram = true;
  document.querySelector(`.tab[data-tab=${tab}]`).click();
  _navigatingViaProgram = false;
});

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
    loadHome();
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
      { issue: '表达纠正', wrong: 'I have went to three interviews last month.', correct: 'I have gone to three interviews last month.', explanation: '过去时态与完成时混淆：现在完成时需用 have + 过去分词（gone），不能用过去式 went', detail: "'I have went' → 应为 'I have gone'", action: '专项攻克', tab: 'speak', filter: 'tense', filterLabel: '时态句型', errorCategory: 'tense' },
      { issue: '逻辑连接', wrong: 'I wanted to go out. It was raining.', correct: 'I wanted to go out. However, it was raining.', explanation: '缺少逻辑连接词：句子之间缺少 however / therefore 等过渡词', detail: '多处句子之间缺乏 however/therefore 等过渡词', action: '专项攻克', tab: 'speak', filter: 'connective', filterLabel: '连接词句型', errorCategory: 'connective' },
      { issue: '表达纠正', wrong: 'I went to store.', correct: 'I went to the store.', explanation: '冠词遗漏：单数可数名词 store 前需要冠词 the', detail: "'I went to store' → 应为 'I went to the store'", action: '查看纠错', tab: 'words', filter: 'errors', filterLabel: '高频错词', errorCategory: 'article' }
    ],
    nextSteps: [
      { step: '练习使用更复杂的连接词（however, therefore, moreover）', action: '专项跟读', tab: 'speak', filter: 'connective', filterLabel: '连接词句型' },
      { step: '刻意练习过去时态与现在完成时的区分', action: '专项跟读', tab: 'speak', filter: 'tense', filterLabel: '时态句型' },
      { step: '尝试在下次对话中使用至少 3 个本周新学单词', action: '去练习', tab: 'words', filter: 'today', filterLabel: '今日新词' }
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
      { category:'article', label:'冠词遗漏', keyword:'a / an / the', count:2, filterKey:'errors', filterLabel:'高频错词', actionLabel:'去纠错' }
    ],
    overallReview: "本次练习围绕个人成长展开，用户能够表达较复杂的观点，在描述抽象概念时展现了较好的语言组织能力。整体流利度有明显提升，但在语法细节和连接词使用上仍有优化空间。建议在下次练习中刻意关注时态一致性和逻辑连接词的运用。"
  },
  contentCards: [
    { icon: 'pen-line', num: 4, label: '新学单词', tab: 'words', btn: '复习今日单词', filter: 'today', filterLabel: '今日新词' },
    { icon: 'ruler', num: 10, label: '核心句型', tab: 'speak', btn: '练习句型', filter: '句型', filterLabel: '核心句型' },
    { icon: 'wrench', num: 2, label: '重点纠错', tab: 'words', btn: '查看纠错', filter: 'errors', filterLabel: '高频错词' }
  ],
  todos: [
    { text: '复习 5 个今日新单词', done: false, action: '去复习', tab: 'words' },
    { text: '完成影子跟读练习', done: false, action: '开始练习', tab: 'speak' },
    { text: '导入今日 ChatGPT 日报', done: true }
  ]
};

// ── Mock Patterns (for speak page demo) ─────────────────
const mockPatterns = [
  { id:'mp1', better:"If I were you, I'd give it a shot.", original:'If I am you, I will try.', scene:'给朋友提建议', source_topic:'条件句', date_added: new Date().toISOString().slice(0,10) },
  { id:'mp2', better:'Had I known earlier, I would have come.', original:'If I knew earlier, I come.', scene:'表达遗憾', source_topic:'条件句', date_added: new Date().toISOString().slice(0,10) },
  { id:'mp3', better:'I have been practicing for about three months now.', original:'I am practicing for three months.', scene:'描述持续时长', source_topic:'完成时', date_added: new Date().toISOString().slice(0,10) },
  { id:'mp4', better:"I've been meaning to ask you about that.", original:'I want to ask you that.', scene:'正式对话开场', source_topic:'完成时', date_added: new Date().toISOString().slice(0,10) },
  { id:'mp5', better:'However, I still struggle with pronunciation sometimes.', original:'But I still difficult with pronunciation.', scene:'使用逻辑连接词', source_topic:'连接词', date_added: new Date().toISOString().slice(0,10) },
  { id:'mp6', better:'The more you practice, the more fluent you become.', original:'You practice more, you become more fluent.', scene:'做比较', source_topic:'比较级', date_added: new Date().toISOString().slice(0,10) },
  { id:'mp7', better:'It depends on the context and who you\'re talking to.', original:'It depend context and who you talk.', scene:'解释细微差别', source_topic:'主谓一致', date_added: new Date().toISOString().slice(0,10) },
  { id:'mp8', better:'I went to the store to pick up some groceries.', original:'I go to store pick up grocery.', scene:'日常叙述', source_topic:'过去时', date_added: new Date().toISOString().slice(0,10) },
  { id:'mp9', better:'Could you tell me where the nearest subway station is?', original:'Where is subway?', scene:'礼貌问路', source_topic:'句型', date_added: new Date().toISOString().slice(0,10) },
  { id:'mp10', better:"I'd rather stay home than go out in this weather.", original:'I prefer stay home than go out.', scene:'表达偏好', source_topic:'句型', date_added: new Date().toISOString().slice(0,10) },
];

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

  const vList = vocab || [];
  const eList = errors || [];
  const pList = patterns || [];
  const rList = reports || [];
  const today = new Date().toISOString().slice(0, 10);

  const activeDate = _viewDate || today;
  const activeReport = rList.find(r => r.date === activeDate);
  const todayReport = rList.find(r => r.date === today);

  // Section 1: Header
  const dates = [...new Set(vList.map(v => v.date_added).filter(Boolean))].sort().reverse();
  const streak = calcStreak(dates);
  renderGreeting(streak, vList, rList);
  renderHistoryBanner(activeReport, activeDate);

  // Section 2: Streak / Check-in Card
  renderStreakCard(streak, todayReport, vList, rList);

  // Section 3: Metrics
  renderMetricsOverview(activeReport, vList, eList, pList, prog);

  // Section 4: Insights (Cards A-F)
  renderInsightsSection(activeReport);

  // Section 5: Content Cards + Todos
  renderContentCards(activeReport, vList, eList, pList);
  renderTodoList(todayReport, vList, eList, rList, streak);
  _homeLoading = false;
}

// ── Section 1: Header ───────────────────────────────────
function renderGreeting(streak, vocabList, reports) {
  const hour = new Date().getHours();
  let g; if (hour < 6) g = '夜深了'; else if (hour < 12) g = '早上好'; else if (hour < 14) g = '中午好'; else if (hour < 18) g = '下午好'; else g = '晚上好';
  const name = localStorage.getItem('voco-username') || '';
  document.getElementById('greeting-text').textContent = name ? `${g}，${name}！` : `${g}！`;
  const now = new Date();
  const wd = ['周日','周一','周二','周三','周四','周五','周六'];
  document.getElementById('greeting-date').textContent = `${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 ${wd[now.getDay()]}`;

  const today = new Date().toISOString().slice(0,10);
  const hasToday = (reports||[]).some(r => r.date === today && isDailyReport(r));
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
  const today = new Date().toISOString().slice(0,10);
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
function renderMetricsOverview(todayReport, vocab, errors, patterns, prog) {
  const grid = document.getElementById('home-metrics');
  if(!todayReport || !isDailyReport(todayReport)) {
    // Show mock data when no report
    const m = mockDashboardData.metrics;
    grid.innerHTML = metricsHTML(m.overall, m.speakMin, m.totalMin, m.fluency, m.grammar, m.vocab, m.natural, m.topics, m.newWords, m.expressions, m.corrections);
    refreshIcons(grid);
    return;
  }
  const parsed = parseReport(todayReport.content);
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

// ── Section 4: Insights (Cards A-F) ─────────────────────
function renderInsightsSection(todayReport) {
  const container = document.getElementById('home-insights');
  // Merge real data with mock
  let d = JSON.parse(JSON.stringify(mockDashboardData.insights));
  if(todayReport && isDailyReport(todayReport)){
    const p = parseReport(todayReport.content);
    if(p.meta.topic) d.topics = p.meta.topic.split(/[,，、]/).map(t=>t.trim()).filter(Boolean);
    if(p.summary.review||p.summary.thoughts) d.overallReview = [p.summary.review,p.summary.thoughts].filter(Boolean).join('\n\n');
    if(p.summary.strengths){ const lines = p.summary.strengths.split('\n').filter(Boolean).map(l=>l.replace(/^[-•*]\s*/,'')); if(lines.length) d.strengths = lines; }
    const allErr = [...(p.grammar||[]),...(p.pronunciation||[])];
    if(allErr.length) d.improvements = allErr.slice(0,3).map(e=>({issue:e.type==='pronunciation'?'发音纠正':'表达纠正',wrong:e.original||'',correct:e.correction||'',explanation:e.rule||'',detail:(e.original||'')+' → '+(e.correction||'')+(e.rule?'（'+e.rule+'）':''),action:'查看纠错',tab:'words'}));
    if(p.summary.next_suggestions){ const steps = p.summary.next_suggestions.split('\n').filter(Boolean).map(l=>l.replace(/^[-•*\d]+[\.\、]\s*/,'')); if(steps.length) d.nextSteps = steps.slice(0,3).map(s=>({step:s,action:'去练习',tab:'speak'})); }
    // v6.0: derive executive summary fields from real report data
    if(allErr.length) {
      d.targetAreas = allErr.slice(0,3).map(e => ({
        category: detectErrorCategory(e.original, e.correction),
        label: e.rule || e.type || '表达纠正',
        keyword: (e.correction || '').slice(0, 20),
        count: 1,
        filterKey: 'errors',
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
  // Card D: Improvements — one error = ONE card, wrong/correct/explanation stacked inside
  html += `<div class="flex items-center gap-1.5 text-xs font-semibold text-[var(--c-text-dim)] mb-2 px-1">${icon('alert-circle','w-3.5 h-3.5 text-amber-500')} 今天需要提升</div>`;
  html += d.improvements.map((im, i) => {
    // Legacy fallback: derive structured fields from detail string if new fields absent
    const parts = (im.detail || '').split(' → ');
    const wrong = im.wrong || parts[0] || '';
    const correct = im.correct || (parts.length > 1 ? parts.slice(1).join(' → ').replace(/^应为\s*/, '') : '');
    const explanation = im.explanation || (parts.length > 1 ? '' : parts[0] || '');
    return card(0.12 + i * 0.02, `
      <div class="flex items-start justify-between gap-4 cursor-pointer" onclick="showImprovementDetail(${i})">
        <div class="flex flex-col gap-1.5 flex-1 min-w-0">
          <span class="text-xs font-medium text-amber-600">${h(im.issue || '表达纠正')}</span>
          ${wrong ? `<p class="text-sm line-through text-[var(--c-red)]">${h(wrong)}</p>` : ''}
          ${correct ? `<p class="text-sm font-semibold text-[var(--c-green)]">→ ${h(correct)}</p>` : ''}
          ${explanation ? `<p class="text-xs text-[var(--c-text-ultradim)] mt-1">${h(explanation)}</p>` : ''}
        </div>
        <button class="shrink-0 px-3 py-1.5 bg-[var(--c-bg)] hover:bg-[var(--c-border-light)] text-xs text-[var(--c-text-dim)] rounded-full flex items-center gap-1 transition-colors border-0 cursor-pointer mt-1" onclick="event.stopPropagation();showImprovementDetail(${i})">
          查看纠错 ${icon('arrow-right','w-3 h-3')}
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

// ── Improvement detail: show targeted analysis, not just dump to words tab ──
function showImprovementDetail(idx) {
  const d = _currentInsights || mockDashboardData.insights;
  const im = d.improvements[idx];
  if (!im) return;
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
      <div class="text-xs font-semibold text-[var(--c-text-ultradim)] mb-1.5">建议</div>
      <div class="text-sm text-[var(--c-text-dim)] leading-relaxed mb-3">在下一次口语练习中，刻意注意此类错误。建议将正确表达抄写到单词本中反复朗读，形成肌肉记忆。</div>
      <button class="w-full py-3 bg-[var(--c-primary)] text-white border-0 rounded-2xl text-sm font-bold cursor-pointer transition-all active:scale-[0.98]" onclick="navigateToTab('${im.tab||'words'}','${im.filter||'errors'}','${im.filterLabel||'高频错词'}');this.closest('.fixed').remove()">去单词本复习相关词汇 ${icon('arrow-right','w-3.5 h-3.5')}</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  refreshIcons(modal);
}

// ── Next-step detail: contextual action, not blind tab switch ──
function showNextStepDetail(idx) {
  const d = _currentInsights || mockDashboardData.insights;
  const ns = d.nextSteps[idx];
  if (!ns) return;
  // Determine sensible action: use explicit filter fields if available, else derive
  const isVocab = /单词|词汇|生词/.test(ns.step);
  const targetTab = ns.tab || (isVocab ? 'words' : 'speak');
  const targetLabel = ns.filterLabel
    ? `去${ns.tab === 'words' ? '单词本' : '口语页'}练习：${ns.filterLabel}`
    : (isVocab ? '去单词本练习' : '去口语页练习');
  let targetFilter = ns.filter || '';
  let targetFilterLabel = ns.filterLabel || '';
  if (!targetFilter) {
    if (isVocab) { targetFilter = 'today'; targetFilterLabel = '今日新词'; }
    else if (/连接词|过渡词|however|therefore|moreover/i.test(ns.step)) { targetFilter = '连接词'; targetFilterLabel = '连接词'; }
    else if (/过去时|完成时|进行时|时态/i.test(ns.step)) { targetFilter = '过去时'; targetFilterLabel = '时态'; }
    else if (/条件|if|would|could|虚拟/i.test(ns.step)) { targetFilter = '条件句'; targetFilterLabel = '条件句'; }
    else if (/比较|more.*than|the more/i.test(ns.step)) { targetFilter = '比较级'; targetFilterLabel = '比较级'; }
    else { targetFilter = '句型'; targetFilterLabel = '句型练习'; }
  }
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black/40 z-[300] flex items-end justify-center';
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
  modal.innerHTML = `<div class="bg-[var(--c-surface)] rounded-t-[20px] w-full max-w-[480px] max-h-[70vh] flex flex-col overflow-hidden animate-[slideUp_0.25s_ease-out]">
    <div class="flex justify-between items-center px-5 py-4 border-b border-[var(--c-border-light)]">
      <div class="flex items-center gap-2 text-sm font-bold text-[var(--c-text)]">${icon('target','w-4 h-4 text-amber-500')} 学习建议 ${idx+1}</div>
      <button class="w-7 h-7 rounded-full border-0 bg-[var(--c-bg)] text-[var(--c-text-dim)] text-base cursor-pointer flex items-center justify-center" onclick="this.closest('.fixed').remove()">✕</button>
    </div>
    <div class="px-5 py-4 overflow-y-auto">
      <div class="text-sm text-[var(--c-text)] leading-relaxed mb-4 p-3 bg-[var(--c-primary-light)] rounded-xl">${h(ns.step)}</div>
      <div class="text-xs text-[var(--c-text-dim)] leading-relaxed mb-4">${icon('lightbulb','w-3.5 h-3.5 text-amber-500 inline-block mr-1')} 下次与 ChatGPT 进行口语练习时，将这条建议作为重点练习目标。练习结束后导入日报，系统会自动追踪你的进步。</div>
      <button class="w-full py-3 bg-[var(--c-primary)] text-white border-0 rounded-2xl text-sm font-bold cursor-pointer transition-all active:scale-[0.98]" onclick="navigateToTab('${targetTab}','${targetFilter}','${targetFilterLabel}');this.closest('.fixed').remove()">${targetLabel} ${icon('arrow-right','w-3.5 h-3.5')}</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  refreshIcons(modal);
}
function renderContentCards(todayReport, vocab, errors, patterns) {
  const container = document.getElementById('home-summary-cards');
  let cards = mockDashboardData.contentCards;
  if(todayReport && isDailyReport(todayReport)){
    const p = parseReport(todayReport.content);
    const allErr = [...(p.grammar||[]),...(p.pronunciation||[])];
    cards = [
      {icon:'pen-line',num:p.vocabulary.length,label:'新学单词',tab:'words',btn:'复习今日单词',filter:'today',filterLabel:'今日新词'},
      {icon:'ruler',num:(p.sentence_patterns||[]).length,label:'核心句型',tab:'speak',btn:'练习句型',filter:p.meta.topic||'句型',filterLabel:p.meta.topic||'句型练习'},
      {icon:'wrench',num:allErr.length,label:'重点纠错',tab:'words',btn:'查看纠错',filter:'errors',filterLabel:'高频错词'}
    ].filter(c=>c.num>0);
  }
  if(!cards.length){ container.innerHTML=''; return; }
  container.innerHTML = cards.map(c=>`
    <div class="flex-1 bg-[var(--c-surface)] rounded-2xl px-2.5 py-3.5 text-center cursor-pointer transition-all duration-150 border border-[var(--c-border-light)] active:scale-[0.96] active:bg-[var(--c-border-light)]" style="box-shadow:var(--c-shadow-sm)" onclick="navigateToTab('${c.tab}','${c.filter||''}','${c.filterLabel||''}')">
      <div class="flex justify-center mb-1">${icon(c.icon,'w-[22px] h-[22px] text-[var(--c-primary)]')}</div>
      <div class="text-[22px] font-extrabold text-[var(--c-primary)]">${c.num}</div>
      <div class="text-[11px] text-[var(--c-text-dim)] mt-0.5">${c.label}</div>
      <div class="inline-flex items-center gap-0.5 text-[11px] text-[var(--c-blue)] mt-1.5 font-medium">${c.btn} ${icon('arrow-right','w-3 h-3')}</div>
    </div>
  `).join('');
  refreshIcons(container);
}

function renderTodoList(todayReport, vocab, errors, reports, streak) {
  const today = new Date().toISOString().slice(0,10);
  let todos = JSON.parse(JSON.stringify(mockDashboardData.todos));
  // Merge real state
  const hasTodayReport = todayReport && isDailyReport(todayReport);
  const reviewedToday = (vocab||[]).filter(v=>v.last_reviewed_at&&v.last_reviewed_at.slice(0,10)===today).length;
  todos = [
    {text:'导入今日日报',sub:hasTodayReport?'已完成':'把 ChatGPT 练习报告粘贴进来',done:hasTodayReport,action:hasTodayReport?null:()=>{showImportDialog();},tab:null},
    {text:'复习 5 个单词',sub:reviewedToday>=5?`已复习 ${reviewedToday} 个`:`今日进度: ${reviewedToday}/5`,done:reviewedToday>=5,action:()=>{navigateToTab('words','today','今日新词');},tab:'words'},
    {text:'完成一次口语练习',sub:hasTodayReport?'今天练习过了！':'打开 ChatGPT 开口说英语',done:hasTodayReport,action:hasTodayReport?null:()=>{navigateToTab('speak');},tab:'speak'}
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
  return c.includes('type: daily-report')||c.includes('## 语法纠正')||c.includes('## 发音纠正')||c.includes('## 今日生词')||c.includes('## 表现总结')||c.includes('## 地道表达');
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

  const parsed = parseReport(todayReport.content);
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
    const parsed = parseReport(report.content);
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
      html = items.map(p => `<div class="dm-item"><strong>${h(p.pattern)}</strong>${p.example ? '<br><span class="text-dim">💬 ' + h(p.example) + '</span>' : ''}</div>`).join('');
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

// ── Zone 4: 🐻 Bear Heatmap ───────────────────────────
function renderBearHeatmap(vocab, reports) {
  // [deprecated v4.0] full heatmap replaced by header mini-bears (renderHeaderBears)
  return;
  const container = document.getElementById('bear-heatmap');
  const dateScore = {};

  (vocab || []).forEach(v => { if (v.date_added) dateScore[v.date_added] = (dateScore[v.date_added] || 0) + 2; });
  (reports || []).forEach(r => { if (r.date && isDailyReport(r)) dateScore[r.date] = (dateScore[r.date] || 0) + 5; });

  // Last 35 days
  const today = new Date();
  const days = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), day: d.getDate(), month: d.getMonth() + 1, active: !!dateScore[d.toISOString().slice(0, 10)] });
  }

  container.innerHTML = days.map(d => `
    <div class="bear-day" title="${d.date}${d.active ? ' · 已练习' : ''}" onclick="showBearDay('${d.date}',${d.active})">
      <img class="bear-img" src="${d.active ? '/bear-active.png' : '/bear-default.png'}" alt="${d.active ? '🐻' : '🌱'}" loading="lazy"
        onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<span style=display:flex;align-items:center;justify-content:center;width:36px;height:36px;min-width:36px;min-height:36px;border-radius:50%;background:var(--border-light);font-size:18px>${d.active ? '🐻' : '🌱'}</span>')" />
      <span class="bear-date">${d.month}/${d.day}</span>
    </div>
  `).join('');

  setTimeout(() => { container.scrollLeft = container.scrollWidth; }, 100);
}

// ═══════════════════════════════════════════════════════
// TAB 2: WORDS
// ═══════════════════════════════════════════════════════
async function loadWords() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const today = new Date().toISOString().slice(0, 10);

  document.getElementById('words-content').innerHTML = LoadingState();

  const [{ data: vocab }, { data: errors }] = await Promise.all([
    sb.from('vocabulary').select('*').order('created_at', { ascending: false }),
    sb.from('errors').select('*')
  ]);
  _errorsAll = errors || [];

  // Deduplicate by word — keep most recent entry (first in desc order)
  const seen = new Map();
  _wordsAll = (vocab || []).filter(v => {
    const key = (v.word || '').toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.set(key, true);
    return true;
  });

  // SRS review entry
  const dueCount = _wordsAll.filter(v => {
    if (v.status === 'mastered' || v.mastered) return false;
    if (!v.next_review_date) return true;
    return v.next_review_date <= today;
  }).length;

  const entry = document.getElementById('words-review-entry');
  const sub = document.getElementById('words-review-sub');
  if (dueCount > 0) {
    entry.style.display = 'flex';
    sub.textContent = `${dueCount} 个单词待复习`;
  } else {
    entry.style.display = 'none';
  }

  // Determine active filter from URL/state
  const mode = _activeFilter || 'all';
  _wordsFilter = mode;
  renderWordsSubTabs(mode);
  renderVocabList(getFilteredVocab(_wordsAll, mode));
}

// ── Words list ─────────────────────────────────────────
let _wordsAll = [];
let _errorsAll = [];
let _wordsFilter = 'all';

// ── Words sub-tab helpers ────────────────────────────
function renderWordsSubTabs(activeMode) {
  const el = document.getElementById('words-subtabs');
  el.style.display = 'flex';
  const today = new Date().toISOString().slice(0,10);
  const todayCount = _wordsAll.filter(v => v.date_added === today).length;
  // Cross-reference errors with vocab
  const errWords = new Set();
  _errorsAll.forEach(e => {
    const text = ((e.original||'') + ' ' + (e.correction||'')).toLowerCase();
    _wordsAll.forEach(v => { if (text.includes(v.word.toLowerCase())) errWords.add(v.word.toLowerCase()); });
  });
  const errorCount = errWords.size;
  const tabs = [
    { key:'all', label:'全部词库', count:_wordsAll.length },
    { key:'today', label:'今日新词', count:todayCount },
    { key:'errors', label:'高频错词', count:errorCount },
  ];
  el.innerHTML = tabs.map(t =>
    `<span class="lib-subtab${t.key===activeMode?' active':''}" data-words-filter="${t.key}" onclick="switchWordsView('${t.key}')">${t.label}<small style="opacity:0.6;margin-left:3px">${t.count}</small></span>`
  ).join('');
}

function switchWordsView(mode) {
  _wordsFilter = mode;
  // Update URL without touching global _activeFilter (state isolation)
  if (mode === 'all') {
    window.history.replaceState({}, '', '/?tab=words');
  } else {
    window.history.replaceState({}, '', `/?tab=words&wordsView=${mode}`);
  }
  renderWordsSubTabs(mode);
  renderVocabList(getFilteredVocab(_wordsAll, mode));
}

function getFilteredVocab(items, mode) {
  const today = new Date().toISOString().slice(0,10);
  if (mode === 'today') return items.filter(v => v.date_added === today);
  if (mode === 'errors') {
    const errWords = new Set();
    _errorsAll.forEach(e => {
      const text = ((e.original||'') + ' ' + (e.correction||'')).toLowerCase();
      items.forEach(v => { if (text.includes(v.word.toLowerCase())) errWords.add(v.word.toLowerCase()); });
    });
    return items.filter(v => errWords.has(v.word.toLowerCase()));
  }
  return items;
}

function clearWordsFilter() {
  _wordsFilter = 'all';
  document.getElementById('words-subtabs').style.display = 'none';
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

  return `<div class="vocab-card">
    <div class="card-row"><span class="word">${h(v.word)}</span><span class="phonetic">${h(v.phonetic)}</span></div>
    <div class="meaning">${h(v.meaning)}</div>
    ${v.example ? `<div class="example">💬 ${h(v.example)}</div>` : ''}
    <div class="card-actions">
      <div class="card-toolbar">
        <div class="card-toolbar-left">
          ${srsHtml}
          <span style="font-size:10px;color:var(--text-ultradim);">${rc} 次</span>
          ${btn}
        </div>
        <div class="card-toolbar-right">
          ${sourceLabel}${errInfo}
          <button onclick="speakWord('${h(v.word).replace(/'/g, "\\'")}');event.stopPropagation();" class="btn-soft">${ICO_SPEAKER}</button>
        </div>
      </div>
    </div>
    <div class="card-detail"><div class="card-detail-row"><strong>状态：</strong>${statusLabel(s)}</div><div class="card-detail-row"><strong>添加：</strong>${v.date_added || ''}</div><div class="card-detail-row"><strong>复习：</strong>${v.review_count || 0} 次</div></div>
  </div>`;
}

// ── SRS Flashcard Review ──────────────────────────────
let _reviewDeck = [];
let _reviewIdx = 0;
let _reviewResults = [];

async function startWordsReview() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const today = new Date().toISOString().slice(0, 10);
  const { data: vocab } = await sb.from('vocabulary').select('*');
  _reviewDeck = (vocab || [])
    .filter(v => { if (v.status === 'mastered' || v.mastered) return false; if (!v.next_review_date) return true; return v.next_review_date <= today; })
    .sort((a, b) => (a.next_review_date || '0000') < (b.next_review_date || '0000') ? -1 : 1);
  _reviewIdx = 0; _reviewResults = [];

  if (_reviewDeck.length === 0) {
    showToast('🎉 没有需要复习的单词！');
    return;
  }

  document.getElementById('words-review-active').style.display = 'block';
  document.getElementById('words-review-summary').style.display = 'none';
  document.getElementById('words-review-entry').style.display = 'none';
  document.getElementById('words-content').style.display = 'none';
  document.getElementById('words-search').parentElement.style.display = 'none';
  showWordsCard(0);
}

function showWordsCard(idx) {
  _reviewIdx = idx;
  const v = _reviewDeck[idx];
  const total = _reviewDeck.length;
  document.getElementById('words-review-progress-text').textContent = `${idx + 1}/${total}`;
  document.getElementById('words-review-progress-fill').style.width = `${((idx + 1) / total) * 100}%`;
  document.getElementById('fc-word').textContent = v.word;
  document.getElementById('fc-phonetic').textContent = v.phonetic || '';
  document.getElementById('fc-word-back').textContent = v.word;
  document.getElementById('fc-meaning').textContent = v.meaning || '';
  document.getElementById('fc-example').textContent = v.example ? `💬 ${v.example}` : '';
  document.getElementById('fc-meta').textContent = `复习 ${v.review_count || 0} 次 · ${statusLabel(v.status || (v.mastered ? 'mastered' : 'new'))}`;
  document.getElementById('words-flashcard-inner').classList.remove('flipped');
  document.getElementById('words-review-actions').style.display = 'none';
  document.getElementById('btn-words-reveal').style.display = 'block';
}

function flipWordsCard() {
  document.getElementById('words-flashcard-inner').classList.add('flipped');
  document.getElementById('words-review-actions').style.display = 'flex';
  document.getElementById('btn-words-reveal').style.display = 'none';
  speakWord(_reviewDeck[_reviewIdx].word);
}

async function rateWordsCard(rating) {
  const v = _reviewDeck[_reviewIdx];
  const today = new Date();
  const qMap = { 'again': 0, 'good': 3, 'easy': 5 };
  const quality = qMap[rating] || 3;
  const result = sm2(v.ease_factor, v.sm2_interval, v.sm2_repetitions, quality);
  const nextDate = new Date(today); nextDate.setDate(nextDate.getDate() + result.interval);
  const status = rating === 'again' ? 'learning' : (result.repetitions >= 5 ? 'mastered' : 'learning');
  await sb.from('vocabulary').update({
    status, mastered: status === 'mastered',
    ease_factor: result.ease_factor, sm2_interval: result.interval, sm2_repetitions: result.repetitions,
    review_count: (v.review_count || 0) + 1, next_review_date: nextDate.toISOString().slice(0, 10),
    last_reviewed_at: today.toISOString()
  }).eq('id', v.id);
  _reviewResults.push({ word: v.word, rating });
  if (_reviewIdx + 1 < _reviewDeck.length) { showWordsCard(_reviewIdx + 1); } else { endWordsReview(); }
}

function endWordsReview() {
  document.getElementById('words-review-active').style.display = 'none';
  document.getElementById('words-review-summary').style.display = 'block';
  const total = _reviewResults.length;
  const mastered = _reviewResults.filter(r => r.rating === 'easy').length;
  const learning = _reviewResults.filter(r => r.rating === 'good').length;
  const again = _reviewResults.filter(r => r.rating === 'again').length;
  document.getElementById('words-review-summary-stats').innerHTML = `
    复习 <strong>${total}</strong> 个单词<br>
    ✅ 简单 <strong>${mastered}</strong> · 👍 不错 <strong>${learning}</strong> · 🔄 再来 <strong>${again}</strong>
  `;
}

function doneWordsReview() {
  document.getElementById('words-review-summary').style.display = 'none';
  document.getElementById('words-search').parentElement.style.display = 'flex';
  document.getElementById('words-content').style.display = 'block';
  loadWords();
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
  const { data: v } = await sb.from('vocabulary').select('*').eq('id', id).single();
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
async function loadSpeak() {
  document.getElementById('speak-content').innerHTML = LoadingState();
  const { data: patterns } = await sb.from('patterns').select('*').order('created_at', { ascending: false });
  _speakAll = (patterns && patterns.length) ? patterns : mockPatterns;

  // Apply filter from URL or global state
  if (_activeFilter) {
    const label = decodeURIComponent(_activeFilterLabel || _activeFilter);
    showSpeakFilterBar(label);
    const q = _activeFilter.toLowerCase();
    const filtered = _speakAll.filter(p =>
      (p.source_topic || '').toLowerCase().includes(q) ||
      (p.better || '').toLowerCase().includes(q) ||
      (p.scene || '').toLowerCase().includes(q)
    );
    renderSpeakFocused(filtered, _activeFilter);
  } else {
    hideSpeakFilterBar();
    renderSpeakList(_speakAll);
  }
}

let _speakAll = [];
function renderSpeakList(items) {
  const container = document.getElementById('speak-content');
  const q = (document.getElementById('speak-search')?.value || '').trim().toLowerCase();
  let filtered = items;
  if (q) filtered = items.filter(p => [p.better, p.original, p.scene].some(f => f && f.toLowerCase().includes(q)));

  if (!filtered.length) {
    container.innerHTML = EmptyState({ message: q ? `没有找到"${q}"相关的表达` : '暂无地道表达，去导入日报吧～', size: 80 });
    return;
  }

  container.innerHTML = filtered.map(p => `
    <div class="expression-card">
      <div class="expr-better">${h(p.better)}</div>
      <div class="expr-orig">代替: ${h(p.original)}</div>
      ${p.scene ? `<div class="expr-scene">🎬 ${h(p.scene)}</div>` : ''}
      <div class="expr-actions">
        <button class="btn-speak-secondary" onclick="speakWord('${h(p.better).replace(/'/g, "\\'")}');event.stopPropagation();">${ICO_SPEAKER} 听发音</button>
        <button class="btn-speak-primary" onclick="startShadowFromSpeak();event.stopPropagation();">${ICO_MIC} 跟读</button>
      </div>
    </div>
  `).join('');
}

// ── Speak Focus Mode ──────────────────────────────────
function showSpeakFilterBar(label) {
  const bar = document.getElementById('speak-filter-bar');
  document.getElementById('speak-filter-label').textContent = `正在专注练习：${label}`;
  bar.classList.remove('hidden');
  // Hide search bar in focus mode
  const searchWrap = document.querySelector('#tab-speak .lib-search-wrap');
  if (searchWrap) searchWrap.style.display = 'none';
  refreshIcons(bar);
}

function hideSpeakFilterBar() {
  const bar = document.getElementById('speak-filter-bar');
  if (bar) bar.classList.add('hidden');
  const searchWrap = document.querySelector('#tab-speak .lib-search-wrap');
  if (searchWrap) searchWrap.style.display = '';
}

function clearSpeakFilter() {
  _activeFilter = null;
  _activeFilterLabel = '';
  window.history.replaceState({}, '', '/');
  loadSpeak();
}

function renderSpeakFocused(items, filterKey) {
  const container = document.getElementById('speak-content');
  if (!items.length) {
    container.innerHTML = EmptyState({ message: `没有"${filterKey}"相关的表达`, size: 80 });
    return;
  }

  container.innerHTML = items.map((p, i) => `
    <div class="bg-[var(--c-surface)] rounded-2xl p-5 mb-4 border border-[var(--c-border-light)] opacity-0 animate-[fadeInUp_0.3s_ease-out_forwards]" style="animation-delay:${i*0.04}s;box-shadow:var(--c-shadow-sm)">
      <div class="font-[Georgia,serif] text-[21px] italic text-[var(--c-text)] leading-[1.6] mb-3">${h(p.better)}</div>
      <div class="text-[13px] text-[var(--c-text-dim)] mb-1">代替：${h(p.original)}</div>
      ${p.scene ? `<div class="text-[12px] text-[var(--c-text-ultradim)] mb-3">🎬 ${h(p.scene)}</div>` : '<div class="mb-3"></div>'}
      ${p.source_topic ? `<span class="inline-block px-2.5 py-0.5 bg-[var(--c-green-light)] text-[var(--c-green)] rounded-full text-[10px] font-medium mb-3">${h(p.source_topic)}</span>` : ''}
      <div class="flex gap-3 pt-3 border-t border-[var(--c-border-light)]">
        <button class="flex-1 inline-flex items-center justify-center gap-1.5 py-3 bg-[var(--c-blue-light)] text-[var(--c-blue)] border-0 rounded-xl text-[13px] font-semibold cursor-pointer active:scale-[0.97] transition-transform" onclick="speakWord('${h(p.better).replace(/'/g, "\\'")}');event.stopPropagation()">
          ${icon('volume-2','w-4 h-4')} 听发音
        </button>
        <button class="flex-[1.5] inline-flex items-center justify-center gap-1.5 py-3 bg-[var(--c-primary)] text-white border-0 rounded-xl text-[13px] font-bold cursor-pointer active:scale-[0.97] transition-transform" onclick="startShadowFromSpeak();event.stopPropagation()">
          ${icon('mic','w-4 h-4')} 跟读
        </button>
      </div>
    </div>
  `).join('');
  refreshIcons(container);
}

// ── Shadow Speaking ────────────────────────────────────
let _shadowDeck = []; let _shadowIdx = 0; let _shadowRatings = {};

async function startShadowMode() {
  const [{ data: patterns }, { data: vocab }] = await Promise.all([
    sb.from('patterns').select('*'), sb.from('vocabulary').select('*').not('example', 'is', null)
  ]);
  _shadowDeck = [];
  (patterns || []).forEach(p => { if (p.better) _shadowDeck.push({ phrase: p.better, context: p.scene || p.original || '', source: 'pattern' }); });
  (vocab || []).forEach(v => { if (v.example) _shadowDeck.push({ phrase: v.example, context: `${v.word}: ${v.meaning || ''}`, source: 'vocab' }); });

  if (_shadowDeck.length === 0) { showToast('暂无跟读内容，请先导入日报'); return; }

  _shadowIdx = 0; _shadowRatings = {};
  document.getElementById('speak-shadow').style.display = 'block';
  document.getElementById('speak-actions').style.display = 'none';
  document.getElementById('speak-content').style.display = 'none';
  document.getElementById('speak-search').parentElement.style.display = 'none';
  document.getElementById('speak-shadow-summary').style.display = 'none';
  showShadowPhrase(0);
}

function startShadowFromSpeak() {
  // Already on the speak tab — start shadow mode directly
  startShadowMode();
}

function showShadowPhrase(idx) {
  _shadowIdx = idx;
  const item = _shadowDeck[idx];
  document.getElementById('speak-shadow-progress').textContent = `${idx + 1} / ${_shadowDeck.length}`;
  document.getElementById('speak-shadow-phrase').textContent = item.phrase;
  document.getElementById('speak-shadow-context').textContent = item.context || '';
  document.getElementById('btn-speak-play').style.display = 'block';
  document.getElementById('btn-speak-next').style.display = 'none';
  document.getElementById('speak-self-rate').style.display = 'none';
}

function speakShadowPhrase() {
  speakWord(_shadowDeck[_shadowIdx].phrase);
  document.getElementById('btn-speak-play').style.display = 'none';
  document.getElementById('btn-speak-next').style.display = 'block';
  document.getElementById('speak-self-rate').style.display = 'flex';
}

function nextShadowPhrase() {
  if (_shadowIdx + 1 < _shadowDeck.length) { showShadowPhrase(_shadowIdx + 1); } else {
    document.getElementById('speak-shadow-summary').style.display = 'block';
    document.getElementById('speak-shadow').style.display = 'none';
  }
}

function restartShadow() {
  _shadowIdx = 0; _shadowRatings = {};
  document.getElementById('speak-shadow-summary').style.display = 'none';
  document.getElementById('speak-shadow').style.display = 'block';
  showShadowPhrase(0);
}

function doneShadow() {
  document.getElementById('speak-shadow-summary').style.display = 'none';
  document.getElementById('speak-search').parentElement.style.display = 'flex';
  document.getElementById('speak-content').style.display = 'block';
  document.getElementById('speak-actions').style.display = 'flex';
  loadSpeak();
}

function rateShadow(rating) {
  _shadowRatings[_shadowIdx] = rating;
  // Visual feedback
  document.querySelectorAll('.self-rate-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.self-rate-btn[data-rate="${rating}"]`).classList.add('active');
  setTimeout(() => nextShadowPhrase(), 300);
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
function showErrorPatterns(errors) {
  const grp = document.getElementById('error-patterns-group');
  grp.classList.remove('hidden');
  const epDiv = document.getElementById('error-patterns');
  const patternCount = {};
  errors.forEach(e => {
    (e.error_pattern || '其他').split(',').map(s => s.trim()).filter(Boolean).forEach(p => {
      patternCount[p] = (patternCount[p] || 0) + 1;
    });
  });
  const sorted = Object.entries(patternCount).sort((a, b) => b[1] - a[1]);
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
  report: `请根据以下口语练习会话，生成 Voco 格式的日报：

---
type: daily-report
date: ${new Date().toISOString().slice(0, 10)}
topic: [话题名称]
duration: [分钟数]
---

## 语法纠正
- [我说] [原文]
- [应为] [纠正后]
- [规则] [语法规则说明]

## 发音纠正
- [问题] [发音有问题的词或短语]
- [纠正] [正确的发音方式]

## 地道表达
- [我说] [我的表达]
- [更自然] [更地道的说法]
- [场景] [使用场景]

## 核心句型
- [句型模板] | [例句]

## 今日生词
- word | /phonetic/ | 释义 | 例句

## 表现亮点
- [今天做得好的地方]

## 表现总结
- 流利度: X/10
- 准确度: X/10
- 自然度: X/10
- 需要加强: [需要加强的方面]

## 对话想法
- [对今天对话内容的思考和感悟]

## AI 复盘评语
- [整体评价和建议]

## 下一步建议
- [明天可以重点练什么]`,
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

  const parsed = parseReport(text);
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

  document.getElementById('dialog-report-input').value = '';
  if (btn) { btn.disabled = false; btn.textContent = '解析入库'; }
  if (resultEl) resultEl.innerHTML = '<span class="toast-success">✅ 导入成功！</span>';
  setTimeout(() => { hideImportDialog(); loadHome(); }, 1200);
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
    date_added: date, source_topic: topic, error_pattern: detectErrorPattern(e.original, e.correction)
  });
  for (const e of parsed.grammar) allErrors.push({
    user_id: uid, type: 'grammar', original: e.original || '', correction: e.correction || '',
    rule: e.rule || '', date_added: date, source_topic: topic, error_pattern: detectErrorPattern(e.original, e.correction)
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

function detectErrorPattern(original, correction) {
  if (!original || !correction) return '';
  const patterns = [];
  if (/\b(a|an|the)\b/i.test(original) && /\b(a|an|the)\b/i.test(correction) &&
      original.replace(/\b(a|an|the)\b/gi, '') !== correction.replace(/\b(a|an|the)\b/gi, '')) patterns.push('冠词');
  if (/(ed|ing|was|were|have|has|had|will)\b/i.test(original) || /(ed|ing|was|were|have|has|had|will)\b/i.test(correction)) patterns.push('时态');
  if (/\b(in|on|at|for|to|of|with|by|from)\b/i.test(correction) &&
      original.replace(/\b(in|on|at|for|to|of|with|by|from)\b/gi, '') === correction.replace(/\b(in|on|at|for|to|of|with|by|from)\b/gi, '')) patterns.push('介词');
  const oWords = original.toLowerCase().split(/\s+/).sort().join(' ');
  const cWords = correction.toLowerCase().split(/\s+/).sort().join(' ');
  if (oWords === cWords && original !== correction) patterns.push('语序');
  if (/(s|es)\b/i.test(original) !== /(s|es)\b/i.test(correction)) patterns.push('单复数');
  return patterns.join(',') || '其他';
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

// Search
document.getElementById('words-search')?.addEventListener('input', () => renderVocabList(getFilteredVocab(_wordsAll, _wordsFilter)));
document.getElementById('speak-search')?.addEventListener('input', () => renderSpeakList(_speakAll));

// Words SRS review
document.getElementById('btn-words-review-start')?.addEventListener('click', startWordsReview);
document.getElementById('btn-words-reveal')?.addEventListener('click', flipWordsCard);
document.getElementById('btn-words-again')?.addEventListener('click', () => rateWordsCard('again'));
document.getElementById('btn-words-good')?.addEventListener('click', () => rateWordsCard('good'));
document.getElementById('btn-words-easy')?.addEventListener('click', () => rateWordsCard('easy'));
document.getElementById('btn-words-review-done')?.addEventListener('click', doneWordsReview);

// Speak
document.getElementById('btn-shadow-mode')?.addEventListener('click', startShadowMode);
document.getElementById('btn-speak-play')?.addEventListener('click', speakShadowPhrase);
document.getElementById('btn-speak-next')?.addEventListener('click', nextShadowPhrase);
document.getElementById('btn-speak-repeat')?.addEventListener('click', () => speakShadowPhrase());
document.getElementById('btn-speak-shadow-done')?.addEventListener('click', doneShadow);
document.querySelectorAll('.self-rate-btn').forEach(b => {
  b.addEventListener('click', () => rateShadow(b.dataset.rate));
});

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
  navigator.serviceWorker.register('/sw.js?v=41');
}
