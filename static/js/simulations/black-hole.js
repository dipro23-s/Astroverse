/* AstroVerse — Black Hole Simulation (Three.js r160) */
(function () {
  'use strict';

  const canvas = document.getElementById('simCanvas');
  const wrap = document.getElementById('simCanvasWrap');
  if (!canvas || !wrap) return;

  /* ── renderer ─────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000005);
  function resize() {
    const W = wrap.clientWidth, H = wrap.clientHeight || 600;
    renderer.setSize(W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }

  /* ── scene / camera ───────────────────────────── */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
  camera.position.set(0, 45, 120);
  camera.lookAt(0, 0, 0);

  /* ── state ────────────────────────────────────── */
  let mass = 1.0, spin = 0.5, brightness = 1.0, timeDilation = 1.0;
  let running = true;

  /* ── star field ───────────────────────────────── */
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(6000);
  for (let i = 0; i < starPos.length; i++) starPos[i] = (Math.random() - 0.5) * 2000;
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, sizeAttenuation: true })));

  /* ── event horizon ────────────────────────────── */
  const bhGeo = new THREE.SphereGeometry(1, 32, 32);
  const bhMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const bhMesh = new THREE.Mesh(bhGeo, bhMat);
  scene.add(bhMesh);

  /* photon-ring glow (additive ring) */
  const ringGeo = new THREE.TorusGeometry(1, 0.08, 16, 128);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0.9 });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = Math.PI / 2;
  scene.add(ringMesh);

  /* ── accretion disk particles ─────────────────── */
  const DISK_N = 8000;
  const diskGeo = new THREE.BufferGeometry();
  const dPos = new Float32Array(DISK_N * 3);
  const dCol = new Float32Array(DISK_N * 3);
  const dAngles = new Float32Array(DISK_N);
  const dRadii = new Float32Array(DISK_N);
  const dSpeeds = new Float32Array(DISK_N);

  for (let i = 0; i < DISK_N; i++) {
    const r = 2.2 + Math.pow(Math.random(), 0.5) * 14;
    const a = Math.random() * Math.PI * 2;
    dRadii[i] = r; dAngles[i] = a; dSpeeds[i] = 0.4 / (r * 0.6);
    dPos[i * 3] = Math.cos(a) * r;
    dPos[i * 3 + 1] = (Math.random() - 0.5) * 0.3;
    dPos[i * 3 + 2] = Math.sin(a) * r;
    const t = 1 - (r - 2.2) / 14;
    dCol[i * 3] = 0.9 + t * 0.1; dCol[i * 3 + 1] = 0.3 + t * 0.4; dCol[i * 3 + 2] = 0.05 + t * 0.3;
  }
  diskGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  diskGeo.setAttribute('color', new THREE.BufferAttribute(dCol, 3));
  const diskMat = new THREE.PointsMaterial({ size: 0.18, vertexColors: true, transparent: true, opacity: 0.85, sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const diskPoints = new THREE.Points(diskGeo, diskMat);
  scene.add(diskPoints);

  /* ── outer glow sprite ────────────────────────── */
  function makeSpriteCanvas(r, col) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeSpriteCanvas(64, 'rgba(255,80,0,0.25)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glowSprite.scale.set(30, 30, 1);
  scene.add(glowSprite);

  /* ── ambient light ────────────────────────────── */
  scene.add(new THREE.AmbientLight(0x111111));

  /* ── labels overlay ───────────────────────────── */
  const infoEl = document.getElementById('simInfo');
  if (infoEl) {
    infoEl.innerHTML = `
      <div class="sim-info-title">⚫ BLACK HOLE</div>
      <div class="sim-info-text">
        <b style="color:#ffaa33">Event Horizon</b> — the point of no return. Nothing, not even light, can escape.<br><br>
        <b style="color:#ff6600">Photon Sphere</b> — photons orbit the black hole here (1.5× Schwarzschild radius).<br><br>
        <b style="color:#ff4400">Accretion Disk</b> — superheated matter spiraling inward, glowing from friction.<br><br>
        <b style="color:#38BDF8">Hawking Radiation</b> — quantum effect: black holes slowly evaporate over vast timescales.
      </div>`;
  }

  /* ── controls panel ───────────────────────────── */
  const ctrlEl = document.getElementById('simControls');
  if (ctrlEl) {
    ctrlEl.innerHTML = `
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">MASS <span id="bhMV">1.0 M☉</span></div>
        <input type="range" min="0.3" max="5" step="0.1" value="1" id="bhM"/></div>
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">SPIN <span id="bhSV">0.5</span></div>
        <input type="range" min="0" max="1" step="0.01" value="0.5" id="bhS"/></div>
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">DISK BRIGHTNESS <span id="bhBV">1.0</span></div>
        <input type="range" min="0.1" max="2" step="0.05" value="1" id="bhB"/></div>
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">TIME DILATION <span id="bhTV">1.0×</span></div>
        <input type="range" min="0" max="2" step="0.05" value="1" id="bhT"/></div>
      <button class="sim-btn" id="bhReset">RESET</button>`;

    document.getElementById('bhM').oninput = e => { mass = +e.target.value; document.getElementById('bhMV').textContent = mass.toFixed(1) + ' M☉'; };
    document.getElementById('bhS').oninput = e => { spin = +e.target.value; document.getElementById('bhSV').textContent = spin.toFixed(2); };
    document.getElementById('bhB').oninput = e => { brightness = +e.target.value; document.getElementById('bhBV').textContent = brightness.toFixed(1); };
    document.getElementById('bhT').oninput = e => { timeDilation = +e.target.value; document.getElementById('bhTV').textContent = timeDilation.toFixed(1) + '×'; };
    document.getElementById('bhReset').onclick = () => { mass = 1; spin = 0.5; brightness = 1; timeDilation = 1; document.getElementById('bhM').value = 1; document.getElementById('bhS').value = 0.5; document.getElementById('bhB').value = 1; document.getElementById('bhT').value = 1; document.getElementById('bhMV').textContent = '1.0 M☉'; document.getElementById('bhSV').textContent = '0.50'; document.getElementById('bhBV').textContent = '1.0'; document.getElementById('bhTV').textContent = '1.0×'; };
  }

  /* ── orbit controls (mouse drag) ─────────────────*/
  let isDragging = false, prevMouse = { x: 0, y: 0 };
  let theta = 0.3, phi = 0.4, camRadius = 120;
  canvas.addEventListener('mousedown', e => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; });
  window.addEventListener('mouseup', () => isDragging = false);
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    theta -= (e.clientX - prevMouse.x) * 0.005;
    phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi - (e.clientY - prevMouse.y) * 0.005));
    prevMouse = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('wheel', e => { camRadius = Math.max(30, Math.min(300, camRadius + e.deltaY * 0.2)); e.preventDefault(); }, { passive: false });

  /* ── animate ──────────────────────────────────── */
  let t = 0;
  const clock = new THREE.Clock();
  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    const dt = clock.getDelta() * timeDilation;
    t += dt;

    const r = 8 * mass;
    bhMesh.scale.setScalar(r);
    ringMesh.scale.setScalar(r * 1.5);
    glowSprite.scale.set(r * 18, r * 18, 1);

    diskMat.opacity = Math.min(0.95, brightness * 0.85);
    const dpa = diskGeo.attributes.position;
    for (let i = 0; i < DISK_N; i++) {
      dAngles[i] += dSpeeds[i] * dt * (0.5 + spin * 0.8);
      dpa.array[i * 3] = Math.cos(dAngles[i]) * dRadii[i];
      dpa.array[i * 3 + 2] = Math.sin(dAngles[i]) * dRadii[i];
    }
    dpa.needsUpdate = true;

    /* camera orbit */
    camera.position.x = camRadius * Math.sin(phi) * Math.sin(theta);
    camera.position.y = camRadius * Math.cos(phi);
    camera.position.z = camRadius * Math.sin(phi) * Math.cos(theta);
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  resize();
  window.addEventListener('resize', resize);
  animate();
  window._simCleanup = () => { running = false; renderer.dispose(); window.removeEventListener('resize', resize); };
})();
