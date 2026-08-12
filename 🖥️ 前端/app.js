// ═══════════════════════════════════════════════════════
// Voco v3.0 — 4-Tab PWA
// ═══════════════════════════════════════════════════════

// ── Tab Switching ──────────────────────────────────────
document.querySelectorAll('.tab-bar .tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-bar .tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');

    const t = btn.dataset.tab;
    if (t === 'home') loadHome();
    else if (t === 'words') loadWords();
    else if (t === 'speak') loadSpeak();
    else if (t === 'me') loadMe();
  });
});

// ── Auth ──────────────────────────────────────────────
async function checkAuth() {
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
  loadHome(); // refresh greeting in real-time
});

// ── Icon SVGs (Feather-style, inherit currentColor) ──────
const ICO_SPEAKER = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:3px"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>';
const ICO_MIC = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:3px"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
const ICO_REPEAT = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-3px;margin-right:3px"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>';

// ═══════════════════════════════════════════════════════
// TAB 1: HOME
// ═══════════════════════════════════════════════════════
async function loadHome() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;

  const [{ data: vocab }, { data: errors }, { data: prog }, { data: reports }, { data: patterns }, { data: topics }] = await Promise.all([
    sb.from('vocabulary').select('*'),
    sb.from('errors').select('*'),
    sb.from('progress').select('*').eq('user_id', session.user.id).maybeSingle(),
    sb.from('reports').select('*').order('date', { ascending: false }).limit(30),
    sb.from('patterns').select('*'),
    sb.from('topics').select('*').order('created_at', { ascending: false })
  ]);

  const vList = vocab || [];
  const eList = errors || [];
  const pList = patterns || [];
  const tList = topics || [];
  const rList = reports || [];
  const today = new Date().toISOString().slice(0, 10);
  const todayReport = rList.find(r => r.date === today);

  // Greeting
  const dates = [...new Set(vList.map(v => v.date_added).filter(Boolean))].sort().reverse();
  const streak = calcStreak(dates);
  renderGreeting(streak, vList);

  // Zone 1: Overview
  renderOverview(todayReport, vList, eList, prog);

  // Zone 2: Quests
  renderQuests(todayReport, vList, eList, rList, streak);

  // Zone 3: Details
  renderDetails(todayReport, vList, eList, pList, prog);

  // Zone 4: Bear heatmap
  renderBearHeatmap(vList, rList);

  // Stats grid
  document.getElementById('stat-sessions').textContent = prog?.total_sessions || '0';
  document.getElementById('stat-vocab').textContent = vList.length;
  document.getElementById('stat-errors').textContent = eList.length;
  document.getElementById('stat-streak').textContent = streak;

  // Practice flow — only when no report today
  const hasReport = todayReport && isDailyReport(todayReport);
  const flowEl = document.getElementById('practice-flow');
  if (hasReport) {
    if (flowEl) flowEl.style.display = 'none';
  } else {
    if (flowEl) flowEl.style.display = 'block';
    renderFlowStep();
  }
}

// ── Greeting ───────────────────────────────────────────
function renderGreeting(streak, vocabList) {
  const hour = new Date().getHours();
  let greeting;
  if (hour < 6) greeting = '夜深了';
  else if (hour < 12) greeting = '早上好';
  else if (hour < 14) greeting = '中午好';
  else if (hour < 18) greeting = '下午好';
  else greeting = '晚上好';

  const name = localStorage.getItem('voco-username') || '';
  document.getElementById('greeting-text').textContent = name ? `👋 ${greeting}，${name}！` : `👋 ${greeting}！`;

  const now = new Date();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  document.getElementById('greeting-date').textContent =
    `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`;

  // Weekday pills
  const today = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - today);
  const practicedDays = new Set();
  (vocabList || []).forEach(v => {
    if (v.date_added) {
      const d = new Date(v.date_added);
      const ws = new Date(d);
      ws.setDate(ws.getDate() - d.getDay());
      if (ws.toDateString() === weekStart.toDateString()) practicedDays.add(d.getDay());
    }
  });

  const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];
  const daysHTML = dayLabels.map((label, i) => {
    let cls = 'streak-day';
    if (practicedDays.has(i)) cls += ' done';
    if (i === today) cls += ' today';
    return `<span class="${cls}">${label}</span>`;
  }).join('');

  const streakEl = document.getElementById('greeting-streak');
  if (streak > 0) {
    streakEl.innerHTML = `<span class="streak-pill">🔥 ${streak} 天坚持</span><div class="streak-weekdays">${daysHTML}</div>`;
  } else {
    streakEl.innerHTML = `<span class="streak-pill zero">🌱 今天开始</span><div class="streak-weekdays">${daysHTML}</div>`;
  }
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

