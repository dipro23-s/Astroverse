"""api/admin_routes.py — Admin CMS API"""
from flask import Blueprint, jsonify, request
from database.db import get_conn, hash_pw, create_session, auth_session
import re, time
from datetime import datetime

admin_bp = Blueprint("admin", __name__)

def cors_response(data, status=200):
    """Return JSON with CORS headers"""
    from flask import make_response
    r = make_response(jsonify(data), status)
    r.headers["Access-Control-Allow-Origin"] = "*"
    r.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Auth-Token"
    r.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return r

def slugify(s):
    s = s.lower().strip()
    s = re.sub(r'[^\w\s-]','',s)
    s = re.sub(r'[\s_-]+','-',s)
    return s.strip('-')

def require_admin(f):
    from functools import wraps
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = request.headers.get("X-Auth-Token","")
        user = auth_session(token)
        if not user or user["role"] != "admin":
            return jsonify({"error":"Unauthorized"}), 401
        return f(*args, **kwargs, current_user=user)
    return wrapper

# ── Auth ──────────────────────────────────────────────────────────
@admin_bp.route("/login", methods=["GET", "POST", "OPTIONS"])
def login():
    if request.method == "OPTIONS":
        return cors_response({"ok": True})
    if request.method == "GET":
        return cors_response({"status": "AstroVerse Admin API", "version": "5.0"})
    d = request.get_json(force=True) or {}
    username = d.get("username","").strip()
    password = d.get("password","")
    conn = get_conn()
    user = conn.execute("SELECT * FROM users WHERE (username=? OR email=?) AND is_active=1", (username,username)).fetchone()
    conn.close()
    if not user or user["password_hash"] != hash_pw(password):
        return jsonify({"error":"Invalid credentials"}), 401
    conn = get_conn()
    conn.execute("UPDATE users SET last_login=datetime('now') WHERE id=?", (user["id"],))
    conn.commit(); conn.close()
    token = create_session(user["id"])
    return jsonify({"token":token,"user":{"id":user["id"],"username":user["username"],"role":user["role"]}})

@admin_bp.route("/logout", methods=["POST"])
def logout():
    token = request.headers.get("X-Auth-Token","")
    if token:
        conn = get_conn()
        conn.execute("DELETE FROM sessions WHERE token=?", (token,))
        conn.commit(); conn.close()
    return jsonify({"ok":True})

@admin_bp.route("/me")
def me():
    token = request.headers.get("X-Auth-Token","")
    user = auth_session(token)
    if not user: return jsonify({"error":"Not authenticated"}), 401
    return jsonify({"id":user["id"],"username":user["username"],"role":user["role"]})

# ── Dashboard Stats ───────────────────────────────────────────────
@admin_bp.route("/stats")
@require_admin
def stats(current_user):
    conn = get_conn()
    modules = conn.execute("SELECT COUNT(*) FROM modules").fetchone()[0]
    published = conn.execute("SELECT COUNT(*) FROM modules WHERE status='published'").fetchone()[0]
    drafts = conn.execute("SELECT COUNT(*) FROM modules WHERE status='draft'").fetchone()[0]
    sims = conn.execute("SELECT COUNT(*) FROM simulations").fetchone()[0]
    phases = conn.execute("SELECT COUNT(*) FROM timeline_phases").fetchone()[0]
    papers = conn.execute("SELECT COUNT(*) FROM papers").fetchone()[0]
    views = conn.execute("SELECT SUM(views) FROM modules").fetchone()[0] or 0
    conn.close()
    return jsonify({"modules":modules,"published":published,"drafts":drafts,
                    "simulations":sims,"timeline_phases":phases,"papers":papers,"total_views":views})

# ── Modules CRUD ──────────────────────────────────────────────────
@admin_bp.route("/modules")
@require_admin
def list_modules(current_user):
    conn = get_conn()
    rows = conn.execute("""SELECT m.*,c.name as category_name FROM modules m 
        LEFT JOIN categories c ON m.category_id=c.id ORDER BY m.created_at DESC""").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@admin_bp.route("/modules", methods=["POST"])
