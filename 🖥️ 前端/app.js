// Voco PWA v2.1 — SM-2 · Topics · Shadow Speaking · Dark Mode

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

  const [{ data: vocab }, { data: errors }, { data: prog }, { data: topics }] = await Promise.all([
    sb.from('vocabulary').select('*'),
    sb.from('errors').select('*'),
    sb.from('progress').select('*').eq('user_id', session.user.id).maybeSingle(),
    sb.from('topics').select('*')
  ]);

  const vList = vocab || [];
  const eList = errors || [];
  const tList = topics || [];

  // Stats grid
  document.getElementById('stat-sessions').innerHTML = prog?.total_sessions || '0';
  document.getElementById('stat-vocab').textContent = vList.length;
  document.getElementById('stat-errors').textContent = eList.length;

  // Streak
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

  // Heatmap
  renderHeatmap(vList);

  // Topic selector
  const sel = document.getElementById('topic-select');
  sel.innerHTML = '<option value="">选择话题...</option>' +
    tList.map(t => `<option value="${t.id}">${h(t.title)}</option>`).join('');
  document.getElementById('topic-sub').textContent = tList.length ? `${tList.length} 个话题` : '';

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

function calcStreak(dates) {
  if (!dates.length) return 0;
  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  let check = new Date(today);
  const hasToday = dates.includes(today);
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  const hasYesterday = dates.includes(yStr);
  if (!hasToday && !hasYesterday) return 0;
  if (!hasToday) check = yesterday;
  while (true) {
    const s = check.toISOString().slice(0, 10);
    if (dates.includes(s)) { streak++; check.setDate(check.getDate() - 1); }
    else break;
  }
  return streak;
}

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
  startDate.setDate(startDate.getDate() - startDate.getDay() - (weeks - 1) * 7);

  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

  const heatmap = document.createElement('div');
  heatmap.className = 'heatmap';
  let currentMonth = -1;
  const months = [];

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

  let mlHTML = '<div class="heatmap-months" style="display:flex;">';
  let lastPos = 0;
  months.forEach(m => {
    mlHTML += `<span style="margin-left:${(m.week - lastPos) * 15}px;">${m.label}</span>`;
    lastPos = m.week;
  });
  mlHTML += '</div>';

  label.innerHTML = '📅 练习热力图';
  grid.innerHTML = mlHTML;
  grid.appendChild(heatmap);
  document.querySelector('.calendar-weekdays').style.display = 'none';
}

// ═══════════════════════════════════════════════════════
// Pre-Practice Card (topic selected → show prep)
// ═══════════════════════════════════════════════════════
async function showPrepCard(topicId) {
  if (!topicId) {
    document.getElementById('prep-card').style.display = 'none';
    return;
  }
  const { data: topic } = await sb.from('topics').select('*').eq('id', topicId).single();
  if (!topic) return;

  document.getElementById('prep-title').textContent = topic.title;
  document.getElementById('prep-sub').textContent = topic.description || '';
  document.getElementById('prep-card').style.display = 'block';

  // Related errors (match by source_topic or key terms)
  const { data: errors } = await sb.from('errors').select('*');
  const relatedErrors = (errors || []).filter(e =>
    (e.source_topic && topic.title && e.source_topic.includes(topic.title)) ||
    (topic.key_terms || []).some(kt => (e.original || '').toLowerCase().includes(kt.toLowerCase()))
  ).slice(0, 3);
  document.getElementById('prep-errors').innerHTML = relatedErrors.length
    ? relatedErrors.map(e => `<div class="prep-item">⚠️ ${h(e.original)} → ${h(e.correction)}</div>`).join('')
    : '<div class="prep-item" style="color:var(--text-dim);">暂无相关错误记录</div>';

  // Related vocab
  const { data: vocab } = await sb.from('vocabulary').select('*');
  const relatedVocab = (vocab || []).filter(v =>
    (v.source_topic && topic.title && v.source_topic.includes(topic.title)) ||
    (topic.key_terms || []).some(kt => (v.word || '').toLowerCase().includes(kt.toLowerCase()))
  ).slice(0, 4);
  document.getElementById('prep-vocab').innerHTML = relatedVocab.length
    ? relatedVocab.map(v => `<span class="prep-tag">${h(v.word)}</span>`).join('')
    : '<div class="prep-item" style="color:var(--text-dim);">暂无相关词汇</div>';

  // Challenge
  const challenges = [
    `用英语描述 "${topic.title}" 相关的个人经历`,
    `针对 "${topic.title}" 表达你的观点并给出 3 个理由`,
    `假设你在和朋友讨论 "${topic.title}"，模拟一段 2 分钟对话`,
    `用 "${h(topic.title)}" 为主题做 1 分钟即兴演讲`,
  ];
  const challenge = challenges[Math.floor(Math.random() * challenges.length)];
  document.getElementById('prep-challenge').innerHTML = `<div class="prep-item prep-challenge">💪 ${challenge}</div>`;
}

