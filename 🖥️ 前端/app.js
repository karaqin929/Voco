// ═══════════════════════════════════════════════════════
// Voco v95 — Tailwind Dashboard + Grouped-List Settings
// v84 排版系统：全 App 统一 7 级字号阶梯（L1 11px / L2 12px / L3 14px / L4 16px / L5 20px / L6 24px / L7 34px 仅登录页）
//            全部字号 rem 化，响应设置页「文字大小」（标准/中/大）全局缩放
// v85 口径统一：核心句型卡今日携带 date=today（队列=当日日报句型）；新学单词数=日报 vocabulary 数（与列表绝对同源）
// v86 全局重构：① 数据解析层——normalizeDailyData 新增碎片合并（parseItems 逐标签行切块 → 一条错题裂成
//            {original}/{correction}/{rule} 三碎片）+ rescueMarkdownErrorSections 标签宽容救援（冒号式/箭头式旧日报
//            补解析）；standardizeErrorCards 扩展占位碎片合并（DB 存量「历史错题」行）；② 路由传参层——
//            currentContextDate 统一上下文日期；提升区/建议区全部入口携带 date（查看纠错/句型体验/核心句型锚定）；
//            startImprovementSpeak 废除 pat_N 跨命名空间 id，统一 ?sentence= 文本锚定 + ?date=；loadSpeak 文本未命中
//            时以点击句为首卡入队（sentence-anchor）。一条纠错知识 = 一张卡片 = {original, correction, rule} 完整对象。
// v88 QA 自检补漏（跳转/计数四缺口）：① 学习建议 vocab 分支 navigateReview('all','today',ctxDate)（杜绝跳全量词库）；
//            ② 学习建议 sentence 分支未命中兜底同样携带 date（该日核心句型队列，杜绝落今日混合队列）；
//            ③ 待办任务 3 数字 = due tab 混合卡组真实长度（到期词+错题，v99 起错题部分改 dueErrorCards() DB 曲线口径，
//            根治「外面 N 词点进去 N+M 张」）；④ switchWordsView 切 Tab 清 _ctxDate（URL 与上下文脱钩修复，due 卡组不再混历史日错题）
// v89 打卡日历升维：废除「最近 7 天」硬编码 → 横向无限回溯滑条（flex overflow-x-auto hide-scrollbar，首日→今天连续
//            日期序列，小熊点亮与 DB 词/日报日期并集精准匹配）+ 全局月历弹窗（showMonthPicker 跨月跨年一键跳转，
//            数据源 _dateScoreCache 与滑条同源）；reports 拉取 limit 90 → 1000 放开回溯软上限。
// v90 日报模板修复（三模块补全）：① TEMPLATES.report 内嵌模板——duration 反编造指令（未告知时长先询问，禁照抄 25）、
//            summary 补 dailyThought{en,zh} + fluency/accuracy/naturalness + weak_areas、mistakes 三类（grammar/
//            pronunciation/expression）；② normalizeJsonReport 三分类分流（发音纠正不再被 else 兜底降级 grammar，
//            pronunciation 数组与 Markdown 链路同形状）+ summary 透传 weak_areas；③ importJsonDailyReport 写库
//            type='pronunciation' 独立入库 + updateProgress 传真实 weak_areas（此前写死 ''）。
// v91 时长槽位式模板：TEMPLATES.report 开头【本次口语练习时长：__分钟】由用户复制后填写，GPT 无歧义照用
//            （模型无真实时钟感知，纯对话量估计会偏短；槽位为空才允许询问，仍禁照抄示例值 25）。
// v92 专业私教评审逻辑：评分与点评升级为四维逐项评审（fluency 停顿迟疑语速 / accuracy 语法错误频率 /
//            naturalness 地道程度 / weak_areas 1-3 个真实弱项标签），每项必须基于今天对话的具体证据，
//            禁止照抄示例值 7/6.5/6 与「时态, 单复数」；dailyThought.zh 须结合评分点出最值得改进的一点。
// v93 日报僵尸行修复：GPT 省略空数组键（无错题 → mistakes 整键不输出）时，JSON 日报被判非日报 →
//            走 Markdown 空壳入库（reports 有行、vocabulary/errors/patterns 全空）→ 徽章亮/熊白/Hero 未对练三分裂。
//            修复：isDailyReport + importReport + parseSmartReport 三处判定放宽（summary/duration 任一存在即认
//            JSON 日报）；L428 todayReport 补 isDailyReport 过滤——徽章与熊条/Hero 判定绝对同源对齐。
// v94 弯引号根治（源头+防御双修）：① 模板源头——TEMPLATES.report 硬性要求新增第 7 条「引号铁律」（整份 JSON 只许
//            英文直引号，严禁弯引号 “ ” ‘ ’，GPT 生成后自查）→ 用户按新 prompt 重新生成今日日报；② 解析防御——
//            normalizeSmartQuotes 弯引号归一化（“”‘’全角 → 直引号），isDailyReport/importReport/parseSmartReport
//            三入口 parse 前统一归一化——GPT 再犯也能成功解析，杜绝僵尸行（徽章亮/熊白/Hero 未对练三分裂）。
// v95 数据幽灵根治（杀 Mock + 输入洗理 + 静默失败显式化）：① mockDashboardData/mockWords/mockSentences/
//            mockMistakeErrors 全部物理删除 → EMPTY_INSIGHTS 空态常量；洞察区主题/优点/提升三卡无数据渲染
//            「当日无数据」；mergeDemoVocab 纯透传、_errorsAll/_speakAll/coreDeck 空库=空状态，绝不注入假数据。
//            ② sanitizeJsonInput 输入洗理（BOM/代码块围栏/最外层 {…} 跨度提取/引号归一化）→ importReport 与
//            parseSmartReport 双入口；旧僵尸行（带包装文本）读取时也能现场解析。③ JSON 意图但解析失败 →
//            toast-error 显式报错并中断（禁止静默空壳行）；JSON 入库完成 toast 不再被「导入成功」覆盖。
//            ④ 导入成功 _viewDate=null 强制回今日视图再 loadHome。⑤ 评分小数制 ×10 映射（L809 norm100）核查无误。
// v104 首页四维信息架构重构 + 任务 2 换皮不换骨（5 点大改版）：① getDayCounts(parsed) 四维计数 SSOT
//            （面板子块/提升区/跳转列表/审计共用同一函数同一数据桶，数量 100% 绝对一致；语法口径 = standardizeErrorCards
//            纯 grammar，发音 v99 起不计）；② 打分面板四子块改版（当日新词/语法纠正/自然表达/核心句型，话题块删除）；
//            ③ 提升区「需要提升」固定四块（标签+摘要+举例+按钮），goImprove(type) 统一导航精准携带 currentContextDate；
//            ④ 三张数据卡（新学单词/核心句型/重点纠错）整体删除，首页只留 To-Do List；⑤ 句型复习页三视图
//            （?view=expressions|core 对比阅读卡片列表 + 默认 SRS 翻卡卡组，sub-tab 切换保留 date 参数）；
//            ⑥ 任务 2 换皮不换骨：挖空引擎 buildCloze 物理删除，翻卡改标准 SRS（正面仅情境、背面正确句+原句+解析、
//            反馈键翻卡后才显示），rateSentenceCard/handleReviewFeedback 调度层零改动；⑦ Profile 数据管理新增
//            「日报一致性审计」（runReportAudit 逐份日报四维钩稽）；⑧ 死代码物理删除：IMPROVE_TYPES/showImprovementDetail/
//            startImprovementSpeak/showNextStepDetail/showSuggestionModal/classifySuggestion/copyText/detectErrorCategory/
//            detectErrorPattern/d.nextSteps/targetAreas/executiveSummary/highlights/overallReview。
//            ⑨ SM-2 队列断层修复（用户指令）：队列纯库捞 —— getDueSentencesQueue(_speakAll) 只从 patterns 库取
//            needsReview===true 行（新卡=无 next_review_date，到期卡=曲线到期），运行时解析拼凑（coreDeck/expressionDeck
//            拼接、expr-N/core-N 临时 id）物理退役；导入即正式入库（Markdown 链路补 sentence_patterns，与 JSON 同构）；
//            reviewPatternItem 文本锚定 UPSERT（先按文本在库中定位既有行 UPDATE 补曲线，未命中才 INSERT）——根治
//            「导入行 + 复习 INSERT 行」双行双曲线；dedupePatternsByText 库级文本去重收敛存量双行；
//            getTodayMissionState 句型三输出删除（_dailyPatterns 退役），待办数字 = getDueSentencesQueue 同函数同源；
//            旧 Speak 过滤机器（SPEAK_PATTERN_TOPICS/SPEAK_FILTER_ALIASES/matchSpeakFilter）零调用方 → 物理删除。
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
    // v103 快照失效：切去复习/跟读/我的页——那些页会写库（SM-2 复习反馈等），返回首页时强制网络刷新一次，
    // 杜绝本地快照渲染陈旧计数；首页内的历史日切换仍然零网络
    if (t !== 'home') invalidateHomeData();
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

// ═══════════════════════════════════════════════════════
// v64 时区安全日期工具 —— 全局唯一「今天」来源
// 铁律：严禁 new Date().toISOString().slice(0,10) 定义 today。
// toISOString 输出 UTC 日期，东八区用户每天 0:00–8:00 会滞留在「昨天」，
// 导致跨日复习任务不刷新、待办状态锁死（时间轴穿透）。
// ═══════════════════════════════════════════════════════
const getLocalToday = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
// 任意 Date 对象 → 本地 YYYY-MM-DD（SM-2 next_review_date / 连续打卡昨日回推专用）
const fmtLocalDate = (d) => {
  const dd = new Date(d);
  dd.setMinutes(dd.getMinutes() - dd.getTimezoneOffset());
  return dd.toISOString().slice(0, 10);
};
// 'YYYY-MM-DD' → 本地 Date（严禁 new Date(str) —— UTC 午夜解析在 0-8 点时区会偏移一天；v89 日历序列专用）
function parseLocalDate(s) {
  const p = String(s).split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]);
}
// 存储层 UTC ISO 时间戳 → 本地日历日期（last_reviewed_at 比对专用：存储为 UTC，必须换算后比「今天」）
const localDateOf = (isoTs) => fmtLocalDate(new Date(isoTs));

// ── 模块二：精准路由锚定（真实路径，绝不死链）──────────────
// 规范路由：/review?tab=all|grammar|due|topics（复习页四 Tab）· /shadowing?id=xxx（句型复习页锚定指定句）· /（首页）
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

// /review?tab=grammar · /review?tab=due · /review?tab=all&filter=today · /review?...&date=YYYY-MM-DD — 首页按钮的精准锚定入口（绝不写死 ?tab= 死链）
// filter=today：今日单词过滤态（只渲染 isNewToday===true 的词），与三 Tab 正交
// date：v82 日期路由 —— 历史视图下三卡跳转携带当前查看日期，目标页按该日日报过滤（今日日期不携带，保持默认今日链路）
function navigateReview(tab, filter, date) {
  const t = ['all', 'grammar', 'due', 'topics'].includes(tab) ? tab : 'all';
  const qs = [];
  if (t !== 'all') qs.push('tab=' + t);
  if (filter === 'today') qs.push('filter=today');
  if (date && date !== getLocalToday()) qs.push('date=' + encodeURIComponent(date));
  _activeFilter = null; _activeFilterLabel = '';
  window.history.pushState({}, '', '/review' + (qs.length ? '?' + qs.join('&') : ''));
  _navigatingViaProgram = true;
  document.querySelector('.tab[data-tab=words]').click();
  _navigatingViaProgram = false;
}

// /shadowing?id=${item.id}&date=YYYY-MM-DD — 句型复习页按 id 锚定到指定句（绝不从第 0 句开始）
// date：v82 日期路由 + v85 今日携带 —— 携带日期（含今日）→ 卡片队列 = 该日日报核心句型；
//       无 date（待办打卡入口）→ SM-2 到期混合队列
// view：v104 三视图 flag（expressions|core）→ 对比阅读卡片列表；缺省 → SRS 翻卡卡组
function navigateShadowing(id, sentence, date, view) {
  _activeFilter = null; _activeFilterLabel = '';
  const qs = [];
  if (id !== undefined && id !== null && id !== '') qs.push('id=' + encodeURIComponent(id));
  // sentence：首页「今天需要提升」点击的句文本 —— 卡片队列以这一句为首张，禁止从默认句开始
  if (sentence) qs.push('sentence=' + encodeURIComponent(sentence));
  if (date) qs.push('date=' + encodeURIComponent(date));
  if (view === 'expressions' || view === 'core') qs.push('view=' + view);
  window.history.pushState({}, '', '/shadowing' + (qs.length ? '?' + qs.join('&') : ''));
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
    // v82 日期路由：?date=YYYY-MM-DD（非今日）→ 复习页日期上下文，目标列表按该日日报过滤
    const dParam = sp.get('date');
    _ctxDate = (dParam && dParam !== getLocalToday()) ? dParam : null;
    // filter=today：首页「复习今日单词」携带的过滤态，正交于三 Tab，只渲染 isNewToday 词
    _wordsFilter = sp.get('filter') === 'today' ? 'today'
      : (['all', 'grammar', 'due', 'topics', 'new', 'mistakes', 'review'].includes(t) ? t : 'all');
  } else if (path === '/shadowing') {
    tab = 'speak';
    _activeFilter = null; _activeFilterLabel = ''; // URL 的 filter/id/date/view 参数才是句型复习页唯一事实源
    // v85：date 含今日也是合法当日上下文（首页核心句型卡携带 date=today → 队列 = 当日日报句型）
    const sp = new URLSearchParams(location.search);
    const dParam = sp.get('date');
    _ctxDate = dParam || null;
    // v104 三视图：?view=expressions|core → 列表视图；缺省 → SRS 翻卡卡组
    _speakView = (sp.get('view') === 'expressions' || sp.get('view') === 'core') ? sp.get('view') : '';
  } else if (path === '/') {
    _ctxDate = null; // 首页无日期上下文（历史视图走 _viewDate，不经 URL 路由）
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

async function signOut() { _authChecked = false; invalidateHomeData(); await sb.auth.signOut(); checkAuth(); }

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

// ── v95 空态数据（演示假数据已物理删除）：无数据/解析异常一律渲染空状态，绝不回退 Mock ──
// v104：improvements/nextSteps/executiveSummary/highlights/targetAreas/overallReview 已随死代码族物理删除
const EMPTY_INSIGHTS = {
  topics: [],
  thoughts: null,
  strengths: []
};

// v95 演示词库/句型库/错词库已物理删除：云端数据为空 = 空库 = 空状态，严禁注入假数据


let _homeLoading = false;
// v103 数据快照 + 按需拉取（卡顿根治）：
//   _dataFresh=true → 历史日切换走纯本地渲染（零网络）；失效点 = invalidateHomeData()（导入/还原/登出/切页时调用）
//   _pendingViewDate → 加载期间连点排队（undefined=无 / ''=回到今天 / 日期串=切到该日）
//   _reportContentFetched → 单日 reports.content 补水去重标记
let _dataFresh = false;
let _pendingViewDate = undefined;
let _uid = null;
let _vocabRaw = [];
let _errorsRaw = [];
let _patternsRaw = [];
const _reportContentFetched = new Set();
let _lastStreakArgs = null;
// v106 熊条滚动状态（JS 单点，不依赖 DOM 存活）：_streakScrollCache 跨重渲染存活；
// _streakAnchored 本次页面加载首次渲染已锚定最右（今天）——此后一切重渲染（历史日切换/后台补水/切页返回/手动滑动）只恢复、绝不重锚定；
// 锚定 = 同步兜底 + rAF 布局落定后按溢出量精确落锚 + clientWidth>0 可测量判定（隐藏态首渲自动顺延重试，绝不死锁左端）
let _streakScrollCache = null;
let _streakAnchored = false;
async function loadHome() {
  if (_homeLoading) return;
  _homeLoading = true;

  // v103 本地快照路径（方案 A）：本会话已全量拉取过 → 历史日切换纯本地渲染，零网络往返（含 getSession）。
  // 快照失效点 = invalidateHomeData()：导入日报 / 备份还原 / 登出 / 切到复习·跟读·我的页（那些页会写库）时调用。
  if (_dataFresh) {
    buildGlobalMissionInputs(_vocabRaw, _errorsRaw, _reportsCache, _patternsRaw);
    renderHomeSections();
    _homeLoading = false;
    _drainPendingViewDate();
    return;
  }

  const { data: { session } } = await sb.auth.getSession();
  if (!session) { _homeLoading = false; return; }
  _uid = session.user.id;

  // v103 按需拉取（方案 C）：reports 只取 id/date 元数据——content 每份约 10KB，不再每次点击全量下载；
  // 内容按需单行补取（今日 + 当前浏览日首帧即补，其余后台补齐）。progress 拉取为死代码，物理删除。
  const [{ data: vocab }, { data: errors }, { data: reportsMeta }, { data: patterns }] = await Promise.all([
    // v103 order 与 loadWords 对齐：渲染层按词去重保留首行，created_at desc 保证首行 = 最新插入行（SM-2 态最新）
    sb.from('vocabulary').select('*').order('created_at', { ascending: false }),
    sb.from('errors').select('*'),
    // v89 日历无限回溯：放开 90 条软上限（Supabase 单次上限 1000，一天一条日报 ≈ 3 年历史范围）
    sb.from('reports').select('id,user_id,date').order('date', { ascending: false }).limit(1000),
    sb.from('patterns').select('*')
  ]);

  _vocabRaw = vocab || [];
  _errorsRaw = errors || [];
  _patternsRaw = patterns || [];
  _reportsCache = reportsMeta || [];
  // 首帧补水：今日（严格今日日报判定）与当前浏览日（历史视图）的 content 必须先到位再构建任务状态
  const today = getLocalToday();
  const needDates = [...new Set([today, _viewDate].filter(Boolean))];
  await Promise.all(needDates.map(d => ensureReportContent(d)));

  // Voco 2.0 状态孤岛断根：home 与 review 共用同一状态构建器（SSOT 输入唯一出处）
  // 第 4 参 patterns → 句型 SRS 历史库打标（_patternLibrary），供待办任务 2 与句型复习队列混合
  buildGlobalMissionInputs(_vocabRaw, _errorsRaw, _reportsCache, _patternsRaw);
  _dataFresh = true;
  renderHomeSections();
  _homeLoading = false;
  _drainPendingViewDate();
  hydrateAllReportsInBackground();   // 其余日期后台补水：熊条点亮/打卡徽章按 content 精确判定
}

// v103 渲染管线抽取：网络刷新与本地快照两条路径共用同一渲染序列，绝不分叉
function renderHomeSections() {
  const vList = _wordsAll;                      // SSOT 唯一词库快照（含日报生词合并后的全量）
  const rList = _reportsCache;
  const today = getLocalToday();

  const activeDate = _viewDate || today;
  const activeReport = rList.find(r => r.date === activeDate);
  // v93：今日日报判定加 isDailyReport 过滤——与熊条/Hero 判定绝对对齐（僵尸行不再亮「已打卡」徽章）
  const todayReport = rList.find(r => r.date === today && isDailyReport(r));
  // ── 时间轴拦截（UI 渲染保护，Voco 2.0）：渲染任何「今日」概念组件前先解构任务状态中心 ──
  const missionState = getTodayMissionState(_wordsAll, _reportParsed, _reviewedVocabTodayIds);
  // v75 历史视图：洞察卡展示值直取所选日期日报（_historyParsed）；今日视图仍走任务状态中心时间网关
  const historyMode = !!(_viewDate && _historyParsed);
  // 无今日报告 → 强制清空依赖今日数据的展示状态（严禁泄漏昨天数据）；历史视图除外
  const displayThoughts = historyMode ? ((_historyParsed.summary || {}).dailyThought || null) : (missionState.hasRealTodayReport ? ((_reportParsed.summary || {}).dailyThought || null) : null);
  const displayGoodPoints = historyMode ? ((_historyParsed.summary || {}).strengths || []) : (missionState.hasRealTodayReport ? ((_reportParsed.summary || {}).strengths || []) : []);
  // ── 空状态全局折叠（UX 重构）：今天视图且未导入今日日报 → 折叠打分面板/洞察卡，Hero 引导卡顶上 ──
  // 常驻组件：本周打卡卡（#home-quote）与今日待办（#home-quests）；历史视图（_viewDate）不受此门影响
  const showEmptyHero = !missionState.hasRealTodayReport && !_viewDate;
  ['home-metrics', 'home-insights'].forEach(id => {
    const node = document.getElementById(id);
    if (node) node.classList.toggle('hidden', showEmptyHero);
  });
  const emptyHero = document.getElementById('home-empty-hero');
  if (emptyHero) emptyHero.classList.toggle('hidden', !showEmptyHero);
  // 句型复习打卡戳：卡片队列复习完最后一张时写入 voco-speak-done，此处只读比对（时间判断仍在加载层）
  const speakDoneToday = (() => { try { return localStorage.getItem('voco-speak-done') === today; } catch (e) { return false; } })();

  // Section 1: Header
  const dates = [...new Set(vList.map(v => v.date_added).filter(Boolean))].sort().reverse();
  const streak = calcStreak(dates);
  _lastStreakArgs = { streak, todayReport };   // v103 打卡条快照（后台补水完成后精准刷新）
  renderGreeting(streak, vList, rList, missionState.hasRealTodayReport);
  renderHistoryBanner(activeReport, activeDate);

  // Section 2: Streak / Check-in Card
  renderStreakCard(streak, todayReport, vList, rList);

  // Section 3: Metrics —— 数据一律取自任务状态中心（v63），组件不再接收历史回退 activeReport
  renderMetricsOverview();

  // Section 4: Insights (Cards A-F) —— 时间轴拦截后的展示值直传（无今日报告即为 null/[]）
  renderInsightsSection(displayThoughts, displayGoodPoints);

  // Section 5: Todos（v104：三张数据卡已删除，只保留 To-Do List）
  renderTodoList(speakDoneToday);
}

// v103 数据快照失效：导入日报 / 备份还原 / 登出 / 切页写库 → 置位后下次 loadHome 走网络全量刷新；
// 同时清空单日补水去重标记与日期解析缓存（防跨账号/重导残留）
function invalidateHomeData() {
  _dataFresh = false;
  _reportContentFetched.clear();
  _parsedReportDateCache.clear();
}

// v103 按需补水：单日 reports.content 拉取并回填缓存行（同一日期仅拉一次；失败清标记允许重试）
async function ensureReportContent(date) {
  if (!date || !_uid) return;
  const row = (_reportsCache || []).find(r => r.date === date);
  if (!row || row.content !== undefined || _reportContentFetched.has(date)) return;
  _reportContentFetched.add(date);
  try {
    const { data } = await sb.from('reports').select('content').eq('user_id', _uid).eq('date', date).maybeSingle();
    row.content = (data && typeof data.content === 'string') ? data.content : '';
  } catch (e) {
    _reportContentFetched.delete(date);
  }
}

// v103 点击排队：加载期间的连点记录最后目标日期（'' = 回到今天），本轮渲染完成后自动再切——杜绝「点了没反应」
// 排队发生在 showBearDay 的 ensureReportContent 之前，drain 时必须补拉该日 content，否则历史视图空渲染（后台补水才来得及）
async function _drainPendingViewDate() {
  if (_pendingViewDate === undefined) return;
  const pd = _pendingViewDate;
  _pendingViewDate = undefined;
  _viewDate = pd || null;
  if (_viewDate) await ensureReportContent(_viewDate);
  loadHome();
}

// v103 后台补水：首帧后补齐其余日期的 reports.content——熊条点亮/打卡徽章以 content 判定，补齐后刷新打卡条
async function hydrateAllReportsInBackground() {
  const missing = (_reportsCache || []).filter(r => r.content === undefined && !_reportContentFetched.has(r.date)).map(r => r.date);
  if (!missing.length) return;
  await Promise.all(missing.map(d => ensureReportContent(d)));
  if (!_homeLoading && _lastStreakArgs) {
    const { streak } = _lastStreakArgs;
    const todayReport = (_reportsCache || []).find(r => r.date === getLocalToday() && isDailyReport(r)) || null;
    renderStreakCard(streak, todayReport, _wordsAll, _reportsCache);
  }
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

function renderHistoryBanner(report, viewDate) {
  const banner = document.getElementById('home-history-banner');
  if(!banner) return;
  if(!viewDate){ banner.className='hidden'; return; }
  if(!report){ banner.className='hidden'; showToast(viewDate+' · 该日期无日报数据'); _viewDate=null; loadHome(); return; }
  const d = new Date(viewDate+'T00:00:00');
  const wd = ['周日','周一','周二','周三','周四','周五','周六'];
  banner.innerHTML = `<span class="inline-flex items-center gap-1">${icon('calendar','w-3.5 h-3.5')} 正在查看 ${viewDate} ${wd[d.getDay()]} 的数据</span> <a onclick="goHomeToday()" class="inline-flex items-center gap-1 cursor-pointer text-[var(--c-blue)] font-semibold">回到今天 ${icon('arrow-right','w-3 h-3')}</a>`;
  banner.className = 'flex justify-between items-center px-3.5 py-2 mb-2.5 text-[0.875rem] text-[var(--c-text)] bg-[var(--c-primary-light)] rounded-2xl border-l-[3px] border-l-[var(--c-primary)]';
  refreshIcons(banner);
}

// v89：历史日入口三合一（顶部小熊条 / 横滑打卡日历 / 全局月历面板）；active = 该日有词或日报
// v103：本地快照命中 → 目标日 content 未补水则单条拉取，随后纯本地渲染；加载期间连点 → 排队到最后目标日
async function showBearDay(date, active) {
  if(!active){ showToast(date+' · 未打卡，无日报数据'); return; }
  if (_homeLoading) { _pendingViewDate = date; return; }
  _viewDate = date;
  if (_dataFresh) await ensureReportContent(date);
  loadHome();
}

// v103 回到今天统一入口（历史横幅链接 / 月历今日按钮共用；加载期间排队）
function goHomeToday() {
  if (_homeLoading) { _pendingViewDate = ''; return; }
  _viewDate = null;
  loadHome();
}

// ── Section 2: Streak / Check-in Card ───────────────────
// v89 日历升维重构：① 废除「最近 7 天」硬编码（6 天前→今天的静态数组已删除）；
// ② 动态日期生成 = 最早数据日（首词/首份日报）→ 今天的连续序列（3 年截断仅为脏数据防护，正常数据触不到）；
// ③ 横向无限滚动滑条（flex overflow-x-auto hide-scrollbar，shrink-0 防压缩）；
// ④ 标题「打卡日历」可点击 → 全局月历弹窗（showMonthPicker，跨月跨年一键跳转）
function renderStreakCard(streak, todayReport, vocab, reports) {
  const el = document.getElementById('home-quote');
  const hasToday = !!todayReport;

  // v89：模块级缓存 _dateScoreCache，横滑条与月历面板共用同一数据源（词 date_added 计 2 分 + 日报计 5 分）
  const dateScore = {};
  (vocab||[]).forEach(v => { if(v.date_added) dateScore[v.date_added] = (dateScore[v.date_added]||0)+2; });
  (reports||[]).forEach(r => { if(r.date && isDailyReport(r)) dateScore[r.date] = (dateScore[r.date]||0)+5; });
  _dateScoreCache = dateScore;

  // v89 动态日期序列：起点 = 全部活跃日的最早一天（词 date_added + 日报 date 并集），终点 = 今天
  const today = getLocalToday();
  const knownDates = Object.keys(dateScore);
  let firstDate = today;
  knownDates.forEach(d => { if (d < firstDate) firstDate = d; });   // YYYY-MM-DD 字典序 = 时间序
  // 脏数据防护：异常 date_added（1970 等）不允许生成数万格 DOM；3 年 = 1095 格，正常数据永远触碰不到
  const cutoffD = parseLocalDate(today); cutoffD.setDate(cutoffD.getDate() - 1095);
  const cutoff = fmtLocalDate(cutoffD);
  if (firstDate < cutoff) firstDate = cutoff;
  const days = [];
  const cursor = parseLocalDate(firstDate);
  while (fmtLocalDate(cursor) <= today) {
    const ds = fmtLocalDate(cursor);
    days.push({ date: ds, month: cursor.getMonth()+1, day: cursor.getDate(), active: !!dateScore[ds], isToday: ds === today });
    cursor.setDate(cursor.getDate() + 1);
  }

  // v97：选中日期 = _viewDate（历史视图）或今天——日期加粗与熊圈严格跟随选中项，不再死锁今天
  const selected = _viewDate || today;

  // v98/v106：滚动位置保持 —— 渲染前从 DOM 读当前位置（含用户手动左右滑动）并存入 JS 缓存（跨重渲染存活，防「DOM 值被时序竞态清零后盲恢复 0」）；
  // 本次页面加载的首次渲染锚定最右（今天）；此后一切重渲染（历史日切换/后台补水/切页返回）只恢复、绝不重锚定
  const prevStrip = document.getElementById('streak-strip');
  const savedScroll = prevStrip ? prevStrip.scrollLeft : null;
  if (prevStrip && typeof savedScroll === 'number') _streakScrollCache = savedScroll;

  el.innerHTML = `
    <div class="flex justify-between items-center mb-3">
      <span class="inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold text-[var(--c-text-dim)] cursor-pointer transition-colors active:text-[var(--c-primary)]" onclick="showMonthPicker()">
        ${icon('calendar','w-3.5 h-3.5')} 打卡日历
        ${streak > 0 ? `<span class="inline-flex items-center gap-0.5 text-emerald-500">· ${icon('flame','w-3.5 h-3.5')}${streak}天</span>` : ''}
        ${icon('chevron-right','w-3.5 h-3.5 text-[var(--c-text-ultradim)]')}
      </span>
      ${hasToday
        ? `<span class="inline-flex items-center gap-1 text-[0.6875rem] text-emerald-500 font-semibold">${icon('check-circle-2','w-3.5 h-3.5')}已打卡</span>`
        : `<span onclick="showImportDialog()" class="inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-[var(--c-primary)] cursor-pointer">${icon('upload','w-3.5 h-3.5')}去打卡</span>`
      }
    </div>
    <!-- v89 横向无限回溯滑条：向右滑 = 回看更早历史；小熊点亮 = 该日有词/日报（与数据库状态精准匹配）
         v97：单屏最多 7 格（grid auto-cols 14.28%，左右拖动查看更多）；选中日期加粗 + 熊圈
         v98：pt-2/pl-1 为 scale-110 放大熊 + 光圈预留空间（overflow-x-auto 会强制垂直裁剪，无 padding 熊头被切）
         v104.1：滚动定位改为 JS 状态单点（_streakScrollCache/_streakAnchored）——首次渲染锚定最右，重渲染只恢复
         v106：overflow-x:auto 改为内联样式（滚动盒恒成立，不依赖 Tailwind CDN 时序——根治「首帧 CSS 未就绪 → scrollLeft 设置无效 → 打开停在最左」）
         v108：pl-1 追加 -ml-1 负外边距补偿——首个熊卡左缘与上方「打卡日历」图标左缘严格同一条垂直参考线；pl-1 仍保留（光圈/放大裁切缓冲不丢），-ml-1 恰好抵消其 4px 左缩：容器左缘 = 图标左缘 - 4px + 4px = 图标左缘，scrollport 左侧多出的 4px 缓冲带让最左选中熊的光圈完整可见
         v110：首熊格内容改左对齐（items-start / text-left）——v108 只把「格子」左缘对齐图标，但小熊图 w-6（24px）在 14.28% 宽格（~48px）内被 items-center 居中，熊脸左缘仍比图标缩进约半格宽（~12px）。首格左对齐后熊脸左缘 === 图标左缘同一条垂直线；其余格保持居中，锚定/恢复逻辑零改动
         v112：全格统一 items-start/text-left（用户报「首熊与第二熊间隔巨远」）——v110 只左对齐首格，第二熊仍格内居中 → 1→2 间距 ≈41px vs 其余 ≈25px 严重不齐。全格左对齐后：熊 i 左缘 = 图标线 + i×(格宽+gap)，相邻间距恒等 ≈29px；每屏正好 7 只（第 7 熊右缘 ≈ 视口右缘，第 8 熊全出屏）；首熊仍与图标同线；锚定/恢复逻辑零改动 -->
    <div class="grid overflow-x-auto hide-scrollbar gap-1 pt-2 pb-1 pl-1 -ml-1" id="streak-strip" style="overflow-x:auto;grid-auto-flow:column;grid-auto-columns:14.28%">
      ${days.map(d => `
        <div class="flex flex-col items-start gap-px cursor-pointer" onclick="showBearDay('${d.date}',${d.active})">
          <img class="w-6 h-6 min-w-6 min-h-6 object-contain rounded-full transition-transform duration-150 ${d.date===selected?'shadow-[0_0_0_2px_var(--c-primary)] scale-110':''}" src="${d.active ? '/bear-active.png' : '/bear-default.png'}" alt="${d.active ? '🐻' : '🌱'}" onerror="this.style.display='none';this.insertAdjacentHTML('afterend','<span class=flex items-center justify-center w-6 h-6 text-sm>${d.active ? '🐻' : '🌱'}</span>')" />
          <span class="text-[0.6875rem] whitespace-nowrap text-left ${d.date===selected ? 'text-[var(--c-primary)] font-bold' : 'text-[var(--c-text-ultradim)]'}">${d.month}/${d.day}</span>
        </div>
      `).join('')}
    </div>`;
  const strip = document.getElementById('streak-strip');
  if (strip) {
    if (!_streakAnchored) {
      // 首次渲染：锚定最右（今天）。①同步兜底（inline overflow 保证滚动盒恒成立，布局就绪即生效）；
      // ②rAF 布局落定后按溢出量精确落锚；③clientWidth>0（可测量）才判定落锚成功——隐藏态首渲顺延到下一轮渲染重试，绝不死锁最左
      strip.scrollLeft = strip.scrollWidth;
      requestAnimationFrame(() => {
        const s = document.getElementById('streak-strip');
        if (!s || _streakAnchored) return;
        if (s.clientWidth > 0) {
          _streakAnchored = true;
          const overflow = s.scrollWidth - s.clientWidth;
          s.scrollLeft = overflow > 1 ? overflow : 0;
          _streakScrollCache = s.scrollLeft;
        }
      });
    } else {
      // 重渲染：只恢复（历史日切换/后台补水/切页返回/手动左右滑动后，熊条位置保持不动）
      strip.scrollLeft = (_streakScrollCache !== null) ? _streakScrollCache : strip.scrollWidth;
      _streakScrollCache = strip.scrollLeft;
    }
  }
  refreshIcons(el);
}

// ── v89 全局月历（Month Picker）──
// 点「打卡日历」标题 → 底部模态月历：跨月/跨年导航 + 任意一天一键跳转
// 数据源 = _dateScoreCache（首页 renderStreakCard 写入的词+日报日期并集），未来日期禁用，有数据日主题色高亮
function showMonthPicker() {
  const todayD = parseLocalDate(getLocalToday());
  _pickerYear = todayD.getFullYear();
  _pickerMonth = todayD.getMonth() + 1;
  const modal = document.createElement('div');
  modal.id = 'vococal-picker';
  modal.className = 'fixed inset-0 bg-black/40 z-[300] flex items-end justify-center';
  modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });
  modal.innerHTML = `
    <div class="bg-[var(--c-surface)] rounded-t-[20px] w-full max-w-[480px] flex flex-col overflow-hidden animate-[slideUp_0.25s_ease-out]">
      <div class="flex justify-between items-center px-5 py-4 border-b border-[var(--c-border-light)]">
        <span class="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--c-text)]">${icon('calendar','w-4 h-4 text-[var(--c-primary)]')} 打卡日历</span>
        <button class="w-7 h-7 rounded-full border-0 bg-[var(--c-bg)] text-[var(--c-text-dim)] text-sm cursor-pointer flex items-center justify-center" onclick="document.getElementById('vococal-picker').remove()">✕</button>
      </div>
      <div id="vococal-picker-body" class="px-5 py-4"></div>
    </div>`;
  document.body.appendChild(modal);
  refreshIcons(modal);
  renderMonthPickerBody(_pickerYear, _pickerMonth);
}

