// Voco PWA — Supabase-powered
// Tab switching
document.querySelectorAll('.tab-bar .tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'home') loadHome();
    if (btn.dataset.tab === 'library') loadLibrary('vocab');
    if (btn.dataset.tab === 'settings') loadSettings();
  });
});

document.querySelectorAll('.lib-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.lib-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    _libSub = 'all';
    document.querySelectorAll('.lib-subtab').forEach(b => b.classList.remove('active'));
    const allBtn = document.querySelector('.lib-subtab[data-sub="all"]');
    if (allBtn) allBtn.classList.add('active');
    loadLibrary(btn.dataset.lib);
  });
});

// ─── Auth ────────────────────────────────────────────────
async function checkAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-main').style.display = 'block';
    await loadConfig();
    loadHome();
  } else {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-main').style.display = 'none';
  }
}

async function signIn() {
  await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/',
      queryParams: { prompt: 'select_account' }
    }
  });
}

async function sendMagicLink() {
  const input = document.getElementById('login-email-input');
  const email = input.value.trim();
  const hint = document.getElementById('login-email-hint');
  const btn = document.getElementById('btn-login-email');

  if (!email) { hint.style.display = 'block'; hint.textContent = '请输入邮箱地址'; hint.className = 'login-email-hint error'; return; }

  btn.disabled = true;
  btn.textContent = '发送中...';
  hint.style.display = 'none';

  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + '/' }
  });

  if (error) {
    hint.style.display = 'block';
    hint.textContent = '发送失败: ' + error.message;
    hint.className = 'login-email-hint error';
    btn.disabled = false;
    btn.textContent = '发送登录链接';
  } else {
    hint.style.display = 'block';
    hint.textContent = '✅ 已发送！请查收邮箱 ' + email;
    hint.className = 'login-email-hint success';
    btn.textContent = '已发送';
  }
}

async function signOut() {
  await sb.auth.signOut();
  checkAuth();
}

// ─── Config ──────────────────────────────────────────────
let APP_NAME = 'Voco';

async function loadConfig() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const { data } = await sb.from('user_config').select('*').eq('user_id', session.user.id).maybeSingle();
  if (data) {
    APP_NAME = data.app_name || 'Voco';
  } else {
    await sb.from('user_config').insert([{ user_id: session.user.id, app_name: 'Voco' }]);
  }
  document.querySelector('.app-title').textContent = APP_NAME;
  document.title = APP_NAME;
}

async function saveConfig() {
  const name = document.getElementById('setting-name').value.trim();
  if (!name) return;
  const { data: { session } } = await sb.auth.getSession();
  await sb.from('user_config').upsert({ user_id: session.user.id, app_name: name, user_name: '' }, { onConflict: 'user_id' });
  APP_NAME = name;
  document.querySelector('.app-title').textContent = APP_NAME;
  document.title = APP_NAME;
  document.getElementById('setting-name').value = name;
  showToast('已保存！');
}

