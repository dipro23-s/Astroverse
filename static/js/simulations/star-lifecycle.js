/* AstroVerse — Star Lifecycle Simulation */
(function () {
  'use strict';
  const canvas = document.getElementById('simCanvas');
  const wrap = document.getElementById('simCanvasWrap');
  if (!canvas || !wrap) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000008);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 3000);
  camera.position.set(0, 60, 180);
  camera.lookAt(0, 0, 0);

  function resize() {
    const W = wrap.clientWidth, H = wrap.clientHeight || 600;
    renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix();
  }

  let running = true, starMass = 1.0, stageIdx = 0, stageTime = 0, autoAdvance = false;

  const STAGES = [
    { name: 'NEBULA',        color: 0x6688CC, size: 55, desc: 'A cloud of gas and dust collapses under gravity to form a new star.',  minMass: 0 },
    { name: 'PROTOSTAR',     color: 0xFF8833, size: 22, desc: 'The contracting core heats up. Fusion has not yet begun.',              minMass: 0 },
    { name: 'MAIN SEQUENCE', color: 0xFFDD44, size: 18, desc: 'Hydrogen fuses into helium in the core — this can last billions of years.', minMass: 0 },
    { name: 'RED GIANT',     color: 0xFF4400, size: 50, desc: 'The outer layers expand as helium fusion begins in the shell.',         minMass: 0 },
    { name: 'SUPERNOVA',     color: 0xFFFFFF, size: 90, desc: 'Massive stars explode, scattering elements across the galaxy.',          minMass: 8 },
    { name: 'WHITE DWARF',   color: 0xAADDFF, size: 8,  desc: 'Low-mass stars leave a hot, Earth-sized remnant that slowly cools.',    minMass: 0 },
    { name: 'NEUTRON STAR',  color: 0x8866FF, size: 5,  desc: 'A city-sized sphere of neutrons spinning hundreds of times per second.', minMass: 8 },
    { name: 'BLACK HOLE',    color: 0x111111, size: 4,  desc: 'For the most massive stars: gravity crushes everything to a singularity.', minMass: 20 },
  ];

  /* star field */
  const sg = new THREE.BufferGeometry();
  const sp = new Float32Array(6000);
  for (let i = 0; i < sp.length; i++) sp[i] = (Math.random() - 0.5) * 2000;
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.6 })));

  /* nebula particles */
  const NEB_N = 3000;
  const nebGeo = new THREE.BufferGeometry();
  const nebPos = new Float32Array(NEB_N * 3);
  for (let i = 0; i < NEB_N; i++) {
    const r = 40 + Math.random() * 60, a = Math.random() * Math.PI * 2, b = (Math.random() - 0.5) * Math.PI;
    nebPos[i * 3] = Math.cos(a) * Math.cos(b) * r;
    nebPos[i * 3 + 1] = Math.sin(b) * r * 0.5;
    nebPos[i * 3 + 2] = Math.sin(a) * Math.cos(b) * r;
  }
  nebGeo.setAttribute('position', new THREE.BufferAttribute(nebPos, 3));
  const nebMat = new THREE.PointsMaterial({ color: 0x6688BB, size: 1.2, transparent: true, opacity: 0.6, sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const nebPoints = new THREE.Points(nebGeo, nebMat);
  scene.add(nebPoints);

  /* main star sphere */
  const starGeo = new THREE.SphereGeometry(1, 32, 32);
  const starMat = new THREE.MeshBasicMaterial({ color: 0xFFDD44 });
  const starMesh = new THREE.Mesh(starGeo, starMat);
  scene.add(starMesh);

  /* corona particles */
  const COR_N = 500;
  const corGeo = new THREE.BufferGeometry();
  const corPos = new Float32Array(COR_N * 3);
  const corAngles = new Float32Array(COR_N);
  const corRadii = new Float32Array(COR_N);
  for (let i = 0; i < COR_N; i++) {
    corAngles[i] = Math.random() * Math.PI * 2;
    corRadii[i] = 1 + Math.random() * 0.6;
  }
  corGeo.setAttribute('position', new THREE.BufferAttribute(corPos, 3));
  const corMat = new THREE.PointsMaterial({ color: 0xFFAA33, size: 1.5, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  const corPoints = new THREE.Points(corGeo, corMat);
  scene.add(corPoints);

  /* glow sprite */
  function makeGlow(col) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlow('rgba(255,180,50,0.5)'), blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(glowSprite);

  /* supernova explosion particles */
  const SN_N = 1200;
  const snGeo = new THREE.BufferGeometry();
  const snPos = new Float32Array(SN_N * 3);
  const snVel = [];
  for (let i = 0; i < SN_N; i++) {
    const a = Math.random() * Math.PI * 2, b = (Math.random() - 0.5) * Math.PI;
    const spd = 30 + Math.random() * 80;
    snVel.push(new THREE.Vector3(Math.cos(a) * Math.cos(b) * spd, Math.sin(b) * spd, Math.sin(a) * Math.cos(b) * spd));
    snPos[i * 3] = snPos[i * 3 + 1] = snPos[i * 3 + 2] = 0;
  }
  snGeo.setAttribute('position', new THREE.BufferAttribute(snPos, 3));
  const snMat = new THREE.PointsMaterial({ color: 0xFFAA33, size: 1.5, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const snPoints = new THREE.Points(snGeo, snMat);
  scene.add(snPoints);

  /* BH event horizon ring (only for black hole stage) */
  const bhRing = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.15, 12, 64),
    new THREE.MeshBasicMaterial({ color: 0xFF6600, transparent: true, opacity: 0, blending: THREE.AdditiveBlending })
  );
  bhRing.rotation.x = Math.PI / 2; scene.add(bhRing);

  /* progress bar canvas */
  const pbCanvas = document.createElement('canvas');
  pbCanvas.style.cssText = 'position:absolute;top:12px;left:50%;transform:translateX(-50%);width:380px;height:50px;pointer-events:none';
  wrap.appendChild(pbCanvas);
  const pbCtx = pbCanvas.getContext('2d');

  function drawProgressBar() {
    pbCtx.clearRect(0, 0, 380, 50);
    const stages = getStagesForMass();
    const w = 370 / stages.length;
    stages.forEach((s, i) => {
      const x = 5 + i * w;
      pbCtx.fillStyle = i < stageIdx ? '#38BDF8' : i === stageIdx ? '#A855F7' : 'rgba(255,255,255,0.1)';
      pbCtx.fillRect(x, 22, w - 3, 10);
      pbCtx.fillStyle = i === stageIdx ? '#ffffff' : 'rgba(148,163,184,0.7)';
      pbCtx.font = '8px "Share Tech Mono"';
      pbCtx.textAlign = 'center';
      pbCtx.fillText(s.name.split(' ')[0], x + (w - 3) / 2, 18);
    });
    pbCtx.fillStyle = 'rgba(56,189,248,0.7)';
    pbCtx.font = '9px "Share Tech Mono"';
    pbCtx.textAlign = 'left';
    pbCtx.fillText(`MASS: ${starMass.toFixed(1)} M☉  ·  LIFETIME: ${getLifetime()}`, 5, 48);
  }

  function getLifetime() {
    if (starMass < 1) return '~100 billion years';
    if (starMass < 2) return '~10 billion years';
    if (starMass < 8) return '~1 billion years';
    if (starMass < 20) return '~10 million years';
    return '~3 million years';
  }

  function getStagesForMass() {
    return STAGES.filter(s => s.minMass <= 0 || starMass >= s.minMass);
  }

  function getCurrentStage() {
    const stages = getStagesForMass();
    return stages[Math.min(stageIdx, stages.length - 1)];
  }

  /* info panel */
  const infoEl = document.getElementById('simInfo');
  function updateInfoPanel() {
    const st = getCurrentStage();
    if (infoEl) infoEl.innerHTML = `<div class="sim-info-title">⭐ STAR LIFECYCLE</div>
      <div class="sim-info-text">
        <b style="color:#FCD34D">Current Stage:</b><br>
        <span style="color:#A855F7;font-size:1rem">${st.name}</span><br><br>
        ${st.desc}<br><br>
        <b style="color:#38BDF8">Stellar Mass:</b> ${starMass.toFixed(1)} M☉<br>
        <b style="color:#38BDF8">Est. Lifetime:</b> ${getLifetime()}
      </div>`;
  }

  /* controls */
  const ctrlEl = document.getElementById('simControls');
  if (ctrlEl) {
    ctrlEl.innerHTML = `
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">STELLAR MASS <span id="slMV">1.0 M☉</span></div>
        <input type="range" min="0.5" max="40" step="0.5" value="1" id="slMR"/></div>
      <button class="sim-btn" id="slNext">NEXT STAGE →</button>
      <button class="sim-btn" id="slReset">RESET</button>`;

    document.getElementById('slMR').oninput = e => {
      starMass = +e.target.value;
      document.getElementById('slMV').textContent = starMass.toFixed(1) + ' M☉';
      stageIdx = 0; stageTime = 0; updateInfoPanel(); drawProgressBar();
    };
    document.getElementById('slNext').onclick = () => {
      const stages = getStagesForMass();
      stageIdx = (stageIdx + 1) % stages.length;
      stageTime = 0; updateInfoPanel(); drawProgressBar();
    };
    document.getElementById('slReset').onclick = () => {
      stageIdx = 0; stageTime = 0; updateInfoPanel(); drawProgressBar();
    };
  }

  updateInfoPanel(); drawProgressBar();

  /* camera drag */
  let isDragging = false, prevMouse = { x: 0, y: 0 }, theta = 0.2, phi = 1.1, camRad = 200;
  canvas.addEventListener('mousedown', e => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; });
  window.addEventListener('mouseup', () => isDragging = false);
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    theta -= (e.clientX - prevMouse.x) * 0.005;
    phi = Math.max(0.15, Math.min(Math.PI - 0.15, phi - (e.clientY - prevMouse.y) * 0.005));
    prevMouse = { x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('wheel', e => { camRad = Math.max(40, Math.min(500, camRad + e.deltaY * 0.3)); e.preventDefault(); }, { passive: false });

  const clock = new THREE.Clock();
  let snTime = -1;

  function animate() {
    if (!running) return;
    requestAnimationFrame(animate);
    const dt = clock.getDelta(), t = clock.elapsedTime;
    stageTime += dt;

    const st = getCurrentStage();
    const stages = getStagesForMass();

    /* lerp star size */
    const targetR = st.size;
    const currentR = starMesh.scale.x;
    const newR = currentR + (targetR - currentR) * Math.min(dt * 1.5, 1);
    starMesh.scale.setScalar(newR);
    starMat.color.setHex(st.color);

    /* nebula visibility */
    nebPoints.visible = st.name === 'NEBULA' || st.name === 'PROTOSTAR';
    nebMat.opacity = st.name === 'NEBULA' ? 0.6 : 0.2;

    /* star visibility */
    starMesh.visible = st.name !== 'NEBULA' && st.name !== 'BLACK HOLE';
    starMat.color.setHex(st.color);

    /* glow */
    const glowSize = newR * 3.5;
    glowSprite.scale.set(glowSize * 2, glowSize * 2, 1);
    const glowMat = glowSprite.material;
    glowMat.visible = st.name !== 'NEBULA' && st.name !== 'BLACK HOLE';

    /* corona */
    const cpa = corGeo.attributes.position;
    for (let i = 0; i < COR_N; i++) {
      corAngles[i] += dt * (0.4 + Math.random() * 0.1);
      const phi2 = Math.random() * Math.PI;
      const r = newR * corRadii[i];
      cpa.array[i * 3] = Math.cos(corAngles[i]) * Math.sin(phi2) * r;
      cpa.array[i * 3 + 1] = Math.cos(phi2) * r;
      cpa.array[i * 3 + 2] = Math.sin(corAngles[i]) * Math.sin(phi2) * r;
    }
    cpa.needsUpdate = true;
    corPoints.visible = st.name !== 'NEBULA' && st.name !== 'BLACK HOLE' && st.name !== 'SUPERNOVA';
    corMat.color.setHex(st.color);

    /* supernova */
    if (st.name === 'SUPERNOVA') {
      if (snTime < 0) snTime = t;
      const snDt = t - snTime;
      const snPa = snGeo.attributes.position;
      for (let i = 0; i < SN_N; i++) {
        snPa.array[i * 3] = snVel[i].x * snDt * 0.4;
        snPa.array[i * 3 + 1] = snVel[i].y * snDt * 0.4;
        snPa.array[i * 3 + 2] = snVel[i].z * snDt * 0.4;
      }
      snPa.needsUpdate = true;
      snMat.opacity = Math.max(0, 0.8 - snDt * 0.15);
      snPoints.visible = true;
    } else {
      snTime = -1; snPoints.visible = false; snMat.opacity = 0;
    }

    /* black hole */
    bhRing.visible = st.name === 'BLACK HOLE';
    if (st.name === 'BLACK HOLE') {
      bhRing.scale.setScalar(6);
      bhRing.material.opacity = 0.8 + Math.sin(t * 3) * 0.1;
    }

    /* camera */
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
    [pbCanvas].forEach(el => { if (el.parentNode) el.parentNode.removeChild(el); });
    window.removeEventListener('resize', resize);
  };
})();
