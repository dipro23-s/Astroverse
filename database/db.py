"""database/db.py — AstroVerse SQLite Database Layer"""
import sqlite3, os, hashlib, secrets, time
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "astroverse.db")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def hash_pw(pw): return hashlib.sha256(pw.encode()).hexdigest()

def init_db():
    conn = get_conn(); c = conn.cursor()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'editor',
        created_at TEXT DEFAULT (datetime('now')),
        last_login TEXT,
        is_active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT DEFAULT '',
        color TEXT DEFAULT '#38BDF8',
        glow TEXT DEFAULT '#38BDF8',
        icon TEXT DEFAULT '🔭',
        created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS modules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        subtitle TEXT DEFAULT '',
        icon TEXT DEFAULT '🔭',
        color TEXT DEFAULT '#38BDF8',
        glow TEXT DEFAULT '#38BDF8',
        category_id INTEGER,
        description TEXT DEFAULT '',
        content TEXT DEFAULT '',
        difficulty TEXT DEFAULT 'Beginner',
        read_time TEXT DEFAULT '10 min',
        featured INTEGER DEFAULT 0,
        status TEXT DEFAULT 'published',
        hero_image TEXT DEFAULT '',
        simulation_slug TEXT DEFAULT '',
        views INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(category_id) REFERENCES categories(id)
    );
    CREATE TABLE IF NOT EXISTS subtopics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        module_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        slug TEXT NOT NULL,
        description TEXT DEFAULT '',
        content TEXT DEFAULT '',
        icon TEXT DEFAULT '◈',
        order_num INTEGER DEFAULT 0,
        status TEXT DEFAULT 'published',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(module_id) REFERENCES modules(id),
        UNIQUE(module_id, slug)
    );
    CREATE TABLE IF NOT EXISTS simulations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT DEFAULT '',
        category TEXT DEFAULT 'general',
        difficulty TEXT DEFAULT 'Intermediate',
        tech TEXT DEFAULT 'Three.js + WebGL',
        status TEXT DEFAULT 'published',
        featured INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS timeline_phases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        time_label TEXT DEFAULT '',
        time_years TEXT DEFAULT '',
        description TEXT DEFAULT '',
        content TEXT DEFAULT '',
        temperature TEXT DEFAULT '',
        color TEXT DEFAULT '#38BDF8',
        icon TEXT DEFAULT '💥',
        order_num INTEGER DEFAULT 0,
        status TEXT DEFAULT 'published',
        created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS papers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        authors TEXT DEFAULT '',
        journal TEXT DEFAULT '',
        year INTEGER DEFAULT 2024,
        doi TEXT DEFAULT '',
        url TEXT DEFAULT '',
        abstract TEXT DEFAULT '',
        module_id INTEGER,
        tags TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(module_id) REFERENCES modules(id)
    );
    CREATE TABLE IF NOT EXISTS module_tags (
        module_id INTEGER,
        tag TEXT,
        PRIMARY KEY(module_id, tag),
        FOREIGN KEY(module_id) REFERENCES modules(id)
    );
    """)

    # Seed admin
    existing = c.execute("SELECT id FROM users WHERE username='admin'").fetchone()
    if not existing:
        c.execute("INSERT INTO users (username,email,password_hash,role) VALUES (?,?,?,?)",
                  ("admin","admin@astroverse.space", hash_pw("admin123"),"admin"))

    # Seed categories
    cats = [
        ("Extreme Objects","extreme-objects","Black holes, neutron stars, and exotic phenomena","#6B21A8","#A855F7","⚫"),
        ("Cosmology","cosmology","The large-scale structure and history of the universe","#7C2D12","#FB923C","💥"),
        ("Theoretical","theoretical","Wormholes, string theory, and mathematical physics","#0C4A6E","#38BDF8","🌀"),
        ("Planetary Science","planetary-science","Planets, exoplanets, and solar systems","#14532D","#4ADE80","🪐"),
        ("Stellar Physics","stellar-physics","Stars, supernovae, and stellar evolution","#4A1942","#E879F9","⭐"),
        ("Large Scale Structure","large-scale-structure","Galaxies, clusters, and cosmic web","#1D4ED8","#60A5FA","🌌"),
    ]
    for cat in cats:
        c.execute("INSERT OR IGNORE INTO categories (name,slug,description,color,glow,icon) VALUES (?,?,?,?,?,?)", cat)

    # Seed modules
    modules = [
        ("Black Holes","black-holes","Where Gravity Breaks Reality","⚫","#6B21A8","#A855F7",1,
         "Regions of spacetime where gravity is so strong that nothing—not even light—can escape.",
         """# Black Holes

Black holes are among the most fascinating and extreme objects in the universe. They form when massive stars exhaust their nuclear fuel and collapse under their own gravity.

## Formation

When a star with more than ~20 solar masses exhausts its fuel, radiation pressure can no longer counteract gravity. The iron core collapses in under a second, and if the remaining mass exceeds ~3 M☉, not even neutron degeneracy pressure can halt the collapse.

## The Schwarzschild Radius

The size of a black hole's event horizon is given by the Schwarzschild radius:

$$r_s = \\frac{2GM}{c^2}$$

For the Sun, this would be approximately 3 kilometers. For Earth, just 9 millimeters.

## Event Horizon

