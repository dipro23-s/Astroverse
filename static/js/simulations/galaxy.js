/* AstroVerse — Galaxy Formation Simulation */
(function () {
  'use strict';
  const canvas = document.getElementById('simCanvas');
  const wrap = document.getElementById('simCanvasWrap');
  if (!canvas || !wrap) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000005);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 5000);
  camera.position.set(0, 220, 380);
  camera.lookAt(0, 0, 0);

  function resize() {
    const W = wrap.clientWidth, H = wrap.clientHeight || 600;
    renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix();
  }

  let running = true, rotSpeed = 0.3, dmOpacity = 0.12, andromedaMode = false;
  let andromedaX = 0, andromedaStarted = false;

  /* ── build spiral galaxy ─────────────────────────── */
  function buildGalaxy(N, arms, spread, scaleXZ, scaleY, colFn) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const angles = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      const arm = i % arms;
      const frac = i / N;
      const r = 5 + frac * 200 * scaleXZ;
      const a = arm * (Math.PI * 2 / arms) + frac * Math.PI * 4 + (Math.random() - 0.5) * spread;
      angles[i] = a;
      pos[i * 3]     = Math.cos(a) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 8 * scaleY * (1 - frac * 0.8);
      pos[i * 3 + 2] = Math.sin(a) * r;
      const c = colFn(frac, arm);
      col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return { geo, angles };
  }

  const MW_N = 18000;
  const mw = buildGalaxy(MW_N, 4, 0.5, 1, 1, (frac, arm) => {
    const inner = 1 - frac;
    return arm < 2
      ? [0.8 + inner * 0.2, 0.6 + inner * 0.2, 0.3 + inner * 0.1]
      : [0.4 + inner * 0.2, 0.5 + inner * 0.2, 0.8 + frac * 0.2];
  });

  const mwMat = new THREE.PointsMaterial({ size: 0.9, vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  const mwPoints = new THREE.Points(mw.geo, mwMat);
  scene.add(mwPoints);

  /* core bulge */
  const coreN = 2000;
  const coreGeo = new THREE.BufferGeometry();
  const corePos = new Float32Array(coreN * 3);
  for (let i = 0; i < coreN; i++) {
    const r = Math.random() * 20, a = Math.random() * Math.PI * 2, b = (Math.random() - 0.5) * Math.PI;
    corePos[i * 3] = Math.cos(a) * Math.cos(b) * r;
    corePos[i * 3 + 1] = Math.sin(b) * r * 0.4;
    corePos[i * 3 + 2] = Math.sin(a) * Math.cos(b) * r;
  }
  coreGeo.setAttribute('position', new THREE.BufferAttribute(corePos, 3));
  scene.add(new THREE.Points(coreGeo, new THREE.PointsMaterial({ color: 0xFFEEBB, size: 1.2, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })));

  /* dark matter halo */
  const dmN = 3000;
  const dmGeo = new THREE.BufferGeometry();
  const dmPos = new Float32Array(dmN * 3);
  for (let i = 0; i < dmN; i++) {
    const r = 180 + Math.random() * 120, a = Math.random() * Math.PI * 2, b = (Math.random() - 0.5) * Math.PI;
    dmPos[i * 3] = Math.cos(a) * Math.cos(b) * r;
    dmPos[i * 3 + 1] = Math.sin(b) * r;
    dmPos[i * 3 + 2] = Math.sin(a) * Math.cos(b) * r;
  }
  dmGeo.setAttribute('position', new THREE.BufferAttribute(dmPos, 3));
  const dmMat = new THREE.PointsMaterial({ color: 0x8866FF, size: 1.2, transparent: true, opacity: dmOpacity, blending: THREE.AdditiveBlending, depthWrite: false });
  scene.add(new THREE.Points(dmGeo, dmMat));

  /* Andromeda galaxy */
  const AND_N = 8000;
  const and = buildGalaxy(AND_N, 2, 0.7, 0.65, 0.65, (frac) => [0.4 + frac * 0.3, 0.5 + frac * 0.2, 0.9]);
  const andMat = new THREE.PointsMaterial({ size: 0.8, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const andPoints = new THREE.Points(and.geo, andMat);
  andPoints.rotation.z = 0.6;
  scene.add(andPoints);

  /* label */
  const andLabel = document.createElement('div');
  andLabel.style.cssText = 'position:absolute;font-family:"Share Tech Mono",monospace;font-size:11px;color:#8899FF;pointer-events:none;display:none';
  andLabel.textContent = 'ANDROMEDA GALAXY';
  wrap.appendChild(andLabel);

  /* info */
  const infoEl = document.getElementById('simInfo');
  if (infoEl) infoEl.innerHTML = `<div class="sim-info-title">🌀 GALAXY SIMULATION</div><div class="sim-info-text">
    Our <b style="color:#FFD700">Milky Way</b> is a barred spiral galaxy of ~200 billion stars.<br><br>
    The faint purple halo represents <b style="color:#A855F7">dark matter</b> — invisible but detected through gravity.<br><br>
    Stars in the outer disk orbit surprisingly fast, proving dark matter must exist.<br><br>
    Toggle <b style="color:#38BDF8">Andromeda Collision</b> to simulate the merger in 4.5 billion years.
  </div>`;

  /* controls */
  const ctrlEl = document.getElementById('simControls');
  if (ctrlEl) {
    ctrlEl.innerHTML = `
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">ROTATION SPEED <span id="galRV">0.3</span></div>
        <input type="range" min="0" max="2" step="0.05" value="0.3" id="galR"/></div>
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">DARK MATTER <span id="galDV">0.12</span></div>
        <input type="range" min="0" max="0.6" step="0.01" value="0.12" id="galD"/></div>
      <button class="sim-btn" id="galAnd">ANDROMEDA COLLISION: OFF</button>
      <button class="sim-btn" id="galRst">RESET</button>`;

    document.getElementById('galR').oninput = e => { rotSpeed = +e.target.value; document.getElementById('galRV').textContent = rotSpeed.toFixed(2); };
    document.getElementById('galD').oninput = e => { dmOpacity = +e.target.value; dmMat.opacity = dmOpacity; document.getElementById('galDV').textContent = dmOpacity.toFixed(2); };
    document.getElementById('galAnd').onclick = e => {
      andromedaMode = !andromedaMode;
      andromedaX = andromedaMode ? 800 : 0;
      andromedaStarted = andromedaMode;
      andMat.opacity = andromedaMode ? 0.7 : 0;
      andLabel.style.display = andromedaMode ? '' : 'none';
      e.target.textContent = 'ANDROMEDA COLLISION: ' + (andromedaMode ? 'ON' : 'OFF');
    };
    document.getElementById('galRst').onclick = () => {
      andromedaMode = false; andromedaX = 0; andromedaStarted = false;
      andMat.opacity = 0; andLabel.style.display = 'none';
      document.getElementById('galAnd').textContent = 'ANDROMEDA COLLISION: OFF';
      andPoints.position.x = 0;
    };
  }

  /* camera drag */
  let isDragging = false, prevMouse = { x: 0, y: 0 }, theta = 0.3, phi = 0.7, camRad = 420;
  canvas.addEventListener('mousedown', e => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; });
  window.addEventListener('mouseup', () => isDragging = false);
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    theta -= (e.clientX - prevMouse.x) * 0.005;
    phi = Math.max(0.15, Math.min(Math.PI - 0.15, phi - (e.clientY - prevMouse.y) * 0.005));
    prevMouse = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('wheel', e => { camRad = Math.max(100, Math.min(900, camRad + e.deltaY * 0.5)); e.preventDefault(); }, { passive: false });

  function toScreen(pos) {
    const v = pos.clone().project(camera);
    return { x: (v.x * 0.5 + 0.5) * wrap.clientWidth, y: (-v.y * 0.5 + 0.5) * wrap.clientHeight, behind: v.z > 1 };
  }

  const clock = new THREE.Clock();
  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    /* rotate MW */
    mwPoints.rotation.y += rotSpeed * dt * 0.15;

    /* Andromeda approach */
    if (andromedaMode && andromedaX > -100) {
      andromedaX -= dt * 30;
      andPoints.position.x = andromedaX;
      andPoints.position.z = andromedaX * 0.3;
      const sc = toScreen(andPoints.position);
      if (!sc.behind) { andLabel.style.left = sc.x + 'px'; andLabel.style.top = (sc.y - 20) + 'px'; }
      /* tidal mixing when close */
      if (andromedaX < 200) {
        andMat.opacity = Math.min(0.7, andMat.opacity + dt * 0.1);
      }
    }

    camera.position.x = camRad * Math.sin(phi) * Math.sin(theta);
    camera.position.y = camRad * Math.cos(phi);
    camera.position.z = camRad * Math.sin(phi) * Math.cos(theta);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  resize(); window.addEventListener('resize', resize);
  animate();
  window._simCleanup = () => {
    running = false; renderer.dispose();
    [andLabel].forEach(el => { if (el.parentNode) el.parentNode.removeChild(el); });
    window.removeEventListener('resize', resize);
  };
})();
