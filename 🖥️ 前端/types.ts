// ═══════════════════════════════════════════════════════
// Voco v6.0 — TypeScript Data Schema
// 「最专业的 AI 口语复盘与靶向训练工作台」
// ═══════════════════════════════════════════════════════

// ── 语言学错误分类（替代"其他"） ──────────────────────
export type ErrorCategory =
  | 'tense'            // 时态混淆
  | 'preposition'      // 介词误用
  | 'article'          // 冠词遗漏/误用
  | 'word-order'       // 语序错误
  | 'vocabulary'       // 词汇匮乏/用词不当
  | 'collocation'      // 搭配不当
  | 'pronunciation'    // 发音问题
  | 'connective'       // 连接词缺失
  | 'subject-verb'     // 主谓一致
  | 'singular-plural'; // 单复数错误

export const ERROR_CATEGORY_LABELS: Record<ErrorCategory, string> = {
  tense:             '时态混淆',
  preposition:       '介词误用',
  article:           '冠词遗漏',
  'word-order':      '语序错误',
  vocabulary:        '词汇匮乏',
  collocation:       '搭配不当',
  pronunciation:     '发音问题',
  connective:        '连接词缺失',
  'subject-verb':    '主谓一致',
  'singular-plural': '单复数错误',
};

// ── SM-2 间隔复习 ──────────────────────────────────────
export interface SM2Fields {
  easeFactor: number;       // 默认 2.5，范围 [1.3, ∞)
  sm2Interval: number;      // 当前间隔（天）
  sm2Repetitions: number;   // 连续正确次数
  reviewCount: number;      // 总复习次数
  nextReviewDate: string;   // ISO date
  lastReviewedAt?: string;  // ISO datetime
}

export interface SM2Result {
  easeFactor: number;
  interval: number;
  repetitions: number;
}

// ── 单词 (Vocabulary) ───────────────────────────────────
export type VocabStatus = 'new' | 'learning' | 'mastered';

export interface VocabEntry extends SM2Fields {
  id: string;
  userId: string;
  word: string;
  phonetic: string;
  meaning: string;
  example?: string;
  dateAdded: string;        // ISO date
  sourceTopic: string;      // 来源话题
  status: VocabStatus;
  errorCategory?: ErrorCategory;  // 关联纠错类型
  topicTag: string;         // e.g. '条件句', '完成时'
}

// ── 错题 (Error) ────────────────────────────────────────
export type ErrorType = 'grammar' | 'pronunciation';

export interface ErrorEntry {
  id: string;
  userId: string;
  type: ErrorType;
  original: string;
  correction: string;
  rule?: string;
  dateAdded: string;
  sourceTopic: string;
  errorCategory: ErrorCategory;
  correctInReview: boolean;
}

// ── 地道表达 (Pattern) ──────────────────────────────────
export interface PatternEntry {
  id: string;
  userId: string;
  original: string;
  better: string;
  scene?: string;
  dateAdded: string;
  sourceTopic: string;
  topicTag: string;         // 路由关键字段
}

// ── 日报解析结构 ────────────────────────────────────────
export interface ParsedVocab {
  word: string;
  phonetic?: string;
  meaning?: string;
  example?: string;
}

export interface ParsedError {
  original?: string;
  correction?: string;
  rule?: string;
  type?: string;
}

export interface ParsedPattern {
  original?: string;
  better?: string;
  scene?: string;
}

export interface ParsedSentencePattern {
  pattern: string;
  example?: string;
}

export interface ParsedReport {
  meta: {
    type: string;
    date: string;
    topic: string;
    duration: number;
  };
  summary: {
    fluency: number;
    accuracy: number;
    naturalness: number;
    strengths: string;
    thoughts: string;
    review: string;
    nextSuggestions: string;
    weakAreas: string;
  };
  vocabulary: ParsedVocab[];
  patterns: ParsedPattern[];
  grammar: ParsedError[];
  pronunciation: ParsedError[];
  sentencePatterns: ParsedSentencePattern[];
  raw: string;
}

// ── 首页 Dashboard 聚合数据 ─────────────────────────────
export interface DashboardData {
  user: { name: string };
  status: { hasReport: boolean; lastSync: string };
  quote: QuoteItem;
  metrics: DashboardMetrics;
  insights: DashboardInsights;
  contentCards: ContentCard[];
  todos: TodoItem[];
}