The event horizon is the point of no return — once matter or light crosses this boundary, it cannot escape. From the perspective of a distant observer, objects falling toward the event horizon appear to slow down and redshift to infinity.

## Hawking Radiation

Stephen Hawking theorized in 1974 that black holes are not completely black. Due to quantum effects near the event horizon, they slowly emit thermal radiation:

$$T_H = \\frac{\\hbar c^3}{8\\pi G M k_B}$$

This process would eventually cause black holes to evaporate, though for stellar-mass black holes this timescale vastly exceeds the age of the universe.

## Spaghettification

The tidal forces near a black hole stretch infalling matter into thin strands — a process called spaghettification. The difference in gravitational pull between the feet and head of an infalling person would be enormous.

## Gravitational Lensing

The extreme gravity of black holes bends the path of light, creating Einstein rings and distorted images of background objects. This effect was famously imaged by the Event Horizon Telescope in 2019.""",
         "Advanced","15 min",1,"blackhole"),

        ("Galaxies","galaxies","Islands of Stars in the Cosmic Ocean","🌌","#1D4ED8","#60A5FA",6,
         "Massive systems of stars, gas, dust, and dark matter — from dwarfs to giants spanning millions of light-years.",
         """# Galaxies

Galaxies are the fundamental building blocks of the large-scale universe. Each contains billions to trillions of stars bound together by gravity.

## The Milky Way

Our home galaxy is a barred spiral galaxy approximately 100,000 light-years in diameter. It contains an estimated 200-400 billion stars and a supermassive black hole at its center — Sagittarius A*.

## Galaxy Classification

Edwin Hubble developed the classic morphological classification:

- **Elliptical (E0-E7)**: Smooth, featureless ellipsoids of old red stars
- **Lenticular (S0)**: Disc without spiral arms
- **Spiral (Sa-Sd)**: Disc with winding spiral arms
- **Barred Spiral (SBa-SBd)**: Spiral with central bar structure
- **Irregular (Irr)**: No defined structure

## Active Galactic Nuclei

Some galaxy cores shine with extraordinary luminosity powered by accretion onto supermassive black holes. The luminosity of a quasar can exceed the entire rest of its host galaxy by factors of 100 or more.

## The Cosmic Web

Galaxies do not exist in isolation. They cluster in groups and clusters, which form superclusters, which trace vast filaments of dark matter — the cosmic web.""",
         "Beginner","10 min",1,"galaxy"),

        ("Dark Matter","dark-matter","The Invisible Scaffolding of the Universe","🕳️","#065F46","#34D399",2,
         "Invisible matter constituting ~27% of the universe's energy budget, shaping cosmic structure through gravity alone.",
         """# Dark Matter

Dark matter is one of the greatest mysteries in modern physics. It does not emit, absorb, or reflect electromagnetic radiation, yet its gravitational effects shape the entire cosmos.

## Evidence

Three independent lines of evidence point to dark matter:

1. **Galaxy Rotation Curves**: Stars in galaxy outskirts orbit far faster than visible matter predicts
2. **Gravitational Lensing**: Light bends around invisible mass concentrations
3. **Cosmic Structure**: Large-scale structure simulations only match observations with dark matter

## The Bullet Cluster

The most compelling direct evidence comes from the Bullet Cluster — two galaxy clusters that recently collided. The hot gas (visible in X-rays) was slowed by electromagnetic interactions, while the dark matter halos (mapped by lensing) passed through each other.

## Candidates

$$\\Omega_{DM} h^2 = 0.120 \\pm 0.001$$

Leading candidates include:
- **WIMPs**: Weakly Interacting Massive Particles with masses of ~100 GeV
- **Axions**: Ultra-light particles from Peccei-Quinn symmetry breaking  
- **Sterile neutrinos**: Right-handed neutrinos mixing with active flavors""",
         "Intermediate","12 min",0,"darkmatter"),

        ("Neutron Stars","neutron-stars","The Densest Visible Objects in the Known Universe","⭐","#92400E","#FCD34D",5,
         "Collapsed stellar cores where neutron degeneracy pressure halts gravitational collapse — packing solar masses into 20km spheres.",
         """# Neutron Stars

When massive stars explode as supernovae, their cores may survive as neutron stars — the densest objects with a visible surface in the known universe.

## Physical Properties

A typical neutron star has:
- Mass: 1.4 M☉ (maximum ~3 M☉)
- Radius: ~10-12 km
- Surface gravity: ~2×10¹¹ g
- Core density: ~10¹⁴-10¹⁵ g/cm³

The equation of state at such densities remains an active research area.

## Pulsars

Rapidly rotating neutron stars with beamed electromagnetic emission appear as precision cosmic clocks. The fastest known pulsar — PSR J1748-2446ad — rotates 716 times per second.

## Magnetars

A subset of neutron stars with magnetic fields reaching 10¹⁵ Gauss. These fields can crack the neutron star crust, releasing starquakes and X-ray flares detectable across the galaxy.

## Gravitational Wave Sources

Merging neutron star binaries (kilonovae) produce gravitational waves detectable by LIGO. GW170817 was the first multi-messenger detection — seen in gravitational waves and across the entire electromagnetic spectrum simultaneously.""",
         "Advanced","12 min",0,"neutronstar"),

        ("The Big Bang","big-bang","The Birth of Space, Time, and Everything","💥","#7C2D12","#FB923C",2,
         "The prevailing cosmological model describing how the universe expanded from an initial hot, dense state 13.8 billion years ago.",
         """# The Big Bang

