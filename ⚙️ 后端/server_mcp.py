"""LingoTrace MCP Server — AI 可读写口语学习数据"""
import sys
import os
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(SCRIPT_DIR, "..", "🖥️ 前端")
sys.path.insert(0, SCRIPT_DIR)

from mcp.server.fastmcp import FastMCP

from parser import parse_report
from storage import (
    add_vocabulary, add_errors, add_patterns,
    save_report, update_progress,
    get_vocabulary, get_errors, get_patterns,
    load_progress, mark_vocabulary_mastered,
    mark_error_reviewed, get_today_review,
)

mcp = FastMCP("LingoTrace")


# ─── Tools: 日报导入 ─────────────────────────────────────

@mcp.tool()
def import_daily_report(report_text: str) -> dict:
    """导入 ChatGPT 生成的口语学习日报。解析并存入单词库、纠错库、句型库。

    Args:
        report_text: ChatGPT 按模板生成的完整日报 Markdown 文本，包含 YAML frontmatter
    """
    parsed = parse_report(report_text)
    if not parsed["meta"]:
        return {"error": "无法解析日报，请检查格式"}

    date_str = parsed["meta"].get("date", "")
    topic = parsed["meta"].get("topic", "")
    duration = parsed["meta"].get("duration", "0")

    # 发音纠正
    for item in parsed["pronunciation"]:
        item["type"] = "pronunciation"
        item["date_added"] = str(date_str)
        item["source_topic"] = topic
        item["reviewed_at"] = []
        item["correct_in_review"] = None
    if parsed["pronunciation"]:
        add_errors(parsed["pronunciation"])

    # 语法纠正
    for item in parsed["grammar"]:
        item["type"] = "grammar"
        item["date_added"] = str(date_str)
        item["source_topic"] = topic
        item["reviewed_at"] = []
        item["correct_in_review"] = None
    if parsed["grammar"]:
        add_errors(parsed["grammar"])

    # 地道表达
    for item in parsed["patterns"]:
        item["date_added"] = str(date_str)
        item["source_topic"] = topic
    if parsed["patterns"]:
        add_patterns(parsed["patterns"])

    # 生词
    for item in parsed["vocabulary"]:
        item["date_added"] = str(date_str)
        item["source_topic"] = topic
        item["review_count"] = 0
        item["mastered"] = False
    if parsed["vocabulary"]:
        add_vocabulary(parsed["vocabulary"])

    # 进度
    fluency = parsed["summary"].get("fluency", 0)
    accuracy = parsed["summary"].get("accuracy", 0)
    weak = parsed["summary"].get("weak_areas", "")
    weak_list = [w.strip() for w in weak.split("、")] if weak else []

    try:
        dur = int(duration)
    except (ValueError, TypeError):
        dur = 0

    progress = update_progress(fluency, accuracy, weak_list, topic, dur)
    save_report(str(date_str), report_text)

    return {
        "ok": True,
        "stats": {
            "pronunciation": len(parsed["pronunciation"]),
            "grammar": len(parsed["grammar"]),
            "patterns": len(parsed["patterns"]),
            "vocabulary": len(parsed["vocabulary"]),
            "total_errors": len(parsed["pronunciation"]) + len(parsed["grammar"]),
        },
        "progress": progress,
    }


# ─── Tools: 查询 ─────────────────────────────────────────

@mcp.tool()
def get_vocabulary_list(status: str = "all") -> list[dict]:
    """获取单词列表

    Args:
        status: "all" 全部, "mastered" 已掌握, "learning" 学习中
    """
    return get_vocabulary(status)


@mcp.tool()
def get_error_list(error_type: str = "all") -> list[dict]:
    """获取纠错列表

    Args:
        error_type: "all" 全部, "grammar" 语法, "pronunciation" 发音
    """
    return get_errors(error_type)


@mcp.tool()
def get_pattern_list() -> list[dict]:
    """获取地道表达句型库"""
    return get_patterns()


@mcp.tool()
def get_dashboard() -> dict:
    """获取学习概览面板数据：总课程数、时长、流利度趋势、薄弱环节等"""
    return load_progress()


@mcp.tool()
def get_today_review_items() -> dict:
    """获取今日应复习内容：上次的错误 + 待巩固的单词"""
    return get_today_review()


@mcp.tool()
def mark_word_mastered(word: str) -> dict:
    """标记单词为已掌握

    Args:
        word: 要标记的单词
    """
    ok = mark_vocabulary_mastered(word)
    return {"ok": ok, "word": word}


@mcp.tool()
def mark_error_fixed(index: int) -> dict:
    """标记错误已纠正

    Args:
        index: 错误在列表中的序号（从0开始）
    """
    ok = mark_error_reviewed(index)
    return {"ok": ok, "index": index}


# ─── Entry ────────────────────────────────────────────────

if __name__ == "__main__":
    mcp.run(transport="streamable-http")
