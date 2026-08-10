// Voco PWA v2.2 — LingoTrace-style UX

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
  APP_NAME = name; document.querySelector('.app-title').textContent = APP_NAME; document.title = APP_NAME;
  showToast('已保存！');
}

// ═══════════════════════════════════════════════════════
// Home Dashboard — LingoTrace-style
// ═══════════════════════════════════════════════════════
async function loadHome() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;

  const [{ data: vocab }, { data: errors }, { data: prog }, { data: reports }, { data: patterns }, { data: topics }] = await Promise.all([
    sb.from('vocabulary').select('*'),
    sb.from('errors').select('*'),
    sb.from('progress').select('*').eq('user_id', session.user.id).maybeSingle(),
    sb.from('reports').select('*').order('date', { ascending: false }).limit(1),
    sb.from('patterns').select('*'),
    sb.from('topics').select('*').order('created_at', { ascending: false })
  ]);

  const vList = vocab || [];
  const eList = errors || [];
  const pList = patterns || [];
  const tList = topics || [];
  const latestReport = (reports || [])[0];

  // Stats grid
  document.getElementById('stat-sessions').textContent = prog?.total_sessions || '0';
  document.getElementById('stat-vocab').textContent = vList.length;
  document.getElementById('stat-errors').textContent = eList.length;
  const dates = [...new Set(vList.map(v => v.date_added).filter(Boolean))].sort().reverse();
  const streak = calcStreak(dates);
  document.getElementById('stat-streak').innerHTML = `<span class="streak-flame">🔥</span>${streak}`;

  // Populate topic selector
  const topicSel = document.getElementById('topic-select');
  if (topicSel) {
    topicSel.innerHTML = '<option value="">选择话题...</option>' +
      tList.map(t => `<option value="${t.id}">${h(t.title)}</option>`).join('');
  }

  // Decide what to show: daily report, topic preview, or practice flow
  // Only show daily report if content is actually a daily report (not topic card etc.)
  const isDailyReport = latestReport?.content && (
    latestReport.content.includes('type: daily-report') ||
    latestReport.content.includes('## 语法纠正') ||
    latestReport.content.includes('## 发音纠正') ||
    latestReport.content.includes('## 今日生词') ||
    latestReport.content.includes('## 表现总结')
  );
  const hasReport = !!(latestReport && isDailyReport);
  const hasTopics = tList.length > 0;

  if (hasReport) {
    document.getElementById('daily-report').style.display = 'block';
    document.getElementById('topic-preview').style.display = 'none';
    document.getElementById('practice-flow').style.display = 'none';
    renderDailyReport(latestReport, vList, eList, pList, prog);
  } else {
    document.getElementById('daily-report').style.display = 'none';
    document.getElementById('topic-preview').style.display = 'none';
    document.getElementById('practice-flow').style.display = 'block';
    renderFlowStep();
  }

  // Heatmap
  renderHeatmap(vList);
}

// Render daily report in LingoTrace format
function renderDailyReport(report, vocab, errors, patterns, progress) {
  // Parse the report content to extract sections
  const parsed = parseReport(report.content);
  const date = parsed.meta.date || report.date || '';
  const topic = parsed.meta.topic || '';

  // Header
  document.getElementById('dr-topic').textContent = topic || '练习';
  const dur = parsed.meta.duration || (progress?.total_minutes || 0);
  const fluency = parsed.summary.fluency || 0;
  const accuracy = parsed.summary.accuracy || 0;
  document.getElementById('dr-duration').textContent = dur ? `⏱️ ${dur} 分钟` : '';
  document.getElementById('dr-scores').innerHTML = fluency ? `<span>流利度 ${fluency}/10</span> · <span>准确度 ${accuracy}/10</span>` : '';

  // Corrective Feedback
  const allErrors = [...(parsed.grammar || []), ...(parsed.pronunciation || [])];
  const fbSection = document.getElementById('dr-feedback-section');
  const fbDiv = document.getElementById('dr-feedback');
  if (allErrors.length) {
    fbSection.style.display = 'block';
    fbDiv.innerHTML = allErrors.map(e =>
      `<div class="dr-feedback-item">
        <button class="dr-play-btn" onclick="speak('${h(e.original || '').replace(/'/g, "\\'")}');event.stopPropagation();">🔊</button>
        <span class="dr-orig">${h(e.original)}</span>
        <span class="dr-arrow">→</span>
        <span class="dr-corr">${h(e.correction)}</span>
        ${e.rule ? `<span style="font-size:10px;color:var(--text-ultradim);margin-left:4px;">(${h(e.rule)})</span>` : ''}
      </div>`
    ).join('');
  } else { fbSection.style.display = 'none'; }

  // Better Expressions
  const exprSection = document.getElementById('dr-expressions-section');
  const exprDiv = document.getElementById('dr-expressions');
  if (parsed.patterns.length) {
    exprSection.style.display = 'block';
    exprDiv.innerHTML = parsed.patterns.map(p =>
      `<div class="dr-expression-item">
        <div class="dr-orig">${h(p.original)}</div>
        <div class="dr-better">✨ ${h(p.better)}</div>
        ${p.scene ? `<div style="font-size:11px;color:var(--text-ultradim);">🎬 ${h(p.scene)}</div>` : ''}
      </div>`
    ).join('');
  } else { exprSection.style.display = 'none'; }

  // Key Vocabulary
  const vocabSection = document.getElementById('dr-vocab-section');
  const vocabDiv = document.getElementById('dr-vocab');
  if (parsed.vocabulary.length) {
    vocabSection.style.display = 'block';
    vocabDiv.innerHTML = parsed.vocabulary.map(v =>
      `<div class="dr-vocab-item">
        <span class="dr-word">${h(v.word)}</span>
        <span class="dr-phonetic">${h(v.phonetic)}</span>
        <span class="dr-meaning">${h(v.meaning)}</span>
        ${v.example ? `<span class="dr-example">💬 ${h(v.example)}</span>` : ''}
      </div>`
    ).join('');
  } else { vocabSection.style.display = 'none'; }

  // Summary
  document.getElementById('dr-summary').innerHTML = `
    <div class="dr-summary-item"><span class="dr-score">${fluency}</span>/10 流利度</div>
    <div class="dr-summary-item"><span class="dr-score">${accuracy}</span>/10 准确度</div>
  `;
}

