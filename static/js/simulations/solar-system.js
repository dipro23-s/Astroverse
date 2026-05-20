/* AstroVerse v6 — Solar System (Educational + Realistic modes, Kepler ellipses) */
(function () {
  'use strict';
  const canvas = document.getElementById('simCanvas');
  const wrap   = document.getElementById('simCanvasWrap');
  if (!canvas || !wrap) return;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000008);
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 20000);
  camera.position.set(0, 220, 380);
  function resize() {
    const W = wrap.clientWidth, H = wrap.clientHeight || 600;
    renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix();
  }
  let speed=1, showLabels=true, showOrbits=true, running=true, paused=false;
  let mode='educational';
  let isDragging=false, prevMouse={x:0,y:0};
  let theta=0.28, phi=0.9, camR=400, focusPlanet=null, flyT=0;

  // Stars
  const sg=new THREE.BufferGeometry();
  const sa=new Float32Array(12000);
  for(let i=0;i<sa.length;i++) sa[i]=(Math.random()-0.5)*16000;
  sg.setAttribute('position',new THREE.BufferAttribute(sa,3));
  scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:0.9})));

  // Sun
  const sun=new THREE.Mesh(new THREE.SphereGeometry(20,32,32),new THREE.MeshBasicMaterial({color:0xFFD700}));
  scene.add(sun);
  scene.add(new THREE.PointLight(0xFFEE88,3.5,3000));
  scene.add(new THREE.AmbientLight(0x111122));
  function mkSprite(col,sz){
    const c=document.createElement('canvas');c.width=c.height=128;
    const ctx=c.getContext('2d');
    const g=ctx.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),blending:THREE.AdditiveBlending,depthWrite:false}));
    sp.scale.set(sz,sz,1);return sp;
  }
  scene.add(mkSprite('rgba(255,200,50,0.55)',110));

  const SCALE_AU=42;
  const PLANETS=[
    {name:'Mercury',r:3.2, distEdu:48, distAU:0.387,ecc:0.206,color:0xAAAAAA,period:0.241,icon:'☿',masskg:'3.3×10²³ kg',fact:'No atmosphere · -180°C to 430°C',formula:'T=0.24 yr · a=0.39 AU'},
    {name:'Venus',  r:5.8, distEdu:76, distAU:0.723,ecc:0.007,color:0xE8C070,period:0.615,icon:'♀',masskg:'4.87×10²⁴ kg',fact:'Hottest: 465°C · Retrograde spin',formula:'v_orb=√(GM/a)≈35 km/s'},
    {name:'Earth',  r:6.0, distEdu:106,distAU:1.000,ecc:0.017,color:0x4488FF,period:1.000,icon:'🌍',masskg:'5.97×10²⁴ kg',fact:'1 Moon · 71% water · Only known life',formula:'v_esc=√(2GM/R)=11.2 km/s',moon:true},
    {name:'Mars',   r:4.2, distEdu:145,distAU:1.524,ecc:0.093,color:0xDD4422,period:1.881,icon:'♂',masskg:'6.39×10²³ kg',fact:'Olympus Mons 22 km · 2 moons',formula:'a³/T²=const (Kepler III)'},
    {name:'Jupiter',r:15,  distEdu:215,distAU:5.203,ecc:0.049,color:0xC08860,period:11.86,icon:'♃',masskg:'1.90×10²⁷ kg',fact:'95 moons · Great Red Spot 350+ yr',formula:'L∝M⁴ (mass-luminosity)'},
    {name:'Saturn', r:13,  distEdu:290,distAU:9.537,ecc:0.057,color:0xE8D090,period:29.46,icon:'♄',masskg:'5.68×10²⁶ kg',fact:'Rings span 282,000 km · Density<water',formula:'P=2π√(a³/GM)',rings:true},
    {name:'Uranus', r:9,   distEdu:355,distAU:19.19,ecc:0.046,color:0x7ECBD4,period:84.01,icon:'⛢',masskg:'8.68×10²⁵ kg',fact:'Rotates on its side (98°) · -224°C',formula:'v∝1/√r (circular orbit)'},
    {name:'Neptune',r:8.8, distEdu:415,distAU:30.07,ecc:0.010,color:0x4060E0,period:164.8,icon:'♆',masskg:'1.02×10²⁶ kg',fact:'Winds 2,100 km/h · Predicted theoretically',formula:'T=2π√(a³/GM☉)'},
  ];

  const planetMeshes=[],orbitObjects=[],labelDivs=[];
  const pEduAngle=PLANETS.map(()=>Math.random()*Math.PI*2);
  const pMeanAnom=PLANETS.map(()=>Math.random()*Math.PI*2);

  function buildOrbitLine(p){
    const pts=[];
    if(mode==='educational'){
      for(let i=0;i<=128;i++){const a=(i/128)*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(a)*p.distEdu,0,Math.sin(a)*p.distEdu));}
    } else {
      const a=p.distAU*SCALE_AU,b=a*Math.sqrt(1-p.ecc*p.ecc),c=a*p.ecc;
      for(let i=0;i<=128;i++){const ang=(i/128)*Math.PI*2;pts.push(new THREE.Vector3(Math.cos(ang)*a-c,0,Math.sin(ang)*b));}
    }
    pts.push(pts[0].clone());
    return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x224466,transparent:true,opacity:0.45}));
  }

  function buildOrbits(){
    orbitObjects.forEach(o=>scene.remove(o));orbitObjects.length=0;
    PLANETS.forEach(p=>{const ol=buildOrbitLine(p);scene.add(ol);orbitObjects.push(ol);});
  }

  PLANETS.forEach((p,i)=>{
    const mat=new THREE.MeshLambertMaterial({color:p.color});
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(p.r,28,28),mat);
    mesh.userData={planet:p,idx:i};
    scene.add(mesh);planetMeshes.push(mesh);
    if(p.rings)mesh.add(new THREE.Mesh(new THREE.TorusGeometry(p.r*2.3,p.r*0.55,3,72),new THREE.MeshBasicMaterial({color:0xD4B870,transparent:true,opacity:0.55,side:THREE.DoubleSide})));
    if(p.moon){const moon=new THREE.Mesh(new THREE.SphereGeometry(1.5,12,12),new THREE.MeshLambertMaterial({color:0x999999}));mesh.add(moon);mesh.userData.moon=moon;}
    const d=document.createElement('div');
    d.style.cssText='position:absolute;font-family:"Share Tech Mono",monospace;font-size:10px;color:#94A3B8;pointer-events:none;white-space:nowrap;text-shadow:0 0 8px #000';
    d.textContent=p.name.toUpperCase();wrap.appendChild(d);labelDivs.push(d);
  });
  buildOrbits();

  // FPS counter
  const fpsC=document.createElement('canvas');fpsC.style.cssText='position:absolute;bottom:8px;left:8px;width:90px;height:28px;pointer-events:none;opacity:.65';fpsC.width=90;fpsC.height=28;wrap.appendChild(fpsC);
  const fpsCtx=fpsC.getContext('2d');let fpsN=0,fpsT=0;
  function drawFPS(fps){fpsCtx.clearRect(0,0,90,28);const col=fps>50?'#4ADE80':fps>30?'#FCD34D':'#F87171';fpsCtx.fillStyle=col;fpsCtx.font='9px "Share Tech Mono"';fpsCtx.fillText('FPS: '+fps.toFixed(0),4,11);fpsCtx.fillStyle='rgba(255,255,255,0.1)';fpsCtx.fillRect(4,15,82,6);fpsCtx.fillStyle=col;fpsCtx.fillRect(4,15,Math.min(82,(fps/60)*82),6);}

  // Disclaimer
  const disc=document.createElement('div');
  disc.style.cssText='position:absolute;bottom:8px;right:8px;font-family:"Share Tech Mono",monospace;font-size:8px;color:rgba(148,163,184,0.5);text-align:right;max-width:260px;pointer-events:none;line-height:1.4';
  disc.textContent='EDUCATIONAL MODE: Sizes & distances scaled for visibility.';wrap.appendChild(disc);

  // Info panel
  const infoEl=document.getElementById('simInfo');
  if(infoEl)infoEl.innerHTML=`<div class="sim-info-title">🌌 SOLAR SYSTEM</div>
    <div class="sim-info-text" id="ssInfoText">
      <b style="color:#FCD34D">Kepler's Third Law:</b><br>
      <span style="font-family:'Share Tech Mono';font-size:.75rem;color:#38BDF8">T² = (4π²/GM) · a³</span><br><br>
      Farther planets orbit <b>slower</b>.<br>Mercury: 47 km/s · Neptune: 5.4 km/s<br><br>
      <b>Click a planet</b> to explore.<br>Drag to rotate · Scroll to zoom.<br><br>
      <div style="background:rgba(56,189,248,.07);border:1px solid rgba(56,189,248,.2);border-radius:5px;padding:.6rem;margin-top:.5rem">
        <div style="font-family:'Share Tech Mono';font-size:.58rem;color:#38BDF8;margin-bottom:.3rem">◈ WHAT IS HAPPENING?</div>
        <div style="font-size:.75rem;color:#94A3B8;line-height:1.6">Planets orbit in free-fall around the Sun. Their tangential velocity balances gravitational pull. Switch to REALISTIC MODE for true elliptical orbits.</div>
      </div>
    </div>`;

  // Controls
  const ctrlEl=document.getElementById('simControls');
  if(ctrlEl){
    ctrlEl.innerHTML=`
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">MODE</div>
        <div style="display:flex;gap:.4rem;margin-top:.3rem">
          <button id="mEdu" class="sim-btn" style="flex:1;background:rgba(56,189,248,.15);border-color:#38BDF8;color:#38BDF8">EDU</button>
          <button id="mReal" class="sim-btn" style="flex:1">REALISTIC</button>
        </div>
      </div>
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">SPEED <span id="ssSpV">1.0×</span></div>
        <input type="range" min="0" max="8" step="0.1" value="1" id="ssSp"/></div>
      <button class="sim-btn" id="ssPause">⏸ PAUSE</button>
      <button class="sim-btn" id="ssLbl">LABELS: ON</button>
      <button class="sim-btn" id="ssOrb">ORBITS: ON</button>
      <button class="sim-btn" id="ssRst">↺ RESET</button>
      <div style="margin-top:.6rem;padding:.55rem;background:rgba(252,211,77,.05);border:1px solid rgba(252,211,77,.2);border-radius:4px;font-family:'Share Tech Mono';font-size:.6rem;color:rgba(252,211,77,.7);line-height:1.5">
        T² ∝ a³  ·  v=√(GM/r)
      </div>`;
    document.getElementById('ssSp').oninput=e=>{speed=+e.target.value;document.getElementById('ssSpV').textContent=speed.toFixed(1)+'×';};
    document.getElementById('ssPause').onclick=e=>{paused=!paused;e.target.textContent=paused?'▶ RESUME':'⏸ PAUSE';};
    document.getElementById('ssLbl').onclick=e=>{showLabels=!showLabels;e.target.textContent='LABELS: '+(showLabels?'ON':'OFF');labelDivs.forEach(d=>d.style.display=showLabels?'':'none');};
    document.getElementById('ssOrb').onclick=e=>{showOrbits=!showOrbits;e.target.textContent='ORBITS: '+(showOrbits?'ON':'OFF');orbitObjects.forEach(l=>l.visible=showOrbits);};
    document.getElementById('ssRst').onclick=()=>{theta=0.28;phi=0.9;camR=400;focusPlanet=null;};
    document.getElementById('mEdu').onclick=()=>{
      mode='educational';buildOrbits();orbitObjects.forEach(l=>l.visible=showOrbits);
      document.getElementById('mEdu').style.cssText='flex:1;background:rgba(56,189,248,.15);border-color:#38BDF8;color:#38BDF8';
      document.getElementById('mReal').style.cssText='flex:1';
      disc.textContent='EDUCATIONAL MODE: Sizes & distances scaled for visibility.';
    };
    document.getElementById('mReal').onclick=()=>{
      mode='realistic';buildOrbits();orbitObjects.forEach(l=>l.visible=showOrbits);
      document.getElementById('mReal').style.cssText='flex:1;background:rgba(168,85,247,.15);border-color:#A855F7;color:#A855F7';
      document.getElementById('mEdu').style.cssText='flex:1';
      disc.textContent='REALISTIC MODE: Elliptical orbits, true eccentricity (e.g. Mars e=0.093). Kepler III governs speed.';
    };
  }

  const ray=new THREE.Raycaster(),m2=new THREE.Vector2();
  canvas.addEventListener('click',e=>{
    if(Math.abs(e.clientX-prevMouse.x)+Math.abs(e.clientY-prevMouse.y)>6)return;
    const rect=canvas.getBoundingClientRect();
    m2.x=((e.clientX-rect.left)/rect.width)*2-1;
    m2.y=-((e.clientY-rect.top)/rect.height)*2+1;
    ray.setFromCamera(m2,camera);
    const hits=ray.intersectObjects(planetMeshes);
    if(hits.length){
      const idx=planetMeshes.indexOf(hits[0].object);
      const p=PLANETS[idx];
      focusPlanet=hits[0].object;flyT=0;
      const el=document.getElementById('ssInfoText');
      if(el)el.innerHTML=`<b style="color:#38BDF8;font-family:'Orbitron'">${p.name.toUpperCase()} ${p.icon}</b><br><br>
        <b>Mass:</b> ${p.masskg}<br><b>Period:</b> ${p.period} yr<br>
        <b>Semi-major axis:</b> ${p.distAU} AU<br><b>Eccentricity:</b> ${p.ecc}<br><br>
        ${p.fact}<br><br>
        <div style="background:rgba(56,189,248,.07);padding:.5rem;border-radius:4px;font-family:'Share Tech Mono';font-size:.65rem;color:#38BDF8">${p.formula}</div>`;
    }
  });
  canvas.addEventListener('mousedown',e=>{isDragging=true;prevMouse={x:e.clientX,y:e.clientY};});
  window.addEventListener('mouseup',()=>isDragging=false);
  window.addEventListener('mousemove',e=>{
    if(!isDragging)return;
    theta-=(e.clientX-prevMouse.x)*0.005;
    phi=Math.max(0.12,Math.min(Math.PI-0.12,phi-(e.clientY-prevMouse.y)*0.005));
    prevMouse={x:e.clientX,y:e.clientY};focusPlanet=null;
  });
  canvas.addEventListener('wheel',e=>{camR=Math.max(40,Math.min(1200,camR+e.deltaY*0.5));e.preventDefault();},{passive:false});

  function toScreen(pos){const v=pos.clone().project(camera);return{x:(v.x*0.5+0.5)*wrap.clientWidth,y:(-v.y*0.5+0.5)*wrap.clientHeight,behind:v.z>1};}

  function solveKepler(M,ecc){let E=M;for(let i=0;i<6;i++)E=E-(E-ecc*Math.sin(E)-M)/(1-ecc*Math.cos(E));return E;}

  const clock=new THREE.Clock();
  function animate(){
    if(!running)return;
    requestAnimationFrame(animate);
    const dt=clock.getDelta();
    fpsN++;fpsT+=dt;
    if(fpsT>0.5){drawFPS(fpsN/fpsT);fpsN=0;fpsT=0;}

    if(!paused){
      PLANETS.forEach((p,i)=>{
        const n=(2*Math.PI/p.period)*speed*dt*0.35;
        let x,z;
        if(mode==='educational'){
          pEduAngle[i]+=n;
          x=Math.cos(pEduAngle[i])*p.distEdu;z=Math.sin(pEduAngle[i])*p.distEdu;
        } else {
          pMeanAnom[i]+=n;
          const E=solveKepler(pMeanAnom[i],p.ecc);
          const ta=2*Math.atan2(Math.sqrt(1+p.ecc)*Math.sin(E/2),Math.sqrt(1-p.ecc)*Math.cos(E/2));
          const sma=p.distAU*SCALE_AU,r=sma*(1-p.ecc*Math.cos(E));
          x=r*Math.cos(ta);z=r*Math.sin(ta)-sma*p.ecc;
        }
        planetMeshes[i].position.set(x,0,z);
        planetMeshes[i].rotation.y+=dt*0.4;
        if(p.moon&&planetMeshes[i].userData.moon){
          const mt=clock.elapsedTime*speed;
          planetMeshes[i].userData.moon.position.set(Math.cos(mt*2.2)*14,Math.sin(mt*0.5)*2,Math.sin(mt*2.2)*14);
        }
        if(showLabels){const sc=toScreen(planetMeshes[i].position);labelDivs[i].style.left=(sc.x+p.r+5)+'px';labelDivs[i].style.top=(sc.y-7)+'px';labelDivs[i].style.display=sc.behind?'none':'';}
      });
    }
    sun.rotation.y+=dt*0.1;
    if(focusPlanet){
      flyT=Math.min(flyT+dt*0.6,1);
      const tgt=focusPlanet.position.clone();
      const pr=PLANETS[planetMeshes.indexOf(focusPlanet)]?.r||10;
      camera.position.lerp(tgt.clone().add(new THREE.Vector3(0,pr*4,pr*9)),flyT*0.04);
      camera.lookAt(tgt);
    } else {
      camera.position.set(camR*Math.sin(phi)*Math.sin(theta),camR*Math.cos(phi),camR*Math.sin(phi)*Math.cos(theta));
      camera.lookAt(0,0,0);
    }
    renderer.render(scene,camera);
  }
  resize();window.addEventListener('resize',resize);
  animate();
  window._simCleanup=()=>{running=false;renderer.dispose();labelDivs.forEach(d=>{if(d.parentNode)d.parentNode.removeChild(d);});[fpsC,disc].forEach(el=>{if(el.parentNode)el.parentNode.removeChild(el);});window.removeEventListener('resize',resize);};
})();
