#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════
// Voco 渲染冒烟测试 —— 发布强制门槛（2026-09-23 用户指令「建并设为强制门槛」）
//
// 原理：把 parser.js + app.js 搬进 Node（最小 DOM/浏览器环境桩 + 假数据），
//       真正「执行」渲染管线（loadHome → renderHomeSections 全家 + 双卡组 + 历史日链路）。
//       任何运行时契约错误（如 v127 的 getDueQueueForToday().list.length TypeError）
//       在 push 前即被拦截 —— node --check 只能查语法，本测试执行代码。
//
// 用法：node smoke-test.mjs
//       退出码 0 = 全部场景通过（允许发布）；1 = 有场景失败 / 顶层加载异常（禁止发布）。
// 边界：只管「代码执行不炸 + 关键输出存在」；视觉/像素/文案审美问题不在本门之列。
// ═══════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const parserSrc = fs.readFileSync(path.join(HERE, 'parser.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(HERE, 'app.js'), 'utf8');

// ═══════════════════════════════════════════════════════════════
// 浏览器环境桩（仅存在于本 Node 进程，绝不改动 app.js）
// ═══════════════════════════════════════════════════════════════

// —— 假 DOM 元素：innerHTML/textContent/style/dataset/classList（带状态跟踪，供断言折叠/显隐）——
const _classState = new WeakMap();
function _fakeClassList(el) {
  const get = () => _classState.get(el) || new Set();
  return {
    add(...cs) { const s = get(); cs.forEach(c => s.add(c)); _classState.set(el, s); },
    remove(...cs) { const s = get(); cs.forEach(c => s.delete(c)); _classState.set(el, s); },
    toggle(c, force) {
      const s = get();
      const on = force !== undefined ? !!force : !s.has(c);
      if (on) s.add(c); else s.delete(c);
      _classState.set(el, s);
      return on;
    },
    contains(c) { return get().has(c); },
    length: 0,
  };
}
function _fakeEl(tag, id) {
  const el = {
    id: id || '',
    tagName: String(tag || 'div').toUpperCase(),
    innerHTML: '', textContent: '', value: '', style: {}, dataset: {}, className: '',
    disabled: false, checked: false,
    appendChild() {}, removeChild() {}, insertAdjacentHTML() {}, remove() {},
    setAttribute() {}, getAttribute() { return null; },
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    closest() { return null; }, contains() { return false; },
    scrollTo() {}, scrollIntoView() {}, focus() {}, click() {},
  };
  el.classList = _fakeClassList(el);
  return el;
}
const _byId = new Map();
globalThis.document = {
  getElementById(id) {
    if (!_byId.has(id)) _byId.set(id, _fakeEl('div', id));
    return _byId.get(id);
  },
  querySelector() { return _fakeEl('div'); },
  querySelectorAll() { return []; },
  createElement(tag) { return _fakeEl(tag); },
  addEventListener() {}, removeEventListener() {},
  body: _fakeEl('body', 'body'),
  documentElement: _fakeEl('html', 'html'),
  head: _fakeEl('head', 'head'),
  title: '', hidden: false,
};

// —— window / location / history ——
globalThis.window = {
  location: { origin: 'https://smoke.local', pathname: '/', search: '', href: 'https://smoke.local/', reload() {} },
  history: { pushState() {}, replaceState() {}, back() {}, forward() {} },
  addEventListener() {}, removeEventListener() {},
  matchMedia() { return { matches: false, addEventListener() {}, addListener() {}, removeListener() {} }; },
  innerWidth: 390, innerHeight: 844,
  scrollTo() {},
};
globalThis.location = globalThis.window.location;
globalThis.history = globalThis.window.history;
globalThis.self = globalThis;
globalThis.top = globalThis;

// —— localStorage（内存版，含 getItem/setItem/removeItem/clear/key/length）——
const _store = new Map();
globalThis.localStorage = {
  getItem(k) { return _store.has(k) ? _store.get(k) : null; },
  setItem(k, v) { _store.set(String(k), String(v)); },
  removeItem(k) { _store.delete(k); },
  clear() { _store.clear(); },
  key(i) { const ks = [..._store.keys()]; return i >= 0 && i < ks.length ? ks[i] : null; },
  get length() { return _store.size; },
};

