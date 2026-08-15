"""Voco — REST API + PWA"""
import sys, os, json, socket, traceback

print("VOICELOG: Starting imports...", flush=True)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(SCRIPT_DIR, "..", "🖥️ 前端")
sys.path.insert(0, SCRIPT_DIR)

try:
    from fastapi import FastAPI
    from fastapi.responses import HTMLResponse, FileResponse, JSONResponse
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    import uvicorn
    print("VOICELOG: Core imports OK", flush=True)
except Exception as e:
    print(f"VOICELOG: Core imports FAILED: {e}", flush=True)
    traceback.print_exc()
    raise

try:
    from parser import parse_report
    print("VOICELOG: parser OK", flush=True)
except Exception as e:
    print(f"VOICELOG: parser import FAILED: {e}", flush=True)
    traceback.print_exc()
    raise

try:
    from storage import (
        add_vocabulary, add_errors, add_patterns,
        save_report, update_progress,
        get_vocabulary, get_errors, get_patterns,
        load_progress, mark_vocabulary_mastered,
        mark_error_reviewed, get_today_review,
    )
    print("VOICELOG: storage OK", flush=True)
except Exception as e:
    print(f"VOICELOG: storage import FAILED: {e}", flush=True)
    traceback.print_exc()
    raise

print("VOICELOG: All imports OK, building app...", flush=True)

SERVER_CONFIG_PATH = os.path.join(SCRIPT_DIR, "..", "💾 数据", "config.json")

def load_config():
    if os.path.exists(SERVER_CONFIG_PATH):
        with open(SERVER_CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"app_name": "Voco", "user_name": ""}

def save_config(cfg):
    os.makedirs(os.path.dirname(SERVER_CONFIG_PATH), exist_ok=True)
    with open(SERVER_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)


# ─── Core Functions ─────────────────────────────────────

def import_daily_report(report_text: str) -> dict:
    """导入 ChatGPT 口语日报，解析并存入单词库、纠错库、句型库"""
    parsed = parse_report(report_text)
    if not parsed["meta"]:
        return {"error": "无法解析日报，请检查格式"}

    date_str = str(parsed["meta"].get("date", ""))
    topic = parsed["meta"].get("topic", "")
    duration = parsed["meta"].get("duration", "0")

    for item in parsed["pronunciation"]:
        item.update({"type": "pronunciation", "date_added": date_str,
                     "source_topic": topic, "reviewed_at": [], "correct_in_review": None})
    if parsed["pronunciation"]:
        add_errors(parsed["pronunciation"])

    for item in parsed["grammar"]:
        item.update({"type": "grammar", "date_added": date_str,
                     "source_topic": topic, "reviewed_at": [], "correct_in_review": None})
    if parsed["grammar"]:
        add_errors(parsed["grammar"])

    for item in parsed["patterns"]:
        item.update({"date_added": date_str, "source_topic": topic})
    if parsed["patterns"]:
        add_patterns(parsed["patterns"])

    for item in parsed["vocabulary"]:
        item.update({"date_added": date_str, "source_topic": topic,
                     "review_count": 0, "mastered": False})
    if parsed["vocabulary"]:
        add_vocabulary(parsed["vocabulary"])

    fluency = parsed["summary"].get("fluency", 0)
    accuracy = parsed["summary"].get("accuracy", 0)
    weak = parsed["summary"].get("weak_areas", "")
    weak_list = [w.strip() for w in weak.split("、")] if weak else []
    try: dur = int(duration)
    except: dur = 0
    progress = update_progress(fluency, accuracy, weak_list, topic, dur)
    save_report(date_str, report_text)

    return {"ok": True, "stats": {
        "pronunciation": len(parsed["pronunciation"]),
        "grammar": len(parsed["grammar"]),
        "patterns": len(parsed["patterns"]),
        "vocabulary": len(parsed["vocabulary"]),
        "total_errors": len(parsed["pronunciation"]) + len(parsed["grammar"]),
    }, "progress": progress}


def get_vocabulary_list(status: str = "all") -> list[dict]:
    """获取单词列表。status: all/mastered/learning"""
    return get_vocabulary(status)


def get_error_list(error_type: str = "all") -> list[dict]:
    """获取纠错列表。error_type: all/grammar/pronunciation"""
    return get_errors(error_type)


def get_pattern_list() -> list[dict]:
    """获取地道表达句型库"""
    return get_patterns()


def get_dashboard() -> dict:
    """获取学习概览"""
    return load_progress()


def get_today_review_items() -> dict:
    """获取今日复习内容"""
    return get_today_review()


def mark_word_mastered(word: str) -> dict:
    """标记单词已掌握"""
    return {"ok": mark_vocabulary_mastered(word), "word": word}


def mark_error_fixed(index: int) -> dict:
    """标记错误已纠正"""
    return {"ok": mark_error_reviewed(index), "index": index}