// ── Zone 1: Overview (Donut + Metrics + Pills) ────────
function renderOverview(todayReport, vocab, errors, prog) {
  const ov = document.getElementById('home-overview');
  if (!todayReport || !isDailyReport(todayReport)) { ov.style.display = 'none'; return; }
  ov.style.display = 'block';

  const parsed = parseReport(todayReport.content);
  const fluency = parsed.summary.fluency || 0;
  const accuracy = parsed.summary.accuracy || 0;
  const natural = parsed.summary.naturalness || Math.round(fluency * 0.8) || 0;
  const vocabScore = Math.min(parsed.vocabulary.length * 2, 10);
  const overall = Math.round((fluency + accuracy + natural + vocabScore) / 4);

  // Donut
  document.getElementById('ov-donut').innerHTML = overviewDonut(overall);

  // Metrics bars
  const metrics = [
    { label: '流利度', score: fluency, cls: 'fluency', color: 'var(--primary)' },
    { label: '语法', score: accuracy, cls: 'grammar', color: 'var(--blue)' },
    { label: '词汇', score: vocabScore, cls: 'vocab', color: 'var(--green)' },
    { label: '自然度', score: natural, cls: 'natural', color: 'var(--orange)' },
  ];
  document.getElementById('ov-metrics').innerHTML = metrics.map(m =>
    `<div class="ov-metric">
      <span class="ov-metric-label">${m.label}</span>
      <div class="ov-metric-bar-wrap"><div class="ov-metric-bar ${m.cls}" style="width:${(m.score/10)*100}%;background:${m.color}"></div></div>
      <span class="ov-metric-score">${m.score}/10</span>
    </div>`
  ).join('');

  // Stats pills
  const allReportDates = [...new Set((vocab || []).map(v => v.date_added).filter(Boolean))];
  document.getElementById('ov-stats').innerHTML = [
    `<div class="ov-stat"><strong>💬</strong> ${prog?.topics?.length || 0} 话题</div>`,
    `<div class="ov-stat"><strong>📝</strong> ${parsed.vocabulary.length} 新词</div>`,
    `<div class="ov-stat"><strong>🗣️</strong> ${parsed.patterns.length} 表达</div>`,
    `<div class="ov-stat"><strong>🔧</strong> ${(parsed.grammar||[]).length + (parsed.pronunciation||[]).length} 纠正</div>`,
  ].join('');
}

function overviewDonut(score) {
  const r = 40, cx = 50, cy = 50, sw = 10, circ = 2 * Math.PI * r;
  const len = (score / 10) * circ;
  const color = score >= 7 ? 'var(--green)' : score >= 4 ? 'var(--orange)' : 'var(--red)';
  return `<svg viewBox="0 0 100 100" width="100" height="100">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border-light)" stroke-width="${sw}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}"
      stroke-dasharray="${len} ${circ - len}" stroke-dashoffset="0" transform="rotate(-90 50 50)" stroke-linecap="round"/>
    <text x="50" y="52" text-anchor="middle" font-size="22" font-weight="800" fill="var(--text)">${score}</text>
    <text x="50" y="66" text-anchor="middle" font-size="9" fill="var(--text-dim)">/10</text>
  </svg>`;
}