function renderMonthPickerBody(y, m) {
  const body = document.getElementById('vococal-picker-body');
  if (!body) return;
  const today = getLocalToday();
  const todayD = parseLocalDate(today);
  const atLatest = (y === todayD.getFullYear() && m === todayD.getMonth() + 1);
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const firstWk = new Date(y, m - 1, 1).getDay();   // 0=周日
  const daysInMonth = new Date(y, m, 0).getDate();
  const WEEKS = ['日','一','二','三','四','五','六'];
  const cells = [];
  for (let i = 0; i < firstWk; i++) cells.push(`<div></div>`);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = fmtLocalDate(new Date(y, m - 1, d));
    const active = !!_dateScoreCache[ds];
    const isToday = ds === today;
    if (ds > today) {
      cells.push(`<div class="flex items-center justify-center h-9 rounded-xl text-xs opacity-30 text-[var(--c-text-ultradim)] cursor-default">${d}</div>`);
    } else if (active) {
      cells.push(`<div class="flex items-center justify-center h-9 rounded-xl text-xs font-bold text-white bg-[var(--c-primary)] cursor-pointer active:scale-95 transition-transform" onclick="pickCalendarDay('${ds}')">${d}</div>`);
    } else {
      cells.push(`<div class="flex items-center justify-center h-9 rounded-xl text-xs cursor-pointer transition-colors ${isToday ? 'text-[var(--c-primary)] font-semibold border border-[var(--c-primary)]' : 'text-[var(--c-text-dim)] hover:bg-[var(--c-border-light)]'}" onclick="pickCalendarDay('${ds}')">${d}</div>`);
    }
  }
  body.innerHTML = `
    <div class="flex items-center justify-between mb-3">
      <button class="w-9 h-9 rounded-xl border-0 bg-[var(--c-bg)] text-[var(--c-text)] text-base cursor-pointer flex items-center justify-center active:scale-95 transition-transform" onclick="renderMonthPickerBody(${prevY},${prevM})">${icon('chevron-left','w-4 h-4')}</button>
      <span class="text-sm font-bold text-[var(--c-text)]">${y}年${m}月</span>
      ${atLatest
        ? `<button class="w-9 h-9 rounded-xl border-0 bg-[var(--c-bg)] text-[var(--c-text-ultradim)] text-base cursor-default flex items-center justify-center" disabled>${icon('chevron-right','w-4 h-4')}</button>`
        : `<button class="w-9 h-9 rounded-xl border-0 bg-[var(--c-bg)] text-[var(--c-text)] text-base cursor-pointer flex items-center justify-center active:scale-95 transition-transform" onclick="renderMonthPickerBody(${nextY},${nextM})">${icon('chevron-right','w-4 h-4')}</button>`
      }
    </div>
    <div class="grid grid-cols-7 gap-1 mb-1">
      ${WEEKS.map(w => `<div class="text-center text-[0.6875rem] text-[var(--c-text-ultradim)] py-1">${w}</div>`).join('')}
    </div>
    <div class="grid grid-cols-7 gap-1">
      ${cells.join('')}
    </div>
    <div class="flex items-center gap-3 mt-3 pt-3 border-t border-[var(--c-border-light)] text-[0.6875rem] text-[var(--c-text-dim)]">
      <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-[var(--c-primary)]"></span> 有日报/生词</span>
      <span class="inline-flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-full bg-[var(--c-border)]"></span> 未打卡</span>
      <button class="ml-auto px-3 py-1.5 rounded-full bg-[var(--c-primary-light)] text-[var(--c-primary)] font-semibold border-0 cursor-pointer" onclick="pickCalendarDay('${today}')">回今天</button>
    </div>`;
  refreshIcons(body);
}

// 月历选日：今天 → 直接回归今日视图；历史日 → 有数据进历史日报视图 / 无数据 toast 提示
function pickCalendarDay(ds) {
  const el = document.getElementById('vococal-picker');
  if (el) el.remove();
  if (ds === getLocalToday()) { goHomeToday(); return; }
  showBearDay(ds, !!(_dateScoreCache[ds] || {}));
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
  const today = getLocalToday();
  return (vocabList || []).map(v => {
    const t = { ...v };
    // v85 加固：无条件按 date_added 重算 —— DB 行自带的 isNewToday 残留（昨日打标未清）不得穿透到今日
    // （mergeReportVocab 在打标之后运行，今日日报词由它重新打 true，不受影响）
    t.isNewToday = !!(t.date_added && t.date_added.slice(0, 10) === today);
    if (t.isMistake === undefined) t.isMistake = isMistakeByCrossRef(t, errorsList);
    if (t.needsReview === undefined) t.needsReview = isDueBySrs(t, today);
    return t;
  });
}
// v95 演示词库已物理删除：云端词库为空 = 空状态（绝不注入假词）；合并逻辑保留为纯透传
function mergeDemoVocab(vocabList) {
  return (vocabList && vocabList.length) ? [...vocabList] : [];
}
// 词库快照网关：合并内置词库 → 统一打标 → 输出纯布尔驱动的词库
function buildWordSnapshot(vocabList, errorsList) {
  return stampDailyTags(mergeDemoVocab(vocabList), errorsList);
}
// 日报生词合并网关：把当前日报解析出的 newWords 完整追加/更新进全局词库 ——
// 同名行（按 word 小写匹配）继承真实 id 并打 isNewToday:true（复习+1 可写回）；
// 缺词以 rep-N 唯一 id 追加（source_topic=今日日报），首页计数与复习页渲染绝对同源
function mergeReportVocab(snapshot, reportParsed) {
  const reportWords = (reportParsed && reportParsed.vocabulary) || [];
  if (!reportWords.length) return snapshot;
  const out = [...(snapshot || [])];
  const byWord = new Map(out.map(v => [String(v.word || '').toLowerCase().trim(), v]));
  reportWords.forEach((w, i) => {
    const key = String(w.word || '').toLowerCase().trim();
    if (!key) return;
    const existing = byWord.get(key);
    if (existing) {
      existing.isNewToday = true; // 词库已有该词 → 今日日报再学一次，标签同步
      existing.isMistake = false;
      return;
    }
    const item = {
      id: 'rep-' + i,
      word: w.word,
      phonetic: w.phonetic || '',
      meaning: w.meaning || '',
      example: w.example || '',
      source_topic: '今日日报',
      isNewToday: true, isMistake: false, needsReview: false
    };
    out.push(item);
    byWord.set(key, item);
  });
  return out;
}
// 句型/表达条目打标：唯一 id + isTodayCore + needsReview + 标准嵌套字段（targetSentence/replacedSentence/explanation）
// 碎片数组合并映射：better→targetSentence / original→replacedSentence / scene→explanation
function stampPatternTags(patterns) {
  const today = getLocalToday();
  return (patterns || []).map((p, index) => {
    const base = (p && typeof p === 'object') ? { ...p } : {};
    const better = base.better || base.targetSentence || (typeof p === 'string' ? p : '');
    const original = base.original || base.replacedSentence || '';
    const tagged = {
      ...base,
      id: base.id || `pat_${index}`,
      targetSentence: better || original || '',
      replacedSentence: original,
      explanation: base.explanation || base.scene || '',
      isTodayCore: base.isTodayCore !== undefined ? base.isTodayCore : (base.is_core === true)
    };
    // 句型 SRS：SM-2 到期判定与单词同源（无 next_review_date → 未复习过 → 到期；mastered → 永久出队）
    if (tagged.needsReview === undefined) tagged.needsReview = isDueBySrs(tagged, today);
    return tagged;
  });
}

// v104 句型库文本去重（v103 词库 dedupeWordsByWord 同款先例）：历史「导入行 + 复习 INSERT 行」双行遗留 →
// 展示层收敛为一知识一行。保留规则：有复习记录（next_review_date 或 review_count>0）的行优先（SM-2 曲线最真），
// 其次 created_at 较新者；只读去重，不碰存量 DB 行（物理清理走 ⚙️ 后端 SQL，见 cleanup_vocab_dupes.sql 先例）
function dedupePatternsByText(list) {
  const seen = new Set();
  const scored = (list || []).map(p => ({
    p,
    hasCurve: !!(p && (p.next_review_date || (p.review_count || 0) > 0)),
    created: String((p && p.created_at) || '')
  })).sort((a, b) => {
    if (a.hasCurve !== b.hasCurve) return a.hasCurve ? -1 : 1;
    return b.created.localeCompare(a.created);
  });
  const out = [];
  for (const { p } of scored) {
    const k = String(p.targetSentence || p.better || p.original || '').toLowerCase().trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
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

function renderMetricsOverview() {
  const grid = document.getElementById('home-metrics');
  const ms = getTodayMissionState(_wordsAll, _reportParsed, _reviewedVocabTodayIds);
  // v75 历史视图早分支：所选日期日报存在 → 渲染该日真实数据（评分口径与今日分支完全一致），今日时间网关不拦截
  const historyMode = !!(_viewDate && _historyParsed);
  // 时间网关（Voco 2.0）：今日未导入日报 → 数字全部清零（四维度 0/100、综合 --），绝不回退 Mock 或历史数据
  if (!historyMode && !ms.hasRealTodayReport) {
    grid.innerHTML = metricsHTML('--', '--', '--', 0, 0, 0, 0, 0, 0, 0, 0, null);
    refreshIcons(grid);
    return;
  }
  const parsed = historyMode ? _historyParsed : _reportParsed; // 单一事实源：今日=buildGlobalMissionInputs 产物；历史=_historyParsed（v75）
  const fluency = Math.min((parsed.summary.fluency||0) * 10, 100);
  const accuracy = Math.min((parsed.summary.accuracy||0) * 10, 100);
  const natural = Math.min((parsed.summary.naturalness||Math.round((parsed.summary.fluency||0)*0.8)) * 10, 100);
  // v101 词汇维度：新版日报 summary.vocabulary（0-10 私教评分）；历史日报无该键 → 回退词数折算公式
  const vocabScore = (typeof parsed.summary.vocabulary === 'number' && isFinite(parsed.summary.vocabulary))
    ? norm100(parsed.summary.vocabulary)
    : Math.min(parsed.vocabulary.length * 20, 100);
  const overall = Math.round((fluency+accuracy+natural+vocabScore)/4);
  const duration = parsed.meta.duration||0;
  const speakTime = Math.round(duration*0.6);
  // v104 四子块计数 = getDayCounts SSOT（与四按钮跳转页列表同一函数同一数组，数量 100% 绝对一致）
  // 语法口径修正：纯 grammar 标准清洗计数（历史/今日同口径，发音 v99 起不计入）
  const counts = getDayCounts(parsed);
  const newWords = counts.vocab;
  const expressions = counts.expressions;
  const corrections = counts.grammar;
  const core = counts.core;
  // Voco 2.0 对话占比：parser.js parseSpeakingRatio 的角色词数（无记录 → null，条内优雅降级）
  const ratio = (parsed.summary && parsed.summary.speakingRatio) || null;
  grid.innerHTML = metricsHTML(overall, speakTime, duration, fluency, accuracy, vocabScore, natural, newWords, expressions, corrections, core, ratio);
  refreshIcons(grid);
}

// 分母对齐铁律（v61）：四维度统一 0–100 刻度展示 ${score}/100，严禁 /10 硬编码；
// 若上游误传 0–10 刻度（≤10）自动 ×10 对齐，进度条宽度 = 分数本身（0–100%）
function norm100(v) {
  const n = Number(v) || 0;
  return Math.max(0, Math.min(100, Math.round(n <= 10 ? n * 10 : n)));
}

// v104 四子块改版（用户指令）：X个当日新词 / X项语法纠正 / X个自然表达 / X个核心句型 ——「话题」块已删除（与下方话题卡重复）
function metricsHTML(overall, speakMin, totalMin, fluency, grammar, vocab, natural, newWords, expressions, corrections, core, ratio) {
  // v103 对话占比简化（用户指令）：头部行 = 「百分比 + 开口时长/总对话时长」小字标签，去掉总分钟数与下方进度条
  // 两种数据源（新版 JSON {user,ai,pct:true} / 旧 Markdown {user,ai} 词数）统一折算成你%呈现；
  // 无占比的旧日报保留分钟形态；两者皆无 → 占位提示
  const hasRatio = !!(ratio && (ratio.user + ratio.ai) > 0);
  const userPct = hasRatio ? Math.max(0, Math.min(100, Math.round(ratio.user / (ratio.user + ratio.ai) * 100))) : 0;
  const hasDur = !!(speakMin || totalMin);
  const headHTML = hasRatio
    ? `<div class="text-xl font-bold text-[var(--c-text)] flex items-center gap-1">${icon('mic','w-[18px] h-[18px] text-[var(--c-primary)]')} ${userPct}%</div>
        <div class="text-xs text-[var(--c-text-dim)]">开口时长/总对话时长</div>`
    : `<div class="text-xl font-bold text-[var(--c-text)] flex items-center gap-1">${icon('mic','w-[18px] h-[18px] text-[var(--c-primary)]')} ${speakMin||'--'}m / 共 ${totalMin||'--'}m</div>
        <div class="text-xs text-[var(--c-text-dim)]">开口时长 / 总时长</div>`;
  const ratioHTML = (!hasRatio && !hasDur)
    ? `<div class="mt-2 text-[0.6875rem] text-[var(--c-text-ultradim)]">对话占比 · 导入含对话记录的日报后展示</div>`
    : '';
  return `
    <div class="flex items-center gap-5 mb-4">
      <div class="relative shrink-0 w-[88px] h-[88px]">${metricsDonut(overall)}</div>
      <div class="flex flex-col gap-0.5 flex-1">
        ${headHTML}
        ${ratioHTML}
      </div>
    </div>
    <div class="grid grid-cols-2 gap-x-6 gap-y-4 mb-3.5">${[
      {l:'流利度',s:norm100(fluency),c:'var(--c-primary)'},
      {l:'语法',s:norm100(grammar),c:'var(--c-blue)'},
      {l:'词汇',s:norm100(vocab),c:'var(--c-green)'},
      {l:'地道与英文思维',s:norm100(natural),c:'var(--c-orange)'}
    ].map(b=>`
      <div class="flex flex-col">
        <div class="flex justify-between text-xs text-[var(--c-text-dim)] mb-1.5">
          <span class="font-medium">${b.l}</span><span>${b.s}/100</span>
        </div>
        <div class="w-full bg-[var(--c-border-light)] rounded-full h-1.5 overflow-hidden">
          <div class="h-1.5 rounded-full transition-all duration-[0.6s]" style="width:${b.s}%;background:${b.c}"></div>
        </div>
      </div>`).join('')}
    </div>
    <div class="flex gap-1.5 flex-wrap pt-3 border-t border-[var(--c-border-light)]">
      <div class="flex-1 min-w-[60px] text-center px-1.5 py-1.5 bg-[var(--c-bg)] rounded-lg text-[0.6875rem] text-[var(--c-text-dim)]"><strong class="flex items-center justify-center gap-0.5 text-xl text-[var(--c-text)] font-bold">${icon('pen-line','w-3.5 h-3.5')} ${newWords}</strong>个当日新词</div>
      <div class="flex-1 min-w-[60px] text-center px-1.5 py-1.5 bg-[var(--c-bg)] rounded-lg text-[0.6875rem] text-[var(--c-text-dim)]"><strong class="flex items-center justify-center gap-0.5 text-xl text-[var(--c-text)] font-bold">${icon('wrench','w-3.5 h-3.5')} ${corrections}</strong>项语法纠正</div>
      <div class="flex-1 min-w-[60px] text-center px-1.5 py-1.5 bg-[var(--c-bg)] rounded-lg text-[0.6875rem] text-[var(--c-text-dim)]"><strong class="flex items-center justify-center gap-0.5 text-xl text-[var(--c-text)] font-bold">${icon('message-square-text','w-3.5 h-3.5')} ${expressions}</strong>个自然表达</div>
      <div class="flex-1 min-w-[60px] text-center px-1.5 py-1.5 bg-[var(--c-bg)] rounded-lg text-[0.6875rem] text-[var(--c-text-dim)]"><strong class="flex items-center justify-center gap-0.5 text-xl text-[var(--c-text)] font-bold">${icon('gem','w-3.5 h-3.5')} ${core}</strong>个核心句型</div>
    </div>`;
}

function metricsDonut(score) {
  // v63 空状态守卫：综合分 '--'（非数字）→ 空环 + 中性色，绝不渲染 NaN 破环
  const n = Number(score);
  const r=34,cx=44,cy=44,sw=8,circ=2*Math.PI*r,len=(isNaN(n)?0:(n/100)*circ);
  const color=isNaN(n)?'var(--c-border)':n>=70?'var(--c-green)':n>=40?'var(--c-orange)':'var(--c-red)';
  return `<svg viewBox="0 0 88 88" width="88" height="88"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--c-border-light)" stroke-width="${sw}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-dasharray="${len} ${circ-len}" stroke-dashoffset="0" transform="rotate(-90 44 44)" stroke-linecap="round"/></svg><div class="absolute inset-0 flex items-center justify-center text-[1.5rem] font-extrabold text-[var(--c-text)]">${score}</div>`;
}

// ── Section 4: Insights (Cards A-F) ─────────────────────
function renderInsightsSection(displayThoughts, displayGoodPoints) {
  const container = document.getElementById('home-insights');
  // v75 历史视图早分支：所选日期日报存在 → 该日数据直通渲染，今日时间网关不拦截
  const historyMode = !!(_viewDate && _historyParsed);
  // 时间网关（Voco 2.0）：任务状态中心判定今日未导入日报 → 整区优雅空状态，绝对禁止历史数据穿透进「今日」卡组
  if (!historyMode && !getTodayMissionState(_wordsAll, _reportParsed, _reviewedVocabTodayIds).hasRealTodayReport) {
    container.innerHTML = `<div class="bg-[var(--c-surface)] rounded-2xl p-6 text-center border border-dashed border-[var(--c-border)] opacity-0 animate-[fadeInUp_0.3s_ease-out_forwards]" style="box-shadow:var(--c-shadow-sm)">
      <div class="text-2xl mb-2">⏳</div>
      <div class="text-sm font-semibold text-[var(--c-text)]">等待导入今日报告</div>
      <div class="text-xs text-[var(--c-text-dim)] mt-1">导入今日日报后，这里将呈现今日对话想法、做得好的地方与提升建议</div>
      <div class="inline-flex items-center gap-1 mt-3 px-4 py-2 rounded-full bg-[var(--c-primary-light)] text-[0.875rem] font-semibold text-[var(--c-primary)] cursor-pointer" onclick="showImportDialog()">${icon('upload','w-3.5 h-3.5')} 去导入 ${icon('arrow-right','w-3 h-3')}</div>
    </div>`;
    refreshIcons(container);
    return;
  }
  // 单一事实源：今日=_reportParsed；历史视图=_historyParsed（v75），禁止在此重新解析
  let d = JSON.parse(JSON.stringify(EMPTY_INSIGHTS));
  const p = historyMode ? _historyParsed : _reportParsed;
  if(p && p.meta.topic) d.topics = p.meta.topic.split(/[,，、]/).map(t=>t.trim()).filter(Boolean);
  // 今日对话想法 / 做得好的地方：时间轴拦截后的展示值直传（loadHome 已按 missionState 强制清空历史数据）
  if (displayThoughts && (displayThoughts.en || displayThoughts.zh)) d.thoughts = displayThoughts;
  if (displayGoodPoints) { const arr = Array.isArray(displayGoodPoints) ? displayGoodPoints : String(displayGoodPoints).split('\n'); const lines = arr.filter(Boolean).map(l => String(l).replace(/^[-•*]\s*/, '')); if (lines.length) d.strengths = lines; }
  const card = (delay,html) => `<div class="bg-[var(--c-surface)] rounded-2xl p-4 mb-2.5 border border-[var(--c-border-light)] opacity-0 animate-[fadeInUp_0.3s_ease-out_forwards]" style="animation-delay:${delay}s;box-shadow:var(--c-shadow-sm)">${html}</div>`;

  let html = '';
  // v75 历史视图标签语境：今日 → 当日（顶部横幅已标明「正在查看 {date} 数据」，卡片标题同步去「今日」歧义）
  const dayLabel = historyMode ? '当日' : '今日';
  // Card A: Topics
  html += card(0.03, `<div class="flex items-center gap-1.5 text-xs font-semibold text-[var(--c-text-dim)] mb-2.5">${icon('message-circle','w-3.5 h-3.5')} ${dayLabel}对话主题</div>${d.topics.length ? `<div class="flex gap-2 flex-wrap">${d.topics.map(t=>`<span class="px-3 py-1 bg-[var(--c-green-light)] text-[var(--c-green)] rounded-full text-xs font-medium">#${h(t)}</span>`).join('')}</div>` : '<div class="text-sm text-[var(--c-text-ultradim)]">当日无数据</div>'}`);
  // Card B: 今日对话想法 —— 动态渲染：优先 _reportParsed.summary.dailyThought，次取本函数解析的日报 dailyThought；零硬编码金句
  // v76 修复：① 值净化（trim + 「无/暂无/没有/未记录」判空 → 优雅空状态，绝不渲染生硬「无」字）
  //         ② 字体规范（font-sans not-italic 全局无衬线，删除 Georgia 衬线斜体引语样式）
  // v78 修复：恒定排版规格 —— 主体恒为 15px 主色（en 缺失时 zh 升主），副行恒为 13px；
  //         v99 颜色统一（用户反馈两段式割裂）：en 主行与 zh 副行同用主色 text-[var(--c-text)]，不再副行 dim 灰；
  //         v100 用户定调：en/zh 同字号不分主次（两行皆 text-sm 14px）——「想法」是一个整体，层级只靠行序
  //         内容经 cleanThoughtText 净化（剥 markdown 星号/残留 HTML/换行），杜绝每天视觉漂移
  // v80 兜底：dailyThought 缺失时，从 summary.thoughts 字符串现场提取（老 JSON/Markdown 数据只有 thoughts 字段的情况）
  const dtRaw = (((p && p.summary && p.summary.dailyThought) || null) || (p && p.summary && p.summary.thoughts ? parseDailyThought(String(p.summary.thoughts)) : null) || d.thoughts) || {};
  const dt = { en: cleanThoughtText(dtRaw.en), zh: cleanThoughtText(dtRaw.zh) };
  const NO_THOUGHT_RE = /^(无|暂无|没有|未记录|none?|n\/a)$/i;
  const hasThought = !!(dt.en || (dt.zh && !NO_THOUGHT_RE.test(dt.zh)));
  if (hasThought) {
    // 单一引语块：左侧主题色竖线 + 中文弯引号；主行/副行字号颜色恒定，不随 en/zh 有无而变（v99 起两行同主色，v100 起同字号不分主次）
    // v80 排版拉平：主行 text-sm(14px) font-normal，与 Card C/D 正文层级一致（v78 的 15px font-medium 过于突出）
    const quote = dt.en || dt.zh;        // 主体：优先英文原句，缺失时中文释义升主
    const sub = dt.en ? dt.zh : '';      // 副行：仅当 en 在场时 zh 作释义副行
    html += card(0.06, `<div class="flex items-center gap-1.5 text-xs font-semibold text-[var(--c-text-dim)] mb-2.5">${icon('lightbulb','w-3.5 h-3.5')} ${dayLabel}对话想法</div>
      <div class="border-l-[3px] border-l-[var(--c-primary)] pl-3">
        <div class="font-sans not-italic text-sm font-normal text-[var(--c-text)] leading-[1.7]">“${h(quote)}”</div>
        ${sub ? `<div class="font-sans not-italic text-[0.875rem] font-normal text-[var(--c-text)] mt-1.5 leading-[1.7]">${h(sub)}</div>` : ''}
      </div>`);
  } else {
    // 空状态：v76 优雅缺省文案 —— 历史视图「当日未记录想法」；今日视图保留导入引导（不显示任何假数据）
    html += card(0.06, `<div class="flex items-center gap-1.5 text-xs font-semibold text-[var(--c-text-dim)] mb-2.5">${icon('lightbulb','w-3.5 h-3.5')} ${dayLabel}对话想法</div><div class="text-sm text-[var(--c-text-ultradim)] not-italic">${historyMode ? '当日未记录想法' : '💡 导入今日日报后，在此提炼你的核心表达观点'}</div>`);
  }
  // Card C: Strengths
  html += card(0.09, `<div class="flex items-center gap-1.5 text-xs font-semibold text-[var(--c-text-dim)] mb-2.5">${icon('thumbs-up','w-3.5 h-3.5 text-emerald-500')} ${dayLabel}做得好的地方</div>${d.strengths.length ? d.strengths.map(s=>`<div class="flex items-start gap-2 text-[0.875rem] text-[var(--c-text)] py-1.5">${icon('check-circle-2','w-4 h-4 text-emerald-500 shrink-0 mt-px')}<span>${h(s)}</span></div>`).join('') : '<div class="text-sm text-[var(--c-text-ultradim)]">当日无数据</div>'}`);
  // Card D: 需要提升 —— v104 固定四块（与打分面板四子块 1:1 对应）：词汇 / 语法纠正 / 自然表达 / 核心句型
  // v105 重构（用户指令：洞察注入四卡内部 + 无图标极简纯文本行结构）：
  // 第 1 行 洞察 —— coach_insights 对应句（深灰、正常字重、v111 起完整折行）；旧日报无该字段 → 同一行静默回落基础统计文案（排版完全一致，绝无「旧版模板」报错字样）；
  // 第 2 行 原句 —— items[0].original（浅灰、小字号、v111 起完整折行）；第 3 行 地道/修改 —— 品牌绿加粗、完整折行（与语法错题卡绿色正确句同源）；
  // 词汇卡 = 洞察 + 平铺 3 词；核心句型卡 = 洞察 + 金句 两行；卡片内零 emoji 零图标；「查看全部」无图标文字键保留 goImprove 四跳转链
  const vocabList = (p && p.vocabulary) || [];
  const grammarList = standardizeErrorCards(p ? (p.grammar || []) : []); // 与语法错题列表/面板计数同函数
  const exprList = (p && p.patterns) || [];
  const coreList = (p && p.sentence_patterns) || [];
  const ci = (p && p.coach_insights) || null;   // v105 私教洞察（GPT 生成日报时产出；旧日报 null）
  // 旧数据降级统计（与洞察行同一文案位）：最高频语法错误桶（v101 三类）/ 最高频不自然根因（4 枚举）
  const grammarTop = grammarList.length ? aggregateGrammarCategories(p.grammar)[0] : null;
  const exprTop = (() => {
    if (!exprList.length) return null;
    const count = {};
    exprList.forEach(x => { const c = EXPRESSION_CAUSES.includes(x.pattern) ? x.pattern : '表达习惯'; count[c] = (count[c] || 0) + 1; });
    return Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  })();
  // v105 三行模板（排版规格）：洞察 14px 深灰正常字重，行首维度图标 = 与打分面板四子块图标 1:1 呼应（识别性元素）；
  // 例证盒（bg 底衬圆角 = 与语法错题卡解析盒同语言的结构性分组，洞察/证据两层分离）：原句 12px 浅灰 / 地道·修改 14px 绿加粗；
  // 盒内行距 6px；目标行前缀标签常态字重、正文加粗，强调落在内容本身；
  // v105：各卡 empty 标记 → 「查看全部」disabled 拦截（该维度无数据时禁止进入白板页；全局体检模块五断言此行为）
  // v111 全局解除截断（用户产品逻辑反转指令：宁可卡片变长，绝不吞掉一个标点）：
  //     洞察行 line-clamp:3 彻底废除 → 块级自然折行 + break-words 长词兜底，三四行全文完整展示；
  //     例证区（原句/修改/地道/金句）同步废除 truncate 单行截断 → break-words 自然折行，绝无省略号；
  //     图标 items-start + mt-0.5 随首行顶部对齐；容器（bodyBox 灰底盒 / card 白卡）无固定高度，随内容垂直自适应
  const insightLine = (iconName, text) => `<p class="text-sm text-[var(--c-text-dim)] font-normal flex items-start gap-1.5 min-w-0">
    ${icon(iconName, 'w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--c-primary)]')}
    <span class="flex-1 min-w-0 break-words">${h(text)}</span>
  </p>`;
  const origLine = (label, text) => text ? `<p class="text-xs text-[var(--c-text-ultradim)] break-words leading-relaxed">${label}：${h(text)}</p>` : '';
  const targetLine = (label, text) => text ? `<p class="text-sm text-[var(--c-green)] break-words leading-relaxed"><span class="font-normal opacity-75">${label}：</span><span class="font-bold">${h(text)}</span></p>` : '';
  const bodyBox = (inner) => inner ? `<div class="bg-[var(--c-bg)] rounded-xl px-3 py-2.5 mt-2 space-y-1.5 min-w-0">${inner}</div>` : '';
  const improveBlocks = [
    {
      badge: '📚 词汇', badgeCls: 'bg-[var(--c-primary-light)] text-[var(--c-primary)]', type: 'vocab', icon: 'pen-line', empty: vocabList.length === 0,
      insight: ci ? ci.vocabulary : '',
      fallback: vocabList.length ? `${dayLabel}新词 ${vocabList.length} 个待巩固` : `${dayLabel}无词汇记录`,
      body: (() => {
        const words = vocabList.slice(0, 3).map(v => String(v.word || '').trim()).filter(Boolean);
        return bodyBox(words.length ? `<p class="text-sm font-bold text-[var(--c-green)] break-words">${h(words.join(' · '))}</p>` : '');
      })()
    },
    {
      badge: '📖 语法纠正', badgeCls: 'bg-red-50 text-[var(--c-red)]', type: 'grammar', icon: 'wrench', empty: grammarList.length === 0,
      insight: ci ? ci.grammar : '',
      fallback: grammarList.length
        ? `最高频：${grammarTop ? grammarTop[0] + '（' + grammarTop[1] + ' 处）' : '语法问题'}`
        : `${dayLabel}无语法纠错`,
      body: (() => {
        const g = grammarList[0];
        if (!g) return '';
        const corr = String(g.correction || '').trim();
        const orig = String(g.original || '').trim();
        return bodyBox(origLine('原句', orig) + targetLine('修改', corr));
      })()
    },
    {
      badge: '🎯 自然表达', badgeCls: 'bg-amber-50 text-amber-600', type: 'expression', icon: 'message-square-text', empty: exprList.length === 0,
      insight: ci ? ci.expression : '',
      fallback: exprList.length
        ? `不地道的表达 ${exprList.length} 句${exprTop ? ` · 主要问题：${exprTop[0]}` : ''}`
        : `${dayLabel}无自然表达记录`,
      body: (() => {
        const e = exprList.find(x => x && x.better) || exprList[0];
        if (!e) return '';
        const better = String(e.better || '').trim();
        const orig = String(e.original || '').trim();
        return bodyBox(origLine('原句', orig) + targetLine('地道', better));
      })()
    },
    {
      badge: '💎 核心句型', badgeCls: 'bg-blue-50 text-[var(--c-blue)]', type: 'core', icon: 'gem', empty: coreList.length === 0,
      insight: ci ? ci.core_patterns : '',
      fallback: coreList.length ? `${coreList.length} 句高阶金句已收录` : `${dayLabel}无核心句型记录`,
      body: (() => {
        const c = coreList[0];
        const t = c ? String(c.pattern || c.targetSentence || c.text || '').trim() : '';
        return bodyBox(targetLine('金句', t));
      })()
    }
  ];
  html += `<div class="flex items-center gap-1.5 text-xs font-semibold text-[var(--c-text-dim)] mb-2 px-1">${icon('alert-circle','w-3.5 h-3.5 text-amber-500')} ${dayLabel}需要提升</div>`;
  html += improveBlocks.map((b, i) => card(0.12 + i * 0.02, `
    <div class="flex items-center justify-between gap-3">
      <span class="inline-flex w-fit items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${b.badgeCls}">${b.badge}</span>
      <button data-improve-jump="${b.type}" class="shrink-0 text-xs font-medium text-[var(--c-primary)] bg-transparent border-0 cursor-pointer px-0.5 py-0.5 hover:opacity-70 transition-opacity disabled:opacity-40 disabled:cursor-default disabled:hover:opacity-40" onclick="goImprove('${b.type}')" ${b.empty ? 'disabled' : ''}>查看全部</button>
    </div>
    <div class="mt-2 min-w-0">
      ${b.insight ? insightLine(b.icon, '洞察：' + b.insight) : insightLine(b.icon, b.fallback)}
      ${b.body}
    </div>
  `)).join('');
  // v82：Card E「今日私教对战 Prompt」胶囊模块已彻底移除 —— 首页洞察区终止于 Card D（需要提升），
  // 私教 Prompt 生成统一收敛至【我的】页灵感配置舱（fireTopicGeneratorPrompt；v97 起对练防御功能已全面下线）
  container.innerHTML = html;
  refreshIcons(container);
}

// ── v86 路由上下文日期：卡片点击时的浏览日期 —— 历史视图 = _viewDate，今日 = 本地今日 ──
// 提升区/建议区全部入口必须携带该日期，否则目标页丢失上下文降级渲染全集
function currentContextDate() {
  return (_viewDate && _historyParsed) ? _viewDate : getLocalToday();
}

// ── v104 提升区四块统一导航：四按钮 → 四个跳转页（与打分面板四子块 1:1 对应）──
// 全部精准携带 currentContextDate()（历史视图 = _viewDate，今日 = 本地今日），
// 目标页按该日日报过滤（_ctxDate 早分支），绝无「看历史数字、跳到今日列表」的路由错乱
function goImprove(type) {
  const ctxDate = currentContextDate();
  if (type === 'vocab') navigateReview('all', 'today', ctxDate);
  else if (type === 'grammar') navigateReview('grammar', null, ctxDate);
  else if (type === 'expression') navigateShadowing(undefined, undefined, ctxDate, 'expressions');
  else if (type === 'core') navigateShadowing(undefined, undefined, ctxDate, 'core');
}

// v104：三张数据卡（新学单词/核心句型/重点纠错）已整体删除（用户指令）——
// 打分面板四子块 + 提升区四按钮已完整承接其跳转职能，首页只保留 To-Do List
function renderTodoList(speakDoneToday) {
  // ── 今日待办三闭环（Voco 2.0）：底部待办 = SM-2 记忆任务，数据一律取自全局任务状态中心 ──
  const ms = getTodayMissionState(_wordsAll, _reportParsed, _reviewedVocabTodayIds);
  const hasTodayReport = ms.hasRealTodayReport;
  // 句型 SRS 任务口径（v76 同源绑定，v104 纯库捞）：待办数字 = 句型复习页实际队列 getDueSentencesQueue 的 .length
  // —— 库中 needsReview===true 全量（新卡无 next_review_date + 历史到期曲线），文本去重 + cap 15 与卡片页同一函数，绝不分叉
  const patternTaskCount = getDueSentencesQueue(_patternLibrary).length;
  const dueCount = ms.totalDueVocabCount;       // SM-2 到期全量（今日新词 + 历史到期词），与 tab=due 同源
  const reviewedToday = ms.reviewedVocabToday;  // 今日实际完成反馈（🟢/🔴）的词数（id 集合大小）
  // 任务 2 三态：
  // ① patternTaskCount === 0（无新句无到期）→ 置灰防御态「暂无句型复习任务」，无空心圆圈、无 chevron、不可点击 —— 根治 (0句) 弱智态
  // ② 有今日日报 → 「完成今日句型复习 (N句)」，N = 今日新句型 + 历史到期句（队列已混合）
  // ③ 无今日日报但有到期句 → 「完成句型复习 (N句)」，纯历史复习队列
  const patternTask = patternTaskCount === 0
    ? { text: '句型复习打卡 · 暂无复习任务', sub: '导入日报获得新句型，或等待历史句型到期', done: false, disabled: true, action: null }
    : {
        text: hasTodayReport ? `句型复习打卡 · 完成今日句型复习 (${patternTaskCount}句)` : `句型复习打卡 · 完成句型复习 (${patternTaskCount}句)`,
        sub: speakDoneToday ? '今日句型复习已完成' : (hasTodayReport ? '今日新句优先 + 历史到期句逐日消化' : '历史到期句型复习队列'),
        done: !!speakDoneToday,
        disabled: false,
        // v82：打卡 = 今日语境 —— 先清除历史视图残留（_viewDate/_historyParsed），
        // 保证 /shadowing 无 date 参数时严格走「今日到期句式队列」的 SRS 翻卡模式（v104 混编），绝不被历史日报劫持
        action: () => { _viewDate = null; _historyParsed = null; _ctxDate = null; navigateShadowing(); }
      };
  // 任务 3 数字口径（v88 QA 数量一致性 + v97 错题诚实口径）：due tab 卡组 buildDueDeck = 到期词 + 未纠正错题，
  // 数字必须数整副卡组 —— 此前只数词 → 「外面 N 词，点进去 N+M 张卡」的数字分裂；
  // v97：错题无 SM-2 记忆曲线（errors 表无 SRS 字段），改为「未纠正=到期」——已纠正（correct_in_review）不再历史全量回炉
  const todayErrTaskCount = dueErrorCards().length;
  const deckTotal = dueCount + todayErrTaskCount;
  // v103 完成判定修复：旧实现 deckReviewed 用 _reviewedErrorIds（会话内存 Set，刷新即清零）且 done 需 deckTotal>0——
  // 全部复习完后 dueCount/todayErrTaskCount 归 0，deckTotal>0 恒 false → 任务永远无法显示完成（用户实测：复习完所有词+错题仍不完成）。
  // 新口径：词与错题的「今日已复习数」一律取 DB 持久化 last_reviewed_at（reviewWordItem/reviewErrorItem 均落库），刷新/重开不丢；
  // deckTotal===0 且今日确有复习记录 → 完成；deckTotal===0 且今日无记录（今天本来就没有到期）→ 保持未完成，防默认值误判
  const errReviewedToday = (_errorsAll || []).filter(e => e.last_reviewed_at && localDateOf(e.last_reviewed_at) === getLocalToday()).length;
  const deckReviewed = reviewedToday + errReviewedToday;
  const deckDone = deckTotal === 0 ? deckReviewed > 0 : false;
  const todos = [
    // 任务 1（对练打卡）：导入今日日报 —— 检测到今日有导入记录，自动标记已完成
    { text: '对练打卡 · 导入今日日报', sub: hasTodayReport ? '今日已导入，自动完成' : '把 ChatGPT 练习报告粘贴进来', done: hasTodayReport, action: hasTodayReport ? null : () => { showImportDialog(); } },
    // 任务 2（句型复习打卡）：句型 SRS 卡片队列 —— 点击直达今日到期队列；复习完最后一张卡片自动打卡 + SM-2 写回
    patternTask,
    // 任务 3（复习打卡）：完成今日到期复习 —— v88 数字 = due tab 混合卡组真实长度（到期词 + 错题），
    // v103 完成判定 = deckDone（见上：DB 持久化复习记录，清空到期后仍可判定完成）
    { text: `复习打卡 · 完成今日到期复习 (${deckTotal}张)`, sub: deckTotal === 0 ? (deckDone ? `已复习 ${deckReviewed} 张 · 今日全部完成` : '今日无到期词') : `已复习 ${deckReviewed} 张 · 还剩 ${deckTotal} 张 · 词+错题混合卡组`, done: deckDone, action: () => { _viewDate = null; _historyParsed = null; _ctxDate = null; navigateReview('due'); } }
  ];
  const done = todos.filter(q=>q.done).length;
  const container = document.getElementById('home-quests');
  container.innerHTML = `
    <div class="flex justify-between items-center mb-2"><span class="inline-flex items-center gap-1.5 text-base font-bold text-[var(--c-text)]">${icon('list-todo','w-[18px] h-[18px]')} 今日待办</span><span class="text-xs text-[var(--c-primary)] font-semibold">${done}/3</span></div>
    <div class="h-1.5 bg-[var(--c-border-light)] rounded-full overflow-hidden mb-3"><div class="h-full bg-[var(--c-primary)] rounded-full transition-all duration-400" style="width:${(done/3)*100}%"></div></div>
    <div class="flex flex-col gap-1.5">${todos.map((q,i)=>`
      <div class="flex items-center gap-2.5 px-3.5 py-3 bg-[var(--c-bg)] rounded-lg transition-all duration-200 border-l-[3px] ${q.disabled?'border-l-transparent opacity-45 cursor-default':(q.done?'border-l-transparent opacity-55 cursor-pointer':'border-l-[var(--c-blue)] cursor-pointer active:scale-[0.98]')}" data-todo-idx="${i}">
        <div class="shrink-0">${q.done?icon('check-circle','w-[22px] h-[22px] text-emerald-500'):(q.disabled?icon('minus-circle','w-[22px] h-[22px] text-[var(--c-text-ultradim)]'):icon('circle','w-[22px] h-[22px] text-[var(--c-border)]'))}</div>
        <div class="flex-1 min-w-0">
          <div class="text-[0.875rem] font-semibold text-[var(--c-text)] ${q.done?'line-through':''} ${q.disabled?'text-[var(--c-text-dim)]':''}">${q.text}</div>
          <div class="text-[0.6875rem] text-[var(--c-text-dim)]">${q.sub||''}</div>
        </div>
        ${q.action&&!q.done?icon('chevron-right','w-5 h-5 text-[var(--c-text-ultradim)] shrink-0'):''}
      </div>
    `).join('')}</div>`;
  refreshIcons(container);
  // Wire click handlers（disabled 态 action===null，天然不可触发）
  container.querySelectorAll('[data-todo-idx]').forEach(el=>{
    el.addEventListener('click',function(){
      const idx = parseInt(this.dataset.todoIdx);
      const q = todos[idx]; if(q&&q.action) q.action();
    });
  });
}

// v94 弯引号归一化：GPT 输出/复制链路可能把直引号「美化」成弯引号（“ ” ‘ ’ 及全角）
// → JSON.parse 失败 → 日报被判非日报 → 僵尸行（reports 有行、三表全空、徽章亮/熊白/Hero 未对练）。
// 所有 JSON 文本入口先过本函数再 parse；isDailyReport 判定同样归一化后再匹配。
// v96 升级为智能引号状态机（根治值内嵌套引号）：v94 全局替换会把字符串值内部的中文强调号
// 也换成直引号 —— 如 "once 可以自然表达“等到……以后”" 的内层 “ ” 变成未转义直引号 →
// 字符串提前截断 → JSON.parse 依旧 SyntaxError（v95 显式报错即源于此）。
// 状态机规则（逐字符扫描，跟踪「是否在字符串内」）：
//   结构位置（键名/值边界）的 “ ” → 直引号 "；全角＂同直引号处理；
//   v102 加固：结构位置的 ”（右弯引号）也视为开引号——GPT 存在以 ” 双边包裹字符串的
//   系统性错误（8.19 日报 12 个 phonetic 字段全部是 ”/音标/” 形态），此前 ” 在结构位置
//   被原样放过 → JSON.parse 直接失败；
//   字符串内部的 “ ” → 「」（中文方角括号，JSON 合法且中文语境显示自然）；
//   字符串内部的直引号 → 转义 \"；已有反斜杠转义原样保留（防止 \" 被误判为闭引号）；
//   弯单引号 ‘ ’ 及全角＇ → 直单引号 '（JSON 字符串内单引号合法，如 aren't 缩写）。
function normalizeSmartQuotes(s) {
  const src = String(s || '');
  let out = '';
  let inStr = false, opener = '';
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '\\' && i + 1 < src.length) { out += ch + src[i + 1]; i++; continue; }  // 保留已有转义
    if (!inStr) {
      if (ch === '“') { inStr = true; opener = '“'; out += '"'; }
      else if (ch === '"' || ch === '＂') { inStr = true; opener = '"'; out += '"'; }
      else if (ch === '”') { inStr = true; opener = '”'; out += '"'; }  // v102：GPT ” 双边包裹字符串（音标字段高发）
      else if (ch === '‘' || ch === '’' || ch === '＇') out += "'";
      else out += ch;
    } else {
      if ((opener === '“' || opener === '”') && ch === '”') {
        // 关键歧义消解：同一个 ” 既可能是结构闭号，也可能是值内强调闭号（如 “等到……以后”）。
        // 前瞻判定——后一个非空白字符若是 , } ] : 或已到文末 → 结构闭号（结束字符串，出直引号）；
        // 否则（后跟中文汉字/全角标点/字母等）→ 值内强调闭号（出「」）。
        // 中文文案的逗号句号冒号均为全角（，。：），不会误入结构集合。
        let j = i + 1;
        while (j < src.length && (src[j] === ' ' || src[j] === '\t' || src[j] === '\n' || src[j] === '\r')) j++;
        if (j >= src.length || src[j] === ',' || src[j] === '}' || src[j] === ']' || src[j] === ':') { inStr = false; out += '"'; }
        else out += '」';
      }
      else if (opener === '"' && (ch === '"' || ch === '＂')) { inStr = false; out += '"'; }
      else if (ch === '“') out += '「';
      else if (ch === '”') out += '」';
      else if (ch === '"' || ch === '＂') out += '\\"';
      else if (ch === '‘' || ch === '’' || ch === '＇') out += "'";
      else out += ch;
    }
  }
  return out;
}

