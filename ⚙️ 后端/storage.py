"""JSONL 数据读写 + Progress 管理"""

import json
import os
from datetime import date as DateType


def _safe_json(obj):
    """处理 datetime.date 等非标准 JSON 类型"""
    if isinstance(obj, DateType):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


def _json_dumps(obj):
    return json.dumps(obj, ensure_ascii=False, default=_safe_json)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "💾 数据")
VOCAB_FILE = os.path.join(DATA_DIR, "vocabulary.jsonl")
ERRORS_FILE = os.path.join(DATA_DIR, "errors.jsonl")
PATTERNS_FILE = os.path.join(DATA_DIR, "patterns.jsonl")
PROGRESS_FILE = os.path.join(DATA_DIR, "progress.json")
REPORTS_DIR = os.path.join(DATA_DIR, "reports")


def _read_jsonl(path: str) -> list[dict]:
    """读取 JSONL 文件，返回 dict 列表"""
    if not os.path.exists(path):
        return []
    items = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                items.append(json.loads(line))
    return items


def _append_jsonl(path: str, *records: dict):
    """追加记录到 JSONL"""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        for r in records:
            f.write(_json_dumps(r) + "\n")


def add_vocabulary(words: list[dict]):
    _append_jsonl(VOCAB_FILE, *words)


def add_errors(errors: list[dict]):
    _append_jsonl(ERRORS_FILE, *errors)


def add_patterns(patterns: list[dict]):
    _append_jsonl(PATTERNS_FILE, *patterns)


def save_report(date_str: str, content: str):
    os.makedirs(REPORTS_DIR, exist_ok=True)
    path = os.path.join(REPORTS_DIR, f"{date_str}.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def get_vocabulary(status: str = "all") -> list[dict]:
    items = _read_jsonl(VOCAB_FILE)
    if status == "mastered":
        return [i for i in items if i.get("mastered")]
    elif status == "learning":
        return [i for i in items if not i.get("mastered")]
    return items


def get_errors(error_type: str = "all") -> list[dict]:
    items = _read_jsonl(ERRORS_FILE)
    if error_type != "all":
        return [i for i in items if i.get("type") == error_type]
    return items


def get_patterns() -> list[dict]:
    return _read_jsonl(PATTERNS_FILE)


def load_progress() -> dict:
    if not os.path.exists(PROGRESS_FILE):
        return {
            "total_sessions": 0,
            "total_minutes": 0,
            "topics": [],
            "fluency_trend": [],
            "accuracy_trend": [],
            "weak_areas": [],
            "words_learned": 0,
            "words_mastered": 0,
            "errors_fixed": 0,
        }
    with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_progress(p: dict):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(p, f, ensure_ascii=False, indent=2)


def update_progress(fluency: int, accuracy: int, weak_areas: list[str],
                    topic: str, duration: int):
    p = load_progress()
    p["total_sessions"] += 1
    p["total_minutes"] += int(duration)
    if topic and topic not in p["topics"]:
        p["topics"].append(topic)
    p["fluency_trend"].append(int(fluency))
    p["accuracy_trend"].append(int(accuracy))
    for area in weak_areas:
        if area and area not in p["weak_areas"]:
            p["weak_areas"].append(area)
    p["words_learned"] = len(_read_jsonl(VOCAB_FILE))
    p["words_mastered"] = len([w for w in _read_jsonl(VOCAB_FILE) if w.get("mastered")])
    p["errors_fixed"] = len([e for e in _read_jsonl(ERRORS_FILE) if e.get("correct_in_review")])
    save_progress(p)
    return p


def mark_vocabulary_mastered(word: str) -> bool:
    items = _read_jsonl(VOCAB_FILE)
    for item in items:
        if item["word"] == word:
            item["mastered"] = True
            break
    else:
        return False
    with open(VOCAB_FILE, "w", encoding="utf-8") as f:
        for item in items:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
    return True


def mark_error_reviewed(index: int) -> bool:
    items = _read_jsonl(ERRORS_FILE)
    if index < 0 or index >= len(items):
        return False
    from datetime import date
    items[index].setdefault("reviewed_at", []).append(str(date.today()))
    items[index]["correct_in_review"] = True
    with open(ERRORS_FILE, "w", encoding="utf-8") as f:
        for item in items:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
    return True


def get_today_review() -> dict:
    """获取今日复习内容"""
    errors = _read_jsonl(ERRORS_FILE)
    vocab = _read_jsonl(VOCAB_FILE)

    # 最近的未复习错误（最多5条）
    unreviewed_errors = [e for e in errors if not e.get("correct_in_review")]
    recent_errors = unreviewed_errors[-5:]

    # 未掌握的单词（最多10个）
    unmastered = [v for v in vocab if not v.get("mastered")]
    words_to_review = unmastered[-10:]

    return {
        "errors": recent_errors,
        "vocabulary": words_to_review,
    }
