// Voco — Daily Report / Topic Card / Insight Parser (JS version)
// Parses ChatGPT-generated Markdown reports

// ── 对话占比（Voco 2.0）：统计 User 与 Assistant 的角色词数 ──
// 词数口径：英文按空格分词计数 + 中文按单字计数（混合语料公平）
function countTranscriptWords(s) {
  const latin = (String(s).match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g) || []).length;
  const cjk = (String(s).match(/[一-鿿]/g) || []).length;
  return latin + cjk;
}

// 扫描 Transcript：行首角色标注（User/Assistant/AI/Me/You/你/我/用户）统计双方词数
// 无角色标注或总词数为 0 → 返回 null（UI 优雅降级，不硬造占比）
function parseSpeakingRatio(text) {
  const t = String(text || '');
  let user = 0, ai = 0, hits = 0;
  const lineRe = /^\s*\[?(User|Assistant|AI|Me|You|你|我|用户)\]?\s*[:：]\s*(.+?)\s*$/gim;
  let m;
  while ((m = lineRe.exec(t)) !== null) {
    const role = String(m[1]).toLowerCase();
    const words = countTranscriptWords(m[2]);
    if (role === 'user' || role === 'me' || role === 'you' || role === '你' || role === '我' || role === '用户') user += words;
    else ai += words;
    hits++;
  }
  return (hits > 0 && (user + ai) > 0) ? { user, ai } : null;
}

// ── 分类规则提取引擎（4 标准分类归一化）────────────────────
// 收敛为且仅收敛为：发音与重音 / 语法与句式 / 地道表达 / 逻辑与衔接，全部未命中才归「其他」。
// 供解析器（parseItems）、app.js normalizeErrorCategory（存量标签映射）、高频错误模式聚合共用 —— 单一分类源。
function classifyErrorType(original, correction, rule) {
  const text = [rule, original, correction].filter(Boolean).join(' ').toLowerCase();
  const o = (original || '').toLowerCase();
  const c = (correction || '').toLowerCase();
  // ① 发音与重音：读音/音标/重音/音节/pronunciation
  if (/pronunciation|pronunc|读音|音标|重音|音节|发音/.test(text)) return '发音与重音';
  // ② 语法与句式：grammar/tense/article/plural/时态/语态/单复数/单数/复数/冠词/介词/主谓/词性/搭配 关键词
  //    或 时态助动词/词尾特征 或 原句/正句仅冠词差集
  //    in/on/at：规则文本出现字面 "in/on/at"，或单独介词词（in/on/at）与介词语义词（用法/混淆/搭配/区别/用错/误用）共现才命中 ——
  //    防止误伤地道表达例句里普通的 in（如 breathtaking in IMAX）
  const r = (rule || '').toLowerCase();
  if (/grammar|tense|article|preposition|plural|时态|语态|单复数|单数|复数|冠词|介词|主谓|词性|搭配|过去式|完成时|进行时|过去时|(\bed\b)/.test(text)
      || /in\/on\/at/.test(text)
      || (/\b(in|on|at)\b/.test(r) && /介词|用法|混淆|搭配|区别|用错|误用/.test(r))
      || /\b(was|were|had|have|has|will|would|did)\b/.test(o + ' ' + c)
      || (/\b(a|an|the)\b/.test(o) && o.replace(/\b(a|an|the)\b/gi, '') === c.replace(/\b(a|an|the)\b/gi, ''))) return '语法与句式';
  // ③ 地道表达：collocation/wording/地道/用词/表达/换成/建议/更自然/更好的说法/better
  if (/collocation|wording|地道|用词|表达|换成|建议|更自然|更好的说法|better/.test(text)) return '地道表达';
  // ④ 逻辑与衔接：however/coherence/逻辑/连接/衔接/连贯/转折
  if (/connector|however|therefore|coherence|逻辑|连接|衔接|连贯|转折/.test(text)) return '逻辑与衔接';
  return '其他';
}