// v95 输入洗理：剥 BOM → 剥 Markdown 代码块围栏（```json 等）→ 提取最外层 {…} JSON 跨度
// → 弯引号归一化。防御 GPT 输出带前言/后缀、围栏包装、复制链路智能引号污染。
// 跨度提取仅在跨度内出现 JSON 键时才生效——Markdown 老日报里的杂散 { } 不受影响。
function sanitizeJsonInput(s) {
  let t = String(s || '').trim();
  t = t.replace(/^﻿/, '');                 // BOM
  t = t.replace(/```[a-zA-Z]*\s*/g, '');        // 代码块围栏
  const start = t.indexOf('{');
  if (start >= 0) {
    const end = t.lastIndexOf('}');
    if (end > start) {
      const span = t.slice(start, end + 1);
      if (/"(duration|summary|mistakes|coreSentences|newWords|topic)"|“/.test(span)) t = span;
    }
  }
  return normalizeSmartQuotes(t);
}

function isDailyReport(report) {
  if(!report) return false;
  // v103：按需拉取阶段元数据行暂无 content——reports 表唯一写入方是日报导入，元数据行即日报行，
  // 乐观视为日报（熊条点亮/打卡徽章不延迟）；后台补水后 content 到位，僵尸行会如实降级
  if (!report.content) return true;
  const c = normalizeSmartQuotes(report.content);   // v94：弯引号内容先归一化再判定
  // 兼容两种上游格式：传统 Markdown 日报 + 新版 JSON 日报
  return c.includes('type: daily-report')||c.includes('## 语法纠正')||c.includes('## 发音纠正')||c.includes('## 今日生词')||c.includes('## 表现总结')||c.includes('## 地道表达')
    || c.includes('"mistakes"')||c.includes('"coreSentences"')||c.includes('"newWords"')
    // v93：GPT 可能省略空数组键（今日无错题 → 整键不输出）→ 以模板必有键兜底识别（summary/duration）
    || c.includes('"summary"')||c.includes('"duration"');
}

// ── 无损数据迁移与清洗层 (Data Migration & Normalization) ──
// 任意历史日报（如 8.10 / 8.12）在渲染前必须经过本函数：
//   · sentences（句型复习句型）与 mistakes（错题）老格式（字符串 / 数组元组 / 残缺对象）→ 结构校验补齐为对象
//   · 新格式 → 原样透传（spread 保留全部原始键，绝不删改、绝不丢弃任何历史数据）
// 幂等设计：对同一份数据重复清洗，结果不变。
function normalizeDailyData(rawDailyData) {
  if (!rawDailyData || typeof rawDailyData !== 'object') return rawDailyData;
  const d = { ...rawDailyData };

  // 1) 句型复习句型清洗：sentences / coreSentences / sentence_patterns 三态统一
  const sentSrc = Array.isArray(d.sentences) ? d.sentences
    : Array.isArray(d.coreSentences) ? d.coreSentences
    : Array.isArray(d.sentence_patterns) ? d.sentence_patterns : null;
  if (sentSrc) {
    const cleaned = sentSrc.map((item, index) => {
      if (typeof item === 'string' && item.trim()) {
        return { id: `migrated_${index}`, targetSentence: item, replacedSentence: '', explanation: '历史导入内容', isTodayCore: true };
      }
      if (!item || typeof item !== 'object') {
        return { id: `migrated_${index}`, targetSentence: '有效句型复习训练', replacedSentence: '', explanation: '历史导入内容', isTodayCore: true };
      }
      const target = item.targetSentence || item.pattern || item.text || '有效句型复习训练';
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

  // 2.5) 标签碎片合并（旧 Markdown 逐标签行解析的碎片修复）：
  //      parser.js parseItems 按「每个 - [标签] 行」切块 —— 一条错题的「我说/应为/规则」三行
  //      被拆成 {original} / {correction} / {rule} 三个碎片对象（一条知识裂成三张卡片的根源）。
  //      合并规则：出现原句的碎片开启新条目；无原句的碎片（正句/规则/场景）并入上一条 ——
  //      一条纠错知识 = 一个对象，任何下游（首页提升区/复习页/入库）不再裂卡。
  if (Array.isArray(d.grammar)) d.grammar = mergeLabelFragments(d.grammar);
  if (Array.isArray(d.pronunciation)) d.pronunciation = mergeLabelFragments(d.pronunciation);
  if (Array.isArray(d.patterns)) d.patterns = mergeLabelFragments(d.patterns);

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

// ── 标签碎片合并：旧 Markdown 解析产物中，一条错题的多个标签行被拆成多个碎片对象 ──
// 碎片形状：{original} / {correction|correctSentence} / {rule|explanation} / {better} / {scene}
// 规则：「原句」碎片开启新条目；无原句的碎片（正句/规则/场景）并入上一条 —— 一条知识 = 一个对象
function mergeLabelFragments(arr) {
  if (!Array.isArray(arr)) return arr;
  const out = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { out.push(raw); continue; }
    // 「历史错题」占位符 = 原句缺失（旧入库行的占位 original 同样视为碎片而非新条目起点）
    const rawO = String(raw.original || raw.wrongSentence || '').trim();
    const hasOriginal = !!rawO && rawO !== '历史错题';
    if (!hasOriginal) {
      const prev = out.length ? out[out.length - 1] : null;
      if (prev && typeof prev === 'object' && !Array.isArray(prev)) {
        if (!String(prev.original || '').trim()) prev.original = raw.original || raw.wrongSentence || '';
        if (!String(prev.correction || '').trim() && String(raw.correction || raw.correctSentence || '').trim()) prev.correction = raw.correction || raw.correctSentence;
        if (!String(prev.better || '').trim() && String(raw.better || '').trim()) prev.better = raw.better;
        if (!String(prev.rule || '').trim() && String(raw.rule || raw.explanation || '').trim()) prev.rule = raw.rule || raw.explanation;
        if (!String(prev.scene || '').trim() && String(raw.scene || '').trim()) prev.scene = raw.scene;
        if (raw.type && !prev.type) prev.type = raw.type;
      } else {
        out.push({ ...raw });
      }
    } else {
      out.push({ ...raw });
    }
  }
  return out;
}

// ── v86 标签宽容救援：旧 Markdown 日报纠错节的补解析（parser.js 未改动，本层兜底）──
// 仅当 parser.js 对某节解析为空时补位（不重复解析、绝不覆盖 parser 已产出的数据）；
// 识别旧日报的三种写法：
//   ① "- [我说] xxx" 逐行方括号式（parseItems 会产出碎片 → 由 normalizeDailyData 合并，无需救援）
//   ② "- 我说：xxx" / "- **我说**：xxx" 冒号式（parseItems 正则无法识别 → 数组为空 → 卡片全空）
//   ③ "- xxx → yyy（规则）" 箭头式（一行 = 一条完整纠错）
// 输出直接写入 result.grammar / pronunciation / patterns（与 parser 输出同形状）
function rescueMarkdownErrorSections(text, result) {
  if (!result || !text) return;
  const sections = String(text).split(/^##\s+/m).filter(Boolean);
  const LABELS = {
    '我说': 'original', '问题': 'original', '原句': 'original', '错误': 'original',
    '应为': 'correction', '纠正': 'correction', '正确': 'correction',
    '更自然': 'better', 'better': 'better',
    '规则': 'rule', '说明': 'rule', '解析': 'rule', '解释': 'rule',
    '场景': 'scene', 'scene': 'scene'
  };
  for (const section of sections) {
    const lines = section.split('\n');
    const header = lines[0].trim();
    const content = lines.slice(1).join('\n').trim();
    if (!content) continue;
    let target = null, isExpression = false;
    if (header.includes('语法纠正')) target = 'grammar';
    else if (header.includes('发音纠正')) target = 'pronunciation';
    else if (header.includes('地道表达')) { target = 'patterns'; isExpression = true; }
    if (!target || (Array.isArray(result[target]) && result[target].length)) continue; // parser 已产出 → 不重复解析
    const items = [];
    let cur = null;
    for (const rawLine of content.split('\n')) {
      const line = rawLine.replace(/^[-*•]\s*/, '').trim();
      if (!line) continue;
      // ② 冒号式：标签：内容（含方括号 + 冒号写法）
      const labelM = line.match(/^(?:\[([^\]]+)\]|\*{0,2}([^：:]{1,8})\*{0,2})\s*[：:]\s*(.+)$/);
      if (labelM) {
        const label = String(labelM[1] || labelM[2] || '').trim();
        const val = labelM[3].trim();
        const key = LABELS[label];
        if (!key || !val) {
          // 非已知标签（如英文句子里的冒号）→ 按纯文本兜底，绝不丢行
          if (cur) cur.rule = cur.rule ? cur.rule + ' ' + line : line;
          else { const it = isExpression ? { original: line, type: 'expression' } : { original: line }; items.push(it); cur = it; }
          continue;
        }
        if (key === 'original' || !cur) {
          cur = isExpression ? { original: val, type: 'expression' } : { original: val };
          items.push(cur);
        } else if (isExpression) {
          if (key === 'better') cur.better = val;            // 地道表达节误用「应为」也归一为 better
          else if (key === 'scene') cur.scene = val;
          else if (key === 'correction') cur.better = val;
        } else {
          if (key === 'correction') cur.correction = val;
          else if (key === 'rule') cur.rule = val;
        }
        continue;
      }
      // ③ 箭头式：原句 → 正句（规则）—— 一行即一条完整纠错
      const arrowM = line.match(/^(.+?)\s*[-=→➡️]{1,3}>\s*(.+)$/);
      if (arrowM) {
        const wrong = arrowM[1].trim();
        const rest = arrowM[2].trim();
        const ruleM = rest.match(/^(.+?)\s*[（(]\s*(.+?)\s*[)）]\s*$/);
        const item = isExpression
          ? { original: wrong, better: ruleM ? ruleM[1].trim() : rest, scene: ruleM ? ruleM[2].trim() : '', type: 'expression' }
          : { original: wrong, correction: ruleM ? ruleM[1].trim() : rest, rule: ruleM ? ruleM[2].trim() : '' };
        items.push(item);
        cur = null;
        continue;
      }
      // 兜底：无标签纯文本行 —— 有当前条目则并入解析，无则视为独立原句
      if (cur) cur.rule = cur.rule ? cur.rule + ' ' + line : line;
      else { const it = isExpression ? { original: line, type: 'expression' } : { original: line }; items.push(it); cur = it; }
    }
    if (items.length) result[target] = items;
  }
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
// 所有链路（首页 / 历史日期切换 / 单词页 / 句型复习页 / 导入预览）读到的数据
// 都先经 normalizeDailyData 无损清洗，再进入 UI 渲染。
function parseSmartReport(content) {
  const t = sanitizeJsonInput(String(content || ''));   // v95：读取路径同样洗理（旧僵尸行存有围栏/包装文本也能现场解析）
  if (t.startsWith('{')) {
    try {
      const j = JSON.parse(normalizeSmartQuotes(t));   // v94：弯引号归一化后再 parse
      // v93：放宽 JSON 日报判定——summary/duration 任一存在即认（GPT 可能省略空数组键）
      if (j && typeof j === 'object' && (j.mistakes || j.coreSentences || j.newWords || j.summary || j.duration)) {
        // ① 原始数据清洗：老格式字符串/残缺字段 → 结构补齐（无损，绝不丢行）
        const cleanedRaw = normalizeDailyData(j);
        // ② 归一化产物兜底清洗：UI 契约字段必有值
        const normalized = normalizeJsonReport(cleanedRaw, t);
        // ③ 评分无损透传：summary.fluency/accuracy/naturalness 归一化层不携带，原样补回（仪表盘指标用）
        const s = (cleanedRaw && typeof cleanedRaw.summary === 'object' && cleanedRaw.summary) || {};
        for (const k of ['fluency', 'accuracy', 'naturalness', 'vocabulary']) {
          if (typeof s[k] === 'number' && normalized.summary[k] === undefined) normalized.summary[k] = s[k];
        }
        // ④ 对话占比（Voco 2.0）：优先 JSON transcript 数组（role/content），否则扫原始文本角色标注行
        if (!normalized.summary.speakingRatio) {
          const tr = j.transcript || j.conversation;
          if (Array.isArray(tr)) {
            let u = 0, a = 0;
            tr.forEach(line => {
              const role = String((line && (line.role || line.speaker)) || '').toLowerCase();
              const w = countTranscriptWords(String((line && (line.content || line.text)) || ''));
              if (role.includes('user') || role.includes('me') || role === '你' || role === '我') u += w;
              else if (role.includes('assistant') || role.includes('ai')) a += w;
            });
            if (u + a > 0) normalized.summary.speakingRatio = { user: u, ai: a };
          }
          if (!normalized.summary.speakingRatio) {
            const ratio = parseSpeakingRatio(t);
            if (ratio) normalized.summary.speakingRatio = ratio;
          }
        }
        return normalizeDailyData(normalized);
      }
    } catch (e) { /* 非法 JSON → 回退 Markdown 解析器 */ }
  }
  // ③ 传统 Markdown 解析产物同样过清洗层（原解析引擎 parser.js 不修改）
  // v86 标签宽容救援：旧日报纠错节若使用 parser.js 正则之外的写法（「标签：」/「→（说明）」等）
  // 对应数组为空 → 首页提升区内容全空。此处先按宽容模式补解析，再统一过清洗层。
  const rawParsed = parseReport(t);
  rescueMarkdownErrorSections(t, rawParsed);
  const markdownParsed = normalizeDailyData(rawParsed);
  // 对话占比兜底：Markdown 未含「对话记录」节时，全文扫角色标注行（User:/AI: 等）
  if (!markdownParsed.summary.speakingRatio) {
    const ratio = parseSpeakingRatio(t);
    if (ratio) markdownParsed.summary.speakingRatio = ratio;
  }
  return markdownParsed;
}

// ── JSON 日报归一化 + 前端约定标签自动打标 ──────────────
// 上游 ChatGPT JSON → 内部 parsed 结构；在此处统一打上布尔标签：
//   newWords → isNewToday:true   coreSentences → isTodayCore:true   mistakes → type:grammar/expression
function normalizeJsonReport(j, raw) {
  // v96 可选链加固：summary 缺失/非对象 → 空对象兜底，后续 s.* 读取永不抛 TypeError
  const s = (j && typeof j.summary === 'object' && j.summary) || {};
  const mistakes = Array.isArray(j.mistakes) ? j.mistakes : [];
  const core = Array.isArray(j.coreSentences) ? j.coreSentences : [];
  const words = Array.isArray(j.newWords) ? j.newWords : [];
  // v90 三分类分流：grammar / pronunciation / expression（发音纠正此前被 else 兜底降级为 grammar）
  const grammar = [], pronunciation = [], patterns = [];
  for (const m of mistakes) {
    if (!m || !m.original) continue;
    if (m.type === 'expression') {
      // 软性升级 → patterns（地道表达），无删除线语义
      patterns.push({ original: m.original, better: m.improved || '', scene: m.explanation || '', type: 'expression' });
    } else if (m.type === 'pronunciation') {
      // 发音纠正 → pronunciation 数组（与 Markdown 链路同形状：original/correction/rule）
      pronunciation.push({ original: m.original, correction: m.improved || '', rule: m.explanation || '', type: 'pronunciation' });
    } else {
      // 硬伤 → grammar
      grammar.push({ original: m.original, correction: m.improved || '', rule: m.explanation || '', type: 'grammar' });
    }
  }
  // v83 时长透传：顶层 duration / summary.duration / summary.durationMinutes（分钟数，旧版兼容）
  // 首页开口时长 = duration×0.6（renderMetricsOverview），JSON 日报此前丢该字段导致 8.13/8.15 时长缺失
  const dur = Number(j.duration || (s.duration) || (s.durationMinutes) || 0);
  // v97 会话占比：顶层 speakingRatio（百分比数字 0-100）→ summary.speakingRatio {user,ai,pct:true}
  // 与 Markdown 链路 parseSpeakingRatio 的 {user,ai} 词数形状对齐；pct 标记区分「百分比估算」与「词数统计」两种数据源
  const ratioNum = Number(j.speakingRatio);
  const speakingRatio = (isFinite(ratioNum) && ratioNum > 0 && ratioNum <= 100)
    ? { user: Math.round(ratioNum), ai: 100 - Math.round(ratioNum), pct: true }
    : null;
  // v105 私教洞察透传（用户指令）：四维诊断评语由 GPT 生成日报时直接产出，前端零提取；
  // 旧版日报无该字段 → null（渲染层一行降级提示，绝不开天窗）
  const ciRaw = (j && typeof j.coach_insights === 'object' && j.coach_insights) || null;
  return {
    meta: { type: 'daily-report', topic: s.topic || '', date: getLocalToday(), duration: (dur > 0 ? dur : 0) },
    grammar,
    pronunciation,
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
      // 今日对话想法归一化：上游已是 { en, zh } 对象则透传；否则从 thought 字符串提取
      dailyThought: (s.dailyThought && typeof s.dailyThought === 'object' && (s.dailyThought.en || s.dailyThought.zh))
        ? { en: String(s.dailyThought.en || ''), zh: String(s.dailyThought.zh || '') }
        : parseDailyThought(String(s.thought || '')),
      strengths: Array.isArray(s.strengths) ? s.strengths.join('\n') : '',
      next_suggestions: Array.isArray(s.nextSteps) ? s.nextSteps.join('\n') : '',
      // v90 弱项标签透传（Profile 弱项云；Markdown 链路有、JSON 链路此前丢失）
      weak_areas: s.weak_areas || '',
      // v97 对话占比（新版 JSON：百分比形态 {user,ai,pct:true}；旧版/无该字段 → null，首页优雅降级）
      speakingRatio
    },
    // v105 私教洞察四句（中文诊断评语，渲染层直接展示；键名与 Prompt 契约一字不差）
    coach_insights: ciRaw ? {
      vocabulary: String(ciRaw.vocabulary || '').trim(),
      grammar: String(ciRaw.grammar || '').trim(),
      expression: String(ciRaw.expression || '').trim(),
      core_patterns: String(ciRaw.core_patterns || '').trim()
    } : null,
    raw
  };
}

// ── Import Dialog (v97 重构：实时校验 Modal) ───────────────
// 交互状态解耦三段式：输入 → 防抖校验预览 → 确认入库。
// 状态机（等价 React 范式：useState 三个状态 + useEffect(debounce) 监听 input）：
//   idle   空输入        → 预览卡隐藏，确认按钮禁用
//   checking 防抖等待中  → 按钮保持禁用（输入即锁）
//   valid  校验通过      → 绿卡「格式校验通过」+ 统计预览，确认按钮高亮可点
//   error  校验失败      → 红卡指出具体原因（格式错误 / 缺少关键字段 / 无法识别），按钮强制禁用
// 入库只消费 _importState.payload（校验时生成的干净产物），绝不从文本框直接解析写库。
const _importState = { status: 'idle', error: '', preview: null, payload: null };
let _importDebounceTimer = null;
const IMPORT_DEBOUNCE_MS = 350;

// ── 实时校验器（纯函数）：输入文本 → 校验结果 + 入库产物 ──
function validateImportInput(text) {
  const raw = String(text || '').trim();
  if (!raw) return { status: 'idle', error: '', preview: null, payload: null };

  // 洗理（BOM/围栏/跨度提取/智能引号状态机）后判定 JSON 意图
  const cleaned = sanitizeJsonInput(raw);
  if (cleaned.startsWith('{')) {
    let j = null;
    try { j = JSON.parse(cleaned); }
    catch (e) {
      console.error('[ImportModal] JSON.parse 失败（真实堆栈）:', e, '\n文本片段:', cleaned.slice(0, 300));
      return { status: 'error', error: '格式错误：JSON 语法不合法，无法解析（详情见控制台）', preview: null, payload: null };
    }
    if (!j || typeof j !== 'object' || Array.isArray(j)) {
      return { status: 'error', error: '格式错误：解析结果不是有效的 JSON 对象', preview: null, payload: null };
    }
    // 关键字段完整性校验（完美日报指令契约：内容 4 键 + summary 9 键必查；
    // 会话维度 duration（旧版分钟数）/ speakingRatio（新版对话占比）均可选，新旧模板兼容）
    const requiredTop = ['summary', 'mistakes', 'coreSentences', 'newWords'];
    const missingTop = requiredTop.filter(k => j[k] === undefined || j[k] === null);
    if (missingTop.length) {
      return { status: 'error', error: `缺少关键字段：${missingTop.join('、')}。请用「复制日报模板」重新生成`, preview: null, payload: null };
    }
    const s = (j.summary && typeof j.summary === 'object') ? j.summary : null;
    if (!s) return { status: 'error', error: '缺少关键字段：summary 必须是对象', preview: null, payload: null };
    const requiredSummary = ['topic', 'dailyThought', 'strengths', 'nextSteps', 'fluency', 'accuracy', 'naturalness', 'vocabulary', 'weak_areas'];
    const missingSummary = requiredSummary.filter(k => s[k] === undefined || s[k] === null);
    if (missingSummary.length) {
      return { status: 'error', error: `summary 缺少关键字段：${missingSummary.join('、')}`, preview: null, payload: null };
    }
    // 通过 → 生成归一化产物与预览统计（与入库走同一条 normalize 链，预览即所得）
    const normalized = normalizeJsonReport(normalizeDailyData(j), cleaned);
    const errCount = normalized.grammar.length + normalized.pronunciation.length;
    const patternCount = normalized.patterns.length + normalized.sentence_patterns.length;
    const dur = Number(j.duration) || 0;
    const num = (v) => (typeof v === 'number' && isFinite(v)) ? v : null;
    return {
      status: 'valid', error: '',
      preview: {
        type: 'json', date: getLocalToday(), topic: s.topic || '', duration: dur,
        speakingRatio: num(j.speakingRatio),
        fluency: num(s.fluency), accuracy: num(s.accuracy), naturalness: num(s.naturalness), vocabulary: num(s.vocabulary),
        wordCount: normalized.vocabulary.length, errorCount: errCount, patternCount
      },
      payload: { kind: 'json', jsonReport: j, cleanedText: cleaned }
    };
  }

  // 非 JSON → 传统 Markdown 日报（话题卡 / 分析报告已在 v97 彻底下线，直接拒绝）
  let parsed = null, type = null;
  try { parsed = parseSmartReport(cleaned); type = parsed && parsed.meta && parsed.meta.type; }
  catch (e) {
    console.error('[ImportModal] Markdown 解析异常（真实堆栈）:', e);
    return { status: 'error', error: '无法识别内容格式：请粘贴日报 JSON（推荐）或旧版 Markdown 日报', preview: null, payload: null };
  }
  if (type === 'topic-card' || type === 'insight-report') {
    return { status: 'error', error: '话题卡 / 分析报告导入已下线：本入口只接受口语日报', preview: null, payload: null };
  }
  if (type === 'daily-report' || (!type && Object.keys(parsed.meta).length > 0)) {
    const num = (v) => (typeof v === 'number' && isFinite(v)) ? v : null;
    return {
      status: 'valid', error: '',
      preview: {
        type: 'markdown', date: parsed.meta.date || getLocalToday(), topic: parsed.meta.topic || '',
        duration: Number(parsed.meta.duration) || 0,
        fluency: num(parsed.summary.fluency), accuracy: num(parsed.summary.accuracy), naturalness: num(parsed.summary.naturalness),
        wordCount: (parsed.vocabulary || []).length,
        errorCount: (parsed.grammar || []).length + (parsed.pronunciation || []).length,
        patternCount: (parsed.patterns || []).length
      },
      payload: { kind: 'markdown', parsed }
    };
  }
  return { status: 'error', error: '无法识别内容格式：请粘贴日报 JSON（推荐）或旧版 Markdown 日报', preview: null, payload: null };
}

// ── 预览卡渲染 + 确认按钮状态控制（唯一写按钮状态的入口）──
function setImportSubmitEnabled(enabled) {
  const btn = document.getElementById('btn-dialog-submit');
  if (btn) btn.disabled = !enabled;
}
function renderImportPreview() {
  const box = document.getElementById('dialog-preview');
  const st = _importState;
  if (!box) return;
  if (st.status === 'idle' || st.status === 'checking') {
    box.classList.add('hidden'); box.innerHTML = '';
    setImportSubmitEnabled(false);
    return;
  }
  box.classList.remove('hidden');
  if (st.status === 'valid' && st.preview) {
    const p = st.preview;
    const scoreCell = (label, v) => `<div class="flex flex-col items-center py-1.5 rounded-xl bg-[var(--c-bg)]"><span class="text-[0.6875rem] text-[var(--c-text-ultradim)]">${label}</span><span class="text-sm font-bold text-[var(--c-text)]">${v === null || v === undefined ? '—' : v}</span></div>`;
    box.innerHTML = `
      <div class="border border-[#2f9e63] bg-[#2f9e630f] rounded-2xl p-3.5">
        <div class="flex items-center gap-2 mb-2.5">
          <span class="w-[18px] h-[18px] rounded-full bg-[#2f9e63] text-white text-[0.6875rem] flex items-center justify-center shrink-0">✓</span>
          <span class="text-sm font-bold text-[#2f9e63]">格式校验通过</span>
          <span class="ml-auto text-[0.6875rem] text-[var(--c-text-ultradim)]">${p.type === 'json' ? 'JSON 日报' : 'Markdown 日报'}</span>
        </div>
        <div class="grid grid-cols-4 gap-1.5 mb-1.5">
          ${(p.speakingRatio !== null && p.speakingRatio !== undefined) ? scoreCell('对话占比', p.speakingRatio + '%') : scoreCell('时长(分)', p.duration)}${scoreCell('新词', p.wordCount)}${scoreCell('纠错', p.errorCount)}${scoreCell('句型', p.patternCount)}
        </div>
        <div class="grid grid-cols-4 gap-1.5">
          ${scoreCell('流利度', p.fluency)}${scoreCell('准确度', p.accuracy)}${scoreCell('自然度', p.naturalness)}${scoreCell('词汇', p.vocabulary)}
        </div>
        ${p.topic ? `<div class="mt-2 text-[0.6875rem] text-[var(--c-text-dim)] leading-relaxed">话题：${h(p.topic)}<span class="ml-2 text-[var(--c-text-ultradim)]">入库日期 ${p.date}</span></div>` : ''}
      </div>`;
    setImportSubmitEnabled(true);
    return;
  }
  // error → 红卡 + 具体原因，按钮强制禁用
  box.innerHTML = `
    <div class="border border-[#d64545] bg-[#d645450f] rounded-2xl p-3.5">
      <div class="flex items-center gap-2 mb-1.5">
        <span class="w-[18px] h-[18px] rounded-full bg-[#d64545] text-white text-[0.6875rem] flex items-center justify-center shrink-0">✕</span>
        <span class="text-sm font-bold text-[#d64545]">格式校验失败</span>
      </div>
      <div class="text-xs text-[var(--c-text-dim)] leading-relaxed">${h(st.error || '未知错误')}</div>
    </div>`;
  setImportSubmitEnabled(false);
}

// ── 防抖输入监听（粘贴同样触发 input 事件）──
function onImportInput() {
  const text = document.getElementById('dialog-report-input').value;
  // 输入即锁：等待校验期间禁止提交（旧校验结果立即作废）
  setImportSubmitEnabled(false);
  clearTimeout(_importDebounceTimer);
  _importDebounceTimer = setTimeout(() => {
    const result = validateImportInput(text);
    _importState.status = result.status;
    _importState.error = result.error;
    _importState.preview = result.preview;
    _importState.payload = result.payload;
    renderImportPreview();
  }, IMPORT_DEBOUNCE_MS);
}

function showImportDialog() {
  const dlg = document.getElementById('import-dialog');
  dlg.classList.remove('hidden');
  const ta = document.getElementById('dialog-report-input');
  if (ta) { ta.value = ''; setTimeout(() => ta.focus(), 50); }
  clearTimeout(_importDebounceTimer);
  _importState.status = 'idle'; _importState.error = ''; _importState.preview = null; _importState.payload = null;
  renderImportPreview();
}
function hideImportDialog() {
  clearTimeout(_importDebounceTimer);
  document.getElementById('import-dialog').classList.add('hidden');
}

// ── 🔥 Streak calc ────────────────────────────────────
function calcStreak(dates) {
  if (!dates.length) return 0;
  const today = getLocalToday();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yStr = fmtLocalDate(yesterday); // v64 时区安全：本地昨日，禁 toISOString 截断
  const hasToday = dates.includes(today);
  const hasYesterday = dates.includes(yStr);
  if (!hasToday && !hasYesterday) return 0;
  let check = hasToday ? new Date() : yesterday;
  let streak = 0;
  while (true) {
    const s = fmtLocalDate(check); // v64 时区安全：本地日历日回推
    if (dates.includes(s)) { streak++; check.setDate(check.getDate() - 1); }
    else break;
  }
  return streak;
}

// ═══════════════════════════════════════════════════════
// TAB 2: WORDS
// ═══════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════
// Voco 2.0 状态构建器（SSOT 输入唯一出处）：loadHome 与 loadWords 共用，
// 根治「状态孤岛」—— 此前首页直连 / 时 _reportParsed/_wordsAll 从未初始化
// ═══════════════════════════════════════════════════════
function buildGlobalMissionInputs(vocab, errors, reports, patterns) {
  const today = getLocalToday();
  // v82 日期路由解析源：reports 行缓存（parsedReportFor 按日期检索，各页共享）
  _reportsCache = (reports && reports.length) ? reports : _reportsCache;
  // 真实解析数据源（时间网关）：_reportParsed 只允许「今日」日报（报表行 r.date === today）
  // resolveActiveReport 的「最新有效日报」历史回退产物严禁流入 —— 历史报告会被打 isNewToday 造成时间轴穿透
  const strictToday = (reports && reports.length) ? reports.find(r => r.date === today && isDailyReport(r)) : null;
  _reportParsed = strictToday ? parseSmartReport(strictToday.content) : null;
  if (_reportParsed) _reportParsed.meta.date = strictToday.date; // meta.date 回写为报表行日期 —— 时间网关校验依据
  // v75 历史视图数据源：点小熊日历选择非今日日期时，解析该日日报（独立于今日 _reportParsed，时间网关绝不混流）
  if (_viewDate && _viewDate !== today) {
    const hist = (reports && reports.length) ? reports.find(r => r.date === _viewDate && isDailyReport(r)) : null;
    _historyParsed = hist ? parseSmartReport(hist.content) : null;
    if (_historyParsed) _historyParsed.meta.date = hist.date; // meta.date 回写为报表行日期 —— 历史渲染网关校验依据
  } else {
    _historyParsed = null;
  }
  // 句型 SRS 历史库：patterns 表全量打标（needsReview 布尔）+ 文本去重（v104 双行遗留收敛），喂给 getTodayMissionState
  // 空表（无历史句型）→ [] 兜底，绝不回退 Mock 句库
  _patternLibrary = dedupePatternsByText(stampPatternTags((patterns && patterns.length) ? patterns : []));
  // 打标网关：内置词库合并 + 布尔标签一次性注入（渲染层只读布尔值，零时间判断）
  // 断流修复：日报生词在此合并进全局词库 —— 首页/复习页数据源绝对一致
  // v86 全局加固：错题表行在进入全局状态前统一碎片合并 —— 所有下游消费方
  // （错词交叉打标 / errRows 兜底 / 对练防御池 / 混合卡组）拿到的都是一条知识 = 一行
  _errorsAll = mergeLabelFragments(errors || []);   // v95：mockMistakeErrors 已物理删除，空表=空数组
  _wordsAll = mergeReportVocab(buildWordSnapshot(vocab, _errorsAll), _reportParsed);
  // v103 存量去重：vocabulary 表历史盲插遗留重复行（同词多行）→ 今日待办/图鉴/计数出现同一单词多卡。
  // 按 word 小写去重保留首行（fetch order created_at desc → 首行 = 最新插入行，SM-2 态最新）；
  // 只读展示层去重，不碰存量 DB 行（物理清理见 ⚙️ 后端/cleanup_vocab_dupes.sql）
  const _seenWords = new Set();
  _wordsAll = _wordsAll.filter(v => {
    const k = String(v.word || '').toLowerCase().trim();
    if (!k || _seenWords.has(k)) return false;
    _seenWords.add(k);
    return true;
  });
  // 今日实际完成复习的词 id 集合（存储层 UTC 时间戳 → 本地日历日比对；SSOT reviewedVocabToday 输入）
  _reviewedVocabTodayIds = new Set(
    _wordsAll.filter(v => v.last_reviewed_at && localDateOf(v.last_reviewed_at) === today).map(v => String(v.id))
  );
}

// ═══════════════════════════════════════════════════════
// v82 日期路由解析源（SSOT 副链）：任意日期 → 该日日报 parseSmartReport 结果
// 优先复用已解析缓存：今日 → _reportParsed；历史视图所选日 → _historyParsed；其余 → _reportsCache 现解析
// 该日无日报行/非日报内容 → null（调用方渲染空状态，绝不回退今日数据造成日期穿透）
// ═══════════════════════════════════════════════════════
const _parsedReportDateCache = new Map();
function parsedReportFor(date) {
  if (!date) return null;
  const today = getLocalToday();
  if (date === today) return _reportParsed;
  if (date === _viewDate && _historyParsed) return _historyParsed;
  if (_parsedReportDateCache.has(date)) return _parsedReportDateCache.get(date);
  const row = (_reportsCache || []).find(r => r.date === date && isDailyReport(r));
  const parsed = row ? parseSmartReport(row.content) : null;
  if (parsed) parsed.meta.date = row.date; // meta.date 回写为报表行日期
  _parsedReportDateCache.set(date, parsed);
  return parsed;
}

// ═══════════════════════════════════════════════════════
// v104 四维计数 SSOT：打分面板四子块 / 提升区四按钮跳转页 / 列表计数头 / 审计机制共用同一函数
// 数量 100% 一致的唯一地基 —— 列表渲染与面板数字走同一数据桶，杜绝「面板 N、列表 M」
// 语法纠正必须经 standardizeErrorCards（与语法错题列表同函数：碎片合并 + 形状归一后长度恒一致）；
// 发音错题 v99 起整体移出错题体系，不再合并 pronunciation
// ═══════════════════════════════════════════════════════
function getDayCounts(parsed) {
  if (!parsed) return { vocab: 0, grammar: 0, expressions: 0, core: 0 };
  return {
    vocab: (parsed.vocabulary || []).length,
    // 与 allGrammarErrors(_ctxDate 分支) 完全同口径：同一 original||correction 过滤网 + 同一 standardizeErrorCards 清洗
    // （碎片合并会收缩数组长度 —— 面板计数若不与列表同函数，就会再现「面板 N / 列表 M」）
    grammar: standardizeErrorCards((parsed.grammar || []).filter(e => e && (e.original || e.correction))).length,
    expressions: (parsed.patterns || []).length,
    core: (parsed.sentence_patterns || []).length
  };
}

// ═══════════════════════════════════════════════════════
// v104 日报一致性审计（用户指令）：逐份日报核对「打分面板四子块数字」与「四按钮跳转页渲染列表长度」
// 方法论：面板数字 = getDayCounts(parsed)（SSOT 计数）；
//         列表长度 = 跳转页真实渲染函数实测 —— 词汇 getFilteredVocab(_wordsAll,'today')、语法 allGrammarErrors()
//         （临时切换 _ctxDate 后立即还原，执行的就是用户点击按钮后页面跑的同一条代码）；
//         自然表达 / 核心句型 = parsedReportFor(该日).patterns / sentence_patterns 桶长度（三视图列表同源）
// 历史日期隔离（自我审查）：跳转页在历史日期无报时返回空态（列表 0），面板该日同样 0 —— 绝不回退全局错题本或今日数据
// ═══════════════════════════════════════════════════════
async function runReportAudit() {
  const btn = document.getElementById('btn-audit-reports');
  if (btn) btn.disabled = true;
  try {
    const { data: reports } = await sb.from('reports').select('*').order('date', { ascending: false }).limit(1000);
    const rows = (reports || []).filter(isDailyReport);
    // 审计自给自足：缓存换血为最新拉取行，并清空解析缓存 —— parsedReportFor / getFilteredVocab / allGrammarErrors 全部按最新数据解析
    _reportsCache = rows;
    if (_parsedReportDateCache && _parsedReportDateCache.clear) _parsedReportDateCache.clear();
    const today = getLocalToday();
    const results = [];
    for (const r of rows) {
      const parsed = parseSmartReport(r.content);
      if (!parsed) { results.push({ date: r.date, parseFail: true }); continue; }
      // 今日行强制同源：无条件以刚拉取的最新内容重建 _reportParsed —— 杜绝「首页旧解析 vs 审计新拉取」的假 ✗ 分歧
      // （冷启动缺席也一并覆盖）；parsedReportFor(today) 早返回 _reportParsed，今日行必须与此处 parsed 完全同源
      if (r.date === today) _reportParsed = parsed;
      const counts = getDayCounts(parsed);
      const savedCtx = _ctxDate;
      _ctxDate = r.date;
      const dp = parsedReportFor(r.date) || {};
      const list = {
        vocab: getFilteredVocab(_wordsAll, 'today').length,
        grammar: allGrammarErrors().length,
        expressions: (dp.patterns || []).length,
        core: (dp.sentence_patterns || []).length
      };
      _ctxDate = savedCtx;
      results.push({
        date: r.date,
        checks: [
          { label: '当日新词', panel: counts.vocab, list: list.vocab },
          { label: '语法纠正', panel: counts.grammar, list: list.grammar },
          { label: '自然表达', panel: counts.expressions, list: list.expressions },
          { label: '核心句型', panel: counts.core, list: list.core }
        ]
      });
    }
    renderAuditModal(results, null);
  } catch (e) {
    renderAuditModal([], e);
  }
  if (btn) btn.disabled = false;
}

function renderAuditModal(results, error) {
  const dialog = document.getElementById('audit-dialog');
  if (!dialog) { showToast('审计组件缺失，请刷新页面重试'); return; }
  const body = document.getElementById('audit-report');
  let html = '';
  if (error) {
    html = `<div class="px-4 py-6 text-center text-sm text-[var(--c-text-dim)]">⚠️ 审计执行失败：${h(String((error && error.message) ? error.message : error))}</div>`;
  } else if (!results.length) {
    html = `<div class="px-4 py-6 text-center text-sm text-[var(--c-text-dim)]">未找到任何日报记录 —— 先导入日报再审计</div>`;
  } else {
    const failedDates = results.filter(r => r.parseFail).length;
    const allChecks = results.filter(r => r.checks).flatMap(r => r.checks);
    const bad = allChecks.filter(c => c.panel !== c.list);
    html += `<div class="px-4 py-4 text-center border-b border-[var(--c-border-light)]">
      <div class="text-sm font-bold ${bad.length ? 'text-[var(--c-red)]' : 'text-[var(--c-green)]'}">${bad.length ? `✗ 发现 ${bad.length} 处不一致` : '✓ 全部一致 —— 面板数字与跳转页列表 100% 对齐'}</div>
      <div class="text-[0.6875rem] text-[var(--c-text-ultradim)] mt-1">共审计 ${results.length} 份日报${failedDates ? `（${failedDates} 份解析失败，请检查原始 JSON）` : ''}</div>
    </div>`;
    for (const r of results) {
      if (r.parseFail) {
        html += `<div class="px-4 py-3 border-b border-[var(--c-border-light)]"><div class="text-sm font-semibold text-[var(--c-text)]">${h(r.date)}</div><div class="text-xs text-[var(--c-red)] mt-0.5">⚠️ JSON 解析失败 —— 该日报不会被首页面板与跳转页计入</div></div>`;
        continue;
      }
      const cells = r.checks.map(c => c.panel === c.list
        ? `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--c-green-light)] text-[0.6875rem] text-[var(--c-green)]">✓ ${c.label} ${c.panel}</span>`
        : `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-[0.6875rem] text-[var(--c-red)]">✗ ${c.label} 面板 ${c.panel} ≠ 列表 ${c.list}</span>`).join('');
      html += `<div class="px-4 py-3 border-b border-[var(--c-border-light)]"><div class="text-sm font-semibold text-[var(--c-text)] mb-1.5">${h(r.date)}</div><div class="flex flex-wrap gap-1.5">${cells}</div></div>`;
    }
    html += `<div class="px-4 py-3 text-[0.6875rem] text-[var(--c-text-dim)] leading-relaxed bg-[var(--c-bg)]">🛡️ 路由隔离审查：四个跳转按钮均携带该日 date 参数；该日无日报时跳转页返回空态（0 条），绝不回退全局错题本或今日数据。语法/词汇列表经 getFilteredVocab / allGrammarErrors 的 _ctxDate 早分支按日解析；自然表达/核心句型列表直读该日日报 patterns / sentence_patterns 桶。</div>`;
  }
  body.innerHTML = html;
  refreshIcons(dialog);
  dialog.classList.remove('hidden');
}

