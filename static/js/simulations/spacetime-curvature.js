/* AstroVerse v6 — Spacetime Curvature: rubber-sheet analogy + geodesic particles */
(function(){
  'use strict';
  const canvas=document.getElementById('simCanvas');
  const wrap=document.getElementById('simCanvasWrap');
  if(!canvas||!wrap)return;
  const ctx=canvas.getContext('2d');
  let W,H;
  function resize(){W=canvas.width=wrap.clientWidth;H=canvas.height=wrap.clientHeight||600;}
  resize();window.addEventListener('resize',resize);

  let gravity=1.0,running=true;
  const masses=[];
  const particles=[];
  const GRID=28;

  // Default mass at centre
  setTimeout(()=>{masses.push({x:W/2,y:H/2,m:8,dragging:false});},80);

  // FPS
  const fpsC=document.createElement('canvas');fpsC.style.cssText='position:absolute;bottom:8px;right:8px;width:90px;height:28px;pointer-events:none;opacity:.6';fpsC.width=90;fpsC.height=28;wrap.appendChild(fpsC);
  const fpsCtx=fpsC.getContext('2d');let fpsN=0,fpsT=0,lastT=performance.now();
  function drawFPS(fps){fpsCtx.clearRect(0,0,90,28);const col=fps>50?'#4ADE80':fps>30?'#FCD34D':'#F87171';fpsCtx.fillStyle=col;fpsCtx.font='9px "Share Tech Mono"';fpsCtx.fillText('FPS: '+fps.toFixed(0),4,11);fpsCtx.fillStyle='rgba(255,255,255,0.1)';fpsCtx.fillRect(4,16,82,6);fpsCtx.fillStyle=col;fpsCtx.fillRect(4,16,Math.min(82,(fps/60)*82),6);}

  // Disclaimer
  const disc=document.createElement('div');
  disc.style.cssText='position:absolute;top:8px;left:50%;transform:translateX(-50%);font-family:"Share Tech Mono",monospace;font-size:8px;color:rgba(148,163,184,0.55);text-align:center;pointer-events:none;background:rgba(1,4,9,.6);padding:3px 8px;border-radius:3px;white-space:nowrap';
  disc.textContent='RUBBER-SHEET ANALOGY: A 2D projection — real spacetime is 4D. Grid shows potential wells, not geometry.';
  wrap.appendChild(disc);

  // Info
  const infoEl=document.getElementById('simInfo');
  if(infoEl)infoEl.innerHTML=`
    <div class="sim-info-title">🕸 SPACETIME CURVATURE</div>
    <div class="sim-info-text">
      Mass tells spacetime how to curve; spacetime tells matter how to move. — John Wheeler<br><br>
      <b>Click</b> to add a mass.<br>
      <b>Double-click</b> to launch a test particle (geodesic).<br>
      <b>Drag</b> a mass to reshape curvature.<br><br>
      <div style="background:rgba(56,189,248,.07);padding:.5rem;border-radius:4px;font-family:'Share Tech Mono';font-size:.62rem;color:#38BDF8;line-height:1.7">
        G_μν + Λg_μν = 8πG/c⁴ × T_μν<br>
        (Einstein Field Equations)<br><br>
        Newtonian: F = GMm/r²<br>
        Escape vel: v = √(2GM/r)
      </div>
      <br>
      <div style="background:rgba(248,113,113,.07);border:1px solid rgba(248,113,113,.2);border-radius:4px;padding:.5rem;font-family:'Share Tech Mono';font-size:.58rem;color:rgba(248,113,113,.75);line-height:1.5">
        ⚠ ANALOGY NOTE:<br>The rubber sheet is a teaching tool. Real spacetime curvature is described by a rank-2 tensor, not a surface depression. Time dilation and spatial curvature are both involved.
      </div>
    </div>`;

  const ctrlEl=document.getElementById('simControls');
  if(ctrlEl){
    ctrlEl.innerHTML=`
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">GRAVITY STRENGTH <span id="stGV">1.0</span></div>
        <input type="range" min="0.1" max="4" step="0.05" value="1" id="stG"/></div>
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">MASS SIZE <span id="stMV">8</span> M</div>
        <input type="range" min="1" max="25" step="0.5" value="8" id="stM"/></div>
      <button class="sim-btn" id="stAdd">+ ADD MASS</button>
      <button class="sim-btn" id="stReset">↺ CLEAR ALL</button>
      <div style="margin-top:.6rem;padding:.55rem;background:rgba(56,189,248,.05);border:1px solid rgba(56,189,248,.2);border-radius:4px;font-family:'Share Tech Mono';font-size:.58rem;color:rgba(56,189,248,.7);line-height:1.6">
        DBL-CLICK: launch particle<br>
        DRAG: move mass<br>
        SCROLL: over mass for size
      </div>`;
    document.getElementById('stG').oninput=e=>{gravity=+e.target.value;document.getElementById('stGV').textContent=gravity.toFixed(1);};
    document.getElementById('stM').oninput=e=>{document.getElementById('stMV').textContent=(+e.target.value).toFixed(0);};
    document.getElementById('stAdd').onclick=()=>{const m=+document.getElementById('stM').value;masses.push({x:Math.random()*W*0.6+W*0.2,y:Math.random()*H*0.6+H*0.2,m,dragging:false});};
    document.getElementById('stReset').onclick=()=>{masses.length=0;particles.length=0;setTimeout(()=>{masses.push({x:W/2,y:H/2,m:8,dragging:false});},50);};
  }

  // Mouse events
  let prevClick={x:0,y:0,t:0};
  canvas.addEventListener('mousedown',e=>{
    const rect=canvas.getBoundingClientRect();const mx=e.clientX-rect.left,my=e.clientY-rect.top;
    masses.forEach(m=>{if(Math.hypot(mx-m.x,my-m.y)<m.m*2.5+10)m.dragging=true;});
  });
  canvas.addEventListener('mousemove',e=>{
    const rect=canvas.getBoundingClientRect();
    masses.forEach(m=>{if(m.dragging){m.x=e.clientX-rect.left;m.y=e.clientY-rect.top;}});
  });
  window.addEventListener('mouseup',()=>masses.forEach(m=>m.dragging=false));
  canvas.addEventListener('dblclick',e=>{
    const rect=canvas.getBoundingClientRect();const mx=e.clientX-rect.left,my=e.clientY-rect.top;
    // Choose random orbit-ish velocity
    const ang=Math.random()*Math.PI*2;
    const spd=2.5+Math.random()*2.5;
    particles.push({x:mx,y:my,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,trail:[],alpha:1,hue:Math.random()*300});
  });

  function displace(px,py){
    let dx=0,dy=0;
    masses.forEach(m=>{
      const d=Math.max(Math.hypot(px-m.x,py-m.y),18);
      const force=m.m*1100*gravity/(d*d);
      const ang=Math.atan2(m.y-py,m.x-px);
      dx+=Math.cos(ang)*force;dy+=Math.sin(ang)*force;
    });
    return[Math.max(-55,Math.min(55,dx)),Math.max(-55,Math.min(55,dy))];
  }

  // Pre-compute displacement depth for colouring
  function depth(px,py){
    let d=0;masses.forEach(m=>{const r=Math.max(Math.hypot(px-m.x,py-m.y),15);d+=m.m*gravity*800/(r*r);});
    return Math.min(d,1.0);
  }

  let lastFrame=performance.now();
  function animate(){
    if(!running)return;
    requestAnimationFrame(animate);
    const now=performance.now();const dt=Math.min((now-lastFrame)/1000,0.04);lastFrame=now;
    fpsN++;fpsT+=dt;if(fpsT>0.5){drawFPS(fpsN/fpsT);fpsN=0;fpsT=0;}

    ctx.fillStyle='rgba(1,4,9,0.92)';ctx.fillRect(0,0,W,H);

    // Draw warped grid
    const cols=Math.ceil(W/GRID)+2,rows=Math.ceil(H/GRID)+2;
    for(let i=-1;i<cols;i++){
      for(let j=-1;j<rows;j++){
        const x0=i*GRID,y0=j*GRID;
        const[ax,ay]=displace(x0,y0);
        const[bx,by]=displace(x0+GRID,y0);
        const[cx2,cy2]=displace(x0,y0+GRID);
        const fdx=x0+ax,fdy=y0+ay,fex=x0+GRID+bx,fey=y0+by,ffx=x0+cx2,ffy=y0+GRID+cy2;

        // Depth-based colour: deeper = brighter blue
        const d=depth(x0+GRID/2,y0+GRID/2);
        const stressH=Math.min(1,Math.sqrt((fdx-fex)**2+(fdy-fey)**2)/GRID);
        const stressV=Math.min(1,Math.sqrt((fdx-ffx)**2+(fdy-ffy)**2)/GRID);

        ctx.beginPath();ctx.moveTo(fdx,fdy);ctx.lineTo(fex,fey);
        ctx.strokeStyle=`rgba(${Math.round(20+stressH*180)},${Math.round(80+d*100)},${Math.round(180+stressH*60)},${0.08+stressH*0.5+d*0.2})`;
        ctx.lineWidth=0.5+stressH*2.5+d*1.5;ctx.stroke();

        ctx.beginPath();ctx.moveTo(fdx,fdy);ctx.lineTo(ffx,ffy);
        ctx.strokeStyle=`rgba(${Math.round(20+stressV*180)},${Math.round(80+d*100)},${Math.round(180+stressV*60)},${0.08+stressV*0.5+d*0.2})`;
        ctx.lineWidth=0.5+stressV*2.5+d*1.5;ctx.stroke();
      }
    }

    // Geodesic particles
    particles.forEach((p,idx)=>{
      // Euler integration of geodesic in potential field
      masses.forEach(m=>{
        const d=Math.max(Math.hypot(p.x-m.x,p.y-m.y),15);
        const f=m.m*gravity*0.85/(d*d);
        const ang=Math.atan2(m.y-p.y,m.x-p.x);
        p.vx+=Math.cos(ang)*f;p.vy+=Math.sin(ang)*f;
      });
      p.vx*=0.9995;p.vy*=0.9995;
      p.x+=p.vx;p.y+=p.vy;
      p.trail.push({x:p.x,y:p.y});
      if(p.trail.length>50)p.trail.shift();
      if(p.x<-50||p.x>W+50||p.y<-50||p.y>H+50)p.alpha*=0.85;
      if(p.alpha<0.02){particles.splice(idx,1);return;}

      // Trail
      ctx.beginPath();
      p.trail.forEach((pt,i)=>{i===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y);});
      ctx.strokeStyle=`hsla(${p.hue},80%,65%,${p.alpha*0.5})`;ctx.lineWidth=1.5;ctx.stroke();
      ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);
      ctx.fillStyle=`hsla(${p.hue},90%,70%,${p.alpha})`;ctx.fill();
    });

    // Masses
    masses.forEach((m,i)=>{
      const r=Math.max(5,m.m*2.2);
      const g=ctx.createRadialGradient(m.x,m.y,0,m.x,m.y,r*2.5);
      g.addColorStop(0,'rgba(255,200,80,0.6)');g.addColorStop(0.4,'rgba(255,100,20,0.25)');g.addColorStop(1,'transparent');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(m.x,m.y,r*2.5,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(m.x,m.y,r,0,Math.PI*2);ctx.fillStyle='#FFF5DC';ctx.fill();
      ctx.fillStyle='rgba(56,189,248,0.75)';ctx.font='9px "Share Tech Mono"';
      ctx.fillText(`M${i+1}=${m.m.toFixed(0)}`,m.x+r+4,m.y-r-2);
    });

    // Hint
    ctx.fillStyle='rgba(148,163,184,0.35)';ctx.font='9px "Share Tech Mono"';
    ctx.fillText('DBL-CLICK: launch particle · DRAG mass to reshape · CLICK: add mass',10,H-10);
  }

  canvas.addEventListener('click',e=>{
    const rect=canvas.getBoundingClientRect();const mx=e.clientX-rect.left,my=e.clientY-rect.top;
    const hitMass=masses.some(m=>Math.hypot(mx-m.x,my-m.y)<m.m*2.5+10);
    if(!hitMass){const m2=+(document.getElementById('stM')?.value||8);masses.push({x:mx,y:my,m:m2,dragging:false});}
  });

  animate();
  window._simCleanup=()=>{running=false;[fpsC,disc].forEach(el=>{if(el.parentNode)el.parentNode.removeChild(el);});window.removeEventListener('resize',resize);};
})();