function parseReport(text) {
  const result = {
    meta: {},
    pronunciation: [],
    grammar: [],
    patterns: [],
    sentence_patterns: [],
    vocabulary: [],
    summary: {},
    raw: text,
  };

  // Split frontmatter from body
  const fmMatch = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  let body = text;

  if (fmMatch) {
    body = fmMatch[2];
    // Parse YAML-like frontmatter
    const fmText = fmMatch[1];
    for (const line of fmText.split('\n')) {
      const kv = line.match(/^(\w+):\s*(.*)/);
      if (kv) result.meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
    }
  }

  const reportType = result.meta.type || 'daily-report';

  if (reportType === 'topic-card') {
    parseTopicCard(body, result);
  } else if (reportType === 'insight-report') {
    parseInsightReport(body, result);
  } else {
    // Default: daily-report
    parseDailyReport(body, result);
  }

  return result;
}

function parseDailyReport(body, result) {
  const sections = body.split(/^##\s+/m).filter(Boolean);

  for (const section of sections) {
    const lines = section.split('\n');
    const header = lines[0].trim();
    const content = lines.slice(1).join('\n');

    if (header.includes('语法纠正')) {
      result.grammar = parseItems(content, ['我说', '应为', '规则']);
    } else if (header.includes('发音纠正')) {
      result.pronunciation = parseItems(content, ['问题', '纠正']);
    } else if (header.includes('地道表达')) {
      result.patterns = parseItems(content, ['我说', '更自然', '场景']);
    } else if (header.includes('核心句型')) {
      result.sentence_patterns = parseSentencePatterns(content);
    } else if (header.includes('今日生词') || header.includes('生词')) {
      result.vocabulary = parseVocabulary(content);
    } else if (header.includes('表现总结') || header.includes('总结')) {
      // 原地合并：严禁整体替换 summary —— 否则会抹掉前面已解析的 dailyThought/thoughts 等字段
      Object.assign(result.summary, parseSummary(content));
    } else if (header.includes('表现亮点')) {
      result.summary.strengths = content.trim();
    } else if (header.includes('AI 复盘评语') || header.includes('复盘评语')) {
      result.summary.review = content.trim();
    } else if (header.includes('下一步建议')) {
      result.summary.next_suggestions = content.trim();
    } else if (header.includes('对话想法') || header.includes('今日心得') || header.includes('今日想法') || header.includes('我的想法') || header.includes('我的心得') || header.includes('今日思考')) {
      result.summary.thoughts = content.trim();
      // 归一化提取：今日对话想法 → dailyThought { en, zh }（首页 Card B 动态渲染）
      result.summary.dailyThought = parseDailyThought(content);
    } else if (header.includes('对话记录') || header.includes('Transcript') || header.includes('对话原文') || header.includes('逐字稿')) {
      // Voco 2.0：对话占比 —— User/Assistant 角色词数（无有效记录 → null，UI 优雅降级）
      result.summary.speakingRatio = parseSpeakingRatio(content);
    }
  }
}

function parseSentencePatterns(text) {
  const patterns = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.replace(/^[-*]\s*/, '').trim();
    if (!trimmed) continue;
    // Format: pattern | example  OR  pattern - example
    const parts = trimmed.split(/\s*\|\s*/);
    if (parts.length >= 2) {
      patterns.push({ pattern: parts[0], example: parts.slice(1).join(' | ') });
    } else {
      patterns.push({ pattern: trimmed, example: '' });
    }
  }
  return patterns;
}

function parseTopicCard(body, result) {
  const sections = body.split(/^##\s+/m).filter(Boolean);

  for (const section of sections) {
    const lines = section.split('\n');
    const header = lines[0].trim();
    const content = lines.slice(1).join('\n');

    if (header.includes('关键术语') || header.includes('生词') || header.includes('关键词')) {
      // v83：话题卡「关键术语」为三段契约 term | definition | example（无音标段），
      // 与日报生词 parseVocabulary 的四段契约（word|phonetic|meaning|example）不同 ——
      // 严禁混用导致 definition 错位进 phonetic；四段输入仍兼容透传
      result.vocabulary = parseTopicTerms(content);
    }
  }
}

// 话题卡关键术语解析（v83）：三段 term | definition | example → word/meaning/example（phonetic 留空）
// 兼容两段（term | definition）与四段（含音标）输入，绝不字段错位
function parseTopicTerms(text) {
  const words = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.replace(/^[-*]\s*/, '').trim();
    if (!trimmed || trimmed.startsWith('[')) continue;

    const parts = trimmed.split('|').map(s => s.trim());
    if (parts.length >= 4) {
      words.push({ word: parts[0] || '', phonetic: parts[1] || '', meaning: parts[2] || '', example: parts.slice(3).join(' | ') || '' });
    } else if (parts.length === 3) {
      words.push({ word: parts[0] || '', phonetic: '', meaning: parts[1] || '', example: parts[2] || '' });
    } else if (parts.length === 2) {
      words.push({ word: parts[0] || '', phonetic: '', meaning: parts[1] || '', example: '' });
    }
  }
  return words;
}

