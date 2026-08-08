"""LingoTrace — 口语学习日报导入与分析"""
import sys
import os
import socket
import qrcode
from io import BytesIO
import base64

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(SCRIPT_DIR, "..", "🖥️ 前端")

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from parser import parse_report
from storage import (
    add_vocabulary, add_errors, add_patterns,
    save_report, update_progress,
    get_vocabulary, get_errors, get_patterns,
    load_progress, mark_vocabulary_mastered,
    mark_error_reviewed, get_today_review,
)

app = FastAPI(title="LingoTrace")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Models ───────────────────────────────────────────────

class ReportInput(BaseModel):
    text: str


class MarkMastered(BaseModel):
    word: str


class MarkReviewed(BaseModel):
    index: int


# ─── API ──────────────────────────────────────────────────

@app.post("/api/report")
def submit_report(data: ReportInput):
    """接收日报 → 解析 → 入库"""
    parsed = parse_report(data.text)

    if not parsed["meta"]:
        return JSONResponse({"error": "无法解析日报，请检查格式"}, status_code=400)

    date_str = parsed["meta"].get("date", "")
    topic = parsed["meta"].get("topic", "")
    duration = parsed["meta"].get("duration", "0")

    # 处理发音纠正 → errors (type=pronunciation)
    for item in parsed["pronunciation"]:
        item["type"] = "pronunciation"
        item["date_added"] = date_str
        item["source_topic"] = topic
        item["reviewed_at"] = []
        item["correct_in_review"] = None
    if parsed["pronunciation"]:
        add_errors(parsed["pronunciation"])

    # 处理语法纠正 → errors (type=grammar)
    for item in parsed["grammar"]:
        item["type"] = "grammar"
        item["date_added"] = date_str
        item["source_topic"] = topic
        item["reviewed_at"] = []
        item["correct_in_review"] = None
    if parsed["grammar"]:
        add_errors(parsed["grammar"])

    # 处理地道表达 → patterns
    for item in parsed["patterns"]:
        item["date_added"] = date_str
        item["source_topic"] = topic
    if parsed["patterns"]:
        add_patterns(parsed["patterns"])

    # 处理生词 → vocabulary
    for item in parsed["vocabulary"]:
        item["date_added"] = date_str
        item["source_topic"] = topic
        item["review_count"] = 0
        item["mastered"] = False
    if parsed["vocabulary"]:
        add_vocabulary(parsed["vocabulary"])

    # 更新进度
    fluency = parsed["summary"].get("fluency", 0)
    accuracy = parsed["summary"].get("accuracy", 0)
    weak = parsed["summary"].get("weak_areas", "")
    weak_list = [w.strip() for w in weak.split("、")] if weak else []

    try:
        dur = int(duration)
    except (ValueError, TypeError):
        dur = 0

    progress = update_progress(fluency, accuracy, weak_list, topic, dur)

    # 保存原始日报
    save_report(date_str, data.text)

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


@app.get("/api/vocabulary")
def api_vocabulary(status: str = "all"):
    return get_vocabulary(status)


@app.get("/api/errors")
def api_errors(type: str = "all"):
    return get_errors(type)


@app.get("/api/patterns")
def api_patterns():
    return get_patterns()


@app.get("/api/dashboard")
def api_dashboard():
    return load_progress()


@app.get("/api/review/today")
def api_today_review():
    return get_today_review()


@app.put("/api/vocabulary/mastered")
def api_mark_mastered(data: MarkMastered):
    ok = mark_vocabulary_mastered(data.word)
    return {"ok": ok}


@app.put("/api/errors/reviewed")
def api_mark_reviewed(data: MarkReviewed):
    ok = mark_error_reviewed(data.index)
    return {"ok": ok}


# ─── Helpers ──────────────────────────────────────────────

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


# ─── Static Frontend ──────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
def index():
    html_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(html_path):
        with open(html_path, "r", encoding="utf-8") as f:
            return HTMLResponse(f.read())
    return HTMLResponse("<h1>LingoTrace</h1><p>前端文件未找到</p>")


@app.get("/manifest.json")
def manifest():
    return FileResponse(os.path.join(FRONTEND_DIR, "manifest.json"))


@app.get("/sw.js")
def service_worker():
    return FileResponse(os.path.join(FRONTEND_DIR, "sw.js"))


# 静态文件挂载（CSS / JS）
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="static")


# ─── Entry ────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    ip = get_local_ip()
    url = f"http://{ip}:8765"

    # Print QR code in terminal
    try:
        qr = qrcode.QRCode()
        qr.add_data(url)
        qr.make()
        qr.print_ascii(invert=True)
    except Exception:
        pass

    print(f"""
╔══════════════════════════════════════════╗
║          🗣️  LingoTrace 已启动           ║
╠══════════════════════════════════════════╣
║                                          ║
║   📱 手机访问: {url:<25}   ║
║                                          ║
║   浏览器打开 → 添加到主屏幕 → 变成 App   ║
║                                          ║
╚══════════════════════════════════════════╝
""")
    uvicorn.run(app, host="0.0.0.0", port=8765)