The Big Bang is not an explosion in space — it is the expansion of space itself, beginning from an initial state of extraordinary density and temperature.

## Timeline of the Early Universe

| Time | Temperature | Event |
|------|-------------|-------|
| 0 | ∞ | Singularity / Planck epoch |
| 10⁻³⁵ s | 10²⁸ K | Inflation begins |
| 10⁻³² s | 10²² K | Inflation ends |
| 10⁻⁶ s | 10¹³ K | Quarks form hadrons |
| 1 s | 10¹⁰ K | Neutrino decoupling |
| 3 min | 10⁹ K | Nucleosynthesis |
| 380,000 yr | 3000 K | Recombination / CMB |
| 13.8 Gyr | 2.725 K | Today |

## Three Pillars of Evidence

1. **Hubble Expansion**: Galaxies recede proportionally to distance
2. **Big Bang Nucleosynthesis**: Predicted H/He/Li abundances match observations
3. **CMB**: Thermal radiation at 2.725 K filling all space

## The Flatness Problem

The Friedmann equation governs cosmic expansion:

$$H^2 = \\frac{8\\pi G \\rho}{3} - \\frac{kc^2}{a^2} + \\frac{\\Lambda c^2}{3}$$

The measured spatial curvature k is essentially zero — an extraordinary fine-tuning that inflation elegantly resolves.""",
         "Beginner","14 min",1,"bigbang"),

        ("Dark Energy","dark-energy","The Force Accelerating the Universe's Expansion","⚡","#1E3A5F","#38BDF8",2,
         "Mysterious energy constituting ~68% of the universe, responsible for the observed accelerating expansion.",
         """# Dark Energy

In 1998, two independent teams studying Type Ia supernovae discovered that the universe's expansion is accelerating — a stunning result that overturned decades of assumptions.

## The Cosmological Constant

Einstein introduced Λ to his field equations to create a static universe. He later called it his greatest blunder. Ironically, dark energy is now described by exactly this term:

$$G_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu}$$

## The Cosmological Constant Problem

Quantum field theory predicts vacuum energy ~10¹²⁰ times larger than observed — the largest discrepancy between theory and measurement in all of physics.

## Equation of State

The dark energy equation of state parameter w relates pressure to density:

$$w = \\frac{p}{\\rho c^2}$$

Current measurements: w = -1.03 ± 0.03, consistent with a pure cosmological constant (w = -1).""",
         "Advanced","10 min",0,"darkenergy"),

        ("Wormholes","wormholes","Tunnels Through the Fabric of Spacetime","🌀","#0C4A6E","#38BDF8",3,
         "Einstein-Rosen bridges — topological shortcuts connecting distant regions of spacetime.",
         """# Wormholes

Wormholes, or Einstein-Rosen bridges, are theoretical tunnels through spacetime connecting distant regions of the universe — or even separate universes.

## Mathematical Foundation

The simplest wormhole solution comes from the maximally extended Schwarzschild metric. In Kruskal-Szekeres coordinates, the geometry reveals two exterior regions connected through a throat.

## The Morris-Thorne Metric

$$ds^2 = -e^{2\\Phi(r)}c^2 dt^2 + \\frac{dr^2}{1 - b(r)/r} + r^2 d\\Omega^2$$

Where b(r) is the shape function and Φ(r) the redshift function. For traversability, we need b(r₀) = r₀ at the throat.

## Exotic Matter Requirement

Traversable wormholes require matter with negative energy density — violating the null energy condition. While quantum effects (Casimir effect) can produce negative energy locally, sustaining a traversable wormhole would require macroscopic quantities far beyond current physics.

## ER = EPR

The Maldacena-Susskind conjecture (2013) proposes that quantum entanglement (EPR) and wormholes (ER) are two descriptions of the same physical phenomenon.""",
         "Advanced","10 min",0,"wormhole"),

        ("Relativity","relativity","Space, Time, and the Geometry of Reality","🌀","#312E81","#818CF8",3,
         "Einstein's theories describing how space, time, mass, and energy are interrelated — the foundation of modern cosmology.",
         """# Relativity

Einstein's theories of relativity — special (1905) and general (1915) — revolutionized our understanding of space, time, and gravity.

## Special Relativity

Two postulates, radical consequences:
1. The laws of physics are identical in all inertial frames
2. The speed of light c is the same for all observers

### Time Dilation
$$t' = \\gamma t_0 = \\frac{t_0}{\\sqrt{1 - v^2/c^2}}$$

### Mass-Energy Equivalence
$$E = mc^2$$

One gram of matter contains 9×10¹³ joules — equivalent to 21 kilotons of TNT.

## General Relativity

Gravity is not a force but the curvature of spacetime caused by mass-energy:

$$G_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu}$$

### Gravitational Time Dilation

Clocks near massive objects run slow:
$$\\frac{d\\tau}{dt} = \\sqrt{1 - \\frac{r_s}{r}}$$

GPS satellites require corrections of +38.4 μs/day due to both special and general relativistic effects.

## Gravitational Waves