export interface QuoteItem {
  en: string;
  zh: string;
  author: string;
  category: string;
}

export interface DashboardMetrics {
  overall: number;
  fluency: number;
  grammar: number;
  vocab: number;
  natural: number;
  speakMin: number;
  totalMin: number;
  topics: number;
  newWords: number;
  expressions: number;
  corrections: number;
}

// ── 高管摘要 (Executive Summary) ── 替代原有长文本墙 ────
export interface HighlightItem {
  text: string;
}

export interface TargetAreaItem {
  category: ErrorCategory;
  label: string;            // 简短标签 e.g. '时态混淆'
  keyword: string;          // 具体语法点 e.g. '过去时 vs 完成时'
  count: number;            // 该类别错误数量
  filterKey: string;        // 路由参数 e.g. 'tense'
  filterLabel: string;      // 路由显示 e.g. '时态句型'
  actionLabel: string;      // 按钮文案 e.g. '专项跟读'
}

export interface DashboardInsights {
  topics: string[];
  thoughts: { en: string; zh: string };
  strengths: string[];          // ✨ 亮点
  improvements: ImprovementItem[];
  nextSteps: NextStepItem[];
  // 📌 新增：高管摘要
  executiveSummary: string;     // 一句话核心总结
  highlights: HighlightItem[];  // ✨ 亮点精简版
  targetAreas: TargetAreaItem[];// 🎯 核心提升靶点
  overallReview: string;        // 保留原始冗长复盘（降级为可展开详情）
}

// ── 首页子组件数据结构 ──────────────────────────────────
export interface ImprovementItem {
  issue: string;
  detail: string;
  action: string;
  tab: 'words' | 'speak';
  filter: string;
  filterLabel: string;
  errorCategory?: ErrorCategory;
}

export interface NextStepItem {
  step: string;
  action: string;
  tab: 'words' | 'speak';
  filter: string;
  filterLabel: string;
}

export interface ContentCard {
  icon: string;
  num: number;
  label: string;
  tab: 'words' | 'speak';
  btn: string;
  filter: string;
  filterLabel: string;
}

export interface TodoItem {
  text: string;
  sub?: string;
  done: boolean;
  action?: (() => void) | null;
  tab: 'words' | 'speak' | null;
}

// ── 「我的」页 错题模式分析 ─────────────────────────────
export interface ErrorPatternItem {
  category: ErrorCategory;
  label: string;
  count: number;
  percentage: number;
  rank: number;             // 1=最高频
}

// ── 全局路由过滤状态 ────────────────────────────────────
export type TabId = 'home' | 'words' | 'speak' | 'me';

export interface FilterState {
  activeFilter: string | null;
  activeFilterLabel: string;
  tab: TabId;
}

export type WordsViewMode = 'all' | 'today' | 'errors';

// ── Mock 工厂函数 ───────────────────────────────────────
export function createMockDashboardData(): DashboardData {
  return {
    user: { name: 'kk' },
    status: { hasReport: true, lastSync: '2026-08-12 18:30' },
    quote: {
      en: "The limits of my language mean the limits of my world.",
      zh: "语言的边界，就是世界的边界。",
      author: "Ludwig Wittgenstein",
      category: "PHILOSOPHY",
    },
    metrics: {
      overall: 78, fluency: 75, grammar: 72, vocab: 80, natural: 82,
      speakMin: 18, totalMin: 30,
      topics: 3, newWords: 4, expressions: 10, corrections: 2,
    },
    insights: createMockInsights(),
    contentCards: [
      { icon: 'pen-line',       num: 4,  label: '新学单词', tab: 'words', btn: '复习今日单词', filter: 'today',  filterLabel: '今日新词' },
      { icon: 'ruler',          num: 10, label: '核心句型', tab: 'speak', btn: '练习句型',   filter: '句型',   filterLabel: '核心句型' },
      { icon: 'wrench',         num: 2,  label: '重点纠错', tab: 'words', btn: '查看纠错',   filter: 'errors', filterLabel: '高频错词' },
    ],
    todos: [
      { text: '复习 5 个今日新单词', done: false, action: null, tab: 'words' },
      { text: '完成影子跟读练习',     done: false, action: null, tab: 'speak' },
      { text: '导入今日 ChatGPT 日报', done: true,  action: null, tab: null },
    ],
  };
}

