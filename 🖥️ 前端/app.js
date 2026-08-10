// Voco PWA — Supabase-powered

// ═══════════════════════════════════════════════════════
// Tab Switching
// ═══════════════════════════════════════════════════════
document.querySelectorAll('.tab-bar .tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-bar .tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'home') loadHome();
    if (btn.dataset.tab === 'review') loadReview();
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

// ═══════════════════════════════════════════════════════
// Auth
// ═══════════════════════════════════════════════════════
async function checkAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-main').style.display = 'block';
    await loadConfig();
    loadHome();
    detectClipboard();
  } else {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-main').style.display = 'none';
  }
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

async function signOut() { await sb.auth.signOut(); checkAuth(); }

// ═══════════════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════════════
let APP_NAME = 'Voco';
async function loadConfig() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const { data } = await sb.from('user_config').select('*').eq('user_id', session.user.id).maybeSingle();
  if (data) { APP_NAME = data.app_name || 'Voco'; }
  else { await sb.from('user_config').insert([{ user_id: session.user.id, app_name: 'Voco' }]); }
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
  showToast('已保存！');
}

// ═══════════════════════════════════════════════════════
// Home Dashboard
// ═══════════════════════════════════════════════════════
async function loadHome() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;

  const { data: vocab } = await sb.from('vocabulary').select('*');
  const { data: errors } = await sb.from('errors').select('*');
  const { data: prog } = await sb.from('progress').select('*').eq('user_id', session.user.id).maybeSingle();

  const vList = vocab || [];
  const eList = errors || [];

  // Stats grid — 4 cards with icons
  document.getElementById('stat-sessions').innerHTML = prog?.total_sessions || '0';
  document.getElementById('stat-vocab').textContent = vList.length;
  document.getElementById('stat-errors').textContent = eList.length;

  // Consecutive streak with flame
  const dates = [...new Set(vList.map(v => v.date_added).filter(Boolean))].sort().reverse();
  const streak = calcStreak(dates);
  document.getElementById('stat-streak').innerHTML = `<span class="streak-flame">🔥</span>${streak}`;

  // Duration
  const durBar = document.getElementById('duration-bar');
  const durSpan = document.getElementById('stat-duration');
  if (prog?.total_minutes > 0) {
    durBar.style.display = 'flex';
    durSpan.textContent = prog.total_minutes + ' 分钟';
  } else { durBar.style.display = 'none'; }

  // Topic CTA
  const lastTopic = prog?.topics?.slice(-1)[0];
  const lastFluency = prog?.fluency_trend?.slice(-1)[0];
  if (lastTopic) {
    document.getElementById('topic-name').textContent = lastTopic;
    document.getElementById('topic-sub').textContent = lastFluency ? `上次流利度 ${lastFluency}/10` : '最近练习的话题';
  } else {
    document.getElementById('topic-name').textContent = '准备开始';
    document.getElementById('topic-sub').textContent = '和 ChatGPT 练完口语后导入日报 ✨';
  }

  // Heatmap calendar
  renderHeatmap(vList);

  // Recent errors
  const recentErrors = eList.slice(-4).reverse();
  const errDiv = document.getElementById('recent-errors');
  if (recentErrors.length) {
    errDiv.innerHTML = recentErrors.map(e =>
      `<div class="dual-item"><span class="orig">${h(e.original)}</span> <span class="corr">${h(e.correction)}</span></div>`
    ).join('');
  } else {
    errDiv.innerHTML = '<div class="dual-empty">🐻 导入日报后自动显示最近错误</div>';
  }

  // Review queue
  const today = new Date().toISOString().slice(0, 10);
  const toReview = vList
    .filter(v => { if (v.status === 'mastered' || v.mastered) return false; if (!v.next_review_date) return true; return v.next_review_date <= today; })
    .sort((a, b) => (a.next_review_date || '0000') < (b.next_review_date || '0000') ? -1 : 1).slice(0, 4);
  const revDiv = document.getElementById('review-queue');
  if (toReview.length) {
    revDiv.innerHTML = toReview.map(v =>
      `<div class="dual-item">${h(v.word)} <span style="color:var(--text-ultradim);font-size:10px;">${statusLabel(v.status || (v.mastered ? 'mastered' : 'new'))}</span></div>`
    ).join('');
    revDiv.innerHTML += `<button class="btn-small" style="margin-top:8px;width:100%;" onclick="document.querySelector('.tab-bar .tab[data-tab=review]').click()">开始复习 →</button>`;
  } else {
    revDiv.innerHTML = '<div class="dual-empty">🎉 暂无待复习</div>';
  }
}

