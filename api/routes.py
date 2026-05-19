"""api/routes.py — Public AstroVerse API"""
from flask import Blueprint, jsonify, request
from database.db import (get_modules, get_module, get_subtopics, get_subtopic,
                          get_simulations, get_timeline, get_timeline_phase,
                          get_papers, search_all, get_conn)

api_bp = Blueprint("api", __name__)

@api_bp.route("/modules")
def modules():
    featured = request.args.get("featured")
    category = request.args.get("category")
    return jsonify(get_modules(featured=featured, category_slug=category))

@api_bp.route("/modules/<slug>")
def module_detail(slug):
    m = get_module(slug)
    if not m: return jsonify({"error":"Not found"}), 404
    m["subtopics"] = get_subtopics(m["id"])
    m["papers"] = get_papers(m["id"])
    return jsonify(m)

@api_bp.route("/modules/<slug>/subtopics")
def module_subtopics(slug):
    m = get_module(slug)
    if not m: return jsonify([])
    return jsonify(get_subtopics(m["id"]))

@api_bp.route("/modules/<module_slug>/subtopics/<subtopic_slug>")
def subtopic_detail(module_slug, subtopic_slug):
    st = get_subtopic(module_slug, subtopic_slug)
    if not st: return jsonify({"error":"Not found"}), 404
    return jsonify(st)

@api_bp.route("/simulations")
def simulations():
    featured = request.args.get("featured")
    return jsonify(get_simulations(featured=featured))

@api_bp.route("/simulations/<slug>")
def simulation_detail(slug):
    conn = get_conn()
    row = conn.execute("SELECT * FROM simulations WHERE slug=? AND status='published'", (slug,)).fetchone()
    conn.close()
    if not row: return jsonify({"error":"Not found"}), 404
    return jsonify(dict(row))

@api_bp.route("/timeline")
def timeline():
    return jsonify(get_timeline())

@api_bp.route("/timeline/<slug>")
def timeline_phase(slug):
    p = get_timeline_phase(slug)
    if not p: return jsonify({"error":"Not found"}), 404
    # Attach prev/next
    all_phases = get_timeline()
    idx = next((i for i,x in enumerate(all_phases) if x["slug"]==slug), None)
    p["prev"] = all_phases[idx-1] if idx and idx > 0 else None
    p["next"] = all_phases[idx+1] if idx is not None and idx < len(all_phases)-1 else None
    return jsonify(p)

@api_bp.route("/papers")
def papers():
    module_id = request.args.get("module_id")
    return jsonify(get_papers(module_id=module_id))

@api_bp.route("/search")
def search():
    q = request.args.get("q","").strip()
    if len(q) < 2: return jsonify([])
    return jsonify(search_all(q))

@api_bp.route("/categories")
def categories():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM categories ORDER BY name").fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

@api_bp.route("/stats")
def stats():
    conn = get_conn()
    modules = conn.execute("SELECT COUNT(*) FROM modules WHERE status='published'").fetchone()[0]
    sims = conn.execute("SELECT COUNT(*) FROM simulations WHERE status='published'").fetchone()[0]
    phases = conn.execute("SELECT COUNT(*) FROM timeline_phases WHERE status='published'").fetchone()[0]
    papers = conn.execute("SELECT COUNT(*) FROM papers").fetchone()[0]
    conn.close()
    return jsonify({"modules":modules,"simulations":sims,"timeline_phases":phases,"papers":papers})