// ═══════════════════════════════════════════════════════
// SM-2 Spaced Repetition Algorithm
// ═══════════════════════════════════════════════════════
function sm2(easeFactor, interval, repetitions, quality) {
  // quality: 0=again, 3=good, 5=easy
  let ef = easeFactor || 2.5;
  let ivl = interval || 0;
  let reps = repetitions || 0;

  if (quality < 3) {
    // Failed: reset
    reps = 0;
    ivl = 1;
  } else {
    // Passed
    if (reps === 0) {
      ivl = 1;
    } else if (reps === 1) {
      ivl = 6;
    } else {
      ivl = Math.round(ivl * ef);
      if (quality === 5) ivl = Math.round(ivl * 1.3); // easy bonus
    }
    reps += 1;
  }

  // Update ease factor
  ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ef < 1.3) ef = 1.3;

  return { ease_factor: ef, interval: ivl, repetitions: reps };
}

function statusLabel(status) {
  if (status === 'mastered') return '已掌握';
  if (status === 'learning') return '学习中';
  return '新词';
}

// ═══════════════════════════════════════════════════════
// Flashcard Review Mode
// ═══════════════════════════════════════════════════════
let _reviewDeck = [];
let _reviewIdx = 0;
let _reviewResults = [];
let _reviewMode = 'flashcard'; // 'flashcard' | 'shadow'

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

  _reviewIdx = 0; _reviewResults = [];

  // Default to flashcard mode
  switchReviewMode('flashcard');

  if (_reviewDeck.length === 0) {
    document.getElementById('review-empty').style.display = 'block';
    document.getElementById('review-active').style.display = 'none';
    document.getElementById('review-summary').style.display = 'none';
    return;
  }

  document.getElementById('review-empty').style.display = 'none';
  document.getElementById('review-active').style.display = 'block';
  document.getElementById('review-summary').style.display = 'none';
  showCard(0);
}

function switchReviewMode(mode) {
  _reviewMode = mode;
  document.querySelectorAll('.review-mode-tab').forEach(b => b.classList.remove('active'));
  const tab = document.querySelector(`.review-mode-tab[data-mode="${mode}"]`);
  if (tab) tab.classList.add('active');

  document.getElementById('flashcard-mode').style.display = mode === 'flashcard' ? 'block' : 'none';
  document.getElementById('shadow-mode').style.display = mode === 'shadow' ? 'block' : 'none';

  if (mode === 'shadow') {
    // Hide flashcard active / summary
    document.getElementById('review-active').style.display = 'none';
    document.getElementById('review-summary').style.display = 'none';
    document.getElementById('review-empty').style.display = 'none';
    initShadowMode();
  }
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

  // Use SM-2
  const qMap = { 'again': 0, 'good': 3, 'easy': 5 };
  const quality = qMap[rating] || 3;
  const result = sm2(v.ease_factor, v.sm2_interval, v.sm2_repetitions, quality);

  const nextDate = new Date(today);
  nextDate.setDate(nextDate.getDate() + result.interval);
  const status = rating === 'again' ? 'learning' : (result.repetitions >= 5 ? 'mastered' : 'learning');

  await sb.from('vocabulary').update({
    status,
    mastered: status === 'mastered',
    ease_factor: result.ease_factor,
    sm2_interval: result.interval,
    sm2_repetitions: result.repetitions,
    review_count: (v.review_count || 0) + 1,
    next_review_date: nextDate.toISOString().slice(0, 10),
    last_reviewed_at: today.toISOString()
  }).eq('id', v.id);

  _reviewResults.push({ word: v.word, rating });

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
  // Update home data
  loadHome();
}