// Streak: consecutive days counting backwards from today
function calcStreak(dates) {
  if (!dates.length) return 0;
  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  let check = new Date(today);
  // Check if today or yesterday has activity to count streak
  const hasToday = dates.includes(today);
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  const hasYesterday = dates.includes(yStr);
  if (!hasToday && !hasYesterday) return 0;
  if (!hasToday) check = yesterday; // start from yesterday

  while (true) {
    const s = check.toISOString().slice(0, 10);
    if (dates.includes(s)) { streak++; check.setDate(check.getDate() - 1); }
    else break;
  }
  return streak;
}

// GitHub-style heatmap (last 20 weeks)
function renderHeatmap(vocab) {
  const grid = document.getElementById('calendar-grid');
  const label = document.getElementById('cal-month-label');
  grid.innerHTML = '';
  grid.className = 'heatmap-wrap';

  const dateCount = {};
  (vocab || []).forEach(v => { if (v.date_added) dateCount[v.date_added] = (dateCount[v.date_added] || 0) + 1; });

  function getLevel(count) {
    if (!count) return 0; if (count <= 2) return 1; if (count <= 5) return 2; if (count <= 10) return 3; return 4;
  }

  const today = new Date();
  const weeks = 20;
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - startDate.getDay() - (weeks - 1) * 7); // Monday weeks ago

  // Month labels
  const months = [];
  let currentMonth = -1;
  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

  const heatmap = document.createElement('div');
  heatmap.className = 'heatmap';

  for (let w = 0; w < weeks; w++) {
    const col = document.createElement('div');
    col.className = 'heatmap-col';
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + w * 7 + d);
      const ds = date.toISOString().slice(0, 10);
      const cell = document.createElement('div');
      cell.className = 'heatmap-cell';
      const level = getLevel(dateCount[ds]);
      if (level) cell.setAttribute('data-level', level);
      if (ds === today.toISOString().slice(0, 10)) cell.style.boxShadow = '0 0 0 2px var(--primary)';
      cell.title = ds;
      col.appendChild(cell);

      if (d === 0 && date.getMonth() !== currentMonth) {
        currentMonth = date.getMonth();
        months.push({ label: monthNames[currentMonth], week: w });
      }
    }
    heatmap.appendChild(col);
  }

  // Build month labels
  let mlHTML = '<div class="heatmap-months" style="display:flex;">';
  let lastPos = 0;
  months.forEach(m => {
    mlHTML += `<span style="margin-left:${(m.week - lastPos) * 15}px;">${m.label}</span>`;
    lastPos = m.week;
  });
  mlHTML += '</div>';

  label.innerHTML = `📅 练习热力图`;
  grid.innerHTML = mlHTML;
  grid.appendChild(heatmap);

  // Hide weekday labels
  document.querySelector('.calendar-weekdays').style.display = 'none';
  document.querySelector('.calendar-header .cal-legend').style.display = 'none';
}

// ═══════════════════════════════════════════════════════
// Flashcard Review Mode
// ═══════════════════════════════════════════════════════
let _reviewDeck = [];
let _reviewIdx = 0;
let _reviewResults = [];

