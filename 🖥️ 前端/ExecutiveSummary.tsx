// ═══════════════════════════════════════════════════════
// Voco v6.0 — ExecutiveSummary (Card F)
// 「AI 陪练复盘 → 高管摘要」
// 替代原有 300 字纯文本墙
// ═══════════════════════════════════════════════════════

import { CheckCircle2, Target, Brain, ChevronDown, ArrowRight } from "lucide-react";
import type { DashboardInsights, TargetAreaItem } from "./types";

// ── Props ──────────────────────────────────────────────
interface ExecutiveSummaryProps {
  insights: DashboardInsights;
  /** 路由跳转回调 — 接入 React Router 时替换为 useNavigate */
  onNavigate?: (tab: string, filter: string, label: string) => void;
}

// ── 子组件：靶点行 ─────────────────────────────────────
function TargetRow({
  target,
  onNavigate,
}: {
  target: TargetAreaItem;
  onNavigate?: (tab: string, filter: string, label: string) => void;
}) {
  return (
    <li className="text-[12px] leading-relaxed">
      {/* 标签 + 关键词 Badge */}
      <div className="flex items-baseline flex-wrap gap-x-1 gap-y-1 mb-1.5">
        <span className="font-semibold text-stone-700">
          {target.label}
        </span>
        <span className="text-stone-400">：</span>
        <span
          className="
            inline-block px-1.5 py-0.5 rounded-md
            bg-orange-50 text-orange-600
            text-[11px] font-bold
            border border-orange-200/60
          "
        >
          {target.keyword}
        </span>
        {target.count > 1 && (
          <span className="text-[10px] text-stone-400 ml-0.5">
            ×{target.count}
          </span>
        )}
      </div>

      {/* CTA 按钮 — 占位 onClick，后续接入 React Router */}
      <button
        type="button"
        onClick={() => onNavigate?.("speak", target.filterKey, target.filterLabel)}
        className="
          inline-flex items-center gap-1
          px-2.5 py-1
          bg-amber-50 text-amber-700
          rounded-full
          text-[10px] font-bold
          border border-amber-200/60
          cursor-pointer
          hover:bg-amber-100
          active:scale-[0.97]
          transition-all duration-150
        "
      >
        <ArrowRight className="w-3 h-3" />
        {target.actionLabel}
      </button>
    </li>
  );
}

// ── 主组件 ─────────────────────────────────────────────
export default function ExecutiveSummary({
  insights,
  onNavigate,
}: ExecutiveSummaryProps) {
  const {
    executiveSummary,
    highlights,
    targetAreas,
    overallReview,
  } = insights;

  return (
    <div
      className="
        bg-white rounded-2xl p-5 mb-2.5
        border border-stone-200/60
        opacity-0
        animate-[fadeInUp_0.3s_ease-out_forwards]
      "
      style={{
        animationDelay: "0.18s",
        boxShadow: "0 1px 3px rgba(100,60,60,0.04)",
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-400 mb-3">
        <Brain className="w-3.5 h-3.5 text-stone-400" />
        AI 陪练复盘
      </div>

      {/* ── 一句话核心总结 ── */}
      <p
        className="
          font-[Georgia,serif] text-[17px] italic
          text-stone-700 leading-[1.7]
          mb-4 px-3 py-2.5
          bg-stone-50 rounded-xl
          border-l-[3px] border-l-stone-300
        "
      >
        {executiveSummary}
      </p>

      {/* ── 双栏：亮点 + 靶点 ── */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* ✨ 左栏：亮点 */}
        <div className="bg-emerald-50/60 rounded-xl p-3.5">
          <div className="flex items-center gap-1 mb-2.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[11px] font-bold text-emerald-700">
              亮点
            </span>
          </div>
          <ul className="space-y-2">
            {highlights.map((h, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-[12px] text-stone-600 leading-[1.5]"
              >
                <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0 mt-[6px]" />
                <span>{h.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 🎯 右栏：核心提升靶点 */}
        <div className="bg-amber-50/60 rounded-xl p-3.5">
          <div className="flex items-center gap-1 mb-2.5">
            <Target className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] font-bold text-amber-700">
              核心靶点
            </span>
          </div>
          <ul className="space-y-2.5">
            {targetAreas.map((t) => (
              <TargetRow
                key={t.category}
                target={t}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </div>
      </div>

      {/* ── 展开：完整复盘原文（降级为可折叠详情） ── */}
      <details className="group">
        <summary
          className="
            text-[11px] text-stone-400
            cursor-pointer
            hover:text-stone-500
            transition-colors
            list-none
            flex items-center gap-1
          "
        >
          <ChevronDown className="w-3 h-3 group-open:rotate-180 transition-transform" />
          查看完整复盘原文
        </summary>
        <div
          className="
            mt-3 p-3
            bg-stone-50 rounded-xl
            text-[13px] text-stone-500 leading-[1.8]
          "
        >
          {overallReview}
        </div>
      </details>
    </div>
  );
}