// Topic Preview — show full topic info
async function showTopicPreview(topicId) {
  if (!topicId) return;
  const { data: topic } = await sb.from('topics').select('*').eq('id', topicId).single();
  if (!topic) return;

  document.getElementById('daily-report').style.display = 'none';
  document.getElementById('topic-preview').style.display = 'block';
  document.getElementById('home-cta').style.display = 'none';

  document.getElementById('tp-title').textContent = topic.title;
  document.getElementById('tp-desc').textContent = topic.description || '';

  // Key terms (from related vocabulary or key_terms field)
  const { data: relatedVocab } = await sb.from('vocabulary').select('*')
    .or(topic.key_terms.map(kt => `word.ilike.%${kt}%`).join(',') + `,source_topic.ilike.%${topic.title}%`)
    .limit(8);

  const termsSection = document.getElementById('tp-terms-section');
  const termsDiv = document.getElementById('tp-terms');
  const terms = (topic.key_terms || []).slice(0, 8);
  if (terms.length || (relatedVocab || []).length) {
    termsSection.style.display = 'block';
    if (relatedVocab && relatedVocab.length) {
      termsDiv.innerHTML = relatedVocab.map(v =>
        `<div class="tp-term-item">
          <span class="tp-term-word">${h(v.word)}</span>
          <span class="tp-term-phonetic">${h(v.phonetic)}</span>
          <span class="tp-term-meaning">${h(v.meaning)}</span>
          ${v.example ? `<span class="tp-term-example">💬 ${h(v.example)}</span>` : ''}
        </div>`
      ).join('');
    } else if (terms.length) {
      termsDiv.innerHTML = terms.map(t =>
        `<div class="tp-term-item"><span class="tp-term-word">${h(t)}</span></div>`
      ).join('');
    }
  } else { termsSection.style.display = 'none'; }

  // Discussion questions
  const questionsSection = document.getElementById('tp-questions-section');
  const questionsDiv = document.getElementById('tp-questions');
  const questions = generateQuestions(topic);
  questionsSection.style.display = 'block';
  questionsDiv.innerHTML = questions.map((q, i) =>
    `<div class="tp-question-item"><span class="tp-question-num">${i + 1}.</span><span>${h(q)}</span></div>`
  ).join('');

  // Useful expressions (from notes or related patterns)
  const exprSection = document.getElementById('tp-expressions-section');
  const exprDiv = document.getElementById('tp-expressions');
  const notes = topic.notes || '';
  if (notes) {
    exprSection.style.display = 'block';
    const lines = notes.split('\n').filter(Boolean);
    exprDiv.innerHTML = lines.map(l =>
      `<div class="tp-expression-item"><div class="dr-better">${h(l)}</div></div>`
    ).join('');
  } else {
    // Show some related patterns as expressions
    const { data: relPatterns } = await sb.from('patterns').select('*')
      .or(`source_topic.ilike.%${topic.title}%`)
      .limit(4);
    if (relPatterns && relPatterns.length) {
      exprSection.style.display = 'block';
      exprDiv.innerHTML = relPatterns.map(p =>
        `<div class="tp-expression-item"><div class="dr-better">${h(p.better)}</div><div class="dr-orig">代替: ${h(p.original)}</div></div>`
      ).join('');
    } else {
      exprSection.style.display = 'none';
    }
  }

  // Save selected topic ID
  document.getElementById('tp-start-btn').dataset.topicId = topicId;
}

function hideTopicPreview() {
  document.getElementById('topic-preview').style.display = 'none';
  document.getElementById('home-cta').style.display = 'block';
  document.getElementById('topic-select').value = '';
}

function generateQuestions(topic) {
  const title = topic.title || 'this topic';
  const desc = topic.description || '';
  const base = [
    `What's your experience with ${title}?`,
    `What do you think are the biggest challenges related to ${title}?`,
    `How has your perspective on ${title} changed over time?`,
    `If you could change one thing about ${title}, what would it be?`,
  ];
  return base;
}

// ═══════════════════════════════════════════════════════
// Heatmap
// ═══════════════════════════════════════════════════════
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
  const weeks = 14; // shorter for mobile
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - startDate.getDay() - (weeks - 1) * 7);

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
    }
    heatmap.appendChild(col);
  }

  label.textContent = '📅 练习热力图 ▾';
  grid.appendChild(heatmap);
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

// ═══════════════════════════════════════════════════════
// SM-2 Spaced Repetition Algorithm
// ═══════════════════════════════════════════════════════
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
let _reviewMode = 'flashcard';

async function loadReview() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const today = new Date().toISOString().slice(0, 10);
  const { data: vocab } = await sb.from('vocabulary').select('*');
  _reviewDeck = (vocab || [])
    .filter(v => { if (v.status === 'mastered' || v.mastered) return false; if (!v.next_review_date) return true; return v.next_review_date <= today; })
    .sort((a, b) => (a.next_review_date || '0000') < (b.next_review_date || '0000') ? -1 : 1);
  _reviewIdx = 0; _reviewResults = [];
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
  if (_reviewIdx + 1 < _reviewDeck.length) { showCard(_reviewIdx + 1); } else { endReview(); }
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
  loadHome();
}

