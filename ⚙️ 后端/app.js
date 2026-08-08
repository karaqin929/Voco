// LingoTrace PWA — 首页/词汇/我的
const API = '';
let DASHBOARD_DATA = null;

// ─── Tab Switching ─────────────────────────────────
document.querySelectorAll('.tab-bar .tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    const tab = document.getElementById('tab-' + btn.dataset.tab);
    tab.classList.add('active');

    if (btn.dataset.tab === 'home') loadHome();
    if (btn.dataset.tab === 'library') loadLibrary('vocab');
    if (btn.dataset.tab === 'me') loadMe();
  });
});

// ─── Library sub-tabs ──────────────────────────────
document.querySelectorAll('.lib-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.lib-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadLibrary(btn.dataset.lib);
  });
});

// ─── Text-to-Speech ────────────────────────────────
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

// ─── Calendar ──────────────────────────────────────
function renderCalendar(sessions) {
  const grid = document.getElementById('calendar-grid');
  const today = new Date();
  const weeks = 20;
  let html = '';
  const sessionDates = new Set();

  // Gather session dates from data
  // sessions is array of date strings like ["2026-08-08", ...]
  if (Array.isArray(sessions)) {
    sessions.forEach(d => sessionDates.add(d));
  }

  // We estimate sessions from stored dates — actually from progress
  // For now, build a simple calendar showing last 140 days
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dow = d.getDay();

    if (dow === 0 && html.length > 0) html += '<br>';

    let cls = 'cal-day';
    if (sessionDates.has(key)) {
      cls += ' l3';
    }
    html += `<span class="${cls}" title="${key}"></span>`;
  }

  grid.innerHTML = html;
}

// ─── Streak ────────────────────────────────────────
function renderStreak(dates) {
  const el = document.getElementById('streak-days');
  if (!dates || !dates.length) {
    el.textContent = '0 天';
    return;
  }

  // Calculate consecutive days ending today/yesterday
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const dateSet = new Set(dates);

  let streak = 0;
  let check = dateSet.has(today) ? today : (dateSet.has(yesterday) ? yesterday : null);
  if (!check) { el.textContent = '0 天'; return; }

  while (dateSet.has(check)) {
    streak++;
    const d = new Date(check);
    d.setDate(d.getDate() - 1);
    check = d.toISOString().slice(0, 10);
  }

  el.textContent = streak + ' 天';
}

// ─── Home Tab ──────────────────────────────────────
async function loadHome() {
  try {
    const p = await fetch(API + '/api/dashboard').then(r => r.json());
    DASHBOARD_DATA = p;

    if (!p.total_sessions) {
      document.getElementById('streak-days').textContent = '0 天';
      document.getElementById('calendar-grid').innerHTML = renderCalendar([]);
      return;
    }

    // Streak — extract session dates from reports
    // We use the total sessions info, for now just show it
    document.getElementById('streak-days').textContent = p.total_sessions + ' 天';

    // Build approximate session dates
    const sessionDates = [];
    for (let i = 0; i < p.total_sessions; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      sessionDates.push(d.toISOString().slice(0, 10));
    }
    renderCalendar(sessionDates);
    renderStreak(sessionDates);

    // Stats
    document.getElementById('stat-vocab').innerHTML = `📝 ${p.words_learned || 0} 单词`;
    document.getElementById('stat-errors').innerHTML = `🔧 ${p.errors_fixed || 0} 纠正`;
    const lastFlu = (p.fluency_trend || []).slice(-1)[0];
    document.getElementById('stat-fluency').innerHTML = `🎯 ${lastFlu || '--'}/10`;

    // Review prompt
    const review = await fetch(API + '/api/review/today').then(r => r.json());
    if (review.errors?.length || review.vocabulary?.length) {
      const rp = document.getElementById('review-prompt');
      rp.style.display = 'block';
      const count = (review.errors?.length || 0) + (review.vocabulary?.length || 0);
      document.getElementById('review-preview').innerHTML =
        `<p style="color:var(--text-dim);font-size:13px">${count} 项待复习 — 去「词汇」页查看</p>`;
    }
  } catch (e) {
    console.error(e);
  }
}

// ─── Library Tab ───────────────────────────────────
async function loadLibrary(type) {
  const el = document.getElementById('library-content');
  el.className = 'loading';
  el.innerHTML = '加载中...';

  try {
    if (type === 'vocab') {
      const items = await fetch(API + '/api/vocabulary?status=all').then(r => r.json());
      if (!items.length) { el.innerHTML = '<div class="empty-state">📝 还没有单词<br>先去「我的」导入日报吧</div>'; return; }
      el.innerHTML = items.reverse().map(v => `
        <div class="vocab-card">
          <button class="speak-btn" onclick="speak('${v.word.replace(/'/g, "\\'")}')">🔊</button>
          <span class="word">${v.word}</span>
          <span class="phonetic">${v.phonetic || ''}</span>
          <div class="meaning">${v.meaning || ''}</div>
          ${v.example ? `<div class="example">"${v.example}"</div>` : ''}
          <button class="master-btn${v.mastered ? ' done' : ''}"
            onclick="markMastered('${v.word.replace(/'/g, "\\'")}', this)"
            ${v.mastered ? 'disabled' : ''}>
            ${v.mastered ? '✅ 已掌握' : '标记掌握'}
          </button>
        </div>
      `).join('');
    } else if (type === 'errors') {
      const items = await fetch(API + '/api/errors').then(r => r.json());
      if (!items.length) { el.innerHTML = '<div class="empty-state">✨ 没有纠错记录</div>'; return; }
      el.innerHTML = items.reverse().map((e, i) => `
        <div class="error-card">
          <div class="err-type">${e.type === 'pronunciation' ? '🔊 发音' : '📖 语法'}</div>
          <div class="err-orig">${e.original || ''}</div>
          <div class="err-corr">→ ${e.correction || e.better || ''}</div>
          ${e.rule || e.scene ? `<div class="err-rule">${e.rule || e.scene}</div>` : ''}
          <button class="fix-btn${e.correct_in_review ? ' done' : ''}"
            ${e.correct_in_review ? 'disabled' : ''}
            onclick="markFixed(${items.length - 1 - i}, this)">
            ${e.correct_in_review ? '✅ 已纠正' : '已纠正'}
          </button>
        </div>
      `).join('');
    } else if (type === 'patterns') {
      const items = await fetch(API + '/api/patterns').then(r => r.json());
      if (!items.length) { el.innerHTML = '<div class="empty-state">💬 还没有句型<br>先去「我的」导入日报吧</div>'; return; }
      el.innerHTML = items.reverse().map(p => `
        <div class="pattern-card">
          <div class="pat-orig">${p.original || ''}</div>
          <div class="pat-better">→ ${p.better || ''}</div>
          ${p.scene ? `<div class="pat-scene">场景: ${p.scene}</div>` : ''}
        </div>
      `).join('');
    }
  } catch (e) {
    el.innerHTML = '<div class="empty-state">加载失败</div>';
  }
}