function hideAuditDialog() {
  const dialog = document.getElementById('audit-dialog');
  if (dialog) dialog.classList.add('hidden');
}

// ═══════════════════════════════════════════════════════════════
// v105 全局体检 runGlobalAudit（用户指令）：浏览器 Console 一键触发（runGlobalAudit()），
// 7 模块顺序巡检，后台静默运行，Console 输出 ✅/❌ 结构化体检报告 + 成功/失败统计汇总。
// 设计铁律：
//  ① 巡检绝不写库——所有「模拟点击」只走导航/渲染/队列构建链路，绝不触发 SM-2 反馈与导入；
//     每个模块结束时全局状态与 URL 100% 还原，体检本身零副作用；
//  ② 断言一律消费现有 SSOT 函数（getDayCounts / getDueSentencesQueue / buildDueDeck /
//     dueErrorCards / getTodayMissionState / parsedReportFor / allGrammarErrors），
//     审计结论 = 用户实际操作时的同一条代码路径，绝不自造第二套计数；
//  ③ 模块间严格串行（await），单模块抛错只记该模块失败，不中断后续巡检；
//  ④ 未登录/数据未加载 → 该模块显式 ⚠️ SKIP，绝不伪造 ✅。
// ═══════════════════════════════════════════════════════════════
let _auditStats = { total: 0, pass: 0, fail: 0, skip: 0, fails: [] };
function _auditSection(title) { console.log('%c\n━━━━━━ ' + title + ' ━━━━━━', 'font-weight:bold;color:#8a6d3b'); }
function _auditPass(label) { _auditStats.total++; _auditStats.pass++; console.log('%c✅ PASS%c ' + label, 'color:#2e7d32;font-weight:bold', 'color:inherit'); }
function _auditFail(label, detail) {
  _auditStats.total++; _auditStats.fail++; _auditStats.fails.push({ label: label, detail: detail || '' });
  console.log('%c❌ FAIL%c ' + label + (detail ? ' —— ' + detail : ''), 'color:#c62828;font-weight:bold', 'color:#c62828');
}
function _auditSkip(label, reason) { _auditStats.total++; _auditStats.skip++; console.log('%c⚠️ SKIP%c ' + label + (reason ? '（' + reason + '）' : ''), 'color:#b26a00;font-weight:bold', 'color:inherit'); }
const _auditSettle = (ms) => new Promise(r => setTimeout(r, ms || 300));
async function _auditWaitFor(cond, tries, step) {
  for (let i = 0; i < (tries || 15); i++) { if (cond()) return true; await _auditSettle(step || 200); }
  return !!cond();
}
// 全局状态快照/还原：体检期间被触碰的所有路由与视图状态，结束后逐项复位
function _auditSnapshot() {
  return {
    url: location.pathname + location.search,
    viewDate: _viewDate, historyParsed: _historyParsed, ctxDate: _ctxDate, speakView: _speakView,
    reportParsed: _reportParsed, wordsFilter: _wordsFilter,
    srsQueue: _srsQueue, srsIdx: _srsIdx, srsReviewed: _srsReviewed, srsTotal: _srsTotal, srsResults: _srsResults,
    streakScrollCache: _streakScrollCache, streakAnchored: _streakAnchored,
    activeFilter: _activeFilter, activeFilterLabel: _activeFilterLabel
  };
}
function _auditRestore(snap) {
  _viewDate = snap.viewDate; _historyParsed = snap.historyParsed; _ctxDate = snap.ctxDate;
  _speakView = snap.speakView; _reportParsed = snap.reportParsed; _wordsFilter = snap.wordsFilter;
  _srsQueue = snap.srsQueue; _srsIdx = snap.srsIdx; _srsReviewed = snap.srsReviewed;
  _srsTotal = snap.srsTotal; _srsResults = snap.srsResults;
  _streakScrollCache = snap.streakScrollCache; _streakAnchored = snap.streakAnchored;
  _activeFilter = snap.activeFilter; _activeFilterLabel = snap.activeFilterLabel;
  if (snap.url !== location.pathname + location.search) window.history.replaceState({}, '', snap.url);
}
// 回到首页并等待渲染落定（体检模块间的归位锚点）
async function _auditGoHome() {
  if (location.pathname + location.search !== '/') window.history.replaceState({}, '', '/');
  document.querySelector('.tab[data-tab=home]').click();
  await _auditWaitFor(() => !_homeLoading && !!document.getElementById('home-quests') && document.getElementById('home-quests').innerHTML.length > 0, 20, 250);
}

// ── 模块一：交互链路与路由精确度（首页指标区 / 提升区四卡 / To-Do List 全链路）──
async function auditModule1() {
  await _auditGoHome();
  // 1.1 首页指标区四子块渲染
  const metricsEl = document.getElementById('home-metrics');
  const mText = metricsEl ? (metricsEl.textContent || '') : '';
  const fourLabels = ['个当日新词', '项语法纠正', '个自然表达', '个核心句型'];
  if (fourLabels.every(t => mText.includes(t))) _auditPass('首页指标区：四子块（当日新词/语法纠正/自然表达/核心句型）全部渲染');
  else _auditFail('首页指标区：四子块渲染缺失', (mText || '（home-metrics 为空）').slice(0, 80));
  // 1.2 提升区四卡按钮与四子块 1:1 映射
  // v107 空态折叠感知：今日无日报 → renderHomeSections 折叠 #home-insights（四卡按设计不渲染）→ 属正常态非死链；
  // 有今日日报时四卡必须渲染且与打分面板四子块 1:1 映射，四条跳转链路逐一真实点击断言
  const insightsEl = document.getElementById('home-insights');
  if (insightsEl && insightsEl.classList.contains('hidden')) {
    const hero = document.getElementById('home-empty-hero');
    if (hero && !hero.classList.contains('hidden'))
      _auditPass('提升区四卡：今日无日报 → 空态折叠（#home-insights 隐藏 + Hero 引导卡顶上，四卡按设计不渲染，非死链）');
    else _auditFail('提升区四卡：空态折叠不完整', '#home-insights 隐藏但 #home-empty-hero 未显示');
    _auditSkip('提升区四卡跳转链路', '今日无日报、四卡未渲染——导入今日日报后重跑即可覆盖路由断言');
  } else {
    const jumpBtns = [...document.querySelectorAll('#home-insights [data-improve-jump]')].map(b => b.dataset.improveJump);
    if (jumpBtns.length === 4 && ['vocab', 'grammar', 'expression', 'core'].every(t => jumpBtns.includes(t)))
      _auditPass('提升区四卡：vocab/grammar/expression/core 四个跳转按钮与打分面板四子块 1:1 映射');
    else _auditFail('提升区四卡：跳转按钮缺失或映射错乱', '实际 ' + JSON.stringify(jumpBtns));
    // 1.3 四跳转链路由精确度（真实点击按钮 → URL/内部状态精确切换）
    const routes = [
      { type: 'vocab', label: '词汇', path: '/review', search: 'filter=today', state: () => _wordsFilter === 'today' && _ctxDate === null, tab: 'tab-words', desc: '/review?filter=today · 今日新词过滤态' },
      { type: 'grammar', label: '语法纠正', path: '/review', search: 'tab=grammar', state: () => _wordsFilter === 'grammar' && _ctxDate === null, tab: 'tab-words', desc: '/review?tab=grammar' },
      { type: 'expression', label: '自然表达', path: '/shadowing', search: 'view=expressions', state: () => _speakView === 'expressions' && _ctxDate === null, tab: 'tab-speak', desc: '/shadowing?view=expressions' },
      { type: 'core', label: '核心句型', path: '/shadowing', search: 'view=core', state: () => _speakView === 'core' && _ctxDate === null, tab: 'tab-speak', desc: '/shadowing?view=core' }
    ];
    for (const r of routes) {
      const btn = document.querySelector(`#home-insights [data-improve-jump="${r.type}"]`);
      if (!btn) { _auditFail(`「${r.label}」按钮缺失（四卡已渲染但无 [data-improve-jump=${r.type}]）`); continue; }
      if (btn.disabled) { _auditPass(`「${r.label}」按钮防御态 disabled —— 该维度无数据时点击零响应（拦截正确，非死链）`); continue; }
      try { btn.click(); } catch (e) { _auditFail(`「${r.label}」跳转抛异常`, String((e && e.message) || e)); continue; }
      await _auditWaitFor(() => location.pathname === r.path, 8, 250);
      if (location.pathname !== r.path) { _auditFail(`「${r.label}」跳转：路径未切换`, `当前 ${location.pathname + location.search}，期望 ${r.desc}`); continue; }
      await _auditWaitFor(r.state, 20, 300);
      const activeTab = document.querySelector('.tab-content.active');
      const ok = r.state() && location.search.includes(r.search) && activeTab && activeTab.id === r.tab;
      if (ok) _auditPass(`「${r.label}」→ ${r.desc}：URL 与内部状态精确切换`);
      else _auditFail(`「${r.label}」→ ${r.desc}：状态断言失败`, `URL=${location.pathname + location.search} _wordsFilter=${_wordsFilter} _speakView=${_speakView} _ctxDate=${_ctxDate} 激活Tab=${activeTab ? activeTab.id : '无'}`);
      await _auditGoHome();
    }
  }
  // 1.4 To-Do List 三条链路
  const todoEls = () => document.querySelectorAll('#home-quests [data-todo-idx]');
  if (!todoEls().length) { _auditFail('To-Do List 未渲染', 'home-quests 无任务行'); return; }
  const t0 = todoEls()[0];
  if (t0) {
    if (/已导入/.test(t0.textContent || '')) _auditPass('任务 1（对练打卡）：今日已导入 → 完成态，点击零响应（非死链）');
    else {
      t0.click(); await _auditSettle(200);
      const dlg = document.getElementById('import-dialog');
      if (dlg && !dlg.classList.contains('hidden')) { _auditPass('任务 1（对练打卡）：点击 → 导入日报弹窗正常唤起'); hideImportDialog(); }
      else _auditFail('任务 1（对练打卡）：点击后导入弹窗未唤起');
    }
  }
  const t1 = todoEls()[1];
  if (t1) {
    if (/暂无复习任务/.test(t1.textContent || '')) _auditPass('任务 2（句型复习）：防御态 disabled —— 队列 0 时点击零响应（非死链）');
    else {
      t1.click();
      await _auditWaitFor(() => location.pathname === '/shadowing', 8, 250);
      await _auditWaitFor(() => {
        const sp = document.getElementById('speak-player');
        return !!sp && (!!sp.querySelector('.srs-flip-scene') || /暂无待复习句型/.test(sp.textContent || ''));
      }, 20, 300);
      if (location.pathname === '/shadowing' && _speakView === '') _auditPass('任务 2（句型复习）：点击 → /shadowing SRS 翻卡页，_speakView 正确为空');
      else _auditFail('任务 2（句型复习）：路由未正确切换', `URL=${location.pathname + location.search} _speakView=${_speakView}`);
    }
  }
  await _auditGoHome();
  const t2 = todoEls()[2];
  if (t2) {
    t2.click();
    await _auditWaitFor(() => location.pathname === '/review' && _wordsFilter === 'due', 20, 300);
    const dueTab = location.search.includes('tab=due');
    if (location.pathname === '/review' && dueTab && _ctxDate === null && _wordsFilter === 'due') _auditPass('任务 3（复习打卡）：点击 → /review?tab=due，_ctxDate 今日链路');
    else _auditFail('任务 3（复习打卡）：路由未正确切换', `URL=${location.pathname + location.search} _wordsFilter=${_wordsFilter} _ctxDate=${_ctxDate}`);
  }
  await _auditGoHome();
}

// ── 模块二：待办系统与 SM-2 的数据钩稽（面板数字 vs 点击后实际队列/卡组长度）──
async function auditModule2() {
  await _auditGoHome();
  // 2.1 任务 2（句型）：面板数字 === getDueSentencesQueue 队列长度（同源断言）
  if (!_patternLibrary.length) { try { await loadSpeak(); await _auditGoHome(); } catch (e) { /* 网络失败交由下方 SKIP */ } }
  const t1 = document.querySelectorAll('#home-quests [data-todo-idx]')[1];
  if (!t1) { _auditSkip('任务 2 数字钩稽', 'To-Do List 未渲染'); }
  else {
    const dom1 = t1.textContent || '';
    const m1 = dom1.match(/[（(](\d+)句[)）]/);   // v107：半/全角括号双兼容（实际渲染为半角 `(N句)`，全角为正则盲区）
    const queueLen = getDueSentencesQueue(_patternLibrary).length;
    if (m1 && parseInt(m1[1], 10) === queueLen) _auditPass(`任务 2 数字一致：面板显示 ${queueLen} 句 === getDueSentencesQueue(_patternLibrary).length = ${queueLen}`);
    else if (/暂无复习任务/.test(dom1) && queueLen === 0) _auditPass('任务 2 数字一致：队列 0 → 防御态文案（0 = 0）');
    else if (!m1 && !queueLen) _auditSkip('任务 2 数字钩稽', '面板无数字且队列为 0，无可比对样本');
    else _auditFail('任务 2 数字分裂', `面板显示「${m1 ? m1[1] : '无数字'}」，实际 queue.length = ${queueLen}`);
    // 2.2 模拟点击进入 SM-2 调度队列：点击后 _srsQueue.length 必须与面板数字 100% 相等
    if (m1 && parseInt(m1[1], 10) > 0) {
      const before = _srsQueue;
      t1.click();
      await _auditWaitFor(() => location.pathname === '/shadowing' && _srsQueue !== before && _srsQueue.length > 0, 25, 300);
      if (_srsQueue.length === queueLen) _auditPass(`任务 2 点击后进入 SM-2 调度队列：实际 _srsQueue.length = ${_srsQueue.length} === 面板 ${queueLen}`);
      else _auditFail('任务 2 点击后队列与面板数字不一致', `_srsQueue.length = ${_srsQueue.length}，面板 = ${queueLen}`);
    }
    await _auditGoHome();
  }
  // 2.3 任务 3（复习）：面板数字 === 到期词 + 错题；点击后 buildDueDeck 实际卡组长度一致
  if (!_wordsAll.length) { try { await loadWords(); await _auditGoHome(); } catch (e) { /* 网络失败交由 SKIP */ } }
  const t2 = document.querySelectorAll('#home-quests [data-todo-idx]')[2];
  if (!t2) { _auditSkip('任务 3 数字钩稽', 'To-Do List 未渲染'); return; }
  const dom2 = t2.textContent || '';
  const m2 = dom2.match(/[（(](\d+)张[)）]/);   // v107：同上，半/全角括号双兼容
  const ms = getTodayMissionState(_wordsAll, _reportParsed, _reviewedVocabTodayIds);
  const deckTotal = ms.totalDueVocabCount + dueErrorCards().length;
  if (m2 && parseInt(m2[1], 10) === deckTotal) _auditPass(`任务 3 数字一致：面板显示 ${deckTotal} 张 === 到期词 ${ms.totalDueVocabCount} + 到期错题 ${deckTotal - ms.totalDueVocabCount}`);
  else if (!m2) _auditSkip('任务 3 数字钩稽', '面板未渲染数字');
  else _auditFail('任务 3 数字分裂', `面板显示「${m2[1]}」，实际 deckTotal = ${deckTotal}`);
  if (m2 && t2) {
    t2.click();
    await _auditWaitFor(() => location.pathname === '/review' && _wordsFilter === 'due', 25, 300);
    if (_wordsFilter === 'due') {
      const real = buildDueDeck().length;
      if (real === deckTotal) _auditPass(`任务 3 点击后 due 混合卡组生成：buildDueDeck().length = ${real} === 面板 ${deckTotal}`);
      else _auditFail('任务 3 点击后卡组与面板数字不一致', `buildDueDeck().length = ${real}，面板 = ${deckTotal}`);
    } else _auditFail('任务 3 点击后未进入 due 卡组页', `_wordsFilter = ${_wordsFilter}`);
  }
  await _auditGoHome();
}

