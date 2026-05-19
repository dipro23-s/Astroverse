"""AstroVerse v5 — Main Application"""
import os
from flask import Flask, render_template, request
from api.routes import api_bp
from api.admin_routes import admin_bp
from database.db import init_db

app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = os.environ.get("SECRET_KEY", "astroverse-deep-space-2025")

@app.after_request
def add_headers(r):
    origin = request.headers.get("Origin", "*")
    r.headers["Access-Control-Allow-Origin"] = origin
    r.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Auth-Token, Authorization"
    r.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    r.headers["Access-Control-Allow-Credentials"] = "true"
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    return r

@app.before_request
def handle_options():
    """Handle CORS preflight requests"""
    if request.method == "OPTIONS":
        from flask import Response
        r = Response()
        r.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        r.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Auth-Token, Authorization"
        r.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        r.headers["Access-Control-Allow-Credentials"] = "true"
        return r, 200

app.register_blueprint(api_bp,   url_prefix="/api")
app.register_blueprint(admin_bp, url_prefix="/api/admin")

# ── Frontend routes (SPA) ────────────────────────────
@app.route("/")
def index(): return render_template("index.html")

@app.route("/modules")
def modules_page(): return render_template("index.html")

@app.route("/modules/<slug>")
def module_detail(slug): return render_template("index.html")

@app.route("/modules/<slug>/<subtopic>")
def subtopic_detail(slug, subtopic): return render_template("index.html")

@app.route("/simulations")
def simulations_page(): return render_template("index.html")

@app.route("/simulations/<slug>")
def simulation_detail(slug): return render_template("index.html")

@app.route("/timeline")
def timeline_page(): return render_template("index.html")

@app.route("/timeline/<slug>")
def timeline_detail(slug): return render_template("index.html")

@app.route("/research")
def research_page(): return render_template("index.html")

@app.route("/about")
def about_page(): return render_template("index.html")

@app.route("/search")
def search_page(): return render_template("index.html")

@app.route("/admin")
@app.route("/admin/")
@app.route("/admin/<path:p>")
def admin_spa(p=None): return render_template("admin/index.html")

if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 8080))
    print(f"\n  {'='*50}")
    print(f"  🌌  AstroVerse v5  is running!")
    print(f"  {'='*50}")
    print(f"  🌐  Main Site   →  http://localhost:{port}/")
    print(f"  🛸  Admin Panel →  http://localhost:{port}/admin")
    print(f"  🔑  Login: admin / admin123")
    print(f"  💡  To use a different port: PORT=3000 python app.py")
    print(f"  {'='*50}\n")
    app.run(debug=True, port=port, host="0.0.0.0")