// ── Zone 2: Daily Quests (Duolingo-style) ────────────
function renderQuests(todayReport, vocab, errors, reports, streak) {
  const today = new Date().toISOString().slice(0, 10);
  const quests = [];

  // Quest 1: Import today's report
  const hasTodayReport = todayReport && isDailyReport(todayReport);
  quests.push({
    id: 'q1', icon: '📥', title: '导入今日日报', sub: '把 ChatGPT 练习报告粘贴进来',
    done: hasTodayReport, action: hasTodayReport ? null : () => { document.querySelector('.tab[data-tab=me]').click(); }
  });

  // Quest 2: Review at least 5 words today
  const reviewedToday = (vocab || []).filter(v => v.last_reviewed_at && v.last_reviewed_at.slice(0,10) === today).length;
  quests.push({
    id: 'q2', icon: '🃏', title: '复习 5 个单词', sub: reviewedToday >= 5 ? `已复习 ${reviewedToday} 个` : `今日进度: ${reviewedToday}/5`,
    done: reviewedToday >= 5, action: () => { document.querySelector('.tab[data-tab=words]').click(); }
  });

  // Quest 3: Practice speaking (has report = practiced)
  quests.push({
    id: 'q3', icon: '🎤', title: '完成一次口语练习', sub: hasTodayReport ? '今天练习过了！' : '打开 ChatGPT 开口说英语',
    done: hasTodayReport, action: hasTodayReport ? null : () => { document.getElementById('practice-flow').scrollIntoView({behavior:'smooth'}); }
  });

  const done = quests.filter(q => q.done).length;
  document.getElementById('home-quests').style.display = 'block';
  document.getElementById('quests-progress-text').textContent = `${done}/3`;
  document.getElementById('quests-bar-fill').style.width = `${(done/3)*100}%`;

  document.getElementById('quests-list').innerHTML = quests.map(q => `
    <div class="quest-item ${q.done ? 'done' : ''}" data-action="${q.action ? '1' : '0'}">
      <div class="quest-check">${q.done ? '✓' : ''}</div>
      <div class="quest-info">
        <div class="quest-title">${q.icon} ${q.title}</div>
        <div class="quest-sub">${q.sub}</div>
      </div>
      ${q.action && !q.done ? '<span class="quest-arrow">›</span>' : ''}
    </div>
  `).join('');

  document.querySelectorAll('.quest-item').forEach(item => {
    item.addEventListener('click', function() {
      if (this.dataset.action === '1') {
        const idx = [...this.parentNode.children].indexOf(this);
        const q = quests[idx];
        if (q && q.action) q.action();
      }
    });
  });
}

