# Card F 重构：AI 陪练复盘 → 高管摘要

## 渲染函数 `renderExecutiveSummary(d: DashboardInsights)`

```js
// ── Card F: Executive Summary (替代原有 AI 陪练复盘长文本) ──
function renderExecutiveSummary(insights) {
  const container = document.getElementById('home-executive-summary');
  const d = insights;

  container.innerHTML = `
    <div class="bg-[var(--c-surface)] rounded-2xl p-5 mb-2.5 border border-[var(--c-border-light)] opacity-0 animate-[fadeInUp_0.3s_ease-out_forwards]" style="animation-delay:0.18s;box-shadow:var(--c-shadow-sm)">

      <!-- ── Header ── -->
      <div class="flex items-center gap-1.5 text-xs font-semibold text-[var(--c-text-dim)] mb-3">
        <i data-lucide="brain" class="w-3.5 h-3.5 text-[var(--c-primary)]"></i>
        AI 陪练复盘
      </div>

      <!-- ── 一句话核心总结 ── -->
      <p class="font-[Georgia,serif] text-[17px] italic text-[var(--c-text)] leading-[1.7] mb-4 px-3 py-2.5 bg-[var(--c-primary-light)] rounded-xl border-l-[3px] border-l-[var(--c-primary)]">
        ${h(d.executiveSummary)}
      </p>

      <!-- ── 双栏：亮点 + 靶点 ── -->
      <div class="grid grid-cols-2 gap-3 mb-4">

        <!-- ✨ 左栏：亮点 -->
        <div class="bg-[var(--c-green-light)]/60 rounded-xl p-3.5">
          <div class="flex items-center gap-1 mb-2.5">
            <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-500"></i>
            <span class="text-[11px] font-bold text-emerald-700">✨ 亮点</span>
          </div>
          <ul class="space-y-2">
            ${d.highlights.map((h, i) => `
              <li class="flex items-start gap-1.5 text-[12px] text-[var(--c-text)] leading-[1.5]">
                <span class="w-1 h-1 rounded-full bg-emerald-400 shrink-0 mt-[6px]"></span>
                <span>${h.text}</span>
              </li>
            `).join('')}
          </ul>
        </div>

        <!-- 🎯 右栏：核心提升靶点 -->
        <div class="bg-[var(--c-orange-light)]/60 rounded-xl p-3.5">
          <div class="flex items-center gap-1 mb-2.5">
            <i data-lucide="target" class="w-3.5 h-3.5 text-amber-500"></i>
            <span class="text-[11px] font-bold text-amber-700">🎯 核心靶点</span>
          </div>
          <ul class="space-y-2.5">
            ${d.targetAreas.map(t => `
              <li class="text-[12px] leading-[1.5]">
                <div class="text-[var(--c-text)] mb-1">
                  <span class="font-semibold text-[var(--c-text)]">${h(t.label)}</span>
                  <span class="text-[var(--c-text-dim)]">：</span>
                  <span class="font-bold text-[var(--c-red)]">${h(t.keyword)}</span>
                </div>
                <button
                  onclick="navigateToTab('speak','${t.filterKey}','${t.filterLabel}')"
                  class="inline-flex items-center gap-1 px-2.5 py-1 bg-[var(--c-orange)]/20 text-[var(--c-orange)] rounded-full text-[10px] font-bold cursor-pointer hover:bg-[var(--c-orange)]/30 transition-colors border-0"
                >
                  <i data-lucide="arrow-right" class="w-3 h-3"></i>
                  ${t.actionLabel}
                </button>
              </li>
            `).join('')}
          </ul>
        </div>

      </div>

      <!-- ── 展开：完整复盘原文（降级为可折叠详情） ── -->
      <details class="group">
        <summary class="text-[11px] text-[var(--c-text-ultradim)] cursor-pointer hover:text-[var(--c-text-dim)] transition-colors list-none flex items-center gap-1">
          <i data-lucide="chevron-down" class="w-3 h-3 group-open:rotate-180 transition-transform"></i>
          查看完整复盘原文
        </summary>
        <div class="mt-3 p-3 bg-[var(--c-bg)] rounded-xl text-[13px] text-[var(--c-text-dim)] leading-[1.8]">
          ${hf(d.overallReview)}
        </div>
      </details>

    </div>`;

  refreshIcons(container);
}
```

## 与现有代码集成点

在 `renderInsightsSection()` 末尾（Card F 位置），将原来的：

```js
// Card F: Overall Review
html += card(0.18, `...大段文字...`);
```

替换为调用新函数：

```js
renderExecutiveSummary(d);
```

并在 HTML 中 `#home-insights` 之后新增容器：

```html
<div id="home-executive-summary"></div>
```

## 视觉对比

| 维度 | 旧 Card F | 新 Executive Summary |
|------|----------|---------------------|
| 顶部 | ❌ 无总结 | ✅ 一句话 serif 斜体核心总结 |
| 亮点 | ❌ 散落在 Card C | ✅ 左侧绿底 CheckCircle2 列表 |
| 靶点 | ❌ 无结构化靶点 | ✅ 右侧橙底 Target + **加粗关键词** + 路由按钮 |
| 原文 | ❌ 全部暴露 | ✅ 降级为 `<details>` 可折叠 |
| 信息密度 | ❌ 低（长文本墙） | ✅ 高（扫一眼掌握全局） |
