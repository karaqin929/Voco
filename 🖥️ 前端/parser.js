// Voco — Daily Report / Topic Card / Insight Parser (JS version)
// Parses ChatGPT-generated Markdown reports

// ── 分类规则提取引擎（4 标准分类归一化）────────────────────
// 收敛为且仅收敛为：发音与重音 / 语法与句式 / 地道表达 / 逻辑与衔接，全部未命中才归「其他」。
// 供解析器（parseItems）、app.js normalizeErrorCategory（存量标签映射）、高频错误模式聚合共用 —— 单一分类源。
function classifyErrorType(original, correction, rule) {
  const text = [rule, original, correction].filter(Boolean).join(' ').toLowerCase();
  const o = (original || '').toLowerCase();
  const c = (correction || '').toLowerCase();
  // ① 发音与重音：读音/音标/重音/音节/pronunciation
  if (/pronunciation|pronunc|读音|音标|重音|音节|发音/.test(text)) return '发音与重音';
  // ② 语法与句式：grammar/tense/article/时态/语态/单复数/冠词/介词 关键词
  //    或 时态助动词/词尾特征 或 原句/正句仅冠词差集
  if (/grammar|tense|article|preposition|时态|语态|单复数|复数|冠词|介词|过去式|完成时|进行时|过去时|(\bed\b)/.test(text)
      || /\b(was|were|had|have|has|will|would|did)\b/.test(o + ' ' + c)
      || (/\b(a|an|the)\b/.test(o) && o.replace(/\b(a|an|the)\b/gi, '') === c.replace(/\b(a|an|the)\b/gi, ''))) return '语法与句式';
  // ③ 地道表达：collocation/wording/地道/搭配/用词
  if (/collocation|wording|地道|搭配|用词|更自然/.test(text)) return '地道表达';
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
      result.summary = parseSummary(content);
    } else if (header.includes('表现亮点')) {
      result.summary.strengths = content.trim();
    } else if (header.includes('AI 复盘评语') || header.includes('复盘评语')) {
      result.summary.review = content.trim();
    } else if (header.includes('下一步建议')) {
      result.summary.next_suggestions = content.trim();
    } else if (header.includes('对话想法') || header.includes('今日心得')) {
      result.summary.thoughts = content.trim();
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
      result.vocabulary = parseVocabulary(content);
    }
  }
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

function parseSummary(text) {
  const summary = {};
  const m1 = text.match(/流利度[：:]\s*(\d+)/);
  const m2 = text.match(/准确度[：:]\s*(\d+)/);
  const m3 = text.match(/需要加强[：:]\s*(.+)/);
  const m4 = text.match(/自然度[：:]\s*(\d+)/);

  if (m1) summary.fluency = parseInt(m1[1]);
  if (m2) summary.accuracy = parseInt(m2[1]);
  if (m3) summary.weak_areas = m3[1].trim();
  if (m4) summary.naturalness = parseInt(m4[1]);

  return summary;
}