// ═══════════════════════════════════════════════════════
// Shadow Speaking
// ═══════════════════════════════════════════════════════
let _shadowDeck = []; let _shadowIdx = 0;

async function initShadowMode() {
  const [{ data: patterns }, { data: vocab }] = await Promise.all([
    sb.from('patterns').select('*'), sb.from('vocabulary').select('*').not('example', 'is', null)
  ]);
  _shadowDeck = [];
  (patterns || []).forEach(p => { if (p.better) _shadowDeck.push({ phrase: p.better, context: p.scene || p.original || '', source: 'pattern' }); });
  (vocab || []).forEach(v => { if (v.example) _shadowDeck.push({ phrase: v.example, context: `${v.word}: ${v.meaning || ''}`, source: 'vocab' }); });
  if (_shadowDeck.length === 0) { document.getElementById('shadow-empty').style.display = 'block'; document.getElementById('shadow-active').style.display = 'none'; return; }
  document.getElementById('shadow-empty').style.display = 'none';
  document.getElementById('shadow-active').style.display = 'block';
  document.getElementById('shadow-summary').style.display = 'none';
  _shadowIdx = 0; showShadowPhrase(0);
}
function showShadowPhrase(idx) {
  _shadowIdx = idx; const item = _shadowDeck[idx];
  document.getElementById('shadow-progress').textContent = `${idx + 1} / ${_shadowDeck.length}`;
  document.getElementById('shadow-phrase').textContent = item.phrase;
  document.getElementById('shadow-context').textContent = item.context || '';
  document.getElementById('btn-shadow-play').style.display = 'block';
  document.getElementById('btn-shadow-next').style.display = 'none';
}
function speakShadowPhrase() { speak(_shadowDeck[_shadowIdx].phrase); document.getElementById('btn-shadow-play').style.display = 'none'; document.getElementById('btn-shadow-next').style.display = 'block'; }
function nextShadowPhrase() { if (_shadowIdx + 1 < _shadowDeck.length) { showShadowPhrase(_shadowIdx + 1); } else { document.getElementById('shadow-summary').style.display = 'block'; document.getElementById('shadow-active').style.display = 'none'; } }
function restartShadow() { _shadowIdx = 0; document.getElementById('shadow-summary').style.display = 'none'; document.getElementById('shadow-active').style.display = 'block'; showShadowPhrase(0); }

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
    // Source-based filtering like LingoTrace
    subtabs.style.display = 'flex';
    const { data: vocab } = await sb.from('vocabulary').select('source_topic').not('source_topic', 'is', null);
    const sources = [...new Set((vocab || []).map(v => v.source_topic).filter(Boolean))];
    subtabs.innerHTML = '<button class="lib-subtab active" data-sub="all">全部</button>' +
      sources.map(s => `<button class="lib-subtab" data-sub="${h(s)}">${h(s)}</button>`).join('');
    if (sources.length <= 1) subtabs.style.display = 'none';
  } else if (type === 'errors') {
    subtabs.style.display = 'flex';
    subtabs.innerHTML = '<button class="lib-subtab active" data-sub="all">全部</button><button class="lib-subtab" data-sub="grammar">语法</button><button class="lib-subtab" data-sub="pronunciation">发音</button>';
  } else { subtabs.style.display = 'none'; }

  subtabs.querySelectorAll('.lib-subtab').forEach(btn => {
    btn.addEventListener('click', () => {
      subtabs.querySelectorAll('.lib-subtab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); _libSub = btn.dataset.sub; renderLibContent();
    });
  });

  const tableMap = { vocab: 'vocabulary', errors: 'errors', patterns: 'patterns', topics: 'topics' };
  const { data } = await sb.from(tableMap[type]).select('*').order('created_at', { ascending: false });
  _libData[type] = data || [];
  const countEl = document.getElementById('lib-count-' + type);
  if (countEl) countEl.textContent = _libData[type].length ? `(${_libData[type].length})` : '';
  renderLibContent();
}