// ── Zone 3: Report Details (5 cards — learning-flow order) ──
function renderDetails(todayReport, vocab, errors, patterns, prog) {
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

function isDailyReport(report) {
  if (!report || !report.content) return false;
  const c = report.content;
  return c.includes('type: daily-report') ||
    c.includes('## 语法纠正') || c.includes('## 发音纠正') ||
    c.includes('## 今日生词') || c.includes('## 表现总结') ||
    c.includes('## 地道表达');
}

// ── Detail Modal: show full list when sub-card clicked ──
let _detailModalData = null;
function showDetailModal(label, count, tab) {
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

function showBearDay(date, active) {
  showToast(`📅 ${date} · ${active ? '🎉 已练习' : '🌱 未打卡'}`);
}

// ═══════════════════════════════════════════════════════
// TAB 2: WORDS
// ═══════════════════════════════════════════════════════
async function loadWords() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;
  const today = new Date().toISOString().slice(0, 10);

  document.getElementById('words-content').innerHTML = LoadingState();

  const { data: vocab } = await sb.from('vocabulary').select('*').order('created_at', { ascending: false });
  _wordsAll = vocab || [];

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

  // Vocab list
  renderVocabList(_wordsAll);
}

// ── Words list ─────────────────────────────────────────
let _wordsAll = [];
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
    <div class="card-actions">${btn}${srsHtml}<span style="font-size:10px;color:var(--text-ultradim);">${rc} 次</span>${sourceLabel}${errInfo}<button onclick="speakWord('${h(v.word).replace(/'/g, "\\'")}');event.stopPropagation();" class="btn-soft">${ICO_SPEAKER}</button></div>
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
  _speakAll = patterns || [];
  renderSpeakList(_speakAll);
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
        <button class="btn-soft" onclick="speakWord('${h(p.better).replace(/'/g, "\\'")}');event.stopPropagation();">${ICO_SPEAKER} 听发音</button>
        <button class="btn-soft" onclick="startShadowFromSpeak();event.stopPropagation();">${ICO_MIC} 跟读</button>
      </div>
    </div>
  `).join('');
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
  document.querySelector('.tab[data-tab=speak]').click();
  setTimeout(startShadowMode, 200);
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
// TAB 4: ME
// ═══════════════════════════════════════════════════════
async function loadMe() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;

  document.getElementById('settings-email').textContent = session.user.email || '---';

  const { data: cfg } = await sb.from('user_config').select('*').eq('user_id', session.user.id).maybeSingle();
  const username = cfg?.user_name || localStorage.getItem('voco-username') || '';
  document.getElementById('setting-username').value = username;
  document.getElementById('me-name').textContent = username || '无名小熊';

  // Stats
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

  document.getElementById('me-streak').textContent = `🔥 ${streak} 天`;
  document.getElementById('me-level').textContent = `⭐ Lv.${level.level}`;
  document.getElementById('me-level-bar-fill').style.width = `${(level.progress / level.threshold) * 100}%`;
  document.getElementById('me-level-hint').textContent = level.hint;

  // Achievements
  renderAchievements(prog, vList, eList, streak);

  // Error patterns
  if (eList.length > 0) {
    showErrorPatterns(eList);
  } else {
    document.getElementById('error-patterns-group').style.display = 'none';
  }
}

// ── Level System ───────────────────────────────────────
function calcLevel(sessions, streak, vocabCount) {
  const xp = (sessions || 0) * 50 + (streak || 0) * 10 + (vocabCount || 0) * 5;
  const levels = [
    { lv: 1, min: 0, max: 200, title: '初学者' },
    { lv: 2, min: 200, max: 500, title: '探索者' },
    { lv: 3, min: 500, max: 1000, title: '练习者' },
    { lv: 4, min: 1000, max: 1800, title: '进阶者' },
    { lv: 5, min: 1800, max: 3000, title: '挑战者' },
    { lv: 6, min: 3000, max: 4500, title: '口语达人' },
    { lv: 7, min: 4500, max: 6500, title: '英语高手' },
    { lv: 8, min: 6500, max: 9000, title: '语言大师' },
    { lv: 9, min: 9000, max: 12000, title: '传奇' },
    { lv: 10, min: 12000, max: Infinity, title: '终极王者' },
  ];

  for (const l of levels) {
    if (xp < l.max) {
      const progress = xp - l.min;
      const threshold = l.max - l.min;
      const nextTitle = levels.find(ll => ll.lv === l.lv + 1);
      return {
        level: l.lv, title: l.title, progress, threshold,
        hint: nextTitle ? `${xp}XP · 距 Lv.${nextTitle.lv} ${nextTitle.title} 还差 ${l.max - xp}XP` : `${xp}XP · 已达最高等级！`
      };
    }
  }
  return { level: 10, title: '终极王者', progress: 1, threshold: 1, hint: `${xp}XP · 已达最高等级！` };
}

// ── Achievements ──────────────────────────────────────
function renderAchievements(prog, vocab, errors, streak) {
  const badges = [
    { icon: '🎯', label: '首次练习', unlocked: (prog?.total_sessions || 0) >= 1 },
    { icon: '🔥', label: '7天坚持', unlocked: streak >= 7 },
    { icon: '🔮', label: '14天坚持', unlocked: streak >= 14 },
    { icon: '📚', label: '掌握50词', unlocked: (vocab || []).filter(v => v.status === 'mastered' || v.mastered).length >= 50 },
    { icon: '🔧', label: '纠正20次', unlocked: (errors || []).filter(e => e.correct_in_review).length >= 20 },
    { icon: '💎', label: '30天坚持', unlocked: streak >= 30 },
    { icon: '🌟', label: '练习10次', unlocked: (prog?.total_sessions || 0) >= 10 },
  ];

  document.getElementById('me-badges').innerHTML = badges.map(b =>
    `<div class="me-badge${b.unlocked ? '' : ' locked'}">
      <span>${b.icon}</span>
      <small>${b.label}</small>
    </div>`
  ).join('');
}

// ── Error patterns ─────────────────────────────────────
function showErrorPatterns(errors) {
  document.getElementById('error-patterns-group').style.display = 'block';
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
    <div class="ep-summary"><div class="ep-stat"><strong>${errors.length}</strong> 个错误</div><div class="ep-stat"><strong>${fixRate}%</strong> 已纠正</div></div>
    <div class="ep-patterns"><div class="ep-label">高频错误模式</div>${sorted.map(([name, count]) =>
      `<div class="ep-row" onclick="showErrorDetail('${name}')" style="cursor:pointer;">
        <span class="ep-name">${name}</span>
        <div class="ep-bar-wrap"><div class="ep-bar" style="width:${(count/max)*100}%;"></div></div>
        <span class="ep-count">${count}次</span>
      </div>`
    ).join('')}</div>
    <div class="ep-tip">💡 建议优先练习 <strong>${sorted[0]?.[0] || '无'}</strong> 类型的错误</div>`;
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
  if (!text) text = document.getElementById('report-input').value.trim();
  if (!text) return;
  const btn = document.getElementById('btn-submit');
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
    document.getElementById('import-result').innerHTML = '<span class="toast-error">❌ 无法识别内容格式</span>';
    if (btn) { btn.disabled = false; btn.textContent = '解析入库'; }
    return;
  }

  document.getElementById('report-input').value = '';
  if (btn) { btn.disabled = false; btn.textContent = '解析入库'; }
  loadHome();
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

  document.getElementById('import-result').innerHTML =
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
  document.getElementById('import-result').innerHTML = `<span class="toast-success">✅ 话题「${h(title)}」已添加！词汇 ${parsed.vocabulary.length} 个</span>`;
}

