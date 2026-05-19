/* AstroVerse — Spacetime Curvature (Canvas 2D) */
(function () {
  'use strict';
  const wrap = document.getElementById('simCanvasWrap');
  if (!wrap) return;

  /* Replace the WebGL canvas with a 2D canvas */
  const oldCanvas = document.getElementById('simCanvas');
  const canvas = document.createElement('canvas');
  canvas.id = 'simCanvas2D';
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;cursor:crosshair';
  if (oldCanvas) oldCanvas.style.display = 'none';
  wrap.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let W, H;
  function resize() {
    W = canvas.width = wrap.clientWidth;
    H = canvas.height = wrap.clientHeight || 600;
  }
  resize(); window.addEventListener('resize', resize);

  let running = true;
  let gravStrength = 1.0;
  const masses = [];
  const particles = []; // test particles (geodesic tracers)
  const GRID = 32; // grid spacing

  /* ── masses ─────────────────────────────────────── */
  function addMass(x, y, m) {
    masses.push({ x, y, m, dragging: false });
  }
  addMass(W / 2, H / 2, 5);

  /* ── test particles ──────────────────────────────── */
  function addParticle(x, y) {
    const dx = (Math.random() - 0.5) * 120;
    const dy = (Math.random() - 0.5) * 120;
    particles.push({ x, y, vx: -dy * 0.015, vy: dx * 0.015, trail: [], age: 0 });
  }

  /* ── displacement at a grid point ───────────────── */
  function displace(px, py) {
    let dx = 0, dy = 0;
    masses.forEach(m => {
      const d = Math.max(Math.hypot(px - m.x, py - m.y), 12);
      const force = gravStrength * m.m * 600 / (d * d);
      const ang = Math.atan2(m.y - py, m.x - px);
      dx += Math.cos(ang) * force;
      dy += Math.sin(ang) * force;
    });
    return [Math.max(0, Math.min(W, px + dx)), Math.max(0, Math.min(H, py + dy))];
  }

  /* ── draw grid ───────────────────────────────────── */
  function drawGrid() {
    const cols = Math.ceil(W / GRID) + 1;
    const rows = Math.ceil(H / GRID) + 1;
    ctx.lineWidth = 0.7;

    for (let j = 0; j < rows; j++) {
      ctx.beginPath();
      for (let i = 0; i <= cols; i++) {
        const [x, y] = displace(i * GRID, j * GRID);
        const stress = Math.min(1, Math.hypot(x - i * GRID, y - j * GRID) / 60);
        const r = Math.round(56 + stress * 140);
        const g = Math.round(189 - stress * 100);
        const b = Math.round(248 - stress * 100);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.12 + stress * 0.4})`;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < cols; i++) {
      ctx.beginPath();
      for (let j = 0; j <= rows; j++) {
        const [x, y] = displace(i * GRID, j * GRID);
        const stress = Math.min(1, Math.hypot(x - i * GRID, y - j * GRID) / 60);
        const r = Math.round(56 + stress * 140);
        const g = Math.round(189 - stress * 100);
        const b = Math.round(248 - stress * 100);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.12 + stress * 0.4})`;
        j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  /* ── draw masses ─────────────────────────────────── */
  function drawMasses() {
    masses.forEach((m, i) => {
      const r = m.m * 5;
      const grd = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r * 2.5);
      grd.addColorStop(0, 'rgba(255,200,80,0.9)');
      grd.addColorStop(0.4, 'rgba(255,120,20,0.4)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(m.x, m.y, r * 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(m.x, m.y, r * 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(56,189,248,0.8)';
      ctx.font = '10px "Share Tech Mono"';
      ctx.fillText(`M${i + 1}=${m.m}`, m.x + r + 4, m.y - r);
    });
  }

  /* ── update & draw test particles ───────────────── */
  function updateParticles(dt) {
    for (let k = particles.length - 1; k >= 0; k--) {
      const p = particles[k];
      p.age += dt;
      if (p.age > 15) { particles.splice(k, 1); continue; }

      let ax = 0, ay = 0;
      masses.forEach(m => {
        const dx = m.x - p.x, dy = m.y - p.y;
        const d2 = Math.max(dx * dx + dy * dy, 100);
        const f = gravStrength * m.m * 800 / d2;
        ax += (dx / Math.sqrt(d2)) * f; ay += (dy / Math.sqrt(d2)) * f;
      });
      p.vx += ax * dt; p.vy += ay * dt;
      const spd = Math.hypot(p.vx, p.vy);
      if (spd > 400) { p.vx *= 400 / spd; p.vy *= 400 / spd; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 80) p.trail.shift();

      /* draw trail */
      if (p.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        p.trail.forEach(pt => ctx.lineTo(pt.x, pt.y));
        const fade = Math.max(0, 1 - p.age / 15);
        ctx.strokeStyle = `rgba(74,222,128,${fade * 0.6})`; ctx.lineWidth = 1.5; ctx.stroke();
      }
      ctx.fillStyle = '#4ADE80'; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* ── instructions overlay ────────────────────────── */
  function drawInstructions() {
    ctx.fillStyle = 'rgba(56,189,248,0.5)';
    ctx.font = '10px "Share Tech Mono"';
    ctx.fillText('CLICK — add mass  |  DOUBLE-CLICK — launch test particle  |  DRAG — move mass', 12, H - 12);
  }

  /* info */
  const infoEl = document.getElementById('simInfo');
  if (infoEl) infoEl.innerHTML = `<div class="sim-info-title">🕸 SPACETIME CURVATURE</div><div class="sim-info-text">
    Mass bends the <b style="color:#38BDF8">fabric of spacetime</b>. Other objects follow these curves — what we call gravity.<br><br>
    <b>Click</b> to add a mass. <b>Double-click</b> to launch a test particle along a geodesic (curved path).<br><br>
    <b>Drag</b> existing masses to reshape the curvature in real time.<br><br>
    <i style="color:#94A3B8">Einstein: "Matter tells spacetime how to curve; spacetime tells matter how to move."</i>
  </div>`;

  /* controls */
  const ctrlEl = document.getElementById('simControls');
  if (ctrlEl) {
    ctrlEl.innerHTML = `
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">MASS SIZE <span id="stMassV">5</span></div>
        <input type="range" min="1" max="15" step="0.5" value="5" id="stMass"/></div>
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">GRAVITY <span id="stGravV">1.0</span></div>
        <input type="range" min="0.1" max="3" step="0.05" value="1" id="stGrav"/></div>
      <button class="sim-btn" id="stClearM">CLEAR MASSES</button>
      <button class="sim-btn" id="stClearP">CLEAR PARTICLES</button>
      <button class="sim-btn" id="stReset">RESET ALL</button>`;

    let newMassVal = 5;
    document.getElementById('stMass').oninput = e => { newMassVal = +e.target.value; document.getElementById('stMassV').textContent = newMassVal.toFixed(1); };
    document.getElementById('stGrav').oninput = e => { gravStrength = +e.target.value; document.getElementById('stGravV').textContent = gravStrength.toFixed(1); };
    document.getElementById('stClearM').onclick = () => { masses.length = 0; };
    document.getElementById('stClearP').onclick = () => { particles.length = 0; };
    document.getElementById('stReset').onclick = () => {
      masses.length = 0; particles.length = 0;
      addMass(W / 2, H / 2, 5); gravStrength = 1;
      document.getElementById('stGrav').value = 1;
    };

    /* click / drag / dblclick */
    let draggingMass = null, lastClick = 0;
    canvas.addEventListener('mousedown', e => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      draggingMass = masses.find(m => Math.hypot(mx - m.x, my - m.y) < m.m * 6 + 8) || null;
      if (!draggingMass) {
        const now = Date.now();
        if (now - lastClick < 350) { addParticle(mx, my); }
        else { addMass(mx, my, newMassVal); }
        lastClick = now;
      }
    });
    canvas.addEventListener('mousemove', e => {
      if (!draggingMass) return;
      const rect = canvas.getBoundingClientRect();
      draggingMass.x = e.clientX - rect.left;
      draggingMass.y = e.clientY - rect.top;
    });
    canvas.addEventListener('mouseup', () => { draggingMass = null; });
  }

  let lastTime = performance.now();
  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    ctx.fillStyle = 'rgba(0,0,8,0.92)';
    ctx.fillRect(0, 0, W, H);

    drawGrid();
    updateParticles(dt);
    drawMasses();
    drawInstructions();
  }

  animate();
  window._simCleanup = () => {
    running = false;
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    window.removeEventListener('resize', resize);
  };
})();
