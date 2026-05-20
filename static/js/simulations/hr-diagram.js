/* AstroVerse v6 — Hertzsprung-Russell Diagram (interactive, draggable stars) */
(function(){
  'use strict';
  const canvas=document.getElementById('simCanvas');
  const wrap=document.getElementById('simCanvasWrap');
  if(!canvas||!wrap)return;
  const ctx=canvas.getContext('2d');
  let W,H,running=true;
  function resize(){W=canvas.width=wrap.clientWidth;H=canvas.height=wrap.clientHeight||600;}
  resize();window.addEventListener('resize',resize);

  // Temp (K) → colour  
  function tempToRGB(T){
    if(T>30000)return'#9BB0FF';if(T>10000)return'#AABFFF';if(T>7500)return'#CAD7FF';
    if(T>6000)return'#F8F7FF';if(T>5000)return'#FFD2A1';if(T>3700)return'#FFCC6F';return'#FF4500';
  }

  const STAR_CLASSES=[
    {cls:'O',Tmin:30000,Tmax:50000,label:'O — Blue',ex:'Eta Carinae'},
    {cls:'B',Tmin:10000,Tmax:30000,label:'B — Blue-White',ex:'Rigel'},
    {cls:'A',Tmin:7500,Tmax:10000,label:'A — White',ex:'Sirius A'},
    {cls:'F',Tmin:6000,Tmax:7500,label:'F — Yellow-White',ex:'Procyon'},
    {cls:'G',Tmin:5000,Tmax:6000,label:'G — Yellow',ex:'Sun'},
    {cls:'K',Tmin:3700,Tmax:5000,label:'K — Orange',ex:'Arcturus'},
    {cls:'M',Tmin:2400,Tmax:3700,label:'M — Red',ex:'Betelgeuse'},
  ];

  // Pre-populated HR stars
  const stars=[
    {name:'Sun',T:5778,L:1,type:'MS',dragging:false},
    {name:'Sirius A',T:9940,L:25,type:'MS',dragging:false},
    {name:'Rigel',T:12100,L:120000,type:'SG',dragging:false},
    {name:'Betelgeuse',T:3500,L:100000,type:'RSG',dragging:false},
    {name:'Procyon B',T:7740,L:0.0006,type:'WD',dragging:false},
    {name:'Arcturus',T:4286,L:170,type:'RG',dragging:false},
    {name:'Vega',T:9602,L:40,type:'MS',dragging:false},
    {name:'Alpha Cen A',T:5790,L:1.5,type:'MS',dragging:false},
    {name:'Barnard\'s Star',T:3134,L:0.00035,type:'MS',dragging:false},
    {name:'Deneb',T:8525,L:200000,type:'SG',dragging:false},
    {name:'Eta Carinae',T:25000,L:5000000,type:'SG',dragging:false},
    {name:'White Dwarf',T:20000,L:0.001,type:'WD',dragging:false},
    {name:'Red Dwarf',T:2800,L:0.002,type:'MS',dragging:false},
  ];

  // Add random MS stars
  for(let i=0;i<40;i++){const T=2400+Math.random()*47600;const L=Math.pow(T/5778,4)*Math.pow(Math.random()*1.2+0.5,3);stars.push({name:'',T,L,type:'MS',dragging:false});}

  // Convert T,L to screen x,y
  function toScreen(T,L){
    // x: log T, high T on left (standard HR)
    const logTmin=Math.log10(2000),logTmax=Math.log10(55000);
    const logT=Math.log10(T);
    const x=80+(1-(logT-logTmin)/(logTmax-logTmin))*(W-120);
    // y: log L, high L at top
    const logLmin=-4,logLmax=8;
    const logL=Math.log10(Math.max(0.00001,L));
    const y=30+(1-(logL-logLmin)/(logLmax-logLmin))*(H-80);
    return{x,y};
  }

  function fromScreen(sx,sy){
    const logTmin=Math.log10(2000),logTmax=Math.log10(55000);
    const fracX=1-(sx-80)/(W-120);const logT=logTmin+(logTmax-logTmin)*fracX;
    const T=Math.pow(10,logT);
    const logLmin=-4,logLmax=8;
    const fracY=1-(sy-30)/(H-80);const logL=logLmin+(logLmax-logLmin)*fracY;
    const L=Math.pow(10,logL);
    return{T:Math.max(2000,Math.min(55000,T)),L:Math.max(0.00001,L)};
  }

  function classifyRegion(T,L){
    const logL=Math.log10(Math.max(0.00001,L));
    if(logL>4&&T>5000)return'SUPERGIANT';
    if(logL>1.5&&T<5500)return'RED GIANT';
    if(logL<-1.5)return'WHITE DWARF';
    const msL=Math.pow(T/5778,4);
    if(Math.abs(Math.log10(Math.max(0.00001,L))-Math.log10(Math.max(0.00001,msL)))<1.2)return'MAIN SEQUENCE';
    return'SUBGIANT';
  }

  let hoveredStar=null,selectedStar=null;

  canvas.addEventListener('mousedown',e=>{
    const rect=canvas.getBoundingClientRect();const mx=e.clientX-rect.left,my=e.clientY-rect.top;
    stars.forEach(s=>{const sc=toScreen(s.T,s.L);if(Math.hypot(mx-sc.x,my-sc.y)<8+s.name.length*.5){s.dragging=true;selectedStar=s;}});
  });
  canvas.addEventListener('mousemove',e=>{
    const rect=canvas.getBoundingClientRect();const mx=e.clientX-rect.left,my=e.clientY-rect.top;
    hoveredStar=null;
    stars.forEach(s=>{
      if(s.dragging){const{T,L}=fromScreen(mx,my);s.T=T;s.L=L;}
      else{const sc=toScreen(s.T,s.L);if(Math.hypot(mx-sc.x,my-sc.y)<10)hoveredStar=s;}
    });
  });
  window.addEventListener('mouseup',()=>{stars.forEach(s=>s.dragging=false);});
  canvas.addEventListener('dblclick',e=>{
    const rect=canvas.getBoundingClientRect();const{T,L}=fromScreen(e.clientX-rect.left,e.clientY-rect.top);
    stars.push({name:'New Star',T,L,type:'MS',dragging:false});
  });

  const infoEl=document.getElementById('simInfo');
  if(infoEl)infoEl.innerHTML=`
    <div class="sim-info-title">📈 H-R DIAGRAM</div>
    <div class="sim-info-text">
      The Hertzsprung-Russell diagram plots stellar luminosity vs. surface temperature.<br><br>
      <b style="color:#38BDF8">Main Sequence:</b> Stars fusing hydrogen — diagonal band.<br>
      <b style="color:#FB923C">Giants/Supergiants:</b> Evolved, expanded stars (upper right).<br>
      <b style="color:#94A3B8">White Dwarfs:</b> Dense stellar remnants (lower left).<br><br>
      <div style="background:rgba(56,189,248,.07);padding:.5rem;border-radius:4px;font-family:'Share Tech Mono';font-size:.62rem;color:#38BDF8;line-height:1.7">
        L ∝ T⁴ × R²  (Stefan-Boltzmann)<br>
        L ∝ M³·⁵  (mass-luminosity)<br>
        t_MS ≈ 10 Gyr × (M/M☉)⁻²·⁵
      </div>
      <br>
      <b>Drag stars</b> to see region labels change.<br>
      <b>Double-click</b> to add a new star.
    </div>`;

  const ctrlEl=document.getElementById('simControls');
  if(ctrlEl)ctrlEl.innerHTML=`
    <div class="sim-ctrl-group"><div class="sim-ctrl-label">STELLAR CLASSES</div>
      ${STAR_CLASSES.map(c=>`<div style="display:flex;align-items:center;gap:.4rem;margin:.2rem 0"><div style="width:10px;height:10px;border-radius:50%;background:${tempToRGB((c.Tmin+c.Tmax)/2)};flex-shrink:0"></div><span style="font-family:'Share Tech Mono';font-size:.6rem;color:#94A3B8">${c.label}</span></div>`).join('')}
    </div>
    <div style="margin-top:.6rem;padding:.55rem;background:rgba(56,189,248,.05);border:1px solid rgba(56,189,248,.2);border-radius:4px;font-family:'Share Tech Mono';font-size:.58rem;color:rgba(56,189,248,.7);line-height:1.6" id="hrStarInfo">
      Hover a star for details
    </div>`;

  function animate(){
    if(!running)return;
    requestAnimationFrame(animate);
    ctx.fillStyle='#000a12';ctx.fillRect(0,0,W,H);

    // Region backgrounds
    function drawRegion(x1,y1,x2,y2,col,label){
      ctx.fillStyle=col;ctx.fillRect(x1,y1,x2-x1,y2-y1);
      ctx.fillStyle='rgba(255,255,255,0.12)';ctx.font='10px "Share Tech Mono"';ctx.fillText(label,x1+6,y1+16);
    }

    // Main sequence diagonal band
    ctx.save();
    const msPoints=[];for(let T=2500;T<=45000;T+=1000){const L=Math.pow(T/5778,4);const sc=toScreen(T,L);msPoints.push(sc);}
    ctx.beginPath();msPoints.forEach((p,i)=>i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));ctx.strokeStyle='rgba(100,160,255,0.15)';ctx.lineWidth=30;ctx.stroke();
    ctx.restore();

    // Grid
    const logLvals=[-4,-3,-2,-1,0,1,2,3,4,5,6,7];
    const logTvals=[Math.log10(3000),Math.log10(4000),Math.log10(5778),Math.log10(8000),Math.log10(15000),Math.log10(30000)];
    ctx.strokeStyle='rgba(56,100,150,0.18)';ctx.lineWidth=0.5;ctx.setLineDash([2,6]);
    logLvals.forEach(lL=>{const{y}=toScreen(5778,Math.pow(10,lL));ctx.beginPath();ctx.moveTo(75,y);ctx.lineTo(W-30,y);ctx.stroke();ctx.fillStyle='rgba(148,163,184,0.5)';ctx.font='8px "Share Tech Mono"';ctx.fillText(lL>=0?`10⁺${lL}`:`10${lL}`,8,y+4);});
    logTvals.forEach(lT=>{const T=Math.pow(10,lT);const{x}=toScreen(T,1);ctx.beginPath();ctx.moveTo(x,25);ctx.lineTo(x,H-45);ctx.stroke();ctx.fillStyle='rgba(148,163,184,0.5)';ctx.font='8px "Share Tech Mono"';ctx.fillText(Math.round(T)+'K',x-16,H-32);});
    ctx.setLineDash([]);

    // Axes labels
    ctx.fillStyle='rgba(148,163,184,0.8)';ctx.font='9px "Share Tech Mono"';
    ctx.save();ctx.translate(14,H/2);ctx.rotate(-Math.PI/2);ctx.fillText('LUMINOSITY (L/L☉)',0,0);ctx.restore();
    ctx.fillText('← HOT  SURFACE TEMPERATURE  COOL →',W/2-100,H-8);

    // Stars
    stars.forEach(s=>{
      const sc=toScreen(s.T,s.L);const r=s.name?7:3;
      const isHovered=s===hoveredStar||s===selectedStar;
      // Glow
      const grd=ctx.createRadialGradient(sc.x,sc.y,0,sc.x,sc.y,r*3);
      grd.addColorStop(0,tempToRGB(s.T)+'AA');grd.addColorStop(1,'transparent');
      ctx.fillStyle=grd;ctx.beginPath();ctx.arc(sc.x,sc.y,r*3,0,Math.PI*2);ctx.fill();
      // Star
      ctx.beginPath();ctx.arc(sc.x,sc.y,r,0,Math.PI*2);ctx.fillStyle=tempToRGB(s.T);ctx.fill();
      if(isHovered){ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;ctx.stroke();}
      // Label
      if(s.name){ctx.fillStyle='rgba(255,255,255,0.7)';ctx.font='8px "Share Tech Mono"';ctx.fillText(s.name,sc.x+r+3,sc.y+3);}
      // Hover info
      if(s===hoveredStar||s.dragging){
        const el=document.getElementById('hrStarInfo');
        if(el){const region=classifyRegion(s.T,s.L);const cls=STAR_CLASSES.find(c=>s.T>=c.Tmin&&s.T<=c.Tmax)||STAR_CLASSES[STAR_CLASSES.length-1];el.innerHTML=`<b style="color:${tempToRGB(s.T)}">${s.name||'Star'}</b><br>T=${s.T.toFixed(0)} K<br>L=${s.L.toFixed(4)} L☉<br>Class: ${cls.label}<br>Region: ${region}`;}
      }
    });

    // Title
    ctx.fillStyle='rgba(56,189,248,0.6)';ctx.font='bold 11px "Orbitron"';ctx.fillText('HERTZSPRUNG-RUSSELL DIAGRAM',85,18);
  }
  animate();
  window._simCleanup=()=>{running=false;window.removeEventListener('resize',resize);};
})();