// ═══════════════════════════════════════════════════════
// Shadow Speaking Mode
// ═══════════════════════════════════════════════════════
let _shadowDeck = [];
let _shadowIdx = 0;

async function initShadowMode() {
  const [{ data: patterns }, { data: vocab }] = await Promise.all([
    sb.from('patterns').select('*'),
    sb.from('vocabulary').select('*').not('example', 'is', null)
  ]);

  _shadowDeck = [];

  // From patterns
  (patterns || []).forEach(p => {
    if (p.better) _shadowDeck.push({ phrase: p.better, context: p.scene || p.original || '', source: 'pattern' });
  });

  // From vocab examples
  (vocab || []).forEach(v => {
    if (v.example) _shadowDeck.push({ phrase: v.example, context: `${v.word}: ${v.meaning || ''}`, source: 'vocab' });
  });

  if (_shadowDeck.length === 0) {
    document.getElementById('shadow-empty').style.display = 'block';
    document.getElementById('shadow-active').style.display = 'none';
    return;
  }

  document.getElementById('shadow-empty').style.display = 'none';
  document.getElementById('shadow-active').style.display = 'block';
  document.getElementById('shadow-summary').style.display = 'none';
  _shadowIdx = 0;
  showShadowPhrase(0);
}

function showShadowPhrase(idx) {
  _shadowIdx = idx;
  const item = _shadowDeck[idx];
  document.getElementById('shadow-progress').textContent = `${idx + 1} / ${_shadowDeck.length}`;
  document.getElementById('shadow-phrase').textContent = item.phrase;
  document.getElementById('shadow-context').textContent = item.context || '';
  document.getElementById('btn-shadow-play').style.display = 'block';
  document.getElementById('btn-shadow-next').style.display = 'none';
  document.getElementById('btn-shadow-repeat').style.display = 'block';
}

function speakShadowPhrase() {
  const item = _shadowDeck[_shadowIdx];
  speak(item.phrase);
  document.getElementById('btn-shadow-play').style.display = 'none';
  document.getElementById('btn-shadow-next').style.display = 'block';
}

function nextShadowPhrase() {
  if (_shadowIdx + 1 < _shadowDeck.length) {
    showShadowPhrase(_shadowIdx + 1);
  } else {
    // Completed
    document.getElementById('shadow-summary').style.display = 'block';
    document.getElementById('shadow-active').style.display = 'none';
  }
}

function restartShadow() {
  _shadowIdx = 0;
  document.getElementById('shadow-summary').style.display = 'none';
  document.getElementById('shadow-active').style.display = 'block';
  showShadowPhrase(0);
}