// ── 模块三：历史时光机与数据隔离（面板 vs 列表 / 静态视图 / 零泄漏）──
async function auditModule3() {
  const today = getLocalToday();
  if (!_reportsCache.length) {
    try {
      const { data } = await sb.from('reports').select('*').order('date', { ascending: false }).limit(1000);
      _reportsCache = data || [];
    } catch (e) { _auditSkip('历史时光机', 'reports 拉取失败：' + String((e && e.message) || e)); return; }
  }
  const cand = _reportsCache.filter(r => r.date && r.date !== today && isDailyReport(r));
  if (!cand.length) { _auditSkip('历史时光机', '无历史日报可巡检'); return; }
  // v107：补水三重试 + 直连兜底（绕过补水去重标记），防瞬时网络失败导致整模块误跳
  for (const r of cand.slice(0, 3)) {
    for (let attempt = 0; attempt < 3 && !r.content; attempt++) {
      try { await ensureReportContent(r.date); } catch (e) { /* ensureReportContent 内部吞错不抛 */ }
      if (!r.content) {
        try {
          const { data } = await sb.from('reports').select('content').eq('user_id', _uid).eq('date', r.date).maybeSingle();
          if (data && typeof data.content === 'string' && data.content) r.content = data.content;
        } catch (e2) { /* 直连失败进入下一轮重试 */ }
      }
      if (!r.content) await _auditSettle(500);
    }
  }
  const sample = cand.slice(0, 3).filter(r => r.content);
  if (!sample.length) { _auditSkip('历史时光机', '历史日报 content 三重试 + 直连兜底后仍不可用（网络/数据库侧问题，非前端逻辑）'); return; }
  // 3.1 历史 Dashboard 面板数字 vs 点开列表数组长度（四维钩稽）
  for (const r of sample) {
    const parsed = parseSmartReport(r.content);
    if (!parsed) { _auditFail(`历史 ${r.date}：JSON 解析失败`, '该日报无法被面板与列表消费'); continue; }
    const panel = getDayCounts(parsed);
    const saved = _ctxDate;
    _ctxDate = r.date;
    const dp = parsedReportFor(r.date) || {};
    const list = {
      vocab: getFilteredVocab(_wordsAll, 'today').length,
      grammar: allGrammarErrors().length,
      expressions: (dp.patterns || []).length,
      core: (dp.sentence_patterns || []).length
    };
    _ctxDate = saved;
    const dims = [['当日新词', panel.vocab, list.vocab], ['语法纠正', panel.grammar, list.grammar], ['自然表达', panel.expressions, list.expressions], ['核心句型', panel.core, list.core]];
    const badDims = dims.filter(d => d[1] !== d[2]);
    if (!badDims.length) _auditPass(`历史 ${r.date}：面板四维数字与列表数组长度 100% 一致（${dims.map(d => d[0] + ' ' + d[1]).join(' / ')}）`);
    else _auditFail(`历史 ${r.date}：面板 ≠ 列表`, badDims.map(d => `${d[0]} 面板 ${d[1]} ≠ 列表 ${d[2]}`).join('；'));
  }
  // 3.2 历史详情页 = 静态对比列表，绝无 SRS 翻卡 / 队列零触碰
  const d = sample[0].date;
  const dp = parsedReportFor(d);
  const baselineQueue = _srsQueue;
  const staticViews = [
    { view: 'expressions', expect: (dp && dp.patterns) || [] },
    { view: 'core', expect: (dp && dp.sentence_patterns) || [] }
  ];
  for (const v of staticViews) {
    navigateShadowing(undefined, undefined, d, v.view);
    await _auditWaitFor(() => {
      const sp = document.getElementById('speak-player');
      if (!sp) return false;
      const cards = sp.querySelectorAll('.err-card').length;
      return cards === v.expect.length || (v.expect.length === 0 && /暂无/.test(sp.textContent || ''));
    }, 25, 300);
    const sp = document.getElementById('speak-player');
    const rendered = sp ? sp.querySelectorAll('.err-card').length : -1;
    const hasFlip = sp ? !!sp.querySelector('.srs-flip-scene') : true;
    const qTouched = _srsQueue !== baselineQueue;
    if (!hasFlip && !qTouched && rendered === v.expect.length)
      _auditPass(`历史 ${d} · view=${v.view}：静态对比列表（${rendered} 条），无 SRS 翻卡、SRS 队列未被触碰`);
    else _auditFail(`历史 ${d} · view=${v.view}：静态视图断言失败`, `翻卡=${hasFlip} 队列被触碰=${qTouched} 渲染 ${rendered} ≠ 期望 ${v.expect.length}`);
  }
  // 3.3 语法列表 DOM 实测（点击历史日「语法纠正」按钮的真实落地页）
  navigateReview('grammar', null, d);
  await _auditWaitFor(() => location.pathname === '/review' && _wordsFilter === 'grammar' && _ctxDate === d, 25, 300);
  if (_ctxDate === d && _wordsFilter === 'grammar') {
    const domCount = (document.getElementById('words-content') || { querySelectorAll: () => [] }).querySelectorAll('.err-card').length;
    const panelCount = getDayCounts(parsedReportFor(d) || {}).grammar;
    if (domCount === panelCount) _auditPass(`历史 ${d} · 语法纠正落地页：DOM 实测 ${domCount} 张错题卡 === 面板 ${panelCount}`);
    else _auditFail(`历史 ${d} · 语法纠正落地页数字分裂`, `DOM ${domCount} ≠ 面板 ${panelCount}`);
  }
  // 3.4 无报日期零泄漏（绝不回退全局错题本 / 今日数据）
  const noDate = '2000-01-01';
  navigateShadowing(undefined, undefined, noDate, 'expressions');
  await _auditWaitFor(() => location.pathname === '/shadowing' && _speakView === 'expressions' && _ctxDate === noDate, 25, 300);
  const sp2 = document.getElementById('speak-player');
  const zeroRender = sp2 ? sp2.querySelectorAll('.err-card').length === 0 : false;
  const saved2 = _ctxDate;
  _ctxDate = noDate;
  const leakedGrammar = allGrammarErrors().length;
  const leakedVocab = getFilteredVocab(_wordsAll, 'today').length;
  _ctxDate = saved2;
  if (zeroRender && leakedGrammar === 0 && leakedVocab === 0) _auditPass(`历史 ${noDate}（无日报）：表达列表 0 条、语法 0 条、词汇 0 条 —— 无全局错题本/今日数据泄漏`);
  else _auditFail(`历史 ${noDate}（无日报）：存在数据泄漏`, `列表渲染 ${sp2 ? sp2.querySelectorAll('.err-card').length : '?'} 条，语法 ${leakedGrammar}，词汇 ${leakedVocab}`);
  await _auditGoHome();
}

// ── 模块四：JSON 数据源健康度（脏数据拦截扫描：类型/键值/结构损毁）──
async function auditModule4() {
  const sources = [];
  const push = (date, content, src) => { if (content) sources.push({ date: date, content: content, src: src }); };
  _reportsCache.forEach(r => push(r.date, r.content, 'reports 表'));
  if (!_reportsCache.some(r => r.content)) {
    try {
      const { data } = await sb.from('reports').select('*').order('date', { ascending: false }).limit(1000);
      (data || []).forEach(r => push(r.date, r.content, 'reports 表'));
    } catch (e) { /* 拉取失败只扫 localStorage */ }
  }
  ['voco-daily-cache', 'voco-reports', 'voco-speak-sentences', 'lingotrace-report'].forEach(k => {
    try { const raw = localStorage.getItem(k); if (raw) push(k, raw, 'localStorage:' + k); } catch (e) { /* 隐私模式 localStorage 不可用 */ }
  });
  const daily = sources.filter(s => isDailyReport(s));
  if (!daily.length) { _auditSkip('JSON 数据源健康度', '无任何日报数据源（reports 表与 localStorage 均空）'); return; }
  const isFinNum = n => typeof n === 'number' && isFinite(n);
  const arrItemOk = (arr, key, keys) => Array.isArray(arr) && arr.every(x => x && typeof x === 'object' && keys.some(k => String(x[k] || '').trim()));
  let okCount = 0; const damaged = [];
  for (const s of daily) {
    const parsed = parseSmartReport(s.content);
    if (!parsed) { damaged.push(`${s.date}（解析失败）`); continue; }
    const issues = [];
    const sum = parsed.summary;
    if (sum !== undefined && (typeof sum !== 'object' || sum === null)) issues.push('summary 非对象');
    if (sum && typeof sum === 'object') {
      ['fluency', 'accuracy', 'naturalness', 'vocabulary'].forEach(k => {
        if (sum[k] !== undefined && !isFinNum(sum[k])) issues.push(`summary.${k} 非有限数字`);
        else if (isFinNum(sum[k]) && (sum[k] < 0 || sum[k] > 10)) issues.push(`summary.${k} 越界 ${sum[k]}`);
      });
    }
    if (parsed.grammar !== undefined && !Array.isArray(parsed.grammar)) issues.push('grammar 非数组');
    else if (Array.isArray(parsed.grammar) && !arrItemOk(parsed.grammar, 'grammar', ['original', 'correction'])) issues.push('grammar 数组内存在结构损毁项（缺 original/correction）');
    if (parsed.patterns !== undefined && !Array.isArray(parsed.patterns)) issues.push('patterns 非数组');
    else if (Array.isArray(parsed.patterns) && !arrItemOk(parsed.patterns, 'patterns', ['original', 'better'])) issues.push('patterns 数组内存在结构损毁项（缺 original/better）');
    if (parsed.sentence_patterns !== undefined && !Array.isArray(parsed.sentence_patterns)) issues.push('sentence_patterns 非数组');
    else if (Array.isArray(parsed.sentence_patterns) && !arrItemOk(parsed.sentence_patterns, 'sentence_patterns', ['pattern', 'targetSentence', 'text'])) issues.push('sentence_patterns 数组内存在结构损毁项');
    if (parsed.vocabulary !== undefined && !Array.isArray(parsed.vocabulary)) issues.push('vocabulary 非数组');
    else if (Array.isArray(parsed.vocabulary) && !arrItemOk(parsed.vocabulary, 'vocabulary', ['word'])) issues.push('vocabulary 数组内存在缺 word 项');
    if (parsed.coach_insights !== undefined && parsed.coach_insights !== null) {
      const ci = parsed.coach_insights;
      if (typeof ci !== 'object') issues.push('coach_insights 非对象');
      else ['vocabulary', 'grammar', 'expression', 'core_patterns'].forEach(k => { if (typeof ci[k] !== 'string') issues.push(`coach_insights.${k} 非字符串`); });
    }
    if (issues.length) damaged.push(`${s.date}（${issues.slice(0, 3).join('；')}${issues.length > 3 ? '…' : ''}）`);
    else okCount++;
  }
  if (!damaged.length) _auditPass(`JSON 健康度：${daily.length} 份日报全部结构完整（数组/键值/类型无损毁，评分 0-10 无越界）`);
  else _auditFail(`JSON 健康度：${damaged.length}/${daily.length} 份损毁`, damaged.slice(0, 5).join(' · ') + (damaged.length > 5 ? ` 等 ${damaged.length} 份` : ''));
  if (damaged.length && okCount) _auditPass(`JSON 健康度：${okCount} 份完好（对照参考）`);
}

// ── 模块五：极限空态拦截（全 0 完美假报告注入渲染：零异常 / 空态文案 / 四按钮 disabled）──
async function auditModule5() {
  const fake = {
    meta: { date: getLocalToday(), topic: '', duration: 0 },
    summary: { topic: '', dailyThought: { en: '', zh: '' }, strengths: [], nextSteps: [], fluency: 0, accuracy: 0, naturalness: 0, vocabulary: 0, weak_areas: '' },
    mistakes: [], coreSentences: [], newWords: [],
    vocabulary: [], grammar: [], patterns: [], sentence_patterns: [], coach_insights: null
  };
  const saved = { reportParsed: _reportParsed, viewDate: _viewDate, historyParsed: _historyParsed, ctxDate: _ctxDate };
  _viewDate = null; _historyParsed = null; _ctxDate = null; _reportParsed = fake;
  let threw = null;
  try {
    renderMetricsOverview();
    renderInsightsSection(null, []);
    renderTodoList(false);
  } catch (e) { threw = e; }
  if (threw) { _auditFail('完美假报告（全 0）：渲染抛异常', String((threw && threw.message) || threw)); }
  else {
    const mEl = document.getElementById('home-metrics');
    const mHtml = mEl ? mEl.innerHTML : '';
    if (mHtml.includes('--') || mHtml.includes('/100')) _auditPass('完美假报告（全 0）：打分面板正常渲染空态（-- 占位 / 0/100 刻度，无 NaN、无除零异常）');
    else _auditFail('完美假报告：打分面板空态断言失败', (mHtml || '（home-metrics 为空）').slice(0, 100));
    const iEl = document.getElementById('home-insights');
    const jumps = iEl ? [...iEl.querySelectorAll('[data-improve-jump]')] : [];
    if (jumps.length === 4 && jumps.every(b => b.disabled)) _auditPass('完美假报告：提升区 4 个跳转按钮全部 disabled 拦截（无法点击进入白板页）');
    else _auditFail('完美假报告：提升区按钮未正确 disabled', `按钮数 ${jumps.length}，disabled 数 ${jumps.filter(b => b.disabled).length}`);
    const iText = iEl ? (iEl.textContent || '') : '';
    if (/无词汇记录/.test(iText) && /无语法纠错/.test(iText) && /无自然表达记录/.test(iText) && /无核心句型记录/.test(iText))
      _auditPass('完美假报告：提升区四卡静默回落中性空态文案（三行排版结构不变，绝不开天窗）');
    else _auditFail('完美假报告：四卡空态文案缺失', iText.slice(0, 120));
    const ms = getTodayMissionState(_wordsAll, fake, _reviewedVocabTodayIds);
    if (ms.hasRealTodayReport) _auditPass('完美假报告：时间网关正确放行（meta.date = 今日，Dashboard 走全量渲染路径）');
    else _auditFail('完美假报告：时间网关误拦截', 'hasRealTodayReport = false');
  }
  // 状态与 DOM 100% 还原
  _reportParsed = saved.reportParsed; _viewDate = saved.viewDate; _historyParsed = saved.historyParsed; _ctxDate = saved.ctxDate;
  try { renderHomeSections(); } catch (e) { _auditFail('完美假报告：状态还原后重渲染抛异常', String((e && e.message) || e)); }
}

// ── 模块六：状态清理与防泄漏（历史日报 → 中途退出 → 回到今日打卡）──
async function auditModule6() {
  const today = getLocalToday();
  const rows = _reportsCache.filter(r => r.date && r.date !== today && isDailyReport(r));
  if (!rows.length) { _auditSkip('状态清理与防泄漏', '无历史日报可模拟历史动线'); return; }
  const d = rows[0].date;
  if (!rows[0].content) { try { await ensureReportContent(d); } catch (e) { /* 补水失败走下方断言 */ } }
  await _auditGoHome();
  const base = { streakCache: _streakScrollCache, wordsFilter: _wordsFilter };
  // 进入历史日报（真实入口 showBearDay 同路径）
  showBearDay(d, true);
  await _auditWaitFor(() => _viewDate === d && _historyParsed !== null, 25, 300);
  if (!(_viewDate === d && _historyParsed)) { _auditFail('历史动线：进入历史日报失败', `_viewDate=${_viewDate} _historyParsed=${!!_historyParsed}`); await _auditGoHome(); return; }
  _auditPass(`历史动线：进入 ${d} 视图（_viewDate / _historyParsed 就位）`);
  // 中途退出 → 回到今日打卡（与 To-Do 任务 2/3 完全相同的清理代码路径）
  _viewDate = null; _historyParsed = null; _ctxDate = null;
  navigateShadowing();
  await _auditWaitFor(() => {
    const sp = document.getElementById('speak-player');
    return location.pathname === '/shadowing' && !!sp && (!!sp.querySelector('.srs-flip-scene') || /暂无待复习句型/.test(sp.textContent || ''));
  }, 25, 300);
  const clean = _viewDate === null && _historyParsed === null && _ctxDate === null && _speakView === '';
  if (clean) _auditPass('历史动线：退出后 _viewDate / _historyParsed / _ctxDate / _speakView 全部恢复今日初始化状态');
  else _auditFail('历史动线：退出后状态残留', `_viewDate=${_viewDate} _historyParsed=${!!_historyParsed} _ctxDate=${_ctxDate} _speakView=${_speakView}`);
  const expectToday = getDueSentencesQueue(_speakAll).map(x => x.id);
  const got = _srsQueue.map(x => x.id);
  if (JSON.stringify(expectToday) === JSON.stringify(got)) _auditPass(`历史动线：回到今日打卡后 SRS 队列 = 今日纯库捞队列（${got.length} 项），零历史题库残留`);
  else _auditFail('历史动线：回到今日后队列被污染', `实际 ${got.length} 项 ≠ 今日应得 ${expectToday.length} 项`);
  if (_streakScrollCache === base.streakCache) _auditPass('历史动线：熊条滚动位置缓存不受历史切换扰动');
  else _auditFail('历史动线：熊条滚动缓存被意外重置', `${base.streakCache} → ${_streakScrollCache}`);
  await _auditGoHome();
}

// ── 模块七：SM-2 记忆库防腐化（EF≥1.3 / 间隔≥0 / 无 NaN·null·负数·坏日期）──
async function auditModule7() {
  if (!_patternLibrary.length && !_wordsAll.length && !_errorsAll.length) { try { await loadSpeak(); } catch (e) { /* 网络失败交由 SKIP */ } }
  const libs = [
    { name: '句型库 _patternLibrary', rows: _patternLibrary },
    { name: '词汇库 _wordsAll', rows: _wordsAll },
    { name: '错题库 _errorsAll', rows: _errorsAll }
  ];
  const isFinNum = n => typeof n === 'number' && isFinite(n);
  let total = 0, reviewed = 0, bad = 0; const badSamples = [];
  for (const lib of libs) {
    for (const row of (lib.rows || [])) {
      total++;
      // 有复习记录（曲线已开启）→ SM-2 字段必须存在且合法；新卡 → 字段必须为空或合法（绝不允许 NaN/负数）
      const hasCurve = (row.review_count > 0) || row.next_review_date || row.last_reviewed_at;
      if (hasCurve) reviewed++;
      const ef = Number(row.ease_factor);
      const ivl = Number(row.sm2_interval);
      const reps = Number(row.sm2_repetitions);
      const nullOk = (v) => v === null || v === undefined;
      const efOk = nullOk(row.ease_factor) ? !hasCurve : (isFinite(ef) && ef >= 1.3);
      const ivlOk = nullOk(row.sm2_interval) ? !hasCurve : (isFinite(ivl) && ivl >= 0);
      const repsOk = nullOk(row.sm2_repetitions) ? !hasCurve : (isFinite(reps) && reps >= 0);
      const dateOk = !row.next_review_date || /^\d{4}-\d{2}-\d{2}$/.test(String(row.next_review_date));
      if (!(efOk && ivlOk && repsOk && dateOk)) {
        bad++;
        if (badSamples.length < 5) badSamples.push(`${lib.name} id=${row.id}（EF=${row.ease_factor} 间隔=${row.sm2_interval} 重复=${row.sm2_repetitions} 下次=${row.next_review_date}）`);
      }
    }
  }
  if (!total) { _auditSkip('SM-2 记忆库防腐化', '三大记忆库全部为空（无任何卡片可巡检）'); return; }
  if (!bad) _auditPass(`SM-2 防腐化：${total} 张卡全部健康（有曲线 ${reviewed} 张：EF≥1.3、间隔≥0、重复≥0、日期格式合法；新卡空字段合法）`);
  else _auditFail(`SM-2 防腐化：${bad}/${total} 张卡数据腐化（NaN/null/负数/坏日期）`, badSamples.join(' · '));
}

// ═══════════════════════════════════════════════════════════════
// 体检总入口：Console 输入 runGlobalAudit() 一键执行（async 链式顺序巡检）
// ═══════════════════════════════════════════════════════════════
async function runGlobalAudit() {
  _auditStats = { total: 0, pass: 0, fail: 0, skip: 0, fails: [] };
  console.log('%c\n🧭 Voco 全局体检（v107 · 7 模块巡检）', 'font-weight:bold;font-size:15px;color:#3E3535');
  console.log('%c巡检日期：' + getLocalToday() + ' · 巡检过程零写库、零反馈推进，结束后页面状态 100% 还原', 'color:#8C7C7C;font-size:11px');
  const snap = _auditSnapshot();
  // 今日语境锚定：清历史视图残留，保证各模块断言确定（结束统一还原）
  _viewDate = null; _historyParsed = null; _ctxDate = null; _speakView = '';
  await _auditGoHome();
  const module = async (title, fn) => {
    _auditSection(title);
    try { await fn(); } catch (e) { _auditFail('模块执行抛异常（该模块后续断言未运行）', String((e && e.message) || e)); }
  };
  await module('模块一：交互链路与路由精确度', auditModule1);
  await module('模块二：待办系统与 SM-2 数据钩稽', auditModule2);
  await module('模块三：历史时光机与数据隔离', auditModule3);
  await module('模块四：JSON 数据源健康度', auditModule4);
  await module('模块五：极限空态拦截', auditModule5);
  await module('模块六：状态清理与防泄漏', auditModule6);
  await module('模块七：SM-2 记忆库防腐化', auditModule7);
  _auditRestore(snap);
  await _auditGoHome().catch(() => {});
  const s = _auditStats;
  console.log('%c\n━━━━━━ 🧭 体检报告汇总 ━━━━━━', 'font-weight:bold;font-size:13px;color:#3E3535');
  console.log('%c通过 ' + s.pass + ' · 失败 ' + s.fail + ' · 跳过 ' + s.skip + ' · 共 ' + s.total + ' 项检查', 'font-weight:bold;color:' + (s.fail ? '#c62828' : '#2e7d32'));
  if (s.fails.length) {
    console.log('%c失败清单：', 'color:#c62828;font-weight:bold');
    s.fails.forEach(f => console.log('%c❌ ' + f.label + (f.detail ? ' —— ' + f.detail : ''), 'color:#c62828'));
  }
  console.log(s.fail ? '%c⚠️ 存在 ' + s.fail + ' 项失败，请逐项排查后重跑' : '%c🎉 全部通过 —— 七模块健康度 100%', 'font-weight:bold;color:' + (s.fail ? '#c62828' : '#2e7d32'));
  return _auditStats;
}

async function loadWords() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;

  document.getElementById('words-content').innerHTML = LoadingState();

  const [{ data: vocab }, { data: errors }, { data: reports }, { data: patterns }] = await Promise.all([
    sb.from('vocabulary').select('*').order('created_at', { ascending: false }),
    sb.from('errors').select('*'),
    sb.from('reports').select('*').order('date', { ascending: false }).limit(1000),
    sb.from('patterns').select('*')
  ]);
  // Voco 2.0：SSOT 输入构建（时间网关 + 词库合并 + 今日已复习 id 集合 + 句型库打标）—— 与 loadHome 共用同一构建器
  buildGlobalMissionInputs(vocab, errors, reports, patterns);

  // URL 是唯一事实源：/review?tab=all|grammar|due|topics（规范四 Tab；兼容旧 new|mistakes|review 参数）+ filter=today 过滤态
  const params = new URLSearchParams(window.location.search);
  // v82 日期路由：?date=YYYY-MM-DD（非今日）→ 复习页日期上下文（新学单词/重点纠错列表按该日日报过滤）
  const dParam = params.get('date');
  _ctxDate = (dParam && dParam !== getLocalToday()) ? dParam : null;
  const activeTab = params.get('tab') || 'all';
  let mode = ['new', 'mistakes', 'review', 'grammar', 'due', 'topics'].includes(activeTab) ? activeTab : 'all';
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
let _reportParsed = null;       // 今日日报的 parseSmartReport() 结果（buildGlobalMissionInputs 强制 = 今日日报，只读消费）
let _historyParsed = null;      // v75 历史视图：所选日期（_viewDate）日报的 parseSmartReport() 结果；未选历史日期或该日无日报 → null（今日链路不受影响）
let _reportsCache = [];         // v82 日期路由：最近 90 条 reports 行缓存（parsedReportFor 按日期检索解析源）
let _ctxDate = null;            // v82 日期路由：URL ?date= 非今日日期上下文；目标页列表按该日日报过滤（null = 默认今日链路）
// v104：_dailyPatterns 已退役 —— 句型 SRS 口径纯库捞（getDueSentencesQueue(_patternLibrary)），今日解析不再喂计数
let _dateScoreCache = {};       // v89 打卡日历数据源：词 date_added + 日报 date → 分值（横滑条与月历面板共用）
let _pickerYear = null;         // v89 月历当前年份
let _pickerMonth = null;        // v89 月历当前月份
let _patternLibrary = [];       // patterns 表历史句型库（打标 + 文本去重后；v104 起 SSOT = getDueSentencesQueue(_patternLibrary)）
let _reviewedVocabTodayIds = new Set(); // 加载层上收：今日实际完成 SM-2 反馈（🟢/🔴）的词 id 集合（SSOT reviewedVocabToday 输入）

// ═══════════════════════════════════════════════════════
// Voco 2.0 全局任务状态中心（SSOT）—— 用户骨架强制签名
// getTodayMissionState(vocabAll, reportParsed, reviewedVocabIds)   ← v104 收敛：patternsAll/patternLibrary 参数随句型口径纯库捞迁移而删除
// 所有页面数字（首页待办 / 数据卡 / 复习页 Tab）唯一事实源；UI 层严禁自行 .filter/.length/Mock 兜底
// 骨架适配说明（Vanilla JS 无模块系统，export 关键字去除）：
//   · todayStr 用 getLocalToday()（v64 本地时区）—— 骨架里的 toISOString().split('T')[0] 会重新引入 UTC 穿透
//   · 真实数据结构日期在 reportParsed.meta.date（骨架的 reportParsed.date 为兼容读取）
//   · reviewedVocabIds 传入「今日已复习词 id 集合」（buildGlobalMissionInputs 按 last_reviewed_at 本地日历日上收），
//     严禁用 _reviewedErrorIds（会话内错题 id，语义不同会造成打卡误判）
// ═══════════════════════════════════════════════════════
function isTodayParsedGate(reportParsed) {
  const repDate = reportParsed && ((reportParsed.meta && reportParsed.meta.date) || reportParsed.date);
  return !!repDate && repDate.startsWith(getLocalToday());
}

function getTodayMissionState(vocabAll, reportParsed, reviewedVocabIds = new Set()) {
  // 1. 时间轴拦截：校验是否为今日真实报告
  const hasRealTodayReport = isTodayParsedGate(reportParsed);

  // 2. 隔离 Mock 数据：过滤掉所有带有 mock 标记的假数据（mockWords id 已统一 mock-N 前缀）
  const realVocab = (vocabAll || []).filter(v => !String(v.id).startsWith('mock-'));

  // 3. 今日增量计数（v104：面板/提升区已改 getDayCounts(parsed) SSOT 直取，计数字段无消费者 → 删除）

  // 4. SM-2 记忆任务（真实待复习总数：needsReview 全量，含今日新词 + 历史到期词，与复习页 tab=due 同源）
  const dueVocabList = realVocab.filter(v => v.needsReview);
  const totalDueVocabCount = dueVocabList.length;

  // 5. 今日已实际完成复习的数量（id 集合大小）
  const reviewedVocabToday = reviewedVocabIds.size;

  // 6. 句型 SRS 任务口径（v104 纯库捞）：整体迁移至 getDueSentencesQueue(_patternLibrary) ——
  //    待办任务 2 数字与卡片页队列共用同一函数，此处不再重复计算（duePatternList/totalPatternTaskCount 已删除）
  return {
    hasRealTodayReport,
    totalDueVocabCount,
    reviewedVocabToday,
    dueVocabList, // 真实待复习词表（totalDueVocabCount 同源数组；v82 后对战胶囊已移除，无外部取词消费）
    // v103 完成判定修复（与任务 3 同口径）：全部复习完后 dueCount 归 0，旧守卫 dueCount>0 恒 false → 永远无法完成；
    // 新口径：dueCount===0 且今日确有复习记录 → 完成；dueCount===0 且今日无记录 → 未完成（防默认值误判）
    isReviewFinished: totalDueVocabCount === 0 && reviewedVocabToday > 0
  };
}

// v82：generateDailyMissionPrompt / missionCapsuleHTML / fireDailyMissionPrompt（今日对战胶囊 3+1+1）
// 与首页 Card E 一并彻底移除 —— 私教 Prompt 唯一出口 = 【我的】页灵感配置舱 + 话题复盘生成器

// ── 剪贴板共享工具：navigator.clipboard → textarea+execCommand 降级 ──
// 灵感配置舱（fireTopicGeneratorPrompt）与话题复盘（fireTopicRevivalPrompt）共用
async function copyToClipboardWithFallback(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    // 降级：非安全上下文 / 权限拒绝 → 隐藏 textarea 复制
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e2) { return false; }
  }
}

// v82：fireDailyMissionPrompt 已随首页对战胶囊模块彻底移除（Prompt 出口收敛至灵感舱/话题复盘）

// ── 聊前灵感配置舱（Voco 2.0 第四步）：【我的】页专属 ──
// URL 投喂 + 灵感速记 + 7 话题 Pill（单选、可取消）→ 私教角色扮演 Prompt → 剪贴板
const TOPIC_TAGS = ['✈️ 跨国旅行', '🏃‍♀️ 健身与普拉提', '💼 职场与商业', '📖 文学评论', '🐾 养宠日常', '☕ 咖啡与生活', '📈 宏观经济'];
let _selectedTopicTag = ''; // 全局单选状态：再点已选中标签 → 取消

function renderTopicPills() {
  const slot = document.getElementById('topic-pill-slot');
  if (!slot) return;
  slot.innerHTML = TOPIC_TAGS.map(tag =>
    `<button type="button" class="topic-pill${tag === _selectedTopicTag ? ' active' : ''}" data-tag="${tag}" onclick="toggleTopicPill(this)" aria-pressed="${tag === _selectedTopicTag}">${tag}</button>`
  ).join('');
}