function renderLibContent() {
  const content = document.getElementById('library-content');
  const q = (document.getElementById('lib-search').value || '').trim().toLowerCase();
  let items = _libData[_libType] || [];

  if (_libType === 'vocab' && _libSub !== 'all') items = items.filter(v => v.source_topic === _libSub);
  if (_libType === 'errors' && _libSub !== 'all') items = items.filter(e => e.type === _libSub);
  if (q) items = items.filter(item => [item.word, item.phonetic, item.meaning, item.example, item.original, item.correction, item.rule, item.better, item.scene, item.title, item.description].some(f => f && f.toLowerCase().includes(q)));

  if (!items.length) {
    content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${_libType === 'topics' ? '💬' : '📝'}</div><div class="empty-state-title">暂无数据</div><div class="empty-state-sub">${q ? '试试其他关键词' : '导入日报后自动生成'}</div></div>`;
    return;
  }

  if (_libType === 'vocab') content.innerHTML = items.map((v, i) => vocabCard(v, i)).join('');
  else if (_libType === 'errors') content.innerHTML = items.map(e => errorCard(e)).join('');
  else if (_libType === 'patterns') content.innerHTML = items.map(p => patternCard(p)).join('');
  else if (_libType === 'topics') content.innerHTML = items.map(t => topicCard(t)).join('');

  content.querySelectorAll('.vocab-card').forEach(card => {
    card.addEventListener('click', function(e) { if (!e.target.closest('button')) this.classList.toggle('expanded'); });
  });
  content.querySelectorAll('.topic-select-btn').forEach(btn => {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation(); const tid = parseInt(this.dataset.topicId);
      document.getElementById('topic-select').value = tid;
      await showTopicPreview(tid);
      document.getElementById('home-cta').style.display = 'none';
    });
  });
  content.querySelectorAll('.topic-delete-btn').forEach(btn => {
    btn.addEventListener('click', async function(e) {
      e.stopPropagation(); const tid = parseInt(this.dataset.topicId);
      if (!confirm('删除这个话题？')) return;
      await sb.from('topics').delete().eq('id', tid);
      loadLibrary('topics'); loadHome();
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
  const sourceLabel = v.source_topic ? `<span class="badge-source">📂 ${h(v.source_topic)}</span>` : '';
  return `<div class="vocab-card card-animate">
    <div class="card-row"><span class="word">${h(v.word)}</span><span class="phonetic">${h(v.phonetic)}</span></div>
    <div class="meaning">${h(v.meaning)}</div>
    ${v.example ? `<div class="example">💬 ${h(v.example)}</div>` : ''}
    <div class="card-actions">${btn}${srsHtml}<span style="font-size:10px;color:var(--text-ultradim);">${rc} 次</span>${sourceLabel}<button onclick="speak('${h(v.word).replace(/'/g, "\\'")}');event.stopPropagation();" class="btn-small">🔊</button></div>
    <div class="card-detail"><div class="card-detail-row"><strong>状态：</strong>${statusLabel(s)}</div><div class="card-detail-row"><strong>添加：</strong>${v.date_added || ''}</div></div>
  </div>`;
}
function errorCard(e) {
  return `<div class="error-card card-animate">
    <div class="err-type">${e.type === 'grammar' ? '📖 语法' : '🗣️ 发音'}</div>
    <div class="err-orig">${h(e.original)}</div><div class="err-corr">✅ ${h(e.correction)}</div>
    ${e.rule ? `<div class="err-rule">📐 ${h(e.rule)}</div>` : ''}
    <div class="card-actions">${e.correct_in_review ? '<span class="badge-done">已纠正</span>' : `<button onclick="markFixed(${e.id});event.stopPropagation();" class="btn-small">标记已纠正</button>`}</div>
  </div>`;
}
function patternCard(p) {
  return `<div class="pattern-card card-animate"><div class="pat-orig">${h(p.original)}</div><div class="pat-better">✨ ${h(p.better)}</div>${p.scene ? `<div class="pat-scene">🎬 ${h(p.scene)}</div>` : ''}</div>`;
}
function topicCard(t) {
  const count = t.practice_count || 0;
  return `<div class="topic-card-item card-animate">
    <div class="topic-card-header"><div class="topic-card-title">${h(t.title)}</div><div class="topic-card-actions"><button class="btn-small topic-select-btn" data-topic-id="${t.id}">🎯 选择</button><button class="btn-small topic-delete-btn" data-topic-id="${t.id}" style="color:var(--red);">🗑</button></div></div>
    ${t.description ? `<div class="topic-card-desc">${h(t.description)}</div>` : ''}
    <div class="topic-card-meta"><span>练习 ${count} 次</span>${t.last_practiced_at ? `<span> · 上次 ${new Date(t.last_practiced_at).toLocaleDateString('zh-CN')}</span>` : ''}</div>
  </div>`;
}

// ═══════════════════════════════════════════════════════
// Actions
// ═══════════════════════════════════════════════════════
async function markMastered(id) {
  const { data: v } = await sb.from('vocabulary').select('*').eq('id', id).single();
  const result = sm2(v.ease_factor, v.sm2_interval, v.sm2_repetitions, 3);
  const nextDate = new Date(); nextDate.setDate(nextDate.getDate() + result.interval);
  const status = result.repetitions >= 5 ? 'mastered' : 'learning';
  await sb.from('vocabulary').update({ mastered: status === 'mastered', status, ease_factor: result.ease_factor, sm2_interval: result.interval, sm2_repetitions: result.repetitions, review_count: (v.review_count || 0) + 1, next_review_date: nextDate.toISOString().slice(0, 10), last_reviewed_at: new Date().toISOString() }).eq('id', id);
  loadLibrary('vocab'); showToast(status === 'mastered' ? '🎉 已掌握！' : '📖 已复习');
}
async function markFixed(id) { await sb.from('errors').update({ correct_in_review: true }).eq('id', id); loadLibrary('errors'); }

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
- word | /phonetic/ | 释义 | 例句

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

## 讨论问题
- question 1
- question 2

## 相关表达
- expression | meaning | usage context`,
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
  if (!text) text = document.getElementById('report-input').value.trim();
  if (!text) return;
  const btn = document.getElementById('btn-submit');
  btn.disabled = true; btn.textContent = '解析中...';
  const parsed = parseReport(text);
  const type = parsed.meta.type || 'daily-report';

  if (type === 'daily-report' || (!parsed.meta.type && Object.keys(parsed.meta).length > 0)) {
    await importDailyReport(parsed);
  } else if (type === 'topic-card') {
    await importTopicCard(parsed);
  } else if (type === 'insight-report') {
    await importInsightReport(parsed);
  } else {
    document.getElementById('import-result').innerHTML = '<span class="toast-error">❌ 无法识别内容格式</span>';
    btn.disabled = false; btn.textContent = '解析入库'; return;
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
    await sb.from('vocabulary').insert(parsed.vocabulary.map(v => ({ user_id: uid, word: v.word, phonetic: v.phonetic, meaning: v.meaning, example: v.example, date_added: date, source_topic: topic, status: 'new' })));
  }
  const allErrors = [];
  for (const e of parsed.pronunciation) allErrors.push({ user_id: uid, type: 'pronunciation', original: e.original || '', correction: e.correction || '', date_added: date, source_topic: topic, error_pattern: detectErrorPattern(e.original, e.correction) });
  for (const e of parsed.grammar) allErrors.push({ user_id: uid, type: 'grammar', original: e.original || '', correction: e.correction || '', rule: e.rule || '', date_added: date, source_topic: topic, error_pattern: detectErrorPattern(e.original, e.correction) });
  if (allErrors.length) await sb.from('errors').insert(allErrors);
  if (parsed.patterns.length) await sb.from('patterns').insert(parsed.patterns.map(p => ({ user_id: uid, original: p.original || '', better: p.better || '', scene: p.scene || '', date_added: date, source_topic: topic })));
  await sb.from('reports').upsert({ user_id: uid, date, content: parsed.raw }, { onConflict: 'user_id,date' });
  await updateProgress(uid, parsed.summary.fluency || 0, parsed.summary.accuracy || 0, parsed.summary.weak_areas, topic, duration);
  if (topic) {
    const { data: existingTopic } = await sb.from('topics').select('id').eq('title', topic).maybeSingle();
    if (existingTopic) await sb.from('topics').update({ practice_count: sb.raw('practice_count + 1'), last_practiced_at: new Date().toISOString() }).eq('id', existingTopic.id);
  }
  document.getElementById('import-result').innerHTML = `<span class="toast-success">✅ 入库完成！单词 ${parsed.vocabulary.length} · 纠错 ${allErrors.length} · 句型 ${parsed.patterns.length}</span>`;
}