// —— sessionStorage（v128 版本收敛用；独立内存 Map）——
const _sessionStore = new Map();
globalThis.sessionStorage = {
  getItem(k) { return _sessionStore.has(k) ? _sessionStore.get(k) : null; },
  setItem(k, v) { _sessionStore.set(String(k), String(v)); },
  removeItem(k) { _sessionStore.delete(k); },
  clear() { _sessionStore.clear(); },
};

// —— navigator / 其他 ——
Object.defineProperty(globalThis, 'navigator', { value: { serviceWorker: { register() { return Promise.resolve(); }, addEventListener() {} }, userAgent: 'node-smoke' }, configurable: true });
globalThis.fetch = async () => { throw new Error('[smoke] 网络被禁用——渲染路径不应发起 fetch'); };
globalThis.Chart = class { constructor() {} destroy() {} update() {} };
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {}, removeListener() {} });
globalThis.getComputedStyle = () => ({ getPropertyValue() { return ''; } });
globalThis.requestAnimationFrame = (fn) => {
  setTimeout(() => { try { fn(0); } catch (e) { console.error('[smoke] requestAnimationFrame 回调异常:', e); process.exitCode = 1; } }, 0);
  return 0;
};
globalThis.cancelAnimationFrame = () => {};
globalThis.confirm = () => true;
globalThis.alert = () => {};
globalThis.Event = class { constructor(t) { this.type = t; } };
globalThis.CustomEvent = class extends globalThis.Event { constructor(t, o) { super(t); Object.assign(this, o || {}); } };

// —— Supabase 客户端桩（sb）：loadHome 快照路径不触网；兜底查询全部返回空数据 ——
function _sbQuery() {
  return {
    select() { return this; }, order() { return this; }, limit() { return this; },
    eq() { return this; }, ilike() { return this; }, maybeSingle() { return this; }, single() { return this; },
    insert() { return this; }, update() { return this; }, upsert() { return this; },
    then(resolve) { resolve({ data: [], error: null }); },
  };
}
globalThis.sb = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
    signInWithOAuth: async () => ({}),
    signInWithOtp: async () => ({ error: null }),
    signOut: async () => ({}),
  },
  from() { return _sbQuery(); },
};

process.on('unhandledRejection', (e) => {
  console.error('[smoke] ⚠️ 未处理的 Promise 拒绝（发布禁止）:', e);
  process.exitCode = 1;
});

