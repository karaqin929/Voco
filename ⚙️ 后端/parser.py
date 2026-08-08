"""日报解析引擎 — 解析 ChatGPT 生成的 Markdown 日报"""

import re
import os

# 尝试导入 yaml，没有就用简单正则解析
try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


def parse_report(text: str) -> dict:
    """
    解析日报文本，返回结构化数据。
    提取: 元数据, 发音纠正, 语法纠正, 地道表达, 生词, 表现总结
    """
    result = {
        "meta": {},
        "pronunciation": [],
        "grammar": [],
        "patterns": [],
        "vocabulary": [],
        "summary": {},
        "raw": text,
    }

    # --- 1. 解析 YAML frontmatter ---
    frontmatter, body = _split_frontmatter(text)
    result["meta"] = _parse_frontmatter(frontmatter)

    # --- 2. 按段落解析 ---
    sections = _split_sections(body)

    for title, content in sections:
        title_lower = title.lower().strip()

        if "发音" in title_lower:
            result["pronunciation"] = _parse_pairs(content, "[问题]", "[纠正]")
        elif "语法" in title_lower:
            result["grammar"] = _parse_triples(content, "[我说]", "[应为]", "[规则]")
        elif "地道" in title_lower or "表达" in title_lower:
            result["patterns"] = _parse_triples(content, "[我说]", "[更自然]", "[场景]")
        elif "生词" in title_lower or "单词" in title_lower:
            result["vocabulary"] = _parse_vocabulary(content)
        elif "总结" in title_lower or "表现" in title_lower:
            result["summary"] = _parse_summary(content)

    return result


def _split_frontmatter(text: str) -> tuple[str, str]:
    """分离 YAML frontmatter 和 Markdown 正文"""
    text = text.strip()
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) >= 3:
            return parts[1], parts[2]
    return "", text


def _parse_frontmatter(yaml_str: str) -> dict:
    """解析 frontmatter 为 dict"""
    if not yaml_str.strip():
        return {}
    if HAS_YAML:
        try:
            parsed = yaml.safe_load(yaml_str)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            pass
    # Fallback: 简单正则
    meta = {}
    for line in yaml_str.strip().split("\n"):
        match = re.match(r'(\w+):\s*["\']?(.+?)["\']?\s*$', line.strip())
        if match:
            meta[match.group(1)] = match.group(2)
    return meta


def _split_sections(body: str) -> list[tuple[str, str]]:
    """按 ## 标题拆分段落"""
    sections = []
    # 按 ## 拆分
    parts = re.split(r'\n##\s+', body)
    for part in parts:
        part = part.strip()
        if not part:
            continue
        # 检查是否以标题开头
        if '\n' in part:
            title, content = part.split('\n', 1)
        else:
            title, content = part, ""
        sections.append((title.strip(), content.strip()))
    return sections


def _parse_pairs(content: str, key1: str, key2: str) -> list[dict]:
    """解析 [X] [Y] 键值对"""
    items = []
    current = {}
    for line in content.split("\n"):
        line = line.strip()
        if not line or not line.startswith("-"):
            continue
        line = line.lstrip("- ").strip()

        if line.startswith(key1):
            current = {"original": _extract(line, key1)}
        elif line.startswith(key2) and current:
            current["correction"] = _extract(line, key2)
            items.append(current)
            current = {}
    return items


def _parse_triples(content: str, key1: str, key2: str, key3: str) -> list[dict]:
    """解析 [X] [Y] [Z] 三元组"""
    items = []
    current = {}
    for line in content.split("\n"):
        line = line.strip()
        if not line or not line.startswith("-"):
            continue
        line = line.lstrip("- ").strip()

        if line.startswith(key1):
            if current and len(current) >= 2:
                items.append(current)
            current = {"original": _extract(line, key1)}
        elif line.startswith(key2) and current:
            current["better"] = _extract(line, key2)
        elif line.startswith(key3) and current:
            current["scene"] = _extract(line, key3)
            items.append(current)
            current = {}
    if current and len(current) >= 2:
        items.append(current)
    return items


def _parse_vocabulary(content: str) -> list[dict]:
    """解析生词: word / 音标 / 释义 / 例句"""
    words = []
    for line in content.split("\n"):
        line = line.strip()
        if not line or not line.startswith("-"):
            continue
        line = line.lstrip("- ").strip()
        parts = [p.strip() for p in line.split("/")]
        if len(parts) >= 3:
            words.append({
                "word": parts[0],
                "phonetic": parts[1] if len(parts) > 1 else "",
                "meaning": parts[2] if len(parts) > 2 else "",
                "example": parts[3] if len(parts) > 3 else "",
            })
        elif len(parts) == 2:
            words.append({
                "word": parts[0],
                "phonetic": "",
                "meaning": parts[1],
                "example": "",
            })
    return words


def _parse_summary(content: str) -> dict:
    """解析表现总结"""
    summary = {}
    for line in content.split("\n"):
        line = line.strip().lstrip("- ").strip()
        if "流利度" in line:
            summary["fluency"] = _extract_number(line)
        elif "准确度" in line:
            summary["accuracy"] = _extract_number(line)
        elif "需要加强" in line or "薄弱" in line:
            # 处理半角和全角冒号
            import re
            parts = re.split(r'[：:]', line, maxsplit=1)
            summary["weak_areas"] = parts[1].strip() if len(parts) > 1 else ""
    return summary


def _extract(line: str, prefix: str) -> str:
    """从行中提取 [前缀] 之后的内容"""
    idx = line.find(prefix)
    if idx >= 0:
        return line[idx + len(prefix):].strip()
    return line.strip()


def _extract_number(text: str) -> int:
    """从文本中提取第一个数字"""
    match = re.search(r'(\d+)', text)
    return int(match.group(1)) if match else 0