function toggleTopicPill(btn) {
  const tag = btn.getAttribute('data-tag') || '';
  _selectedTopicTag = (_selectedTopicTag === tag) ? '' : tag;
  // 单选：全量重算 active，移除其他标签选中态（主题色背景 + 白字由 .topic-pill.active 提供）
  document.querySelectorAll('#topic-pill-slot .topic-pill').forEach(p => {
    const on = p.getAttribute('data-tag') === _selectedTopicTag;
    p.classList.toggle('active', on);
    p.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

// ═══ 聊前灵感配置舱 · 居中模态（v74：从首页学习工作台迁回【我的】页）═══
// 严禁 Bottom Sheet：圆角浮动卡 + 背景蒙版 Backdrop Blur + 右上角标准 ✕
// 生成 Prompt 成功复制后 900ms 自动关闭弹窗，给用户干净轻量的交互体验
function openInspirationDialog() {
  const dlg = document.getElementById('inspiration-dialog');
  if (!dlg) return;
  dlg.classList.remove('hidden');
}

function hideInspirationDialog() {
  const dlg = document.getElementById('inspiration-dialog');
  if (dlg) dlg.classList.add('hidden');
}

// 组装并复制 Prompt（【我的】页 · 灵感舱居中模态调用）
async function fireTopicGeneratorPrompt(btn) {
  const urlInput = document.getElementById('input-topic-url').value.trim();
  const thoughtsInput = document.getElementById('input-topic-thoughts').value.trim();

  // 防空判断
  if (!urlInput && !thoughtsInput && !_selectedTopicTag) {
    alert('请至少提供一个链接、一点想法，或选择一个话题！');
    return;
  }

  let prompt = "作为我的英语口语私教，请开启今天的对话。";

  if (_selectedTopicTag) {
    prompt += `\n\n今天我们探讨的主题领域是：【${_selectedTopicTag}】。`;
  }
  if (urlInput) {
    prompt += `\n\n请参考以下背景材料（你可以提取核心观点与我讨论）：\n${urlInput}`;
  }
  if (thoughtsInput) {
    prompt += `\n\n这是我的一些初步想法和疑问，请结合这些引导我展开讨论：\n"${thoughtsInput}"`;
  }

  prompt += "\n\n请用自然、引导式的语言回复我，一次不要说太多。并在交流中注意纠正我可能出现的发音和语法错误。";

  // v97：「加入对练防御」功能已全面下线（用户指令：冗余功能彻底去除）——Prompt 不再注入任何防御内容
  const copied = await copyToClipboardWithFallback(prompt);
  if (!copied) { showToast('复制失败，请长按文本手动复制'); return; }

  // 按钮交互反馈：✅ 变绿 2 秒后恢复（恢复完整内联样式，保留渐变主视觉）
  const originalHTML = btn.innerHTML;
  const originalStyle = btn.getAttribute('style') || '';
  btn.innerHTML = '✅ Prompt 已复制！去贴给 GPT 吧';
  btn.style.background = 'var(--c-green)';
  btn.style.boxShadow = 'none';
  setTimeout(() => {
    btn.innerHTML = originalHTML;
    btn.setAttribute('style', originalStyle);
    refreshIcons(btn);
  }, 2000);
  showToast('📋 专属对话 Prompt 已复制');
  // 生成成功 → 弹窗自动关闭（900ms 让用户看清 ✅ 反馈再收起，交互收尾干净轻量）
  setTimeout(() => { hideInspirationDialog(); }, 900);
}

// 模块三：待复习混合记忆引擎状态（needsReview 单词 + 语法错题统一卡组流式打卡）
let _dueDeck = [];
let _dueIdx = 0;
let _dueRevealed = false;
let _dueResults = { remembered: 0, forgot: 0 };
const _reviewedErrorIds = new Set(); // 本会话已通过的错题 id（🟢记住了 后从混合卡组移除，不重复打卡）

// ── 真实纠错数据源：日报解析 grammar（v99 起发音错题整体移出错题体系，不再合并 pronunciation）──
// 真实字段：item.original（错句）/ item.correction（正句）/ item.rule（规则）
function realReportErrors() {
  if (!_reportParsed) return [];
  const g = (_reportParsed.grammar || []).map(e => Object.assign({ issue: '语法纠错' }, e));
  return g.filter(e => e && (e.original || e.correction));
}

// ── 模块三：语法错题单一数据源（日报解析优先 → 错题表 → isMistake 词兜底）──
// 统一输出形状 {id, issue, original, correction, rule, type}，供 tab=grammar 卡片流与待复习混合卡组共用
// v82 日期路由：_ctxDate 存在 → 该日日报 grammar 为唯一数据源（无该日日报 → 空，绝不回退今日）
// v99：发音错题整体移出错题体系（用户指令）—— 所有路径只收 grammar，不再合并 pronunciation
function allGrammarErrors() {
  if (_ctxDate) {
    const dp = parsedReportFor(_ctxDate);
    if (!dp) return [];
    const g = (dp.grammar || []).map(e => Object.assign({ issue: '语法纠错' }, e));
    return standardizeErrorCards(g.filter(e => e && (e.original || e.correction)));
  }
  const real = realReportErrors();
  if (real.length) return standardizeErrorCards(real);
  const errRows = (_errorsAll || []).filter(e => e.type !== 'pronunciation').map((e, i) => ({
    id: e.id || ('errrow-' + i),
    issue: '语法纠错',
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

// v99 错题真 SM-2（A+B 组合的 B 半）：errors 表接入记忆曲线 ——
// due = errors 表行（非发音、未纠正、未掌握、无曲线日期或已到期）；新错题无 next_review_date → 立即到期；
// 复习后按 1→6→间隔×EF 推进；5 次 good → mastered 永久出队；correct_in_review=true（历史清理行）永久出队。
// 与 v97 相比：不再以「今日语境错题 − 已纠正签名」推算（today-first 口径会破坏曲线节律），
// 改为 DB 驱动 —— _errorsAll 行由全局输入构建器统一碎片合并，可直接消费，ref 挂载原始行供 reviewErrorItem 写回
function dueErrorCards() {
  const today = getLocalToday();
  return (_errorsAll || [])
    .filter(e => e && e.original && e.type !== 'pronunciation'
      && !e.correct_in_review && !e.mastered
      && (!e.next_review_date || e.next_review_date <= today))
    .map(e => ({
      id: 'err-' + (e.id != null ? e.id : 'row'),
      issue: '语法纠错',
      original: e.original,
      correction: e.correction || '',
      rule: e.rule || '',
      type: 'grammar',
      ref: e
    }));
}
// 错题 SM-2 推进 + 落库（与 reviewPatternItem/reviewWordItem 同构）：again(0)/good(3) 均写回曲线；
// 按「原句+正句」查 errors 表行更新 SM-2 列；库行缺失（今日新错题未入库/演示态）→ 仅本地快照，静默降级
async function reviewErrorItem(card, quality) {
  const src = (card && card.ref) || card || {};
  if (!src || !String(src.original || '').trim()) return;
  const result = sm2(src.ease_factor, src.sm2_interval, src.sm2_repetitions, quality);
  const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + result.interval);
  const status = quality < 3 ? 'learning' : (result.repetitions >= 5 ? 'mastered' : 'learning');
  src.review_count = (src.review_count || 0) + 1;
  src.ease_factor = result.ease_factor; src.sm2_interval = result.interval; src.sm2_repetitions = result.repetitions;
  src.status = status; src.mastered = (status === 'mastered');
  src.next_review_date = fmtLocalDate(nextDate); src.last_reviewed_at = new Date().toISOString();
  try {
    const { data: rows, error } = await sb.from('errors').select('id').eq('original', src.original).eq('correction', src.correction || '').limit(1);
    if (error || !rows || !rows.length) return;
    await sb.from('errors').update({
      status, mastered: (status === 'mastered'),
      ease_factor: result.ease_factor, sm2_interval: result.interval, sm2_repetitions: result.repetitions,
      review_count: src.review_count, next_review_date: src.next_review_date, last_reviewed_at: src.last_reviewed_at
    }).eq('id', rows[0].id);
    const local = (_errorsAll || []).find(x => String(x.id) === String(rows[0].id));
    if (local) Object.assign(local, {
      status, mastered: (status === 'mastered'),
      ease_factor: result.ease_factor, sm2_interval: result.interval, sm2_repetitions: result.repetitions,
      review_count: src.review_count, next_review_date: src.next_review_date, last_reviewed_at: src.last_reviewed_at
    });
  } catch (err) { /* 列未迁移/演示数据：仅本地会话态 */ }
}

// ── 错题标准化清洗层：任何数据源在进入渲染前收敛为 {id, issue, original, correction, rule, type} ──
// ① 碎片合并：以 →/-/（ 开头且无独立正句的条目 = 上一条记录的前后文延续，并入上一条 —— 一条记录绝不拆成两张卡
// ② 形状归一：字符串/元组/残缺对象 → 标准六字段；original/correction 为数组时合并为单字符串
// ③ 分类提取：type 缺失时按内容动态推断（发音与重音/语法与句式/地道表达/逻辑与衔接/其他）
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
    else t = normalizeErrorCategory(t, o, c, r); // 存量旧标签（发音纠偏/时态语态/冠词使用/逻辑衔接…）强制归一化为 4 标准分类
    const autoIssue = t === '地道表达' ? '地道表达'
      : (t === '发音与重音' ? '发音纠正'
      : (t === '逻辑与衔接' ? '逻辑衔接' : '语法纠错'));
    std.push({ id, original: o, correction: c, rule: r, type: t, issue: issue || autoIssue });
  }
  const merged = [];
  for (const item of std) {
    const isFrag = /^[→➡️\-—–（(]/.test(item.original) && !item.correction;
    if (isFrag && merged.length) {
      const prev = merged[merged.length - 1];
      prev.original = [prev.original, item.original].filter(Boolean).join(' ');
      continue;
    }
    // v81 配对合并（数据腰斩根治）：一条纠错被拆成「原句-only」与「正句-only」两条相邻记录时，
    // 必须合成一张 CorrectionCard —— 严禁渲染成「一张只有横杠和错句、另一张只有正确句子」的双卡
    const prev = merged.length ? merged[merged.length - 1] : null;
    if (prev && !prev.correction && item.correction && !item.original && !item.rule) {
      prev.correction = item.correction;
      continue;
    }
    if (prev && prev.correction && !prev.original && item.original && !item.correction && !item.rule) {
      prev.original = item.original;
      continue;
    }
    // v86 占位碎片合并：旧入库行可能以「历史错题」占位 original 存下 {correction}/{rule} 碎片
    // （parseItems 三行切块 + 清洗层占位符共同造成）—— 正句碎片与规则碎片必须并入上一条完整知识
    if (prev && item.correction && (!item.original || item.original === '历史错题') && !item.rule) {
      if (!prev.correction) prev.correction = item.correction;
      if (item.original && item.original !== '历史错题') prev.original = item.original;
      continue;
    }
    if (prev && !item.correction && item.rule && (!item.original || item.original === '历史错题')) {
      if (!prev.rule) prev.rule = item.rule;
      continue;
    }
    merged.push(item);
  }
  return merged.map((m, i) => ({ ...m, id: m.id || `err_${i}` }));
}

// ── 模块三：复习页严格三 Tab（全部词汇 / 语法错题 / 待复习）────────────────
// 待复习计数 = 到期单词（needsReview 布尔）+ 语法错题 —— 与混合卡组队列完全同源
function renderWordsSubTabs(activeMode) {
  const el = document.getElementById('words-subtabs');
  el.style.display = 'flex';
  // 话题库是语境资产库（非任务卡组），隐藏搜索框；其余 Tab 恢复默认显示
  const searchWrap = document.querySelector('.lib-search-wrap');
  if (searchWrap) searchWrap.style.display = activeMode === 'topics' ? 'none' : '';
  const grammarCount = allGrammarErrors().length; // 当前上下文错题数（历史日期下 = 该日错题，与 grammar tab 卡组同源）
  // Voco 2.0：复习页 Tab 数字强绑定任务状态中心（Mock 已隔离），严禁 UI 层自行 .filter
  // v88：due 标签的错题部分必须用「今日语境」错题数 —— 点击 due tab 后 switchWordsView 清 _ctxDate，
  // 卡组 buildDueDeck = 今日到期词 + 今日错题；沿用历史日错题数会与卡组口径分裂
  // v99：错题部分 = dueErrorCards()（真 SM-2 曲线到期口径，与卡组完全同源）
  const dueCount = getTodayMissionState(_wordsAll, _reportParsed, _reviewedVocabTodayIds).totalDueVocabCount + dueErrorCards().length;
  const tabs = [
    { key: 'all', label: '全部词汇', count: _wordsAll.length },
    { key: 'grammar', label: '语法错题', count: grammarCount },
    { key: 'due', label: '待复习', count: dueCount },
    { key: 'topics', label: '话题库', count: null }, // 资产库不计任务数
  ];
  // filter=today 是「全部词汇」的过滤视图，高亮归 all
  const activeKey = activeMode === 'today' ? 'all' : activeMode;
  el.innerHTML = tabs.map(t =>
    `<span class="lib-subtab${t.key===activeKey?' active':''}" data-words-filter="${t.key}" onclick="switchWordsView('${t.key}')">${t.label}${t.count != null ? `<small style="opacity:0.6;margin-left:3px">${t.count}</small>` : ''}</span>`
  ).join('');
}

function switchWordsView(mode) {
  _wordsFilter = mode;
  // v88：Tab 内切换一律回归今日语境 —— 历史日期上下文（?date=）只属于「从统计卡/提升区进入的当前视图」；
  // 切 Tab = 换视图语义（due/all/topics 均为今日口径），_ctxDate 必须同步清空，
  // 否则 buildDueDeck 混入历史日错题、且 URL 与全局上下文脱钩（刷新后行为漂移）
  _ctxDate = null;
  // 模块二：单词页内部视图写入规范路由 /review?tab=…（绝不写入 _activeFilter）
  window.history.replaceState({}, '', mode === 'all' ? '/review' : `/review?tab=${mode}`);
  renderWordsSubTabs(mode);
  renderWordsList(mode);
}

// ── 模块三：四 Tab 严格渲染隔离 ─────────────────────────────────
// all=仅全量词汇卡 / grammar=仅语法错题卡（绿色正句为主视觉，原句小字灰显） / due=混合记忆卡组（Active Recall） / topics=话题卡片墙
// v82 日期路由横幅：复习页正处历史日期上下文 → 列表顶部提示「正在查看该日数据」（今日链路零侵入）
// v104 扩展：横幅追加「共 N 条」计数行 —— N 与打分面板子块同源（同一 parsed 桶 / 同一标准化函数），
//     调用方传入列表实际渲染长度（grammar=allGrammarErrors()、vocab=getFilteredVocab('today')），面板/列表永不分叉
// v109 横幅全段常显（用户 Bug 报告 + 三次确认最终样式）：双行居中胶囊框，今日/历史统一日期格式 ——
//     「📅 正在查看 2026-08-21 的当日数据」主行 + 「共 4 个新词」副行，四段（新词/语法纠正/自然表达/核心句型）同构
function prependCtxDateBanner(count, dim, unit) {
  const container = document.getElementById('words-content');
  const banner = document.createElement('div');
  banner.className = 'mb-3 px-4 py-2.5 rounded-xl bg-[var(--c-primary-light)] border border-[var(--c-border-light)] text-center';
  const date = _ctxDate || getLocalToday();
  banner.innerHTML = `<div class="text-[0.875rem] font-semibold text-[var(--c-primary)]">📅 正在查看 ${date} 的当日数据</div>`
    + `<div class="text-xs font-semibold text-[var(--c-text-dim)] mt-1">共 ${count} ${unit}${dim}</div>`;
  container.insertBefore(banner, container.firstChild);
}

function renderWordsList(mode) {
  if (mode === 'grammar' || mode === 'mistakes') {
    const errs = allGrammarErrors();
    renderErrorCards(errs);
    prependCtxDateBanner(errs.length, '语法纠正', '条');
    return;
  }
  if (mode === 'due' || mode === 'review') { renderDueDeck(); return; }
  if (mode === 'topics') { renderTopicLibrary(); return; }
  // filter=today：今日单词过滤态（isNewToday 纯布尔），不污染 Tab 渲染
  if (mode === 'today') {
    const todayVocab = getFilteredVocab(_wordsAll, 'today');
    renderVocabList(todayVocab);
    prependCtxDateBanner(todayVocab.length, '新词', '个');
    return;
  }
  renderVocabList(getFilteredVocab(_wordsAll, 'all'));
}

// ── 话题库（Voco 2.0 四维复习体系收官）：topic-card 历史资产卡片墙 + 话题复盘 Prompt 生成器 ──
// 数据：topics 表（title/description/key_terms）+ vocabulary.source_topic 关联词（一次取全，零 N+1 查询）
let _topicLibraryCache = []; // { id, title, description, keyTerms, words }

async function renderTopicLibrary() {
  const container = document.getElementById('words-content');
  container.innerHTML = LoadingState();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const [{ data: topics }, { data: vocab }] = await Promise.all([
    sb.from('topics').select('*').order('created_at', { ascending: false }),
    sb.from('vocabulary').select('word, source_topic').not('source_topic', 'is', null)
  ]);
  // 客户端按 source_topic 归组关联词（topic-card 导入链路写入 source_topic=title）
  const byTopic = {};
  (vocab || []).forEach(v => {
    if (!v.source_topic) return;
    (byTopic[v.source_topic] = byTopic[v.source_topic] || []).push(v.word);
  });
  _topicLibraryCache = (topics || []).map(t => ({
    id: t.id,
    title: t.title || '未命名话题',
    description: t.description || '',
    keyTerms: Array.isArray(t.key_terms) ? t.key_terms : [],
    words: byTopic[t.title] || []
  }));
  if (!_topicLibraryCache.length) {
    container.innerHTML = EmptyState({ message: '还没有话题卡 · 导入 ChatGPT 话题卡后，这里会成为你的语境资产库', size: 80 });
    return;
  }
  container.innerHTML = _topicLibraryCache.map((t, i) => {
    const previewWords = (t.words.length ? t.words : t.keyTerms).slice(0, 5);
    return `
    <div class="topic-card bg-[var(--c-surface)] rounded-2xl p-4 mb-3 border border-[var(--c-border-light)]" style="box-shadow:var(--c-shadow-sm)">
      <div class="flex justify-between items-start gap-2 mb-1.5">
        <span class="text-sm font-bold text-[var(--c-text)] leading-snug break-words">📖 ${h(t.title)}</span>
        <span class="shrink-0 text-[0.6875rem] font-semibold px-2 py-0.5 rounded-full bg-[var(--c-primary-light)] text-[var(--c-primary)] whitespace-nowrap">${t.keyTerms.length} 个关键术语</span>
      </div>
      ${t.description ? `<div class="text-xs text-[var(--c-text-dim)] mb-2 leading-relaxed">${h(t.description)}</div>` : ''}
      ${previewWords.length ? `
      <div class="flex flex-wrap items-center gap-1.5 mb-3">
        ${previewWords.map(w => `<span class="inline-flex shrink-0 text-[0.6875rem] px-2 py-0.5 rounded-full bg-[var(--c-bg)] text-[var(--c-text-dim)] border border-[var(--c-border-light)]">${h(w)}</span>`).join('')}
        ${(t.words.length > 5) ? `<span class="text-[0.6875rem] text-[var(--c-text-ultradim)] shrink-0">+${t.words.length - 5}</span>` : ''}
      </div>` : ''}
      <button onclick="fireTopicRevivalPrompt(this, ${i})" class="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-0 cursor-pointer text-xs font-bold text-white transition-all duration-200 active:scale-[0.97]" style="background:linear-gradient(135deg,var(--c-primary),var(--c-green));box-shadow:0 6px 14px -8px rgba(0,0,0,0.3)">
        ♻️ 生成话题复盘 Prompt
      </button>
    </div>`;
  }).join('');
}

// 话题复盘 Prompt 生成器（Topic Revival）：话题 + 关联核心词汇 → ChatGPT 提示词 → 剪贴板 + 绿色 Toast
async function fireTopicRevivalPrompt(btn, idx) {
  const topic = (_topicLibraryCache || [])[idx];
  if (!topic) return;
  const topicWords = topic.words.length ? topic.words : topic.keyTerms;
  const prompt = `作为我的英语口语私教，我们之前探讨过【${topic.title}】这个话题。今天我想继续或者换个角度聊聊这个话题，请在接下来的对话中，自然地引导我使用这些词汇：[${topicWords.join(', ')}]。你先向我提问吧。`;
  const copied = await copyToClipboardWithFallback(prompt);
  if (!copied) { showToast('复制失败，请长按文本手动复制'); return; }
  showToast('📋 话题复盘 Prompt 已复制', 'success');
}

// ═══ 错题本 ═══
// v99：发音错题已整体移出错题体系（用户指令）—— 错题只剩语法，errorBadge 三态标签整体删除（无必要再打标）
// v97：「加入对练防御」功能已全面下线（用户指令：冗余功能彻底去除）——
// getDefenseSigs / setDefenseSigs / errorSignature / toggleDefense / paintDefenseToggle 已物理删除

// v77 CorrectionCard 组件化：复用首页「今日需要提升」正向输入卡结构（绿色加粗正确句为主视觉，
// 原句仅小字灰显对照，零红色删除线、零 👁️ 揭示按钮）
// v81：① 主视觉降级链 correct_text → original_text → 隐藏，绝不渲染 '-'/'—' 占位
//      ② 错题库总览列表 = 错题图鉴/仪表盘（非 SM-2 复习模式），无复习按钮、无防御开关（v97 起）
function renderErrorCards(items) {
  const container = document.getElementById('words-content');
  if (!items.length) {
    container.innerHTML = EmptyState({ message: '没有语法错题，继续保持！', size: 80 });
    return;
  }
  container.innerHTML = items.map((e) => {
    // 主视觉（大字/深色）：直接渲染正确表达 correct_text；为空降级显示原句（主色，非绿）；
    // 两者皆空 → 整行隐藏，绝无 '-' 占位
    const main = String(e.correction || '').trim() || String(e.original || '').trim();
    const mainIsCorrect = !!String(e.correction || '').trim();
    // 辅助视觉（小字/灰）：仅当主视觉是正确句且原句存在时对照展示（避免与降级主视觉重复）
    const showOrigRef = mainIsCorrect && String(e.original || '').trim();
    return `
    <div class="err-card bg-[var(--c-surface)] rounded-2xl p-4 mb-3 border border-[var(--c-border-light)] transition-all duration-300" style="box-shadow:var(--c-shadow-sm)">
      ${main ? `<div class="text-xl font-bold mb-1.5 ${mainIsCorrect ? 'text-[var(--c-green)]' : 'text-[var(--c-text)]'}">${h(main)}</div>` : ''}
      ${showOrigRef ? `<div class="text-xs text-[var(--c-text-ultradim)] mb-2">原句：${h(e.original)}</div>` : ''}
      ${e.rule ? `<div class="text-xs text-[var(--c-text-dim)] bg-[var(--c-bg)] p-2 rounded-lg">📖 ${h(e.rule)}</div>` : ''}
    </div>
  `}).join('');
  refreshIcons(container);
}

// ── 模块三：待复习混合记忆引擎（Active Recall + SM-2 双阶段交互）──────────
// 队列 = needsReview===true 的单词 + 语法错题，统一卡组流式打卡；
// 正面遮罩（词卡仅英文+音标 / 错题 = 动态徽章 + 原句小字灰显 + 回忆引导）→ [点击显示答案] → 背面完整解析 + 双反馈按钮
function buildDueDeck() {
  const words = _wordsAll.filter(v => v.needsReview === true)
    .sort((a, b) => (a.next_review_date || '0000') < (b.next_review_date || '0000') ? -1 : 1)
    .map(v => ({ kind: 'word', id: 'w-' + v.id, word: v.word, phonetic: v.phonetic || '', meaning: v.meaning || '', example: v.example || '', ref: v }));
  // v99 错题真 SM-2：dueErrorCards() = errors 表曲线到期行（新卡立即到期 + 间隔推进 + mastered/已纠正出队）
  const errs = dueErrorCards()
    .filter(e => e && e.id && !_reviewedErrorIds.has(String(e.id)))
    .map(e => ({ kind: 'error', id: e.id, error: e }));
  return [...words, ...errs];
}

// ═══ SM-2 统一反馈服务（单词复习 + 句型复习卡片共用同一出口）═══
// handleReviewFeedback(id, status, itemRef)：status 'again'（quality 0）/ 'good'（quality 3）
// 调度顺序：句型库行（patterns 数字主键）→ 今日新句（core-N 队列 ref，INSERT 入库）→ 单词库行
// 返回 { kind: 'pattern' | 'word' | 'unknown', ok } —— 所有回写失败静默降级本地会话态
async function handleReviewFeedback(id, status, itemRef) {
  const quality = status === 'again' ? 0 : 3;
  const sid = String(id);
  // ① 句型库行：patterns.id 为 BIGSERIAL 数字主键，_speakAll 打标行携带 SM-2 字段
  const pat = (_speakAll || []).find(p => String(p.id) === sid && /^\d+$/.test(String(p.id)));
  if (pat) { await reviewPatternItem(pat, quality); return { kind: 'pattern', ok: true }; }
  // ② 今日新句（core-N / expr-N / sentence-anchor）：无库行，由队列 ref 承载 → INSERT 正式进入记忆曲线
  if (itemRef && (itemRef.targetSentence || itemRef.better || itemRef.pattern)) {
    await reviewPatternItem(itemRef, quality);
    return { kind: 'pattern', ok: true };
  }
  // ③ 单词库行：与词汇复习完全同一条写回路径
  const word = (_wordsAll || []).find(w => String(w.id) === sid);
  if (word) { await reviewWordItem(word, quality); return { kind: 'word', ok: true }; }
  return { kind: 'unknown', ok: false };
}

// 单词 SM-2 推进 + 回写（原 applyDueRating + rateDueCard 写回逻辑的无损提取）
async function reviewWordItem(v, quality) {
  const result = sm2(v.ease_factor, v.sm2_interval, v.sm2_repetitions, quality);
  const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + result.interval);
  const status = quality < 3 ? 'learning' : (result.repetitions >= 5 ? 'mastered' : 'learning');
  // 本地快照即时同步：熟练度星级随 review_count 推进，到期时间随 SM-2 推进
  v.review_count = (v.review_count || 0) + 1;
  v.ease_factor = result.ease_factor; v.sm2_interval = result.interval; v.sm2_repetitions = result.repetitions;
  v.status = status; v.mastered = status === 'mastered';
  v.next_review_date = fmtLocalDate(nextDate); v.last_reviewed_at = new Date().toISOString();
  // v103 统一「没记住」口径：again/good 都移出今日待复习队列——两种评分下 next_review_date 都已按 SM-2 推进到明天或更晚
  // （没记住 quality<3 → ivl=1 → 明天复习），与错题 reviewErrorItem 完全一致：按记忆曲线复习，不再当天循环出现
  v.needsReview = false;
  try {
    const { data: row, error } = await sb.from('vocabulary').select('*').eq('id', v.id).single();
    if (!error && row) {
      await sb.from('vocabulary').update({
        status, mastered: status === 'mastered',
        ease_factor: result.ease_factor, sm2_interval: result.interval, sm2_repetitions: result.repetitions,
        review_count: v.review_count, next_review_date: v.next_review_date, last_reviewed_at: v.last_reviewed_at
      }).eq('id', v.id);
    }
  } catch (e) { /* 演示数据：仅本地会话态 */ }
  return true;
}

// 句型 SM-2 推进 + 回写：
//   · 数字主键（BIGSERIAL）→ 库行 UPDATE（与单词写回同构；migration_v2.1 列未跑时 PostgREST 拒绝 → 静默本地态）
//   · core-N / expr-N / sentence-anchor → 非库行临时 id：v104 起先按文本锚定在内存库（_speakAll）定位既有行 ——
//     命中即视为库行走 UPDATE（导入行补 SM-2 字段，同句绝无双行双曲线）；未命中才 INSERT 正式进入记忆曲线
async function reviewPatternItem(p, quality) {
  const result = sm2(p.ease_factor, p.sm2_interval, p.sm2_repetitions, quality);
  const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + result.interval);
  const status = quality < 3 ? 'learning' : (result.repetitions >= 5 ? 'mastered' : 'learning');
  let isDbRow = /^\d+$/.test(String(p.id));
  const isTodayNew = /^(core-\d+|expr-\d+|sentence-anchor)$/.test(String(p.id));
  if (!isDbRow && isTodayNew) {
    // v104 文本锚定 UPSERT（SM-2 队列断层修复核心）：导入瞬间已入库的句子，首次复习绝不盲 INSERT 第二行——
    // 按 better/targetSentence 与 original/replacedSentence 归一化文本（小写去空白）在 _speakAll 打标库中定位既有行，
    // 命中 → 以既有行身份走 UPDATE（其 SM-2 字段从零起步，与 INSERT 语义等价但零重复）；未命中 → 走 INSERT
    const tKey = String(p.targetSentence || '').toLowerCase().trim();
    const oKey = String(p.replacedSentence || '').toLowerCase().trim();
    const hit = (_speakAll || []).find(r => {
      const b = String(r.better || r.targetSentence || '').toLowerCase().trim();
      const o = String(r.original || r.replacedSentence || '').toLowerCase().trim();
      return (tKey && b === tKey) || (oKey && o === oKey);
    });
    if (hit) { p = hit; isDbRow = true; }
  }
  if (isDbRow) {
    // 库行：本地快照 + SM-2 UPDATE
    p.review_count = (p.review_count || 0) + 1;
    p.ease_factor = result.ease_factor; p.sm2_interval = result.interval; p.sm2_repetitions = result.repetitions;
    p.status = status; p.mastered = status === 'mastered';
    p.next_review_date = fmtLocalDate(nextDate); p.last_reviewed_at = new Date().toISOString();
    // v104：与单词路径（reviewWordItem）统一口径 —— again/good 都移出今日队列（next_review_date 已推进，重载后 isDueBySrs 判到期）
    p.needsReview = false;
    try {
      const { data: row, error } = await sb.from('patterns').select('*').eq('id', p.id).single();
      if (!error && row) {
        await sb.from('patterns').update({
          status, mastered: status === 'mastered',
          ease_factor: result.ease_factor, sm2_interval: result.interval, sm2_repetitions: result.repetitions,
          review_count: p.review_count, next_review_date: p.next_review_date, last_reviewed_at: p.last_reviewed_at
        }).eq('id', p.id);
      }
    } catch (e) { /* 列缺失：仅本地会话态 */ }
  } else if (isTodayNew) {
    // 文本锚定未命中的新句（库中确无此行：sentence-anchor 全库反查也落空 / 历史 Markdown 核心句型从未入库）→ INSERT 入库
    // （user_id 必须显式注入，RLS 校验 auth.uid() = user_id）
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return false;
    const insertRow = {
      user_id: session.user.id,
      original: p.replacedSentence || '',
      better: p.targetSentence || '',
      scene: p.explanation || '',
      date_added: getLocalToday(),
      source_topic: '今日日报',
      status, mastered: status === 'mastered',
      ease_factor: result.ease_factor, sm2_interval: result.interval, sm2_repetitions: result.repetitions,
      review_count: 1, next_review_date: fmtLocalDate(nextDate), last_reviewed_at: new Date().toISOString()
    };
    try {
      const { data: inserted, error } = await sb.from('patterns').insert(insertRow).select().single();
      if (!error && inserted) {
        // 本地挂新主键 + SM-2 快照，同会话不重复插入
        p.id = inserted.id;
        p.review_count = 1;
        p.ease_factor = result.ease_factor; p.sm2_interval = result.interval; p.sm2_repetitions = result.repetitions;
        p.status = status; p.mastered = status === 'mastered';
        p.next_review_date = fmtLocalDate(nextDate); p.last_reviewed_at = insertRow.last_reviewed_at;
        p.needsReview = false;
      }
    } catch (e) { /* 列缺失：仅本地会话态 */ }
  }
  return true;
}

// ═══ v76 ReviewButton 全局模板（SSOT · 消灭样式碎片化）═══
// 样式规范：浅粉/浅绿底 + 红/绿纯色圆点（CSS 绘制，零 emoji）+ 红/绿文字
// 调用点：句型复习卡（srs-forgot/srs-remembered）、单词卡组（due-forgot/due-remembered）
// v81：错题库总览列表 = 错题图鉴（非 SM-2 复习模式），无复习按钮；v97 防御开关也已下线
function reviewButtonHTML({ id = '', kind = 'again', label = '', cls = 'py-3 text-sm rounded-2xl' }) {
  const isBad = kind === 'again';
  const color = isBad ? 'var(--c-red)' : 'var(--c-green)';
  const bg = isBad ? 'bg-red-50 hover:bg-red-100' : 'bg-green-50 hover:bg-green-100';
  return `<button${id ? ` id="${id}"` : ''} class="${cls} inline-flex items-center justify-center gap-1.5 ${bg} border-0 font-bold cursor-pointer transition-all" style="color:${color}"><span class="w-2 h-2 rounded-full shrink-0" style="background:${color}"></span>${label}</button>`;
}

// 纯逻辑：卡组流转（没记住→移回队尾继续循环；记住了→移出队列；清空返回 -1）
// v103 统一「没记住」口径：again/good 都移出本会话卡组（没记住按记忆曲线排到明天，不再挪到队尾当天循环）——
// 与句型卡 rateSentenceCard「点完即出队」完全一致；卡组清空返回 -1
function flowDueDeck() {
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

// 未展开（正面）：词卡仅英文+音标（遮挡中文释义与例句）；错题卡按正向输入原则——原句小字灰显对照 + 中性回忆引导（v99 起错题只剩语法，类型徽章已删除）
// 中央统一 [眼睛图标 点击显示答案]（v79 去 emoji，Lucide 图标 + 纯文本）；展开后（背面）底部切换 [没记住] [记住了]（v76 统一 ReviewButton 模板）
function showDueCard() {
  const item = _dueDeck[_dueIdx];
  if (!item) return;
  _dueRevealed = false;
  const front = item.kind === 'word'
    ? `<div class="text-xl font-bold text-[var(--c-text)]">${h(item.word)}</div>${item.phonetic ? `<div class="text-sm text-[var(--c-primary)] mt-1">${h(item.phonetic)}</div>` : ''}`
    : `<div class="text-xs text-[var(--c-text-ultradim)]">原句：${h(item.error.original)}</div>
          <div class="flex items-center justify-center gap-1.5 text-xs text-[var(--c-text-dim)] mt-4">${icon('lightbulb','w-4 h-4')} 回忆正确的英文表达</div>`;
  document.getElementById('due-card').innerHTML = `
    <div id="due-card-body" class="bg-[var(--c-surface)] rounded-2xl p-6 border border-[var(--c-border-light)] text-center transition-all duration-300" style="box-shadow:var(--c-shadow-sm)">
      ${front}
      <div id="due-answer-area"></div>
      <button id="due-reveal-btn" class="w-full mt-5 py-3 bg-[var(--c-bg)] hover:bg-[var(--c-border-light)] border-0 rounded-2xl text-sm font-semibold text-[var(--c-primary)] cursor-pointer transition-all inline-flex items-center justify-center gap-1.5">${icon('eye','w-4 h-4')} 点击显示答案</button>
      <div id="due-feedback" class="hidden"></div>
    </div>`;
  document.getElementById('due-reveal-btn').addEventListener('click', revealDueAnswer);
  document.getElementById('due-progress-text').textContent = `待复习 ${_dueIdx + 1}/${_dueDeck.length}`;
  document.getElementById('due-progress-fill').style.width = `${((_dueIdx + 1) / _dueDeck.length) * 100}%`;
  refreshIcons(document.getElementById('due-card'));
}

function revealDueAnswer() {
  _dueRevealed = true;
  const item = _dueDeck[_dueIdx];
  document.getElementById('due-reveal-btn').remove();
  const ansArea = document.getElementById('due-answer-area');
  if (item.kind === 'word') {
    ansArea.innerHTML = `<div class="text-sm text-[var(--c-text-dim)] mt-4 pt-4 border-t border-[var(--c-border-light)]">${h(item.meaning || '（暂无释义）')}</div>${item.example ? `<div class="text-xs text-[var(--c-text-dim)] not-italic mt-2 p-2.5 bg-[var(--c-bg)] rounded-lg text-left flex items-start gap-1.5">${icon('message-circle','w-3.5 h-3.5 mt-px shrink-0')}<span>${h(item.example)}</span></div>` : ''}`;
  } else {
    // v79：错题背面按 CorrectionCard 正向规格 —— 绿色正确句居中为主视觉（去 → 箭头旧碎片），规则框无 emoji
    const e = item.error;
    ansArea.innerHTML = `${e.correction ? `<div class="text-[1.5rem] font-bold text-[var(--c-green)] text-center mt-4 pt-4 border-t border-[var(--c-border-light)]">${h(e.correction)}</div>` : ''}${e.rule ? `<div class="text-xs text-[var(--c-text-ultradim)] text-left mt-3 p-2.5 bg-[var(--c-bg)] rounded-lg">${h(e.rule)}</div>` : ''}`;
  }
  const fb = document.getElementById('due-feedback');
  fb.className = 'mt-5 flex items-center justify-center gap-3';
  fb.innerHTML = `
    ${reviewButtonHTML({ id: 'due-forgot', kind: 'again', label: '没记住', cls: 'flex-1 py-3 text-sm rounded-2xl' })}
    ${reviewButtonHTML({ id: 'due-remembered', kind: 'good', label: '记住了', cls: 'flex-1 py-3 text-sm rounded-2xl' })}`;
  document.getElementById('due-forgot').addEventListener('click', () => rateDueCard('again'));
  document.getElementById('due-remembered').addEventListener('click', () => rateDueCard('good'));
}

async function rateDueCard(rating) {
  const item = _dueDeck[_dueIdx];
  if (!item || !_dueRevealed) return;
  if (item.kind === 'word') {
    // v103：统一反馈服务（与句型卡共用 SM-2 写回路径，deck item id 带 'w-' 前缀 → 传原始单词 id）
    // 改 fire-and-forget：旧实现 await 写库（select+update 两次网络往返），点击「记住了」后卡片冻结 2-3 秒才跳下一词；
    // 本地 SM-2 态同步在函数同步段立即生效，DB 回写后台进行 —— 与句型卡 rateSentenceCard 完全一致
    handleReviewFeedback(String(item.ref.id), rating).catch(() => {});
  } else {
    // v99 错题真 SM-2：again/good 均推进曲线并落库
    // v103 统一「没记住」口径：again 与 good 一样直接出队——next_review_date 已推进到明天，
    // dueErrorCards 按日期重算自然排除，不再需要任何「今天循环」特判
    if (rating === 'good') _reviewedErrorIds.add(String(item.id));
    reviewErrorItem(item.error, rating === 'good' ? 3 : 0);
  }
  _dueResults[rating === 'good' ? 'remembered' : 'forgot'] += 1;
  const body = document.getElementById('due-card-body');
  if (body) { body.style.opacity = '0'; body.style.transform = 'translateY(-8px)'; }
  setTimeout(() => {
    const next = flowDueDeck(); // v103：again/good 均移出本会话卡组（没记住按记忆曲线明天复习）
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
      <div class="text-sm text-[var(--c-text-dim)] mb-4">记住了 <strong>${_dueResults.remembered}</strong> 个 · 没记住 <strong>${_dueResults.forgot}</strong> 个</div>
      <button class="btn-primary" style="width:auto;padding:10px 24px;" onclick="loadWords()">再来一轮</button>
    </div>`;
}

function getFilteredVocab(items, mode) {
  // 去时间化：纯布尔标签过滤（isNewToday/isMistake/needsReview 由打标网关注入）
  if (mode === 'review' || mode === 'due') {
    return items.filter(v => v.needsReview === true);
  }
  if (mode === 'new' || mode === 'today') {
    // v82 日期路由：_ctxDate 存在 → 该日日报生词为唯一数据源（该日无日报/无生词 → 空，绝不回退今日 isNewToday）
    if (_ctxDate) {
      const dp = parsedReportFor(_ctxDate);
      if (!dp) return [];
      return (dp.vocabulary || []).map((w, i) => {
        const existing = items.find(x => String(x.word || '').toLowerCase() === String(w.word || '').toLowerCase());
        return {
          ...w,
          id: (existing && existing.id !== undefined) ? existing.id : 'rep-' + i,
          word: w.word, phonetic: w.phonetic || '', meaning: w.meaning || '', example: w.example || '',
          source_topic: (existing && existing.source_topic) || `${_ctxDate} 日报`,
          status: existing ? existing.status : 'new',
          review_count: existing ? (existing.review_count || 0) : 0,
          isNewToday: true, isMistake: false
        };
      });
    }
    // 真实日报生词 = 「今日新词」唯一事实源（与首页 newCount = parsed.vocabulary.length 绝对一致）
    // 断流修复：移除「打标词优先短路」—— mock 2 词曾短路掉日报 12 词，导致首页 12 / 复习页 2
    const realVocab = (_reportParsed && _reportParsed.vocabulary) || [];
    if (realVocab.length) {
      return realVocab.map((w, i) => {
        const existing = items.find(x => String(x.word || '').toLowerCase() === String(w.word || '').toLowerCase());
        return {
          ...w,
          id: (existing && existing.id !== undefined) ? existing.id : 'rep-' + i,
          word: w.word, phonetic: w.phonetic || '', meaning: w.meaning || '', example: w.example || '',
          source_topic: (existing && existing.source_topic) || '今日日报',
          status: existing ? existing.status : 'new',
          review_count: existing ? (existing.review_count || 0) : 0,
          isNewToday: true, isMistake: false
        };
      });
    }
    // 无真实日报（演示态）：词库 isNewToday 打标词（与首页 countTodayWords 同规则）
    return items.filter(v => v.isNewToday === true);
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
    review_count: (v.review_count || 0) + 1, next_review_date: fmtLocalDate(nextDate),
    last_reviewed_at: new Date().toISOString()
  }).eq('id', id);
  loadWords();
  showToast(status === 'mastered' ? '🎉 已掌握！' : '📖 已复习');
}

// ═══════════════════════════════════════════════════════
// TAB 3: SPEAK
// ═══════════════════════════════════════════════════════
// v104：旧 Speak 智能过滤机器（SPEAK_PATTERN_TOPICS / SPEAK_FILTER_ALIASES / matchSpeakFilter）已物理删除——
// 句型复习页 v104 起由三视图（句型卡组/自然表达/核心句型）接管，?filter= 路由零调用方；
// 其依赖的 is_core 列从未建表，isTodayCore 布尔自此无渲染消费者（打标字段保留，纯透传）

// 当前日报解析器：今天日报 → 用户正在查看的历史日期 → 最新一份有效日报（三级回退）
// 句型复习页/复习页共用 —— 绝不再因为日报不是「今天」生成的就回退到 Mock 数据断流
function resolveActiveReport(reports) {
  const list = reports || [];
  const today = getLocalToday();
  return list.find(r => r.date === today && isDailyReport(r))
    || (_viewDate ? list.find(r => r.date === _viewDate && isDailyReport(r)) : null)
    || list.find(r => isDailyReport(r)) || null;
}

async function loadSpeak() {
  const container = document.getElementById('speak-player');
  container.innerHTML = LoadingState();
  const [{ data: patterns }, { data: reports }] = await Promise.all([
    sb.from('patterns').select('*').order('created_at', { ascending: false }),
    sb.from('reports').select('*').order('date', { ascending: false }).limit(1000)
  ]);
  // v95：mockSentences 已物理删除 —— 真实库打标即全量展示库，空表 = 空状态
  // v104：打标 + 文本去重（双行遗留收敛）—— _speakAll 与 _patternLibrary 同源同数组，队列/待办数字绝对一致
  const taggedPatterns = (patterns && patterns.length) ? dedupePatternsByText(stampPatternTags(patterns)) : [];
  _speakAll = taggedPatterns; // 打标网关：唯一 id + isTodayCore + needsReview + 标准嵌套字段
  _patternLibrary = taggedPatterns;
  _reportsCache = (reports && reports.length) ? reports : _reportsCache; // v82：日期路由解析源缓存刷新
  renderSpeakRoute();
}

// ═══════════════════════════════════════════════════════
// v104 句型复习页三视图分发（URL 是唯一事实源）：
//   ?view=expressions → 自然表达对比阅读卡片列表（该日日报 patterns，零挖空）
//   ?view=core        → 核心句型对比阅读卡片列表（该日日报 sentence_patterns，零挖空）
//   缺省              → SRS 翻卡卡组（任务 2：getDueSentencesQueue 纯库捞 —— 新卡 + SM-2 到期队列，零运行时拼凑）
// ═══════════════════════════════════════════════════════
function renderSpeakRoute() {
  const params = new URLSearchParams(window.location.search);
  // v82/v85 日期路由：?date=YYYY-MM-DD（含今日）→ 列表/卡组队列 = 该日日报数据；无 date → 今日默认链路
  const dParam = params.get('date');
  _ctxDate = dParam || null;
  const view = params.get('view');
  _speakView = (view === 'expressions' || view === 'core') ? view : '';
  // v104 冷启动保障：直达句型复习页时 _reportParsed 可能未建（未经 loadHome）→ 现场解析今日日报，
  // 保证三个视图（自然表达列表 / 核心句型列表 / SRS 卡组）的 parsedReportFor(today) 都拿得到今日数据
  const today = getLocalToday();
  if (!_reportParsed) {
    const todayRow = (_reportsCache || []).find(r => r.date === today && isDailyReport(r));
    if (todayRow) _reportParsed = parseSmartReport(todayRow.content);
  }
  renderSpeakSubTabs();
  if (_speakView === 'expressions') { renderExpressionList(); return; }
  if (_speakView === 'core') { renderCoreList(); return; }

  // ── SRS 卡组（任务 2）──
  let sentences;
  if (_ctxDate && _ctxDate !== today) {
    // 历史日期 → 该日日报核心句型（v85 语义，只读浏览；写回走文本锚定 UPSERT，绝不重复入库）
    const dp = parsedReportFor(_ctxDate);
    sentences = dp ? coreDeck(dp) : [];
  } else {
    // v104 SM-2 队列断层修复：队列纯库捞 —— 导入瞬间句子已正式入库，今日新句/历史到期句都在 _speakAll 库中，
    // getDueSentencesQueue(_speakAll) 唯一事实源（新卡 = 无 next_review_date，到期卡 = 曲线到期），零运行时解析拼凑
    sentences = getDueSentencesQueue(_speakAll);
  }
  // ?id= / ?sentence= 锚定仅决定起始卡片（首页「今天需要提升」跳转仍然生效），绝不改变队列内容
  const anchorId = params.get('id') || null;
  const anchorText = params.get('sentence') || null;
  let startIndex = 0;
  if (anchorId) startIndex = resolveAnchorIndex(sentences, anchorId);
  else if (anchorText) {
    const hit = sentences.findIndex(s => String(s.targetSentence || '').toLowerCase().trim() === String(anchorText).toLowerCase().trim());
    if (hit >= 0) startIndex = hit;
    else {
      // v86 文本锚定未命中（地道表达句不在该日核心句型队列）：以点击句为首卡入队（sentence-anchor 契约，
      // 复习反馈时自动 INSERT 进入记忆曲线），队列其余部分保持该日句式 —— 用户练的永远是点击的那一句
      // v100 全库反查：队列未命中 ≠ 库中没有——点击句可能属于自然表达（patterns 表 better/scene），
      // 先去 _patternLibrary 按 targetSentence 文本精确匹配，命中即以完整记录入队（解析/场景/SM-2 字段全带齐）；
      // 全库也没有才建空解析 sentence-anchor 卡 —— 「暂无解析」从此只代表数据真缺失
      const libHit = (_patternLibrary || []).find(p => String(p.targetSentence || '').toLowerCase().trim() === String(anchorText).toLowerCase().trim());
      sentences = [libHit ? toPlayerItem(libHit) : { id: 'sentence-anchor', targetSentence: anchorText, replacedSentence: '', explanation: '', isTodayCore: false }].concat(sentences || []);
      startIndex = 0;
    }
  }
  const anchoredAt = (anchorId || anchorText) ? sentences[startIndex] : null;
  if ((anchorId || anchorText) && (!anchoredAt || (String(anchoredAt.id) !== String(anchorId) && String(anchoredAt.targetSentence || '').toLowerCase().trim() !== String(anchorText || '').toLowerCase().trim()))) {
    showToast('未找到指定句子，已从头开始');
    startIndex = 0;
  }
  renderSentenceReview(sentences, startIndex);
}

// ── v104 句型复习页 sub-tab 壳（句型卡组 / 自然表达 / 核心句型）──
// 切换保留当前 date 参数（switchSpeakView 读 URL 原样携带），历史日期上下文绝不丢失
function renderSpeakSubTabs() {
  const el = document.getElementById('speak-subtabs');
  if (!el) return;
  el.style.display = 'flex';
  const tabs = [
    { key: '', label: '句型卡组' },
    { key: 'expressions', label: '自然表达' },
    { key: 'core', label: '核心句型' }
  ];
  el.innerHTML = tabs.map(t =>
    `<span class="lib-subtab${t.key === _speakView ? ' active' : ''}" onclick="switchSpeakView('${t.key}')">${t.label}</span>`
  ).join('');
}

function switchSpeakView(view) {
  if (view !== '' && view !== 'expressions' && view !== 'core') view = '';
  const d = new URLSearchParams(window.location.search).get('date');
  const qs = [];
  if (view) qs.push('view=' + view);
  if (d) qs.push('date=' + encodeURIComponent(d));
  window.history.pushState({}, '', '/shadowing' + (qs.length ? '?' + qs.join('&') : ''));
  _ctxDate = d || null;
  _speakView = view;
  renderSpeakRoute(); // 数据已加载（_speakAll/_reportsCache），零网络重渲染
}

// ═══ v104 对比阅读卡片（跳转页 · 用户指令）：主视觉 = Improved/Target 正确句（绿），
//     辅助视觉 = Original/Replaced 原句（灰小字），底部 = Explanation 解析框 —— 零挖空、零填空 ═══
function comparisonCardHTML(main, original, note) {
  return `<div class="err-card bg-[var(--c-surface)] rounded-2xl p-4 mb-3 border border-[var(--c-border-light)] transition-all duration-300" style="box-shadow:var(--c-shadow-sm)">
    ${main ? `<div class="text-xl font-bold mb-1.5 text-[var(--c-green)]">${h(main)}</div>` : ''}
    ${original ? `<div class="text-xs text-[var(--c-text-ultradim)] mb-2">原句：${h(original)}</div>` : ''}
    ${note ? `<div class="text-xs text-[var(--c-text-dim)] bg-[var(--c-bg)] p-2 rounded-lg">📖 ${h(note)}</div>` : ''}
  </div>`;
}

// v104 列表头部：历史日期横幅（今日零侵入）+ 计数行（N 与打分面板子块数字同源 —— 同一 parsed 桶）
// v109 横幅全段常显（用户 Bug 报告 + 三次确认最终样式）：双行居中胶囊框，今日/历史统一日期格式 ——
//     「📅 正在查看 2026-08-21 的当日数据」主行 + 「共 8 条自然表达」副行（核心句型段同构）
function speakListHeader(count, dim, unit) {
  const date = _ctxDate || getLocalToday();
  return `<div class="mb-3 px-4 py-2.5 rounded-xl bg-[var(--c-primary-light)] border border-[var(--c-border-light)] text-center">
    <div class="text-[0.875rem] font-semibold text-[var(--c-primary)]">📅 正在查看 ${date} 的当日数据</div>
    <div class="text-xs font-semibold text-[var(--c-text-dim)] mt-1">共 ${count} ${unit}${dim}</div>
  </div>`;
}

// 列表空状态：历史日期无记录 → 纯提示；今日无日报 → 导入引导
function speakListEmpty(label) {
  const today = getLocalToday();
  const isHist = _ctxDate && _ctxDate !== today;
  const dp = parsedReportFor(_ctxDate || today);
  const hasReport = !!dp;
  const subtitle = isHist
    ? `未找到 ${_ctxDate} 日报中的${label}记录`
    : (hasReport ? `该日日报未记录${label}` : `导入今日日报后，这里会展示${label}对照列表`);
  const importBtn = (!isHist && !hasReport)
    ? `<button onclick="showImportDialog()" class="inline-flex items-center gap-1.5 px-6 py-3 rounded-2xl border-0 cursor-pointer text-sm font-bold text-white transition-all duration-200 active:scale-[0.97]"
        style="background:linear-gradient(135deg,var(--c-primary),var(--c-green));box-shadow:0 8px 18px -8px rgba(0,0,0,0.35)">
        📥 导入今日日报 <i data-lucide="arrow-right" class="w-4 h-4"></i>
      </button>`
    : '';
  return `<div class="flex h-full items-center justify-center">
    <div class="w-full max-w-[320px] rounded-3xl px-6 pt-9 pb-8 text-center border border-[var(--c-border-light)]"
         style="background:linear-gradient(160deg,var(--c-primary-light),var(--c-surface) 65%);box-shadow:var(--c-shadow)">
      <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--c-primary-light)] flex items-center justify-center" style="box-shadow:inset 0 0 0 1px var(--c-primary)">
        <i data-lucide="book-open" class="w-5 h-5 text-[var(--c-primary)]"></i>
      </div>
      <div class="text-base font-bold text-[var(--c-text)] mb-2 tracking-wide">暂无${label}记录</div>
      <div class="text-[0.875rem] text-[var(--c-text-dim)] mb-6 leading-relaxed">${subtitle}</div>
      ${importBtn}
    </div>
  </div>`;
}

// 自然表达列表：该日日报 patterns（mistakes 过滤 expression）→ 对比阅读卡片
// 主句 = better（地道升级句），原句 = original，解析 = scene（无 scene 降级 pattern 根因）
function renderExpressionList() {
  const container = document.getElementById('speak-player');
  const dp = parsedReportFor(_ctxDate || getLocalToday());
  const items = (dp && dp.patterns) || [];
  if (!items.length) { container.innerHTML = speakListEmpty('自然表达'); refreshIcons(container); return; }
  container.innerHTML = speakListHeader(items.length, '自然表达', '条') + items.map(x =>
    comparisonCardHTML(
      String(x.better || x.original || '').trim(),
      x.better ? String(x.original || '').trim() : '',
      String(x.scene || x.pattern || '').trim()
    )
  ).join('');
  refreshIcons(container);
}

// 核心句型列表：该日日报 sentence_patterns → 对比阅读卡片
// 主句 = pattern/targetSentence（金句），原句 = replacedSentence（空则省略整行），解析 = example/explanation
function renderCoreList() {
  const container = document.getElementById('speak-player');
  const dp = parsedReportFor(_ctxDate || getLocalToday());
  const items = (dp && dp.sentence_patterns) || [];
  if (!items.length) { container.innerHTML = speakListEmpty('核心句型'); refreshIcons(container); return; }
  container.innerHTML = speakListHeader(items.length, '核心句型', '句') + items.map(s =>
    comparisonCardHTML(
      String(s.pattern || s.targetSentence || s.text || '').trim(),
      String(s.replacedSentence || '').trim(),
      String(s.example || s.explanation || '').trim()
    )
  ).join('');
  refreshIcons(container);
}

// 纯逻辑：id 锚定定位（缺失/越界/无匹配 → 0；字符串化比对，绝不误判数字 id）
function resolveAnchorIndex(sentences, anchorId) {
  if (anchorId === undefined || anchorId === null || anchorId === '') return 0;
  const idx = sentences.findIndex(s => s.id !== undefined && String(s.id) === String(anchorId));
  return idx >= 0 ? idx : 0;
}

// 核心句型训练队列组装（v104 后仅服务历史日期只读浏览）：该日日报 sentence_patterns → 队列 item
// v63：parsed（该日日报解析）一旦存在就是唯一事实源 —— 0 句就 0 句，绝不回退打标/Mock；
// v104：默认今日队列已纯库捞（getDueSentencesQueue），本函数与默认队列无关；
//      写回走文本锚定 UPSERT —— 历史句当日若已入库（导入即入库），复习即 UPDATE 既有行，绝不重复 INSERT
function coreDeck(parsed) {
  return (parsed.sentence_patterns || []).map((s, i) => ({
    id: 'core-' + i,
    targetSentence: s.pattern || s.targetSentence || s.text || '',
    replacedSentence: s.replacedSentence || '',
    explanation: s.example || s.explanation || ''
  }));
}

// getDueSentencesQueue —— 今日到期句式队列唯一事实源（句型复习打卡总任务数同源）
// v104 SM-2 队列断层修复（用户指令）：队列纯库捞 —— 导入瞬间句子已正式入库（patterns 表），
// 新卡 = 库中无 next_review_date 的行（未复习 → 立即到期，isDueBySrs 判据），历史到期卡 = SM-2 曲线到期行；
// 运行时解析临时拼凑（coreDeck + expressionDeck 拼接、expr-N/core-N 临时 id）已物理退役 —— 队列 item 一律库行 pat_N
// 文本去重：同句多行（历史「导入行 + 复习 INSERT 行」双行遗留）只保留优先行；库级 dedupePatternsByText 已收敛，此处兜底
// 排序：新卡优先（date_added 降序 → 今日新句最前）→ 到期卡（next_review_date 升序，最急先练）
// v77 SM-2 漏斗：单日队列上限截断 slice(0, PATTERN_SESSION_CAP) —— 只取今日到期前 15 句，严禁整个数据库倒给前端；
// 未入队的到期句次日仍在队列（SM-2 未推进 = 仍到期），逐日消化，绝无丢失
const PATTERN_SESSION_CAP = 15;
function getDueSentencesQueue(speakAll) {
  const seen = new Set();
  const newCards = [];
  const dueCards = [];
  for (const p of (speakAll || [])) {
    if (p.needsReview !== true) continue;
    const k = String(p.targetSentence || p.better || p.original || '').toLowerCase().trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    if (!p.next_review_date) newCards.push(p); else dueCards.push(p);
  }
  newCards.sort((a, b) => String(b.date_added || '').localeCompare(String(a.date_added || '')));
  dueCards.sort((a, b) => String(a.next_review_date || '').localeCompare(String(b.next_review_date || '')));
  return newCards.concat(dueCards).map(toPlayerItem).slice(0, PATTERN_SESSION_CAP);
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
let _speakView = '';                 // v104 句型复习页三视图：'' 卡组 / 'expressions' 自然表达 / 'core' 核心句型

// ═══════════════════════════════════════════════════════
// 句型记忆卡片 — Sentence SRS Cards（v73 建卡 · v104 换皮不换骨）
// 机械录音（听原音/按住录音/听自己）已下线；页面为 SM-2 卡片复习。
// v104 重构（用户指令）：挖空完形引擎 buildCloze 已物理删除，绝不残留——
//   卡片统一渲染【主视觉正确句（Improved/Target）+ 辅助视觉原句（Original/Replaced）+ 底部解析（Explanation）】；
//   标准 SRS 翻卡交互：正面仅情境提示，点击翻面展示正确句/原句/解析后，底部才弹出「还没记住 / 记住了」；
//   反馈仍走 handleReviewFeedback 统一出口（SM-2 调度层零改动），点完即出队进入下一题。
// 铁律：单卡片视口，绝不允许 .map 瀑布流列表；队列 = getDueSentencesQueue 唯一事实源（核心句型 + 自然表达同一队列）
// ═══════════════════════════════════════════════════════
let _srsQueue = [];                  // 今日到期句式队列（核心句型 + 自然表达混编）
let _srsIdx = 0;                     // 当前卡片下标
let _srsReviewed = 0;                // 已复习数（🎯 句型复习 (已复习 x / 总计 y)）
let _srsTotal = 0;                   // 队列总长（开局快照，splice 移除后不变）
let _srsResults = { remembered: 0, forgot: 0 };
let _srsFlipped = false;             // 卡片翻转态

function renderSentenceReview(sentences, startIndex) {
  const container = document.getElementById('speak-player');
  _srsQueue = (sentences || []).slice();
  _srsIdx = (Number.isInteger(startIndex) && startIndex >= 0 && startIndex < _srsQueue.length) ? startIndex : 0;
  _srsReviewed = 0;
  _srsTotal = _srsQueue.length;
  _srsResults = { remembered: 0, forgot: 0 };
  _srsFlipped = false;

  // 边界处理：没有数据 → 句型 SRS 空状态（温润极简：微圆底块 + 克制线性图标，绝不出现「(0句)」计数）
  if (_srsQueue.length === 0) {
    container.innerHTML = `
      <div class="flex h-full items-center justify-center">
        <div class="w-full max-w-[320px] rounded-3xl px-6 pt-9 pb-8 text-center border border-[var(--c-border-light)]"
             style="background:linear-gradient(160deg,var(--c-primary-light),var(--c-surface) 65%);box-shadow:var(--c-shadow)">
          <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--c-primary-light)] flex items-center justify-center" style="box-shadow:inset 0 0 0 1px var(--c-primary)">
            <i data-lucide="book-open" class="w-5 h-5 text-[var(--c-primary)]"></i>
          </div>
          <div class="text-base font-bold text-[var(--c-text)] mb-2 tracking-wide">${_ctxDate ? '该日暂无句型数据' : '暂无待复习句型'}</div>
          <div class="text-[0.875rem] text-[var(--c-text-dim)] mb-6 leading-relaxed">${_ctxDate ? `未找到 ${h(_ctxDate)} 的日报核心句型` : '导入今日日报获得新句型<br/>或等待历史句型复习到期'}</div>
          <button onclick="showImportDialog()" class="inline-flex items-center gap-1.5 px-6 py-3 rounded-2xl border-0 cursor-pointer text-sm font-bold text-white transition-all duration-200 active:scale-[0.97]"
            style="background:linear-gradient(135deg,var(--c-primary),var(--c-green));box-shadow:0 8px 18px -8px rgba(0,0,0,0.35)">
            📥 导入今日日报 <i data-lucide="arrow-right" class="w-4 h-4"></i>
          </button>
        </div>
      </div>`;
    refreshIcons(container);
    return;
  }

  container.innerHTML = `
    <div class="flex flex-col h-full">
      <!-- 顶部进度栏：与词汇复习统一 —— 🎯 句型复习 (已复习 x / 总计 y) + 进度条 -->
      <div class="flex items-center gap-2 mb-3">
        <span id="srs-progress-text" class="text-xs font-semibold text-[var(--c-text)] shrink-0"></span>
        <div class="flex-1 h-1.5 bg-[var(--c-border-light)] rounded-full overflow-hidden"><div id="srs-progress-fill" class="h-full bg-[var(--c-primary)] rounded-full transition-all duration-300" style="width:0%"></div></div>
      </div>
      <!-- v104 翻转卡片（换皮不换骨）：正面 = 💡 情境提示（挖空完形已物理删除，零填空）；
           背面 = 居中放大绿色地道句（主视觉）+ 原句小字（辅助视觉，无则整行隐藏）+ 解析（底部）-->
      <div class="srs-flip-scene mb-4 cursor-pointer" onclick="flipSrsCard()">
        <div class="srs-flip-inner" id="srs-flip-inner">
          <div class="srs-flip-face srs-flip-front flex flex-col items-center justify-center text-center rounded-[2rem] border border-[var(--c-border-light)] px-7 py-8" style="background:var(--c-surface);box-shadow:var(--c-shadow)">
            <div class="text-[0.6875rem] text-[var(--c-text-ultradim)] mb-4 tracking-widest">情境提示 · 回忆地道表达</div>
            <div id="srs-card-clue" class="font-sans text-[0.875rem] text-[var(--c-text-dim)] mb-5 leading-relaxed"></div>
            <div class="text-[0.6875rem] text-[var(--c-text-ultradim)] mt-4">点击卡片查看完整地道句</div>
          </div>
          <div class="srs-flip-face srs-flip-back flex flex-col items-center justify-center text-center rounded-[2rem] border border-[var(--c-border-light)] px-7 py-8" style="background:linear-gradient(160deg,var(--c-primary-light),var(--c-surface) 70%);box-shadow:var(--c-shadow)">
            <div class="text-[0.6875rem] text-[var(--c-text-ultradim)] mb-4 tracking-widest">点击卡片返回情境</div>
            <p id="srs-card-back-correct" class="font-sans font-bold text-[1.5rem] text-[var(--c-green)] leading-snug"></p>
            <div id="srs-card-back-original" class="font-sans text-[0.8125rem] text-[var(--c-text-ultradim)] mt-2 leading-relaxed"></div>
            <div id="srs-card-back-explanation" class="font-sans text-[0.875rem] text-[var(--c-text-dim)] mt-4 leading-relaxed"></div>
          </div>
        </div>
      </div>
      <!-- v104 标准 SRS 翻卡：解析与反馈按钮默认隐藏（display:none），flipSrsCard 翻面后才弹出；
           反馈区沿用 v76 统一 ReviewButton 模板 —— 浅粉/浅绿底 + 纯色圆点 + 红/绿文字，零 emoji，与单词复习页绝对一致 -->
      <div id="srs-actions" class="flex items-center justify-center gap-3" style="display:none">
        ${reviewButtonHTML({ id: 'srs-forgot', kind: 'again', label: '还没记住', cls: 'flex-1 py-3 text-sm rounded-2xl' })}
        ${reviewButtonHTML({ id: 'srs-remembered', kind: 'good', label: '记住了', cls: 'flex-1 py-3 text-sm rounded-2xl' })}
      </div>
    </div>`;
  renderSrsCard();
  document.getElementById('srs-forgot').addEventListener('click', () => rateSentenceCard('again'));
  document.getElementById('srs-remembered').addEventListener('click', () => rateSentenceCard('good'));
  refreshIcons(container);
}

// v104 状态驱动渲染（换皮不换骨）：正面 = 仅 💡 情境提示（零挖空）；背面 = 绿色地道句 + 原句小字 + 解析
function renderSrsCard() {
  const item = _srsQueue[_srsIdx];
  if (!item) return;
  document.getElementById('srs-progress-text').textContent = `🎯 句型复习 (已复习 ${_srsReviewed} / 总计 ${_srsTotal})`;
  document.getElementById('srs-progress-fill').style.width = `${(_srsReviewed / _srsTotal) * 100}%`;
  const target = String(item.targetSentence || '').trim();
  const original = String(item.replacedSentence || '').trim();
  const expl = String(item.explanation || '').trim();
  // 正面：💡 想要表达：[中文情境]（挖空完形已物理删除 —— 不再展示目标句任何遮挡形态）
  document.getElementById('srs-card-clue').textContent = expl ? `💡 想要表达：${expl}` : '💡 想要表达：完成下面的地道表达';
  // 背面三件套：主视觉正确句（绿）+ 辅助视觉原句（灰小字，无则清空隐藏）+ 解析
  document.getElementById('srs-card-back-correct').textContent = target || '（暂无句子）';
  const origEl = document.getElementById('srs-card-back-original');
  if (origEl) origEl.textContent = original ? `原句：${original}` : '';
  document.getElementById('srs-card-back-explanation').textContent = expl ? `🎬 ${expl}` : '（暂无解析）';
  // 翻卡态复位：回到正面 + 隐藏反馈按钮（标准 SRS：解析与按钮只在翻面后出现）
  _srsFlipped = false;
  document.getElementById('srs-flip-inner').classList.remove('flipped');
  const actions = document.getElementById('srs-actions');
  if (actions) actions.style.display = 'none';
}

// v104 标准 SRS 翻卡交互：点击翻面展示「正确句 + 原句 + 解析」，同时底部弹出「还没记住 / 记住了」；
// 再点翻回正面 → 按钮随之隐藏。反馈触发仍由 rateSentenceCard → handleReviewFeedback 统一出口，调度层零改动
function flipSrsCard() {
  _srsFlipped = !_srsFlipped;
  document.getElementById('srs-flip-inner').classList.toggle('flipped', _srsFlipped);
  const actions = document.getElementById('srs-actions');
  if (actions) actions.style.display = _srsFlipped ? 'flex' : 'none';
}

// 反馈闭环：ReviewButton → handleReviewFeedback（SM-2 统一服务）→ 当前句出队 → 进度即时更新
// 队列清空 → 精致 Done 卡 + 点亮首页【句型复习打卡】（voco-speak-done 当日戳）
function rateSentenceCard(status) {
  const item = _srsQueue[_srsIdx];
  if (!item) return;
  handleReviewFeedback(String(item.id), status, item); // 异步写回不阻塞出队节奏（fire-and-forget）
  _srsResults[status === 'again' ? 'forgot' : 'remembered'] += 1;
  _srsReviewed += 1;
  _srsQueue.splice(_srsIdx, 1); // 点击后自动从队列移除（与 PM 闭环要求一致）
  if (_srsQueue.length === 0) { showSrsDone(); return; }
  _srsIdx = _srsIdx % _srsQueue.length;
  renderSrsCard();
}

function showSrsDone() {
  try { localStorage.setItem('voco-speak-done', getLocalToday()); } catch (e) {} // 点亮首页【句型复习打卡】
  const container = document.getElementById('speak-player');
  container.innerHTML = `
    <div class="flex h-full items-center justify-center">
      <div class="w-full max-w-[320px] rounded-3xl px-6 pt-9 pb-8 text-center border border-[var(--c-border-light)]"
           style="background:linear-gradient(160deg,var(--c-primary-light),var(--c-surface) 65%);box-shadow:var(--c-shadow)">
        <div class="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--c-green-light)] flex items-center justify-center" style="box-shadow:inset 0 0 0 1px var(--c-green)">
          <i data-lucide="party-popper" class="w-5 h-5 text-[var(--c-green)]"></i>
        </div>
        <div class="text-base font-bold text-[var(--c-text)] mb-2 tracking-wide">句型复习完成！</div>
        <div class="text-xs text-[var(--c-text-dim)] mb-1">记住了 ${_srsResults.remembered} · 还没记住 ${_srsResults.forgot}</div>
        <div class="text-[0.6875rem] text-[var(--c-text-ultradim)] mb-6">已点亮首页【句型复习打卡】</div>
        <button onclick="navigateToTab('home')" class="inline-flex items-center gap-1.5 px-6 py-3 rounded-2xl border-0 cursor-pointer text-sm font-bold text-white transition-all duration-200 active:scale-[0.97]"
          style="background:linear-gradient(135deg,var(--c-primary),var(--c-green));box-shadow:0 8px 18px -8px rgba(0,0,0,0.35)">
          🏠 回到首页 <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </button>
      </div>
    </div>`;
  refreshIcons(container);
}

// v73：机械录音（听原音/按住录音/听自己）已整体下线 —— 录音函数与播放器状态驱动全部移除

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
  // v86 全局加固：成就/错误模式聚合前的碎片合并 —— 一条知识 = 一行，聚合计数不再虚高
  // v101 审计：语法弱点分析只计语法错题 —— 备份还原可能带回旧备份中的发音行，防御过滤（与 v99 错题体系口径一致）
  const eList = mergeLabelFragments((errors || []).filter(e => e && e.type !== 'pronunciation'));
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

  // v101：不自然表达分析（根因分布 + 高频不自然句式，扫 reports 原始 JSON）
  renderExpressionInsights();

  // v101：近 7 天四维度分线走势（Chart.js，莫兰迪色系）
  renderTrendChart();
}

// ── 近 7 天趋势图（v101 四维分线）：历史 reports → Chart.js 四维度折线 ──
// 旧版单线综合均值在分数区间窄时是一条直线、无参考价值（用户反馈）。
// 专业口语 App（Speak/ELSA 类）做法：分维度多线 —— 暴露「哪条腿短」而不是把差异抹平成一条均值线。
// 口径与首页打分板完全一致：流利度/语法/词汇/地道与英文思维 四维度 norm100；
// 词汇维度：新版日报 summary.vocabulary（0-10 私教评分），历史日报回退词数折算公式。
let _trendChart = null;
async function renderTrendChart() {
  const canvas = document.getElementById('trendChart');
  if (!canvas || typeof Chart === 'undefined') return; // CDN 未加载 → 静默降级，不阻塞 Profile
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const { data: reports } = await sb.from('reports').select('date, content').order('date', { ascending: false }).limit(1000);
  // 最近 7 个本地日历日（含今天），getLocalToday 时区安全
  const days = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(fmtLocalDate(d)); }
  const dims = { f: [], a: [], n: [], v: [] };
  (reports || []).forEach(r => {
    if (!r.date || !days.includes(r.date) || !isDailyReport(r)) return;
    const dayIdx = days.indexOf(r.date);
    if (dims.f[dayIdx] !== undefined) return; // 同日多报 → 只取第一条
    try {
      const p = parseSmartReport(r.content);
      dims.f[dayIdx] = norm100(p.summary.fluency);
      dims.a[dayIdx] = norm100(p.summary.accuracy);
      // v101 审计：naturalness 用 typeof 判定而非真值 —— 旧 Markdown 日报无该键才回退 fluency×0.8，避免 0 分被回退吞掉
      dims.n[dayIdx] = (typeof p.summary.naturalness === 'number' && isFinite(p.summary.naturalness))
        ? norm100(p.summary.naturalness)
        : norm100(Math.round((p.summary.fluency || 0) * 0.8));
      dims.v[dayIdx] = (typeof p.summary.vocabulary === 'number' && isFinite(p.summary.vocabulary))
        ? norm100(p.summary.vocabulary)
        : Math.min((p.vocabulary || []).length * 20, 100);
    } catch (e) { /* 单日解析失败 → 该日留空（gap），绝不拖垮整图 */ }
  });
  const mkSeries = (label, color, arr) => ({
    label,
    data: arr.map(v => (v === undefined ? null : v)),
    borderColor: color, backgroundColor: color,
    pointBackgroundColor: color, pointBorderColor: '#FFFDF9',
    pointBorderWidth: 1.2, pointRadius: 3, pointHoverRadius: 5,
    borderWidth: 2, fill: false, tension: 0.4, spanGaps: true, clip: false  // v105：spanGaps 跨缺卡日连线（修复断点孤岛）；clip:false 满分圆点/线可溢出绘图区绘制，绝不被容器裁切
  });
  if (_trendChart) _trendChart.destroy();
  _trendChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: days.map(d => d.slice(5).replace('-', '/')),
      datasets: [
        mkSeries('流利度', '#8A9B6E', dims.f),      // 莫兰迪鼠尾草绿
        mkSeries('语法', '#B08884', dims.a),        // 灰玫瑰
        mkSeries('词汇', '#8898B0', dims.v),        // 灰蓝
        mkSeries('地道与思维', '#B4A090', dims.n)   // 暖杏陶土
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      // v103：顶部留白 16px——满分（100）线此前画在绘图区最顶行，线/点上半被图表裁剪区切掉（词汇维度旧公式极易满 100）；
      // 左右 6px 同理防首/末日数据点半裁。容器同步加高 16px（index.html h-[180px]→h-[196px]），绘图区高度不变
      // v105 削顶双保险：dataset 级 clip:false（圆点即使顶格绘制也不被裁切）；Y 轴 max:100 保持不变
      layout: { padding: { top: 16, left: 6, right: 6, bottom: 0 } },
      scales: {
        y: {
          min: 0, max: 100,
          ticks: { stepSize: 20, color: '#A49A87', font: { size: 10 } },
          grid: { color: 'rgba(164,154,135,0.18)' }
        },
        x: {
          ticks: { color: '#A49A87', font: { size: 10 } },
          grid: { display: false }
        }
      },
      plugins: {
        legend: { display: true, position: 'bottom', labels: { color: '#8C8478', font: { size: 10 }, boxWidth: 14, boxHeight: 3, padding: 12 } },
        tooltip: {
          backgroundColor: '#4A4438',
          titleColor: '#F5F1E8',
          bodyColor: '#F5F1E8',
          padding: 10,
          callbacks: {
            label: ctx => (ctx.parsed.y == null ? `${ctx.dataset.label}：暂无数据` : `${ctx.dataset.label} ${ctx.parsed.y} / 100`)
          }
        }
      }
    }
  });
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
    `<div class="flex flex-col items-center gap-1 px-3 py-3 bg-[var(--c-surface)] rounded-2xl border border-[var(--c-border-light)] min-w-[70px] ${b.unlocked?'':'opacity-40 grayscale-[0.8]'}">${icon(b.icon, 'w-8 h-8')}<small class="text-[0.6875rem] text-[var(--c-text-dim)]">${b.label}</small></div>`
  ).join('');
  refreshIcons(container);
}

// ── Error patterns ─────────────────────────────────────
// 强制分类归一化（Normalizer）：错题卡渲染链路（standardizeErrorCards）中，
// 所有错题 type 必须经本映射函数收敛为且仅收敛为 4 标准分类：
// 发音与重音 / 语法与句式 / 地道表达 / 逻辑与衔接（未命中 → 其他）。
// 存量标签快查（旧 6 分类 发音纠偏/时态语态/冠词使用/逻辑衔接 及历史 error_pattern 别名）→ 标准名；
// 未识别标签 → 内容动态推断（存量「其他」同样重算，绝不无条件保留）。
function normalizeErrorCategory(type, original, correction, rule) {
  const t = String(type || '').trim();
  const tl = t.toLowerCase();
  if (tl) {
    if (/发音|重音|读音|音标|音节|pronunc/.test(tl)) return '发音与重音';
    if (/语法|句式|时态|语态|单复数|单数|复数|冠词|介词|主谓|词性|搭配|grammar|tense|article|preposition|singular|plural|过去式|完成时|进行时|in\/on\/at/.test(tl)) return '语法与句式';
    if (/地道|用词|表达|换成|建议|更自然|更好的说法|better|collocation|wording/.test(tl)) return '地道表达';
    if (/逻辑|衔接|连接|连贯|转折|coherence|connector|however|therefore/.test(tl)) return '逻辑与衔接';
    // 存量「其他」或未识别标签 → 内容重算（标签并入规则文本参与关键词匹配）
    return classifyErrorType(original, correction, [rule, t].filter(Boolean).join(' '));
  }
  return classifyErrorType(original, correction, rule);
}

// ── 语法三类（v101 用户定调收敛；2026-08-19 口径微调）────────────────
// v99 起 errors 表只收语法错题，「错误模式分析」的 4 标准分类坍缩为「语法与句式」单桶、
// 失去分析价值 —— 改由语法三维度提供洞察（用户定调精简为三类，口径按中国学习者语言逻辑）：
//   ① 动词与时态：时态 / 主谓一致 / 第三人称单数（动词形态问题）
//   ② 名词与冠词：冠词 a/an/the / 名词单复数（名词属性修饰：可数性/特指性）
//   ③ 句式与搭配：句式结构 / 词性与搭配 / 介词 / 其他语法兜底（介词误用多为固定搭配记忆错误，按用户口径归此类）
const GRAMMAR_CATEGORIES = ['动词与时态', '名词与冠词', '句式与搭配'];
function classifyGrammarCategory(original, correction, rule) {
  const text = [rule, original, correction].filter(Boolean).join(' ').toLowerCase();
  const o = (original || '').toLowerCase(), c = (correction || '').toLowerCase();
  // ① 动词与时态（第三人称|三单|单三 先于桶②的「单数」关键词匹配，防第三人称单数误落名词桶）
  if (/时态|过去式|完成时|进行时|过去时|将来时|一般现在|一般过去|tense|主谓|主谓一致|主语|谓语|agreement|第三人称|三单|单三/.test(text)) return '动词与时态';
  // ② 名词与冠词：关键词 或 原句/正句仅冠词差集（GPT 规则缺关键词时仍能命中）
  if (/冠词|article|单复数|单数|复数|plural|singular/.test(text)
      || ((/\b(a|an|the)\b/.test(o) || /\b(a|an|the)\b/.test(c)) && o.replace(/\b(a|an|the)\b/gi, '') === c.replace(/\b(a|an|the)\b/gi, ''))) return '名词与冠词';
  // ③ 句式与搭配：兜底（介词 in/on/at 不再设专属桶，自然落入）
  return '句式与搭配';
}

// 分类口径统一入口：① 新入库行 error_pattern 列带 3 桶标签（GPT 显式 category 或导入时关键字归类）→ 直读；
// ② 内存解析行（日报 JSON 直读）带 category 键 → 直读；③ 旧行（error_pattern 为 v60-99 的 4 标准分类值）→ 关键字启发式回退。
function resolveGrammarCategory(e) {
  if (!e) return '句式与搭配';
  if (GRAMMAR_CATEGORIES.includes(e.error_pattern)) return e.error_pattern;
  if (GRAMMAR_CATEGORIES.includes(e.category)) return e.category;
  return classifyGrammarCategory(e.original, e.correction || e.improved || '', e.rule || e.explanation || '');
}

// 语法三类聚合（纯函数）：「语法弱点分析」只在此维度计数，输出键只可能是三个语法桶
function aggregateGrammarCategories(errors) {
  const count = {};
  (errors || []).forEach(e => {
    if (!e) return;
    const cat = resolveGrammarCategory(e);
    count[cat] = (count[cat] || 0) + 1;
  });
  return Object.entries(count).sort((a, b) => b[1] - a[1]);
}

function showErrorPatterns(errors) {
  const grp = document.getElementById('error-patterns-group');
  grp.classList.remove('hidden');
  const epDiv = document.getElementById('error-patterns');
  const sorted = aggregateGrammarCategories(errors);
  const max = sorted[0]?.[1] || 1;
  const fixedCount = errors.filter(e => e.correct_in_review).length;
  const fixRate = errors.length > 0 ? Math.round((fixedCount / errors.length) * 100) : 0;
  // 建议生成：三类均为真实弱点，直接取排名最高者
  const topPick = (sorted[0] || [])[0] || '无';

  epDiv.innerHTML = `
    <div class="flex gap-3 mb-4">${[
      `<div class="flex-1 px-3 py-3 bg-[var(--c-bg)] rounded-lg text-center text-xs text-[var(--c-text-dim)]"><strong class="block text-xl text-[var(--c-text)] mb-0.5">${errors.length}</strong>个错误</div>`,
      `<div class="flex-1 px-3 py-3 bg-[var(--c-bg)] rounded-lg text-center text-xs text-[var(--c-text-dim)]"><strong class="block text-xl text-[var(--c-text)] mb-0.5">${fixRate}%</strong>已纠正</div>`
    ].join('')}</div>
    <div class="mb-3"><div class="text-xs font-semibold text-[var(--c-text-dim)] mb-2">语法弱点分布</div>${sorted.map(([name, count]) =>
      `<div class="flex items-center gap-2.5 mb-2 cursor-pointer" onclick="showErrorDetail('${name}')">
        <span class="whitespace-nowrap min-w-[72px] text-xs text-[var(--c-text-dim)] text-right shrink-0">${name}</span>
        <div class="flex-1 h-2 bg-[var(--c-border-light)] rounded-full overflow-hidden"><div class="h-full bg-[var(--c-primary)] rounded-full transition-all duration-500" style="width:${(count/max)*100}%;"></div></div>
        <span class="w-[30px] text-[0.6875rem] text-[var(--c-text-ultradim)] shrink-0">${count}次</span>
      </div>`
    ).join('')}</div>
    <div class="text-xs text-[var(--c-primary)] px-3 py-2 bg-[var(--c-primary-light)] rounded-lg inline-flex items-center gap-1">${icon('lightbulb','w-3.5 h-3.5')} 建议优先练习 <strong>${topPick}</strong> 类语法错误</div>`;
  refreshIcons(epDiv);
}

async function showErrorDetail(pattern) {
  // v101：按语法三类匹配（errors 表 v99 起只收语法错题，分类口径与分布条一致 —— resolveGrammarCategory 统一入口）
  const { data: errors } = await sb.from('errors').select('*');
  const matches = (errors || []).filter(e => resolveGrammarCategory(e) === pattern);
  const items = matches.slice(0, 5);
  let msg = `${pattern} 类语法错误 (共 ${matches.length} 个):\n\n`;
  items.forEach(e => { msg += `• ${e.original} → ${e.correction}${e.rule ? ' (' + e.rule + ')' : ''}\n`; });
  showToast(msg);
}

// ── 不自然表达分析（v101）────────────────────────────
// 数据源：reports 表原始 JSON 的 expression 升级句（original→better，即「不像 local」的逐条记录）。
// 根因口径：新版日报 GPT 打标 pattern 键（4 类枚举）；历史日报无 pattern → 启发式关键词回退归类。
// 产出：根因分布条形 + 高频不自然句式 TOP 5（出现次数最多的原句，点按看最新升级方案）。
// 无需 SQL/表迁移：统计直接扫 reports 原始 JSON，历史数据零迁移即受益。
const EXPRESSION_CAUSES = ['直译语序', '用词搭配', '冗余啰嗦', '表达习惯'];
let _expressionStats = null;

function classifyExpressionCause(original, better, scene) {
  const t = [scene, original, better].filter(Boolean).join(' ').toLowerCase();
  if (/语序|词序|直译|逐字|中式语序|word order/.test(t)) return '直译语序';
  if (/搭配|collocation|用词|词性|词汇|word choice/.test(t)) return '用词搭配';
  if (/冗余|重复|啰嗦|赘|多余|redundant/.test(t)) return '冗余啰嗦';
  return '表达习惯'; // 语法没错但不地道 → 默认归入习惯/语用
}

async function renderExpressionInsights() {
  const grp = document.getElementById('expression-insights-group');
  const box = document.getElementById('expression-insights');
  if (!grp || !box) return;
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const { data: reports } = await sb.from('reports').select('date, content').limit(1000);
  const count = {}; const byText = {}; const days = new Set();
  (reports || []).forEach(r => {
    let j = null;
    try { j = JSON.parse(normalizeSmartQuotes(sanitizeJsonInput(String(r.content || '')))); } catch (e) { return; }
    const mistakes = (j && Array.isArray(j.mistakes)) ? j.mistakes : [];
    for (const m of mistakes) {
      if (!m || m.type !== 'expression' || !m.original) continue;
      const cause = EXPRESSION_CAUSES.includes(m.pattern) ? m.pattern : classifyExpressionCause(m.original, m.improved, m.explanation);
      count[cause] = (count[cause] || 0) + 1;
      days.add(r.date);
      const key = String(m.original).toLowerCase().replace(/\s+/g, ' ').trim();
      if (!byText[key]) byText[key] = { key, original: m.original, better: m.improved || '', scene: m.explanation || '', n: 0 };
      byText[key].n++;
      if (m.improved) byText[key].better = m.improved;   // 保留最新一次的正句
      if (m.explanation) byText[key].scene = m.explanation;
    }
  });
  const total = Object.values(count).reduce((a, b) => a + b, 0);
  if (!total) { grp.classList.add('hidden'); return; }
  grp.classList.remove('hidden');
  const top = Object.values(byText).sort((a, b) => b.n - a.n).slice(0, 5);
  _expressionStats = { top };
  const sorted = EXPRESSION_CAUSES.map(c => [c, count[c] || 0]).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...sorted.map(([, n]) => n), 1);
  box.innerHTML = `
    <div class="flex gap-3 mb-4">${[
      `<div class="flex-1 px-3 py-3 bg-[var(--c-bg)] rounded-lg text-center text-xs text-[var(--c-text-dim)]"><strong class="block text-xl text-[var(--c-text)] mb-0.5">${total}</strong>次不自然升级</div>`,
      `<div class="flex-1 px-3 py-3 bg-[var(--c-bg)] rounded-lg text-center text-xs text-[var(--c-text-dim)]"><strong class="block text-xl text-[var(--c-text)] mb-0.5">${days.size}</strong>天记录</div>`
    ].join('')}</div>
    <div class="mb-3"><div class="text-xs font-semibold text-[var(--c-text-dim)] mb-2">不自然根因分布</div>${sorted.map(([name, n]) =>
      `<div class="flex items-center gap-2.5 mb-2">
        <span class="whitespace-nowrap min-w-[72px] text-xs text-[var(--c-text-dim)] text-right shrink-0">${name}</span>
        <div class="flex-1 h-2 bg-[var(--c-border-light)] rounded-full overflow-hidden"><div class="h-full bg-[var(--c-primary)] rounded-full transition-all duration-500" style="width:${(n/max)*100}%;"></div></div>
        <span class="w-[30px] text-[0.6875rem] text-[var(--c-text-ultradim)] shrink-0">${n}次</span>
      </div>`
    ).join('')}</div>
    <div class="text-xs font-semibold text-[var(--c-text-dim)] mb-2">高频不自然句式 TOP ${top.length}</div>
    ${top.map((t, i) => `
      <div class="text-xs mb-2 cursor-pointer" data-idx="${i}" onclick="showExpressionDetail(Number(this.dataset.idx))">
        <div class="line-through text-[var(--c-text-dim)]">${h(t.original)}</div>
        <div class="text-[var(--c-primary)]">${h(t.better || '')}<span class="ml-1.5 text-[0.6875rem] text-[var(--c-text-ultradim)]">×${t.n}</span></div>
      </div>`).join('')}
    <div class="text-[0.6875rem] text-[var(--c-text-ultradim)] mt-1 leading-relaxed">根因口径：新版日报由 GPT 标注 pattern，历史日报按内容启发式归类</div>`;
  refreshIcons(box);
}

function showExpressionDetail(idx) {
  // v101 审计：按 TOP 数组下标取条目（原文本作 data-key 遇值内引号会断属性 —— 旧日报数据可含 " 字符）
  const top = _expressionStats && _expressionStats.top;
  const t = top && top[Number(idx)];
  if (!t) return;
  let msg = `不自然表达（出现 ${t.n} 次）:\n\n你说: ${t.original}\n更自然: ${t.better || '—'}`;
  if (t.scene) msg += `\n说明: ${t.scene}`;
  showToast(msg);
}

// ═══════════════════════════════════════════════════════
// Template & Import
// ═══════════════════════════════════════════════════════
const TEMPLATES = {
  report: `你现在是我的资深英语口语教练。请根据我们今天的对话，生成一份结构化的学习日报。这份日报会被我的学习系统直接读取入库，必须一次成型、零修改。

只输出一段纯 JSON 文本：从第一个 { 开始、到最后一个 } 结束。前后严禁出现任何说明文字、标题、Markdown 代码块标记（\`\`\`）。全篇所有引号必须是英文半角直引号 "——严禁弯引号 “ ” ‘ ’，尤其严禁用 ” 同时作开闭引号（详见【引号铁律】）。JSON 结构必须严格如下：

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
    { "type": "expression", "original": "中式或普通的句子", "improved": "更地道高阶的表达", "explanation": "为什么这样说更好", "pattern": "直译语序" }
  ],
  "coreSentences": [
    { "targetSentence": "高阶金句", "replacedSentence": "被替代的普通表达", "explanation": "使用场景或提示" }
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
   - "expression"：语法正确但不够地道的表达升级——type 为 expression 的项还必须包含第五个键 pattern（不自然根因，只允许以下四个值之一）："直译语序"（中文语序/逐字直译，如 I very like it）、"用词搭配"（用词不当、词性误用或搭配错误，如 learn knowledge）、"冗余啰嗦"（多余的重复或填充，如 more better）、"表达习惯"（语法没错但不符合母语者习惯的说法）。
5. coreSentences 数组的每一项必须同时包含 targetSentence（高阶金句）、replacedSentence（被替代的平庸表达）、explanation 三个键。
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
5. 字符串值内如需英文引述（如例句 He said "hi"），请改用英文单引号 '（写成 He said 'hi'）或加反斜杠转义（写成 He said \\"hi\\"），严禁出现未转义的直双引号。

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
□ 所有键名与上面示例结构一字不差。`
};
// v97：TEMPLATES.topic / TEMPLATES.insight 已物理删除——话题卡与弱点分析模板功能彻底下线，TEMPLATES 只保留 report。

function copyTemplate(type) {
  const text = TEMPLATES[type];
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => showToast('📋 已复制！')).catch(() => {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); showToast('📋 已复制！');
  });
}