# ─── FastAPI REST + PWA ─────────────────────────────────
app = FastAPI(title="Voco")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
print("VOICELOG: App created, routes registered", flush=True)


class ReportInput(BaseModel):
    text: str


@app.post("/api/report")
def api_import(report: ReportInput):
    result = import_daily_report(report.text)
    return result


@app.get("/api/vocabulary")
def api_vocab(status: str = "all"):
    return get_vocabulary_list(status)


@app.get("/api/errors")
def api_errors(type: str = "all"):
    return get_error_list(type)


@app.get("/api/patterns")
def api_patterns():
    return get_pattern_list()


@app.get("/api/dashboard")
def api_dashboard():
    return get_dashboard()


@app.get("/api/review/today")
def api_review():
    return get_today_review_items()


class MarkMastered(BaseModel):
    word: str

@app.put("/api/vocabulary/mastered")
def api_mastered(data: MarkMastered):
    return mark_word_mastered(data.word)


class MarkReviewed(BaseModel):
    index: int

@app.put("/api/errors/reviewed")
def api_reviewed(data: MarkReviewed):
    return mark_error_fixed(data.index)


@app.get("/", response_class=HTMLResponse)
def index():
    cfg = load_config()
    p = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(p):
        with open(p, "r", encoding="utf-8") as f:
            html = f.read()
        html = html.replace("Voco", cfg.get("app_name", "Voco"))
        html = html.replace("<title>Voco</title>", f"<title>{cfg.get('app_name', 'Voco')}</title>")
        return HTMLResponse(html)
    return HTMLResponse("<h1>Voco</h1>")


@app.get("/api/config")
def api_get_config():
    return load_config()


class ConfigInput(BaseModel):
    app_name: str = "VoiceLog"
    user_name: str = ""

@app.put("/api/config")
def api_save_config(data: ConfigInput):
    cfg = {"app_name": data.app_name, "user_name": data.user_name}
    save_config(cfg)
    return {"ok": True, "config": cfg}


@app.get("/manifest.json")
def manifest():
    return FileResponse(os.path.join(FRONTEND_DIR, "manifest.json"))


@app.get("/sw.js")
def sw():
    return FileResponse(os.path.join(FRONTEND_DIR, "sw.js"))


# Static file routes (avoid StaticFiles mount which overrides routes)
@app.get("/style.css")
def style_css():
    return FileResponse(os.path.join(FRONTEND_DIR, "style.css"))

@app.get("/app.js")
def app_js():
    return FileResponse(os.path.join(FRONTEND_DIR, "app.js"))

@app.get("/icon.svg")
def icon_svg():
    return FileResponse(os.path.join(FRONTEND_DIR, "icon.svg"))

@app.get("/supabase-client.js")
def supabase_js():
    return FileResponse(os.path.join(FRONTEND_DIR, "supabase-client.js"))

@app.get("/parser.js")
def parser_js():
    return FileResponse(os.path.join(FRONTEND_DIR, "parser.js"))

@app.get("/bear-default.png")
def bear_default():
    return FileResponse(os.path.join(FRONTEND_DIR, "bear-default.png"))

@app.get("/bear-active.png")
def bear_active():
    return FileResponse(os.path.join(FRONTEND_DIR, "bear-active.png"))

@app.get("/bear-head-active.png")
def bear_head_active():
    return FileResponse(os.path.join(FRONTEND_DIR, "bear-head-active.png"))

@app.get("/bear-head-default.png")
def bear_head_default():
    return FileResponse(os.path.join(FRONTEND_DIR, "bear-head-default.png"))

@app.get("/icon.png")
def icon_png():
    return FileResponse(os.path.join(FRONTEND_DIR, "icon.png"))


# ─── SPA 兜底路由（决策2 铁律）───────────────────────────
# 必须声明在所有 API 接口与静态资源路由之后，否则会吞掉 /api/* 与静态文件请求。
# /review、/shadowing 等前端路由直达/刷新时返回 index.html，由 app.js 接管；
# 未列出的真实静态文件（未来新增资源）优先按文件返回，其余一律回退首页。
@app.get("/{full_path:path}", response_class=HTMLResponse)
def spa_fallback(full_path: str):
    if full_path:
        base = os.path.normpath(FRONTEND_DIR)
        candidate = os.path.normpath(os.path.join(base, full_path))
        if candidate.startswith(base) and os.path.isfile(candidate):
            return FileResponse(candidate)
    return index()


# ─── Startup ───────────────────────────────────────────
if __name__ == "__main__":
    def get_ip():
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return "127.0.0.1"

    port = int(os.environ.get("PORT", 8765))
    if port == 8765:
        ip = get_ip()
        try:
            print(f"\n  Voco -> http://{ip}:{port}\n")
        except UnicodeEncodeError:
            print(f"\n  Voco -> http://{ip}:{port}\n")
    uvicorn.run(app, host="0.0.0.0", port=port)
