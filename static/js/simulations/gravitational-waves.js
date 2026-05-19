/* AstroVerse — Gravitational Waves Simulation */
(function () {
  'use strict';
  const canvas = document.getElementById('simCanvas');
  const wrap   = document.getElementById('simCanvasWrap');
  if (!canvas || !wrap) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000008);
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 3000);
  camera.position.set(0, 180, 300);
  camera.lookAt(0, 0, 0);

  function resize() {
    const W = wrap.clientWidth, H = wrap.clientHeight || 600;
    renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix();
  }

  let running = true, merging = false, mergeTime = 0, resetPending = false;
  let waveAmp = 1.0, freqScale = 1.0, orbitRadius = 60, orbitAngle = 0;

  /* star field */
  const sg = new THREE.BufferGeometry();
  const sp = new Float32Array(5000);
  for (let i = 0; i < sp.length; i++) sp[i] = (Math.random() - 0.5) * 3000;
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7 })));

  /* black holes */
  function makeBH(col) {
    const g = new THREE.SphereGeometry(8, 24, 24);
    const m = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const mesh = new THREE.Mesh(g, m);
    scene.add(mesh);
    /* glow ring */
    const rg = new THREE.TorusGeometry(9, 1.2, 12, 64);
    const rm = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending });
    const ring = new THREE.Mesh(rg, rm); ring.rotation.x = Math.PI / 2;
    mesh.add(ring);
    return mesh;
  }
  const bh1 = makeBH(0xff6600), bh2 = makeBH(0x0088ff);
  scene.add(new THREE.AmbientLight(0x111111));

  /* ripple rings pool */
  const MAX_RINGS = 30;
  const rings = [];
  for (let i = 0; i < MAX_RINGS; i++) {
    const rg = new THREE.TorusGeometry(1, 0.25, 8, 80);
    const rm = new THREE.MeshBasicMaterial({ color: 0x38BDF8, transparent: true, opacity: 0, wireframe: false, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(rg, rm);
    mesh.rotation.x = Math.PI / 2;
    mesh.visible = false;
    scene.add(mesh);
    rings.push({ mesh, rm, active: false, r: 0, life: 0 });
  }

  let nextRing = 0, ringTimer = 0;

  function spawnRing() {
    const ring = rings[nextRing % MAX_RINGS];
    ring.r = orbitRadius * 0.3;
    ring.life = 0;
    ring.active = true;
    ring.mesh.visible = true;
    nextRing++;
  }

  /* chirp waveform canvas overlay */
  const chirpCanvas = document.createElement('canvas');
  chirpCanvas.style.cssText = 'position:absolute;bottom:12px;left:50%;transform:translateX(-50%);width:340px;height:70px;border:1px solid rgba(56,189,248,.3);border-radius:4px;background:rgba(0,0,5,.7);pointer-events:none';
  wrap.appendChild(chirpCanvas);
  const chirpCtx = chirpCanvas.getContext('2d');
  const chirpData = new Float32Array(340).fill(0);
  let chirpIdx = 0;

  function drawChirp() {
    chirpCtx.clearRect(0, 0, 340, 70);
    chirpCtx.strokeStyle = 'rgba(56,189,248,0.15)';
    chirpCtx.lineWidth = 1;
    chirpCtx.beginPath(); chirpCtx.moveTo(0, 35); chirpCtx.lineTo(340, 35); chirpCtx.stroke();
    chirpCtx.strokeStyle = '#38BDF8';
    chirpCtx.lineWidth = 1.5;
    chirpCtx.beginPath();
    for (let i = 0; i < 340; i++) {
      const y = 35 + chirpData[(chirpIdx + i) % 340] * 28;
      i === 0 ? chirpCtx.moveTo(i, y) : chirpCtx.lineTo(i, y);
    }
    chirpCtx.stroke();
    chirpCtx.fillStyle = 'rgba(56,189,248,0.5)';
    chirpCtx.font = '9px "Share Tech Mono"';
    chirpCtx.fillText('STRAIN h(t)  — GRAVITATIONAL WAVE CHIRP', 8, 12);
  }

  /* info */
  const infoEl = document.getElementById('simInfo');
  if (infoEl) infoEl.innerHTML = `<div class="sim-info-title">〰 GRAVITATIONAL WAVES</div><div class="sim-info-text">
    Two black holes orbit each other, losing energy by emitting <b style="color:#38BDF8">gravitational waves</b> — ripples in spacetime.<br><br>
    As energy is lost, the orbit <b>shrinks</b> and the frequency <b>rises</b> — producing the characteristic "chirp" signal detected by LIGO in 2015.<br><br>
    Press <b style="color:#38BDF8">TRIGGER MERGER</b> to watch the final plunge.
  </div>`;

  /* controls */
  const ctrlEl = document.getElementById('simControls');
  if (ctrlEl) {
    ctrlEl.innerHTML = `
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">WAVE AMP <span id="gwAmpV">1.0</span></div>
        <input type="range" min="0.1" max="3" step="0.05" value="1" id="gwAmpR"/></div>
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">FREQ SCALE <span id="gwFrqV">1.0</span></div>
        <input type="range" min="0.2" max="3" step="0.05" value="1" id="gwFrqR"/></div>
      <button class="sim-btn" id="gwMerge">TRIGGER MERGER</button>
      <button class="sim-btn" id="gwReset">RESET</button>`;
    document.getElementById('gwAmpR').oninput = e => { waveAmp = +e.target.value; document.getElementById('gwAmpV').textContent = waveAmp.toFixed(1); };
    document.getElementById('gwFrqR').oninput = e => { freqScale = +e.target.value; document.getElementById('gwFrqV').textContent = freqScale.toFixed(1); };
    document.getElementById('gwMerge').onclick = () => { if (!merging) { merging = true; mergeTime = 0; } };
    document.getElementById('gwReset').onclick = () => { merging = false; mergeTime = 0; orbitRadius = 60; orbitAngle = 0; chirpData.fill(0); rings.forEach(r => { r.active = false; r.mesh.visible = false; }); };
  }

  /* camera drag */
  let isDragging = false, prevMouse = { x: 0, y: 0 }, theta = 0.3, phi = 0.75, camR = 340;
  canvas.addEventListener('mousedown', e => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; });
  window.addEventListener('mouseup', () => isDragging = false);
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    theta -= (e.clientX - prevMouse.x) * 0.005;
    phi = Math.max(0.15, Math.min(Math.PI - 0.15, phi - (e.clientY - prevMouse.y) * 0.005));
    prevMouse = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('wheel', e => { camR = Math.max(80, Math.min(600, camR + e.deltaY * 0.3)); e.preventDefault(); }, { passive: false });

  const clock = new THREE.Clock();
  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const t = clock.elapsedTime;

    if (merging) {
      mergeTime += dt;
      orbitRadius = Math.max(2, 60 - mergeTime * 14);
    }

    /* orbital speed from Kepler: ω ∝ 1/r^1.5 */
    const omega = freqScale * 0.6 / Math.pow(Math.max(orbitRadius, 2), 0.8);
    orbitAngle += omega * dt * 60;

    bh1.position.set(Math.cos(orbitAngle) * orbitRadius, 0, Math.sin(orbitAngle) * orbitRadius);
    bh2.position.set(-Math.cos(orbitAngle) * orbitRadius, 0, -Math.sin(orbitAngle) * orbitRadius);

    /* spawn ripples */
    ringTimer += dt;
    const ringInterval = Math.max(0.06, 0.35 / (freqScale * (1 + mergeTime * 0.3)));
    if (ringTimer > ringInterval) { ringTimer = 0; spawnRing(); }

    /* update rings */
    rings.forEach(ring => {
      if (!ring.active) return;
      ring.life += dt;
      ring.r += dt * (120 + mergeTime * 30);
      const alpha = Math.max(0, (1 - ring.life / 1.8) * waveAmp * 0.35);
      ring.rm.opacity = alpha;
      ring.mesh.scale.setScalar(ring.r / 1);
      if (ring.life > 1.8) { ring.active = false; ring.mesh.visible = false; }
    });

    /* chirp waveform */
    const strainAmp = waveAmp * Math.min(1, mergeTime > 0 ? mergeTime * 0.3 : 0.15);
    const strainFreq = freqScale * (1 + (mergeTime || 0) * 0.5);
    chirpData[chirpIdx % 340] = Math.sin(t * strainFreq * 8) * strainAmp;
    chirpIdx++;
    drawChirp();

    /* merge flash */
    if (merging && orbitRadius <= 3) {
      const flash = Math.max(0, 1 - (mergeTime - (60 / 14)) * 2);
      renderer.setClearColor(new THREE.Color().setRGB(flash * 0.4, flash * 0.2, flash * 0.1));
    } else {
      renderer.setClearColor(0x000008);
    }

    camera.position.x = camR * Math.sin(phi) * Math.sin(theta);
    camera.position.y = camR * Math.cos(phi);
    camera.position.z = camR * Math.sin(phi) * Math.cos(theta);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  resize(); window.addEventListener('resize', resize);
  animate();
  window._simCleanup = () => {
    running = false; renderer.dispose();
    if (chirpCanvas.parentNode) chirpCanvas.parentNode.removeChild(chirpCanvas);
    window.removeEventListener('resize', resize);
  };
})();