async function loadReview() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;

  const today = new Date().toISOString().slice(0, 10);
  const { data: vocab } = await sb.from('vocabulary').select('*');
  _reviewDeck = (vocab || [])
    .filter(v => {
      if (v.status === 'mastered' || v.mastered) return false;
      if (!v.next_review_date) return true;
      return v.next_review_date <= today;
    })
    .sort((a, b) => (a.next_review_date || '0000') < (b.next_review_date || '0000') ? -1 : 1);

  _reviewIdx = 0;
  _reviewResults = [];

  if (_reviewDeck.length === 0) {
    document.getElementById('review-empty').style.display = 'block';
    document.getElementById('review-active').style.display = 'none';
    document.getElementById('review-summary').style.display = 'none';
    document.getElementById('btn-start-review-empty').style.display = 'none';
    return;
  }

  document.getElementById('review-empty').style.display = 'none';
  document.getElementById('review-active').style.display = 'block';
  document.getElementById('review-summary').style.display = 'none';
  showCard(0);
}

function showCard(idx) {
  _reviewIdx = idx;
  const v = _reviewDeck[idx];
  const total = _reviewDeck.length;

  document.getElementById('review-progress-text').textContent = `${idx + 1}/${total}`;
  document.getElementById('review-progress-fill').style.width = `${((idx + 1) / total) * 100}%`;

  document.getElementById('fc-word').textContent = v.word;
  document.getElementById('fc-phonetic').textContent = v.phonetic || '';
  document.getElementById('fc-word-back').textContent = v.word;
  document.getElementById('fc-meaning').textContent = v.meaning || '';
  document.getElementById('fc-example').textContent = v.example ? `💬 ${v.example}` : '';
  document.getElementById('fc-meta').textContent = `复习 ${v.review_count || 0} 次 · ${statusLabel(v.status || (v.mastered ? 'mastered' : 'new'))}`;

  // Reset card
  document.getElementById('flashcard-inner').classList.remove('flipped');
  document.getElementById('review-actions').style.display = 'none';
  document.getElementById('btn-reveal').style.display = 'block';
}

function flipCard() {
  document.getElementById('flashcard-inner').classList.add('flipped');
  document.getElementById('review-actions').style.display = 'flex';
  document.getElementById('btn-reveal').style.display = 'none';
  speak(_reviewDeck[_reviewIdx].word);
}

async function rateCard(rating) {
  const v = _reviewDeck[_reviewIdx];
  const today = new Date();

  let newRc = v.review_count || 0;
  let nextDays;

  if (rating === 'again') {
    newRc = Math.max(0, newRc - 1);
    nextDays = 1;
  } else if (rating === 'good') {
    newRc += 1;
    nextDays = REVIEW_INTERVALS[Math.min(newRc, REVIEW_INTERVALS.length - 1)];
  } else { // easy
    newRc += 2;
    nextDays = REVIEW_INTERVALS[Math.min(newRc, REVIEW_INTERVALS.length - 1)] * 2;
  }

  const nextDate = new Date(today);
  nextDate.setDate(nextDate.getDate() + nextDays);
  const status = rating === 'again' ? 'learning' : (newRc >= 5 ? 'mastered' : 'learning');

  // Update DB
  await sb.from('vocabulary').update({
    status, mastered: status === 'mastered',
    review_count: newRc,
    next_review_date: nextDate.toISOString().slice(0, 10),
    last_reviewed_at: today.toISOString()
  }).eq('id', v.id);

  _reviewResults.push({ word: v.word, rating });

  // Next card or finish
  if (_reviewIdx + 1 < _reviewDeck.length) {
    showCard(_reviewIdx + 1);
  } else {
    endReview();
  }
}

