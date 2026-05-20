/* AstroVerse v6 — Kepler's Laws: elliptical orbit, equal areas, T²∝a³ */
(function(){
  'use strict';
  const canvas=document.getElementById('simCanvas');
  const wrap=document.getElementById('simCanvasWrap');
  if(!canvas||!wrap)return;
  const ctx=canvas.getContext('2d');
  let W,H,running=true;
  function resize(){W=canvas.width=wrap.clientWidth;H=canvas.height=wrap.clientHeight||600;}
  resize();window.addEventListener('resize',resize);

  let ecc=0.5,sma=120,speed=1,paused=false,showArea=true,showFocus=true;
  let M=0; // mean anomaly
  const areaSegments=[];let lastAreaT=0;
  const AREA_INTERVAL=0.35;

  function solveKepler(M,e){let E=M;for(let i=0;i<8;i++)E=E-(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));return E;}

  function getPos(M){
    const E=solveKepler(M,ecc);
    const ta=2*Math.atan2(Math.sqrt(1+ecc)*Math.sin(E/2),Math.sqrt(1-ecc)*Math.cos(E/2));
    const b=sma*Math.sqrt(1-ecc*ecc),c=sma*ecc;
    const r=sma*(1-ecc*Math.cos(E));
    return{x:Math.cos(ta)*r,y:Math.sin(ta)*r,r,ta,b,c,E};
  }

  const infoEl=document.getElementById('simInfo');
  if(infoEl)infoEl.innerHTML=`
    <div class="sim-info-title">📐 KEPLER'S LAWS</div>
    <div class="sim-info-text">
      <b style="color:#FCD34D">Law I — Ellipses:</b><br>
      Planets orbit the Sun in ellipses with the Sun at one focus.<br><br>
      <b style="color:#4ADE80">Law II — Equal Areas:</b><br>
      A line joining planet and Sun sweeps equal areas in equal times — planets move faster near perihelion.<br><br>
      <b style="color:#38BDF8">Law III — Harmonic:</b><br>
      <span style="font-family:'Share Tech Mono';font-size:.72rem">T² ∝ a³  (T²/a³ = const)</span><br><br>
      <div style="background:rgba(56,189,248,.07);padding:.5rem;border-radius:4px;font-family:'Share Tech Mono';font-size:.62rem;color:#38BDF8;line-height:1.7">
        e = c/a  (eccentricity)<br>
        r = a(1-e·cos E)  (Kepler eqn)<br>
        v_peri > v_apo  (conservation of L)<br>
        T = 2π√(a³/GM)
      </div>
      <br>
      <div id="klStatus" style="font-family:'Share Tech Mono';font-size:.68rem;color:#94A3B8;line-height:1.6">Adjust eccentricity and semi-major axis to explore.</div>
    </div>`;

  const ctrlEl=document.getElementById('simControls');
  if(ctrlEl){
    ctrlEl.innerHTML=`
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">ECCENTRICITY <span id="klEV">0.50</span></div>
        <input type="range" min="0" max="0.95" step="0.01" value="0.5" id="klE"/>
        <div style="display:flex;justify-content:space-between;font-family:'Share Tech Mono';font-size:.55rem;color:#475569;margin-top:.2rem"><span>circle</span><span>ellipse</span><span>parabolic</span></div>
      </div>
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">SEMI-MAJOR AXIS <span id="klAV">120</span></div>
        <input type="range" min="50" max="200" step="5" value="120" id="klA"/></div>
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">SPEED <span id="klSV">1.0×</span></div>
        <input type="range" min="0" max="5" step="0.1" value="1" id="klS"/></div>
      <button class="sim-btn" id="klPause">⏸ PAUSE</button>
      <button class="sim-btn" id="klArea">EQUAL AREAS: ON</button>
      <button class="sim-btn" id="klFocus">FOCI: ON</button>
      <button class="sim-btn" onclick="M=0;areaSegments.length=0">↺ RESET</button>
      <div style="margin-top:.6rem;padding:.55rem;background:rgba(56,189,248,.05);border:1px solid rgba(56,189,248,.2);border-radius:4px;font-family:'Share Tech Mono';font-size:.58rem;color:rgba(56,189,248,.7);line-height:1.6" id="klFormula">
        T² ∝ a³<br>v_peri / v_apo = r_apo / r_peri
      </div>`;
    document.getElementById('klE').oninput=e=>{ecc=+e.target.value;document.getElementById('klEV').textContent=ecc.toFixed(2);areaSegments.length=0;M=0;};
    document.getElementById('klA').oninput=e=>{sma=+e.target.value;document.getElementById('klAV').textContent=sma;areaSegments.length=0;M=0;};
    document.getElementById('klS').oninput=e=>{speed=+e.target.value;document.getElementById('klSV').textContent=speed.toFixed(1)+'×';};
    document.getElementById('klPause').onclick=e=>{paused=!paused;e.target.textContent=paused?'▶ RESUME':'⏸ PAUSE';};
    document.getElementById('klArea').onclick=e=>{showArea=!showArea;e.target.textContent='EQUAL AREAS: '+(showArea?'ON':'OFF');};
    document.getElementById('klFocus').onclick=e=>{showFocus=!showFocus;e.target.textContent='FOCI: '+(showFocus?'ON':'OFF');};
  }

  let lastT=performance.now();
  function animate(){
    if(!running)return;
    requestAnimationFrame(animate);
    const now=performance.now();const dt=Math.min((now-lastT)/1000,0.04);lastT=now;

    ctx.fillStyle='#000810';ctx.fillRect(0,0,W,H);

    const cx=W/2,cy=H/2;
    const p=getPos(M);
    const b=sma*Math.sqrt(1-ecc*ecc),c=sma*ecc;

    // Draw orbit ellipse
    ctx.save();ctx.translate(cx-c,cy);
    ctx.beginPath();ctx.ellipse(0,0,sma,b,0,0,Math.PI*2);
    ctx.strokeStyle='rgba(56,189,248,0.25)';ctx.lineWidth=1.5;ctx.stroke();
    ctx.restore();

    // Foci
    if(showFocus){
      // Sun focus (left)
      ctx.beginPath();ctx.arc(cx,cy,5,0,Math.PI*2);ctx.fillStyle='#FFD700';ctx.fill();
      // Empty focus (right)
      ctx.beginPath();ctx.arc(cx-2*c,cy,4,0,Math.PI*2);ctx.strokeStyle='rgba(148,163,184,0.4)';ctx.lineWidth=1.5;ctx.stroke();
      ctx.fillStyle='rgba(148,163,184,0.5)';ctx.font='9px "Share Tech Mono"';
      ctx.fillText('F₁ (Sun)',cx+8,cy-8);ctx.fillText('F₂',cx-2*c+6,cy-8);
      // Semi-major axis line
      ctx.beginPath();ctx.setLineDash([4,6]);ctx.moveTo(cx-c-sma,cy);ctx.lineTo(cx-c+sma,cy);ctx.strokeStyle='rgba(252,211,77,0.2)';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='rgba(252,211,77,0.5)';ctx.fillText('2a='+(sma*2).toFixed(0),cx-20,cy-8);
    }

    // Equal area segments
    if(showArea&&areaSegments.length>0){
      areaSegments.forEach(seg=>{
        ctx.beginPath();ctx.moveTo(cx,cy);
        seg.pts.forEach((pt,i)=>i===0?ctx.moveTo(cx+pt.x,cy+pt.y):ctx.lineTo(cx+pt.x,cy+pt.y));
        ctx.closePath();ctx.fillStyle=`hsla(${seg.hue},70%,55%,0.18)`;ctx.fill();
        ctx.strokeStyle=`hsla(${seg.hue},70%,55%,0.5)`;ctx.lineWidth=1;ctx.stroke();
      });
    }

    // Planet position
    const px=cx+p.x,py=cy+p.y;

    // Line from sun to planet
    ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(px,py);ctx.strokeStyle='rgba(56,189,248,0.3)';ctx.lineWidth=1;ctx.stroke();

    // Planet
    const pg=ctx.createRadialGradient(px,py,0,px,py,10);
    pg.addColorStop(0,'#88BBFF');pg.addColorStop(1,'rgba(70,120,255,0)');
    ctx.fillStyle=pg;ctx.beginPath();ctx.arc(px,py,14,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(px,py,6,0,Math.PI*2);ctx.fillStyle='#6699FF';ctx.fill();

    // Perihelion / aphelion markers
    const periX=cx+sma*(1-ecc),periY=cy;
    const apoX=cx-sma*(1+ecc),apoY=cy;
    ctx.fillStyle='rgba(251,146,60,0.7)';ctx.font='8px "Share Tech Mono"';
    ctx.fillText('PERIHELION',periX+8,periY-6);
    ctx.beginPath();ctx.arc(periX,periY,4,0,Math.PI*2);ctx.fillStyle='rgba(251,146,60,0.7)';ctx.fill();
    ctx.fillStyle='rgba(99,140,210,0.7)';ctx.font='8px "Share Tech Mono"';
    ctx.fillText('APHELION',apoX+8,apoY-6);
    ctx.beginPath();ctx.arc(apoX,apoY,4,0,Math.PI*2);ctx.fillStyle='rgba(99,140,210,0.7)';ctx.fill();

    // Velocity vector
    const vMag=Math.sqrt(1/p.r)*25;
    const vAng=p.ta+Math.PI/2;
    ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+Math.cos(vAng)*vMag,py+Math.sin(vAng)*vMag);
    ctx.strokeStyle='rgba(74,222,128,0.8)';ctx.lineWidth=2;
    const arrowAng=vAng;ctx.moveTo(px+Math.cos(arrowAng)*vMag,py+Math.sin(arrowAng)*vMag);
    ctx.lineTo(px+Math.cos(arrowAng-0.4)*(vMag-8),py+Math.sin(arrowAng-0.4)*(vMag-8));
    ctx.lineTo(px+Math.cos(arrowAng+0.4)*(vMag-8),py+Math.sin(arrowAng+0.4)*(vMag-8));
    ctx.stroke();
    ctx.fillStyle='rgba(74,222,128,0.7)';ctx.font='8px "Share Tech Mono"';ctx.fillText('v',px+Math.cos(vAng)*vMag+5,py+Math.sin(vAng)*vMag+4);

    // Kepler III info
    const T=2*Math.PI*Math.sqrt(Math.pow(sma/80,3));
    const vPeri=Math.sqrt(1/((sma*(1-ecc))+0.01))*300;
    const vApo=Math.sqrt(1/((sma*(1+ecc))+0.01))*300;
    const st=document.getElementById('klStatus');
    if(st)st.innerHTML=`e=${ecc.toFixed(2)}  a=${sma}  b=${b.toFixed(0)}<br>T=${T.toFixed(2)} yr  ·  a³/T²=${(Math.pow(sma/80,3)/T/T).toFixed(3)}<br>v_peri=${vPeri.toFixed(0)}  v_apo=${vApo.toFixed(0)} (rel)<br>r=${p.r.toFixed(1)}`;

    if(!paused){
      // Orbital speed via vis-viva: v²=GM(2/r - 1/a)
      const n=(2*Math.PI/Math.max(0.01,T))*speed*dt*3;
      M+=n;

      // Collect area segments
      lastAreaT+=dt*speed;
      if(lastAreaT>=AREA_INTERVAL){
        const NSEG=12;
        const segPts=[];
        for(let i=0;i<=20;i++){const Mp=M+i*(2*Math.PI/NSEG)/20;const pp=getPos(Mp);segPts.push({x:pp.x,y:pp.y});}
        areaSegments.push({pts:segPts,hue:(areaSegments.length*45)%360});
        if(areaSegments.length>8)areaSegments.shift();
        lastAreaT=0;
      }
    }

    // Labels
    ctx.fillStyle='rgba(56,189,248,0.6)';ctx.font='10px "Share Tech Mono"';ctx.fillText('KEPLER\'S LAWS — PLANETARY MOTION',10,18);
  }
  animate();
  window._simCleanup=()=>{running=false;window.removeEventListener('resize',resize);};
})();