function parseInsightReport(body, result) {
  // Just store raw content; structured analysis happens in settings UI
  const sections = body.split(/^##\s+/m).filter(Boolean);
  for (const section of sections) {
    const lines = section.split('\n');
    const header = lines[0].trim();
    const content = lines.slice(1).join('\n');

    if (header.includes('反复出现') || header.includes('问题')) {
      result.summary.weak_areas = header;
    }
    if (header.includes('改进建议') || header.includes('建议')) {
      result.summary.recommendation = content.trim();
    }
  }
}

function parseItems(text, fields) {
  const items = [];
  const blocks = text.split(/\n(?=-\s*\[)/);

  for (const block of blocks) {
    const item = {};
    for (const field of fields) {
      const re = new RegExp(`-\\s*\\[${field}\\]\\s*(.+)`, 'i');
      const m = block.match(re);
      if (m) {
        const keyMap = {
          '我说': 'original', '应为': 'correction', '规则': 'rule',
          '问题': 'original', '纠正': 'correction',
          '更自然': 'better', '场景': 'scene',
        };
        item[keyMap[field] || field] = m[1].trim();
      }
    }
    // 分类规则提取：错题条目按内容动态推断 type（发音与重音/语法与句式/地道表达/逻辑与衔接/其他）
    if (Object.keys(item).length > 0) {
      if ((item.original || item.correction) && !item.type) {
        item.type = classifyErrorType(item.original || '', item.correction || '', item.rule || '');
      }
      items.push(item);
    }
  }
  return items;
}

function parseVocabulary(text) {
  const words = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.replace(/^[-*]\s*/, '').trim();
    if (!trimmed || trimmed.startsWith('[')) continue;

    // Format: word | phonetic | meaning | example
    const parts = trimmed.split('|').map(s => s.trim());
    if (parts.length >= 2) {
      words.push({
        word: parts[0] || '',
        phonetic: parts[1] || '',
        meaning: parts[2] || '',
        example: parts[3] || '',
      });
    }
  }
  return words;
}

// 今日对话想法提取：产出归一化 dailyThought { en, zh }（缺失侧为空字符串）
// 支持 "EN: ... / ZH: ..."、"英文：... / 中文：..." 双行标注；
// 无标注的单行内容按中英文占比判断（中文占优 → zh，否则 → en）
function parseDailyThought(text) {
  const t = (text || '').trim();
  if (!t) return { en: '', zh: '' };
  // 惰性捕获 + 前瞻截断：EN 捕获止于 ZH 标记（或行尾），反之亦然 —— 防止贪婪吞并另一半
  const enM = t.match(/(?:EN|English|英文)\s*[:：]\s*(.+?)(?=\s*(?:ZH|中文|译文)\s*[:：]|$)/i);
  const zhM = t.match(/(?:ZH|中文|译文)\s*[:：]\s*(.+?)(?=\s*(?:EN|English|英文)\s*[:：]|$)/i);
  if (enM || zhM) return { en: (enM ? enM[1] : '').trim(), zh: (zhM ? zhM[1] : '').trim() };
  const ascii = (t.match(/[A-Za-z]/g) || []).length;
  const cjk = (t.match(/[一-鿿]/g) || []).length;
  return cjk > ascii ? { en: '', zh: t } : { en: t, zh: '' };
}

function parseSummary(text) {
  const summary = {};
  const m1 = text.match(/流利度[：:]\s*(\d+)/);
  const m2 = text.match(/准确度[：:]\s*(\d+)/);
  const m3 = text.match(/需要加强[：:]\s*(.+)/);
  const m4 = text.match(/(?:自然度|地道与英文思维)[：:]\s*(\d+)/);

  if (m1) summary.fluency = parseInt(m1[1]);
  if (m2) summary.accuracy = parseInt(m2[1]);
  if (m3) summary.weak_areas = m3[1].trim();
  if (m4) summary.naturalness = parseInt(m4[1]);

  return summary;
}