async function importTopicCard(parsed) {
  const { data: { session } } = await sb.auth.getSession();
  const uid = session.user.id;
  const title = parsed.meta.title || '未命名话题';
  const description = parsed.meta.description || '';
  const keyTerms = (parsed.vocabulary || []).map(v => v.word).filter(Boolean);
  const { data: topic } = await sb.from('topics').insert([{ user_id: uid, title, description, source_type: 'chatgpt', key_terms: keyTerms, notes: '' }]).select().single();
  if (parsed.vocabulary.length && topic) {
    await sb.from('vocabulary').insert(parsed.vocabulary.map(v => ({ user_id: uid, word: v.word, phonetic: v.phonetic || '', meaning: v.meaning || '', example: v.example || '', date_added: new Date().toISOString().slice(0, 10), source_topic: title, status: 'new' })));
  }
  document.getElementById('import-result').innerHTML = `<span class="toast-success">✅ 话题「${h(title)}」已添加！词汇 ${parsed.vocabulary.length} 个</span>`;
  loadHome();
}

async function importInsightReport(parsed) {
  const { data: { session } } = await sb.auth.getSession();
  await sb.from('reports').upsert({ user_id: session.user.id, date: new Date().toISOString().slice(0, 10), content: parsed.raw }, { onConflict: 'user_id,date' });
  document.getElementById('import-result').innerHTML = '<span class="toast-success">✅ 分析报告已保存！</span>';
}

function detectErrorPattern(original, correction) {
  if (!original || !correction) return '';
  const patterns = [];
  if (/\b(a|an|the)\b/i.test(original) && /\b(a|an|the)\b/i.test(correction) && original.replace(/\b(a|an|the)\b/gi, '') !== correction.replace(/\b(a|an|the)\b/gi, '')) patterns.push('冠词');
  if (/(ed|ing|was|were|have|has|had|will)\b/i.test(original) || /(ed|ing|was|were|have|has|had|will)\b/i.test(correction)) patterns.push('时态');
  if (/\b(in|on|at|for|to|of|with|by|from)\b/i.test(correction) && original.replace(/\b(in|on|at|for|to|of|with|by|from)\b/gi, '') === correction.replace(/\b(in|on|at|for|to|of|with|by|from)\b/gi, '')) patterns.push('介词');
  const oWords = original.toLowerCase().split(/\s+/).sort().join(' ');
  const cWords = correction.toLowerCase().split(/\s+/).sort().join(' ');
  if (oWords === cWords && original !== correction) patterns.push('语序');
  if (/(s|es)\b/i.test(original) !== /(s|es)\b/i.test(correction)) patterns.push('单复数');
  return patterns.join(',') || '其他';
}

