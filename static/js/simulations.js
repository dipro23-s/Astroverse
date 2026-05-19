// ============================================================
// ASTROVERSE v5 — Complete Simulation Library
// All 10 simulations: Three.js + Canvas 2D
// ============================================================

// ── SHARED HELPERS ────────────────────────────────────────────
function getCanvas(){ return document.getElementById("simCanvas"); }
function getControls(){ return document.getElementById("simControls"); }
function getInfo(){ return document.getElementById("simInfo"); }

function simLayout(infoHTML, ctrlHTML){
  const info = getInfo(), ctrl = getControls();
  if(info) info.innerHTML = infoHTML;
  if(ctrl) ctrl.innerHTML = ctrlHTML;
}

function makeSlider(id, label, min, max, step, val, unit, onInput){
  return `<div class="sim-ctrl-group">
    <div class="sim-ctrl-label">${label} <span id="${id}Val">${val}${unit}</span></div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"
      oninput="document.getElementById('${id}Val').textContent=parseFloat(this.value).toFixed(step<1?1:0)+'${unit}';(${onInput.toString()})(+this.value)"/>
  </div>`;
}

let _currentAnimFrame = null;
function stopCurrentSim(){
  if(_currentAnimFrame){ cancelAnimationFrame(_currentAnimFrame); _currentAnimFrame = null; }
  // Dispose Three.js renderer if exists
  if(window._threeRenderer){ try{ window._threeRenderer.dispose(); }catch(e){} window._threeRenderer=null; }
}