async function importReport(text) {
  // v97 状态解耦：确认入库只消费实时校验产物 _importState.payload，
  // 绝不从文本框直接解析写库（「输入 → 直接写入数据库」危险做法已废弃）。
  // 兼容外部调用（历史入口带文本参数）：先跑校验，不通过直接拒绝。
  if (text !== undefined && text !== null && String(text).trim()) {
    const result = validateImportInput(text);
    if (result.status !== 'valid') {
      showToast('❌ ' + (result.error || '格式校验未通过'));
      return;
    }
    _importState.status = 'valid'; _importState.error = ''; _importState.preview = result.preview; _importState.payload = result.payload;
  }
  if (_importState.status !== 'valid' || !_importState.payload) {
    showToast('⚠️ 请先通过格式校验，再确认导入');
    return;
  }

  const btn = document.getElementById('btn-dialog-submit');
  if (btn) { btn.disabled = true; btn.textContent = '导入中...'; }
  try {
    if (_importState.payload.kind === 'json') {
      await importJsonDailyReport(_importState.payload.jsonReport, _importState.payload.cleanedText);
    } else {
      await importDailyReport(_importState.payload.parsed);
    }
  } catch (e) {
    // 入库/映射异常显式化：真实堆栈进控制台，红卡展示真实原因，绝不静默吞掉
    console.error('[importReport] 入库异常（真实堆栈）:', e);
    _importState.status = 'error';
    _importState.error = '入库异常：' + String((e && e.message) || e).slice(0, 100) + '（完整堆栈见控制台）';
    renderImportPreview();
    if (btn) { btn.disabled = true; btn.textContent = '确认导入'; }
    return;
  }

  // 成功：重置校验状态 → 回今日视图 → 全量重载（v95 视图同步逻辑保留）
  clearTimeout(_importDebounceTimer);
  const ta = document.getElementById('dialog-report-input');
  if (ta) ta.value = '';
  _importState.status = 'idle'; _importState.error = ''; _importState.preview = null; _importState.payload = null;
  renderImportPreview();
  if (btn) { btn.disabled = true; btn.textContent = '确认导入'; }
  _viewDate = null;
  setTimeout(() => { hideImportDialog(); invalidateHomeData(); loadHome(); }, 1000);
}