async function updateProgress(uid, fluency, accuracy, weak_areas, topic, duration) {
  const { data: prog } = await sb.from('progress').select('*').eq('user_id', uid).maybeSingle();
  let p = prog || { user_id: uid, total_sessions: 0, total_minutes: 0, topics: [], fluency_trend: [], accuracy_trend: [], weak_areas: [], words_learned: 0, words_mastered: 0, errors_fixed: 0 };
  p.total_sessions += 1; p.total_minutes += duration;
  if (topic && !p.topics.includes(topic)) p.topics = [...p.topics, topic];
  p.fluency_trend = [...p.fluency_trend, fluency]; p.accuracy_trend = [...p.accuracy_trend, accuracy];
  (weak_areas || '').split(/[、,，]/).map(s => s.trim()).filter(Boolean).forEach(w => { if (!p.weak_areas.includes(w)) p.weak_areas.push(w); });
  const { count: vCount } = await sb.from('vocabulary').select('*', { count: 'exact', head: true });
  const { count: eCount } = await sb.from('errors').select('*', { count: 'exact', head: true }).eq('correct_in_review', true);
  p.words_learned = vCount; p.errors_fixed = eCount;
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
  const [{ data: prog }, { data: vocab }, { data: errors }] = await Promise.all([
    sb.from('progress').select('*').eq('user_id', session.user.id).maybeSingle(),
    sb.from('vocabulary').select('*'), sb.from('errors').select('*')
  ]);
  const vList = vocab || []; const eList = errors || [];
  const div = document.getElementById('settings-trends');
  if (prog && prog.fluency_trend?.length) {
    const mastered = vList.filter(v => v.status === 'mastered' || v.mastered).length;
    const learning = vList.filter(v => v.status === 'learning' || (!v.status && !v.mastered && (v.review_count || 0) > 0)).length;
    const newly = vList.length - mastered - learning;
    const donutHTML = donutChartSVG(newly, learning, mastered, vList.length);
    const weeks = getWeeklyCounts(vList);
    div.innerHTML = `
      <div class="settings-trend-item"><span class="settings-trend-label">🎯 流利度</span><div class="settings-trend-spark">${sparklineSVG(prog.fluency_trend, '#E07B5A')}</div><span class="settings-trend-delta ${getDelta(prog.fluency_trend).cls}">${getDelta(prog.fluency_trend).text}</span></div>
      <div class="settings-trend-item"><span class="settings-trend-label">📏 准确度</span><div class="settings-trend-spark">${sparklineSVG(prog.accuracy_trend, '#8BADC5')}</div><span class="settings-trend-delta ${getDelta(prog.accuracy_trend).cls}">${getDelta(prog.accuracy_trend).text}</span></div>
      <div class="settings-trend-summary">📊 总练习 <strong>${prog.total_sessions}</strong> 次 · ⏱️ <strong>${prog.total_minutes}</strong> 分钟</div>
      <div class="settings-trend-item" style="display:block;text-align:center;"><span class="settings-trend-label" style="display:block;margin-bottom:8px;">🍩 词汇分布</span>${donutHTML}</div>
      <div class="settings-trend-item" style="display:block;"><span class="settings-trend-label" style="display:block;margin-bottom:8px;">📊 每周新词</span>${weeks}</div>`;
    if (eList.length > 0) showErrorPatterns(eList); else document.getElementById('error-patterns-group').style.display = 'none';
  } else {
    div.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📈</div><div class="empty-state-title">导入日报后生成趋势</div></div>';
    document.getElementById('error-patterns-group').style.display = 'none';
  }
}

function showErrorPatterns(errors) {
  document.getElementById('error-patterns-group').style.display = 'block';
  const epDiv = document.getElementById('error-patterns');
  const patternCount = {};
  errors.forEach(e => { (e.error_pattern || '其他').split(',').map(s => s.trim()).filter(Boolean).forEach(p => { patternCount[p] = (patternCount[p] || 0) + 1; }); });
  const sorted = Object.entries(patternCount).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;
  const fixedCount = errors.filter(e => e.correct_in_review).length;
  const fixRate = errors.length > 0 ? Math.round((fixedCount / errors.length) * 100) : 0;
  epDiv.innerHTML = `
    <div class="ep-summary"><div class="ep-stat"><strong>${errors.length}</strong> 个错误</div><div class="ep-stat"><strong>${fixRate}%</strong> 已纠正</div></div>
    <div class="ep-patterns"><div class="ep-label">高频错误模式</div>${sorted.map(([name, count]) => `<div class="ep-row"><span class="ep-name">${name}</span><div class="ep-bar-wrap"><div class="ep-bar" style="width:${(count/max)*100}%;"></div></div><span class="ep-count">${count}次</span></div>`).join('')}</div>
    <div class="ep-tip">💡 建议优先练习 <strong>${sorted[0]?.[0] || '无'}</strong> 类型的错误</div>`;
}

function donutChartSVG(newCount, learning, mastered, total) {
  if (total === 0) return '<div class="donut-wrap"><span style="color:var(--text-ultradim);">暂无数据</span></div>';
  const r = 60, cx = 80, cy = 80, sw = 16, circ = 2 * Math.PI * r;
  const segments = [{ val: newCount, color: 'var(--blue)', label: '新词' }, { val: learning, color: 'var(--orange)', label: '学习中' }, { val: mastered, color: 'var(--green)', label: '已掌握' }].filter(s => s.val > 0);
  let offset = 0, paths = '';
  segments.forEach(s => { const len = (s.val / total) * circ; paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}" stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="butt"/>`; offset += len; });
  return `<div class="donut-wrap"><svg viewBox="0 0 160 160">${paths}<text x="80" y="84" text-anchor="middle" font-size="22" font-weight="700" fill="var(--text)">${total}</text><text x="80" y="102" text-anchor="middle" font-size="11" fill="var(--text-dim)">单词</text></svg><div class="donut-legend">${segments.map(s => `<div class="donut-legend-item"><span class="donut-legend-dot" style="background:${s.color};"></span>${s.label} ${s.val}</div>`).join('')}</div></div>`;
}

function getWeeklyCounts(vocab) {
  const weeks = [];
  for (let i = 3; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - d.getDay() - i * 7); const start = new Date(d); start.setDate(start.getDate() - 6); const endStr = d.toISOString().slice(0, 10); const startStr = start.toISOString().slice(0, 10); const count = vocab.filter(v => v.date_added >= startStr && v.date_added <= endStr).length; weeks.push({ label: `${start.getMonth() + 1}/${start.getDate()}`, count }); }
  const max = Math.max(...weeks.map(w => w.count), 1);
  return `<div class="bar-chart">${weeks.map(w => `<div class="bar-col"><span style="font-size:10px;color:var(--text-ultradim);">${w.count}</span><div class="bar-fill" style="height:${(w.count/max)*80}px;"></div><span class="bar-label">${w.label}</span></div>`).join('')}</div>`;
}

function getDelta(arr) { if (arr.length < 2) return { text: '--', cls: 'flat' }; const d = arr[arr.length - 1] - arr[arr.length - 2]; if (d > 0) return { text: `↑ ${d}`, cls: 'up' }; if (d < 0) return { text: `↓ ${Math.abs(d)}`, cls: 'down' }; return { text: '→ 0', cls: 'flat' }; }

