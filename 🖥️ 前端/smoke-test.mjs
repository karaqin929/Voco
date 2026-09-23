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
  location: { origin: 'https://smoke.local', pathname: '/', search: '', href: 'https://smoke.local/' },
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

// —— navigator / 其他 ——
Object.defineProperty(globalThis, 'navigator', { value: { serviceWorker: { register() { return Promise.resolve(); } }, userAgent: 'node-smoke' }, configurable: true });
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