// ═══════════════════════════════════════════════════════
// Library
// ═══════════════════════════════════════════════════════
let _libData = { vocab: [], errors: [], patterns: [], topics: [] };
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
  } else if (type === 'topics') {
    subtabs.style.display = 'none';
  } else {
    subtabs.style.display = 'none';
  }

  subtabs.querySelectorAll('.lib-subtab').forEach(btn => {
    btn.addEventListener('click', () => {
      subtabs.querySelectorAll('.lib-subtab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _libSub = btn.dataset.sub;
      renderLibContent();
    });
  });

  const tableMap = { vocab: 'vocabulary', errors: 'errors', patterns: 'patterns', topics: 'topics' };
  const table = tableMap[type];
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
      return [item.word, item.phonetic, item.meaning, item.example, item.original, item.correction, item.rule, item.better, item.scene, item.title, item.description]
        .some(f => f && f.toLowerCase().includes(q));
    });
  }

  if (!items.length) {
    const icons = { vocab: '📝', errors: '🔧', patterns: '✨', topics: '💬' };
    const labels = { vocab: '导入日报后生成单词库', errors: '导入日报后生成纠错库', patterns: '导入日报后生成句型库', topics: '还没添加话题' };
    content.innerHTML = q
      ? '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">无匹配结果</div><div class="empty-state-sub">试试其他关键词</div></div>'
      : `<div class="empty-state"><div class="empty-state-icon">${icons[_libType]}</div><div class="empty-state-title">${labels[_libType]}</div><div class="empty-state-sub">${_libType === 'topics' ? '通过首页导入卡片添加话题' : '和 ChatGPT 练完口语后，<br>粘贴日报到首页即可自动生成'}</div></div>`;
    return;
  }

  if (_libType === 'vocab') {
    content.innerHTML = items.map((v, i) => vocabCard(v, i)).join('');
  } else if (_libType === 'errors') {
    content.innerHTML = items.map(e => errorCard(e)).join('');
  } else if (_libType === 'patterns') {
    content.innerHTML = items.map(p => patternCard(p)).join('');
  } else if (_libType === 'topics') {
    content.innerHTML = items.map(t => topicCard(t)).join('');
  }

  // Bind expand clicks
  content.querySelectorAll('.vocab-card').forEach(card => {
    card.addEventListener('click', function(e) {
      if (e.target.closest('button')) return;
      this.classList.toggle('expanded');
    });
  });

  // Topic select button bindings
  content.querySelectorAll('.topic-select-btn').forEach(btn => {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation();
      const tid = parseInt(this.dataset.topicId);
      document.getElementById('topic-select').value = tid;
      await showPrepCard(tid);
      document.querySelector('.tab-bar .tab[data-tab=home]').click();
    });
  });

  content.querySelectorAll('.topic-delete-btn').forEach(btn => {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation();
      const tid = parseInt(this.dataset.topicId);
      if (!confirm('删除这个话题？')) return;
      await sb.from('topics').delete().eq('id', tid);
      loadLibrary('topics');
      loadHome();
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

function topicCard(t) {
  const count = t.practice_count || 0;
  return `<div class="topic-card-item card-animate">
    <div class="topic-card-header">
      <div class="topic-card-title">${h(t.title)}</div>
      <div class="topic-card-actions">
        <button class="btn-small topic-select-btn" data-topic-id="${t.id}">🎯 选择</button>
        <button class="btn-small topic-delete-btn" data-topic-id="${t.id}" style="color:var(--red);">🗑</button>
      </div>
    </div>
    ${t.description ? `<div class="topic-card-desc">${h(t.description)}</div>` : ''}
    <div class="topic-card-meta">
      <span>练习 ${count} 次</span>
      ${t.last_practiced_at ? `<span> · 上次 ${new Date(t.last_practiced_at).toLocaleDateString('zh-CN')}</span>` : ''}
      ${t.source_url ? `<a href="${h(t.source_url)}" target="_blank" onclick="event.stopPropagation();" style="color:var(--blue);font-size:11px;">🔗 来源</a>` : ''}
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════
// Actions
// ═══════════════════════════════════════════════════════
async function markMastered(id) {
  const { data } = await sb.from('vocabulary').select('*').eq('id', id).single();
  const v = data;
  const result = sm2(v.ease_factor, v.sm2_interval, v.sm2_repetitions, 3);
  const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + result.interval);
  const status = result.repetitions >= 5 ? 'mastered' : 'learning';
  await sb.from('vocabulary').update({
    mastered: status === 'mastered', status,
    ease_factor: result.ease_factor, sm2_interval: result.interval, sm2_repetitions: result.repetitions,
    review_count: (v.review_count || 0) + 1, next_review_date: nextDate.toISOString().slice(0, 10),
    last_reviewed_at: new Date().toISOString()
  }).eq('id', id);
  loadLibrary('vocab');
  showToast(status === 'mastered' ? '🎉 已掌握！' : `📖 已复习 · ${nextDate.toISOString().slice(0, 10)} 再复习`);
}

async function markFixed(id) {
  await sb.from('errors').update({ correct_in_review: true }).eq('id', id);
  loadLibrary('errors');
}

// ═══════════════════════════════════════════════════════
// Template System & Import
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

## 今日生词
- word | /ˈfəʊnɛtɪk/ | 释义 | 例句

## 表现总结
- 流利度: X/10
- 准确度: X/10
- 需要加强: [需要加强的方面]`,

  topic: `请为以下内容生成 Voco 话题卡：

[在此粘贴视频描述、文章内容或链接]

---
type: topic-card
title: [话题标题]
description: [简短描述]
---

## 关键术语
- term | definition | example sentence
- term | definition | example sentence

## 讨论问题
- question 1
- question 2
- question 3

## 相关表达
- expression | meaning | usage context`,

  insight: `请分析以下 Voco 日报数据，找出我的口语弱点模式：

[在此粘贴最近的日报数据]

---
type: insight-report
---

## 反复出现的问题
- [问题模式] | [出现频率] | [典型例句]

## 根本原因
- [根本原因分析]

## 改进建议
- [具体练习建议]
- [推荐的练习话题或材料]`
};

function copyTemplate(type) {
  const text = TEMPLATES[type];
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast('📋 已复制！粘贴到 ChatGPT 使用');
  }).catch(() => {
    // Fallback for insecure context
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('📋 已复制！粘贴到 ChatGPT 使用');
  });
}

