/* AstroVerse v6 — Gravitational Waves: + and × polarization, strain, chirp */
(function(){
  'use strict';
  const canvas=document.getElementById('simCanvas');
  const wrap=document.getElementById('simCanvasWrap');
  if(!canvas||!wrap)return;
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setClearColor(0x000008);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(55,1,0.1,3000);
  camera.position.set(0,90,220);

  function resize(){const W=wrap.clientWidth,H=wrap.clientHeight||600;renderer.setSize(W,H);camera.aspect=W/H;camera.updateProjectionMatrix();}

  let running=true,waveAmp=1,freqScale=1,paused=false,polarisation='plus';
  let orbitR=60,merging=false,merged=false,mergeT=0;

  // Stars
  const sg=new THREE.BufferGeometry();const sa=new Float32Array(5000);for(let i=0;i<sa.length;i++)sa[i]=(Math.random()-0.5)*2000;sg.setAttribute('position',new THREE.BufferAttribute(sa,3));scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0x334455,size:0.5})));

  // ── Ring grid: shows + / × polarisation deformation ──────
  const RING_ROWS=9,RING_COLS=9,RING_SEP=14;
  const ringMeshes=[];
  const ringBaseX=[],ringBaseZ=[];
  for(let row=0;row<RING_ROWS;row++){
    for(let col=0;col<RING_COLS;col++){
      const x=(col-(RING_COLS-1)/2)*RING_SEP;
      const z=(row-(RING_ROWS-1)/2)*RING_SEP;
      ringBaseX.push(x);ringBaseZ.push(z);
      const m=new THREE.Mesh(new THREE.SphereGeometry(0.9,10,10),
        new THREE.MeshBasicMaterial({color:0x2255AA,transparent:true,opacity:0.6}));
      m.position.set(x,0,z);scene.add(m);ringMeshes.push(m);
    }
  }
  // Connection lines (grid lines between particles)
  const lineMat=new THREE.LineBasicMaterial({color:0x113366,transparent:true,opacity:0.3});

  // Binary BH pair
  const bhMat=new THREE.MeshBasicMaterial({color:0x000000});
  const bh1=new THREE.Mesh(new THREE.SphereGeometry(4,20,20),bhMat);
  const bh2=new THREE.Mesh(new THREE.SphereGeometry(4,20,20),bhMat);
  scene.add(bh1);scene.add(bh2);

  // BH glow rings
  function mkGlow(col){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');const g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
  const g1=new THREE.Sprite(new THREE.SpriteMaterial({map:mkGlow('rgba(255,120,20,0.6)'),blending:THREE.AdditiveBlending,depthWrite:false}));g1.scale.set(20,20,1);scene.add(g1);
  const g2=new THREE.Sprite(new THREE.SpriteMaterial({map:mkGlow('rgba(80,160,255,0.6)'),blending:THREE.AdditiveBlending,depthWrite:false}));g2.scale.set(20,20,1);scene.add(g2);

  // Expanding wave rings (spacetime ripples)
  const WAVE_RINGS=[];const MAX_RINGS=18;
  let ringTimer=0;
  function addRing(){
    const geo=new THREE.TorusGeometry(1,0.25,8,80);
    const mat=new THREE.MeshBasicMaterial({color:0x2266CC,transparent:true,opacity:0.6,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
    const m=new THREE.Mesh(geo,mat);m.rotation.x=Math.PI/2;m.userData={r:0,alpha:0.6};
    scene.add(m);WAVE_RINGS.push(m);
    if(WAVE_RINGS.length>MAX_RINGS){const old=WAVE_RINGS.shift();scene.remove(old);old.geometry.dispose();}
  }

  // 2D overlay canvas for chirp + strain graphs
  const ovCanvas=document.createElement('canvas');
  ovCanvas.style.cssText='position:absolute;bottom:0;left:0;width:100%;height:140px;pointer-events:none';
  wrap.appendChild(ovCanvas);const ovCtx=ovCanvas.getContext('2d');
  let ovW,ovH;
  function resizeOv(){ovW=ovCanvas.width=wrap.clientWidth;ovH=ovCanvas.height=140;}
  resizeOv();window.addEventListener('resize',resizeOv);

  const chirpData=[],strainData=[];

  function drawOverlay(t,orbSpeed,h){
    ovCtx.clearRect(0,0,ovW,ovH);
    // Background panel
    ovCtx.fillStyle='rgba(1,4,12,0.82)';ovCtx.fillRect(0,0,ovW,ovH);
    ovCtx.strokeStyle='rgba(56,100,180,0.3)';ovCtx.lineWidth=1;ovCtx.strokeRect(1,1,ovW-2,ovH-2);

    const gw=Math.floor(ovW/2)-20,gh=55,gy1=12,gy2=76;
    const gx1=10,gx2=gw+25;

    // Labels
    ovCtx.fillStyle='rgba(56,189,248,0.7)';ovCtx.font='8px "Share Tech Mono"';
    ovCtx.fillText('CHIRP WAVEFORM  h(t)',gx1,gy1-2);
    ovCtx.fillStyle='rgba(168,85,247,0.7)';
    ovCtx.fillText(polarisation==='plus'?'PLUS (+) POLARISATION':'CROSS (×) POLARISATION',gx2,gy1-2);

    // Chirp graph
    ovCtx.fillStyle='rgba(5,15,35,0.7)';ovCtx.fillRect(gx1,gy1,gw,gh);
    ovCtx.strokeStyle='rgba(56,100,180,0.4)';ovCtx.lineWidth=0.5;ovCtx.strokeRect(gx1,gy1,gw,gh);
    chirpData.push(h);if(chirpData.length>gw)chirpData.shift();
    ovCtx.beginPath();
    chirpData.forEach((v,i)=>{const lx=gx1+i,ly=gy1+gh/2-v*gh*0.42;i===0?ovCtx.moveTo(lx,ly):ovCtx.lineTo(lx,ly);});
    ovCtx.strokeStyle='#38BDF8';ovCtx.lineWidth=1.5;ovCtx.stroke();
    ovCtx.fillStyle='rgba(56,189,248,0.5)';ovCtx.font='7px "Share Tech Mono"';
    ovCtx.fillText('h+',gx1+4,gy1+10);

    // Polarisation strain bars
    ovCtx.fillStyle='rgba(5,15,35,0.7)';ovCtx.fillRect(gx2,gy1,gw,gh);
    ovCtx.strokeStyle='rgba(100,56,180,0.4)';ovCtx.lineWidth=0.5;ovCtx.strokeRect(gx2,gy1,gw,gh);
    strainData.push(Math.sin(t*orbSpeed*freqScale*2)*h);if(strainData.length>gw)strainData.shift();
    ovCtx.beginPath();
    strainData.forEach((v,i)=>{const lx=gx2+i,ly=gy1+gh/2-v*gh*0.42;i===0?ovCtx.moveTo(lx,ly):ovCtx.lineTo(lx,ly);});
    ovCtx.strokeStyle='#A855F7';ovCtx.lineWidth=1.5;ovCtx.stroke();

    // Physical info bar
    const freq=(orbSpeed*freqScale*50).toFixed(1);
    const strain=(Math.abs(h)*1.2e-21).toExponential(1);
    ovCtx.fillStyle='rgba(148,163,184,0.65)';ovCtx.font='8px "Share Tech Mono"';
    ovCtx.fillText(`ORBIT RADIUS: ${orbitR.toFixed(0)} M  ·  GW FREQ: ${freq} Hz  ·  STRAIN h: ${strain}  ·  POLARISATION: ${polarisation.toUpperCase()}  ·  ${merged?'⚡ MERGER COMPLETE':''}`,gx1,gh+gy1+16);

    // + vs × polarisation visual demo
    const demX=ovW-110,demY=gy2,sz=50;
    ovCtx.fillStyle='rgba(5,10,25,0.8)';ovCtx.fillRect(demX-5,demY-5,110,75);
    ovCtx.strokeStyle='rgba(56,189,248,0.3)';ovCtx.strokeRect(demX-5,demY-5,110,75);
    ovCtx.fillStyle='rgba(56,189,248,0.6)';ovCtx.font='7px "Share Tech Mono"';
    ovCtx.fillText('SPACETIME DEFORMATION',demX,demY+8);
    const ph=waveAmp*Math.sin(t*orbSpeed*freqScale)*18;
    if(polarisation==='plus'){
      ovCtx.strokeStyle='rgba(56,189,248,0.8)';ovCtx.lineWidth=1.5;
      ovCtx.strokeRect(demX+10,demY+18,sz-ph,sz+ph);
    } else {
      ovCtx.save();ovCtx.translate(demX+35,demY+43);ovCtx.rotate(Math.PI/4);
      ovCtx.strokeStyle='rgba(168,85,247,0.8)';ovCtx.lineWidth=1.5;
      ovCtx.strokeRect(-sz/2+ph/2,-sz/2-ph/2,sz-ph,sz+ph);ovCtx.restore();
    }
  }

  // Info + controls
  const infoEl=document.getElementById('simInfo');
  if(infoEl)infoEl.innerHTML=`
    <div class="sim-info-title">〰 GRAVITATIONAL WAVES</div>
    <div class="sim-info-text">
      Two massive objects spiraling inward emit <b>gravitational waves</b> — ripples in spacetime.<br><br>
      <b style="color:#38BDF8">+ Polarisation:</b> Stretches x, squeezes y simultaneously.<br>
      <b style="color:#A855F7">× Polarisation:</b> Same but rotated 45°.<br><br>
      LIGO detects strain <b>h ~ 10⁻²¹</b> — smaller than a proton relative to Earth-Sun distance.<br><br>
      <div style="background:rgba(56,189,248,.07);padding:.5rem;border-radius:4px;font-family:'Share Tech Mono';font-size:.62rem;color:#38BDF8;line-height:1.7">
        h = ΔL/L  (strain)<br>
        f_GW = 2 × f_orbital<br>
        P_GW = -32G⁴/5c⁵ × m₁²m₂²(m₁+m₂)/r⁵<br>
        t_merge ∝ r⁴ (Peters formula)
      </div>
      <br>
      <div style="background:rgba(252,211,77,.07);border:1px solid rgba(252,211,77,.2);border-radius:4px;padding:.5rem;font-family:'Share Tech Mono';font-size:.58rem;color:rgba(252,211,77,.7);line-height:1.5">
        ◈ WHAT IS HAPPENING?<br><span style="color:#94A3B8">The grid particles show real-time + or × polarisation deformation as the wave passes through spacetime.</span>
      </div>
    </div>`;

  const ctrlEl=document.getElementById('simControls');
  if(ctrlEl){
    ctrlEl.innerHTML=`
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">WAVE AMPLITUDE <span id="gwAV">1.0</span></div>
        <input type="range" min="0.1" max="3" step="0.1" value="1" id="gwA"/></div>
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">FREQUENCY SCALE <span id="gwFV">1.0</span></div>
        <input type="range" min="0.2" max="4" step="0.1" value="1" id="gwF"/></div>
      <div class="sim-ctrl-group">
        <div class="sim-ctrl-label">POLARISATION</div>
        <div style="display:flex;gap:.4rem;margin-top:.3rem">
          <button id="polPlus" class="sim-btn" style="flex:1;background:rgba(56,189,248,.15);border-color:#38BDF8;color:#38BDF8">+ (PLUS)</button>
          <button id="polCross" class="sim-btn" style="flex:1">× (CROSS)</button>
        </div>
      </div>
      <button class="sim-btn" id="gwMerge">⚡ TRIGGER MERGER</button>
      <button class="sim-btn" id="gwReset">↺ RESET</button>
      <div style="margin-top:.6rem;padding:.55rem;background:rgba(56,189,248,.05);border:1px solid rgba(56,189,248,.2);border-radius:4px;font-family:'Share Tech Mono';font-size:.58rem;color:rgba(56,189,248,.7);line-height:1.6">
        First detection: GW150914<br>
        Two 36 M☉ black holes<br>
        1.3 billion light-years away
      </div>`;
    document.getElementById('gwA').oninput=e=>{waveAmp=+e.target.value;document.getElementById('gwAV').textContent=waveAmp.toFixed(1);};
    document.getElementById('gwF').oninput=e=>{freqScale=+e.target.value;document.getElementById('gwFV').textContent=freqScale.toFixed(1);};
    document.getElementById('gwMerge').onclick=()=>{if(!merged){merging=true;mergeT=0;}};
    document.getElementById('gwReset').onclick=()=>{merging=false;merged=false;mergeT=0;orbitR=60;chirpData.length=0;strainData.length=0;WAVE_RINGS.forEach(r=>scene.remove(r));WAVE_RINGS.length=0;};
    document.getElementById('polPlus').onclick=()=>{polarisation='plus';document.getElementById('polPlus').style.cssText='flex:1;background:rgba(56,189,248,.15);border-color:#38BDF8;color:#38BDF8';document.getElementById('polCross').style.cssText='flex:1';};
    document.getElementById('polCross').onclick=()=>{polarisation='cross';document.getElementById('polCross').style.cssText='flex:1;background:rgba(168,85,247,.15);border-color:#A855F7;color:#A855F7';document.getElementById('polPlus').style.cssText='flex:1';};
  }

  let isDragging=false,prevMouse={x:0,y:0},theta=-0.3,phi=0.7,camR=220;
  canvas.addEventListener('mousedown',e=>{isDragging=true;prevMouse={x:e.clientX,y:e.clientY};});
  window.addEventListener('mouseup',()=>isDragging=false);
  window.addEventListener('mousemove',e=>{if(!isDragging)return;theta-=(e.clientX-prevMouse.x)*0.005;phi=Math.max(0.1,Math.min(Math.PI-0.1,phi-(e.clientY-prevMouse.y)*0.005));prevMouse={x:e.clientX,y:e.clientY};});
  canvas.addEventListener('wheel',e=>{camR=Math.max(60,Math.min(500,camR+e.deltaY*0.3));e.preventDefault();},{passive:false});

  const clock=new THREE.Clock();
  function animate(){
    if(!running)return;
    requestAnimationFrame(animate);
    const dt=clock.getDelta(),t=clock.elapsedTime;

    if(merging&&!merged){mergeT+=dt;orbitR=Math.max(4,60-mergeT*22);if(orbitR<=5){merged=true;merging=false;}}
    const orbSpeed=(0.018+(merged?0:(60-orbitR)*0.0012))*freqScale;
    const bh1a=t*orbSpeed,bh2a=t*orbSpeed+Math.PI;
    const b1x=Math.cos(bh1a)*orbitR,b1z=Math.sin(bh1a)*orbitR;
    const b2x=Math.cos(bh2a)*orbitR,b2z=Math.sin(bh2a)*orbitR;

    if(!merged){bh1.position.set(b1x,0,b1z);bh2.position.set(b2x,0,b2z);g1.position.copy(bh1.position);g2.position.copy(bh2.position);}
    else{bh1.position.set(0,0,0);bh2.visible=false;g1.position.set(0,0,0);g2.visible=false;}

    // Wave rings
    ringTimer+=dt;
    const ringInterval=Math.max(0.08,0.35/(1+(60-orbitR)*0.04));
    if(ringTimer>ringInterval&&!merged){addRing();ringTimer=0;}
    WAVE_RINGS.forEach(ring=>{ring.userData.r+=dt*55*(1+(60-orbitR)*0.015);ring.userData.alpha*=0.96;ring.scale.set(ring.userData.r,ring.userData.r,1);ring.material.opacity=ring.userData.alpha*waveAmp*0.5;});

    // Grid particle deformation (+ or × polarisation)
    const h=waveAmp*Math.sin(t*orbSpeed*freqScale*2)*Math.max(0,1-orbitR/60)*1.2;
    for(let i=0;i<ringMeshes.length;i++){
      const bx=ringBaseX[i],bz=ringBaseZ[i];
      const dist=Math.sqrt(bx*bx+bz*bz),phaseDist=dist*0.04;
      const wave=waveAmp*Math.sin(t*orbSpeed*freqScale*2-phaseDist)*(merged?0:1)*(1+waveAmp*0.3);
      if(polarisation==='plus'){
        ringMeshes[i].position.x=bx+bx*wave*0.12;
        ringMeshes[i].position.z=bz-bz*wave*0.12;
      } else {
        ringMeshes[i].position.x=bx+bz*wave*0.12;
        ringMeshes[i].position.z=bz+bx*wave*0.12;
      }
      const heat=Math.min(1,Math.abs(wave)*0.8);
      ringMeshes[i].material.color.setRGB(0.1+heat*0.4,0.25+heat*0.3,0.6+heat*0.2);
    }

    drawOverlay(t,orbSpeed,h);

    camera.position.x=camR*Math.sin(phi)*Math.sin(theta);
    camera.position.y=camR*Math.cos(phi);
    camera.position.z=camR*Math.sin(phi)*Math.cos(theta);
    camera.lookAt(0,0,0);
    renderer.render(scene,camera);
  }

  resize();window.addEventListener('resize',resize);
  animate();
  window._simCleanup=()=>{running=false;renderer.dispose();[ovCanvas].forEach(el=>{if(el.parentNode)el.parentNode.removeChild(el);});window.removeEventListener('resize',resize);window.removeEventListener('resize',resizeOv);};
})();
