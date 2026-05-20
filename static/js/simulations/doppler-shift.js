/* AstroVerse v6 — Doppler Shift: redshift/blueshift with spectrum visualisation */
(function(){
  'use strict';
  const canvas=document.getElementById('simCanvas');
  const wrap=document.getElementById('simCanvasWrap');
  if(!canvas||!wrap)return;
  const ctx=canvas.getContext('2d');
  let W,H,running=true;
  function resize(){W=canvas.width=wrap.clientWidth;H=canvas.height=wrap.clientHeight||600;}
  resize();window.addEventListener('resize',resize);

  let velocity=0,starMoving=true,t=0,speed=1,paused=false;
  let starX=0;// relative to centre, +ve = moving away
  const C=3e5;// km/s (speed of light)

  // H-alpha rest wavelength = 656.3 nm
  const LINES=[{lam:410.2,name:'Hδ'},{lam:434.0,name:'Hγ'},{lam:486.1,name:'Hβ'},{lam:589.0,name:'Na'},{lam:656.3,name:'Hα'},{lam:759.4,name:'O₂'}];

  function lambdaToRGB(nm){
    let r=0,g=0,b=0;
    if(nm<380)return[80,0,120];
    if(nm<440){r=(440-nm)/60;g=0;b=1;}
    else if(nm<490){r=0;g=(nm-440)/50;b=1;}
    else if(nm<510){r=0;g=1;b=(510-nm)/20;}
    else if(nm<580){r=(nm-510)/70;g=1;b=0;}
    else if(nm<645){r=1;g=(645-nm)/65;b=0;}
    else if(nm<=750){r=1;g=0;b=0;}
    else return[100,0,0];
    const s=nm<420?0.3+(nm-380)/40*0.7:nm>700?0.3+(750-nm)/50*0.7:1;
    return[Math.round(r*255*s),Math.round(g*255*s),Math.round(b*255*s)];
  }

  const infoEl=document.getElementById('simInfo');
  if(infoEl)infoEl.innerHTML=`
    <div class="sim-info-title">🌈 DOPPLER SHIFT</div>
    <div class="sim-info-text">
      When a source of light moves toward or away from an observer, the wavelength is compressed or stretched.<br><br>
      <b style="color:#4499FF">Blueshift:</b> Source approaching — wavelength shorter, frequency higher.<br>
      <b style="color:#FF5533">Redshift:</b> Source receding — wavelength longer, frequency lower.<br><br>
      <div style="background:rgba(56,189,248,.07);padding:.5rem;border-radius:4px;font-family:'Share Tech Mono';font-size:.62rem;color:#38BDF8;line-height:1.7">
        λ_obs = λ_rest × √((1+β)/(1-β))<br>
        β = v/c  (relativistic)<br><br>
        z = (λ_obs - λ_rest) / λ_rest<br>
        For small v: z ≈ v/c
      </div>
      <br>
      Hubble used Doppler redshift to discover the expanding universe. Distant galaxies are receding — their light is redshifted.
    </div>`;

  const ctrlEl=document.getElementById('simControls');
  if(ctrlEl){
    ctrlEl.innerHTML=`
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">RADIAL VELOCITY <span id="dsVV">0 km/s</span></div>
        <input type="range" min="-100000" max="100000" step="1000" value="0" id="dsV"/>
        <div style="display:flex;justify-content:space-between;font-family:'Share Tech Mono';font-size:.6rem;color:#475569;margin-top:.2rem"><span>← BLUE</span><span>RED →</span></div>
      </div>
      <div class="sim-ctrl-group"><div class="sim-ctrl-label">ANIMATION SPEED <span id="dsSV">1.0×</span></div>
        <input type="range" min="0" max="3" step="0.1" value="1" id="dsS"/></div>
      <button class="sim-btn" id="dsPause">⏸ PAUSE</button>
      <button class="sim-btn" onclick="document.getElementById('dsV').value=0;document.getElementById('dsVV').textContent='0 km/s';velocity=0">↺ RESET</button>
      <div style="margin-top:.6rem;padding:.55rem;background:rgba(56,189,248,.05);border:1px solid rgba(56,189,248,.2);border-radius:4px;font-family:'Share Tech Mono';font-size:.58rem;color:rgba(56,189,248,.7);line-height:1.5" id="dsInfo">
        z = 0.000
      </div>`;
    document.getElementById('dsV').oninput=e=>{velocity=+e.target.value;document.getElementById('dsVV').textContent=(velocity/1000).toFixed(0)+' km/s';};
    document.getElementById('dsS').oninput=e=>{speed=+e.target.value;document.getElementById('dsSV').textContent=speed.toFixed(1)+'×';};
    document.getElementById('dsPause').onclick=e=>{paused=!paused;e.target.textContent=paused?'▶ RESUME':'⏸ PAUSE';};
  }

  function drawSpectrum(y,h,vkms,label,isObs){
    const beta=vkms*1000/C;
    const z=isObs?Math.sqrt((1+beta)/(1-beta))-1:0;

    // Rainbow background
    const imD=ctx.createImageData(W-40,h-12);
    for(let px=0;px<W-40;px++){
      const nm=380+(px/(W-40))*(780-380);
      const[r,g,b]=lambdaToRGB(nm);
      for(let py=0;py<h-12;py++){const idx=(py*(W-40)+px)*4;imD.data[idx]=r;imD.data[idx+1]=g;imD.data[idx+2]=b;imD.data[idx+3]=200;}
    }
    ctx.putImageData(imD,20,y+16);
    ctx.strokeStyle='rgba(0,0,0,0.3)';ctx.lineWidth=1;ctx.strokeRect(20,y+16,W-40,h-12);

    // Absorption lines
    LINES.forEach(line=>{
      const lam=isObs?line.lam*(1+z):line.lam;
      const lx=20+(lam-380)/(780-380)*(W-40);
      if(lx<20||lx>W-20)return;
      ctx.strokeStyle='rgba(0,0,0,0.85)';ctx.lineWidth=2.5;
      ctx.beginPath();ctx.moveTo(lx,y+16);ctx.lineTo(lx,y+h+4);ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,0.7)';ctx.font='8px "Share Tech Mono"';ctx.fillText(line.name,lx-8,y+h+14);
    });

    // Labels
    ctx.fillStyle='rgba(148,163,184,0.8)';ctx.font='9px "Share Tech Mono"';ctx.fillText(label,22,y+12);
    if(isObs&&z!==0){
      const shiftLabel=z>0?'REDSHIFTED':'BLUESHIFTED';
      const col=z>0?'#FF5533':'#4499FF';
      ctx.fillStyle=col;ctx.fillText(`${shiftLabel}  z=${z.toFixed(4)}  Δλ=${(z*656.3).toFixed(1)}nm`,W-220,y+12);
    }
    ctx.fillStyle='rgba(148,163,184,0.4)';ctx.font='8px "Share Tech Mono"';
    ctx.fillText('380nm',20,y+h+26);ctx.fillText('780nm',W-60,y+h+26);
  }

  function animate(){
    if(!running)return;
    requestAnimationFrame(animate);
    ctx.fillStyle='#000810';ctx.fillRect(0,0,W,H);

    const vkms=velocity/1000;
    const beta=vkms*1000/C;
    const z=Math.sqrt((1+beta)/(1-beta))-1;

    if(!paused)t+=0.012*speed;

    // Star/galaxy motion visualisation
    const cx=W/2,cy=H*0.3;
    if(!paused)starX+=vkms*0.0002*speed;
    if(starX>W/2)starX=-W/2;if(starX<-W/2)starX=W/2;
    const sx=cx+starX;

    // Wave crests (illustrate compression/stretching)
    const waves=12;const baseWave=30;
    const waveFront=vkms>0?baseWave*(1+Math.min(0.5,vkms/200000)):baseWave*(1-Math.min(0.3,(-vkms)/200000));
    const waveBack=vkms>0?baseWave*(1-Math.min(0.3,vkms/200000)):baseWave*(1+Math.min(0.5,(-vkms)/200000));
    for(let i=0;i<waves;i++){
      const phase=(t+i/waves)*Math.PI*2;
      const rightR=(i+1)*(waveFront)+(t*50*speed%waveFront);
      const leftR=(i+1)*(waveBack)+(t*50*speed%waveBack);
      ctx.beginPath();ctx.arc(sx,cy,Math.max(2,rightR),Math.PI*1.5,Math.PI*0.5);
      ctx.strokeStyle=`rgba(255,${Math.max(0,150-vkms*0.002)},${Math.max(0,100-vkms*0.001)},${0.3-i*0.02})`;ctx.lineWidth=1;ctx.stroke();
      ctx.beginPath();ctx.arc(sx,cy,Math.max(2,leftR),-Math.PI/2,Math.PI/2,true);
      ctx.strokeStyle=`rgba(${Math.max(0,100+vkms*0.001)},${Math.max(0,150+vkms*0.002)},255,${0.3-i*0.02})`;ctx.lineWidth=1;ctx.stroke();
    }

    // Star
    const starGrd=ctx.createRadialGradient(sx,cy,0,sx,cy,20);
    const starCol=vkms>0?`rgb(255,${Math.max(80,220-vkms/500)},${Math.max(20,160-vkms/300)})`:`rgb(${Math.max(80,220+vkms/500)},${Math.max(100,200+vkms/500)},255)`;
    starGrd.addColorStop(0,'#FFFFFF');starGrd.addColorStop(0.3,starCol);starGrd.addColorStop(1,'transparent');
    ctx.fillStyle=starGrd;ctx.beginPath();ctx.arc(sx,cy,20,0,Math.PI*2);ctx.fill();

    // Observer
    ctx.fillStyle='rgba(56,189,248,0.6)';ctx.font='9px "Share Tech Mono"';ctx.fillText('👁 OBSERVER',W-90,cy+5);
    ctx.strokeStyle='rgba(56,189,248,0.3)';ctx.setLineDash([3,6]);ctx.beginPath();ctx.moveTo(W-30,cy);ctx.lineTo(sx+22,cy);ctx.stroke();ctx.setLineDash([]);

    // Velocity/redshift readout
    const col=vkms>0?'#FF5533':vkms<0?'#4499FF':'#94A3B8';
    ctx.fillStyle=col;ctx.font='bold 13px "Share Tech Mono"';
    ctx.fillText(`v = ${(vkms).toFixed(0)} km/s  (${(vkms/C*100).toFixed(2)}% c)`,cx-120,cy-55);
    ctx.fillStyle='rgba(148,163,184,0.7)';ctx.font='9px "Share Tech Mono"';
    ctx.fillText(`z = ${z.toFixed(5)}  |  Hα: ${(656.3*(1+z)).toFixed(2)} nm`,cx-80,cy-40);

    // Spectra
    const specY1=H*0.52,specY2=H*0.72,specH=55;
    drawSpectrum(specY1,specH,0,'REST FRAME SPECTRUM (Laboratory)',false);
    drawSpectrum(specY2,specH,vkms,'OBSERVED SPECTRUM',true);

    const el=document.getElementById('dsInfo');
    if(el)el.innerHTML=`z = ${z.toFixed(5)}<br>v = ${(vkms/1000).toFixed(1)}k km/s<br>Hα obs: ${(656.3*(1+z)).toFixed(2)} nm<br>${vkms>0?'↗ RECEDING (REDSHIFT)':vkms<0?'↙ APPROACHING (BLUESHIFT)':'↔ AT REST'}`;
  }
  animate();
  window._simCleanup=()=>{running=false;window.removeEventListener('resize',resize);};
})();