async function importInsightReport(parsed) {
  const { data: { session } } = await sb.auth.getSession();
  await sb.from('reports').upsert({
    user_id: session.user.id, date: new Date().toISOString().slice(0, 10), content: parsed.raw
  }, { onConflict: 'user_id,date' });
  document.getElementById('import-result').innerHTML = '<span class="toast-success">✅ 分析报告已保存！</span>';
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
// Theme System
// ═══════════════════════════════════════════════════════
function initTheme() {
  const savedTheme = localStorage.getItem('voco-theme') || 'warm';
  const savedMode = localStorage.getItem('voco-mode') || 'light';
  applyTheme(savedTheme, savedMode);
}

function applyTheme(theme, mode) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-mode', mode);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = mode === 'dark' ? '#1E1E2E' : (mode === 'eye-care' ? '#F5E6D3' : '#FBF7F0');
  localStorage.setItem('voco-theme', theme);
  localStorage.setItem('voco-mode', mode);

  // Update theme picker
  document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
  const active = document.querySelector(`.theme-option[data-theme="${theme}"]`);
  if (active) active.classList.add('active');

  // Update mode toggle
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  const activeMode = document.querySelector(`.mode-btn[data-mode="${mode}"]`);
  if (activeMode) activeMode.classList.add('active');
}

function selectTheme(theme) {
  const mode = document.documentElement.getAttribute('data-mode') || 'light';
  applyTheme(theme, mode);
}

function selectMode(mode) {
  const theme = document.documentElement.getAttribute('data-theme') || 'warm';
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
// Practice Flow
// ═══════════════════════════════════════════════════════
let _flowStep = 0;

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
    <div style="font-size:16px;font-weight:700;color:var(--text);">${h(topic.title)}</div>
    ${topic.description ? `<div style="font-size:13px;color:var(--text-dim);margin-top:6px;">${h(topic.description)}</div>` : ''}
    ${terms.length ? `<div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">${terms.map(v => `<span style="padding:4px 10px;background:var(--bg);border-radius:12px;font-size:12px;color:var(--text-dim);">${h(v.word)}</span>`).join('')}</div>` : ''}
    <div style="margin-top:12px;font-size:13px;color:var(--primary);">💪 用英语描述你与 "${h(topic.title)}" 相关的经历</div>`;
}

function renderCompletion() {
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
      showToast('📋 检测到 Voco 内容，已粘贴到导入框');
      document.getElementById('report-input').value = text;
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

function LoadingState({ message = 'Voco 马上到～', size = 80 } = {}) {
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
// Event Bindings
// ═══════════════════════════════════════════════════════
document.getElementById('btn-login').addEventListener('click', signIn);
document.getElementById('btn-login-email').addEventListener('click', sendMagicLink);
document.getElementById('btn-submit').addEventListener('click', () => importReport());
document.getElementById('btn-export-data').addEventListener('click', exportData);
document.getElementById('btn-logout-me').addEventListener('click', signOut);

// Template buttons
document.querySelectorAll('.tpl-btn').forEach(btn => {
  btn.addEventListener('click', (e) => { e.stopPropagation(); copyTemplate(btn.dataset.tpl); });
});

// Theme picker
document.querySelectorAll('.theme-option').forEach(o => {
  o.addEventListener('click', () => selectTheme(o.dataset.theme));
});

// Mode toggle
document.querySelectorAll('.mode-btn').forEach(b => {
  b.addEventListener('click', () => selectMode(b.dataset.mode));
});

// Search
document.getElementById('words-search')?.addEventListener('input', () => renderVocabList(_wordsAll));
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

sb.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') checkAuth();
  if (event === 'SIGNED_OUT') checkAuth();
});

checkAuth();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js?v=22');
}
