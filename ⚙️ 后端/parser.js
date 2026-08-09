// Voco — Daily Report Parser (JS version)
// Parses ChatGPT-generated Markdown reports

function parseReport(text) {
  const result = {
    meta: {},
    pronunciation: [],
    grammar: [],
    patterns: [],
    vocabulary: [],
    summary: {},
    raw: text,
  };

  // Split frontmatter from body
  const fmMatch = text.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  let body = text;

  if (fmMatch) {
    body = fmMatch[2];
    // Parse YAML-like frontmatter (simple key:value)
    const fmText = fmMatch[1];
    for (const line of fmText.split('\n')) {
      const kv = line.match(/^(\w+):\s*(.*)/);
      if (kv) result.meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
    }
  }

  // Section parsers
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
    } else if (header.includes('今日生词') || header.includes('生词')) {
      result.vocabulary = parseVocabulary(content);
    } else if (header.includes('表现总结') || header.includes('总结')) {
      result.summary = parseSummary(content);
    }
  }

  return result;
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
    if (Object.keys(item).length > 0) items.push(item);
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

  if (m1) summary.fluency = parseInt(m1[1]);
  if (m2) summary.accuracy = parseInt(m2[1]);
  if (m3) summary.weak_areas = m3[1].trim();

  return summary;
}