function sparklineSVG(arr, color) {
  if (!arr.length) return '';
  const w = Math.max(arr.length * 14, 60), h = 32, pad = 2, max = Math.max(...arr, 1), min = Math.min(...arr, 0), range = max - min || 1;
  const points = arr.map((v, i) => { const x = pad + (i / Math.max(arr.length - 1, 1)) * (w - pad * 2); const y = pad + (1 - (v - min) / range) * (h - pad * 2); return `${x.toFixed(1)},${y.toFixed(1)}`; }).join(' ');
  const lastX = pad + (arr.length - 1) / Math.max(arr.length - 1, 1) * (w - pad * 2), lastY = pad + (1 - (arr[arr.length - 1] - min) / range) * (h - pad * 2);
  return `<svg width="${w}" height="${h}" class="sparkline" viewBox="0 0 ${w} ${h}"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3" fill="${color}"/></svg>`;
}

// ═══════════════════════════════════════════════════════
// Theme System (4 palettes × light/dark)
// ═══════════════════════════════════════════════════════
function initTheme() {
  const savedTheme = localStorage.getItem('voco-theme') || 'warm';
  const savedMode = localStorage.getItem('voco-mode') || 'light';
  applyTheme(savedTheme, savedMode);
}
function applyTheme(theme, mode) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-mode', mode);
  const label = document.getElementById('theme-label'); if (label) label.textContent = mode === 'dark' ? '开' : '关';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = mode === 'dark' ? '#1E1E2E' : '#FBF7F0';
  localStorage.setItem('voco-theme', theme);
  localStorage.setItem('voco-mode', mode);
  // Update theme picker active state
  document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
  const active = document.querySelector(`.theme-option[data-theme="${theme}"]`);
  if (active) active.classList.add('active');
}
function toggleTheme() {
  const mode = document.documentElement.getAttribute('data-mode') === 'dark' ? 'light' : 'dark';
  const theme = document.documentElement.getAttribute('data-theme') || 'warm';
  applyTheme(theme, mode);
}
function selectTheme(theme) {
  const mode = document.documentElement.getAttribute('data-mode') || 'light';
  applyTheme(theme, mode);
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
  const json = JSON.stringify({ vocabulary: vocab.data, errors: errors.data, patterns: patterns.data, progress: progress.data, reports: reports.data, topics: topics.data, exported_at: new Date().toISOString() }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `voco-export-${new Date().toISOString().slice(0, 10)}.json`; a.click();
  URL.revokeObjectURL(a.href); showToast('📥 数据已导出');
}

// ═══════════════════════════════════════════════════════
// Clipboard + Share Target
// ═══════════════════════════════════════════════════════
async function detectClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    if (text && (text.includes('type: daily-report') || text.includes('type: topic-card') || text.includes('type: insight-report'))) {
      showToast('📋 检测到 Voco 内容');
      document.getElementById('report-input').value = text;
      document.getElementById('import-card').setAttribute('open', '');
    }
  } catch(e) {}
}

(function handleShareTarget() {
  const params = new URLSearchParams(window.location.search);
  const sharedText = params.get('text') || params.get('body') || params.get('title');
  if (sharedText && (sharedText.includes('type: daily-report') || sharedText.includes('type: topic-card') || sharedText.includes('type: insight-report'))) {
    checkAuth().then(() => { setTimeout(async () => { await importReport(sharedText); window.history.replaceState({}, '', '/'); }, 500); });
  }
})();