// ─── Home ────────────────────────────────────────────────
async function loadHome() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;

  const { data: vocab } = await sb.from('vocabulary').select('*');
  const { data: errors } = await sb.from('errors').select('*');
  const { data: prog } = await sb.from('progress').select('*').eq('user_id', session.user.id).maybeSingle();

  // Stats grid (4 cards)
  document.getElementById('stat-sessions').textContent = prog?.total_sessions || 0;
  document.getElementById('stat-vocab').textContent = vocab?.length || 0;
  document.getElementById('stat-errors').textContent = errors?.length || 0;
  const uniqueDates = new Set((vocab || []).map(v => v.date_added).filter(Boolean));
  document.getElementById('stat-streak').textContent = uniqueDates.size || 0;

  // Duration bar
  const durBar = document.getElementById('duration-bar');
  const durSpan = document.getElementById('stat-duration');
  if (prog?.total_minutes > 0) {
    durBar.style.display = 'flex';
    durSpan.textContent = prog.total_minutes + ' 分钟';
  } else {
    durBar.style.display = 'none';
  }

  // Today's Topic
  const lastTopic = prog?.topics?.slice(-1)[0];
  const lastFluency = prog?.fluency_trend?.slice(-1)[0];
  if (lastTopic) {
    document.getElementById('topic-name').textContent = lastTopic;
    document.getElementById('topic-sub').textContent = lastFluency ? `上次流利度 ${lastFluency}/10` : '最近练习的话题';
  } else {
    document.getElementById('topic-name').textContent = '准备开始';
    document.getElementById('topic-sub').textContent = '导入第一篇日报开启追踪 ✨';
  }

  // Calendar with color levels
  renderCalendar(vocab || []);

  // Recent Errors (dual card)
  const recentErrors = (errors || []).slice(-4).reverse();
  const errDiv = document.getElementById('recent-errors');
  if (recentErrors.length) {
    errDiv.innerHTML = recentErrors.map(e =>
      `<div class="dual-item"><span class="orig">${h(e.original)}</span> <span class="corr">${h(e.correction)}</span></div>`
    ).join('');
  } else {
    errDiv.innerHTML = '<div class="dual-empty">导入日报后自动显示 ✨</div>';
  }

  // Review Queue (dual card) — spaced repetition
  const today = new Date().toISOString().slice(0, 10);
  const toReview = (vocab || [])
    .filter(v => {
      if (v.status === 'mastered' || v.mastered) return false;
      if (!v.next_review_date) return true; // not scheduled yet = due
      return v.next_review_date <= today;
    })
    .sort((a, b) => (a.next_review_date || '0000') < (b.next_review_date || '0000') ? -1 : 1)
    .slice(0, 4);
  const revDiv = document.getElementById('review-queue');
  if (toReview.length) {
    revDiv.innerHTML = toReview.map(v =>
      `<div class="dual-item">${h(v.word)} <span style="color:var(--text-ultradim);font-size:10px;">${statusLabel(v.status || (v.mastered ? 'mastered' : 'new'))}</span><br><span style="color:var(--text-ultradim);font-size:10px;">${h(v.meaning)}</span></div>`
    ).join('');
  } else {
    revDiv.innerHTML = '<div class="dual-empty">暂无待复习 🎉</div>';
  }
}

function renderCalendar(vocab) {
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const dateCount = {};
  (vocab || []).forEach(v => {
    if (v.date_added) dateCount[v.date_added] = (dateCount[v.date_added] || 0) + 1;
  });

  function getLevel(count) {
    if (!count) return '';
    if (count <= 2) return 'l1';
    if (count <= 5) return 'l2';
    if (count <= 10) return 'l3';
    return 'l4';
  }

  document.getElementById('cal-month-label').textContent =
    `${year}年${month + 1}月`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const d = document.createElement('div');
    d.className = 'cal-day empty';
    d.style.visibility = 'hidden';
    grid.appendChild(d);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const div = document.createElement('div');
    div.className = 'cal-day';
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const level = getLevel(dateCount[ds]);
    if (level) div.classList.add(level);
    if (d === today.getDate()) div.classList.add('today');
    grid.appendChild(div);
  }
}

// ─── Library ──────────────────────────────────────────────
let _libData = { vocab: [], errors: [], patterns: [] };
let _libType = 'vocab';
let _libSub = 'all';