// ─── Mark Mastered / Fixed ──────────────────────────
async function markMastered(word, btn) {
  await fetch(API + '/api/vocabulary/mastered', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word }),
  });
  btn.textContent = '✅ 已掌握';
  btn.classList.add('done');
  btn.disabled = true;
  toast('已掌握: ' + word);
}

async function markFixed(idx, btn) {
  await fetch(API + '/api/errors/reviewed', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ index: idx }),
  });
  btn.textContent = '✅ 已纠正';
  btn.classList.add('done');
  btn.disabled = true;
  toast('已标记纠正');
}

// ─── Me Tab ────────────────────────────────────────
async function loadMe() {
  // Load config
  try {
    const cfg = await fetch(API + '/api/config').then(r => r.json());
    document.getElementById('setting-name').value = cfg.app_name || 'VoiceLog';
  } catch (e) {}

  const trends = document.getElementById('me-trends');
  try {
    const p = await fetch(API + '/api/dashboard').then(r => r.json());
    if (!p.total_sessions) {
      trends.innerHTML = '<div class="empty-state">还没有学习记录</div>';
      return;
    }

    const fluMax = Math.max(...(p.fluency_trend || [1]), 1);
    const fluBars = (p.fluency_trend || []).slice(-10).map(v => {
      const pct = Math.round((v / 10) * 100);
      return `<div style="width:${pct}%"></div>`;
    }).join('');

    const accBars = (p.accuracy_trend || []).slice(-10).map(v => {
      const pct = Math.round((v / 10) * 100);
      return `<div style="width:${pct}%"></div>`;
    }).join('');

    trends.innerHTML = `
      <div class="trend-row">
        <span class="trend-label">流利度</span>
        <div class="trend-bar-wrap">${fluBars}</div>
        <span style="font-size:12px;width:24px;text-align:right">${(p.fluency_trend || []).slice(-1)[0] || '-'}</span>
      </div>
      <div class="trend-row">
        <span class="trend-label">准确度</span>
        <div class="trend-bar-wrap">${accBars}</div>
        <span style="font-size:12px;width:24px;text-align:right">${(p.accuracy_trend || []).slice(-1)[0] || '-'}</span>
      </div>
    `;
  } catch (e) {
    trends.innerHTML = '<div class="empty-state">加载失败</div>';
  }
}

// ─── Import Report ──────────────────────────────────
document.getElementById('btn-submit').addEventListener('click', async () => {
  const text = document.getElementById('report-input').value.trim();
  if (!text) return toast('请先粘贴日报内容', true);

  const btn = document.getElementById('btn-submit');
  btn.disabled = true;
  btn.textContent = '解析中...';

  try {
    const res = await fetch(API + '/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();

    if (data.error) { toast(data.error, true); return; }

    const s = data.stats;
    document.getElementById('import-result').innerHTML = `
      <div class="result-grid">
        <div class="result-card"><div class="num">${s.total_errors || 0}</div><div class="lbl">纠正项</div></div>
        <div class="result-card"><div class="num">${s.vocabulary || 0}</div><div class="lbl">新单词</div></div>
        <div class="result-card"><div class="num">${s.patterns || 0}</div><div class="lbl">新句型</div></div>
        <div class="result-card"><div class="num">${data.progress.total_sessions}</div><div class="lbl">累计课程</div></div>
      </div>
    `;
    document.getElementById('report-input').value = '';
    toast(`✅ 已入库: ${s.total_errors || 0} 纠正 + ${s.vocabulary || 0} 单词`);

  } catch (e) {
    toast('提交失败: ' + e.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = '解析入库';
  }
});

// ─── Save App Name ──────────────────────────────────
document.getElementById('btn-save-name').addEventListener('click', async () => {
  const name = document.getElementById('setting-name').value.trim() || 'VoiceLog';
  try {
    await fetch(API + '/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_name: name }),
    });
    document.title = name;
    toast('名称已更新: ' + name);
  } catch (e) {
    toast('保存失败', true);
  }
});

// ─── Toast ──────────────────────────────────────────
function toast(msg, isError = false) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = 'toast ' + (isError ? 'error' : '');
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ─── Initial ────────────────────────────────────────
loadHome();