@require_admin
def create_module(current_user):
    d = request.get_json(force=True) or {}
    slug = d.get("slug") or slugify(d.get("title",""))
    conn = get_conn()
    conn.execute("""INSERT INTO modules (title,slug,subtitle,icon,color,glow,category_id,description,content,
        difficulty,read_time,featured,status,hero_image,simulation_slug)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (d.get("title","Untitled"), slug, d.get("subtitle",""), d.get("icon","🔭"),
         d.get("color","#38BDF8"), d.get("glow","#38BDF8"), d.get("category_id"),
         d.get("description",""), d.get("content",""), d.get("difficulty","Beginner"),
         d.get("read_time","10 min"), int(d.get("featured",0)), d.get("status","draft"),
         d.get("hero_image",""), d.get("simulation_slug","")))
    mid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.commit(); conn.close()
    return jsonify({"id":mid,"slug":slug})

@admin_bp.route("/modules/<int:mid>", methods=["PUT"])
@require_admin
def update_module(mid, current_user):
    d = request.get_json(force=True) or {}
    conn = get_conn()
    conn.execute("""UPDATE modules SET title=?,subtitle=?,icon=?,color=?,glow=?,category_id=?,
        description=?,content=?,difficulty=?,read_time=?,featured=?,status=?,hero_image=?,
        simulation_slug=?,updated_at=datetime('now') WHERE id=?""",
        (d.get("title"), d.get("subtitle",""), d.get("icon","🔭"),
         d.get("color","#38BDF8"), d.get("glow","#38BDF8"), d.get("category_id"),
         d.get("description",""), d.get("content",""), d.get("difficulty","Beginner"),
         d.get("read_time","10 min"), int(d.get("featured",0)), d.get("status","draft"),
         d.get("hero_image",""), d.get("simulation_slug",""), mid))
    conn.commit(); conn.close()
    return jsonify({"ok":True})

@admin_bp.route("/modules/<int:mid>", methods=["DELETE"])
@require_admin
def delete_module(mid, current_user):
    conn = get_conn()
    conn.execute("DELETE FROM subtopics WHERE module_id=?", (mid,))
    conn.execute("DELETE FROM modules WHERE id=?", (mid,))
    conn.commit(); conn.close()
    return jsonify({"ok":True})

@admin_bp.route("/modules/<int:mid>", methods=["GET"])
@require_admin
def get_module_admin(mid, current_user):
    conn = get_conn()
    row = conn.execute("SELECT * FROM modules WHERE id=?", (mid,)).fetchone()
    conn.close()
    if not row: return jsonify({"error":"Not found"}), 404
    return jsonify(dict(row))

# ── Subtopics ─────────────────────────────────────────────────────
@admin_bp.route("/modules/<int:mid>/subtopics")
@require_admin
def list_subtopics(mid, current_user):
    conn = get_conn()
    rows = conn.execute("SELECT * FROM subtopics WHERE module_id=? ORDER BY order_num", (mid,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@admin_bp.route("/modules/<int:mid>/subtopics", methods=["POST"])
@require_admin
def create_subtopic(mid, current_user):
    d = request.get_json(force=True) or {}
    slug = d.get("slug") or slugify(d.get("title",""))
    conn = get_conn()
    conn.execute("INSERT OR IGNORE INTO subtopics (module_id,title,slug,description,content,icon,order_num,status) VALUES (?,?,?,?,?,?,?,?)",
        (mid, d.get("title","Untitled"), slug, d.get("description",""), d.get("content",""),
         d.get("icon","◈"), d.get("order_num",0), d.get("status","published")))
    sid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.commit(); conn.close()
    return jsonify({"id":sid,"slug":slug})

@admin_bp.route("/subtopics/<int:sid>", methods=["PUT"])
@require_admin
def update_subtopic(sid, current_user):
    d = request.get_json(force=True) or {}
    conn = get_conn()
    conn.execute("UPDATE subtopics SET title=?,description=?,content=?,icon=?,order_num=?,status=? WHERE id=?",
        (d.get("title"), d.get("description",""), d.get("content",""),
         d.get("icon","◈"), d.get("order_num",0), d.get("status","published"), sid))
    conn.commit(); conn.close()
    return jsonify({"ok":True})

@admin_bp.route("/subtopics/<int:sid>", methods=["DELETE"])
@require_admin
def delete_subtopic(sid, current_user):
    conn = get_conn()
    conn.execute("DELETE FROM subtopics WHERE id=?", (sid,))
    conn.commit(); conn.close()
    return jsonify({"ok":True})

# ── Simulations ───────────────────────────────────────────────────
@admin_bp.route("/simulations")
@require_admin
def list_sims(current_user):
    conn = get_conn()
    rows = conn.execute("SELECT * FROM simulations ORDER BY created_at").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@admin_bp.route("/simulations/<int:sid>", methods=["PUT"])
@require_admin
def update_sim(sid, current_user):
    d = request.get_json(force=True) or {}
    conn = get_conn()
    conn.execute("UPDATE simulations SET title=?,description=?,category=?,difficulty=?,tech=?,featured=?,status=? WHERE id=?",
        (d.get("title"), d.get("description",""), d.get("category","general"),
         d.get("difficulty","Intermediate"), d.get("tech","Three.js"),
         int(d.get("featured",0)), d.get("status","published"), sid))
    conn.commit(); conn.close()
    return jsonify({"ok":True})

# ── Timeline ──────────────────────────────────────────────────────
@admin_bp.route("/timeline")
@require_admin
def list_timeline(current_user):
    conn = get_conn()
    rows = conn.execute("SELECT * FROM timeline_phases ORDER BY order_num").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@admin_bp.route("/timeline/<int:pid>", methods=["PUT"])
@require_admin
def update_phase(pid, current_user):
    d = request.get_json(force=True) or {}
    conn = get_conn()
    conn.execute("UPDATE timeline_phases SET title=?,time_label=?,time_years=?,description=?,content=?,temperature=?,color=?,icon=?,status=? WHERE id=?",
        (d.get("title"), d.get("time_label",""), d.get("time_years",""), d.get("description",""),
         d.get("content",""), d.get("temperature",""), d.get("color","#38BDF8"),
         d.get("icon","💥"), d.get("status","published"), pid))
    conn.commit(); conn.close()
    return jsonify({"ok":True})

# ── Papers ────────────────────────────────────────────────────────
@admin_bp.route("/papers")
@require_admin
def list_papers(current_user):
    conn = get_conn()
    rows = conn.execute("SELECT p.*,m.title as module_title FROM papers p LEFT JOIN modules m ON p.module_id=m.id ORDER BY p.year DESC").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@admin_bp.route("/papers", methods=["POST"])
@require_admin
def create_paper(current_user):
    d = request.get_json(force=True) or {}
    conn = get_conn()
    conn.execute("INSERT INTO papers (title,authors,journal,year,doi,url,abstract,module_id,tags) VALUES (?,?,?,?,?,?,?,?,?)",
        (d.get("title",""), d.get("authors",""), d.get("journal",""), d.get("year",2024),
         d.get("doi",""), d.get("url",""), d.get("abstract",""), d.get("module_id"), d.get("tags","")))
    pid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.commit(); conn.close()
    return jsonify({"id":pid})

@admin_bp.route("/papers/<int:pid>", methods=["PUT"])
@require_admin
def update_paper(pid, current_user):
    d = request.get_json(force=True) or {}
    conn = get_conn()
    conn.execute("UPDATE papers SET title=?,authors=?,journal=?,year=?,doi=?,url=?,abstract=?,module_id=?,tags=? WHERE id=?",
        (d.get("title"), d.get("authors",""), d.get("journal",""), d.get("year",2024),
         d.get("doi",""), d.get("url",""), d.get("abstract",""), d.get("module_id"), d.get("tags",""), pid))
    conn.commit(); conn.close()
    return jsonify({"ok":True})

@admin_bp.route("/papers/<int:pid>", methods=["DELETE"])
@require_admin
def delete_paper(pid, current_user):
    conn = get_conn()
    conn.execute("DELETE FROM papers WHERE id=?", (pid,))
    conn.commit(); conn.close()
    return jsonify({"ok":True})

# ── Categories ────────────────────────────────────────────────────
@admin_bp.route("/categories")
@require_admin
def list_categories(current_user):
    conn = get_conn()
    rows = conn.execute("SELECT * FROM categories ORDER BY name").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@admin_bp.route("/categories", methods=["POST"])
@require_admin
def create_category(current_user):
    d = request.get_json(force=True) or {}
    slug = d.get("slug") or slugify(d.get("name",""))
    conn = get_conn()
    conn.execute("INSERT OR IGNORE INTO categories (name,slug,description,color,glow,icon) VALUES (?,?,?,?,?,?)",
        (d.get("name",""), slug, d.get("description",""), d.get("color","#38BDF8"), d.get("glow","#38BDF8"), d.get("icon","🔭")))
    cid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.commit(); conn.close()
    return jsonify({"id":cid,"slug":slug})
