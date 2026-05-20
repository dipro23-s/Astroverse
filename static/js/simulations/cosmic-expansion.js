/* AstroVerse v6 — Cosmic Expansion: Hubble law, expanding universe, CMB */
(function(){
  'use strict';
  const canvas=document.getElementById('simCanvas');
  const wrap=document.getElementById('simCanvasWrap');
  if(!canvas||!wrap)return;
  const ctx=canvas.getContext('2d');
  let W,H,running=true;
  function resize(){W=canvas.width=wrap.clientWidth;H=canvas.height=wrap.clientHeight||600;}
  resize();window.addEventListener('resize',resize);

  let H0=67.4,t=0,speed=1,paused=false,showVelocity=true,showHubble=true;
  let scaleFactor=1.0; // a(t) — normalised at today=1

  // Fixed comoving positions of galaxies
  const N_GAL=55;
  const galaxies=[];
  for(let i=0;i<N_GAL;i++){
    const r=20+Math.random()*0.95;
    const a=Math.random()*Math.PI*2;
    galaxies.push({
      comX:(Math.random()-0.5)*0.9,comY:(Math.random()-0.5)*0.9,
      hue:180+Math.random()*60,
      r:Math.random()*2.5+1.2,
      name:i===0?'WE ARE HERE':''
    });
  }
  galaxies[Math.floor(N_GAL/2)].name='WE ARE HERE';

  // Hubble graph data
  const hubbleData=[];

  const infoEl=document.getElementById('simInfo');
  if(infoEl)infoEl.innerHTML=`
    <div class="sim-info-title">🌌 COSMIC EXPANSION</div>
    <div class="sim-info-text">
      The universe is <b>expanding</b> — all galaxies recede from each other. It's not galaxies moving through space; it's space itself stretching.<br><br>
      <b style="color:#38BDF8">Hubble-Lemaître Law:</b><br>
      <span style="font-family:'Share Tech Mono';font-size:.72rem;color:#38BDF8">v = H₀ × d</span><br><br>
      H₀ = 67.4 km/s/Mpc (Planck 2018)<br><br>
      <div style="background:rgba(56,189,248,.07);padding:.5rem;border-radius:4px;font-family:'Share Tech Mono';font-size:.62rem;color:#38BDF8;line-height:1.7">
        H(t) = ȧ/a  (Hubble parameter)<br>
        Scale factor: a(t=now) = 1<br>
        z = 1/a - 1  (redshift)<br>
        t_H = 1/H₀ ≈ 13.8 Gyr
      </div>
      <br>
      <div style="background:rgba(252,211,77,.07);border:1px solid rgba(252,211,77,.2);border-radius:4px;padding:.5rem;font-family:'Share Tech Mono';font-size:.58rem;color:rgba(252,211,77,.7);line-height:1.5">
        ◈ DISCLAIMER: Recessional velocities can exceed c for distant galaxies — this does not violate special relativity as it is the metric expansion of space, not motion through space.
      </div>
    </div>`;

  const ctrlEl=document.getElementById('simControls');
  if(ctrlEl){
    ctrlEl.innerHTML=`
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">HUBBLE CONSTANT H₀ <span id="ceHV">67.4</span> km/s/Mpc</div>
        <input type="range" min="20" max="120" step="0.5" value="67.4" id="ceH"/></div>
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">EXPANSION SPEED <span id="ceSV">1.0×</span></div>
        <input type="range" min="0" max="5" step="0.1" value="1" id="ceS"/></div>
      <button class="sim-btn" id="cePause">⏸ PAUSE</button>
      <button class="sim-btn" id="ceVel">VELOCITY ARROWS: ON</button>
      <button class="sim-btn" id="ceHub">HUBBLE PLOT: ON</button>
      <button class="sim-btn" onclick="scaleFactor=1;t=0;hubbleData.length=0">↺ RESET</button>
      <div style="margin-top:.6rem;padding:.55rem;background:rgba(56,189,248,.05);border:1px solid rgba(56,189,248,.2);border-radius:4px;font-family:'Share Tech Mono';font-size:.58rem;color:rgba(56,189,248,.7);line-height:1.6" id="ceStats">
        a(t) = 1.000<br>z = 0.000<br>H = 67.4 km/s/Mpc
      </div>`;
    document.getElementById('ceH').oninput=e=>{H0=+e.target.value;document.getElementById('ceHV').textContent=H0.toFixed(1);};
    document.getElementById('ceS').oninput=e=>{speed=+e.target.value;document.getElementById('ceSV').textContent=speed.toFixed(1)+'×';};
    document.getElementById('cePause').onclick=e=>{paused=!paused;e.target.textContent=paused?'▶ RESUME':'⏸ PAUSE';};
    document.getElementById('ceVel').onclick=e=>{showVelocity=!showVelocity;e.target.textContent='VELOCITY ARROWS: '+(showVelocity?'ON':'OFF');};
    document.getElementById('ceHub').onclick=e=>{showHubble=!showHubble;e.target.textContent='HUBBLE PLOT: '+(showHubble?'ON':'OFF');};
  }

  let lastT=performance.now();
  function animate(){
    if(!running)return;
    requestAnimationFrame(animate);
    const now=performance.now();const dt=Math.min((now-lastT)/1000,0.04);lastT=now;

    ctx.fillStyle='#000610';ctx.fillRect(0,0,W,H);

    const mainH=showHubble?H*0.65:H;
    const cx=W/2,cy=mainH/2;
    const viewScale=Math.min(cx,cy)*0.9;

    // CMB glow (background radiation - shown as faint gradient)
    const cmbR=(scaleFactor-1)*viewScale*0.6+viewScale*1.1;
    const cmb=ctx.createRadialGradient(cx,cy,0,cx,cy,cmbR);
    cmb.addColorStop(0,'transparent');
    cmb.addColorStop(0.85,'transparent');
    cmb.addColorStop(1,`rgba(255,${Math.round(100/scaleFactor)},${Math.round(50/scaleFactor)},0.06)`);
    ctx.fillStyle=cmb;ctx.fillRect(0,0,W,mainH);

    // Grid of comoving coords
    ctx.strokeStyle='rgba(20,50,100,0.2)';ctx.lineWidth=0.5;
    for(let i=-4;i<=4;i++){
      const x=cx+i*viewScale*scaleFactor*0.22;const y=cy+i*viewScale*scaleFactor*0.22;
      ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,mainH);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
    }

    // Galaxies
    galaxies.forEach(g=>{
      const px=cx+g.comX*viewScale*scaleFactor;
      const py=cy+g.comY*viewScale*scaleFactor;
      if(g.name==='WE ARE HERE'){
        ctx.beginPath();ctx.arc(px,py,8,0,Math.PI*2);ctx.strokeStyle='rgba(56,189,248,0.8)';ctx.lineWidth=2;ctx.stroke();
        ctx.fillStyle='rgba(56,189,248,0.9)';ctx.font='9px "Share Tech Mono"';ctx.fillText(g.name,px+12,py+4);
      } else {
        // Galaxy redshift colour: bluer=closer, redder=farther
        const dist=Math.sqrt(g.comX*g.comX+g.comY*g.comY)*scaleFactor;
        const redFrac=Math.min(1,dist*0.8);
        const glowR=ctx.createRadialGradient(px,py,0,px,py,g.r*3);
        glowR.addColorStop(0,`hsla(${g.hue-redFrac*80},70%,70%,0.6)`);glowR.addColorStop(1,'transparent');
        ctx.fillStyle=glowR;ctx.beginPath();ctx.arc(px,py,g.r*3,0,Math.PI*2);ctx.fill();
        ctx.beginPath();ctx.arc(px,py,g.r,0,Math.PI*2);ctx.fillStyle=`hsla(${g.hue-redFrac*80},60%,65%,0.9)`;ctx.fill();
        // Velocity arrows
        if(showVelocity){
          const vrec=H0*(dist*50)*0.0008*scaleFactor;
          const ang=Math.atan2(g.comY,g.comX);
          const arrowLen=Math.min(30,vrec*8);
          if(arrowLen>2){
            ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+Math.cos(ang)*arrowLen,py+Math.sin(ang)*arrowLen);
            ctx.strokeStyle=`hsla(${g.hue-redFrac*80},70%,65%,0.5)`;ctx.lineWidth=1;ctx.stroke();
          }
        }
      }
    });

    // Scale bar
    const scalePx=viewScale*scaleFactor*0.1;
    ctx.strokeStyle='rgba(148,163,184,0.5)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(20,mainH-20);ctx.lineTo(20+scalePx,mainH-20);ctx.stroke();
    ctx.fillStyle='rgba(148,163,184,0.6)';ctx.font='8px "Share Tech Mono"';
    ctx.fillText(`${(scaleFactor*100).toFixed(0)} Mpc (scaled)`,24,mainH-24);

    // Stats
    const z=1/scaleFactor-1;
    const el=document.getElementById('ceStats');
    if(el)el.innerHTML=`a(t) = ${scaleFactor.toFixed(3)}<br>z = ${z.toFixed(3)}<br>H = ${(H0/scaleFactor).toFixed(1)} km/s/Mpc`;

    // Hubble diagram (bottom panel)
    if(showHubble){
      const hY=mainH+10,hH=H-mainH-14;
      ctx.fillStyle='rgba(1,6,20,0.9)';ctx.fillRect(0,hY,W,hH);
      ctx.strokeStyle='rgba(56,100,180,0.35)';ctx.lineWidth=1;ctx.strokeRect(1,hY+1,W-2,hH-2);
      ctx.fillStyle='rgba(56,189,248,0.5)';ctx.font='8px "Share Tech Mono"';ctx.fillText('HUBBLE DIAGRAM: RECESSION VELOCITY vs DISTANCE',10,hY+12);
      // Plot galaxies
      const maxD=viewScale*scaleFactor*0.9/viewScale*500;
      galaxies.filter(g=>g.name!=='WE ARE HERE').forEach(g=>{
        const dist=Math.sqrt(g.comX*g.comX+g.comY*g.comY)*scaleFactor*500;
        const vrec=H0*dist;
        const gx=50+dist/maxD*(W-70);const gy=hY+hH-20-vrec/(H0*maxD)*(hH-30);
        if(gy>hY+14&&gy<hY+hH-5){
          ctx.beginPath();ctx.arc(gx,gy,2.5,0,Math.PI*2);
          const rf=Math.min(1,dist/maxD);
          ctx.fillStyle=`rgba(${Math.round(100+rf*155)},${Math.round(150-rf*100)},${Math.round(255-rf*200)},0.7)`;ctx.fill();
        }
      });
      // Hubble line
      ctx.beginPath();ctx.moveTo(50,hY+hH-20);ctx.lineTo(W-20,hY+14);
      ctx.strokeStyle='rgba(56,189,248,0.4)';ctx.lineWidth=1.5;ctx.stroke();
      ctx.fillStyle='rgba(252,211,77,0.6)';ctx.fillText(`v = H₀ × d  (H₀=${H0.toFixed(0)} km/s/Mpc)`,W-240,hY+hH-6);
    }

    if(!paused){
      t+=dt*speed;
      scaleFactor=Math.max(0.05,1+t*(H0/3000)*0.025);
      // Collect Hubble data
      if(Math.floor(t*10)>hubbleData.length)hubbleData.push({a:scaleFactor,H:H0/scaleFactor});
    }
  }
  animate();
  window._simCleanup=()=>{running=false;window.removeEventListener('resize',resize);};
})();
