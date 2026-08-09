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
    if (btn.dataset.tab === 'me') loadMe();
  });
});

document.querySelectorAll('.lib-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.lib-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
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
    options: { redirectTo: window.location.origin + '/' }
  });
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
}

async function saveConfig() {
  const name = document.getElementById('setting-name').value.trim();
  if (!name) return;
  const { data: { session } } = await sb.auth.getSession();
  await sb.from('user_config').upsert({ user_id: session.user.id, app_name: name, user_name: '' }, { onConflict: 'user_id' });
  APP_NAME = name;
  document.getElementById('setting-name').value = name;
  alert('已保存！');
}

// ─── Home ────────────────────────────────────────────────
async function loadHome() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;

  const { data: vocab } = await sb.from('vocabulary').select('*');
  const { data: errors } = await sb.from('errors').select('*');
  const { data: prog } = await sb.from('progress').select('*').eq('user_id', session.user.id).maybeSingle();

  document.getElementById('stat-vocab').textContent = `📝 ${vocab?.length || 0} 单词`;
  document.getElementById('stat-errors').textContent = `🔧 ${errors?.length || 0} 纠正`;

  if (prog && prog.fluency_trend?.length) {
    const last = prog.fluency_trend[prog.fluency_trend.length - 1];
    document.getElementById('stat-fluency').textContent = `🎯 ${last}/10`;
    document.getElementById('streak-days').textContent = prog.total_sessions || 0;
  } else {
    document.getElementById('stat-fluency').textContent = '🎯 --/10';
    document.getElementById('streak-days').textContent = '0';
  }

  // Calendar
  renderCalendar(vocab || []);
  loadReview();
}

function renderCalendar(vocab) {
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const activeDates = new Set(vocab.map(v => v.date_added).filter(Boolean));

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const d = document.createElement('div'); d.className = 'cal-day empty'; grid.appendChild(d);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const div = document.createElement('div');
    div.className = 'cal-day';
    div.textContent = d;
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (activeDates.has(ds)) div.classList.add('active');
    if (d === today.getDate()) div.classList.add('today');
    grid.appendChild(div);
  }
}

async function loadReview() {
  const { data: errors } = await sb.from('errors').select('*').eq('correct_in_review', false).limit(5);
  const { data: vocab } = await sb.from('vocabulary').select('*').eq('mastered', false).limit(10);

  const prompt = document.getElementById('review-prompt');
  const preview = document.getElementById('review-preview');
  if ((errors?.length || 0) + (vocab?.length || 0) === 0) { prompt.style.display = 'none'; return; }
  prompt.style.display = 'block';
  preview.innerHTML = [
    errors?.length ? `<p>🔧 ${errors.length} 个错误待复习</p>` : '',
    vocab?.length ? `<p>📝 ${vocab.length} 个单词待复习</p>` : '',
  ].join('');
}

// ─── Library ──────────────────────────────────────────────
async function loadLibrary(type) {
  const content = document.getElementById('library-content');
  content.innerHTML = '<div class="loading">加载中...</div>';

  if (type === 'vocab') {
    const { data } = await sb.from('vocabulary').select('*').order('created_at', { ascending: false });
    content.innerHTML = data?.length
      ? data.map(v => vocabCard(v)).join('')
      : '<div class="empty">暂无单词，导入日报后自动生成</div>';
  } else if (type === 'errors') {
    const { data } = await sb.from('errors').select('*').order('created_at', { ascending: false });
    content.innerHTML = data?.length
      ? data.map((e, i) => errorCard(e, i)).join('')
      : '<div class="empty">暂无纠错记录</div>';
  } else if (type === 'patterns') {
    const { data } = await sb.from('patterns').select('*').order('created_at', { ascending: false });
    content.innerHTML = data?.length
      ? data.map(p => patternCard(p)).join('')
      : '<div class="empty">暂无句型</div>';
  }
}

function vocabCard(v) {
  const btn = v.mastered
    ? '<span class="badge-done">✅ 已掌握</span>'
    : `<button onclick="markMastered(${v.id})" class="btn-small">标记掌握</button>`;
  return `<div class="card">
    <div class="card-row"><strong>${h(v.word)}</strong> <span>${h(v.phonetic)}</span></div>
    <div>${h(v.meaning)}</div>
    ${v.example ? `<div class="example">💬 ${h(v.example)}</div>` : ''}
    <div class="card-actions">
      ${btn}
      <button onclick="speak('${h(v.word)}')" class="btn-small">🔊</button>
    </div>
  </div>`;
}

function errorCard(e, i) {
  return `<div class="card">
    <div class="card-tag">${e.type === 'grammar' ? '📖 语法' : '🗣️ 发音'}</div>
    <div>❌ ${h(e.original)}</div>
    <div>✅ ${h(e.correction)}</div>
    ${e.rule ? `<div class="example">📐 ${h(e.rule)}</div>` : ''}
    <div class="card-actions">
      ${e.correct_in_review ? '<span class="badge-done">已纠正</span>' : `<button onclick="markFixed(${e.id})" class="btn-small">标记已纠正</button>`}
    </div>
  </div>`;
}

function patternCard(p) {
  return `<div class="card">
    <div>❌ ${h(p.original)}</div>
    <div>✨ ${h(p.better)}</div>
    ${p.scene ? `<div class="example">🎬 ${h(p.scene)}</div>` : ''}
  </div>`;
}

// ─── Actions ─────────────────────────────────────────────
async function markMastered(id) {
  await sb.from('vocabulary').update({ mastered: true }).eq('id', id);
  loadLibrary('vocab');
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
      parsed.vocabulary.map(v => ({ user_id: uid, word: v.word, phonetic: v.phonetic, meaning: v.meaning, example: v.example, date_added: date, source_topic: topic }))
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

// ─── Me ───────────────────────────────────────────────────
async function loadMe() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;

  // Config
  const { data: cfg } = await sb.from('user_config').select('*').eq('user_id', session.user.id).maybeSingle();
  document.getElementById('setting-name').value = cfg?.app_name || 'Voco';

  // Trends
  const { data: prog } = await sb.from('progress').select('*').eq('user_id', session.user.id).maybeSingle();
  const div = document.getElementById('me-trends');
  if (prog && prog.fluency_trend?.length) {
    div.innerHTML = `
      <div class="trend-row"><span>🎯 流利度</span><span class="trend-bars">${bars(prog.fluency_trend)}</span></div>
      <div class="trend-row"><span>📏 准确度</span><span class="trend-bars">${bars(prog.accuracy_trend)}</span></div>
      <div class="trend-row"><span>📊 总练习</span><span>${prog.total_sessions} 次 / ${prog.total_minutes} 分钟</span></div>
    `;
  } else {
    div.innerHTML = '<div class="empty">导入日报后生成趋势</div>';
  }
}

function bars(arr) {
  const max = Math.max(...arr, 1);
  return arr.map(v => `<span class="bar" style="height:${(v/max)*40}px" title="${v}"></span>`).join('');
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

// ─── Init ─────────────────────────────────────────────────
document.getElementById('btn-login').addEventListener('click', signIn);
document.getElementById('btn-logout').addEventListener('click', signOut);
document.getElementById('btn-submit').addEventListener('click', importReport);
document.getElementById('btn-save-name').addEventListener('click', saveConfig);

// Auth state listener
sb.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') checkAuth();
  if (event === 'SIGNED_OUT') checkAuth();
});

checkAuth();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