function endReview() {
  document.getElementById('review-active').style.display = 'none';
  document.getElementById('review-summary').style.display = 'block';

  const total = _reviewResults.length;
  const mastered = _reviewResults.filter(r => r.rating === 'easy').length;
  const learning = _reviewResults.filter(r => r.rating === 'good').length;
  const again = _reviewResults.filter(r => r.rating === 'again').length;

  document.getElementById('review-summary-stats').innerHTML = `
    复习 <strong>${total}</strong> 个单词<br>
    ✅ 简单 <strong>${mastered}</strong> · 👍 不错 <strong>${learning}</strong> · 🔄 再来 <strong>${again}</strong>
  `;
}

// ═══════════════════════════════════════════════════════
// Library
// ═══════════════════════════════════════════════════════
let _libData = { vocab: [], errors: [], patterns: [] };
let _libType = 'vocab';
let _libSub = 'all';

async function loadLibrary(type) {
  _libType = type; _libSub = 'all';
  const content = document.getElementById('library-content');
  content.innerHTML = '<div class="loading">加载中...</div>';

  const subtabs = document.getElementById('lib-subtabs');
  if (type === 'vocab') {
    subtabs.style.display = 'flex';
    subtabs.innerHTML = `
      <button class="lib-subtab active" data-sub="all">全部</button>
      <button class="lib-subtab" data-sub="learning">学习中</button>
      <button class="lib-subtab" data-sub="mastered">已掌握</button>
    `;
  } else if (type === 'errors') {
    subtabs.style.display = 'flex';
    subtabs.innerHTML = `
      <button class="lib-subtab active" data-sub="all">全部</button>
      <button class="lib-subtab" data-sub="grammar">语法</button>
      <button class="lib-subtab" data-sub="pronunciation">发音</button>
    `;
  } else { subtabs.style.display = 'none'; }

  subtabs.querySelectorAll('.lib-subtab').forEach(btn => {
    btn.addEventListener('click', () => {
      subtabs.querySelectorAll('.lib-subtab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _libSub = btn.dataset.sub;
      renderLibContent();
    });
  });

  const table = type === 'vocab' ? 'vocabulary' : type === 'errors' ? 'errors' : 'patterns';
  const { data } = await sb.from(table).select('*').order('created_at', { ascending: false });
  _libData[type] = data || [];
  const countEl = document.getElementById('lib-count-' + type);
  if (countEl) countEl.textContent = _libData[type].length ? `(${_libData[type].length})` : '';
  renderLibContent();
}

function renderLibContent() {
  const content = document.getElementById('library-content');
  const q = (document.getElementById('lib-search').value || '').trim().toLowerCase();
  let items = _libData[_libType] || [];

  if (_libType === 'vocab') {
    if (_libSub === 'learning') items = items.filter(v => { const s = v.status || (v.mastered ? 'mastered' : 'new'); return s === 'new' || s === 'learning'; });
    else if (_libSub === 'mastered') items = items.filter(v => v.status === 'mastered' || v.mastered);
  }
  if (_libType === 'errors' && _libSub !== 'all') items = items.filter(e => e.type === _libSub);

  if (q) {
    items = items.filter(item => {
      return [item.word, item.phonetic, item.meaning, item.example, item.original, item.correction, item.rule, item.better, item.scene]
        .some(f => f && f.toLowerCase().includes(q));
    });
  }

  if (!items.length) {
    const icons = { vocab: '📝', errors: '🔧', patterns: '✨' };
    const labels = { vocab: '导入日报后生成单词库', errors: '导入日报后生成纠错库', patterns: '导入日报后生成句型库' };
    content.innerHTML = q
      ? '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">无匹配结果</div><div class="empty-state-sub">试试其他关键词</div></div>'
      : `<div class="empty-state"><div class="empty-state-icon">${icons[_libType]}</div><div class="empty-state-title">${labels[_libType]}</div><div class="empty-state-sub">和 ChatGPT 练完口语后，<br>粘贴日报到首页即可自动生成</div></div>`;
    return;
  }

  if (_libType === 'vocab') {
    content.innerHTML = items.map((v, i) => vocabCard(v, i)).join('');
  } else if (_libType === 'errors') {
    content.innerHTML = items.map(e => errorCard(e)).join('');
  } else {
    content.innerHTML = items.map(p => patternCard(p)).join('');
  }

  // Bind expand clicks
  content.querySelectorAll('.vocab-card').forEach(card => {
    card.addEventListener('click', function(e) {
      if (e.target.closest('button')) return; // don't toggle on button clicks
      this.classList.toggle('expanded');
    });
  });
}

function vocabCard(v, idx) {
  const s = v.status || (v.mastered ? 'mastered' : 'new');
  const rc = v.review_count || 0;
  const srsHtml = `<div class="srs-dots">${[1,2,3,4,5].map(i => {
    if (s === 'mastered') return '<span class="srs-dot mastered"></span>';
    return `<span class="srs-dot${i <= Math.min(rc, 5) ? ' filled' : ''}"></span>`;
  }).join('')}</div>`;

  const btn = s === 'mastered'
    ? '<span class="badge-status mastered">✅ 已掌握</span>'
    : `<button onclick="markMastered(${v.id});event.stopPropagation();" class="btn-small">复习 +1</button>`;

  const nextRev = v.next_review_date ? ` · 下次: ${v.next_review_date}` : '';

  return `<div class="vocab-card card-animate">
    <div class="card-row"><span class="word">${h(v.word)}</span><span class="phonetic">${h(v.phonetic)}</span></div>
    <div class="meaning">${h(v.meaning)}</div>
    ${v.example ? `<div class="example">💬 ${h(v.example)}</div>` : ''}
    <div class="card-actions">
      ${btn}
      ${srsHtml}
      <span style="font-size:10px;color:var(--text-ultradim);">${rc} 次${nextRev}</span>
      <button onclick="speak('${h(v.word).replace(/'/g, "\\'")}');event.stopPropagation();" class="btn-small">🔊</button>
    </div>
    <div class="card-detail">
      <div class="card-detail-row"><strong>状态：</strong>${statusLabel(s)}</div>
      <div class="card-detail-row"><strong>话题：</strong>${h(v.source_topic || '无')}</div>
      <div class="card-detail-row"><strong>添加：</strong>${v.date_added || ''}</div>
    </div>
  </div>`;
}

function errorCard(e) {
  return `<div class="error-card card-animate">
    <div class="err-type">${e.type === 'grammar' ? '📖 语法' : '🗣️ 发音'}</div>
    <div class="err-orig">${h(e.original)}</div>
    <div class="err-corr">✅ ${h(e.correction)}</div>
    ${e.rule ? `<div class="err-rule">📐 ${h(e.rule)}</div>` : ''}
    <div class="card-actions">
      ${e.correct_in_review ? '<span class="badge-done">已纠正</span>' : `<button onclick="markFixed(${e.id});event.stopPropagation();" class="btn-small">标记已纠正</button>`}
    </div>
  </div>`;
}

function patternCard(p) {
  return `<div class="pattern-card card-animate">
    <div class="pat-orig">${h(p.original)}</div>
    <div class="pat-better">✨ ${h(p.better)}</div>
    ${p.scene ? `<div class="pat-scene">🎬 ${h(p.scene)}</div>` : ''}
  </div>`;
}

// ═══════════════════════════════════════════════════════
// Spaced Repetition
// ═══════════════════════════════════════════════════════
const REVIEW_INTERVALS = [0, 1, 3, 7, 14, 30];

function getNextReviewDate(reviewCount) {
  const days = REVIEW_INTERVALS[Math.min(reviewCount, REVIEW_INTERVALS.length - 1)];
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function statusLabel(status) {
  if (status === 'mastered') return '已掌握';
  if (status === 'learning') return '学习中';
  return '新词';
}

// ═══════════════════════════════════════════════════════
// Actions
// ═══════════════════════════════════════════════════════
async function markMastered(id) {
  const { data } = await sb.from('vocabulary').select('review_count').eq('id', id).single();
  const rc = (data?.review_count || 0) + 1;
  const nextDate = getNextReviewDate(rc);
  const newStatus = rc >= 5 ? 'mastered' : 'learning';
  await sb.from('vocabulary').update({
    mastered: newStatus === 'mastered', status: newStatus,
    review_count: rc, next_review_date: nextDate, last_reviewed_at: new Date().toISOString()
  }).eq('id', id);
  loadLibrary('vocab');
  showToast(rc >= 5 ? '🎉 已掌握！' : `📖 已复习 ${rc} 次，${nextDate} 再复习`);
}

async function markFixed(id) {
  await sb.from('errors').update({ correct_in_review: true }).eq('id', id);
  loadLibrary('errors');
}

// ═══════════════════════════════════════════════════════
// Import Report
// ═══════════════════════════════════════════════════════
async function importReport(text) {
  if (!text) text = document.getElementById('report-input').value.trim();
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

  if (parsed.vocabulary.length) {
    await sb.from('vocabulary').insert(
      parsed.vocabulary.map(v => ({ user_id: uid, word: v.word, phonetic: v.phonetic, meaning: v.meaning, example: v.example, date_added: date, source_topic: topic, status: 'new' }))
    );
  }

  const allErrors = [];
  for (const e of parsed.pronunciation) allErrors.push({ user_id: uid, type: 'pronunciation', original: e.original || '', correction: e.correction || '', date_added: date, source_topic: topic });
  for (const e of parsed.grammar) allErrors.push({ user_id: uid, type: 'grammar', original: e.original || '', correction: e.correction || '', rule: e.rule || '', date_added: date, source_topic: topic });
  if (allErrors.length) await sb.from('errors').insert(allErrors);

  if (parsed.patterns.length) {
    await sb.from('patterns').insert(
      parsed.patterns.map(p => ({ user_id: uid, original: p.original || '', better: p.better || '', scene: p.scene || '', date_added: date, source_topic: topic }))
    );
  }

  await sb.from('reports').upsert({ user_id: uid, date, content: text }, { onConflict: 'user_id,date' });
  await updateProgress(uid, parsed.summary.fluency || 0, parsed.summary.accuracy || 0, parsed.summary.weak_areas, topic, duration);

  document.getElementById('import-result').innerHTML = `<span class="toast-success">✅ 入库完成！单词 ${parsed.vocabulary.length} · 纠错 ${allErrors.length} · 句型 ${parsed.patterns.length}</span>`;
  document.getElementById('report-input').value = '';
  btn.disabled = false; btn.textContent = '解析入库';
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

// ═══════════════════════════════════════════════════════
// Settings
// ═══════════════════════════════════════════════════════
async function loadSettings() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;

  document.getElementById('settings-email').textContent = session.user.email || '---';
  const { data: cfg } = await sb.from('user_config').select('*').eq('user_id', session.user.id).maybeSingle();
  document.getElementById('setting-name').value = cfg?.app_name || 'Voco';

  const { data: prog } = await sb.from('progress').select('*').eq('user_id', session.user.id).maybeSingle();
  const div = document.getElementById('settings-trends');

  if (prog && prog.fluency_trend?.length) {
    const fluencySpark = sparklineSVG(prog.fluency_trend, '#E07B5A');
    const accuracySpark = sparklineSVG(prog.accuracy_trend, '#8BADC5');
    const fDelta = getDelta(prog.fluency_trend);
    const aDelta = getDelta(prog.accuracy_trend);

    // Donut chart for word distribution
    const { data: vocab } = await sb.from('vocabulary').select('status,mastered');
    const mastered = vocab.filter(v => v.status === 'mastered' || v.mastered).length;
    const learning = vocab.filter(v => v.status === 'learning' || (!v.status && !v.mastered && (v.review_count || 0) > 0)).length;
    const newly = vocab.length - mastered - learning;
    const donutHTML = donutChartSVG(newly, learning, mastered, vocab.length);

    // Bar chart for weekly activity
    const weeks = getWeeklyCounts(vocab);

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
      <div class="settings-trend-item" style="display:block;text-align:center;">
        <span class="settings-trend-label" style="display:block;margin-bottom:8px;">🍩 词汇分布</span>
        ${donutHTML}
      </div>
      <div class="settings-trend-item" style="display:block;">
        <span class="settings-trend-label" style="display:block;margin-bottom:8px;">📊 每周新词</span>
        ${weeks}
      </div>
    `;
  } else {
    div.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📈</div><div class="empty-state-title">导入日报后生成趋势</div><div class="empty-state-sub">流利度、准确度、词汇分布一目了然</div></div>';
  }
}

function donutChartSVG(newCount, learning, mastered, total) {
  if (total === 0) return '<div class="donut-wrap"><span style="color:var(--text-ultradim);">暂无数据</span></div>';
  const r = 60, cx = 80, cy = 80, sw = 16;
  const circ = 2 * Math.PI * r;
  const segments = [
    { val: newCount, color: 'var(--blue)', label: '新词' },
    { val: learning, color: 'var(--orange)', label: '学习中' },
    { val: mastered, color: 'var(--green)', label: '已掌握' },
  ].filter(s => s.val > 0);

  let offset = 0;
  let paths = '';
  segments.forEach(s => {
    const len = (s.val / total) * circ;
    const dash = `${len} ${circ - len}`;
    paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}" stroke-dasharray="${dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="butt"/>`;
    offset += len;
  });

  const legend = segments.map(s =>
    `<div class="donut-legend-item"><span class="donut-legend-dot" style="background:${s.color};"></span>${s.label} ${s.val}</div>`
  ).join('');

  return `<div class="donut-wrap">
    <svg viewBox="0 0 160 160">${paths}<text x="80" y="84" text-anchor="middle" font-size="22" font-weight="700" fill="var(--text)">${total}</text><text x="80" y="102" text-anchor="middle" font-size="11" fill="var(--text-dim)">单词</text></svg>
    <div class="donut-legend">${legend}</div>
  </div>`;
}

function getWeeklyCounts(vocab) {
  const weeks = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() - i * 7);
    const start = new Date(d); start.setDate(start.getDate() - 6);
    const endStr = d.toISOString().slice(0, 10);
    const startStr = start.toISOString().slice(0, 10);
    const count = vocab.filter(v => v.date_added >= startStr && v.date_added <= endStr).length;
    const label = `${start.getMonth() + 1}/${start.getDate()}`;
    weeks.push({ label, count });
  }
  const max = Math.max(...weeks.map(w => w.count), 1);
  return `<div class="bar-chart">${weeks.map(w =>
    `<div class="bar-col"><span style="font-size:10px;color:var(--text-ultradim);">${w.count}</span><div class="bar-fill" style="height:${(w.count/max)*80}px;"></div><span class="bar-label">${w.label}</span></div>`
  ).join('')}</div>`;
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
  const h = 32; const pad = 2;
  const max = Math.max(...arr, 1); const min = Math.min(...arr, 0);
  const range = max - min || 1;
  const points = arr.map((v, i) => {
    const x = pad + (i / Math.max(arr.length - 1, 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const lastX = pad + (arr.length - 1) / Math.max(arr.length - 1, 1) * (w - pad * 2);
  const lastY = pad + (1 - (arr[arr.length - 1] - min) / range) * (h - pad * 2);
  return `<svg width="${w}" height="${h}" class="sparkline" viewBox="0 0 ${w} ${h}">
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3" fill="${color}"/>
  </svg>`;
}

// ═══════════════════════════════════════════════════════
// Data Export
// ═══════════════════════════════════════════════════════
async function exportData() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const [vocab, errors, patterns, progress, reports] = await Promise.all([
    sb.from('vocabulary').select('*'),
    sb.from('errors').select('*'),
    sb.from('patterns').select('*'),
    sb.from('progress').select('*').eq('user_id', session.user.id).maybeSingle(),
    sb.from('reports').select('*'),
  ]);
  const json = JSON.stringify({ vocabulary: vocab.data, errors: errors.data, patterns: patterns.data, progress: progress.data, reports: reports.data, exported_at: new Date().toISOString() }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `voco-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 数据已导出');
}

// ═══════════════════════════════════════════════════════
// Clipboard Detection (auto-import prompt)
// ═══════════════════════════════════════════════════════
async function detectClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (text && text.includes('type: daily-report')) {
      showToast('📋 检测到日报，已自动填入');
      document.getElementById('report-input').value = text;
      // Auto-expand import card
      const card = document.getElementById('import-card');
      const body = document.getElementById('import-body');
      body.style.display = 'block';
      card.classList.add('open');
    }
  } catch(e) { /* clipboard not available */ }
}

// ═══════════════════════════════════════════════════════
// Share Target Handler
// ═══════════════════════════════════════════════════════
(function handleShareTarget() {
  const params = new URLSearchParams(window.location.search);
  const sharedText = params.get('text') || params.get('body') || params.get('title');
  if (sharedText && sharedText.includes('type: daily-report')) {
    // Shared from ChatGPT or other app
    checkAuth().then(() => {
      setTimeout(async () => {
        await importReport(sharedText);
        // Clean URL
        window.history.replaceState({}, '', '/');
      }, 500);
    });
  }
})();

// ═══════════════════════════════════════════════════════
// TTS
// ═══════════════════════════════════════════════════════
function speak(text) {
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US'; u.rate = 0.85;
  speechSynthesis.speak(u);
}

// ═══════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════
function h(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast show';
  t.textContent = msg;
  t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:var(--text);color:#fff;padding:10px 20px;border-radius:8px;font-size:14px;z-index:200;box-shadow:0 4px 16px rgba(0,0,0,0.15);';
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 2000);
}

// ═══════════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════════
document.getElementById('btn-login').addEventListener('click', signIn);
document.getElementById('btn-login-email').addEventListener('click', sendMagicLink);
document.getElementById('btn-logout').addEventListener('click', signOut);
document.getElementById('btn-submit').addEventListener('click', () => importReport());
document.getElementById('btn-save-name').addEventListener('click', saveConfig);
document.getElementById('btn-export-data').addEventListener('click', exportData);

// Import toggle
document.getElementById('import-toggle').addEventListener('click', () => {
  const card = document.getElementById('import-card');
  const body = document.getElementById('import-body');
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  card.classList.toggle('open', !open);
});

// GO button
document.getElementById('topic-go-btn').addEventListener('click', () => {
  const importCard = document.getElementById('import-card');
  const importBody = document.getElementById('import-body');
  importBody.style.display = 'block';
  importCard.classList.add('open');
  importCard.scrollIntoView({ behavior: 'smooth' });
  document.getElementById('report-input').focus();
});

// Library search
document.getElementById('lib-search').addEventListener('input', () => renderLibContent());

// Settings logout
document.getElementById('btn-logout-settings').addEventListener('click', signOut);

// Review buttons
document.getElementById('btn-reveal').addEventListener('click', flipCard);
document.getElementById('btn-again').addEventListener('click', () => rateCard('again'));
document.getElementById('btn-good').addEventListener('click', () => rateCard('good'));
document.getElementById('btn-easy').addEventListener('click', () => rateCard('easy'));
document.getElementById('btn-review-done').addEventListener('click', () => { document.querySelector('.tab-bar .tab[data-tab=home]').click(); });

// Auth listener
sb.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') checkAuth();
  if (event === 'SIGNED_OUT') checkAuth();
});

checkAuth();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