async function loadLibrary(type) {
  _libType = type;
  _libSub = 'all';
  const content = document.getElementById('library-content');
  content.innerHTML = '<div class="loading">加载中...</div>';

  // Show/hide subtabs
  const subtabs = document.getElementById('lib-subtabs');
  if (type === 'vocab') {
    subtabs.style.display = 'flex';
    subtabs.innerHTML = `
      <button class="lib-subtab active" data-sub="all">全部</button>
      <button class="lib-subtab" data-sub="learning">学习中</button>
      <button class="lib-subtab" data-sub="mastered">已掌握</button>
    `;
    subtabs.querySelectorAll('.lib-subtab').forEach(btn => {
      btn.addEventListener('click', () => {
        subtabs.querySelectorAll('.lib-subtab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _libSub = btn.dataset.sub;
        renderLibContent();
      });
    });
  } else if (type === 'errors') {
    subtabs.style.display = 'flex';
    subtabs.innerHTML = `
      <button class="lib-subtab active" data-sub="all">全部</button>
      <button class="lib-subtab" data-sub="grammar">语法</button>
      <button class="lib-subtab" data-sub="pronunciation">发音</button>
    `;
    subtabs.querySelectorAll('.lib-subtab').forEach(btn => {
      btn.addEventListener('click', () => {
        subtabs.querySelectorAll('.lib-subtab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _libSub = btn.dataset.sub;
        renderLibContent();
      });
    });
  } else {
    subtabs.style.display = 'none';
  }

  if (type === 'vocab') {
    const { data } = await sb.from('vocabulary').select('*').order('created_at', { ascending: false });
    _libData.vocab = data || [];
    document.getElementById('lib-count-vocab').textContent = _libData.vocab.length ? `(${_libData.vocab.length})` : '';
    renderLibContent();
  } else if (type === 'errors') {
    const { data } = await sb.from('errors').select('*').order('created_at', { ascending: false });
    _libData.errors = data || [];
    document.getElementById('lib-count-errors').textContent = _libData.errors.length ? `(${_libData.errors.length})` : '';
    renderLibContent();
  } else if (type === 'patterns') {
    const { data } = await sb.from('patterns').select('*').order('created_at', { ascending: false });
    _libData.patterns = data || [];
    document.getElementById('lib-count-patterns').textContent = _libData.patterns.length ? `(${_libData.patterns.length})` : '';
    renderLibContent();
  }
}

function renderLibContent() {
  const content = document.getElementById('library-content');
  const q = (document.getElementById('lib-search').value || '').trim().toLowerCase();
  let items = _libData[_libType] || [];

  // Sub-filter
  if (_libType === 'vocab') {
    if (_libSub === 'learning') {
      items = items.filter(v => {
        const s = v.status || (v.mastered ? 'mastered' : 'new');
        return s === 'new' || s === 'learning' || (!v.status && !v.mastered);
      });
    } else if (_libSub === 'mastered') {
      items = items.filter(v => v.status === 'mastered' || v.mastered);
    }
  }
  if (_libType === 'errors' && _libSub !== 'all') {
    items = items.filter(e => e.type === _libSub);
  }

  // Search
  if (q) {
    items = items.filter(item => {
      const fields = [
        item.word, item.phonetic, item.meaning, item.example,
        item.original, item.correction, item.rule,
        item.better, item.scene,
      ];
      return fields.some(f => f && f.toLowerCase().includes(q));
    });
  }

  if (_libType === 'vocab') {
    content.innerHTML = items.length
      ? items.map(v => vocabCard(v)).join('')
      : (q ? '<div class="empty">无匹配结果</div>' : '<div class="empty">📝 导入日报后自动生成单词库</div>');
  } else if (_libType === 'errors') {
    content.innerHTML = items.length
      ? items.map((e, i) => errorCard(e, i)).join('')
      : (q ? '<div class="empty">无匹配结果</div>' : '<div class="empty">🔧 导入日报后自动生成纠错库</div>');
  } else if (_libType === 'patterns') {
    content.innerHTML = items.length
      ? items.map(p => patternCard(p)).join('')
      : (q ? '<div class="empty">无匹配结果</div>' : '<div class="empty">✨ 导入日报后自动生成句型库</div>');
  }
}

function vocabCard(v) {
  const s = v.status || (v.mastered ? 'mastered' : 'new');
  const btn = s === 'mastered'
    ? '<span class="badge-status mastered">✅ 已掌握</span>'
    : `<button onclick="markMastered(${v.id})" class="btn-small">复习 +1</button>`;
  const rc = v.review_count || 0;
  const nextRev = v.next_review_date ? ` · 下次: ${v.next_review_date}` : '';
  return `<div class="vocab-card">
    <div class="card-row"><span class="word">${h(v.word)}</span><span class="phonetic">${h(v.phonetic)}</span></div>
    <div class="meaning">${h(v.meaning)}</div>
    ${v.example ? `<div class="example">💬 ${h(v.example)}</div>` : ''}
    <div class="card-actions">
      ${btn}
      <span style="font-size:10px;color:var(--text-ultradim);">复习 ${rc} 次${nextRev}</span>
      <button onclick="speak('${h(v.word)}')" class="btn-small">🔊</button>
    </div>
  </div>`;
}

function errorCard(e, i) {
  return `<div class="error-card">
    <div class="err-type">${e.type === 'grammar' ? '📖 语法' : '🗣️ 发音'}</div>
    <div class="err-orig">${h(e.original)}</div>
    <div class="err-corr">✅ ${h(e.correction)}</div>
    ${e.rule ? `<div class="err-rule">📐 ${h(e.rule)}</div>` : ''}
    <div class="card-actions">
      ${e.correct_in_review ? '<span class="badge-done">已纠正</span>' : `<button onclick="markFixed(${e.id})" class="btn-small">标记已纠正</button>`}
    </div>
  </div>`;
}

function patternCard(p) {
  return `<div class="pattern-card">
    <div class="pat-orig">${h(p.original)}</div>
    <div class="pat-better">✨ ${h(p.better)}</div>
    ${p.scene ? `<div class="pat-scene">🎬 ${h(p.scene)}</div>` : ''}
  </div>`;
}

// ─── Spaced Repetition ──────────────────────────────────
const REVIEW_INTERVALS = [0, 1, 3, 7, 14, 30]; // days

function getNextReviewDate(reviewCount) {
  const days = REVIEW_INTERVALS[Math.min(reviewCount, REVIEW_INTERVALS.length - 1)];
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function statusLabel(status) {
  if (status === 'mastered') return '已掌握';
  if (status === 'learning') return '学习中';
  return '新词';
}

// ─── Actions ─────────────────────────────────────────────
async function markMastered(id) {
  // Get current word
  const { data } = await sb.from('vocabulary').select('review_count').eq('id', id).single();
  const rc = (data?.review_count || 0) + 1;
  const nextDate = getNextReviewDate(rc);
  const newStatus = rc >= 5 ? 'mastered' : 'learning';

  await sb.from('vocabulary').update({
    mastered: newStatus === 'mastered',
    status: newStatus,
    review_count: rc,
    next_review_date: nextDate,
    last_reviewed_at: new Date().toISOString()
  }).eq('id', id);

  loadLibrary('vocab');
  showToast(rc >= 5 ? '🎉 已掌握！' : `📖 已复习 ${rc} 次，${nextDate} 再复习`);
}

async function markFixed(id) {
  await sb.from('errors').update({ correct_in_review: true }).eq('id', id);
  loadLibrary('errors');
}

// ─── Import Report ────────────────────────────────────────
async function importReport() {
  const text = document.getElementById('report-input').value.trim();
  if (!text) return;

  const btn = document.getElementById('btn-submit');
  btn.disabled = true; btn.textContent = '解析中...';

  const parsed = parseReport(text);
  if (!parsed.meta || Object.keys(parsed.meta).length === 0) {
    document.getElementById('import-result').innerHTML = '<span class="toast-error">❌ 无法解析日报格式</span>';
    btn.disabled = false; btn.textContent = '解析入库';
    return;
  }

  const { data: { session } } = await sb.auth.getSession();
  const uid = session.user.id;
  const date = parsed.meta.date || new Date().toISOString().slice(0, 10);
  const topic = parsed.meta.topic || '';
  const duration = parseInt(parsed.meta.duration) || 0;

  // Insert vocabulary
  if (parsed.vocabulary.length) {
    await sb.from('vocabulary').insert(
      parsed.vocabulary.map(v => ({ user_id: uid, word: v.word, phonetic: v.phonetic, meaning: v.meaning, example: v.example, date_added: date, source_topic: topic, status: 'new' }))
    );
  }

  // Insert errors
  const allErrors = [];
  for (const e of parsed.pronunciation) {
    allErrors.push({ user_id: uid, type: 'pronunciation', original: e.original || '', correction: e.correction || '', date_added: date, source_topic: topic });
  }
  for (const e of parsed.grammar) {
    allErrors.push({ user_id: uid, type: 'grammar', original: e.original || '', correction: e.correction || '', rule: e.rule || '', date_added: date, source_topic: topic });
  }
  if (allErrors.length) await sb.from('errors').insert(allErrors);

  // Insert patterns
  if (parsed.patterns.length) {
    await sb.from('patterns').insert(
      parsed.patterns.map(p => ({ user_id: uid, original: p.original || '', better: p.better || '', scene: p.scene || '', date_added: date, source_topic: topic }))
    );
  }

  // Save report
  await sb.from('reports').upsert({ user_id: uid, date, content: text }, { onConflict: 'user_id,date' });

  // Update progress
  await updateProgress(uid, parsed.summary.fluency || 0, parsed.summary.accuracy || 0, parsed.summary.weak_areas, topic, duration);

  document.getElementById('import-result').innerHTML = `<span class="toast-success">✅ 入库完成！单词 ${parsed.vocabulary.length} · 纠错 ${allErrors.length} · 句型 ${parsed.patterns.length}</span>`;
  document.getElementById('report-input').value = '';
  btn.disabled = false; btn.textContent = '解析入库';

  // Auto-refresh home
  loadHome();
}

async function updateProgress(uid, fluency, accuracy, weak_areas, topic, duration) {
  const { data: prog } = await sb.from('progress').select('*').eq('user_id', uid).maybeSingle();
  let p = prog || { user_id: uid, total_sessions: 0, total_minutes: 0, topics: [], fluency_trend: [], accuracy_trend: [], weak_areas: [], words_learned: 0, words_mastered: 0, errors_fixed: 0 };

  p.total_sessions += 1;
  p.total_minutes += duration;
  if (topic && !p.topics.includes(topic)) p.topics = [...p.topics, topic];
  p.fluency_trend = [...p.fluency_trend, fluency];
  p.accuracy_trend = [...p.accuracy_trend, accuracy];

  const weakList = (weak_areas || '').split(/[、,，]/).map(s => s.trim()).filter(Boolean);
  for (const w of weakList) { if (!p.weak_areas.includes(w)) p.weak_areas.push(w); }

  const { count: vCount } = await sb.from('vocabulary').select('*', { count: 'exact', head: true });
  const { count: eCount } = await sb.from('errors').select('*', { count: 'exact', head: true }).eq('correct_in_review', true);
  p.words_learned = vCount;
  p.errors_fixed = eCount;

  await sb.from('progress').upsert(p, { onConflict: 'user_id' });
}

// ─── Settings ─────────────────────────────────────────────
async function loadSettings() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;

  // Email
  document.getElementById('settings-email').textContent = session.user.email || '---';

  // Config
  const { data: cfg } = await sb.from('user_config').select('*').eq('user_id', session.user.id).maybeSingle();
  document.getElementById('setting-name').value = cfg?.app_name || 'Voco';

  // Trends
  const { data: prog } = await sb.from('progress').select('*').eq('user_id', session.user.id).maybeSingle();
  const div = document.getElementById('settings-trends');

  if (prog && prog.fluency_trend?.length) {
    const fluencySpark = sparklineSVG(prog.fluency_trend, '#E07B5A');
    const accuracySpark = sparklineSVG(prog.accuracy_trend, '#8BADC5');
    const fDelta = getDelta(prog.fluency_trend);
    const aDelta = getDelta(prog.accuracy_trend);

    div.innerHTML = `
      <div class="settings-trend-item">
        <span class="settings-trend-label">🎯 流利度</span>
        <div class="settings-trend-spark">${fluencySpark}</div>
        <span class="settings-trend-delta ${fDelta.cls}">${fDelta.text}</span>
      </div>
      <div class="settings-trend-item">
        <span class="settings-trend-label">📏 准确度</span>
        <div class="settings-trend-spark">${accuracySpark}</div>
        <span class="settings-trend-delta ${aDelta.cls}">${aDelta.text}</span>
      </div>
      <div class="settings-trend-summary">
        📊 总练习 <strong>${prog.total_sessions}</strong> 次 · ⏱️ <strong>${prog.total_minutes}</strong> 分钟
        ${prog.topics?.length ? `· 🏷️ ${prog.topics.length} 个话题` : ''}
      </div>
    `;
  } else {
    div.innerHTML = '<div class="empty" style="padding:20px;">导入日报后生成趋势 📈</div>';
  }
}

function getDelta(arr) {
  if (arr.length < 2) return { text: '--', cls: 'flat' };
  const d = arr[arr.length - 1] - arr[arr.length - 2];
  if (d > 0) return { text: `↑ ${d}`, cls: 'up' };
  if (d < 0) return { text: `↓ ${Math.abs(d)}`, cls: 'down' };
  return { text: '→ 0', cls: 'flat' };
}

function sparklineSVG(arr, color) {
  if (!arr.length) return '';
  const w = Math.max(arr.length * 14, 60);
  const h = 32;
  const pad = 2;
  const max = Math.max(...arr, 1);
  const min = Math.min(...arr, 0);
  const range = max - min || 1;
  const points = arr.map((v, i) => {
    const x = pad + (i / Math.max(arr.length - 1, 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  // Last point dot
  const lastX = pad + (arr.length - 1) / Math.max(arr.length - 1, 1) * (w - pad * 2);
  const lastY = pad + (1 - (arr[arr.length - 1] - min) / range) * (h - pad * 2);

  return `<svg width="${w}" height="${h}" class="sparkline" viewBox="0 0 ${w} ${h}">
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3" fill="${color}"/>
  </svg>`;
}

// ─── TTS ─────────────────────────────────────────────────
function speak(text) {
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US'; u.rate = 0.85;
  speechSynthesis.speak(u);
}

// ─── Helpers ─────────────────────────────────────────────
function h(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast show';
  t.textContent = msg;
  t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:var(--green);color:#fff;padding:10px 20px;border-radius:8px;font-size:14px;z-index:200;';
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 2000);
}

// ─── Init ─────────────────────────────────────────────────
document.getElementById('btn-login').addEventListener('click', signIn);
document.getElementById('btn-login-email').addEventListener('click', sendMagicLink);
document.getElementById('btn-logout').addEventListener('click', signOut);
document.getElementById('btn-submit').addEventListener('click', importReport);
document.getElementById('btn-save-name').addEventListener('click', saveConfig);

// Import toggle
document.getElementById('import-toggle').addEventListener('click', () => {
  const card = document.getElementById('import-card');
  const body = document.getElementById('import-body');
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  card.classList.toggle('open', !open);
});

// GO button: scroll to import card
document.getElementById('topic-go-btn').addEventListener('click', () => {
  const importCard = document.getElementById('import-card');
  const importBody = document.getElementById('import-body');
  importBody.style.display = 'block';
  importCard.classList.add('open');
  importCard.scrollIntoView({ behavior: 'smooth' });
  document.getElementById('report-input').focus();
});

// Library search
document.getElementById('lib-search').addEventListener('input', () => {
  renderLibContent();
});

// Settings logout
document.getElementById('btn-logout-settings').addEventListener('click', signOut);

// Auth state listener
sb.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') checkAuth();
  if (event === 'SIGNED_OUT') checkAuth();
});

checkAuth();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