export function createMockInsights(): DashboardInsights {
  return {
    topics: ['personal growth', 'daily routines', 'future plans'],
    thoughts: {
      en: "Personal growth requires patience and time — there's no shortcut to becoming a better version of yourself.",
      zh: "个人成长需要时间和耐心——成为更好的自己，没有捷径可走。",
    },
    strengths: [
      '能够表达抽象观点，如"个人成长需要时间沉淀"',
      '遇到表达困难时，能主动替换近义词汇绕过障碍',
      '语音语调自然，停顿位置合理，语速适中',
    ],
    improvements: [
      { issue: '过去时态与完成时混淆', detail: "'I have went' → 应为 'I have gone'", action: '专项攻克', tab: 'speak', filter: 'tense', filterLabel: '时态句型', errorCategory: 'tense' },
      { issue: '缺少逻辑连接词',       detail: '多处句子之间缺乏 however/therefore 等过渡词', action: '专项攻克', tab: 'speak', filter: 'connective', filterLabel: '连接词句型', errorCategory: 'connective' },
      { issue: '冠词遗漏',             detail: "'I went to store' → 应为 'I went to the store'", action: '查看纠错', tab: 'words', filter: 'errors', filterLabel: '高频错词', errorCategory: 'article' },
    ],
    nextSteps: [
      { step: '练习使用更复杂的连接词（however, therefore, moreover）', action: '专项跟读', tab: 'speak', filter: 'connective', filterLabel: '连接词句型' },
      { step: '刻意练习过去时态与现在完成时的区分',                     action: '专项跟读', tab: 'speak', filter: 'tense',      filterLabel: '时态句型' },
      { step: '尝试在下次对话中使用至少 3 个本周新学单词',              action: '去练习',   tab: 'words', filter: 'today',      filterLabel: '今日新词' },
    ],
    // 📌 高管摘要 — 核心新增
    executiveSummary: '整体流利度明显提升，但在时态一致性和逻辑连接词的使用上仍有结构化提升空间。',
    highlights: [
      { text: '能够流畅表达抽象观点，语言组织能力较好' },
      { text: '遇到表达困难时能主动替换近义词，沟通策略成熟' },
      { text: '语音语调自然，停顿位置合理，语速适中' },
    ],
    targetAreas: [
      { category: 'tense',       label: '时态混淆',   keyword: '过去时 vs 完成时', count: 3, filterKey: 'tense',      filterLabel: '时态句型',   actionLabel: '专项跟读' },
      { category: 'connective',  label: '连接词缺失', keyword: 'however / therefore', count: 2, filterKey: 'connective', filterLabel: '连接词句型', actionLabel: '专项跟读' },
      { category: 'article',     label: '冠词遗漏',   keyword: 'a / an / the',       count: 2, filterKey: 'errors',     filterLabel: '高频错词',   actionLabel: '去纠错' },
    ],
    overallReview: "本次练习围绕个人成长展开，用户能够表达较复杂的观点，在描述抽象概念时展现了较好的语言组织能力。整体流利度有明显提升，但在语法细节和连接词使用上仍有优化空间。建议在下次练习中刻意关注时态一致性和逻辑连接词的运用。",
  };
}

export function createMockErrorPatterns(): ErrorPatternItem[] {
  const patterns: ErrorPatternItem[] = [
    { category: 'tense',        label: '时态混淆',   count: 5, percentage: 35, rank: 1 },
    { category: 'connective',   label: '连接词缺失', count: 3, percentage: 21, rank: 2 },
    { category: 'article',      label: '冠词遗漏',   count: 2, percentage: 14, rank: 3 },
    { category: 'preposition',  label: '介词误用',   count: 2, percentage: 14, rank: 4 },
    { category: 'vocabulary',   label: '词汇匮乏',   count: 1, percentage: 8,  rank: 5 },
    { category: 'word-order',   label: '语序错误',   count: 1, percentage: 8,  rank: 6 },
  ];
  return patterns.sort((a, b) => b.count - a.count);
}