// ═══════════════════════════════════════════════════════════════
// 测试代码：与 parser.js / app.js 拼接进同一作用域后执行（可访问其全部顶层变量与函数）
// ═══════════════════════════════════════════════════════════════
function _testEpilogue() {
  const today = getLocalToday();
  const el = (id) => document.getElementById(id);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const results = [];

  async function scenario(name, fn) {
    try {
      await fn();
      results.push({ name, ok: true });
      console.log('[smoke] ✅ ' + name);
    } catch (e) {
      results.push({ name, ok: false, e });
      console.error('[smoke] ❌ ' + name + '\n    ' + String((e && e.stack) || e));
    }
  }
  function assert(cond, msg) { if (!cond) throw new Error('断言失败：' + msg); }

  function reset() {
    localStorage.clear();
    _reportContentFetched.clear();
    _parsedReportDateCache.clear();
    _dateScoreCache = {};
    _viewDate = null; _historyParsed = null; _ctxDate = null; _pendingViewDate = undefined;
    _homeLoading = false; _dataFresh = false; _uid = null;
    _vocabRaw = []; _errorsRaw = []; _patternsRaw = [];
    _wordsAll = []; _errorsAll = []; _patternLibrary = []; _reportsCache = [];
    _reportParsed = null;
    _reviewedVocabTodayIds = new Set();
    _reviewedErrorIds.clear();
    _dueDeck = []; _dueIdx = 0; _dueRevealed = false;
    _srsQueue = []; _srsIdx = 0;
  }

  // —— 假数据工厂（形状与真实 DB 行 / 日报模板一致）——
  const reportJSON = (over = {}) => JSON.stringify({
    speakingRatio: { user: 60, ai: 40 },
    summary: {
      topic: '健身',
      dailyThought: { en: 'Use past tense for finished actions.', zh: '今天最该改进的是过去时态的使用。' },
      strengths: ['词汇丰富'],
      nextSteps: ['注意过去时态'],
      fluency: 7.5, accuracy: 7, naturalness: 6.5, vocabulary: 7,
      weak_areas: '时态',
    },
    mistakes: [
      { type: 'grammar', original: 'I go to school yesterday.', improved: 'I went to school yesterday.', explanation: '过去时间用一般过去时', category: '动词与时态' },
    ],
    coreSentences: [
      { targetSentence: 'It slipped my mind.', replacedSentence: 'I forgot it.', explanation: '地道结构：slip one’s mind' },
    ],
    newWords: [
      { word: 'serendipity', phonetic: '/ˌserənˈdɪpəti/', meaning: '意外发现美好事物的能力', example: 'Meeting her was pure serendipity.' },
    ],
    coach_insights: {
      vocabulary: '描述抽象概念时词汇受限。', grammar: '从句时态和介词搭配出错。',
      expression: '中式直译明显。', core_patterns: '适合职场深度探讨。',
    },
    ...over,
  });
  const reportRow = (date, over = {}) => ({ id: 101, user_id: 'u', date, content: reportJSON(), ...over });
  const wordRow = (over = {}) => ({
    id: 1, word: 'stamina', phonetic: '/ˈstæmɪnə/', meaning: '耐力，持久力',
    example: 'You need stamina to run a marathon.',
    date_added: today + 'T08:00:00', needsReview: true, next_review_date: today,
    ease_factor: 2.5, sm2_interval: 0, sm2_repetitions: 0, status: 'learning', mastered: false, ...over,
  });
  const errorRow = (over = {}) => ({
    id: 1, original: 'I go to school yesterday.', correction: 'I went to school yesterday.',
    rule: '过去时间用一般过去时', type: 'grammar', date: today, ...over,
  });
  const patternRow = (over = {}) => ({
    id: 1, better: 'It slipped my mind.', original: '',
    explanation: '地道结构：slip one’s mind（某人一时想不起来）', isTodayCore: false, ...over,
  });

  (async () => {
    if (typeof loadHome !== 'function' || typeof renderHomeSections !== 'function' || typeof getDueQueueForToday !== 'function') {
      throw new Error('app.js 未正确加载（核心渲染函数缺失）');
    }

    // ── S1 v127 回归守门：完整数据走 loadHome 快照路径 —— 渲染全链路 + _homeLoading 必须复位 ──
    await scenario('S1 首页全链路（v127 回归守门）', async () => {
      reset();
      _vocabRaw = [wordRow()];
      _errorsRaw = [errorRow()];
      _patternsRaw = [patternRow()];
      _reportsCache = [reportRow(today)];
      _dataFresh = true;
      await loadHome();
      assert(_homeLoading === false, '_homeLoading 必须复位（v127 事故形态：渲染异常卡死点击排队）');
      assert(el('home-quests').innerHTML.includes('打卡'), '待办列表未渲染');
      assert(el('home-metrics').innerHTML.length > 0, '打分面板未渲染');
      assert(el('home-insights').innerHTML.length > 0, '洞察区未渲染');
      assert(el('greeting-text').textContent.length > 0, '问候语未渲染');
      assert(el('home-quote').innerHTML.length > 0, '打卡卡（熊条）未渲染');
      assert(el('home-history-banner').innerHTML.length > 0 || el('home-history-banner').className === 'hidden', '历史横幅区块异常');
      assert(Array.isArray(getDueQueueForToday()), 'getDueQueueForToday 契约：必须返回卡组数组（v127 事故根因）');
    });

    // ── S2 全 0 完美假报告（对齐应用内审计模块五）：空态渲染不抛异常 ──
    await scenario('S2 全 0 完美假报告空态', async () => {
      reset();
      _reportParsed = {
        meta: { date: today, topic: '', duration: 0 },
        summary: { topic: '', dailyThought: { en: '', zh: '' }, strengths: [], nextSteps: [], fluency: 0, accuracy: 0, naturalness: 0, vocabulary: 0, weak_areas: '' },
        mistakes: [], coreSentences: [], newWords: [], vocabulary: [], grammar: [], patterns: [], sentence_patterns: [], coach_insights: null,
      };
      renderHomeSections();
      const m = el('home-metrics').innerHTML;
      assert(m.includes('--') || m.includes('/100'), '打分面板空态占位缺失: ' + m.slice(0, 80));
      assert(el('home-quests').innerHTML.includes('打卡'), '待办列表未渲染');
    });

    // ── S3 无日报空态：Hero 引导卡可见、指标区折叠、待办常驻 ──
    await scenario('S3 无日报空态（Hero 折叠联动）', async () => {
      reset();
      _reportsCache = [];
      _dataFresh = true;
      await loadHome();
      assert(el('home-empty-hero').classList.contains('hidden') === false, 'Hero 引导卡应可见');
      assert(el('home-metrics').classList.contains('hidden') === true, '指标区应折叠');
      assert(el('home-quests').innerHTML.includes('打卡'), '待办列表应常驻渲染');
    });

    // ── S4 单词+错题混合卡组：快照重建 → 翻面 → 答题出队 → 完成页（含 v127 ② 提示词去重回归）──
    await scenario('S4 单词+错题卡组（快照重建+答题出队）', async () => {
      reset();
      _wordsAll = [wordRow()];
      _errorsAll = [errorRow()];
      localStorage.setItem('voco-due-queue-' + today, JSON.stringify({ list: [{ t: 'w', id: '1' }, { t: 'e', id: 'err-1' }] }));
      renderDueDeck();
      assert(el('words-content').innerHTML.includes('待复习 1/2'), '卡组进度未渲染');
      assert(el('due-card').innerHTML.includes('stamina'), '词卡正面未渲染');
      revealDueAnswer();
      assert(el('due-answer-area').innerHTML.includes('耐力'), '词卡背面释义未渲染');
      await rateDueCard('good');
      await wait(350);
      assert(_readDueQueueSnapshot().list.length === 1, '快照未出队（应剩 1）');
      assert(el('due-card').innerHTML.includes('I go to school'), '错题卡正面未渲染');
      assert(el('due-card').innerHTML.includes('一般过去时'), '错题卡正面应有提示词');
      revealDueAnswer();
      assert(el('due-answer-area').innerHTML.includes('I went to school'), '错题卡背面正确句未渲染');
      assert(!el('due-answer-area').innerHTML.includes('一般过去时'), '错题卡背面不得重复渲染提示词（v127 修复点）');
      await rateDueCard('good');
      await wait(350);
      assert(_readDueQueueSnapshot().list.length === 0, '快照未清空');
      assert(el('words-content').innerHTML.includes('复习完成'), '完成页未渲染');
    });

    // ── S5 句型卡组：快照重建 → 正反面渲染 ──
    await scenario('S5 句型卡组（快照重建+正反面）', async () => {
      reset();
      _patternLibrary = stampPatternTags([patternRow()]);
      localStorage.setItem('voco-speak-queue-' + today, JSON.stringify([{ t: 'pat', id: 1 }]));
      const q = getSpeakQueueForToday();
      assert(q.length === 1, '句型快照重建失败: ' + JSON.stringify(q));
      renderSentenceReview(q, 0);
      assert(el('srs-card-clue').textContent.length > 0, '正面引导行未渲染');
      assert(el('srs-card-back-correct').textContent.includes('It slipped my mind'), '背面地道句未渲染');
    });

    // ── S6 历史日点击链路：熊条点历史日报 → 横幅渲染 → 回到今天 ──
    await scenario('S6 历史日点击链路（熊条）', async () => {
      reset();
      const histDate = '2026-01-05';
      _reportsCache = [reportRow(today), reportRow(histDate, { id: 102 })];
      _dataFresh = true;
      await showBearDay(histDate, true);
      assert(_viewDate === histDate, '历史日未选中');
      assert(el('home-history-banner').innerHTML.includes('正在查看'), '历史横幅未渲染');
      await showBearDay(histDate, false);
      goHomeToday();
      assert(_viewDate === null, '回到今天失败');
    });

    // ── S7 双卡组空态 ──
    await scenario('S7 复习双空态', async () => {
      reset();
      renderDueDeck();
      assert(el('words-content').innerHTML.includes('没有待复习的内容'), '词错题空态未渲染');
      renderSentenceReview([], 0);
      assert(el('speak-player').innerHTML.includes('暂无待复习句型'), '句型空态未渲染');
    });

    // ── S8 JSON 日报 mistakes 透传守门（v129 复盘断链修复回归）：parseSmartReport 产物必须含 mistakes 键——
    //    复盘页「语法弱点分布 / 不自然表达根因 / 语法重心建议」唯一数据源；category/pattern 显式标签必须原样存活
    await scenario('S8 JSON 日报 mistakes 透传（复盘分布数据源）', async () => {
      reset();
      const src = JSON.stringify({
        summary: { topic: '旅行', dailyThought: { en: 'x', zh: 'x' }, strengths: [], nextSteps: [], fluency: 6, accuracy: 6, naturalness: 6, vocabulary: 6, weak_areas: '时态' },
        mistakes: [
          { type: 'grammar', original: 'I go yesterday.', improved: 'I went yesterday.', explanation: '过去时间用过去时', category: '动词与时态' },
          { type: 'expression', original: 'I very like it.', improved: 'I really like it.', explanation: '地道副词搭配', pattern: '直译语序' },
        ],
        coreSentences: [], newWords: [],
      });
      const p = parseSmartReport(src);
      assert(Array.isArray(p.mistakes) && p.mistakes.length === 2, 'mistakes 透传缺失（复盘分布数据源断链）');
      assert(p.mistakes[0].category === '动词与时态', 'grammar 项 category 标签丢失');
      assert(p.mistakes[1].pattern === '直译语序', 'expression 项 pattern 标签丢失');
      assert(getDayCounts(p).grammar === 1 && getDayCounts(p).expressions === 1, '四维计数口径异常');
    });

    // ── S9 transcript 精确占比覆盖守门（v129）：模型自报 speakingRatio 25% 必须被 transcript 逐词统计覆盖——
    //    用户侧长文叙述 + 教练短句 → 用户占比显著高于 25%；导入预览与渲染链路同源同值
    await scenario('S9 JSON 日报 transcript 占比覆盖（模型估算值作废）', async () => {
      reset();
      const src = JSON.stringify({
        speakingRatio: 25,
        summary: { topic: '旅行', dailyThought: { en: 'x', zh: 'x' }, strengths: [], nextSteps: [], fluency: 6, accuracy: 6, naturalness: 6, vocabulary: 6, weak_areas: '时态' },
        mistakes: [], coreSentences: [], newWords: [],
        transcript: [
          { role: 'coach', content: 'Tell me about your trip to Bali.' },
          { role: 'user', content: 'I went to the waterfalls in the north and it was absolutely breathtaking, the water was freezing but we swam anyway, and then we did a sunrise hike before the crowds arrived.' },
          { role: 'coach', content: 'Sounds amazing.' },
          { role: 'user', content: 'After that we tried puppy yoga near Ubud, and I spent two hours playing with golden retriever puppies, which was honestly the highlight of the whole week.' },
          { role: 'coach', content: 'Any language struggles along the way?' },
          { role: 'user', content: 'I had to ask for directions twice because I kept forgetting the word for intersection, but the locals were incredibly patient and one of them walked us there.' },
        ],
      });
      const p = parseSmartReport(src);
      const r = p.summary && p.summary.speakingRatio;
      assert(r && typeof r.user === 'number' && typeof r.ai === 'number', 'transcript 占比未生成');
      const pct = Math.round(r.user / (r.user + r.ai) * 100);
      assert(r.user > r.ai, '用户侧词数应大于教练侧（实际 user=' + r.user + ' ai=' + r.ai + '）');
      assert(pct >= 60, '用户占比被模型估算值 25% 绑架（实测 ' + pct + '%）——transcript 覆盖失效');
      const v = validateImportInput(src);
      assert(v.status === 'valid' && v.preview && v.preview.speakingRatio === pct, '导入预览占比未采用 transcript 精确值（预览 ' + (v.preview && v.preview.speakingRatio) + ' vs 精确 ' + pct + '）');
    });

    // ── S10 数组壳兜底守门（v130）：GPT 长输出漏写数组方括号 → 自动补 [ ] 救回导入；
    //    单元素裸值（topic 字符串 / dailyThought 对象等合法单值）绝不误伤；合法 JSON 零改动零报错
    await scenario('S10 JSON 日报数组漏方括号自动补壳（v130 兜底）', async () => {
      reset();
      const src = '{ "speakingRatio": 50, "summary": { "topic": "工作", "dailyThought": { "en": "Use past tense.", "zh": "过去时态。" }, "strengths": "能够主动开启对话", "可以描述复杂感受", "nextSteps": "练习条件句", "fluency": 6, "accuracy": 6, "naturalness": 6, "vocabulary": 6, "weak_areas": "时态" }, "mistakes": { "type": "grammar", "original": "I go yesterday.", "improved": "I went yesterday.", "explanation": "过去时间用过去时", "category": "动词与时态" }, { "type": "expression", "original": "I very like it.", "improved": "I really like it.", "explanation": "地道副词搭配", "pattern": "直译语序" }, "coreSentences": { "targetSentence": "It slipped my mind.", "replacedSentence": "I forgot it.", "explanation": "地道结构" }, "newWords": { "word": "stamina", "phonetic": "/ˈstæmɪnə/", "meaning": "耐力", "example": "You need stamina." }, { "word": "serendipity", "phonetic": "/ˌserənˈdɪpəti/", "meaning": "意外之喜", "example": "It was serendipity." }, "coach_insights": { "vocabulary": "词汇受限", "grammar": "时态出错", "expression": "中式直译", "core_patterns": "职场表达" } }';
      const v = validateImportInput(src);
      assert(v.status === 'valid', '漏方括号日报应被自动补壳救回: ' + v.error);
      assert(v.preview.errorCount === 1 && v.preview.patternCount === 2 && v.preview.wordCount === 2,
        '补壳后预览统计错误: ' + JSON.stringify(v.preview));
      assert(v.preview.speakingRatio === 50, '补壳后 speakingRatio 透传异常');
      const p = parseSmartReport(src);
      assert(Array.isArray(p.mistakes) && p.mistakes.length === 2, '补壳后 mistakes 不是 2 条');
      assert(p.mistakes[0].category === '动词与时态' && p.mistakes[1].pattern === '直译语序', '补壳后错题标签丢失');
      assert(Array.isArray(p.vocabulary) && p.vocabulary.length === 2, '补壳后 newWords 不是 2 条');
      assert(Array.isArray(p.sentence_patterns) && p.sentence_patterns.length === 1, '补壳后 coreSentences 不是 1 条');
      assert(String(p.summary.strengths).includes('能够主动开启对话') && String(p.summary.strengths).includes('可以描述复杂感受'), '补壳后 strengths 元素丢失');
      assert(String(p.summary.next_suggestions).includes('练习条件句'), '补壳后 nextSteps 元素丢失');
      assert(!Array.isArray(p.summary.topic) && p.summary.topic === '工作', '单元素裸字符串值（topic）被误伤成数组');
      assert(p.summary.dailyThought && !Array.isArray(p.summary.dailyThought) && p.summary.dailyThought.zh === '过去时态。', '单元素裸对象值（dailyThought）被误伤');
      const good = reportJSON();
      assert(repairBracketlessArrays(good) === good, '合法 JSON 被兜底改动');
      const g2 = JSON.parse(sanitizeJsonInput(good));
      assert(Array.isArray(g2.summary.strengths) && g2.summary.strengths.length === 1, '合法 JSON 经兜底后结构变化');
      assert(validateImportInput(good).status === 'valid', '合法 JSON 导入被兜底误伤');
    });

    // ── S11 turns 轮次口径占比守门（v135）：模型只数轮次、代码算百分比——
    //    优先级 transcript（旧日报逐词精确）> turns（新模板轮次口径）> speakingRatio（模型自报兜底）> null；
    //    turns 无效（0/负数/缺失/合计为 0/占比越界 1-99）一律拒绝并回退，绝不产出脏占比
    await scenario('S11 JSON 日报 turns 轮次口径占比（代码计算 + 回退链）', async () => {
      reset();
      const base = {
        summary: { topic: '股票推介', dailyThought: { en: 'x', zh: 'x' }, strengths: [], nextSteps: [], fluency: 6, accuracy: 6, naturalness: 6, vocabulary: 6, weak_areas: '时态' },
        mistakes: [], coreSentences: [], newWords: [],
      };
      // ① turns 正常：73/146 → 50/50
      const p1 = parseSmartReport(JSON.stringify({ ...base, turns: { user: 73, coach: 73 } }));
      const r1 = p1.summary && p1.summary.speakingRatio;
      assert(r1 && r1.user === 50 && r1.ai === 50, 'turns 占比应 50/50（实际 ' + JSON.stringify(r1) + '）');
      const v1 = validateImportInput(JSON.stringify({ ...base, turns: { user: 73, coach: 73 } }));
      assert(v1.status === 'valid' && v1.preview.speakingRatio === 50, 'turns 预览占比应为 50（实际 ' + (v1.preview && v1.preview.speakingRatio) + '）');
      // ② turns 与 speakingRatio 并存：turns 优先
      const p2 = parseSmartReport(JSON.stringify({ ...base, turns: { user: 73, coach: 73 }, speakingRatio: 90 }));
      assert(p2.summary.speakingRatio.user === 50, 'turns 必须覆盖模型自报 speakingRatio');
      // ③ turns 全 0（无效）→ 回退 speakingRatio
      const p3 = parseSmartReport(JSON.stringify({ ...base, turns: { user: 0, coach: 0 }, speakingRatio: 60 }));
      assert(p3.summary.speakingRatio && p3.summary.speakingRatio.user === 60 && p3.summary.speakingRatio.pct === true, 'turns 无效应回退 speakingRatio 60');
      // ④ turns 负数 / 缺失 → null 占比（不炸、不产脏数据）
      const p4 = parseSmartReport(JSON.stringify({ ...base, turns: { user: -5, coach: 3 } }));
      assert(!p4.summary.speakingRatio, 'turns 非法应产出 null 占比');
      const p5 = parseSmartReport(JSON.stringify(base));
      assert(!p5.summary.speakingRatio, '无任何占比源应产出 null 占比');
      // ⑤ transcript（旧日报）仍最高优先
      const p6 = parseSmartReport(JSON.stringify({ ...base, turns: { user: 1, coach: 99 }, transcript: [
        { role: 'coach', content: 'hi' },
        { role: 'user', content: 'I traveled to Bali and it was wonderful in every way imaginable.' },
      ] }));
      assert(p6.summary.speakingRatio.user > p6.summary.speakingRatio.ai, '旧日报 transcript 逐词精确仍须最高优先');
    });

    const fails = results.filter((r) => !r.ok);
    console.log('\n[smoke] 场景 ' + (results.length - fails.length) + '/' + results.length + ' 通过');
    if (fails.length) {
      console.error('[smoke] ❌ 冒烟失败——禁止发布（修复后重跑 node smoke-test.mjs）');
      process.exit(1);
    }
    console.log('[smoke] ✅ 全部通过，渲染管线健康，可以发布');
    process.exit(process.exitCode || 0);
  })().catch((e) => {
    console.error('[smoke] ❌ 冒烟测试自身异常:', e);
    process.exit(1);
  });
}

const body = parserSrc + '\n;\n' + appSrc + '\n;\n' + '(' + _testEpilogue.toString() + ')();';
try {
  new Function(body)();
} catch (e) {
  console.error('[smoke] ❌ app.js 顶层加载/执行异常（发布禁止）:', e);
  process.exit(1);
}