// ============================================================
// 1. BLACK HOLE SIMULATION
// ============================================================
function buildBlackHoleSim(){
  stopCurrentSim();
  const canvas = getCanvas(); if(!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H, t=0, mass=1, spin=0.5, brightness=1, timeDilation=1;
  function resize(){ W=canvas.width=canvas.parentElement.offsetWidth; H=canvas.height=canvas.parentElement.offsetHeight; }
  resize(); window.addEventListener("resize",resize);

  // Star field
  const stars=[];
  for(let i=0;i<300;i++) stars.push({x:Math.random(),y:Math.random(),s:Math.random()*.8+.2,b:Math.random()*.7+.3});

  // Accretion disk particles
  const diskParticles=[];
  function resetDisk(){
    diskParticles.length=0;
    for(let i=0;i<350;i++){
      const r=1.6+Math.random()*2.2, a=Math.random()*Math.PI*2;
      const layer=Math.random()<.5?1:-1;
      diskParticles.push({
        r, a, baseR:r, speed:(0.008+Math.random()*.006)*(Math.random()>.5?1:-1),
        size:Math.random()*2.5+.5, alpha:Math.random()*.7+.3,
        hue:10+Math.random()*40, layer,
        drift:(Math.random()-.5)*.0002
      });
    }
  }
  resetDisk();

  simLayout(
    `<div class="sim-info-title">⚫ BLACK HOLE</div>
     <div class="sim-info-text">
       A black hole is a region where gravity is so strong that nothing — not even light — can escape.<br><br>
       <b style="color:#A855F7">Event Horizon</b>: The point of no return. Once crossed, escape is impossible.<br><br>
       <b style="color:#FB923C">Photon Sphere</b>: Where light orbits the black hole at r = 1.5 × r<sub>s</sub>.<br><br>
       <b style="color:#FCD34D">Accretion Disk</b>: Superheated matter spiraling inward, glowing at millions of Kelvin.
     </div>`,
    makeSlider("bhMass","MASS","0.3","4","0.1","1","M☉", v=>{mass=v;resetDisk();}) +
    makeSlider("bhSpin","SPIN","0","1","0.05","0.5","", v=>spin=v) +
    makeSlider("bhBright","BRIGHTNESS","0.2","2","0.1","1","×", v=>brightness=v) +
    makeSlider("bhTime","TIME DILATION","0.1","2","0.1","1","×", v=>timeDilation=v) +
    `<button class="sim-btn" onclick="window._bhReset&&window._bhReset()">↺ RESET DISK</button>`
  );
  window._bhReset = ()=>{ resetDisk(); t=0; };

  function draw(){
    _currentAnimFrame = requestAnimationFrame(draw);
    ctx.fillStyle="rgba(1,4,9,0.18)"; ctx.fillRect(0,0,W,H);
    const cx=W/2, cy=H/2;
    const rs = 30*mass; // Schwarzschild radius (visual)

    // Distorted starfield (lensing effect)
    stars.forEach(s=>{
      const sx=s.x*W, sy=s.y*H;
      const dx=sx-cx, dy=sy-cy;
      const d=Math.sqrt(dx*dx+dy*dy);
      const lensR=rs*4;
      let x=sx,y=sy;
      if(d<lensR&&d>rs*1.1){
        const bend=rs*rs*2.5/(d*d);
        const ang=Math.atan2(dy,dx);
        x=sx-Math.cos(ang)*bend*20;
        y=sy-Math.sin(ang)*bend*20;
      }
      const fade=d<lensR?Math.min(1,(d-rs*1.1)/(lensR-rs*1.1)):1;
      ctx.beginPath(); ctx.arc(x,y,s.s,0,Math.PI*2);
      ctx.fillStyle=`rgba(220,235,255,${s.b*fade*0.7})`; ctx.fill();
    });

    // Outer glow / relativistic jet
    const outerGlow=ctx.createRadialGradient(cx,cy,rs,cx,cy,rs*6);
    outerGlow.addColorStop(0,"rgba(255,100,20,0.08)");
    outerGlow.addColorStop(0.4,"rgba(255,50,10,0.03)");
    outerGlow.addColorStop(1,"transparent");
    ctx.fillStyle=outerGlow; ctx.fillRect(0,0,W,H);

    // Accretion disk particles (behind BH)
    ctx.save();
    ctx.translate(cx,cy);
    ctx.scale(1,0.35); // flatten to disk
    diskParticles.filter(p=>p.layer<0).forEach(p=>{
      p.a += p.speed*spin*2*timeDilation + p.drift;
      const pull=rs*rs*.04/(p.r*p.r)*mass;
      p.r-=pull; if(p.r<rs*.9){p.r=p.baseR+Math.random();p.a=Math.random()*Math.PI*2;}
      const x=Math.cos(p.a)*p.r*rs, y=Math.sin(p.a)*p.r*rs;
      const distFrac=1-(p.r-1.6)/2.2;
      const h=p.hue+distFrac*30;
      const l=30+distFrac*50;
      ctx.beginPath(); ctx.arc(x,y,p.size,0,Math.PI*2);
      ctx.fillStyle=`hsla(${h},90%,${l}%,${p.alpha*brightness})`;
      ctx.fill();
    });
    ctx.restore();

    // Photon sphere ring
    ctx.beginPath(); ctx.arc(cx,cy,rs*1.5,0,Math.PI*2);
    ctx.strokeStyle="rgba(200,160,255,0.25)"; ctx.lineWidth=1.5; ctx.stroke();

    // ISCO dashed ring
    ctx.beginPath(); ctx.arc(cx,cy,rs*3,0,Math.PI*2);
    ctx.strokeStyle="rgba(56,189,248,0.12)"; ctx.lineWidth=1;
    ctx.setLineDash([4,6]); ctx.stroke(); ctx.setLineDash([]);

    // Event horizon glow rim (blue/redshift)
    const rimGrad=ctx.createRadialGradient(cx,cy,rs*.6,cx,cy,rs*1.25);
    rimGrad.addColorStop(0,"rgba(0,0,0,1)");
    rimGrad.addColorStop(0.7,"rgba(60,10,120,0.8)");
    rimGrad.addColorStop(0.9,"rgba(180,80,255,0.4)");
    rimGrad.addColorStop(1,"rgba(56,189,248,0.2)");
    ctx.beginPath(); ctx.arc(cx,cy,rs*1.25,0,Math.PI*2);
    ctx.fillStyle=rimGrad; ctx.fill();

    // Black hole core
    ctx.beginPath(); ctx.arc(cx,cy,rs,0,Math.PI*2);
    ctx.fillStyle="#000"; ctx.fill();

    // Accretion disk particles (in front of BH)
    ctx.save();
    ctx.translate(cx,cy);
    ctx.scale(1,0.35);
    diskParticles.filter(p=>p.layer>0).forEach(p=>{
      p.a += p.speed*spin*2*timeDilation + p.drift;
      const pull=rs*rs*.04/(p.r*p.r)*mass;
      p.r-=pull; if(p.r<rs*.9){p.r=p.baseR+Math.random();p.a=Math.random()*Math.PI*2;}
      const x=Math.cos(p.a)*p.r*rs, y=Math.sin(p.a)*p.r*rs;
      const distFrac=1-(p.r-1.6)/2.2;
      const h=p.hue+distFrac*30;
      const l=30+distFrac*50;
      ctx.beginPath(); ctx.arc(x,y,p.size,0,Math.PI*2);
      ctx.fillStyle=`hsla(${h},90%,${l}%,${p.alpha*brightness})`;
      ctx.fill();
    });
    ctx.restore();

    // Labels
    ctx.font="10px 'Share Tech Mono'";
    ctx.fillStyle="rgba(168,85,247,0.8)"; ctx.fillText("EVENT HORIZON",cx+rs+6,cy-3);
    ctx.fillStyle="rgba(200,160,255,0.6)"; ctx.fillText("PHOTON SPHERE",cx+rs*1.5+6,cy-3);
    ctx.fillStyle="rgba(56,189,248,0.5)"; ctx.fillText("ISCO (r=6M)",cx+rs*3+6,cy-3);

    // Hawking temperature display
    const Th=(6e-8/mass).toExponential(2);
    ctx.fillStyle="rgba(148,163,184,0.5)"; ctx.font="9px 'Share Tech Mono'";
    ctx.fillText(`T_H = ${Th} K`,10,H-20);
    ctx.fillText(`r_s = ${(mass*2.95).toFixed(2)} km/M`,10,H-8);
    t++;
  }
  draw();
}

// ============================================================
// 2. SOLAR SYSTEM SIMULATION
// ============================================================
function buildSolarSystemSim(){
  stopCurrentSim();
  const canvas = getCanvas(); if(!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H, t=0, speed=1, showLabels=true, showOrbits=true;
  let zoom=1, panX=0, panY=0, dragging=false, lastMX=0, lastMY=0;
  let selectedPlanet=null, flyTarget=null, flyT=0;
  function resize(){ W=canvas.width=canvas.parentElement.offsetWidth; H=canvas.height=canvas.parentElement.offsetHeight; }
  resize(); window.addEventListener("resize",resize);

  const PLANETS=[
    {name:"Mercury", r:42, size:3, color:"#B8B8B8", speed:4.15,  tilt:0.03,  dist:"57.9M km",  mass:"0.33×10²⁴ kg", period:"88 days",   temp:"430°C day",  fact:"Smallest planet, extreme temperature swings."},
    {name:"Venus",   r:72, size:6, color:"#E8C870", speed:1.62,  tilt:177,   dist:"108M km",  mass:"4.87×10²⁴ kg", period:"225 days",  temp:"465°C",      fact:"Hottest planet, spins backwards."},
    {name:"Earth",   r:100,size:6.5,color:"#4A9EFF",speed:1.0,   tilt:23.5,  dist:"149.6M km",mass:"5.97×10²⁴ kg", period:"365 days",  temp:"15°C avg",   fact:"Only known planet with life.",moon:true},
    {name:"Mars",    r:135,size:4.5,color:"#E4624A",speed:0.53,  tilt:25,    dist:"228M km",  mass:"0.64×10²⁴ kg", period:"687 days",  temp:"-60°C avg",  fact:"Has the tallest volcano: Olympus Mons."},
    {name:"Jupiter", r:188,size:16, color:"#C08060", speed:0.084, tilt:3.1,   dist:"779M km",  mass:"1898×10²⁴ kg",period:"11.9 yr",   temp:"-110°C",     fact:"Largest planet, 79+ known moons."},
    {name:"Saturn",  r:240,size:13, color:"#E8D090", speed:0.034, tilt:26.7,  dist:"1432M km", mass:"568×10²⁴ kg", period:"29.5 yr",   temp:"-140°C",     fact:"Least dense planet — floats on water!", rings:true},
    {name:"Uranus",  r:285,size:9,  color:"#7ECBD4", speed:0.012, tilt:97.8,  dist:"2877M km", mass:"86.8×10²⁴ kg",period:"84 yr",     temp:"-195°C",     fact:"Rotates on its side."},
    {name:"Neptune", r:325,size:9,  color:"#4060D0", speed:0.006, tilt:28.3,  dist:"4503M km", mass:"102×10²⁴ kg", period:"165 yr",    temp:"-200°C",     fact:"Strongest winds in the solar system."},
  ];

  // Stars background (pre-computed)
  const STARS=[];
  for(let i=0;i<200;i++) STARS.push({x:Math.random(),y:Math.random(),s:Math.random()*.9+.2,b:Math.random()*.6+.3});

  const planetAngles=PLANETS.map((_,i)=>i*(Math.PI*2/8)+Math.random()*.5);
  const moonAngle={v:0};

  simLayout(
    `<div class="sim-info-title">🌌 SOLAR SYSTEM</div>
     <div class="sim-info-text" id="solarInfo">
       Our solar system formed ~4.6 billion years ago. The Sun contains 99.8% of all mass.<br><br>
       <b>Kepler's Third Law:</b> T² ∝ a³ — Farther planets orbit more slowly.<br><br>
       <i>Click a planet to learn more. Drag to pan. Scroll to zoom.</i>
     </div>`,
    makeSlider("ssSpeed","SPEED","0","5","0.1","1","×", v=>speed=v) +
    `<button class="sim-btn" id="ssLabelBtn" onclick="showLabels=!showLabels;this.textContent='LABELS: '+(showLabels?'ON':'OFF')">LABELS: ON</button>
     <button class="sim-btn" id="ssOrbitBtn" onclick="showOrbits=!showOrbits;this.textContent='ORBITS: '+(showOrbits?'ON':'OFF')">ORBITS: ON</button>
     <button class="sim-btn" onclick="zoom=1;panX=0;panY=0;selectedPlanet=null;document.getElementById('solarInfo').innerHTML='Our solar system formed ~4.6 billion years ago...'">↺ RESET VIEW</button>`
  );

  canvas.addEventListener("mousedown",e=>{dragging=true;lastMX=e.clientX;lastMY=e.clientY;});
  canvas.addEventListener("mousemove",e=>{
    if(dragging){panX+=e.clientX-lastMX;panY+=e.clientY-lastMY;lastMX=e.clientX;lastMY=e.clientY;}
  });
  canvas.addEventListener("mouseup",()=>dragging=false);
  canvas.addEventListener("wheel",e=>{zoom*=e.deltaY<0?1.08:0.93;zoom=Math.max(0.25,Math.min(4,zoom));e.preventDefault();},{passive:false});
  canvas.addEventListener("click",e=>{
    if(Math.abs(e.clientX-lastMX)>3) return;
    const rect=canvas.getBoundingClientRect();
    const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    const cx=W/2+panX, cy=H/2+panY;
    PLANETS.forEach((p,i)=>{
      const a=planetAngles[i];
      const px=cx+Math.cos(a)*p.r*zoom, py=cy+Math.sin(a)*p.r*zoom;
      if(Math.hypot(mx-px,my-py)<p.size*zoom+8){
        selectedPlanet=p;
        document.getElementById("solarInfo").innerHTML=
          `<b style="color:#38BDF8;font-family:'Orbitron'">${p.name.toUpperCase()}</b><br>
           📏 Distance: ${p.dist}<br>⚖ Mass: ${p.mass}<br>
           🕐 Period: ${p.period}<br>🌡 Temp: ${p.temp}<br><br>
           <i>${p.fact}</i>`;
        flyTarget={x:cx+(Math.cos(a)*p.r-.5)*zoom,y:cy+(Math.sin(a)*p.r-.5)*zoom}; flyT=0;
      }
    });
  });

  function draw(){
    _currentAnimFrame=requestAnimationFrame(draw);
    ctx.fillStyle="rgba(1,4,9,1)"; ctx.fillRect(0,0,W,H);
    STARS.forEach(s=>{
      ctx.beginPath(); ctx.arc(s.x*W,s.y*H,s.s,0,Math.PI*2);
      ctx.fillStyle=`rgba(220,235,255,${s.b*0.6})`; ctx.fill();
    });
    const cx=W/2+panX, cy=H/2+panY;

    // Orbit lines
    if(showOrbits) PLANETS.forEach(p=>{
      ctx.beginPath(); ctx.arc(cx,cy,p.r*zoom,0,Math.PI*2);
      ctx.strokeStyle=selectedPlanet===p?"rgba(56,189,248,0.25)":"rgba(56,189,248,0.08)";
      ctx.lineWidth=selectedPlanet===p?1.5:0.5; ctx.stroke();
    });

    // Sun
    const sg=ctx.createRadialGradient(cx,cy,0,cx,cy,28*zoom);
    sg.addColorStop(0,"#FFFDE7"); sg.addColorStop(0.3,"#FFD700"); sg.addColorStop(0.7,"#FF8C00"); sg.addColorStop(1,"rgba(255,80,0,0)");
    ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(cx,cy,28*zoom,0,Math.PI*2); ctx.fill();

    // Sun corona
    const corona=ctx.createRadialGradient(cx,cy,28*zoom,cx,cy,48*zoom);
    corona.addColorStop(0,"rgba(255,200,50,0.15)"); corona.addColorStop(1,"transparent");
    ctx.fillStyle=corona; ctx.beginPath(); ctx.arc(cx,cy,48*zoom,0,Math.PI*2); ctx.fill();

    PLANETS.forEach((p,i)=>{
      planetAngles[i] += p.speed*0.002*speed;
      const a=planetAngles[i];
      const x=cx+Math.cos(a)*p.r*zoom, y=cy+Math.sin(a)*p.r*zoom;
      const r=p.size*zoom;

      // Planet glow
      if(selectedPlanet===p){
        const gl=ctx.createRadialGradient(x,y,0,x,y,r*2.5);
        gl.addColorStop(0,p.color+"60"); gl.addColorStop(1,"transparent");
        ctx.fillStyle=gl; ctx.beginPath(); ctx.arc(x,y,r*2.5,0,Math.PI*2); ctx.fill();
      }

      // Planet body
      const pg=ctx.createRadialGradient(x-r*.3,y-r*.3,0,x,y,r);
      pg.addColorStop(0,p.color+"FF"); pg.addColorStop(1,p.color+"88");
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
      ctx.fillStyle=pg; ctx.fill();

      // Selection ring
      if(selectedPlanet===p){
        ctx.beginPath(); ctx.arc(x,y,r+3,0,Math.PI*2);
        ctx.strokeStyle="rgba(56,189,248,0.8)"; ctx.lineWidth=1.5; ctx.stroke();
      }

      // Saturn rings
      if(p.rings && zoom>0.3){
        ctx.save(); ctx.translate(x,y); ctx.scale(1,0.28);
        for(let ri=0;ri<3;ri++){
          ctx.beginPath(); ctx.arc(0,0,r*(1.6+ri*.4),0,Math.PI*2);
          ctx.strokeStyle=`rgba(232,208,144,${0.5-ri*.12})`; ctx.lineWidth=3*zoom; ctx.stroke();
        }
        ctx.restore();
      }

      // Earth moon
      if(p.moon){
        moonAngle.v += 0.04*speed;
        const mx2=x+Math.cos(moonAngle.v)*r*2.5, my2=y+Math.sin(moonAngle.v)*r*2.5;
        ctx.beginPath(); ctx.arc(mx2,my2,r*.35,0,Math.PI*2);
        ctx.fillStyle="#AAA"; ctx.fill();
      }

      // Labels
      if(showLabels && zoom>0.5){
        ctx.fillStyle=selectedPlanet===p?"#38BDF8":"rgba(148,163,184,0.7)";
        ctx.font=`${Math.max(9,10*Math.min(zoom,1.5))}px 'Share Tech Mono'`;
        ctx.fillText(p.name.toUpperCase(),x+r+4,y+4);
      }
    });

    // Kepler info
    ctx.fillStyle="rgba(148,163,184,0.3)"; ctx.font="9px 'Share Tech Mono'";
    ctx.fillText("T² ∝ a³  (Kepler's 3rd Law)",10,H-8);
    t++;
  }
  draw();
}

// ============================================================
// 3. EXOPLANET SYSTEM
// ============================================================
function buildExoplanetSim(){
  stopCurrentSim();
  const wrap = document.getElementById("simCanvasWrap"); if(!wrap) return;
  // Use canvas for main 3D view and a secondary canvas for light curve
  const canvas = getCanvas(); if(!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H, t=0, speed=1;
  let starType = "sun"; // m-dwarf, sun, a-type
  let atmType = "oxygen";
  let showHZ = true;

  const STAR_TYPES={
    "m-dwarf":{color:"#FF6040",size:20,hz:[55,90],temp:"3200K",lum:0.04,name:"M Dwarf (Red Dwarf)"},
    "sun":    {color:"#FFD700",size:30,hz:[90,150],temp:"5778K",lum:1.0, name:"G-type (Sun-like)"},
    "a-type": {color:"#B8D8FF",size:42,hz:[200,350],temp:"8500K",lum:14, name:"A-type (Hot White)"}
  };
  const ATM_TYPES={
    "oxygen":   {color:"rgba(100,160,255,0.25)",label:"O₂/N₂ (Earth-like)",hab:+20},
    "co2":      {color:"rgba(200,80,50,0.25)", label:"CO₂ (Venus-like)",  hab:-30},
    "methane":  {color:"rgba(150,200,100,0.25)",label:"CH₄ (Titan-like)", hab:0},
    "none":     {color:"rgba(100,100,100,0.1)", label:"No atmosphere",    hab:-50},
  };

  const planet={r:130, a:0, size:8, orbitSpeed:0.008};
  const STARS=[];
  for(let i=0;i<200;i++) STARS.push({x:Math.random(),y:Math.random(),s:Math.random()*.7+.2});

  // Light curve data
  const lcData=[];

  function resize(){ W=canvas.width=canvas.parentElement.offsetWidth; H=canvas.height=canvas.parentElement.offsetHeight; }
  resize(); window.addEventListener("resize",resize);

  function habitScore(){
    const st=STAR_TYPES[starType];
    const dist=planet.r; const [hzIn,hzOut]=st.hz;
    let score=50;
    if(dist>=hzIn&&dist<=hzOut) score=70; else score=20;
    score+=ATM_TYPES[atmType].hab;
    return Math.max(0,Math.min(100,score));
  }

  simLayout(
    `<div class="sim-info-title">🪐 EXOPLANET SYSTEM</div>
     <div class="sim-info-text">
       Astronomers detect exoplanets by watching stars dim slightly as a planet passes in front — the <b>transit method</b>.<br><br>
       The <b style="color:#4ADE80">Habitable Zone</b> (green ring) is where liquid water could exist on the surface.<br><br>
       <b>Habitability Score: <span id="habScore" style="color:#FCD34D">--</span>/100</b>
     </div>`,
    `<div class="sim-ctrl-group">
       <div class="sim-ctrl-label">STAR TYPE</div>
       <select class="form-select" id="starTypeSel" style="width:100%;background:rgba(5,12,30,.9);border:1px solid rgba(99,179,237,.2);border-radius:5px;padding:.4rem;color:#E2E8F0;font-size:.75rem;margin-top:.3rem"
         onchange="window._exoStarType=this.value">
         <option value="m-dwarf">M Dwarf (Red Dwarf)</option>
         <option value="sun" selected>G-type (Sun-like)</option>
         <option value="a-type">A-type (Hot White)</option>
       </select>
     </div>
     <div class="sim-ctrl-group">
       <div class="sim-ctrl-label">ATMOSPHERE</div>
       <select class="form-select" id="atmSel" style="width:100%;background:rgba(5,12,30,.9);border:1px solid rgba(99,179,237,.2);border-radius:5px;padding:.4rem;color:#E2E8F0;font-size:.75rem;margin-top:.3rem"
         onchange="window._exoAtm=this.value">
         <option value="oxygen">O₂/N₂ (Earth-like)</option>
         <option value="co2">CO₂ (Venus-like)</option>
         <option value="methane">CH₄ (Titan-like)</option>
         <option value="none">No atmosphere</option>
       </select>
     </div>` +
    makeSlider("exoOrbit","ORBIT RADIUS","50","250","5","130","px", v=>planet.r=v) +
    makeSlider("exoSpeed","ORBITAL SPEED","0","3","0.1","1","×", v=>speed=v) +
    `<button class="sim-btn" onclick="window._exoShowHZ=!window._exoShowHZ;this.textContent='HZ: '+(window._exoShowHZ?'ON':'OFF')">HZ: ON</button>`
  );
  window._exoShowHZ=true; window._exoStarType="sun"; window._exoAtm="oxygen";

  function draw(){
    _currentAnimFrame=requestAnimationFrame(draw);
    ctx.fillStyle="rgba(1,4,9,0.2)"; ctx.fillRect(0,0,W,H);
    STARS.forEach(s=>{ ctx.beginPath(); ctx.arc(s.x*W,s.y*H,s.s,0,Math.PI*2); ctx.fillStyle="rgba(220,235,255,0.4)"; ctx.fill();});

    starType = window._exoStarType||"sun";
    atmType = window._exoAtm||"oxygen";
    const cx=W*.38, cy=H/2;
    const st=STAR_TYPES[starType];
    const atm=ATM_TYPES[atmType];

    // Habitable zone
    if(window._exoShowHZ){
      const [hzIn,hzOut]=st.hz;
      ctx.beginPath(); ctx.arc(cx,cy,hzIn,0,Math.PI*2);
      ctx.strokeStyle="rgba(74,222,128,0.2)"; ctx.lineWidth=hzOut-hzIn;
      ctx.globalAlpha=0.15; ctx.stroke(); ctx.globalAlpha=1;
      ctx.beginPath(); ctx.arc(cx,cy,hzIn,0,Math.PI*2);
      ctx.strokeStyle="rgba(74,222,128,0.4)"; ctx.lineWidth=1; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx,cy,hzOut,0,Math.PI*2);
      ctx.strokeStyle="rgba(74,222,128,0.4)"; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle="rgba(74,222,128,0.4)"; ctx.font="9px 'Share Tech Mono'";
      ctx.fillText("HABITABLE ZONE",cx+hzIn+3,cy-4);
    }

    // Star
    const starGlow=ctx.createRadialGradient(cx,cy,0,cx,cy,st.size*2.5);
    starGlow.addColorStop(0,st.color+"FF"); starGlow.addColorStop(0.5,st.color+"60"); starGlow.addColorStop(1,"transparent");
    ctx.fillStyle=starGlow; ctx.beginPath(); ctx.arc(cx,cy,st.size*2.5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy,st.size,0,Math.PI*2); ctx.fillStyle=st.color; ctx.fill();

    // Planet orbit line
    ctx.beginPath(); ctx.arc(cx,cy,planet.r,0,Math.PI*2);
    ctx.strokeStyle="rgba(56,189,248,0.1)"; ctx.lineWidth=1; ctx.stroke();

    // Planet position
    planet.a += planet.orbitSpeed*speed;
    const px=cx+Math.cos(planet.a)*planet.r, py=cy+Math.sin(planet.a)*planet.r;

    // Planet glow
    const pGlow=ctx.createRadialGradient(px,py,0,px,py,planet.size*2.5);
    pGlow.addColorStop(0,atm.color.replace("0.25","0.4")); pGlow.addColorStop(1,"transparent");
    ctx.fillStyle=pGlow; ctx.beginPath(); ctx.arc(px,py,planet.size*2,0,Math.PI*2); ctx.fill();

    // Atmosphere
    ctx.beginPath(); ctx.arc(px,py,planet.size+4,0,Math.PI*2);
    ctx.fillStyle=atm.color; ctx.fill();

    // Planet
    ctx.beginPath(); ctx.arc(px,py,planet.size,0,Math.PI*2);
    ctx.fillStyle="#5577AA"; ctx.fill();

    // Light curve (right side mini-graph)
    const inTransit = Math.abs(planet.a % (Math.PI*2) - Math.PI) < 0.3;
    const starDim = inTransit ? 0.6 : 1.0;
    // Dim the star during transit
    if(inTransit){
      ctx.fillStyle="rgba(1,4,9,0.4)"; ctx.beginPath(); ctx.arc(cx,cy,st.size,0,Math.PI*2); ctx.fill();
    }
    // Star brightness overlay
    const shimmer=ctx.createRadialGradient(cx,cy,0,cx,cy,st.size);
    shimmer.addColorStop(0,st.color+Math.round(starDim*255).toString(16).padStart(2,"0"));
    shimmer.addColorStop(1,"transparent");
    ctx.fillStyle=shimmer; ctx.beginPath(); ctx.arc(cx,cy,st.size,0,Math.PI*2); ctx.fill();

    // Mini light curve
    lcData.push(inTransit?0.85:1.0); if(lcData.length>120) lcData.shift();
    const lcX=W-160, lcY=H-90, lcW=140, lcH=60;
    ctx.fillStyle="rgba(5,12,30,0.8)"; ctx.fillRect(lcX,lcY,lcW,lcH);
    ctx.strokeStyle="rgba(56,189,248,0.5)"; ctx.lineWidth=1; ctx.strokeRect(lcX,lcY,lcW,lcH);
    ctx.fillStyle="rgba(56,189,248,0.5)"; ctx.font="8px 'Share Tech Mono'"; ctx.fillText("LIGHT CURVE",lcX+3,lcY+9);
    ctx.beginPath();
    lcData.forEach((v,i)=>{ const lx=lcX+i*(lcW/120), ly=lcY+lcH-(v*lcH*.85); i===0?ctx.moveTo(lx,ly):ctx.lineTo(lx,ly); });
    ctx.strokeStyle=inTransit?"#FB923C":"#38BDF8"; ctx.lineWidth=1.5; ctx.stroke();

    // Habitability score
    const hab=habitScore();
    const habEl=document.getElementById("habScore");
    if(habEl) habEl.textContent=hab;
    ctx.fillStyle=hab>60?"#4ADE80":hab>30?"#FCD34D":"#F87171";
    ctx.font="10px 'Share Tech Mono'";
    ctx.fillText(`HABITABILITY: ${hab}/100`,10,H-10);
    ctx.fillStyle="rgba(148,163,184,0.6)";
    ctx.fillText(`ATMOSPHERE: ${atm.label}`,10,H-22);
    ctx.fillText(`STAR: ${st.name} | T=${st.temp}`,10,H-34);
    t++;
  }
  draw();
}

// ============================================================
// 4. STAR LIFECYCLE
// ============================================================
function buildStarLifeSim(){
  stopCurrentSim();
  const canvas = getCanvas(); if(!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H, t=0, mass=1, stage=0, stageT=0, autoAdvance=false;
  function resize(){ W=canvas.width=canvas.parentElement.offsetWidth; H=canvas.height=canvas.parentElement.offsetHeight; }
  resize(); window.addEventListener("resize",resize);

  const STAGES=[
    {name:"NEBULA",           color:"#4466BB", glow:"#2244AA", size:160, desc:"A vast cloud of hydrogen gas and dust collapses under gravity to form a protostar."},
    {name:"PROTOSTAR",        color:"#FF8844", glow:"#FF6622", size:35,  desc:"Gravity compresses the core. Temperature rises until hydrogen fusion begins."},
    {name:"MAIN SEQUENCE",    color:"#FFD700", glow:"#FFA500", size:null,desc:"Hydrogen fuses to helium in the core. This stable phase lasts billions of years."},
    {name:"RED GIANT",        color:"#FF4400", glow:"#CC2200", size:null,desc:"Hydrogen exhausted, core shrinks, outer layers expand to hundreds of solar radii."},
    {name:"SUPERNOVA",        color:"#FFFFFF", glow:"#AAAAFF", size:null,desc:"Massive stars explode, releasing more energy in seconds than the Sun in its lifetime."},
    {name:"REMNANT",          color:"#88AAFF", glow:"#4466CC", size:null,desc:"Low mass → White Dwarf. Medium → Neutron Star. High mass (>25M☉) → Black Hole."},
  ];

  // Corona particles
  const corona=[];
  function resetCorona(r,c){
    corona.length=0;
    for(let i=0;i<80;i++) corona.push({
      a:Math.random()*Math.PI*2, r:r+Math.random()*r*.3, speed:(Math.random()-.5)*.01,
      size:Math.random()*2+.5, alpha:Math.random()*.5+.2, pulse:Math.random()*Math.PI*2,
      color:c
    });
  }
  resetCorona(40,"#FFD700");

  // Supernova debris
  const debris=[];
  function triggerSupernova(){
    debris.length=0;
    for(let i=0;i<200;i++) debris.push({
      a:Math.random()*Math.PI*2, r:0, speed:Math.random()*4+1,
      size:Math.random()*2.5+.5, alpha:1, color:`hsl(${Math.random()*60+10},90%,70%)`
    });
  }

  function getStageForMass(){
    // Determine which stages apply based on mass
    if(mass>=25) return ["NEBULA","PROTOSTAR","MAIN SEQUENCE","RED GIANT","SUPERNOVA","REMNANT"]; // → Black Hole
    if(mass>=8)  return ["NEBULA","PROTOSTAR","MAIN SEQUENCE","RED GIANT","SUPERNOVA","REMNANT"]; // → Neutron Star
    if(mass>=0.8)return ["NEBULA","PROTOSTAR","MAIN SEQUENCE","RED GIANT","REMNANT"];              // → White Dwarf
    return              ["NEBULA","PROTOSTAR","MAIN SEQUENCE","REMNANT"];                          // → Brown Dwarf
  }

  function getLifetime(){
    // Approximate stellar lifetime in Gyr
    return (10/Math.pow(mass,2.5)).toFixed(1);
  }

  function getStageSize(stage){
    if(stage===0) return 120+mass*20;
    if(stage===1) return 20+mass*8;
    if(stage===2) return 15+mass*12;
    if(stage===3) return 40+mass*25;
    if(stage===4) return 5+stageT*3.5;
    if(stage===5) return mass>=25?12:mass>=8?6:18;
    return 30;
  }

  function getStageColor(s){
    if(s===0) return["#3355AA","#2244AA"];
    if(s===1) return["#FF8844","#FF5522"];
    if(s===2){
      // Color by mass
      if(mass>15) return["#B0C8FF","#8AB0FF"];
      if(mass>5)  return["#FFFDE7","#FFF8E1"];
      if(mass>1)  return["#FFD700","#FFA500"];
      return["#FF8844","#FF6622"];
    }
    if(s===3) return["#FF3300","#CC1100"];
    if(s===4) return["#FFFFFF","#CCCCFF"];
    if(s===5){
      if(mass>=25) return["#110022","#000000"]; // Black hole
      if(mass>=8)  return["#88AAFF","#4466CC"]; // Neutron star
      return["#EEEEFF","#CCCCFF"]; // White dwarf
    }
    return["#FFD700","#FFA500"];
  }

  simLayout(
    `<div class="sim-info-title">⭐ STAR LIFECYCLE</div>
     <div class="sim-info-text">
       A star's mass determines its entire life and death.<br><br>
       <span id="stageDesc" style="color:#FCD34D">Adjust mass and click NEXT STAGE.</span><br><br>
       <b>Lifetime: <span id="lifetimeVal">10</span> billion years</b><br>
       <span style="font-size:.7rem;color:#475569">More massive = shorter, brighter, hotter life</span>
     </div>`,
    makeSlider("starMass","STELLAR MASS","0.3","40","0.1","1","M☉", v=>{mass=v;stage=0;stageT=0;resetCorona(getStageSize(0),getStageColor(0)[0]);document.getElementById("lifetimeVal").textContent=getLifetime();}) +
    `<button class="sim-btn" onclick="window._starNext&&window._starNext()">NEXT STAGE →</button>
     <button class="sim-btn" onclick="stage=0;stageT=0;debris.length=0;resetCorona(getStageSize(0),getStageColor(0)[0])">↺ RESTART</button>
     <div id="stageProgress" style="margin-top:.5rem;font-family:'Share Tech Mono';font-size:.6rem;color:#475569">STAGE 1 / 6</div>`
  );

  const stages=STAGES;
  window._starNext=()=>{
    const availableStages=getStageForMass();
    if(stage<availableStages.length-1){
      stage++; stageT=0;
      if(stage===4) triggerSupernova();
      const s=stages[stage];
      const [c]=getStageColor(stage);
      resetCorona(getStageSize(stage),c);
      const desc=document.getElementById("stageDesc");
      if(desc) desc.textContent=s.desc;
      const prog=document.getElementById("stageProgress");
      if(prog) prog.textContent=`STAGE ${stage+1} / ${availableStages.length}`;
    }
  };

  function draw(){
    _currentAnimFrame=requestAnimationFrame(draw);
    ctx.fillStyle="rgba(1,4,9,0.15)"; ctx.fillRect(0,0,W,H);
    const cx=W/2, cy=H/2;
    const r=Math.min(getStageSize(stage),stage===4?Math.min(200,getStageSize(stage)):300);
    const [c1,c2]=getStageColor(stage);

    // Stage 0: Nebula
    if(stage===0){
      for(let i=0;i<6;i++){
        const na=t*.001+i*(Math.PI*2/6);
        const nr=60+mass*15+Math.sin(t*.003+i*1.3)*30;
        const ng=ctx.createRadialGradient(cx+Math.cos(na)*nr*.5,cy+Math.sin(na)*nr*.5*.6,0,cx,cy,nr);
        ng.addColorStop(0,`hsla(${210+i*20},60%,30%,0.12)`);
        ng.addColorStop(1,"transparent");
        ctx.fillStyle=ng; ctx.fillRect(0,0,W,H);
      }
      // Dust particles
      corona.forEach(p=>{
        p.a+=p.speed; p.pulse+=.02;
        const px=cx+Math.cos(p.a)*p.r, py=cy+Math.sin(p.a)*p.r*.7;
        ctx.beginPath(); ctx.arc(px,py,p.size,0,Math.PI*2);
        ctx.fillStyle=`hsla(220,60%,60%,${p.alpha*(0.5+0.3*Math.sin(p.pulse))})`; ctx.fill();
      });
      // Nebula core glow
      const ng2=ctx.createRadialGradient(cx,cy,0,cx,cy,80);
      ng2.addColorStop(0,"rgba(100,130,220,0.15)"); ng2.addColorStop(1,"transparent");
      ctx.fillStyle=ng2; ctx.fillRect(0,0,W,H);
    } else {
      // General star body with glow
      const grd=ctx.createRadialGradient(cx,cy,0,cx,cy,r*2.2);
      grd.addColorStop(0,c1+"FF"); grd.addColorStop(0.4,c2+"AA");
      grd.addColorStop(0.7,c1+"33"); grd.addColorStop(1,"transparent");
      ctx.fillStyle=grd; ctx.beginPath(); ctx.arc(cx,cy,r*2.2,0,Math.PI*2); ctx.fill();

      if(stage<4){ // Draw solid star
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle=c1; ctx.fill();
        // Surface texture shimmer
        for(let i=0;i<4;i++){
          const sa=t*.002+i*(Math.PI*2/4);
          const sr=r*.6+Math.sin(t*.005+i)*r*.2;
          ctx.beginPath(); ctx.arc(cx+Math.cos(sa)*sr*.3,cy+Math.sin(sa)*sr*.2,r*.15,0,Math.PI*2);
          ctx.fillStyle=c2+"40"; ctx.fill();
        }
        // Corona
        corona.forEach(p=>{
          p.a+=p.speed*.5; p.pulse+=.03;
          const px=cx+Math.cos(p.a)*p.r, py=cy+Math.sin(p.a)*p.r;
          ctx.beginPath(); ctx.arc(px,py,p.size*(0.8+0.4*Math.sin(p.pulse)),0,Math.PI*2);
          ctx.fillStyle=`${c1}${Math.round(p.alpha*180).toString(16)}`; ctx.fill();
        });
      }
    }

    // Stage 4: Supernova
    if(stage===4){
      debris.forEach(d=>{
        d.r+=d.speed*(1+stageT*.02); d.alpha*=0.993;
        const dx=cx+Math.cos(d.a)*d.r, dy=cy+Math.sin(d.a)*d.r;
        ctx.beginPath(); ctx.arc(dx,dy,d.size,0,Math.PI*2);
        ctx.fillStyle=d.color.replace(")",`,${d.alpha})`).replace("hsl","hsla"); ctx.fill();
      });
      const flashA=Math.max(0,1-stageT*.008);
      ctx.fillStyle=`rgba(255,255,255,${flashA*.3})`; ctx.fillRect(0,0,W,H);
    }

    // Stage 5: Remnant label
    if(stage===5){
      const label=mass>=25?"BLACK HOLE":mass>=8?"NEUTRON STAR":"WHITE DWARF";
      ctx.fillStyle="#38BDF8"; ctx.font="bold 14px 'Orbitron'";
      ctx.textAlign="center";
      ctx.fillText(label,cx,cy+r+30); ctx.textAlign="left";
      if(mass>=25){
        // Photon sphere
        ctx.beginPath(); ctx.arc(cx,cy,r*2,0,Math.PI*2);
        ctx.strokeStyle="rgba(168,85,247,0.3)"; ctx.lineWidth=2; ctx.stroke();
      }
    }

    // Stage name banner
    const stageName=STAGES[Math.min(stage,STAGES.length-1)].name;
    ctx.fillStyle="rgba(56,189,248,0.8)"; ctx.font="11px 'Share Tech Mono'";
    ctx.fillText(stageName,10,22);
    ctx.fillStyle="rgba(148,163,184,0.4)"; ctx.font="9px 'Share Tech Mono'";
    ctx.fillText(`Mass: ${mass.toFixed(1)} M☉`,10,H-22);
    ctx.fillText(`Lifetime: ~${getLifetime()} Gyr`,10,H-10);
    stageT++; t++;
  }
  draw();
}

// ============================================================
// 5. GALAXY FORMATION
// ============================================================
function buildGalaxySim(){
  stopCurrentSim();
  const canvas = getCanvas(); if(!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H, t=0, rotSpeed=1, dmOpacity=0.3;
  let andromeda=false, andX, andStartX, andVX=-0.4;
  function resize(){ W=canvas.width=canvas.parentElement.offsetWidth; H=canvas.height=canvas.parentElement.offsetHeight; andStartX=W*1.35; if(!andromeda)andX=andStartX; }
  resize(); window.addEventListener("resize",resize);

  // Build Milky Way spiral particles
  const ARMS=4, PER_ARM=1500;
  const mwStars=[];
  for(let arm=0;arm<ARMS;arm++){
    for(let i=0;i<PER_ARM;i++){
      const frac=i/PER_ARM;
      const r=15+frac*260;
      const angle=(frac*5.5)+(arm/ARMS)*Math.PI*2;
      const scatter=(1-frac*.6)*(Math.random()-.5)*28;
      mwStars.push({
        r, a:angle, scatter,
        baseR:r, baseA:angle,
        size:Math.random()*1.4+.3,
        alpha:Math.random()*.6+.3+(1-frac)*.3,
        hue:200+Math.random()*60,
        speed:0.0012*(1-frac*.5)
      });
    }
  }
  // Core stars
  for(let i=0;i<400;i++){
    mwStars.push({r:Math.random()*20,a:Math.random()*Math.PI*2,scatter:0,baseR:Math.random()*20,baseA:0,size:Math.random()*1.2+.4,alpha:.8,hue:40+Math.random()*20,speed:.003});
  }

  // Andromeda galaxy particles
  const andStars=[];
  for(let arm=0;arm<2;arm++){
    for(let i=0;i<800;i++){
      const frac=i/800, r=8+frac*150, angle=(frac*4)+(arm/2)*Math.PI*2;
      andStars.push({r,a:angle,size:Math.random()*1.2+.3,alpha:Math.random()*.5+.2,hue:220+Math.random()*40});
    }
  }
  for(let i=0;i<150;i++) andStars.push({r:Math.random()*12,a:Math.random()*Math.PI*2,size:Math.random()*1+.4,alpha:.7,hue:50+Math.random()*20});

  simLayout(
    `<div class="sim-info-title">🌀 GALAXY</div>
     <div class="sim-info-text">
       The Milky Way is a <b>barred spiral galaxy</b> containing 200–400 billion stars.<br><br>
       <b>Dark matter</b> (faint outer halo) provides extra gravity keeping the galaxy together.<br><br>
       In ~4.5 billion years, the <b>Andromeda galaxy</b> will collide with the Milky Way.
     </div>`,
    makeSlider("galRot","ROTATION SPEED","0","3","0.1","1","×", v=>rotSpeed=v) +
    makeSlider("galDM","DARK MATTER OPACITY","0","1","0.05","0.3","", v=>dmOpacity=v) +
    `<button class="sim-btn" id="andBtn" onclick="window._andToggle&&window._andToggle()">ANDROMEDA COLLISION: OFF</button>`
  );

  window._andToggle=()=>{
    andromeda=!andromeda; andX=andStartX;
    document.getElementById("andBtn").textContent=`ANDROMEDA COLLISION: ${andromeda?"ON":"OFF"}`;
  };

  function draw(){
    _currentAnimFrame=requestAnimationFrame(draw);
    ctx.fillStyle="rgba(1,4,9,0.15)"; ctx.fillRect(0,0,W,H);
    const cx=W/2, cy=H/2;

    // Dark matter halo
    if(dmOpacity>0.01){
      const halo=ctx.createRadialGradient(cx,cy,80,cx,cy,320);
      halo.addColorStop(0,"transparent");
      halo.addColorStop(0.5,`rgba(100,80,220,${dmOpacity*.08})`);
      halo.addColorStop(1,`rgba(50,40,120,${dmOpacity*.15})`);
      ctx.fillStyle=halo; ctx.beginPath(); ctx.arc(cx,cy,320,0,Math.PI*2); ctx.fill();
    }

    // Milky Way
    ctx.save(); ctx.translate(cx,cy); ctx.scale(1,0.42);
    mwStars.forEach(s=>{
      s.a+=s.speed*rotSpeed;
      const x=Math.cos(s.a)*(s.r+s.scatter), y=Math.sin(s.a)*(s.r+s.scatter*.4);
      ctx.beginPath(); ctx.arc(x,y,s.size,0,Math.PI*2);
      ctx.fillStyle=`hsla(${s.hue},60%,70%,${s.alpha})`; ctx.fill();
    });
    ctx.restore();

    // Central bar glow
    const bar=ctx.createRadialGradient(cx,cy,0,cx,cy,30);
    bar.addColorStop(0,"rgba(255,220,130,0.25)"); bar.addColorStop(1,"transparent");
    ctx.fillStyle=bar; ctx.fillRect(0,0,W,H);

    // Andromeda
    if(andromeda){
      andX+=andVX*rotSpeed;
      if(andX<-W*.3){ andromeda=false; andX=andStartX; document.getElementById("andBtn").textContent="ANDROMEDA COLLISION: OFF"; }
      const adist=Math.abs(andX-cx);
      ctx.save(); ctx.translate(andX, cy-80); ctx.scale(0.7,0.3); ctx.rotate(.4);
      andStars.forEach(s=>{
        s.a+=0.001*rotSpeed;
        const x=Math.cos(s.a)*s.r, y=Math.sin(s.a)*s.r;
        ctx.beginPath(); ctx.arc(x,y,s.size,0,Math.PI*2);
        ctx.fillStyle=`hsla(${s.hue},50%,65%,${s.alpha})`; ctx.fill();
      });
      ctx.restore();
      ctx.fillStyle="rgba(150,180,255,0.5)"; ctx.font="9px 'Share Tech Mono'";
      ctx.fillText("ANDROMEDA",andX-35,cy-120);

      // Tidal streams when close
      if(adist<250){
        const strength=(1-adist/250);
        for(let i=0;i<Math.floor(strength*30);i++){
          const tx=cx+(andX-cx)*Math.random();
          const ty=(cy-80+80*Math.random())-40;
          ctx.beginPath(); ctx.arc(tx,ty,Math.random()*1.5,0,Math.PI*2);
          ctx.fillStyle=`rgba(180,200,255,${strength*.4})`; ctx.fill();
        }
      }
    }

    // Labels
    ctx.fillStyle="rgba(148,163,184,0.5)"; ctx.font="9px 'Share Tech Mono'";
    ctx.fillText("MILKY WAY — BARRED SPIRAL GALAXY",10,H-10);
    ctx.fillText(`${(mwStars.length).toLocaleString()} STAR PARTICLES`,10,H-22);
    t++;
  }
  draw();
}

// ============================================================
// 6. GRAVITATIONAL WAVES
// ============================================================
function buildGravWaveSim(){
  stopCurrentSim();
  const canvas = getCanvas(); if(!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H, t=0, waveAmp=1, freqScale=1;
  let orbitR=80, merging=false, merged=false, mergeT=0;
  let chirpData=[];
  function resize(){ W=canvas.width=canvas.parentElement.offsetWidth; H=canvas.height=canvas.parentElement.offsetHeight; }
  resize(); window.addEventListener("resize",resize);

  const rings=[];
  let ringTimer=0;

  simLayout(
    `<div class="sim-info-title">〰 GRAVITATIONAL WAVES</div>
     <div class="sim-info-text">
       Two massive black holes orbit each other, losing energy as <b>gravitational waves</b>.<br><br>
       As they spiral inward, waves get faster and stronger — a "<b>chirp</b>" signal detected by LIGO in 2015.<br><br>
       The merger releases more energy than all stars in the visible universe combined.
     </div>`,
    makeSlider("gwAmp","WAVE AMPLITUDE","0.2","3","0.1","1","×", v=>waveAmp=v) +
    makeSlider("gwFreq","FREQUENCY SCALE","0.5","3","0.1","1","×", v=>freqScale=v) +
    `<button class="sim-btn" onclick="window._gwMerge&&window._gwMerge()">⚡ TRIGGER MERGER</button>
     <button class="sim-btn" onclick="window._gwReset&&window._gwReset()">↺ RESET</button>`
  );

  window._gwMerge=()=>{ merging=true; mergeT=0; };
  window._gwReset=()=>{ merging=false; merged=false; mergeT=0; orbitR=80; rings.length=0; chirpData.length=0; };

  function addRing(cx,cy){
    rings.push({x:cx,y:cy,r:0,maxR:Math.min(W,H)*.6,alpha:0.6,speed:2.5+Math.random()});
  }

  function draw(){
    _currentAnimFrame=requestAnimationFrame(draw);
    ctx.fillStyle="rgba(1,4,9,0.2)"; ctx.fillRect(0,0,W,H);
    const cx=W/2, cy=H*0.5;

    if(merging && !merged){
      mergeT++;
      orbitR=Math.max(4, 80-mergeT*.7);
      if(orbitR<=5){ merged=true; }
    }

    const orbSpeed=(0.018+(!merged?(80-orbitR)*.0008:0))*freqScale;
    const bh1a=t*orbSpeed, bh2a=t*orbSpeed+Math.PI;
    const bh1x=cx+Math.cos(bh1a)*orbitR, bh1y=cy+Math.sin(bh1a)*orbitR;
    const bh2x=cx+Math.cos(bh2a)*orbitR, bh2y=cy+Math.sin(bh2a)*orbitR;

    // Spawn rings
    ringTimer++;
    const ringInterval=Math.max(3,Math.floor(12/(1+(80-orbitR)*.05)));
    if(ringTimer>=ringInterval){ addRing(cx,cy); ringTimer=0; }

    // Draw rings (spacetime ripples)
    ctx.save(); ctx.translate(cx,cy); ctx.scale(1,0.3);
    rings.forEach((ring,i)=>{
      ring.r+=ring.speed*(1+(merging?mergeT*.01:0));
      ring.alpha*=0.97;
      if(ring.r>ring.maxR||ring.alpha<0.01){ rings.splice(i,1); return; }
      const ampMod=waveAmp*(1+Math.sin(ring.r*.05)*.3);
      ctx.beginPath(); ctx.arc(0,0,ring.r,0,Math.PI*2);
      ctx.strokeStyle=`rgba(56,189,248,${ring.alpha*ampMod*.6})`;
      ctx.lineWidth=1+ring.alpha*2;
      ctx.stroke();
    });
    ctx.restore();

    // BH glow halos
    [bh1x,bh1y,bh2x,bh2y].forEach((_,i,a)=>{
      if(i%2) return;
      const g=ctx.createRadialGradient(a[i],a[i+1],0,a[i],a[i+1],25);
      g.addColorStop(0,"rgba(255,140,0,0.3)"); g.addColorStop(1,"transparent");
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    });

    if(!merged){
      // BH 1
      ctx.beginPath(); ctx.arc(bh1x,bh1y,10,0,Math.PI*2); ctx.fillStyle="#000"; ctx.fill();
      ctx.beginPath(); ctx.arc(bh1x,bh1y,14,0,Math.PI*2);
      ctx.strokeStyle="rgba(255,120,20,0.6)"; ctx.lineWidth=2; ctx.stroke();
      // BH 2
      ctx.beginPath(); ctx.arc(bh2x,bh2y,10,0,Math.PI*2); ctx.fillStyle="#000"; ctx.fill();
      ctx.beginPath(); ctx.arc(bh2x,bh2y,14,0,Math.PI*2);
      ctx.strokeStyle="rgba(56,189,248,0.6)"; ctx.lineWidth=2; ctx.stroke();
    } else {
      // Merged: single larger BH
      const flashA=Math.max(0,1-mergeT*.005);
      if(flashA>0){ ctx.fillStyle=`rgba(255,255,200,${flashA*.6})`; ctx.fillRect(0,0,W,H); }
      ctx.beginPath(); ctx.arc(cx,cy,18,0,Math.PI*2); ctx.fillStyle="#000"; ctx.fill();
      ctx.beginPath(); ctx.arc(cx,cy,24,0,Math.PI*2);
      ctx.strokeStyle="rgba(168,85,247,0.8)"; ctx.lineWidth=2.5; ctx.stroke();
      ctx.fillStyle="rgba(168,85,247,0.6)"; ctx.font="10px 'Share Tech Mono'"; ctx.textAlign="center";
      ctx.fillText("MERGER COMPLETE",cx,cy+45); ctx.textAlign="left";
    }

    // Chirp waveform
    const chirpFreq=orbSpeed*freqScale*100;
    chirpData.push(Math.sin(t*chirpFreq*0.3)*waveAmp*(merged?0:0.8));
    if(chirpData.length>200) chirpData.shift();
    const gcx=10, gcy=H-80, gw=Math.min(220,W-20), gh=60;
    ctx.fillStyle="rgba(5,12,30,0.85)"; ctx.fillRect(gcx,gcy,gw,gh);
    ctx.strokeStyle="rgba(56,189,248,0.4)"; ctx.lineWidth=1; ctx.strokeRect(gcx,gcy,gw,gh);
    ctx.fillStyle="rgba(56,189,248,0.5)"; ctx.font="8px 'Share Tech Mono'"; ctx.fillText("CHIRP SIGNAL h(t)",gcx+3,gcy+9);
    ctx.beginPath();
    chirpData.forEach((v,i)=>{
      const lx=gcx+i*(gw/200), ly=gcy+gh/2-v*gh*.45;
      i===0?ctx.moveTo(lx,ly):ctx.lineTo(lx,ly);
    });
    ctx.strokeStyle="#38BDF8"; ctx.lineWidth=1.5; ctx.stroke();

    ctx.fillStyle="rgba(148,163,184,0.5)"; ctx.font="9px 'Share Tech Mono'";
    ctx.fillText(`ORBITAL RADIUS: ${orbitR.toFixed(1)} M`,10,22);
    ctx.fillText(`WAVE FREQ: ${(chirpFreq).toFixed(2)} Hz (scaled)`,10,34);
    t++;
  }
  draw();
}

// ============================================================
// 7. WORMHOLE
// ============================================================
function buildWormholeSim(){
  stopCurrentSim();
  const canvas = getCanvas(); if(!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H, t=0, flyThrough=false, flyProgress=0;
  function resize(){ W=canvas.width=canvas.parentElement.offsetWidth; H=canvas.height=canvas.parentElement.offsetHeight; }
  resize(); window.addEventListener("resize",resize);

  const STARS=[];
  for(let i=0;i<250;i++) STARS.push({x:Math.random()*2-1,y:Math.random()*2-1,z:Math.random(),s:Math.random()*.8+.3,hue:180+Math.random()*60});
  const EXIT_STARS=[];
  for(let i=0;i<150;i++) EXIT_STARS.push({x:Math.random()*2-1,y:Math.random()*2-1,z:Math.random(),s:Math.random()*.8+.3,hue:30+Math.random()*30});

  simLayout(
    `<div class="sim-info-title">🕳 WORMHOLE</div>
     <div class="sim-info-text">
       <b>⚠ Artistic Visualization</b><br><br>
       An Einstein-Rosen bridge theoretically connects two distant points in spacetime.<br><br>
       Traversable wormholes would require <b>exotic matter</b> with negative energy density — never observed.<br><br>
       This is a speculative visualization for educational purposes.
     </div>`,
    `<button class="sim-btn" onclick="window._whFly&&window._whFly()">🚀 FLY THROUGH</button>
     <button class="sim-btn" onclick="flyThrough=false;flyProgress=0">↺ RESET</button>`
  );

  window._whFly=()=>{ flyThrough=true; flyProgress=0; };

  function drawStarfield(stars, cx, cy, zOffset, alpha, hueShift){
    stars.forEach(s=>{
      const z=(s.z+t*.002+zOffset)%1;
      const scale=1/(z+.1);
      const sx=cx+s.x*scale*W*.5, sy=cy+s.y*scale*H*.5;
      const r=s.s*(1-z)*scale*.8;
      if(r<0.1||sx<0||sx>W||sy<0||sy>H) return;
      ctx.beginPath(); ctx.arc(sx,sy,r,0,Math.PI*2);
      ctx.fillStyle=`hsla(${s.hue+hueShift},70%,80%,${alpha*(1-z)*.8})`; ctx.fill();
    });
  }

  function draw(){
    _currentAnimFrame=requestAnimationFrame(draw);
    ctx.fillStyle="rgba(1,4,9,0.25)"; ctx.fillRect(0,0,W,H);
    const cx=W/2, cy=H/2;

    if(flyThrough){ flyProgress=Math.min(flyProgress+0.008,1); }
    const fp=flyProgress;

    if(fp<0.5){
      // Exterior view: approach
      const entryAlpha=1-fp*2;
      drawStarfield(STARS, cx, cy, 0, entryAlpha, 0);

      // Wormhole throat rings — tunnel illusion
      const numRings=20;
      for(let i=numRings;i>=0;i--){
        const frac=i/numRings;
        const baseR=Math.max(5,200-i*180/numRings);
        const depth=frac;
        const ringR=baseR*(1-fp);
        const alpha=0.7*(1-depth*.5)*(1-fp*.5);
        const hue=270-depth*60;
        ctx.beginPath(); ctx.arc(cx,cy,ringR,0,Math.PI*2);
        ctx.strokeStyle=`hsla(${hue},80%,60%,${alpha})`; ctx.lineWidth=1+frac*3; ctx.stroke();

        // Inner glow disk
        if(i<3){
          const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,ringR);
          glow.addColorStop(0,"rgba(130,50,255,0.3)"); glow.addColorStop(1,"transparent");
          ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(cx,cy,ringR,0,Math.PI*2); ctx.fill();
        }
      }

      // Portal center glow
      const portalGlow=ctx.createRadialGradient(cx,cy,0,cx,cy,60*(1-fp*.5));
      portalGlow.addColorStop(0,"rgba(200,150,255,0.6)");
      portalGlow.addColorStop(0.5,"rgba(80,0,200,0.3)");
      portalGlow.addColorStop(1,"transparent");
      ctx.fillStyle=portalGlow; ctx.beginPath(); ctx.arc(cx,cy,60*(1-fp*.5),0,Math.PI*2); ctx.fill();

      // Lensing distortion rings
      for(let i=0;i<5;i++){
        const lr=150+i*40-t%40;
        if(lr>10&&lr<300){
          ctx.beginPath(); ctx.arc(cx,cy,lr,0,Math.PI*2);
          ctx.strokeStyle=`rgba(100,200,255,${0.05+i*.02})`; ctx.lineWidth=8; ctx.stroke();
        }
      }
    } else {
      // Interior tunnel effect
      const insideFrac=(fp-0.5)*2;
      // Draw tunnel rings
      const numRings=18;
      for(let i=0;i<numRings;i++){
        const frac=(i/numRings+t*.015)%1;
        const r=20+frac*260;
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
        ctx.strokeStyle=`hsla(${280-frac*60},80%,${40+frac*30}%,${0.6*(1-frac)})`;
        ctx.lineWidth=2+frac*4; ctx.stroke();
      }
      // Emerging stars
      if(insideFrac>0.5){
        const ef=(insideFrac-.5)*2;
        drawStarfield(EXIT_STARS, cx, cy, -.5, ef, 30);
        const exitGlow=ctx.createRadialGradient(cx,cy,0,cx,cy,100*ef);
        exitGlow.addColorStop(0,"rgba(255,180,50,0.4)"); exitGlow.addColorStop(1,"transparent");
        ctx.fillStyle=exitGlow; ctx.beginPath(); ctx.arc(cx,cy,100*ef,0,Math.PI*2); ctx.fill();
      }
    }

    // Disclaimer
    ctx.fillStyle="rgba(168,85,247,0.5)"; ctx.font="9px 'Share Tech Mono'";
    ctx.fillText("⚠ HYPOTHETICAL — ARTISTIC VISUALIZATION",10,H-10);
    t++;
  }
  draw();
}

// ============================================================
// 8. SPACETIME CURVATURE (Canvas 2D)
// ============================================================
function buildSpacetimeSim(){
  stopCurrentSim();
  const canvas = getCanvas(); if(!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H, gravity=1;
  let masses=[];
  const particles=[];
  const GRID=30;
  function resize(){ W=canvas.width=canvas.parentElement.offsetWidth; H=canvas.height=canvas.parentElement.offsetHeight; }
  resize(); window.addEventListener("resize",resize);

  // Add default mass
  masses.push({x:null,y:null,m:8,dragging:false}); // set after resize

  simLayout(
    `<div class="sim-info-title">🕸 SPACETIME CURVATURE</div>
     <div class="sim-info-text">
       Massive objects bend the fabric of spacetime — other objects follow these curved paths (geodesics).<br><br>
       <b>Click</b> to add a mass. <b>Double-click</b> to launch a test particle.<br>
       <b>Drag</b> existing masses to move them.
     </div>`,
    makeSlider("stGrav","GRAVITY STRENGTH","0.2","3","0.1","1","×", v=>gravity=v) +
    `<div class="sim-ctrl-group">
       <div class="sim-ctrl-label">NEXT MASS <span id="stMassVal">5</span>M</div>
       <input type="range" id="stMass" min="1" max="20" value="5" oninput="document.getElementById('stMassVal').textContent=this.value"/>
     </div>
     <button class="sim-btn" onclick="window._stAddMass&&window._stAddMass()">+ ADD MASS</button>
     <button class="sim-btn" onclick="window._stReset&&window._stReset()">↺ RESET</button>`
  );

  // Set default mass position after layout
  setTimeout(()=>{ masses[0].x=W/2; masses[0].y=H/2; },50);

  window._stAddMass=()=>{
    const m=+document.getElementById("stMass").value;
    masses.push({x:Math.random()*W*.6+W*.2,y:Math.random()*H*.6+H*.2,m,dragging:false});
  };
  window._stReset=()=>{ masses=[{x:W/2,y:H/2,m:8,dragging:false}]; particles.length=0; };

  // Drag handling
  canvas.addEventListener("mousedown",e=>{
    const rect=canvas.getBoundingClientRect();
    const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    masses.forEach(m=>{ if(Math.hypot(mx-m.x,my-m.y)<m.m*3+10){ m.dragging=true; } });
  });
  canvas.addEventListener("mousemove",e=>{
    const rect=canvas.getBoundingClientRect();
    masses.forEach(m=>{ if(m.dragging){ m.x=e.clientX-rect.left; m.y=e.clientY-rect.top; } });
  });
  canvas.addEventListener("mouseup",()=>masses.forEach(m=>m.dragging=false));
  canvas.addEventListener("dblclick",e=>{
    const rect=canvas.getBoundingClientRect();
    const mx=e.clientX-rect.left, my=e.clientY-rect.top;
    // Launch particle with random velocity
    particles.push({x:mx,y:my,vx:(Math.random()-.5)*2,vy:(Math.random()-.5)*2,trail:[],alpha:1,color:`hsl(${Math.random()*360},80%,70%)`});
  });

  function displace(px,py){
    let dx=0,dy=0;
    masses.forEach(m=>{
      if(!m.x) return;
      const d=Math.max(Math.hypot(px-m.x,py-m.y),20);
      const force=m.m*1000*gravity/(d*d);
      const ang=Math.atan2(m.y-py,m.x-px);
      dx+=Math.cos(ang)*force; dy+=Math.sin(ang)*force;
    });
    return[Math.max(-60,Math.min(60,dx)),Math.max(-60,Math.min(60,dy))];
  }

  function draw(){
    _currentAnimFrame=requestAnimationFrame(draw);
    ctx.fillStyle="#010409"; ctx.fillRect(0,0,W,H);
    const cols=Math.ceil(W/GRID)+2, rows=Math.ceil(H/GRID)+2;

    // Draw grid
    for(let i=-1;i<cols;i++){
      for(let j=-1;j<rows;j++){
        const x0=i*GRID, y0=j*GRID, x1=(i+1)*GRID, y1=(j+1)*GRID;
        const [ax,ay]=displace(x0,y0), [bx,by]=displace(x1,y0), [cx2,cy2]=displace(x0,y1);
        const stressH=Math.sqrt((ax-bx)**2+(ay-by)**2)/GRID;
        const stressV=Math.sqrt((ax-cx2)**2+(ay-cy2)**2)/GRID;

        ctx.beginPath(); ctx.moveTo(Math.max(0,Math.min(W,x0+ax)),Math.max(0,Math.min(H,y0+ay)));
        ctx.lineTo(Math.max(0,Math.min(W,x1+bx)),Math.max(0,Math.min(H,y0+by)));
        ctx.strokeStyle=`rgba(56,189,248,${0.07+stressH*.5})`; ctx.lineWidth=0.5+stressH*2; ctx.stroke();

        ctx.beginPath(); ctx.moveTo(Math.max(0,Math.min(W,x0+ax)),Math.max(0,Math.min(H,y0+ay)));
        ctx.lineTo(Math.max(0,Math.min(W,x0+cx2)),Math.max(0,Math.min(H,y1+cy2)));
        ctx.strokeStyle=`rgba(56,189,248,${0.07+stressV*.5})`; ctx.lineWidth=0.5+stressV*2; ctx.stroke();
      }
    }

    // Update and draw test particles
    particles.forEach((p,idx)=>{
      p.trail.push({x:p.x,y:p.y});
      if(p.trail.length>40) p.trail.shift();
      masses.forEach(m=>{
        if(!m.x) return;
        const d=Math.max(Math.hypot(p.x-m.x,p.y-m.y),15);
        const f=m.m*gravity*0.8/(d*d);
        const ang=Math.atan2(m.y-p.y,m.x-p.x);
        p.vx+=Math.cos(ang)*f; p.vy+=Math.sin(ang)*f;
      });
      p.vx*=0.999; p.vy*=0.999;
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0||p.x>W||p.y<0||p.y>H) p.alpha*=0.95;
      if(p.alpha<0.01) particles.splice(idx,1);

      // Trail
      ctx.beginPath();
      p.trail.forEach((pt,i)=>{
        i===0?ctx.moveTo(pt.x,pt.y):ctx.lineTo(pt.x,pt.y);
      });
      ctx.strokeStyle=p.color.replace("hsl","hsla").replace(")",`,${p.alpha*.5})`);
      ctx.lineWidth=1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2);
      ctx.fillStyle=p.color; ctx.fill();
    });

    // Draw masses
    masses.forEach((m,i)=>{
      if(!m.x) return;
      const r=m.m*2.5+4;
      const mg=ctx.createRadialGradient(m.x,m.y,0,m.x,m.y,r*2);
      mg.addColorStop(0,"rgba(255,200,50,0.5)"); mg.addColorStop(0.4,"rgba(255,100,0,0.2)"); mg.addColorStop(1,"transparent");
      ctx.fillStyle=mg; ctx.beginPath(); ctx.arc(m.x,m.y,r*2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(m.x,m.y,r,0,Math.PI*2); ctx.fillStyle="#FFF8E7"; ctx.fill();
      ctx.fillStyle="rgba(56,189,248,0.7)"; ctx.font="9px 'Share Tech Mono'";
      ctx.fillText(`M${i+1}=${m.m}`,m.x+r+3,m.y-r-3);
    });

    ctx.fillStyle="rgba(148,163,184,0.4)"; ctx.font="9px 'Share Tech Mono'";
    ctx.fillText("DBL-CLICK TO LAUNCH PARTICLE · DRAG MASS TO MOVE",10,H-10);
  }
  draw();
}

// ============================================================
// 9. ASTEROID BELT
// ============================================================
function buildAsteroidSim(){
  stopCurrentSim();
  const canvas = getCanvas(); if(!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H, t=0, speed=1, showComet=true;
  let numAsteroids=600;
  function resize(){ W=canvas.width=canvas.parentElement.offsetWidth; H=canvas.height=canvas.parentElement.offsetHeight; }
  resize(); window.addEventListener("resize",resize);

  const STARS=[];
  for(let i=0;i<150;i++) STARS.push({x:Math.random(),y:Math.random(),s:Math.random()*.7+.2});

  let asteroids=[];
  function buildAsteroids(){
    asteroids=[];
    for(let i=0;i<numAsteroids;i++){
      const r=95+Math.random()*70; // Belt between Mars and Jupiter
      const ecc=Math.random()*.15;
      const inc=(Math.random()-.5)*.3;
      asteroids.push({
        a:Math.random()*Math.PI*2,
        r,ecc,inc,
        speed:(0.003+Math.random()*.003)*(Math.random()>.5?1:-1),
        size:Math.random()*2+.4,
        alpha:Math.random()*.5+.3
      });
    }
  }
  buildAsteroids();

  // Comet
  const comet={a:0,r:300,speed:0.003,ecc:.7,tailParticles:[]};

  simLayout(
    `<div class="sim-info-title">☄ ASTEROID BELT</div>
     <div class="sim-info-text">
       The <b>asteroid belt</b> lies between Mars (1.5 AU) and Jupiter (5.2 AU), containing millions of rocky bodies.<br><br>
       Jupiter's strong gravity prevents these from forming a planet — it also <b>perturbs</b> asteroid orbits.<br><br>
       <b>Comets</b> have highly elliptical orbits; solar wind pushes dust away from the Sun, creating a tail.
     </div>`,
    makeSlider("astSpeed","ORBITAL SPEED","0","5","0.1","1","×", v=>speed=v) +
    makeSlider("astCount","ASTEROID COUNT","100","1200","50","600","", v=>{ numAsteroids=v; buildAsteroids(); }) +
    `<button class="sim-btn" id="cometBtn" onclick="showComet=!showComet;this.textContent='COMET: '+(showComet?'ON':'OFF')">COMET: ON</button>
     <button class="sim-btn" onclick="window._astReset&&window._astReset()">↺ RESET</button>`
  );
  window._astReset=()=>{ buildAsteroids(); comet.a=0; };

  function draw(){
    _currentAnimFrame=requestAnimationFrame(draw);
    ctx.fillStyle="rgba(1,4,9,0.2)"; ctx.fillRect(0,0,W,H);
    STARS.forEach(s=>{ ctx.beginPath(); ctx.arc(s.x*W,s.y*H,s.s,0,Math.PI*2); ctx.fillStyle="rgba(220,235,255,0.4)"; ctx.fill();});
    const scale=Math.min(W,H)/800;
    const cx=W/2, cy=H/2;

    // Orbit reference rings
    const orbits=[{r:55,color:"#B8B8B8",name:"Mercury"},{r:80,color:"#E8C870",name:"Venus"},
      {r:100,color:"#4A9EFF",name:"Earth"},{r:130,color:"#E4624A",name:"Mars"},
      {r:165,color:"rgba(100,100,100,0.5)",name:"Belt inner"},{r:235,color:"rgba(100,100,100,0.5)",name:"Belt outer"},
      {r:270,color:"#C08060",name:"Jupiter"}];
    orbits.forEach(o=>{
      ctx.beginPath(); ctx.arc(cx,cy,o.r*scale,0,Math.PI*2);
      ctx.strokeStyle=o.color.includes("rgba")?o.color:"rgba(100,100,100,0.12)"; ctx.lineWidth=.5; ctx.stroke();
    });

    // Belt shading
    ctx.beginPath(); ctx.arc(cx,cy,165*scale,0,Math.PI*2);
    ctx.strokeStyle="rgba(180,120,60,0.06)"; ctx.lineWidth=(235-165)*scale; ctx.stroke();

    // Sun
    const sg=ctx.createRadialGradient(cx,cy,0,cx,cy,22*scale);
    sg.addColorStop(0,"#FFFDE7"); sg.addColorStop(0.4,"#FFD700"); sg.addColorStop(1,"rgba(255,120,0,0)");
    ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(cx,cy,22*scale,0,Math.PI*2); ctx.fill();

    // Inner planets
    [[55,"#B8B8B8",3.5,4.15],[80,"#E8C870",3.8,1.62],[100,"#4A9EFF",4,1],[130,"#E4624A",3.5,.53],[270,"#C08060",10,.084]]
      .forEach(([r,col,sz,spd],i)=>{
        const a=t*spd*0.004*speed+i*1.3;
        const px=cx+Math.cos(a)*r*scale, py=cy+Math.sin(a)*r*scale;
        ctx.beginPath(); ctx.arc(px,py,sz*scale,0,Math.PI*2); ctx.fillStyle=col; ctx.fill();
      });

    // Asteroids
    asteroids.forEach(a=>{
      a.a+=a.speed*speed;
      const r2=a.r*(1-a.ecc*Math.cos(a.a));
      const x=cx+Math.cos(a.a)*r2*scale, y=cy+Math.sin(a.a)*r2*scale*0.95;
      ctx.beginPath(); ctx.arc(x,y,a.size,0,Math.PI*2);
      ctx.fillStyle=`rgba(180,160,120,${a.alpha})`; ctx.fill();
    });

    // Comet
    if(showComet){
      comet.a+=comet.speed*speed;
      const cr=comet.r*(1-comet.ecc*Math.cos(comet.a))*.7;
      const cx2=cx+Math.cos(comet.a)*cr*scale, cy2=cy+Math.sin(comet.a)*cr*scale;
      // Tail (always points away from Sun)
      const ang=Math.atan2(cy2-cy,cx2-cx);
      for(let i=0;i<20;i++){
        const f=i/20, td=f*80;
        const tx=cx2+Math.cos(ang)*td, ty=cy2+Math.sin(ang)*td;
        ctx.beginPath(); ctx.arc(tx,ty,3*(1-f),0,Math.PI*2);
        ctx.fillStyle=`rgba(150,220,255,${(1-f)*.5})`; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(cx2,cy2,5*scale,0,Math.PI*2);
      ctx.fillStyle="#DDF"; ctx.fill();
      ctx.fillStyle="rgba(150,220,255,0.8)"; ctx.font="9px 'Share Tech Mono'";
      ctx.fillText("COMET",cx2+8,cy2-5);
    }

    ctx.fillStyle="rgba(148,163,184,0.4)"; ctx.font="9px 'Share Tech Mono'";
    ctx.fillText(`ASTEROIDS: ${asteroids.length}`,10,H-10);
    t++;
  }
  draw();
}

// ============================================================
// 10. PLANET FORMATION
// ============================================================
function buildPlanetFormationSim(){
  stopCurrentSim();
  const canvas = getCanvas(); if(!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H, t=0, phase=0; // 0=dust, 1=clumping, 2=protoplanets, 3=final
  function resize(){ W=canvas.width=canvas.parentElement.offsetWidth; H=canvas.height=canvas.parentElement.offsetHeight; }
  resize(); window.addEventListener("resize",resize);

  let dustParticles=[];
  let planetesimals=[];
  let planets=[];

  function initDust(){
    dustParticles=[];
    for(let i=0;i<500;i++){
      const r=60+Math.random()*200, a=Math.random()*Math.PI*2;
      const scatter=(Math.random()-.5)*25;
      dustParticles.push({
        r, a, scatter, speed:0.004*(1-r/350)+.001,
        size:Math.random()*1.5+.3, alpha:Math.random()*.5+.3,
        hue:30+Math.random()*30
      });
    }
    planetesimals=[];
    planets=[];
  }
  initDust();

  function formPlanetesimals(){
    // Pick random dust to become planetesimals
    planetesimals=[];
    const seeds=[90,130,170,210,260];
    seeds.forEach(r=>{
      planetesimals.push({r,a:Math.random()*Math.PI*2,size:6+Math.random()*4,speed:.003*(1-r/350)+.001,mass:5,color:"#8B7355"});
    });
  }

  function formPlanets(){
    planets=[];
    const configs=[
      {r:85, size:5,   color:"#B8B8B8",name:"Rocky"},
      {r:120,size:7,   color:"#4A9EFF",name:"Water World"},
      {r:160,size:6.5, color:"#E4624A",name:"Desert"},
      {r:210,size:14,  color:"#C08060",name:"Gas Giant"},
      {r:260,size:11,  color:"#E8D090",name:"Ice Giant",rings:true},
    ];
    configs.forEach(c=>planets.push({...c,a:Math.random()*Math.PI*2,speed:.003*(1-c.r/350)+.001}));
  }

  simLayout(
    `<div class="sim-info-title">💫 PLANET FORMATION</div>
     <div class="sim-info-text">
       Planets form from the <b>protoplanetary disk</b> — a rotating cloud of gas and dust around a young star.<br><br>
       Over millions of years, particles <b>accrete</b> (stick together), growing from dust grains into planetesimals and eventually planets.<br><br>
       This process is called <b>accretion</b>.
     </div>`,
    `<div class="sim-ctrl-group">
       <div class="sim-ctrl-label">TIMELINE STAGE</div>
       <input type="range" id="pfPhase" min="0" max="3" step="1" value="0" style="width:100%;accent-color:#38BDF8;cursor:pointer" oninput="window._pfSetPhase(+this.value)"/>
       <div style="display:flex;justify-content:space-between;font-family:'Share Tech Mono';font-size:.55rem;color:#475569;margin-top:.2rem">
         <span>DUST</span><span>CLUMP</span><span>PROTO</span><span>PLANETS</span>
       </div>
     </div>
     <button class="sim-btn" onclick="window._pfReset&&window._pfReset()">↺ RESTART</button>`
  );

  window._pfSetPhase=v=>{
    phase=v;
    if(v===0) initDust();
    if(v===1){ if(dustParticles.length===0)initDust(); }
    if(v>=2&&planetesimals.length===0) formPlanetesimals();
    if(v===3&&planets.length===0) formPlanets();
  };
  window._pfReset=()=>{ phase=0; initDust(); document.getElementById("pfPhase").value=0; };

  function draw(){
    _currentAnimFrame=requestAnimationFrame(draw);
    ctx.fillStyle="rgba(1,4,9,0.18)"; ctx.fillRect(0,0,W,H);
    const scale=Math.min(W,H)/820;
    const cx=W/2, cy=H/2;

    // Star
    const sg=ctx.createRadialGradient(cx,cy,0,cx,cy,25*scale);
    sg.addColorStop(0,"#FFFDE7"); sg.addColorStop(0.4,"#FFD700"); sg.addColorStop(1,"rgba(255,120,0,0)");
    ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(cx,cy,20*scale,0,Math.PI*2); ctx.fill();

    if(phase<=1){
      // Dust disk
      ctx.save(); ctx.translate(cx,cy); ctx.scale(1,0.35);
      dustParticles.forEach(p=>{
        p.a+=p.speed*(phase===0?1:0.3);
        const x=Math.cos(p.a)*(p.r+p.scatter)*scale, y=Math.sin(p.a)*(p.r)*scale;
        ctx.beginPath(); ctx.arc(x,y,p.size,0,Math.PI*2);
        const alpha=phase===1?p.alpha*0.5:p.alpha;
        ctx.fillStyle=`hsla(${p.hue},50%,60%,${alpha})`; ctx.fill();
      });
      ctx.restore();

      if(phase===1){
        // Show clumping — particles converging
        if(planetesimals.length===0) formPlanetesimals();
        ctx.save(); ctx.translate(cx,cy); ctx.scale(1,0.35);
        planetesimals.forEach(p=>{
          p.a+=p.speed; p.size=Math.min(12,p.size+.01);
          const x=Math.cos(p.a)*p.r*scale, y=Math.sin(p.a)*p.r*scale;
          const g=ctx.createRadialGradient(x,y,0,x,y,p.size*2);
          g.addColorStop(0,p.color+"CC"); g.addColorStop(1,"transparent");
          ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,p.size*2,0,Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(x,y,p.size,0,Math.PI*2); ctx.fillStyle=p.color; ctx.fill();
        });
        ctx.restore();
      }
    }

    if(phase===2){
      // Protoplanets — larger, distinct
      if(planetesimals.length===0) formPlanetesimals();
      ctx.save(); ctx.translate(cx,cy); ctx.scale(1,0.45);
      // Remaining faint dust
      dustParticles.slice(0,100).forEach(p=>{
        p.a+=p.speed*.1;
        const x=Math.cos(p.a)*(p.r+p.scatter)*scale, y=Math.sin(p.a)*p.r*scale;
        ctx.beginPath(); ctx.arc(x,y,p.size*.5,0,Math.PI*2);
        ctx.fillStyle=`hsla(${p.hue},40%,50%,0.2)`; ctx.fill();
      });
      planetesimals.forEach(p=>{
        p.a+=p.speed; p.size=Math.min(16,p.size+.005);
        const x=Math.cos(p.a)*p.r*scale, y=Math.sin(p.a)*p.r*scale;
        const g=ctx.createRadialGradient(x,y,0,x,y,p.size*3);
        g.addColorStop(0,p.color+"88"); g.addColorStop(1,"transparent");
        ctx.fillStyle=g; ctx.fillRect(-W,-H,W*3,H*3);
        ctx.beginPath(); ctx.arc(x,y,p.size,0,Math.PI*2); ctx.fillStyle=p.color; ctx.fill();
      });
      ctx.restore();
      ctx.fillStyle="rgba(56,189,248,0.5)"; ctx.font="10px 'Share Tech Mono'"; ctx.textAlign="center";
      ctx.fillText("PLANETESIMALS FORMING...",cx,40); ctx.textAlign="left";
    }

    if(phase===3){
      // Final planets
      if(planets.length===0) formPlanets();
      planets.forEach(p=>{
        p.a+=p.speed;
        const x=cx+Math.cos(p.a)*p.r*scale, y=cy+Math.sin(p.a)*p.r*scale;
        // Orbit
        ctx.beginPath(); ctx.arc(cx,cy,p.r*scale,0,Math.PI*2);
        ctx.strokeStyle="rgba(56,189,248,0.08)"; ctx.lineWidth=.5; ctx.stroke();
        const pg=ctx.createRadialGradient(x,y,0,x,y,p.size*scale);
        pg.addColorStop(0,p.color+"FF"); pg.addColorStop(1,p.color+"88");
        ctx.beginPath(); ctx.arc(x,y,p.size*scale,0,Math.PI*2); ctx.fillStyle=pg; ctx.fill();
        if(p.rings){
          ctx.save(); ctx.translate(x,y); ctx.scale(1,.25);
          ctx.beginPath(); ctx.arc(0,0,p.size*scale*2,0,Math.PI*2);
          ctx.strokeStyle="rgba(232,208,144,0.4)"; ctx.lineWidth=4*scale; ctx.stroke();
          ctx.restore();
        }
        if(scale>.4){
          ctx.fillStyle="rgba(148,163,184,0.6)"; ctx.font="9px 'Share Tech Mono'";
          ctx.fillText(p.name,x+p.size*scale+3,y+3);
        }
      });
      ctx.fillStyle="rgba(56,189,248,0.5)"; ctx.font="10px 'Share Tech Mono'"; ctx.textAlign="center";
      ctx.fillText("SOLAR SYSTEM COMPLETE",cx,40); ctx.textAlign="left";
    }

    // Phase label
    const labels=["DUST CLOUD","CLUMPING","PROTOPLANETS","FINAL SYSTEM"];
    ctx.fillStyle="rgba(252,211,77,0.6)"; ctx.font="11px 'Share Tech Mono'";
    ctx.fillText(`STAGE: ${labels[phase]}`,10,22);
    t++;
  }
  draw();
}

// ============================================================
// SIM ROUTER — maps slug → builder function
// ============================================================
window.SIM_BUILDERS = {
  "black-hole":          buildBlackHoleSim,
  "solar-system":        buildSolarSystemSim,
  "exoplanets":          buildExoplanetSim,
  "star-lifecycle":      buildStarLifeSim,
  "galaxy":              buildGalaxySim,
  "gravitational-waves": buildGravWaveSim,
  "wormhole":            buildWormholeSim,
  "spacetime-curvature": buildSpacetimeSim,
  "asteroids":           buildAsteroidSim,
  "planet-formation":    buildPlanetFormationSim,
};
