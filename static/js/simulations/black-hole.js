/* AstroVerse v6 — Black Hole Simulation (enhanced lensing, warped starfield, GR notes) */
(function () {
  'use strict';
  const canvas = document.getElementById('simCanvas');
  const wrap   = document.getElementById('simCanvasWrap');
  if (!canvas || !wrap) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000005);
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
  camera.position.set(0, 45, 120);

  function resize() {
    const W = wrap.clientWidth, H = wrap.clientHeight || 600;
    renderer.setSize(W, H); camera.aspect = W/H; camera.updateProjectionMatrix();
  }

  let mass=1.0, spin=0.5, brightness=1.0, timeDilation=1.0, running=true;

  // ── Warped starfield (lensing effect via screen-space 2D overlay) ─────────
  // We use a 2D canvas overlay for lensing, layered on top of Three.js
  const lensCanvas = document.createElement('canvas');
  lensCanvas.style.cssText = 'position:absolute;inset:0;pointer-events:none;width:100%;height:100%';
  wrap.appendChild(lensCanvas);
  const lensCtx = lensCanvas.getContext('2d');
  let LW, LH;
  function resizeLens() { LW=lensCanvas.width=wrap.clientWidth; LH=lensCanvas.height=wrap.clientHeight||600; }
  resizeLens();

  // Generate a fixed set of background stars for lensing
  const BG_STARS = [];
  for (let i=0;i<200;i++) BG_STARS.push({x:Math.random(),y:Math.random(),s:Math.random()*1.2+0.3,b:Math.random()*0.5+0.3});

  // Schwarzschild lensing: deflect star images toward BH silhouette center
  function drawLensedStars(cx, cy, rs) {
    lensCtx.clearRect(0,0,LW,LH);
    BG_STARS.forEach(s => {
      const sx=s.x*LW, sy=s.y*LH;
      const dx=sx-cx, dy=sy-cy;
      const d=Math.sqrt(dx*dx+dy*dy);
      const lensR=rs*5.5;
      // Einstein ring / lensing displacement
      if(d<rs*0.9) return; // inside horizon: invisible
      let lx=sx, ly=sy;
      if(d<lensR) {
        // Simplified Schwarzschild deflection: Δθ ≈ 2rs²/d
        const deflect = Math.min(rs*rs*3.2/(d*d), d*0.6);
        const ang = Math.atan2(dy,dx);
        // Stars get pulled toward the ring
        const pull = deflect*(1-d/lensR)*2.5;
        lx = sx + Math.cos(ang+Math.PI)*pull;
        ly = sy + Math.sin(ang+Math.PI)*pull;
      }
      const fade = d < lensR ? Math.min(1,(d-rs)/(lensR-rs)) : 1;
      // Einstein ring arcs: strong lensing near photon sphere
      const isEinsteinZone = d > rs*1.3 && d < rs*1.9;
      lensCtx.beginPath();
      lensCtx.arc(lx,ly,s.s*(isEinsteinZone?2.2:1),0,Math.PI*2);
      lensCtx.fillStyle=`rgba(${isEinsteinZone?'255,220,180':'200,220,255'},${s.b*fade*(isEinsteinZone?1.8:0.7)})`;
      lensCtx.fill();
    });
    // Einstein ring glow
    const ringG = lensCtx.createRadialGradient(cx,cy,rs*1.3,cx,cy,rs*2.0);
    ringG.addColorStop(0,'rgba(255,160,60,0.18)');
    ringG.addColorStop(0.5,'rgba(255,100,20,0.08)');
    ringG.addColorStop(1,'transparent');
    lensCtx.fillStyle=ringG;
    lensCtx.beginPath();lensCtx.arc(cx,cy,rs*2.0,0,Math.PI*2);lensCtx.fill();
  }

  // ── Three.js: star field (3D depth) ───────────────────────
  const starGeo=new THREE.BufferGeometry();
  const starPos=new Float32Array(4500);
  for(let i=0;i<starPos.length;i++) starPos[i]=(Math.random()-0.5)*2000;
  starGeo.setAttribute('position',new THREE.BufferAttribute(starPos,3));
  scene.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0x446688,size:0.5,sizeAttenuation:true})));

  // ── Event horizon sphere ───────────────────────────────────
  const bhGeo=new THREE.SphereGeometry(1,32,32);
  const bhMat=new THREE.MeshBasicMaterial({color:0x000000});
  const bhMesh=new THREE.Mesh(bhGeo,bhMat);
  scene.add(bhMesh);

  // Photon ring (golden)
  const phRing=new THREE.Mesh(new THREE.TorusGeometry(1,0.06,16,128),new THREE.MeshBasicMaterial({color:0xffbb44,transparent:true,opacity:0.95,blending:THREE.AdditiveBlending}));
  phRing.rotation.x=Math.PI/2;scene.add(phRing);

  // ISCO ring (dashed appearance via transparency flicker)
  const iscoRing=new THREE.Mesh(new THREE.TorusGeometry(1,0.03,8,96),new THREE.MeshBasicMaterial({color:0x3388ff,transparent:true,opacity:0.4,blending:THREE.AdditiveBlending}));
  iscoRing.rotation.x=Math.PI/2;scene.add(iscoRing);

  // ── Accretion disk (8000 particles, vertexColors) ─────────
  const DISK_N=8000;
  const diskGeo=new THREE.BufferGeometry();
  const dPos=new Float32Array(DISK_N*3);
  const dCol=new Float32Array(DISK_N*3);
  const dAng=new Float32Array(DISK_N);
  const dRad=new Float32Array(DISK_N);
  const dSpd=new Float32Array(DISK_N);
  for(let i=0;i<DISK_N;i++){
    const r=2.2+Math.pow(Math.random(),0.4)*14;
    const a=Math.random()*Math.PI*2;
    dRad[i]=r;dAng[i]=a;dSpd[i]=0.45/(r*0.55);
    dPos[i*3]=Math.cos(a)*r;dPos[i*3+1]=(Math.random()-0.5)*0.28;dPos[i*3+2]=Math.sin(a)*r;
    const t=1-(r-2.2)/14;
    // Inner: bright orange-white; outer: deep red
    dCol[i*3]=0.9+t*0.1;dCol[i*3+1]=0.25+t*0.5;dCol[i*3+2]=0.05+t*0.35;
  }
  diskGeo.setAttribute('position',new THREE.BufferAttribute(dPos,3));
  diskGeo.setAttribute('color',new THREE.BufferAttribute(dCol,3));
  const diskMat=new THREE.PointsMaterial({size:0.19,vertexColors:true,transparent:true,opacity:0.88,sizeAttenuation:true,blending:THREE.AdditiveBlending,depthWrite:false});
  scene.add(new THREE.Points(diskGeo,diskMat));

  // Outer glow sprite
  function mkSprite(col,sz){
    const c=document.createElement('canvas');c.width=c.height=128;
    const ctx=c.getContext('2d');
    const g=ctx.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
    return new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));
  }
  const glowSp=mkSprite('rgba(255,80,0,0.22)',28);scene.add(glowSp);
  const innerGlow=mkSprite('rgba(200,100,255,0.18)',14);scene.add(innerGlow);

  scene.add(new THREE.AmbientLight(0x080808));

  // ── Relativistic jet (vertical particles) ─────────────────
  const JET_N=600;
  const jetGeo=new THREE.BufferGeometry();
  const jetPos=new Float32Array(JET_N*3);
  const jetV=new Float32Array(JET_N);
  for(let i=0;i<JET_N;i++){
    const side=i<JET_N/2?1:-1;
    const r=Math.random()*0.5;
    const a=Math.random()*Math.PI*2;
    jetPos[i*3]=Math.cos(a)*r;jetPos[i*3+1]=side*(2+Math.random()*20);jetPos[i*3+2]=Math.sin(a)*r;
    jetV[i]=side*(0.5+Math.random()*1.5);
  }
  jetGeo.setAttribute('position',new THREE.BufferAttribute(jetPos,3));
  scene.add(new THREE.Points(jetGeo,new THREE.PointsMaterial({color:0x88ccff,size:0.3,transparent:true,opacity:0.5,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true})));

  // ── Info panel ─────────────────────────────────────────────
  const infoEl=document.getElementById('simInfo');
  if(infoEl)infoEl.innerHTML=`
    <div class="sim-info-title">⚫ BLACK HOLE</div>
    <div class="sim-info-text">
      <b style="color:#ffaa33">Event Horizon</b> — r<sub>s</sub> = 2GM/c²<br>
      Point of no return. Light cannot escape.<br><br>
      <b style="color:#ff8800">Photon Sphere</b> — r = 1.5 r<sub>s</sub><br>
      Photons orbit the BH here.<br><br>
      <b style="color:#4488ff">ISCO</b> — r = 3 r<sub>s</sub><br>
      Innermost Stable Circular Orbit.<br><br>
      <b style="color:#ff6644">Accretion Disk</b> — millions of Kelvin, emitting X-rays.<br><br>
      <b style="color:#88ccff">Relativistic Jets</b> — plasma ejected along magnetic field lines at near-c.<br><br>
      <div style="background:rgba(252,211,77,.07);border:1px solid rgba(252,211,77,.2);border-radius:4px;padding:.6rem;margin-top:.5rem">
        <div style="font-family:'Share Tech Mono';font-size:.58rem;color:#FCD34D;margin-bottom:.3rem">◈ WHAT IS HAPPENING?</div>
        <div style="font-size:.75rem;color:#94A3B8;line-height:1.6">Mass warps spacetime. The lensed star background simulates gravitational deflection near the event horizon.</div>
      </div>
      <div style="background:rgba(248,113,113,.07);border:1px solid rgba(248,113,113,.2);border-radius:4px;padding:.5rem;margin-top:.5rem;font-family:'Share Tech Mono';font-size:.58rem;color:rgba(248,113,113,.8);line-height:1.5">
        ⚠ DISCLAIMER: Lensing inspired by GR. Not a ray-traced simulation. Hawking radiation (T_H=ℏc³/8πGMk_B) not visualized in real time.
      </div>
    </div>`;

  // ── Controls ───────────────────────────────────────────────
  const ctrlEl=document.getElementById('simControls');
  if(ctrlEl){
    ctrlEl.innerHTML=`
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">MASS <span id="bhMV">1.0 M☉</span></div>
        <input type="range" min="0.3" max="5" step="0.1" value="1" id="bhM"/></div>
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">SPIN (a/M) <span id="bhSV">0.50</span></div>
        <input type="range" min="0" max="0.998" step="0.01" value="0.5" id="bhS"/></div>
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">DISK BRIGHTNESS <span id="bhBV">1.0</span></div>
        <input type="range" min="0.1" max="2.5" step="0.05" value="1" id="bhB"/></div>
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">TIME DILATION <span id="bhTV">1.0×</span></div>
        <input type="range" min="0" max="2" step="0.05" value="1" id="bhT"/></div>
      <button class="sim-btn" id="bhReset">↺ RESET</button>
      <div style="margin-top:.6rem;padding:.55rem;background:rgba(56,189,248,.05);border:1px solid rgba(56,189,248,.2);border-radius:4px;font-family:'Share Tech Mono';font-size:.6rem;color:rgba(56,189,248,.7);line-height:1.6">
        r_s = 2GM/c²<br>
        T_H = ℏc³/8πGMk_B<br>
        r_ISCO = 3r_s (Schwarzschild)
      </div>`;
    document.getElementById('bhM').oninput=e=>{mass=+e.target.value;document.getElementById('bhMV').textContent=mass.toFixed(1)+' M☉';};
    document.getElementById('bhS').oninput=e=>{spin=+e.target.value;document.getElementById('bhSV').textContent=spin.toFixed(2);};
    document.getElementById('bhB').oninput=e=>{brightness=+e.target.value;document.getElementById('bhBV').textContent=brightness.toFixed(1);};
    document.getElementById('bhT').oninput=e=>{timeDilation=+e.target.value;document.getElementById('bhTV').textContent=timeDilation.toFixed(1)+'×';};
    document.getElementById('bhReset').onclick=()=>{mass=1;spin=0.5;brightness=1;timeDilation=1;['bhM','bhS','bhB','bhT'].forEach((id,i)=>{document.getElementById(id).value=[1,0.5,1,1][i];});document.getElementById('bhMV').textContent='1.0 M☉';document.getElementById('bhSV').textContent='0.50';document.getElementById('bhBV').textContent='1.0';document.getElementById('bhTV').textContent='1.0×';};
  }

  // ── Orbit controls ─────────────────────────────────────────
  let isDragging=false,prevMouse={x:0,y:0},theta=0.3,phi=0.4,camRadius=120;
  canvas.addEventListener('mousedown',e=>{isDragging=true;prevMouse={x:e.clientX,y:e.clientY};});
  window.addEventListener('mouseup',()=>isDragging=false);
  window.addEventListener('mousemove',e=>{
    if(!isDragging)return;
    theta-=(e.clientX-prevMouse.x)*0.005;
    phi=Math.max(0.1,Math.min(Math.PI-0.1,phi-(e.clientY-prevMouse.y)*0.005));
    prevMouse={x:e.clientX,y:e.clientY};
  });
  canvas.addEventListener('wheel',e=>{camRadius=Math.max(30,Math.min(300,camRadius+e.deltaY*0.2));e.preventDefault();},{passive:false});

  const clock=new THREE.Clock();
  function animate(){
    if(!running)return;
    requestAnimationFrame(animate);
    const dt=clock.getDelta()*timeDilation;
    const t=clock.elapsedTime;
    const r=8*mass;

    // Scale BH + rings
    bhMesh.scale.setScalar(r);
    phRing.scale.setScalar(r*1.5);
    iscoRing.scale.setScalar(r*3);
    glowSp.scale.set(r*18,r*18,1);
    innerGlow.scale.set(r*6,r*6,1);
    diskMat.opacity=Math.min(0.95,brightness*0.85);

    // Accretion disk rotation (frame dragging: spin affects inner disk more)
    const dpa=diskGeo.attributes.position;
    for(let i=0;i<DISK_N;i++){
      // Kerr: inner disk rotates faster with spin
      const frameDrag=dRad[i]<r*3?(1+spin*0.8):(1+spin*0.2);
      dAng[i]+=dSpd[i]*dt*frameDrag;
      dpa.array[i*3]=Math.cos(dAng[i])*dRad[i];
      dpa.array[i*3+2]=Math.sin(dAng[i])*dRad[i];
    }
    dpa.needsUpdate=true;

    // Relativistic jets (extent shrinks with less spin)
    const jpa=jetGeo.attributes.position;
    for(let i=0;i<JET_N;i++){
      jpa.array[i*3+1]+=jetV[i]*dt*spin*2;
      const side=jetV[i]>0?1:-1;
      if(Math.abs(jpa.array[i*3+1])>r*15){
        jpa.array[i*3+1]=side*r*2;
        jpa.array[i*3]=Math.cos(Math.random()*Math.PI*2)*0.4;
        jpa.array[i*3+2]=Math.sin(Math.random()*Math.PI*2)*0.4;
      }
    }
    jpa.needsUpdate=true;

    // Camera
    camera.position.x=camRadius*Math.sin(phi)*Math.sin(theta);
    camera.position.y=camRadius*Math.cos(phi);
    camera.position.z=camRadius*Math.sin(phi)*Math.cos(theta);
    camera.lookAt(0,0,0);
    renderer.render(scene,camera);

    // Lensed starfield overlay
    resizeLens();
    // Project BH center to screen
    const bhScreen=bhMesh.position.clone().project(camera);
    const cx=(bhScreen.x*0.5+0.5)*LW;
    const cy=(-bhScreen.y*0.5+0.5)*LH;
    const rs=r*LH/(2*camRadius); // approximate screen radius
    drawLensedStars(cx,cy,Math.max(20,rs*3.5));
  }

  resize();window.addEventListener('resize',()=>{resize();resizeLens();});
  animate();
  window._simCleanup=()=>{running=false;renderer.dispose();if(lensCanvas.parentNode)lensCanvas.parentNode.removeChild(lensCanvas);window.removeEventListener('resize',resize);};
})();