async function importReport(text) {
  if (!text) text = document.getElementById('report-input').value.trim();
  if (!text) return;

  const btn = document.getElementById('btn-submit');
  btn.disabled = true; btn.textContent = '解析中...';

  const parsed = parseReport(text);
  // If daily report
  if (parsed.meta && parsed.meta.type === 'daily-report' || Object.keys(parsed.meta).length > 0) {
    await importDailyReport(parsed);
  }
  // If topic card
  else if (parsed.meta && parsed.meta.type === 'topic-card') {
    await importTopicCard(parsed);
  }
  // If insight report
  else if (parsed.meta && parsed.meta.type === 'insight-report') {
    await importInsightReport(parsed);
  }
  else {
    document.getElementById('import-result').innerHTML = '<span class="toast-error">❌ 无法识别内容格式</span>';
    btn.disabled = false; btn.textContent = '解析入库';
    return;
  }

  document.getElementById('report-input').value = '';
  btn.disabled = false; btn.textContent = '解析入库';
  loadHome();
}

async function importDailyReport(parsed) {
  const { data: { session } } = await sb.auth.getSession();
  const uid = session.user.id;
  const date = parsed.meta.date || new Date().toISOString().slice(0, 10);
  const topic = parsed.meta.topic || '';
  const duration = parseInt(parsed.meta.duration) || 0;

  if (parsed.vocabulary.length) {
    await sb.from('vocabulary').insert(
      parsed.vocabulary.map(v => ({
        user_id: uid, word: v.word, phonetic: v.phonetic, meaning: v.meaning,
        example: v.example, date_added: date, source_topic: topic, status: 'new'
      }))
    );
  }

  const allErrors = [];
  for (const e of parsed.pronunciation) {
    allErrors.push({
      user_id: uid, type: 'pronunciation', original: e.original || '', correction: e.correction || '',
      date_added: date, source_topic: topic, error_pattern: detectErrorPattern(e.original, e.correction)
    });
  }
  for (const e of parsed.grammar) {
    allErrors.push({
      user_id: uid, type: 'grammar', original: e.original || '', correction: e.correction || '',
      rule: e.rule || '', date_added: date, source_topic: topic, error_pattern: detectErrorPattern(e.original, e.correction)
    });
  }
  if (allErrors.length) await sb.from('errors').insert(allErrors);

  if (parsed.patterns.length) {
    await sb.from('patterns').insert(
      parsed.patterns.map(p => ({
        user_id: uid, original: p.original || '', better: p.better || '',
        scene: p.scene || '', date_added: date, source_topic: topic
      }))
    );
  }

  await sb.from('reports').upsert({ user_id: uid, date, content: parsed.raw }, { onConflict: 'user_id,date' });
  await updateProgress(uid, parsed.summary.fluency || 0, parsed.summary.accuracy || 0, parsed.summary.weak_areas, topic, duration);

  // Update topic practice count
  if (topic) {
    const { data: existingTopic } = await sb.from('topics').select('id').eq('title', topic).maybeSingle();
    if (existingTopic) {
      await sb.from('topics').update({
        practice_count: sb.raw('practice_count + 1'),
        last_practiced_at: new Date().toISOString()
      }).eq('id', existingTopic.id);
    }
  }

  document.getElementById('import-result').innerHTML = `<span class="toast-success">✅ 入库完成！单词 ${parsed.vocabulary.length} · 纠错 ${allErrors.length} · 句型 ${parsed.patterns.length}</span>`;
}