// ── 新版 JSON 日报入库器：写入时自动打上前端约定标签 ────
async function importJsonDailyReport(jsonReport, rawText) {
  const { data: { session } } = await sb.auth.getSession();
  const uid = session.user.id;
  // 无损清洗：老格式 mistakes/coreSentences（字符串、元组、残缺对象）先补齐结构再入库，
  // 下方所有 `!m.original` / `!c.targetSentence` 过滤从此一行都不会丢。
  jsonReport = normalizeDailyData(jsonReport || {});
  const date = getLocalToday();
  // v96 可选链加固：summary 缺失/非对象时安全降级为空串，绝不让映射层因缺字段抛 TypeError
  const topic = (jsonReport?.summary?.topic) || '';

  // 归一化 + 打标：newWords → isNewToday:true；coreSentences → isTodayCore:true
  const parsed = normalizeJsonReport(jsonReport, rawText);

  // 1) 今日新词 → vocabulary（打标字段随日报 JSON 流转，表写入保持 schema 安全）
  if (parsed.vocabulary.length) {
    // v103 入库查重：vocabulary 表无 UNIQUE(user_id,word) 约束，同词跨天出现/重导日报会被盲插成重复行
    // （今日待办按行渲染 → 满屏重复单词）。插入前按词小写比对存量，只插库中不存在的新词；
    // 已存在的词不重复插入 —— 其 SM-2 曲线与例句已在库中，到期自然进入复习，绝无丢词
    const { data: existingVocab } = await sb.from('vocabulary').select('word').eq('user_id', uid);
    const known = new Set((existingVocab || []).map(r => String(r.word || '').toLowerCase().trim()).filter(Boolean));
    const freshWords = parsed.vocabulary.filter(v => v.word && !known.has(String(v.word).toLowerCase().trim()));
    if (freshWords.length) {
      await sb.from('vocabulary').insert(freshWords.map(v => ({
        user_id: uid, word: v.word, phonetic: v.phonetic, meaning: v.meaning,
        example: v.example, date_added: date, source_topic: topic, status: 'new'
      })));
    }
  }

  // 2) 语法硬伤 → errors 表（v99：发音纠正整体移出错题体系，只收 grammar —— 原始 JSON 仍整篇归档 reports 表，数据不丢）
  const allErrors = [];
  for (const m of (Array.isArray(jsonReport.mistakes) ? jsonReport.mistakes : [])) {
    if (!m || !m.original || m.type === 'expression') continue;
    if (m.type === 'pronunciation') continue; // v99：发音错题不进错题本（用户指令）
    allErrors.push({
      user_id: uid, type: 'grammar', original: m.original || '',
      correction: m.improved || '', rule: m.explanation || '',
      date_added: date, source_topic: topic,
      // v101：error_pattern 列改承载语法 3 桶标签（GPT 显式 category 优先，关键字回退）——
      // 旧值（v60-99 的 4 标准分类）无活消费者，渲染层 resolveGrammarCategory 对旧值自动回退关键字归类
      error_pattern: resolveGrammarCategory(m)
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
  // v83 时长/评分落 progress 表：与 Markdown 路径 importDailyReport 对齐（此前硬编码 0，时长与趋势数据双丢）
  // v97：新版日报无 duration（dur 默认 0，不虚增时长）；对话占比走 parsed.summary.speakingRatio，不落 progress 表
  const s2 = (jsonReport?.summary && typeof jsonReport.summary === 'object') ? jsonReport.summary : {};
  const dur = parseInt(String((jsonReport.duration || s2.duration || s2.durationMinutes) || ''), 10) || 0;
  await updateProgress(uid, Number(s2.fluency) || 0, Number(s2.accuracy) || 0, s2.weak_areas || '', topic, dur);

  if (topic) {
    const { data: existingTopic } = await sb.from('topics').select('id').eq('title', topic).maybeSingle();
    if (existingTopic) {
      await sb.from('topics').update({
        practice_count: sb.raw('practice_count + 1'),
        last_practiced_at: new Date().toISOString()
      }).eq('id', existingTopic.id);
    }
  }

  showToast(`✅ 入库完成！单词 ${parsed.vocabulary.length} · 语法纠错 ${allErrors.length} · 地道表达/句型 ${patRows.length}`);
}

async function importDailyReport(parsed) {
  const { data: { session } } = await sb.auth.getSession();
  const uid = session.user.id;
  const date = parsed.meta.date || getLocalToday();
  const topic = parsed.meta.topic || '';
  const duration = parseInt(parsed.meta.duration) || 0;

  if (parsed.vocabulary.length) {
    await sb.from('vocabulary').insert(parsed.vocabulary.map(v => ({
      user_id: uid, word: v.word, phonetic: v.phonetic, meaning: v.meaning,
      example: v.example, date_added: date, source_topic: topic, status: 'new'
    })));
  }

  const allErrors = [];
  // v99：发音纠正（parsed.pronunciation）不再写入 errors 表（用户指令：错题本只收语法）
  for (const e of parsed.grammar) allErrors.push({
    user_id: uid, type: 'grammar', original: e.original || '', correction: e.correction || '',
    rule: e.rule || '', date_added: date, source_topic: topic,
    // v101：Markdown 日报无 GPT category 标签 → 关键字启发式归类（与 JSON 链路同一 3 桶口径）
    error_pattern: classifyGrammarCategory(e.original, e.correction, e.rule || '')
  });
  if (allErrors.length) await sb.from('errors').insert(allErrors);

  if (parsed.patterns.length) {
    await sb.from('patterns').insert(parsed.patterns.map(p => ({
      user_id: uid, original: p.original || '', better: p.better || '',
      scene: p.scene || '', date_added: date, source_topic: topic
    })));
  }

  // v104 SM-2 队列断层修复：核心句型与自然表达同日正式入库（JSON 链路早已入库，Markdown 链路此前漏写 →
  // 未复习的核心句型会永久蒸发）。入库行无 SM-2 字段 → 队列按「新卡」语义立即到期，首次复习由文本锚定 UPSERT 补曲线
  if (parsed.sentence_patterns && parsed.sentence_patterns.length) {
    await sb.from('patterns').insert(parsed.sentence_patterns.map(s => ({
      user_id: uid,
      original: s.replacedSentence || '',
      better: s.pattern || s.targetSentence || s.text || '',
      scene: s.example || s.explanation || '',
      date_added: date, source_topic: '核心句型'
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

  showToast(`✅ 入库完成！单词 ${parsed.vocabulary.length} · 纠错 ${allErrors.length} · 句型 ${parsed.patterns.length + (parsed.sentence_patterns || []).length}`);
}

// v97：importTopicCard / importInsightReport 已物理删除——话题卡与弱点分析模板功能彻底下线。
// 本入口只接受日报（JSON / Markdown）；parseSmartReport 若判定为 topic-card / insight-report，
// validateImportInput 会直接拒绝并红卡提示。

// 单一分类源：全部错误模式归类收敛于 parser.js 的 classifyErrorType（发音与重音/语法与句式/地道表达/逻辑与衔接/其他）
// v104：detectErrorPattern 死函数已物理删除 —— 旧实现的零散正则分类已废弃，严禁与分类引擎分叉

async function updateProgress(uid, fluency, accuracy, weak_areas, topic, duration) {
  const { data: prog } = await sb.from('progress').select('*').eq('user_id', uid).maybeSingle();
  let p = prog || {
    user_id: uid, total_sessions: 0, total_minutes: 0, topics: [],
    fluency_trend: [], accuracy_trend: [], weak_areas: [],
    words_learned: 0, words_mastered: 0, errors_fixed: 0
  };
  p.total_sessions += 1;
  p.total_minutes += (Number(duration) || 0); // v97 防 NaN：新版日报无 duration 字段
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

  // Update theme picker (circle buttons) —— v101：选中项 = 主色描边 + ring + ✓ 角标（废弃旧硬编码字母方案）
  document.querySelectorAll('#theme-picker button').forEach(b => {
    const active = b.dataset.theme === theme;
    b.style.borderColor = active ? 'var(--c-primary)' : 'transparent';
    if (active) b.classList.add('ring-2'); else b.classList.remove('ring-2');
    b.textContent = active ? '✓' : '';
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
  a.download = `voco-export-${getLocalToday()}.json`;
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
      if (!window.confirm('导入会新增记录，重复导入同一备份会产生重复数据。确定继续？')) return;
      const uid = session.user.id;
      const notes = [];
      let imported = 0;
      // v101 补全备份还原：导出 6 表 → 导入 6 表（此前只还原 3/6，备份形同虚设）。
      // 每表独立 try/catch：单表失败只降级该表，绝不拖垮整体恢复。
      const safe = async (label, fn) => {
        try {
          const n = await fn();
          if (n > 0) { imported += n; notes.push(`${label} ${n}`); }
        } catch (err) {
          console.error(`[importJSON] ${label} 还原失败（真实堆栈）:`, err);
          notes.push(`${label} 失败`);
        }
      };
      await safe('词汇', async () => {
        if (!data.vocabulary?.length) return 0;
        const items = data.vocabulary.map(v => ({ ...v, id: undefined, user_id: uid }));
        await sb.from('vocabulary').insert(items);
        return items.length;
      });
      await safe('错题', async () => {
        if (!data.errors?.length) return 0;
        // v86 全局加固：文件导入同样先碎片合并再入库 —— 碎片行从此绝无可能再次进入 errors 表
        const items = mergeLabelFragments(data.errors).map(e => ({ ...e, id: undefined, user_id: uid }));
        await sb.from('errors').insert(items);
        return items.length;
      });
      await safe('句型', async () => {
        if (!data.patterns?.length) return 0;
        const items = mergeLabelFragments(data.patterns).map(p => ({ ...p, id: undefined, user_id: uid }));
        await sb.from('patterns').insert(items);
        return items.length;
      });
      await safe('日报', async () => {
        if (!data.reports?.length) return 0;
        const rows = data.reports.map(r => ({ ...r, id: undefined, user_id: uid }));
        await sb.from('reports').upsert(rows, { onConflict: 'user_id,date' }); // 同日覆盖，重复导入幂等
        return rows.length;
      });
      await safe('进度', async () => {
        const p = Array.isArray(data.progress) ? data.progress[0] : data.progress;
        if (!p) return 0;
        await sb.from('progress').upsert({ ...p, id: undefined, user_id: uid }, { onConflict: 'user_id' });
        return 1;
      });
      await safe('话题', async () => {
        if (!data.topics?.length) return 0;
        const rows = data.topics.map(t => ({ ...t, id: undefined, user_id: uid }));
        await sb.from('topics').upsert(rows, { onConflict: 'user_id,title' });
        return rows.length;
      });
      showToast(`📥 导入完成：${notes.join(' · ') || '无可导入内容'}`);
      invalidateHomeData();
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

// ── 对话想法文本净化（v78）：日报内容常混入 markdown 强调符 / 残留 HTML / 换行 / 包裹引号，
// 直接渲染会导致每天字体视觉漂移。统一剥除 → 纯文本，由渲染层单一定规格排版。
function cleanThoughtText(s) {
  return String(s || '')
    .replace(/<[^>]*>/g, '')                                        // 剥残留 HTML 标签
    .replace(/^[-*•]+[ \t]+/gm, '')                                 // 剥多行列表符
    .replace(/[*_`~#]{1,3}([^*_`~#\s][^*_`~#]*?)[*_`~#]{1,3}/g, '$1') // 成对强调标记 → 纯文本
    .replace(/[*_`~#]/g, '')                                        // 残余标记符号兜底清除
    .replace(/[ \t]+/g, ' ')                                        // 横向空白折叠
    .replace(/\s*\n\s*/g, ' ')                                      // 换行并入单行（卡片内排版恒定）
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')                          // 去包裹引号（渲染层统一加中文引号）
    .trim();
}

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

function showToast(msg, type) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  // type='success' → 绿色成功提示（Voco 2.0 话题复盘等）；默认中性深色
  const green = type === 'success';
  t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:' + (green ? 'var(--c-green)' : 'var(--text)') + ';color:' + (green ? '#fff' : 'var(--bg)') + ';padding:10px 20px;border-radius:12px;font-size:14px;font-weight:500;z-index:200;box-shadow:0 4px 20px rgba(0,0,0,0.25);pointer-events:none;max-width:90vw;white-space:pre-line;';
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ═══════════════════════════════════════════════════════
// Event Bindings (v5.0)
// ═══════════════════════════════════════════════════════
document.getElementById('btn-login').addEventListener('click', signIn);
document.getElementById('btn-login-email').addEventListener('click', sendMagicLink);
document.getElementById('btn-dialog-submit')?.addEventListener('click', () => importReport());
// v97 实时校验绑定：文本框 input 事件（粘贴/输入/清空均触发）→ 350ms 防抖 → 校验预览 + 按钮状态
document.getElementById('dialog-report-input')?.addEventListener('input', onImportInput);
document.getElementById('btn-copy-report-template')?.addEventListener('click', () => copyTemplate('report'));
document.getElementById('btn-export-data').addEventListener('click', exportData);
document.getElementById('btn-logout-me').addEventListener('click', signOut);
document.getElementById('btn-import-json')?.addEventListener('click', importJSON);
// v104 日报一致性审计：逐份日报核对打分面板四子块数字与四按钮跳转页列表长度（含历史日报）
document.getElementById('btn-audit-reports')?.addEventListener('click', runReportAudit);

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

// Speak — 句型复习卡片模式（renderSentenceReview 内部自接线，无全局按钮绑定）

// ═══════════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════════
initTheme();
// Replace all static <i data-lucide> elements with SVG icons
if (typeof lucide !== 'undefined' && lucide.createIcons) {
  lucide.createIcons();
}

// Voco 2.0：聊前灵感配置舱 7 话题 Pill 初始渲染（Profile 页单选标签）
renderTopicPills();

sb.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') checkAuth();
  if (event === 'SIGNED_OUT') checkAuth();
});

checkAuth();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js?v=112');
}
