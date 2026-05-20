/* AstroVerse v6 — Exoplanet Transit Method with live light curve */
(function(){
  'use strict';
  const canvas=document.getElementById('simCanvas');
  const wrap=document.getElementById('simCanvasWrap');
  if(!canvas||!wrap)return;
  const ctx=canvas.getContext('2d');
  let W,H,running=true;
  function resize(){W=canvas.width=wrap.clientWidth;H=canvas.height=wrap.clientHeight||600;}
  resize();window.addEventListener('resize',resize);

  let speed=1,planetR=0.15,orbitInclination=0,showAtm=true,paused=false;
  const STAR_TYPES={
    'M Dwarf':{R:0.3,T:3200,col:'#FF5533',L:0.04,hzIn:0.15,hzOut:0.35,habScore:65},
    'K-type': {R:0.7,T:4500,col:'#FF9944',L:0.4,hzIn:0.5,hzOut:0.9,habScore:72},
    'G-type (Sun)':{R:1.0,T:5778,col:'#FFD700',L:1.0,hzIn:0.95,hzOut:1.7,habScore:80},
    'F-type': {R:1.3,T:7000,col:'#FFFDE7',L:3.0,hzIn:1.5,hzOut:2.8,habScore:55},
    'A-type': {R:1.8,T:9000,col:'#C8DCFF',L:14.0,hzIn:3.5,hzOut:7.0,habScore:15},
  };
  let starType='G-type (Sun)';let t=0;
  const ATM={
    'N₂/O₂ (Earth-like)':{col:'rgba(80,140,255,0.22)',habAdd:15},
    'CO₂ (Venus-like)':{col:'rgba(200,80,50,0.22)',habAdd:-25},
    'CH₄ (Titan-like)':{col:'rgba(180,200,80,0.22)',habAdd:0},
    'None':{col:'rgba(60,60,60,0.1)',habAdd:-40},
  };
  let atmType='N₂/O₂ (Earth-like)';
  const lcData=[];let orbitAU=1.0;

  // Info
  const infoEl=document.getElementById('simInfo');
  if(infoEl)infoEl.innerHTML=`
    <div class="sim-info-title">🌠 EXOPLANET TRANSIT</div>
    <div class="sim-info-text">
      The <b>transit method</b> detects exoplanets by measuring the dimming of starlight as a planet crosses in front.<br><br>
      <div style="background:rgba(56,189,248,.07);padding:.5rem;border-radius:4px;font-family:'Share Tech Mono';font-size:.62rem;color:#38BDF8;line-height:1.7">
        ΔF/F = (R_p/R_*)²<br>
        Earth transit dims Sun by 0.0084%<br>
        Jupiter dims by 1.1%<br>
        Transit duration ≈ 13h (Earth)
      </div>
      <br>
      <b style="color:#4ADE80">Green band</b>: Habitable Zone<br>
      The light curve dips when the planet transits.<br><br>
      <div style="background:rgba(252,211,77,.07);border:1px solid rgba(252,211,77,.2);border-radius:4px;padding:.5rem;font-family:'Share Tech Mono';font-size:.58rem;color:rgba(252,211,77,.7);line-height:1.5">
        ◈ WHAT IS HAPPENING?<br><span style="color:#94A3B8">Watch the light curve at the bottom. Each dip indicates a transit — this is exactly how Kepler detected 2,600+ exoplanets.</span>
      </div>
    </div>`;

  const ctrlEl=document.getElementById('simControls');
  if(ctrlEl){
    ctrlEl.innerHTML=`
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">STAR TYPE</div>
        <select id="etStar" style="width:100%;background:rgba(5,12,30,.9);border:1px solid rgba(99,179,237,.2);border-radius:4px;padding:.35rem;color:#E2E8F0;font-size:.72rem;margin-top:.2rem">
          ${Object.keys(STAR_TYPES).map(s=>`<option${s===starType?' selected':''}>${s}</option>`).join('')}
        </select></div>
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">ATMOSPHERE</div>
        <select id="etAtm" style="width:100%;background:rgba(5,12,30,.9);border:1px solid rgba(99,179,237,.2);border-radius:4px;padding:.35rem;color:#E2E8F0;font-size:.72rem;margin-top:.2rem">
          ${Object.keys(ATM).map(a=>`<option>${a}</option>`).join('')}
        </select></div>
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">PLANET RADIUS <span id="etPRV">0.15 R*</span></div>
        <input type="range" min="0.03" max="0.35" step="0.01" value="0.15" id="etPR"/></div>
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">ORBIT DISTANCE <span id="etODV">1.0 AU</span></div>
        <input type="range" min="0.1" max="5" step="0.05" value="1" id="etOD"/></div>
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">ORBITAL SPEED <span id="etSPV">1.0×</span></div>
        <input type="range" min="0" max="5" step="0.1" value="1" id="etSP"/></div>
      <button class="sim-btn" id="etPause">⏸ PAUSE</button>
      <button class="sim-btn" id="etAtmBtn">ATMOSPHERE: ON</button>
      <div style="margin-top:.6rem;padding:.5rem;background:rgba(56,189,248,.05);border:1px solid rgba(56,189,248,.2);border-radius:4px;font-family:'Share Tech Mono';font-size:.58rem;color:rgba(56,189,248,.7);line-height:1.5" id="etHab">HABITABILITY: --/100</div>`;
    document.getElementById('etStar').onchange=e=>{starType=e.target.value;lcData.length=0;};
    document.getElementById('etAtm').onchange=e=>{atmType=e.target.value;};
    document.getElementById('etPR').oninput=e=>{planetR=+e.target.value;document.getElementById('etPRV').textContent=planetR.toFixed(2)+' R*';};
    document.getElementById('etOD').oninput=e=>{orbitAU=+e.target.value;document.getElementById('etODV').textContent=orbitAU.toFixed(2)+' AU';};
    document.getElementById('etSP').oninput=e=>{speed=+e.target.value;document.getElementById('etSPV').textContent=speed.toFixed(1)+'×';};
    document.getElementById('etPause').onclick=e=>{paused=!paused;e.target.textContent=paused?'▶ RESUME':'⏸ PAUSE';};
    document.getElementById('etAtmBtn').onclick=e=>{showAtm=!showAtm;e.target.textContent='ATMOSPHERE: '+(showAtm?'ON':'OFF');};
  }

  const lcH=120;
  function animate(){
    if(!running)return;
    requestAnimationFrame(animate);
    const st=STAR_TYPES[starType]||STAR_TYPES['G-type (Sun)'];
    const atm=ATM[atmType];

    if(!paused)t+=0.008*speed;

    ctx.fillStyle='#000812';ctx.fillRect(0,0,W,H);
    const mainH=H-lcH-10;
    const cx=W*0.35,cy=mainH/2;

    // Stars background
    if(!animate._stars){animate._stars=[];for(let i=0;i<150;i++)animate._stars.push({x:Math.random(),y:Math.random(),s:Math.random()*.7+.2});}
    animate._stars.forEach(s=>{ctx.beginPath();ctx.arc(s.x*W,s.y*mainH,s.s,0,Math.PI*2);ctx.fillStyle='rgba(200,220,255,0.35)';ctx.fill();});

    // Habitable zone ring
    const pixAU=Math.min(cx,mainH/2)/2.5;
    const hzIn=st.hzIn*pixAU,hzOut=st.hzOut*pixAU;
    ctx.beginPath();ctx.arc(cx,cy,hzIn,0,Math.PI*2);
    ctx.strokeStyle='rgba(74,222,128,0.15)';ctx.lineWidth=hzOut-hzIn;ctx.stroke();
    ctx.beginPath();ctx.arc(cx,cy,hzIn,0,Math.PI*2);ctx.strokeStyle='rgba(74,222,128,0.4)';ctx.lineWidth=1;ctx.stroke();
    ctx.beginPath();ctx.arc(cx,cy,hzOut,0,Math.PI*2);ctx.strokeStyle='rgba(74,222,128,0.4)';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='rgba(74,222,128,0.35)';ctx.font='8px "Share Tech Mono"';ctx.fillText('HABITABLE ZONE',cx+hzIn+4,cy-3);

    // Star glow
    const sR=st.R*38;
    const sg=ctx.createRadialGradient(cx,cy,0,cx,cy,sR*2.5);
    sg.addColorStop(0,st.col+'FF');sg.addColorStop(0.5,st.col+'60');sg.addColorStop(1,'transparent');
    ctx.fillStyle=sg;ctx.beginPath();ctx.arc(cx,cy,sR*2.5,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(cx,cy,sR,0,Math.PI*2);ctx.fillStyle=st.col;ctx.fill();

    // Planet orbit
    const oR=orbitAU*pixAU;
    ctx.beginPath();ctx.arc(cx,cy,oR,0,Math.PI*2);ctx.strokeStyle='rgba(56,189,248,0.12)';ctx.lineWidth=1;ctx.stroke();

    // Planet position
    const inclFrac=orbitInclination/90;
    const px=cx+Math.cos(t)*oR;
    const py=cy+Math.sin(t)*oR*(1-inclFrac*0.95);
    const pR=sR*planetR;

    // Transit: planet directly in front of star (cos(t) near 1, sin(t) near 0)
    const inFront=Math.sin(t)>-0.15&&Math.sin(t)<0.15&&Math.cos(t)>0;
    const dimFrac=inFront?Math.max(0,1-Math.abs(Math.sin(t))/0.15):0;
    const transitDepth=planetR*planetR; // ΔF/F = (Rp/R*)²
    const brightness=1-dimFrac*transitDepth*6;

    // Planet atmosphere
    if(showAtm){
      const ag=ctx.createRadialGradient(px,py,pR*0.9,px,py,pR*2.2);
      ag.addColorStop(0,atm.col.replace('0.22','0.4'));ag.addColorStop(1,'transparent');
      ctx.fillStyle=ag;ctx.beginPath();ctx.arc(px,py,pR*2.2,0,Math.PI*2);ctx.fill();
    }
    ctx.beginPath();ctx.arc(px,py,pR,0,Math.PI*2);ctx.fillStyle='#6688BB';ctx.fill();

    // Star dimming overlay during transit
    if(brightness<1){
      const dimG=ctx.createRadialGradient(cx,cy,0,cx,cy,sR);
      dimG.addColorStop(0,`rgba(0,0,0,${(1-brightness)*0.8})`);dimG.addColorStop(1,'transparent');
      ctx.fillStyle=dimG;ctx.beginPath();ctx.arc(cx,cy,sR,0,Math.PI*2);ctx.fill();
    }

    // Info labels
    ctx.fillStyle='rgba(148,163,184,0.6)';ctx.font='9px "Share Tech Mono"';
    ctx.fillText(`STAR: ${starType}  T=${st.T}K  R=${st.R}R☉`,10,15);
    ctx.fillText(`PLANET R=${planetR.toFixed(2)}R*  ORBIT=${orbitAU}AU  ${inFront?'◈ TRANSIT DETECTED':''}`,10,27);
    ctx.fillText(`FLUX DIP: ${(transitDepth*100).toFixed(3)}%  BRIGHTNESS: ${(brightness*100).toFixed(1)}%`,10,39);

    // Light curve (bottom panel)
    lcData.push(brightness);if(lcData.length>W-20)lcData.shift();
    const lcY=mainH+10,lcBG=mainH+10;
    ctx.fillStyle='rgba(1,6,20,0.9)';ctx.fillRect(0,lcBG,W,lcH);
    ctx.strokeStyle='rgba(56,100,180,0.35)';ctx.lineWidth=1;ctx.strokeRect(1,lcBG+1,W-2,lcH-2);
    ctx.fillStyle='rgba(56,189,248,0.5)';ctx.font='8px "Share Tech Mono"';
    ctx.fillText('LIGHT CURVE — STELLAR FLUX  (transit dips)',10,lcBG+12);
    // Baseline
    const baseY=lcBG+lcH-20;const scale=60;
    ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(10,baseY);ctx.lineTo(W-10,baseY);ctx.stroke();
    ctx.beginPath();
    lcData.forEach((v,i)=>{const lx=i+10,ly=baseY-(v-0.5)*scale*2;i===0?ctx.moveTo(lx,ly):ctx.lineTo(lx,ly);});
    ctx.strokeStyle=inFront?'#FB923C':'#38BDF8';ctx.lineWidth=1.5;ctx.stroke();
    if(inFront){ctx.fillStyle='rgba(251,146,60,0.6)';ctx.font='9px "Share Tech Mono"';ctx.fillText('⬇ TRANSIT DIP',W/2-40,baseY-22);}
    ctx.fillStyle='rgba(148,163,184,0.5)';ctx.font='8px "Share Tech Mono"';ctx.fillText('1.0',W-30,baseY-2);ctx.fillText('TIME →',W-55,lcBG+lcH-6);

    // Habitability
    const hab=Math.min(100,Math.max(0,Math.round(st.habScore+atm.habAdd+(orbitAU>=st.hzIn&&orbitAU<=st.hzOut?20:-30))));
    const habEl=document.getElementById('etHab');
    if(habEl){habEl.textContent=`HABITABILITY SCORE: ${hab}/100`;habEl.style.color=hab>65?'#4ADE80':hab>35?'#FCD34D':'#F87171';}
  }
  animate();
  window._simCleanup=()=>{running=false;window.removeEventListener('resize',resize);};
})();