Accelerating masses produce ripples in spacetime propagating at c. First detected by LIGO in 2015 from two merging black holes 1.3 billion light-years away.""",
         "Intermediate","16 min",1,"spacetime"),

        ("Exoplanets","exoplanets","Worlds Beyond Our Solar System","🪐","#14532D","#4ADE80",4,
         "Planets orbiting stars other than the Sun — over 5,600 confirmed, from scorching lava worlds to potential ocean worlds.",
         """# Exoplanets

The discovery of exoplanets — planets orbiting other stars — has transformed our understanding of planetary systems and the possibility of life beyond Earth.

## Detection Methods

### Transit Photometry
When a planet crosses its star, it blocks a fraction of the star's light:
$$\\frac{\\Delta F}{F} = \\left(\\frac{R_p}{R_*}\\right)^2$$

The Kepler and TESS missions have used this method to find thousands of planets.

### Radial Velocity
A planet's gravitational pull causes its star to wobble, producing Doppler shifts in the stellar spectrum:
$$v_r = K[\\cos(\\omega + f) + e\\cos\\omega]$$

## Habitable Zone

The habitable zone — where liquid water could exist on the surface — depends on stellar luminosity:
$$a_{HZ} = \\sqrt{\\frac{L_*}{L_\\odot}} \\times a_{HZ,\\odot}$$

## Atmospheric Characterization

JWST can detect molecular signatures in exoplanet atmospheres during transits. Already detected: CO₂, water vapor, sulfur dioxide, and methane in various atmospheres.""",
         "Beginner","8 min",0,"exoplanets"),

        ("Supernovae","supernovae","The Universe's Most Powerful Explosions","✨","#4A1942","#E879F9",5,
         "Cataclysmic stellar explosions that briefly outshine entire galaxies, forge heavy elements, and scatter them across the cosmos.",
         """# Supernovae

Supernovae are among the most energetic events in the universe, releasing more energy in seconds than the Sun will emit in its entire 10-billion-year lifetime.

## Types of Supernovae

### Type Ia: Thermonuclear
White dwarfs in binary systems accumulate material until they reach the Chandrasekhar limit (~1.4 M☉), triggering runaway carbon fusion. These have standardizable peak luminosities, making them cosmological distance indicators.

### Type II: Core-Collapse
Stars more massive than ~8 M☉ develop iron cores. When the core exceeds the Chandrasekhar limit, it collapses in ~0.1 seconds, bouncing and driving a shockwave through the stellar envelope.

## Energy Budget

$$E_{total} \\approx 3 \\times 10^{46} \\text{ J}$$

- 99%: Carried by ~10⁵⁸ neutrinos
- 1%: Kinetic energy of ejected material
- 0.01%: Visible electromagnetic radiation

## r-Process Nucleosynthesis