async function importTopicCard(parsed) {
  const { data: { session } } = await sb.auth.getSession();
  const uid = session.user.id;

  const title = parsed.meta.title || '未命名话题';
  const description = parsed.meta.description || '';
  const sourceUrl = parsed.meta.source_url || '';

  // Extract key terms from topic card content
  const keyTerms = (parsed.vocabulary || []).map(v => v.word).filter(Boolean);

  const { data: topic } = await sb.from('topics').insert([{
    user_id: uid, title, description, source_url: sourceUrl,
    source_type: 'chatgpt', key_terms: keyTerms, notes: ''
  }]).select().single();

  // If vocabulary was included in the topic card, import it too
  if (parsed.vocabulary.length && topic) {
    await sb.from('vocabulary').insert(
      parsed.vocabulary.map(v => ({
        user_id: uid, word: v.word, phonetic: v.phonetic || '', meaning: v.meaning || '',
        example: v.example || '', date_added: new Date().toISOString().slice(0, 10),
        source_topic: title, status: 'new'
      }))
    );
  }

  document.getElementById('import-result').innerHTML = `<span class="toast-success">✅ 话题「${h(title)}」已添加！词汇 ${parsed.vocabulary.length} 个</span>`;
  loadHome();
}

async function importInsightReport(parsed) {
  // Insight reports update error patterns
  const { data: { session } } = await sb.auth.getSession();
  const uid = session.user.id;

  // Store the insight as notes or a report
  await sb.from('reports').upsert({
    user_id: uid,
    date: new Date().toISOString().slice(0, 10),
    content: parsed.raw
  }, { onConflict: 'user_id,date' });

  document.getElementById('import-result').innerHTML = '<span class="toast-success">✅ 分析报告已保存！可在设置页查看</span>';
}

function detectErrorPattern(original, correction) {
  if (!original || !correction) return '';
  const patterns = [];

  // Article errors
  if (/\b(a|an|the)\b/i.test(original) && /\b(a|an|the)\b/i.test(correction)) {
    if (original.replace(/\b(a|an|the)\b/gi, '') !== correction.replace(/\b(a|an|the)\b/gi, ''))
      patterns.push('冠词');
  }
  // Tense errors
  if (/(ed|ing|was|were|have|has|had|will)\b/i.test(original) || /(ed|ing|was|were|have|has|had|will)\b/i.test(correction))
    patterns.push('时态');
  // Preposition
  if (/\b(in|on|at|for|to|of|with|by|from)\b/i.test(correction) && original.replace(/\b(in|on|at|for|to|of|with|by|from)\b/gi, '') === correction.replace(/\b(in|on|at|for|to|of|with|by|from)\b/gi, ''))
    patterns.push('介词');
  // Word order
  const oWords = original.toLowerCase().split(/\s+/).sort().join(' ');
  const cWords = correction.toLowerCase().split(/\s+/).sort().join(' ');
  if (oWords === cWords && original !== correction) patterns.push('语序');
  // Singular/plural
  if (/(s|es)\b/i.test(original) !== /(s|es)\b/i.test(correction)) patterns.push('单复数');
  // Pronunciation specific
  if (original.length < 20 && !original.includes(' ')) patterns.push('发音');

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

  // Load trends
  const [{ data: prog }, { data: vocab }, { data: errors }] = await Promise.all([
    sb.from('progress').select('*').eq('user_id', session.user.id).maybeSingle(),
    sb.from('vocabulary').select('*'),
    sb.from('errors').select('*')
  ]);

  const vList = vocab || [];
  const eList = errors || [];
  const div = document.getElementById('settings-trends');

  if (prog && prog.fluency_trend?.length) {
    const fluencySpark = sparklineSVG(prog.fluency_trend, '#E07B5A');
    const accuracySpark = sparklineSVG(prog.accuracy_trend, '#8BADC5');
    const fDelta = getDelta(prog.fluency_trend);
    const aDelta = getDelta(prog.accuracy_trend);

    const mastered = vList.filter(v => v.status === 'mastered' || v.mastered).length;
    const learning = vList.filter(v => v.status === 'learning' || (!v.status && !v.mastered && (v.review_count || 0) > 0)).length;
    const newly = vList.length - mastered - learning;
    const donutHTML = donutChartSVG(newly, learning, mastered, vList.length);

    const weeks = getWeeklyCounts(vList);

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

    // Error pattern analysis
    if (eList.length > 0) {
      showErrorPatterns(eList);
    } else {
      document.getElementById('error-patterns-group').style.display = 'none';
    }
  } else {
    div.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📈</div><div class="empty-state-title">导入日报后生成趋势</div><div class="empty-state-sub">流利度、准确度、词汇分布一目了然</div></div>';
    document.getElementById('error-patterns-group').style.display = 'none';
  }
}

