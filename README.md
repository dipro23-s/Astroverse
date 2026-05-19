# ◈ AstroVerse — Astrophysics Education & Simulation Platform

A complete multi-page astrophysics education platform with interactive WebGL simulations,
scientific documentation, CMS admin dashboard, and immersive space visualizations.

---

## 🚀 Quick Start (3 steps)

### Step 1 — Install Python & Flask
```bash
pip install flask
```

### Step 2 — Run the server

**On macOS** — double-click `start_mac.command`
*(opens the browser automatically)*

**On any OS** — run in terminal:
```bash
python app.py
```

### Step 3 — Open in browser
```
Main Site  →  http://localhost:8080/
Admin      →  http://localhost:8080/admin
Login      →  admin / admin123
```

> **macOS AirPlay conflict?** Port 8080 is used by default (not 5000).
> If 8080 is busy too: `PORT=3000 python app.py`

---

## 📁 Project Structure

```
AstroVerse-v5/
├── app.py                    ← Flask app + all routes
├── start.sh                  ← Linux/Mac terminal launcher
├── start_mac.command         ← macOS double-click launcher
├── requirements.txt
├── README.md
├── api/
│   ├── routes.py             ← Public API  (/api/...)
│   └── admin_routes.py       ← Admin API   (/api/admin/...)
├── database/
│   ├── db.py                 ← SQLite layer + auto-seeding
│   └── astroverse.db         ← Created automatically on first run
├── static/
│   ├── css/
│   └── js/
└── templates/
    ├── index.html            ← Main SPA (all public pages)
    └── admin/
        └── index.html        ← Admin dashboard SPA
```

---

## 🌐 All Pages & URLs

| URL | Page |
|-----|------|
| `/` | Home — hero, modules preview, solar system, timeline |
| `/modules` | All modules with category filter |
| `/modules/black-holes` | Module detail (full article + equations) |
| `/modules/black-holes/event-horizon` | Subtopic detail page |
| `/simulations` | Simulation laboratory |
| `/simulations/black-hole` | Black hole simulation |
| `/simulations/solar-system` | Solar system simulation |
| `/simulations/spacetime-curvature` | Spacetime playground |
| `/simulations/gravitational-waves` | GW merger simulation |
| `/simulations/star-lifecycle` | Star evolution simulation |
| `/simulations/galaxy` | Galaxy + Andromeda collision |
| `/timeline` | Universe timeline (all phases) |
| `/timeline/big-bang` | Timeline phase detail |
| `/research` | Research papers |
| `/about` | About the platform |
| `/admin` | Admin dashboard |

---

## 🎮 Simulations (6 fully interactive)

| Simulation | Features |
|------------|----------|
| **Black Hole** | Event horizon, accretion disk, lensing, adjustable mass/spin |
| **Solar System** | All 8 planets, real orbits, zoom/pan/rotate, labels, speed |
| **Spacetime Curvature** | Draggable masses, live grid deformation, curvature viz |
| **Gravitational Waves** | Binary BH merger, chirp signal, wave propagation |
| **Star Lifecycle** | Nebula → supernova, 6 stages, adjustable mass |
| **Galaxy** | Spiral arms, dark matter halo, Andromeda collision |

---

## ⚙️ Admin Dashboard

Login at `/admin` with `admin / admin123`

### What you can manage:
- **Modules** — Create, edit, delete, publish/draft, set featured flag
- **Subtopics** — Full CRUD per module with drag ordering  
- **Timeline Phases** — Edit all 11 cosmic history phases
- **Research Papers** — Add papers with DOI, arXiv links
- **Simulations** — Edit metadata, toggle featured/status
- **Categories** — Manage topic categories with colors
- **Equation Editor** — KaTeX live preview, copy as block or inline

### Content Format (Markdown + LaTeX)
```markdown
## Event Horizon

The Schwarzschild radius defines the event horizon:

$$r_s = \frac{2GM}{c^2}$$

For the Sun, $r_s \approx 3$ km.
```

---

## 📦 Pre-loaded Content

### 10 Modules
Black Holes · Galaxies · Dark Matter · Neutron Stars · The Big Bang ·
Dark Energy · Wormholes · Relativity · Exoplanets · Supernovae

### 8 Subtopics
**Black Holes:** Event Horizon · Singularity · Hawking Radiation · Accretion Disk · Gravitational Lensing  
**Galaxies:** Spiral Galaxies · Elliptical Galaxies · Active Galactic Nuclei

### 11 Timeline Phases
Planck Epoch → Inflation → Quark Era → Lepton Era → Nucleosynthesis →
Recombination → Dark Ages → First Stars → Galaxy Formation → Present → Far Future

### 5 Research Papers
LIGO GW detection · EHT M87* image · Hubble expansion · Dark energy supernovae

---

## 🛠 Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python 3.8+ · Flask 3.x |
| Database | SQLite (auto-created) |
| Frontend | Vanilla JS SPA · History API |
| Simulations | HTML5 Canvas 2D · Three.js ready |
| Math | KaTeX |
| Fonts | Orbitron · Exo 2 · Share Tech Mono |

---

## 🔧 Troubleshooting

**Blank white page / nothing loads**
→ Make sure Flask is running (`python app.py`)
→ Check terminal for errors

**Port already in use**
→ Use `PORT=3000 python app.py`
→ On macOS: disable AirPlay Receiver in System Settings → General → AirDrop & Handoff

**Admin login fails**
→ Use `http://localhost:8080/admin` (not your IP address)
→ Default credentials: `admin` / `admin123`
→ Clear browser localStorage: DevTools → Application → Local Storage → Clear

**Module content not showing**
→ The database auto-seeds on first run
→ Delete `database/astroverse.db` and restart to re-seed

---

*AstroVerse v5 — Explore the Universe Beyond Imagination* 🌌