// ═══════════════════════════════════════════════════════
// TTS + Helpers
// ═══════════════════════════════════════════════════════
function speak(text) { if (!window.speechSynthesis) return; const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.85; speechSynthesis.speak(u); }
function h(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function showToast(msg) {
  const t = document.createElement('div'); t.className = 'toast show'; t.textContent = msg;
  t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:var(--text);color:var(--bg);padding:10px 20px;border-radius:8px;font-size:14px;z-index:200;box-shadow:0 4px 16px rgba(0,0,0,0.2);pointer-events:none;';
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
document.getElementById('btn-logout-settings').addEventListener('click', signOut);

// Template buttons
document.querySelectorAll('.tpl-btn').forEach(btn => {
  btn.addEventListener('click', (e) => { e.stopPropagation(); copyTemplate(btn.dataset.tpl); document.getElementById('import-card').setAttribute('open', ''); });
});

// Library search
document.getElementById('lib-search').addEventListener('input', () => renderLibContent());

// Review mode tabs
document.querySelectorAll('.review-mode-tab').forEach(btn => { btn.addEventListener('click', () => switchReviewMode(btn.dataset.mode)); });

// Review — flashcard
document.getElementById('btn-reveal').addEventListener('click', flipCard);
document.getElementById('btn-again').addEventListener('click', () => rateCard('again'));
document.getElementById('btn-good').addEventListener('click', () => rateCard('good'));
document.getElementById('btn-easy').addEventListener('click', () => rateCard('easy'));
document.getElementById('btn-review-done').addEventListener('click', () => { document.querySelector('.tab-bar .tab[data-tab=home]').click(); });

// Review — shadow
document.getElementById('btn-shadow-start').addEventListener('click', initShadowMode);
document.getElementById('btn-shadow-play').addEventListener('click', speakShadowPhrase);
document.getElementById('btn-shadow-next').addEventListener('click', nextShadowPhrase);
document.getElementById('btn-shadow-repeat').addEventListener('click', () => speakShadowPhrase());
document.getElementById('btn-shadow-done').addEventListener('click', restartShadow);

// Theme toggle
document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);
// Theme picker
document.querySelectorAll('.theme-option').forEach(o => { o.addEventListener('click', () => selectTheme(o.dataset.theme)); });

// ═══════════════════════════════════════════════════════
// Guided Practice Flow
// ═══════════════════════════════════════════════════════
let _flowStep = 0;

function startFlow() {
  _flowStep = 0;
  renderFlowStep();
}

function renderFlowStep() {
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
    bodyHTML = `<div class="flow-step-title">${steps[0]}</div>
      <p class="flow-step-desc">从话题库选择一个话题开始今天的口语练习</p>
      <select class="topic-select" id="flow-topic-select"><option value="">选择话题...</option></select>
      <button class="btn-primary flow-btn" id="flow-next" style="margin-top:12px;" disabled>下一步 →</button>`;
  } else if (_flowStep === 1) {
    bodyHTML = `<div class="flow-step-title">${steps[1]}</div>
      <div id="flow-preview-content"><p class="flow-step-desc">正在加载话题信息...</p></div>
      <div class="flow-actions"><button class="btn-small flow-btn" id="flow-prev">← 上一步</button><button class="btn-primary flow-btn" id="flow-next">开始练习 →</button></div>`;
  } else if (_flowStep === 2) {
    bodyHTML = `<div class="flow-step-title">${steps[2]}</div>
      <p class="flow-step-desc">打开 ChatGPT，用准备好的话题开始口语对话练习。<br>练完后回到这里导入日报。</p>
      <div class="flow-actions"><button class="btn-small flow-btn" id="flow-prev">← 上一步</button><button class="btn-primary flow-btn" id="flow-next">我已练完 →</button></div>`;
  } else if (_flowStep === 3) {
    bodyHTML = `<div class="flow-step-title">${steps[3]}</div>
      <p class="flow-step-desc">用模板生成日报 → 粘贴到 ChatGPT → 把结果粘贴回来</p>
      <div class="template-btns" style="margin-bottom:10px;"><button class="tpl-btn" data-tpl="report">📝 日报模板</button></div>
      <textarea id="flow-report-input" rows="5" placeholder="将 ChatGPT 生成的日报内容粘贴到这里..."></textarea>
      <div class="flow-actions"><button class="btn-small flow-btn" id="flow-prev">← 上一步</button><button class="btn-primary flow-btn" id="flow-finish">解析入库 ✓</button></div>`;
  }

  flowContainer.innerHTML = `
    <div class="flow-progress">${progressHTML}</div>
    <div class="flow-body">${bodyHTML}</div>
  `;

  // Bind buttons
  const prevBtn = document.getElementById('flow-prev');
  const nextBtn = document.getElementById('flow-next');
  const finishBtn = document.getElementById('flow-finish');

  if (prevBtn) prevBtn.addEventListener('click', () => { if (_flowStep > 0) { _flowStep--; renderFlowStep(); } });
  if (nextBtn) nextBtn.addEventListener('click', () => { if (_flowStep < 3) { _flowStep++; renderFlowStep(); } });
  if (finishBtn) finishBtn.addEventListener('click', async () => { const text = document.getElementById('flow-report-input')?.value; if (text) await importReport(text); _flowStep = 4; renderCompletion(); });

  // Step 0: populate topic select
  if (_flowStep === 0) {
    loadTopicsForFlow();
    const sel = document.getElementById('flow-topic-select');
    sel.addEventListener('change', function() {
      document.getElementById('flow-next').disabled = !this.value;
    });
  }

  // Step 1: show preview
  if (_flowStep === 1) {
    const sel = document.getElementById('flow-topic-select');
    if (sel && sel.value) showFlowPreview(sel.value);
  }

  // Step 3: template buttons
  if (_flowStep === 3) {
    document.querySelectorAll('#practice-flow .tpl-btn').forEach(btn => {
      btn.addEventListener('click', (e) => copyTemplate(btn.dataset.tpl));
    });
  }
}

async function loadTopicsForFlow() {
  const { data: topics } = await sb.from('topics').select('*').order('created_at', { ascending: false });
  const sel = document.getElementById('flow-topic-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">选择话题...</option>' + (topics || []).map(t => `<option value="${t.id}">${h(t.title)}</option>`).join('');
}

async function showFlowPreview(topicId) {
  const { data: topic } = await sb.from('topics').select('*').eq('id', topicId).single();
  if (!topic) return;
  const { data: vocab } = await sb.from('vocabulary').select('*').or(`source_topic.ilike.%${topic.title}%`);
  const terms = (vocab || []).slice(0, 5);
  const div = document.getElementById('flow-preview-content');
  if (!div) return;
  div.innerHTML = `
    <div class="flow-preview-topic">${h(topic.title)}</div>
    ${topic.description ? `<div class="flow-preview-desc">${h(topic.description)}</div>` : ''}
    ${terms.length ? `<div class="flow-preview-terms">${terms.map(v => `<span class="prep-tag">${h(v.word)}</span>`).join('')}</div>` : ''}
    <div class="flow-preview-challenge">💪 用英语描述你与 "${h(topic.title)}" 相关的经历</div>
  `;
}

function renderCompletion() {
  const flowContainer = document.getElementById('practice-flow');
  if (!flowContainer) return;
  flowContainer.innerHTML = `
    <div class="flow-progress"><span class="flow-dot done">✓</span><span class="flow-line"></span><span class="flow-dot done">✓</span><span class="flow-line"></span><span class="flow-dot done">✓</span><span class="flow-line"></span><span class="flow-dot done">✓</span></div>
    <div class="flow-body" style="text-align:center;">
      <div style="font-size:48px;margin:16px 0;">🎉</div>
      <div class="flow-step-title">练习完成！</div>
      <p class="flow-step-desc">日报已入库，去首页查看学习成果</p>
      <button class="btn-primary" onclick="document.querySelector('.tab-bar .tab[data-tab=home]').click();loadHome();">查看日报 →</button>
    </div>
  `;
}

initTheme();

sb.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') checkAuth();
  if (event === 'SIGNED_OUT') checkAuth();
});

checkAuth();

if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js'); }