function showErrorPatterns(errors) {
  document.getElementById('error-patterns-group').style.display = 'block';
  const epDiv = document.getElementById('error-patterns');

  // Count by pattern
  const patternCount = {};
  errors.forEach(e => {
    const patterns = (e.error_pattern || '其他').split(',').map(s => s.trim()).filter(Boolean);
    patterns.forEach(p => { patternCount[p] = (patternCount[p] || 0) + 1; });
  });

  const sorted = Object.entries(patternCount).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;

  // Count by type
  const grammarCount = errors.filter(e => e.type === 'grammar').length;
  const pronCount = errors.filter(e => e.type === 'pronunciation').length;

  // Recent trend (last 10 errors or fewer)
  const recent = errors.slice(-10);
  const fixedCount = errors.filter(e => e.correct_in_review).length;
  const fixRate = errors.length > 0 ? Math.round((fixedCount / errors.length) * 100) : 0;

  epDiv.innerHTML = `
    <div class="ep-summary">
      <div class="ep-stat"><strong>${errors.length}</strong> 个错误</div>
      <div class="ep-stat"><strong>${fixRate}%</strong> 已纠正</div>
      <div class="ep-stat"><strong>${grammarCount}</strong> 语法 · <strong>${pronCount}</strong> 发音</div>
    </div>
    <div class="ep-patterns">
      <div class="ep-label">高频错误模式</div>
      ${sorted.map(([name, count]) => `
        <div class="ep-row">
          <span class="ep-name">${name}</span>
          <div class="ep-bar-wrap"><div class="ep-bar" style="width:${(count/max)*100}%;"></div></div>
          <span class="ep-count">${count}次</span>
        </div>
      `).join('')}
    </div>
    <div class="ep-tip">💡 建议优先练习 <strong>${sorted[0]?.[0] || '无'}</strong> 类型的错误</div>
  `;
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
// Dark Mode Toggle
// ═══════════════════════════════════════════════════════
function initTheme() {
  const saved = localStorage.getItem('voco-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = saved ? saved === 'dark' : prefersDark;
  applyTheme(isDark);
}

function applyTheme(isDark) {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.getElementById('theme-label').textContent = isDark ? '开' : '关';
  // Update meta theme-color
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = isDark ? '#1E1E2E' : '#FBF7F0';
  localStorage.setItem('voco-theme', isDark ? 'dark' : 'light');
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  applyTheme(!isDark);
}

// ═══════════════════════════════════════════════════════
// Data Export
// ═══════════════════════════════════════════════════════
async function exportData() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const [vocab, errors, patterns, progress, reports, topics] = await Promise.all([
    sb.from('vocabulary').select('*'),
    sb.from('errors').select('*'),
    sb.from('patterns').select('*'),
    sb.from('progress').select('*').eq('user_id', session.user.id).maybeSingle(),
    sb.from('reports').select('*'),
    sb.from('topics').select('*'),
  ]);
  const json = JSON.stringify({
    vocabulary: vocab.data, errors: errors.data, patterns: patterns.data,
    progress: progress.data, reports: reports.data, topics: topics.data,
    exported_at: new Date().toISOString()
  }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `voco-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 数据已导出');
}

// ═══════════════════════════════════════════════════════
// Clipboard Detection
// ═══════════════════════════════════════════════════════
async function detectClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (text && (text.includes('type: daily-report') || text.includes('type: topic-card') || text.includes('type: insight-report'))) {
      showToast('📋 检测到 Voco 内容，已自动填入');
      document.getElementById('report-input').value = text;
      const body = document.getElementById('import-body');
      body.style.display = 'block';
      document.getElementById('import-card').classList.add('open');
    }
  } catch(e) { /* clipboard not available */ }
}

// ═══════════════════════════════════════════════════════
// Share Target Handler
// ═══════════════════════════════════════════════════════
(function handleShareTarget() {
  const params = new URLSearchParams(window.location.search);
  const sharedText = params.get('text') || params.get('body') || params.get('title');
  if (sharedText && (sharedText.includes('type: daily-report') || sharedText.includes('type: topic-card') || sharedText.includes('type: insight-report'))) {
    checkAuth().then(() => {
      setTimeout(async () => {
        await importReport(sharedText);
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
  t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:var(--text);color:var(--bg);padding:10px 20px;border-radius:8px;font-size:14px;z-index:200;box-shadow:0 4px 16px rgba(0,0,0,0.2);pointer-events:none;';
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.3s'; setTimeout(() => t.remove(), 300); }, 2000);
}

// ═══════════════════════════════════════════════════════
// Init — bind all event listeners
// ═══════════════════════════════════════════════════════
document.getElementById('btn-login').addEventListener('click', signIn);
document.getElementById('btn-login-email').addEventListener('click', sendMagicLink);
document.getElementById('btn-logout').addEventListener('click', signOut);
document.getElementById('btn-submit').addEventListener('click', () => importReport());
document.getElementById('btn-save-name').addEventListener('click', saveConfig);
document.getElementById('btn-export-data').addEventListener('click', exportData);
document.getElementById('btn-logout-settings').addEventListener('click', signOut);

// Import toggle
document.getElementById('import-toggle').addEventListener('click', () => {
  const card = document.getElementById('import-card');
  const body = document.getElementById('import-body');
  const open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'block';
  card.classList.toggle('open', !open);
});

// Template buttons
document.querySelectorAll('.tpl-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    copyTemplate(btn.dataset.tpl);
    // Auto-expand import card
    const body = document.getElementById('import-body');
    body.style.display = 'block';
    document.getElementById('import-card').classList.add('open');
  });
});

// Topic selector → prep card
document.getElementById('topic-select').addEventListener('change', function() {
  showPrepCard(this.value);
});

// Topic GO button
document.getElementById('topic-go-btn').addEventListener('click', () => {
  const topicId = document.getElementById('topic-select').value;
  if (!topicId) {
    showToast('请先选择一个话题');
    return;
  }
  // Open import card for post-practice report
  const body = document.getElementById('import-body');
  body.style.display = 'block';
  document.getElementById('import-card').classList.add('open');
  showToast('🎯 开始和 ChatGPT 练习吧！');
});

// Prep card close
document.getElementById('prep-close').addEventListener('click', () => {
  document.getElementById('prep-card').style.display = 'none';
  document.getElementById('topic-select').value = '';
});

// Library search
document.getElementById('lib-search').addEventListener('input', () => renderLibContent());

// Review mode tabs
document.querySelectorAll('.review-mode-tab').forEach(btn => {
  btn.addEventListener('click', () => switchReviewMode(btn.dataset.mode));
});

// Review buttons — flashcard
document.getElementById('btn-reveal').addEventListener('click', flipCard);
document.getElementById('btn-again').addEventListener('click', () => rateCard('again'));
document.getElementById('btn-good').addEventListener('click', () => rateCard('good'));
document.getElementById('btn-easy').addEventListener('click', () => rateCard('easy'));
document.getElementById('btn-review-done').addEventListener('click', () => {
  document.querySelector('.tab-bar .tab[data-tab=home]').click();
});

// Review buttons — shadow
document.getElementById('btn-shadow-start').addEventListener('click', initShadowMode);
document.getElementById('btn-shadow-play').addEventListener('click', speakShadowPhrase);
document.getElementById('btn-shadow-next').addEventListener('click', nextShadowPhrase);
document.getElementById('btn-shadow-repeat').addEventListener('click', () => speakShadowPhrase());
document.getElementById('btn-shadow-done').addEventListener('click', restartShadow);

// Theme toggle
document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);

// Init theme
initTheme();

// Auth listener
sb.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') checkAuth();
  if (event === 'SIGNED_OUT') checkAuth();
});

checkAuth();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