Core-collapse supernovae and neutron star mergers drive rapid neutron capture, producing elements heavier than iron — from strontium to uranium. Every gold atom on Earth was forged in such an event.""",
         "Intermediate","9 min",0,"supernova"),
    ]

    for m in modules:
        c.execute("""INSERT OR IGNORE INTO modules 
            (title,slug,subtitle,icon,color,glow,category_id,description,content,difficulty,read_time,featured,simulation_slug)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""", m)

    # Seed subtopics for Black Holes
    bh_id = c.execute("SELECT id FROM modules WHERE slug='black-holes'").fetchone()
    if bh_id:
        bid = bh_id[0]
        subtopics = [
            (bid,"Event Horizon","event-horizon","The boundary of no return surrounding a black hole",
             """## Event Horizon\n\nThe event horizon is a mathematical surface — not a physical barrier — defined by the Schwarzschild radius:\n\n$$r_s = \\frac{2GM}{c^2}$$\n\nAn observer falling through the event horizon experiences nothing locally unusual. However, from the perspective of a distant observer, the infalling object appears to freeze and redshift to invisibility.\n\nThe event horizon of Sagittarius A* — our galaxy's central black hole — has a radius of approximately 12 million kilometers, about 17 times the radius of the Sun.""",
             "◈",1),
            (bid,"Singularity","singularity","The infinitely dense core where known physics breaks down",
             """## Singularity\n\nAt the center of a black hole (in classical general relativity) lies the singularity — a point of infinite density where spacetime curvature diverges and the known laws of physics cease to apply.\n\nThe Penrose-Hawking singularity theorems prove that singularities are an inevitable consequence of general relativity under certain conditions. However, most physicists believe that a correct theory of quantum gravity will resolve the singularity.\n\nThe Bekenstein-Hawking entropy:\n\n$$S_{BH} = \\frac{k_B c^3 A}{4 G \\hbar}$$\n\nsuggests that the information content of a black hole scales with its surface area, not volume — a deep hint about the quantum nature of gravity.""",
             "⚫",2),
            (bid,"Hawking Radiation","hawking-radiation","Quantum evaporation of black holes",
             """## Hawking Radiation\n\nIn 1974, Stephen Hawking showed that black holes are not truly black. Due to quantum effects near the event horizon, black holes slowly emit thermal radiation at a temperature:\n\n$$T_H = \\frac{\\hbar c^3}{8\\pi G M k_B} \\approx \\frac{6 \\times 10^{-8} K}{M/M_\\odot}$$\n\nFor stellar-mass black holes, this temperature is far below the cosmic microwave background, making detection currently impossible. However, for microscopic black holes (if they exist), Hawking radiation would be extremely intense.\n\nThe evaporation timescale scales as M³:\n\n$$t_{evap} \\sim \\frac{5120 \\pi G^2 M^3}{\\hbar c^4}$$""",
             "✨",3),
            (bid,"Accretion Disk","accretion-disk","The swirling disk of superheated matter around black holes",
             """## Accretion Disk\n\nMatter falling toward a black hole does not plunge directly in — it forms a rotating disk of superheated plasma called an accretion disk. Conservation of angular momentum and energy dissipation through viscosity causes the disk to spiral inward.\n\nInner edge: The innermost stable circular orbit (ISCO) lies at:\n$$r_{ISCO} = 6GM/c^2 = 3r_s$$\n\n(for non-rotating black holes)\n\nTemperatures in accretion disks can reach millions of Kelvin, producing X-ray emission. The accretion disk of M87* — the first imaged black hole — was observed glowing at radio wavelengths by the Event Horizon Telescope in 2019.""",
             "🔥",4),
            (bid,"Gravitational Lensing","gravitational-lensing","Light bending around massive objects",
             """## Gravitational Lensing\n\nGeneral relativity predicts that mass curves spacetime, bending the paths of photons. The deflection angle for light passing a mass M at distance b is:\n\n$$\\alpha = \\frac{4GM}{c^2 b}$$\n\nThis is exactly twice the Newtonian prediction — the factor of 2 comes from spacetime curvature.\n\n**Einstein Rings** form when source, lens, and observer are perfectly aligned, producing a circular image.\n\n**Gravitational microlensing** has discovered thousands of exoplanets, dark compact objects, and is used to probe dark matter distributions.""",
             "💫",5),
        ]
        for st in subtopics:
            c.execute("INSERT OR IGNORE INTO subtopics (module_id,title,slug,description,content,icon,order_num) VALUES (?,?,?,?,?,?,?)", st)

    # Seed subtopics for Galaxies
    gx_id = c.execute("SELECT id FROM modules WHERE slug='galaxies'").fetchone()
    if gx_id:
        gid = gx_id[0]
        subtopics_gx = [
            (gid,"Spiral Galaxies","spiral-galaxies","Disc-shaped galaxies with winding arms of stars",
             """## Spiral Galaxies\n\nSpiral galaxies like the Milky Way and Andromeda are characterized by:\n- A central bulge of older stars\n- A thin disc with spiral arms\n- A dark matter halo extending far beyond the visible disc\n\n**Grand design spirals** (like M51, the Whirlpool Galaxy) have well-defined, symmetric arms. **Flocculent spirals** have fragmentary, patchy arms.\n\nThe spiral arms are not rigid structures — they are density waves propagating through the galactic disc, triggering star formation as gas is compressed.""",
             "🌀",1),
            (gid,"Elliptical Galaxies","elliptical-galaxies","Smooth featureless galaxies of old red stars",
             """## Elliptical Galaxies\n\nElliptical galaxies range from nearly spherical (E0) to highly elongated (E7). They contain predominantly old, red stars with little interstellar gas or dust, resulting in negligible current star formation.\n\nThe largest known galaxy, IC 1101, is a giant elliptical spanning 6 million light-years — 60 times larger than the Milky Way. It contains approximately 100 trillion stars.\n\nElliptical galaxies are believed to form primarily through galaxy mergers. The Milky Way-Andromeda merger in ~4.5 billion years will likely produce an elliptical galaxy.""",
             "⭕",2),
            (gid,"Active Galactic Nuclei","active-galactic-nuclei","Extremely luminous cores powered by supermassive black holes",
             """## Active Galactic Nuclei\n\nWhen material accretes onto a supermassive black hole at sufficient rates, the resulting luminosity can exceed the rest of the galaxy by factors of 100. These objects — classified as Seyfert galaxies, quasars, blazars, or radio galaxies depending on geometry and activity level — are collectively called Active Galactic Nuclei (AGN).\n\n**Quasars** are the most luminous, with some exceeding 10¹⁴ solar luminosities. The most distant known quasar, J0313-1806, shines from 13.03 billion light-years away — just 670 million years after the Big Bang.\n\nThe unified model of AGN suggests these diverse phenomena are the same object seen from different angles.""",
             "⚡",3),
        ]
        for st in subtopics_gx:
            c.execute("INSERT OR IGNORE INTO subtopics (module_id,title,slug,description,content,icon,order_num) VALUES (?,?,?,?,?,?,?)", st)

    # Seed simulations
    sims = [
        ("Black Hole","black-hole","Interactive black hole with event horizon, accretion disk, gravitational lensing, and time dilation visualization","extreme-objects","Advanced","Three.js + WebGL Shaders",1,1),
        ("Solar System","solar-system","Real orbital mechanics with all planets, moons, date-based positions, and camera travel mode","planetary-science","Beginner","Three.js + Orbital Mechanics",1,1),
        ("Exoplanet System","exoplanets","Different star classes, habitable zones, transit animations, and atmospheric visualization","planetary-science","Intermediate","Three.js + Custom Shaders",1,0),
        ("Star Lifecycle","star-lifecycle","Complete stellar evolution from nebula to black hole with adjustable mass and temperature","stellar-physics","Intermediate","Three.js + Particle Systems",1,0),
        ("Galaxy Formation","galaxy","Spiral galaxy rotation, Milky Way structure, Andromeda collision, and dark matter halo effects","large-scale-structure","Advanced","Three.js + Particle Systems",1,0),
        ("Gravitational Waves","gravitational-waves","Binary black hole merger with spacetime ripple visualization and frequency controls","extreme-objects","Advanced","WebGL Shaders + Custom Math",1,0),
        ("Wormhole","wormhole","Einstein-Rosen bridge with light distortion, tunnel visualization, and travel animation","theoretical","Advanced","Three.js + GLSL",1,0),
        ("Asteroid Belt","asteroids","Asteroid belt dynamics, comet trajectories, elliptical orbits, and solar interaction","planetary-science","Beginner","Three.js + Physics",0,0),
        ("Planet Formation","planet-formation","Dust cloud collapse, particle accretion, disk evolution, and planetesimal formation","planetary-science","Intermediate","Three.js + Particle Systems",0,0),
        ("Spacetime Curvature","spacetime-curvature","Interactive gravity grid, mass placement, orbit generation, and curvature visualization","theoretical","Intermediate","Canvas 2D + Physics",1,0),
    ]
    for s in sims:
        c.execute("INSERT OR IGNORE INTO simulations (title,slug,description,category,difficulty,tech,featured,status) VALUES (?,?,?,?,?,?,?,?)",
                  (s[0],s[1],s[2],s[3],s[4],s[5],s[6],"published"))

    # Seed timeline phases
    phases = [
        ("Planck Epoch","planck-epoch","t < 10⁻⁴³ s","10⁻⁴³ seconds","The earliest moment accessible to physics — all four forces unified at the Planck temperature of 10³² K.","# Planck Epoch\n\nBefore 10⁻⁴³ seconds (the Planck time), quantum gravitational effects dominate and our current physics breaks down. The universe had the Planck temperature of ~10³² K and the Planck density of ~10⁹⁷ kg/m³.","10³² K","#6B21A8","💥",1),
        ("Inflation","inflation","10⁻³⁶ to 10⁻³² s","~10⁻³⁴ seconds","Exponential expansion solving the horizon, flatness, and monopole problems — universe expanded by factor 10²⁶.","# Cosmic Inflation\n\nBetween approximately 10⁻³⁶ and 10⁻³² seconds, the universe underwent exponential expansion driven by a scalar field called the inflaton.\n\nThe size of the universe increased by a factor of at least 10²⁶ in an instant. This explains:\n- **Horizon problem**: Why the CMB is uniform\n- **Flatness problem**: Why space is geometrically flat\n- **Monopole problem**: Why we don't see magnetic monopoles\n\n$$a(t) \\propto e^{Ht}$$","10²² K","#7C2D12","📈",2),
        ("Quark Era","quark-era","10⁻¹² to 10⁻⁶ s","~10⁻⁶ seconds","The universe was a quark-gluon plasma — quarks and gluons moved freely at temperatures above 10¹² K.","# Quark Era\n\nAs the universe cooled below 10¹³ K, the electroweak transition separated the electromagnetic and weak nuclear forces. Quarks and gluons still moved freely in a quark-gluon plasma.\n\nAt 10⁻⁶ seconds, the temperature dropped below the quark-hadron transition (~10¹² K), and quarks became confined into protons and neutrons:\n\n$$uud \\rightarrow p^+, \\quad udd \\rightarrow n^0$$","10¹² K","#0C4A6E","⚛️",3),
        ("Lepton Era","lepton-era","10⁻⁶ to 1 s","~0.01 seconds","Electrons, positrons, and neutrinos dominated as quarks condensed into hadrons and most antimatter annihilated.","# Lepton Era\n\nAfter hadron formation, the universe was dominated by electrons, positrons, and neutrinos. Particle-antiparticle pairs were continuously created and annihilated.\n\nAt ~1 second, neutrinos decoupled from matter — they have been streaming freely through the universe ever since as the Cosmic Neutrino Background (CνB) at 1.95 K today.","10¹⁰ K","#065F46","⚡",4),
        ("Big Bang Nucleosynthesis","nucleosynthesis","1 to 20 minutes","~3 minutes","Nuclear fusion forged the light elements — hydrogen, helium, and trace lithium — in the first 20 minutes.","# Big Bang Nucleosynthesis\n\nBetween 1 and 20 minutes after the Big Bang, the temperature dropped below 10⁹ K — cool enough for nuclear fusion but hot enough for it to proceed.\n\nResult:\n- **~75%** Hydrogen-1\n- **~25%** Helium-4\n- **~0.01%** Deuterium\n- **~0.0001%** Lithium-7\n\nThis prediction matches observed primordial abundances to remarkable precision — one of the three pillars of Big Bang cosmology.\n\n$$n/p \\approx 1/7 \\text{ at freeze-out}$$","10⁹ K","#92400E","🔥",5),
        ("Recombination & CMB","recombination","380,000 years","380,000 years","Electrons and protons combined into neutral hydrogen — the universe became transparent and the CMB was released.","# Recombination\n\nAt 380,000 years, the universe cooled to ~3000 K. Electrons and protons combined into neutral hydrogen atoms for the first time — a process called recombination.\n\nWith neutral atoms, the universe became transparent to photons. The photons released at this moment have been traveling ever since — we observe them today as the **Cosmic Microwave Background** at 2.725 K, redshifted by a factor of ~1100.\n\nThe CMB temperature map reveals tiny fluctuations (ΔT/T ~ 10⁻⁵) that seeded all cosmic structure.","3000 K","#38BDF8","🌡️",6),
        ("Dark Ages","dark-ages","380,000 to 150M years","~100 million years","No stars yet existed — the universe was filled with neutral hydrogen gas, opaque to UV light.","# The Dark Ages\n\nAfter recombination, the universe entered a dark phase. No stars had yet formed, and the only light was the fading glow of the CMB.\n\nThe universe was filled with neutral hydrogen gas. Density fluctuations from inflation slowly grew under gravity, eventually collapsing to form the first structures.\n\n21-cm hydrogen emission from this era is a major target for next-generation radio telescopes like the Square Kilometre Array.","~100 K","#1E3A5F","🌑",7),
        ("First Stars","first-stars","150 to 800M years","~200 million years","Population III stars — massive, hot, metal-free — ionized the universe and forged the first heavy elements.","# First Stars (Cosmic Dawn)\n\nThe first stars (Population III) formed at ~100-200 million years from the collapse of primordial hydrogen and helium clouds. They were likely:\n- **Extremely massive**: 100-1000 M☉\n- **Hot**: Surface temperatures >10⁵ K\n- **Short-lived**: ~3 million years\n- **Metal-free**: No elements heavier than Li existed\n\nThese stars produced the first metals in supernovae and began reionizing the universe. No Population III stars have been directly observed — they may be within reach of JWST.","~10 K","#FCD34D","⭐",8),
        ("Galaxy Formation","galaxy-formation","800M to 3B years","~1 billion years","Dark matter halos merged and grew, trapping gas that cooled into the first galaxies and supermassive black holes.","# Galaxy Formation\n\nAs dark matter halos merged hierarchically, gas cooled within them through radiative processes and formed the first galaxies. The most distant confirmed galaxy, GS-z13, is seen just 320 million years after the Big Bang.\n\nQuasars — powered by accreting supermassive black holes — blazed with extraordinary luminosity during this epoch, playing a key role in completing reionization.\n\nBy ~3 billion years, the universe contained a rich tapestry of galaxies forming at a peak rate of ~30 M☉/year.","~3 K","#1D4ED8","🌌",9),
        ("Present Universe","present","13.8 billion years","Now","A vast cosmic web of galaxies, clusters, and voids — expanding and accelerating under the influence of dark energy.","# The Present Universe\n\nAt 13.8 billion years, the universe contains:\n- **~2 trillion galaxies** in the observable volume\n- A **cosmic web** of filaments, walls, and voids\n- Accelerating expansion driven by dark energy\n- Average temperature: **2.725 K**\n\nThe observable universe spans ~93 billion light-years in diameter (due to expansion). The total universe may be vastly larger — or infinite.\n\nDark energy (68%) dominates, dark matter (27%) scaffolds structure, and ordinary matter (5%) is everything we can directly observe.","2.725 K","#4ADE80","🌍",10),
        ("Far Future","far-future","10¹⁴ to 10¹⁰⁰ years","Trillions of years","Stars die, black holes evaporate, protons may decay — the universe approaches heat death.","# The Far Future\n\n| Era | Time | Event |\n|-----|------|-------|\n| Stelliferous | 10¹² yr | Last star forms |\n| Degenerate | 10¹⁵ yr | White dwarf era |\n| Black Hole | 10⁴⁰ yr | Proton decay (if it occurs) |\n| Dark Era | 10⁶⁷ yr | Stellar black holes evaporate |\n| Heat Death | 10¹⁰⁰ yr | Supermassive BHs evaporate |\n\nIf the cosmological constant remains constant, the universe asymptotically approaches a de Sitter state — exponentially expanding, increasingly empty.","→ 0 K","#312E81","☁️",11),
    ]
    for p in phases:
        c.execute("INSERT OR IGNORE INTO timeline_phases (title,slug,time_label,time_years,description,content,temperature,color,icon,order_num) VALUES (?,?,?,?,?,?,?,?,?,?)", p)

    # Seed research papers
    papers_data = [
        ("Observation of Gravitational Waves from a Binary Black Hole Merger","Abbott et al.","Physical Review Letters",2016,"10.1103/PhysRevLett.116.061102","https://arxiv.org/abs/1602.03837","First direct detection of gravitational waves, from a pair of merging black holes.",1),
        ("A Two-Solar-Mass Neutron Star Measured Using Shapiro Delay","Demorest et al.","Nature",2010,"10.1038/nature09466","https://arxiv.org/abs/1010.5788","Measurement constraining the neutron star equation of state.",4),
        ("First M87 Event Horizon Telescope Results","EHT Collaboration","ApJL",2019,"10.3847/2041-8213/ab0ec7","https://arxiv.org/abs/1906.11238","First direct image of a black hole shadow.",1),
        ("Measurements of Omega and Lambda from 42 High-Redshift Supernovae","Perlmutter et al.","ApJ",1999,"10.1086/307221","https://arxiv.org/abs/astro-ph/9812133","Discovery of accelerating cosmic expansion leading to Nobel Prize.",None),
        ("Observational Evidence from Supernovae for an Accelerating Universe","Riess et al.","AJ",1998,"10.1086/300499","https://arxiv.org/abs/astro-ph/9805200","Independent discovery of dark energy from Type Ia supernovae.",None),
    ]
    for p in papers_data:
        c.execute("INSERT OR IGNORE INTO papers (title,authors,journal,year,doi,url,abstract,module_id) VALUES (?,?,?,?,?,?,?,?)", p)

    conn.commit(); conn.close()
    print("  ✓ Database initialized")

