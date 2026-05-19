/* AstroVerse — Solar System Simulation (Three.js) */
(function () {
  'use strict';
  const canvas = document.getElementById('simCanvas');
  const wrap = document.getElementById('simCanvasWrap');
  if (!canvas || !wrap) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000008);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 10000);
  camera.position.set(0, 180, 320);
  camera.lookAt(0, 0, 0);

  function resize() {
    const W = wrap.clientWidth, H = wrap.clientHeight || 600;
    renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix();
  }

  /* state */
  let speed = 1, showLabels = true, showOrbits = true, running = true;
  let isDragging = false, prevMouse = { x: 0, y: 0 };
  let theta = 0.3, phi = 0.9, camR = 380, focusPlanet = null, flyT = 0;

  /* star field */
  const sg = new THREE.BufferGeometry();
  const sp = new Float32Array(9000);
  for (let i = 0; i < sp.length; i++) sp[i] = (Math.random() - 0.5) * 8000;
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.8 })));

  /* sun */
  const sunG = new THREE.SphereGeometry(18, 32, 32);
  const sunM = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
  const sun = new THREE.Mesh(sunG, sunM);
  scene.add(sun);
  const sunGlow = new THREE.PointLight(0xFFD060, 2.5, 2000);
  scene.add(sunGlow);

  /* sun sprite */
  function makeGlow(col, size) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlow('rgba(255,200,50,0.6)', 64), blending: THREE.AdditiveBlending, depthWrite: false }));
  sunSprite.scale.set(80, 80, 1); scene.add(sunSprite);

  /* planet data */
  const PLANETS = [
    { name: 'Mercury', r: 2.5,  dist: 45,  color: 0xAAAAAA, period: 0.24, tilt: 0,   fact: 'Diameter: 4,879 km · No atmosphere · -180°C to 430°C' },
    { name: 'Venus',   r: 5.5,  dist: 72,  color: 0xE8C870, period: 0.62, tilt: 177, fact: 'Diameter: 12,104 km · Hottest planet at 465°C · 243 day rotation' },
    { name: 'Earth',   r: 5.8,  dist: 100, color: 0x4488FF, period: 1.00, tilt: 23,  fact: 'Diameter: 12,742 km · Only known life · 1 moon' },
    { name: 'Mars',    r: 3.8,  dist: 135, color: 0xDD4422, period: 1.88, tilt: 25,  fact: 'Diameter: 6,779 km · Olympus Mons 22 km tall · 2 moons' },
    { name: 'Jupiter', r: 14,   dist: 200, color: 0xC08860, period: 11.9, tilt: 3,   fact: 'Diameter: 139,820 km · 95 known moons · Great Red Spot' },
    { name: 'Saturn',  r: 12,   dist: 268, color: 0xE8D090, period: 29.5, tilt: 27,  fact: 'Diameter: 116,460 km · Rings of ice & rock · 146 moons' },
    { name: 'Uranus',  r: 8.5,  dist: 330, color: 0x7ECBD4, period: 84,   tilt: 98,  fact: 'Diameter: 50,724 km · Rotates on its side · -224°C' },
    { name: 'Neptune', r: 8,    dist: 390, color: 0x4060E0, period: 165,  tilt: 28,  fact: 'Diameter: 49,244 km · Strongest winds 2,100 km/h · 16 moons' },
  ];

  const planetMeshes = [], orbitLines = [], labelDivs = [];
  const planetAngles = PLANETS.map(() => Math.random() * Math.PI * 2);

  /* orbit lines */
  PLANETS.forEach(p => {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * p.dist, 0, Math.sin(a) * p.dist));
    }
    const ol = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0x224466, transparent: true, opacity: 0.5 })
    );
    scene.add(ol); orbitLines.push(ol);
  });

  /* planets */
  const ambLight = new THREE.AmbientLight(0x111111); scene.add(ambLight);
  PLANETS.forEach((p, i) => {
    const geo = new THREE.SphereGeometry(p.r, 24, 24);
    const mat = new THREE.MeshLambertMaterial({ color: p.color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = { planet: p, idx: i };
    scene.add(mesh); planetMeshes.push(mesh);

    /* Saturn rings */
    if (p.name === 'Saturn') {
      const rg = new THREE.TorusGeometry(p.r * 2, p.r * 0.6, 4, 64);
      const rm = new THREE.MeshBasicMaterial({ color: 0xD4B870, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(rg, rm);
      ring.rotation.x = Math.PI / 2.5;
      mesh.add(ring);
    }

    /* Earth moon */
    if (p.name === 'Earth') {
      const mg = new THREE.SphereGeometry(1.4, 12, 12);
      const mm = new THREE.MeshLambertMaterial({ color: 0xAAAAAA });
      const moon = new THREE.Mesh(mg, mm);
      moon.userData.isMoon = true;
      mesh.add(moon); mesh.userData.moon = moon;
    }

    /* label */
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;font-family:"Share Tech Mono",monospace;font-size:11px;color:#94A3B8;pointer-events:none;white-space:nowrap;text-shadow:0 0 6px #000';
    d.textContent = p.name.toUpperCase();
    wrap.appendChild(d); labelDivs.push(d);
  });

  /* info panel */
  const infoEl = document.getElementById('simInfo');
  if (infoEl) infoEl.innerHTML = `<div class="sim-info-title">🌌 SOLAR SYSTEM</div><div class="sim-info-text" id="ssInfoText">Click any planet to learn about it.<br><br>Drag to rotate · Scroll to zoom · Click planet to focus camera.</div>`;

  /* controls */
  const ctrlEl = document.getElementById('simControls');
  if (ctrlEl) {
    ctrlEl.innerHTML = `
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">SPEED <span id="ssSpV">1.0×</span></div>
        <input type="range" min="0" max="5" step="0.1" value="1" id="ssSp"/></div>
      <button class="sim-btn" id="ssLbl">LABELS: ON</button>
      <button class="sim-btn" id="ssOrb">ORBITS: ON</button>
      <button class="sim-btn" id="ssRst">RESET VIEW</button>`;
    document.getElementById('ssSp').oninput = e => { speed = +e.target.value; document.getElementById('ssSpV').textContent = speed.toFixed(1) + '×'; };
    document.getElementById('ssLbl').onclick = e => { showLabels = !showLabels; e.target.textContent = 'LABELS: ' + (showLabels ? 'ON' : 'OFF'); labelDivs.forEach(d => d.style.display = showLabels ? '' : 'none'); };
    document.getElementById('ssOrb').onclick = e => { showOrbits = !showOrbits; e.target.textContent = 'ORBITS: ' + (showOrbits ? 'ON' : 'OFF'); orbitLines.forEach(l => l.visible = showOrbits); };
    document.getElementById('ssRst').onclick = () => { theta = 0.3; phi = 0.9; camR = 380; focusPlanet = null; };
  }

  /* click to focus */
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(planetMeshes);
    if (hits.length) {
      const p = hits[0].object.userData.planet;
      focusPlanet = hits[0].object;
      flyT = 0;
      if (infoEl) document.getElementById('ssInfoText').innerHTML = `<b style="color:#38BDF8">${p.name.toUpperCase()}</b><br><br>${p.fact}<br><br>Orbital Period: ${p.period} Earth years`;
    }
  });

  /* mouse orbit */
  canvas.addEventListener('mousedown', e => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; });
  window.addEventListener('mouseup', () => isDragging = false);
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    theta -= (e.clientX - prevMouse.x) * 0.005;
    phi = Math.max(0.15, Math.min(Math.PI - 0.15, phi - (e.clientY - prevMouse.y) * 0.005));
    prevMouse = { x: e.clientX, y: e.clientY };
    focusPlanet = null;
  });
  canvas.addEventListener('wheel', e => { camR = Math.max(50, Math.min(800, camR + e.deltaY * 0.4)); e.preventDefault(); }, { passive: false });

  /* project 3D → 2D */
  function toScreen(pos) {
    const v = pos.clone().project(camera);
    return { x: (v.x * 0.5 + 0.5) * wrap.clientWidth, y: (-v.y * 0.5 + 0.5) * wrap.clientHeight, behind: v.z > 1 };
  }

  const clock = new THREE.Clock();
  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    const dt = clock.getDelta();

    PLANETS.forEach((p, i) => {
      /* Kepler: angular speed ∝ 1/period */
      planetAngles[i] += (speed * dt * 0.4) / p.period;
      const x = Math.cos(planetAngles[i]) * p.dist;
      const z = Math.sin(planetAngles[i]) * p.dist;
      planetMeshes[i].position.set(x, 0, z);

      /* moon */
      if (p.name === 'Earth' && planetMeshes[i].userData.moon) {
        const mt = Date.now() * 0.001 * speed;
        planetMeshes[i].userData.moon.position.set(Math.cos(mt * 1.5) * 12, 0, Math.sin(mt * 1.5) * 12);
      }

      /* label position */
      if (showLabels) {
        const sc = toScreen(planetMeshes[i].position);
        labelDivs[i].style.left = (sc.x + p.r + 4) + 'px';
        labelDivs[i].style.top = (sc.y - 6) + 'px';
        labelDivs[i].style.display = sc.behind ? 'none' : '';
      }
    });

    /* camera */
    if (focusPlanet) {
      flyT = Math.min(flyT + dt * 0.8, 1);
      const target = focusPlanet.position.clone();
      const targetCam = target.clone().add(new THREE.Vector3(0, focusPlanet.userData.planet.r * 5, focusPlanet.userData.planet.r * 10));
      camera.position.lerp(targetCam, flyT * 0.05);
      camera.lookAt(target);
    } else {
      camera.position.x = camR * Math.sin(phi) * Math.sin(theta);
      camera.position.y = camR * Math.cos(phi);
      camera.position.z = camR * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(0, 0, 0);
    }

    renderer.render(scene, camera);
  }

  resize(); window.addEventListener('resize', resize);
  animate();
  window._simCleanup = () => {
    running = false; renderer.dispose();
    labelDivs.forEach(d => { if (d.parentNode) d.parentNode.removeChild(d); });
    window.removeEventListener('resize', resize);
  };
})();