def auth_session(token):
    if not token: return None
    conn = get_conn()
    row = conn.execute("SELECT u.* FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token=? AND s.expires_at > datetime('now')", (token,)).fetchone()
    conn.close()
    return dict(row) if row else None

def create_session(user_id):
    token = secrets.token_hex(32)
    conn = get_conn()
    conn.execute("INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,datetime('now','+7 days'))", (token, user_id))
    conn.commit(); conn.close()
    return token

def get_modules(featured=None, category_slug=None):
    conn = get_conn()
    q = "SELECT m.*,c.name as category_name FROM modules m LEFT JOIN categories c ON m.category_id=c.id WHERE m.status='published'"
    params = []
    if featured is not None: q += " AND m.featured=?"; params.append(int(featured))
    if category_slug: q += " AND c.slug=?"; params.append(category_slug)
    q += " ORDER BY m.featured DESC, m.created_at DESC"
    rows = conn.execute(q, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_module(slug):
    conn = get_conn()
    row = conn.execute("SELECT m.*,c.name as category_name,c.color as cat_color FROM modules m LEFT JOIN categories c ON m.category_id=c.id WHERE m.slug=? AND m.status='published'", (slug,)).fetchone()
    if row:
        conn.execute("UPDATE modules SET views=views+1 WHERE slug=?", (slug,))
        conn.commit()
    conn.close()
    return dict(row) if row else None

def get_subtopics(module_id):
    conn = get_conn()
    rows = conn.execute("SELECT * FROM subtopics WHERE module_id=? AND status='published' ORDER BY order_num", (module_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_subtopic(module_slug, subtopic_slug):
    conn = get_conn()
    row = conn.execute("""SELECT s.*, m.title as module_title, m.slug as module_slug, m.color as module_color, m.glow as module_glow
        FROM subtopics s JOIN modules m ON s.module_id=m.id 
        WHERE m.slug=? AND s.slug=? AND s.status='published'""", (module_slug, subtopic_slug)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_simulations(featured=None):
    conn = get_conn()
    q = "SELECT * FROM simulations WHERE status='published'"
    params = []
    if featured is not None: q += " AND featured=?"; params.append(int(featured))
    q += " ORDER BY featured DESC, created_at"
    rows = conn.execute(q, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_timeline():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM timeline_phases WHERE status='published' ORDER BY order_num").fetchall()
    conn.close()
    return [dict(r) for r in rows]

# Slug aliases — redirect common alternate names to real slugs
TIMELINE_ALIASES = {
    'big-bang': 'planck-epoch',
    'planck': 'planck-epoch',
    'cosmic-inflation': 'inflation',
    'bbn': 'nucleosynthesis',
    'cmb': 'recombination',
    'reionization': 'first-stars',
    'present-universe': 'present',
    'future': 'far-future',
    'heat-death': 'far-future',
}

def get_timeline_phase(slug):
    # Resolve alias if needed
    slug = TIMELINE_ALIASES.get(slug, slug)
    conn = get_conn()
    row = conn.execute("SELECT * FROM timeline_phases WHERE slug=? AND status='published'", (slug,)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_papers(module_id=None):
    conn = get_conn()
    if module_id:
        rows = conn.execute("SELECT * FROM papers WHERE module_id=? ORDER BY year DESC", (module_id,)).fetchall()
    else:
        rows = conn.execute("SELECT p.*, m.title as module_title FROM papers p LEFT JOIN modules m ON p.module_id=m.id ORDER BY p.year DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def search_all(query):
    conn = get_conn()
    q = f"%{query}%"
    modules = conn.execute("SELECT 'module' as type, title, slug, description, icon, color, glow FROM modules WHERE status='published' AND (title LIKE ? OR description LIKE ? OR content LIKE ?)", (q,q,q)).fetchall()
    subtopics = conn.execute("SELECT 'subtopic' as type, s.title, s.slug, s.description, s.icon, m.color, m.glow, m.slug as module_slug, m.title as module_title FROM subtopics s JOIN modules m ON s.module_id=m.id WHERE s.status='published' AND (s.title LIKE ? OR s.description LIKE ? OR s.content LIKE ?)", (q,q,q)).fetchall()
    sims = conn.execute("SELECT 'simulation' as type, title, slug, description, '' as icon, '' as color, '' as glow FROM simulations WHERE status='published' AND (title LIKE ? OR description LIKE ?)", (q,q)).fetchall()
    phases = conn.execute("SELECT 'timeline' as type, title, slug, description, icon, color, '' as glow FROM timeline_phases WHERE status='published' AND (title LIKE ? OR description LIKE ?)", (q,q)).fetchall()
    conn.close()
    return [dict(r) for r in modules] + [dict(r) for r in subtopics] + [dict(r) for r in sims] + [dict(r) for r in phases]
