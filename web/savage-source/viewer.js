/* Original procedural concept meshes. Real geometry, orbiting, per-key lighting and SYNC.
   Three.js is loaded from a local, pinned vendor file only when LIGHT LAB approaches. */
(() => {
  'use strict';
  const api=window.SAVAGE,stage=document.getElementById('lab-stage'),canvas=document.getElementById('lab-canvas');
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const saved=api.state.light;
  const modes=['solid','breathe','wave','spectrum','reactive'];
  const settings={
    device:'keyboard',mode:api.state.motion&&modes.includes(saved.mode)?saved.mode:api.state.motion?'wave':'solid',
    color:/^#[0-9a-f]{6}$/i.test(saved.color||'')?saved.color:'#ff4d26',
    brightness:Number.isFinite(saved.brightness)?Math.min(100,Math.max(0,saved.brightness)):75,
    speed:Number.isFinite(saved.speed)?Math.min(2,Math.max(.2,saved.speed)):1,
    night:!!saved.night,sound:false,auto:false
  };
  let ready=false,loading=false,failed=false,visible=false,bootPromise;
  let THREE,renderer,scene,camera,models,lights,hemi,keyLight,rimLight,root;
  let loopId=0,lastFrame=0,elapsed=0,pulseTime=-10,pulseX=0,dragging=false,moved=false;
  let radius=12,targetRadius=12,theta=.37,phi=.76;
  let keys=[],keyMesh,keyLED,keyLegends,legendPositions,keyLookup=new Map(),pressed=new Map();
  const strips=[],pointers=new Map();
  const v3=(x,y,z)=>new THREE.Vector3(x,y,z);
  const dark='#20252c',metal='#454d57',orange='#ff4d26';
  const limit=(v,a,b)=>Math.min(b,Math.max(a,v));
  function controlsUI(){
    $$('button[data-device]').forEach(b=>{b.classList.toggle('is-active',b.dataset.device===settings.device);b.setAttribute('aria-pressed',String(b.dataset.device===settings.device));});
    $$('button[data-mode]').forEach(b=>{b.classList.toggle('is-active',b.dataset.mode===settings.mode);b.setAttribute('aria-pressed',String(b.dataset.mode===settings.mode));});
    $$('button[data-color]').forEach(b=>{b.classList.toggle('is-active',b.dataset.color===settings.color);b.setAttribute('aria-pressed',String(b.dataset.color===settings.color));});
    $('#lab-color').value=settings.color;$('#lab-brightness').value=settings.brightness;$('#lab-speed').value=settings.speed*100;
    $('#brightness-value').textContent=settings.brightness+'%';$('#speed-value').textContent=settings.speed.toFixed(1)+'×';
    $$('[data-lab="night"]').forEach(b=>b.setAttribute('aria-pressed',String(settings.night)));
    $$('[data-lab="sound"]').forEach(b=>b.setAttribute('aria-pressed',String(settings.sound)));
    $$('[data-lab="rotate"]').forEach(b=>b.setAttribute('aria-pressed',String(settings.auto)));
    $('.lab-model-name').textContent={keyboard:'STRIKE 75',mouse:'PULSE PRO',headset:'ECHO X',sync:'SAVAGE / SYNC'}[settings.device];
    $('.reactive-note').style.opacity=settings.mode==='reactive'?'1':'.6';
    stage.dataset.lightDevice=settings.device;stage.dataset.lightMode=settings.mode;stage.dataset.lightColor=settings.color;stage.dataset.lightBrightness=String(settings.brightness);
  }
  function fail(){
    failed=true;$('.lab-loading').hidden=true;$('.lab-fallback').hidden=false;canvas.hidden=true;
    $$('[data-mode],[data-device],[data-color],[data-lab],#lab-color,#lab-brightness,#lab-speed').forEach(b=>b.disabled=true);
    stage.dataset.status='fallback';
  }
  function loadScript(src){
    return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});
  }
  async function boot(){
    if(ready||failed)return;if(loading)return bootPromise;
    loading=true;
    bootPromise=(async()=>{
      try{
        if(!window.THREE)await loadScript('assets/vendor/three-0.160.1.min.js');
        THREE=window.THREE;
        renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
        renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio,1.3),matchMedia('(pointer:coarse)').matches?1.35:1.75));
        renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
        renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
        scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(34,1,.1,80);
        hemi=new THREE.HemisphereLight('#eaf3ff','#292024',2.1);scene.add(hemi);
        keyLight=new THREE.DirectionalLight('#eaf1ff',4.2);keyLight.position.set(-4,9,7);keyLight.castShadow=true;keyLight.shadow.mapSize.set(1024,1024);keyLight.shadow.camera.left=-7;keyLight.shadow.camera.right=7;keyLight.shadow.camera.top=7;keyLight.shadow.camera.bottom=-7;keyLight.shadow.normalBias=.025;scene.add(keyLight);
        const fill=new THREE.DirectionalLight('#bdc9e5',2);fill.position.set(6,3,-6);scene.add(fill);
        rimLight=new THREE.PointLight(settings.color,10,18,2);rimLight.position.set(0,1.2,3);scene.add(rimLight);
        const env=new THREE.Scene();
        const roomMat=new THREE.MeshBasicMaterial({color:'#343c49',side:THREE.BackSide});
        env.add(new THREE.Mesh(new THREE.BoxGeometry(40,30,40),roomMat));
        [[-5,8,0,7,7],[5,5,4,4,8],[0,6,-8,8,4]].forEach(([x,y,z,w,h])=>{
          const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide}));
          panel.position.set(x,y,z);panel.lookAt(0,0,0);env.add(panel);
        });
        const pmrem=new THREE.PMREMGenerator(renderer);const environment=pmrem.fromScene(env,.08);scene.environment=environment.texture;pmrem.dispose();
        root=new THREE.Group();scene.add(root);
        models={keyboard:buildKeyboard(),mouse:buildMouse(),headset:buildHeadset()};
        Object.values(models).forEach(model=>root.add(model));
        prepareBloom();resize();ready=true;loading=false;
        $('.lab-loading').hidden=true;stage.dataset.status='ready';setDevice(settings.device);setNight();controlsUI();start();
      }catch(error){console.warn('SAVAGE 3D viewer unavailable:',error?.message);fail();}
    })();
    return bootPromise;
  }
  function material(color,metalness=.2,roughness=.45){
    return new THREE.MeshStandardMaterial({color,metalness,roughness});
  }
  function roundedGeometry(w,h,d,r=.07){
    r=Math.min(r,w/4,d/4,h/2);
    const x=-w/2+r,y=-d/2+r,a=w-2*r,b=d-2*r;
    const s=new THREE.Shape();s.moveTo(x+r,y);s.lineTo(x+a-r,y);s.quadraticCurveTo(x+a,y,x+a,y+r);
    s.lineTo(x+a,y+b-r);s.quadraticCurveTo(x+a,y+b,x+a-r,y+b);s.lineTo(x+r,y+b);
    s.quadraticCurveTo(x,y+b,x,y+b-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
    const g=new THREE.ExtrudeGeometry(s,{depth:Math.max(.01,h-2*r),steps:1,bevelEnabled:true,bevelSegments:5,bevelSize:r,bevelThickness:r,curveSegments:8});
    g.rotateX(-Math.PI/2);g.translate(0,-(h-2*r)/2,0);g.computeVertexNormals();return g;
  }
  function box(parent,w,h,d,mat,x=0,y=0,z=0,r=.05){
    const mesh=new THREE.Mesh(roundedGeometry(w,h,d,r),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function tube(parent,points,r=.025,closed=false,lit=false,phase=0){
    const curve=new THREE.CatmullRomCurve3(points.map(p=>v3(...p)),closed);
    const geom=new THREE.TubeGeometry(curve,Math.max(40,points.length*8),r,6,closed);
    let mat;
    if(lit){
      const colors=new Float32Array(geom.attributes.position.count*3);geom.setAttribute('color',new THREE.BufferAttribute(colors,3));
      mat=new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false});
    }else mat=material('#383f49',.6,.32);
    const mesh=new THREE.Mesh(geom,mat);parent.add(mesh);if(lit)strips.push({mesh,phase});return mesh;
  }
  function roundLoop(w,d,y,r=.12){
    const points=[];[[w/2-r,d/2-r,0],[ -w/2+r,d/2-r,Math.PI/2],[-w/2+r,-d/2+r,Math.PI],[w/2-r,-d/2+r,Math.PI*1.5]].forEach(([cx,cz,start])=>{
      for(let i=0;i<=7;i++){const angle=start+i/7*Math.PI/2;points.push([cx+Math.cos(angle)*r,y,cz+Math.sin(angle)*r]);}
    });return points;
  }
  function canvasTexture(draw,w=512,h=256){
    const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=renderer.capabilities.getMaxAnisotropy();return texture;
  }
  function brandPlane(parent,w,h,x,y,z,rotationY=0){
    const map=canvasTexture((ctx,cw,ch)=>{
      ctx.fillStyle='#ff4d26';ctx.beginPath();ctx.moveTo(70,65);ctx.lineTo(140,65);ctx.lineTo(205,145);ctx.lineTo(279,65);ctx.lineTo(350,65);ctx.lineTo(231,204);ctx.lineTo(179,204);ctx.closePath();ctx.fill();
      ctx.beginPath();ctx.moveTo(243,204);ctx.lineTo(363,65);ctx.lineTo(407,65);ctx.lineTo(510,204);ctx.lineTo(440,204);ctx.lineTo(383,126);ctx.lineTo(312,204);ctx.closePath();ctx.fill();
    },580,260);
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));mesh.position.set(x,y,z);mesh.rotation.y=rotationY;parent.add(mesh);return mesh;
  }
  function buildKeyboard(){
    const g=new THREE.Group();g.name='STRIKE 75';const alu=material(metal,.78,.29),plastic=material('#12171d',.05,.6);
    box(g,8.3,.36,3.92,alu,0,0,0,.13);box(g,8.08,.09,3.69,plastic,0,.205,0,.05);
    box(g,7.9,.055,3.46,material('#333c45',.5,.45),0,.263,.03,.02);
    tube(g,roundLoop(8.25,3.88,-.08,.18),.025,true,true);
    tube(g,[[-4.1,.08,-1.25],[-4.1,.08,0],[-4.1,.08,1.3]],.016,false,true,.25);
    box(g,.5,.10,.02,material('#06090c',.1,.35),-2.8,-.02,-1.965,.01);
    box(g,.34,.055,.025,material('#737f8c',.8,.24),-2.8,-.02,-1.98,.01);
    [-3.1,3.1].forEach(x=>[-1.32,1.32].forEach(z=>box(g,.6,.07,.35,material('#080a0d',0,.8),x,-.23,z,.03)));
    const rows=[
      [['Esc',1],['F1',1],['F2',1],['F3',1],['F4',1],['F5',1],['F6',1],['F7',1],['F8',1],['F9',1],['F10',1],['F11',1],['F12',1]],
      [['~',1],['1',1],['2',1],['3',1],['4',1],['5',1],['6',1],['7',1],['8',1],['9',1],['0',1],['-',1],['=',1],['Back',2],['Del',1]],
      [['Tab',1.5],...Array.from('QWERTYUIOP').map(k=>[k,1]),['[',1],[']',1],['\\',1.5],['PgUp',1]],
      [['Caps',1.75],...Array.from('ASDFGHJKL').map(k=>[k,1]),[';',1],["'",1],['Enter',2.25],['PgDn',1]],
      [['Shift',2.25],...Array.from('ZXCVBNM').map(k=>[k,1]),[',',1],['.',1],['/',1],['Shift',1.75],['↑',1],['End',1]],
      [['Ctrl',1.25],['Win',1.25],['Alt',1.25],['SAVAGE',6.25],['Alt',1],['Fn',1],['Ctrl',1],['←',1],['↓',1],['→',1]]
    ];
    rows.forEach((row,r)=>{
      let cursor=-3.92;
      row.forEach(([label,units],c)=>{
        const width=units*.49-.055;let x=cursor+units*.49/2;
        if(r===0)x=-3.675+c*.515+(c>0?.25:0);
        keys.push({label,x,z:-1.45+r*.565,w:width,row:r,col:c,y:.44,index:keys.length});cursor+=units*.49;
      });
    });
    keyMesh=new THREE.InstancedMesh(roundedGeometry(.43,.19,.45,.03),material('#ffffff',.08,.55),keys.length);
    keyLED=new THREE.InstancedMesh(roundedGeometry(.475,.035,.49,.012),new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false}),keys.length);
    keyMesh.castShadow=true;keyMesh.receiveShadow=true;keyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);keyLED.instanceColor=null;
    const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),scale=new THREE.Vector3(),pos=new THREE.Vector3();
    keys.forEach(k=>{
      scale.set(k.w/.43,1,1);pos.set(k.x,k.y,k.z);matrix.compose(pos,q,scale);keyMesh.setMatrixAt(k.index,matrix);
      keyMesh.setColorAt(k.index,new THREE.Color(k.label==='Esc'||k.label==='Enter'?orange:'#262d35'));
      pos.y=.307;scale.set(k.w/.43,1,1);matrix.compose(pos,q,scale);keyLED.setMatrixAt(k.index,matrix);keyLED.setColorAt(k.index,new THREE.Color(orange));
      if(k.label.length===1)keyLookup.set(k.label.toLowerCase(),k.index);if(k.label==='SAVAGE')keyLookup.set(' ',k.index);if(k.label==='Enter')keyLookup.set('enter',k.index);
    });
    g.add(keyLED,keyMesh);makeLegends(g);
    const dial=new THREE.Mesh(new THREE.CylinderGeometry(.27,.29,.22,48),material('#414953',.85,.25));dial.position.set(3.55,.43,-1.45);g.add(dial);
    const dialRing=new THREE.Mesh(new THREE.TorusGeometry(.29,.018,8,48),new THREE.MeshBasicMaterial({color:orange,toneMapped:false}));dialRing.rotation.x=Math.PI/2;dialRing.position.set(3.55,.34,-1.45);g.add(dialRing);strips.push({mesh:dialRing,simple:true,phase:.8});
    box(g,.56,.025,.35,material('#020407',.3,.25),2.78,.29,-1.43,.02);
    brandPlane(g,.75,.31,0,-.005,1.97,0);
    return g;
  }
  function makeLegends(parent){
    const atlas=canvasTexture((ctx,w,h)=>{ctx.fillStyle='#d7dfe7';ctx.textAlign='center';ctx.textBaseline='middle';keys.forEach(k=>{const x=(k.index%16)*64+32,y=Math.floor(k.index/16)*64+32;ctx.font=(k.label.length>3?'16':'23')+'px Arial';ctx.fillText(k.label,x,y);});},1024,512);
    const positions=[],uvs=[],normals=[],indices=[];
    keys.forEach(k=>{
      const i=k.index,cellx=(i%16)/16,celly=Math.floor(i/16)/8,w=Math.min(k.w*.75,k.label.length>2?.38:.24),h=.19;
      const x=k.x-(k.w>w+.08?(k.w-w)/2-.04:0),z=k.z-.03;
      positions.push(x-w/2,.554,z-h/2,x+w/2,.554,z-h/2,x+w/2,.554,z+h/2,x-w/2,.554,z+h/2);
      uvs.push(cellx,1-celly,cellx+1/16,1-celly,cellx+1/16,1-celly-1/8,cellx,1-celly-1/8);
      for(let n=0;n<4;n++)normals.push(0,1,0);const b=i*4;indices.push(b,b+2,b+1,b,b+3,b+2);
    });
    const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geom.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geom.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geom.setIndex(indices);
    keyLegends=new THREE.Mesh(geom,new THREE.MeshBasicMaterial({map:atlas,transparent:true,alphaTest:.08,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));parent.add(keyLegends);legendPositions=geom.attributes.position;
  }
  function buildMouse(){
    const g=new THREE.Group();g.name='PULSE PRO';
    const base=material('#11161d',.12,.5),shell=material('#303740',.42,.38);
    function shellPatch(zStart,zEnd,aStart,aEnd,mat){
      const positions=[],uvs=[],indices=[],rows=48,cols=40;
      for(let r=0;r<=rows;r++){
        const z=zStart+(zEnd-zStart)*r/rows,u=z/1.58,width=.90*Math.pow(Math.max(.0001,1-Math.pow(u,4)),.24)*(1+u*.035),height=.85*Math.sqrt(Math.max(.0001,1-Math.pow(u,4)))*(1+.14*u);
        for(let c=0;c<=cols;c++){const a=aStart+(aEnd-aStart)*c/cols;positions.push(width*Math.cos(a),.155+height*Math.pow(Math.max(0,Math.sin(a)),.8),z);uvs.push(c/cols,r/rows);}
      }
      for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const i=r*(cols+1)+c;indices.push(i,i+1,i+cols+1,i+1,i+cols+2,i+cols+1);}
      const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geom.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geom.setIndex(indices);geom.computeVertexNormals();
      const mesh=new THREE.Mesh(geom,mat);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);return mesh;
    }
    shell.side=THREE.DoubleSide;shellPatch(-.13,1.579,0,Math.PI,shell);
    const buttonMat=material('#3a424c',.38,.37);buttonMat.side=THREE.DoubleSide;
    shellPatch(-1.579,-.151,0,Math.PI/2-.019,buttonMat);shellPatch(-1.579,-.151,Math.PI/2+.019,Math.PI,buttonMat);
    const outline=new THREE.Shape();for(let i=0;i<=100;i++){const a=i/100*Math.PI*2,x=.87*Math.sign(Math.cos(a))*Math.pow(Math.abs(Math.cos(a)),.62),z=1.55*Math.sin(a);if(i===0)outline.moveTo(x,z);else outline.lineTo(x,z);}outline.closePath();
    const bottomGeom=new THREE.ExtrudeGeometry(outline,{depth:.09,bevelEnabled:true,bevelSegments:3,bevelSize:.025,bevelThickness:.025,steps:1});bottomGeom.rotateX(-Math.PI/2);bottomGeom.translate(0,.02,0);
    const baseMesh=new THREE.Mesh(bottomGeom,base);g.add(baseMesh);
    const seam=[];for(let i=0;i<80;i++){const a=i/80*Math.PI*2;seam.push([Math.cos(a)*.91,.17,Math.sin(a)*1.53]);}
    tube(g,seam,.025,true,true,.2);
    const grooveMat=material('#080b10',0,.8);
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.20,.20,.19,48),material('#090d13',.1,.6));wheel.rotation.z=Math.PI/2;wheel.position.set(0,.90,-.83);g.add(wheel);
    [-.105,.105].forEach(x=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(.195,.022,10,48),new THREE.MeshBasicMaterial({color:orange,toneMapped:false}));ring.rotation.y=Math.PI/2;ring.position.set(x,.90,-.83);g.add(ring);strips.push({mesh:ring,simple:true,phase:.3});});
    for(let i=0;i<18;i++){const a=i/18*Math.PI*2;const tread=new THREE.Mesh(new THREE.BoxGeometry(.17,.018,.035),grooveMat);tread.position.set(0,.90+Math.cos(a)*.205,-.83+Math.sin(a)*.205);tread.rotation.x=a;g.add(tread);}
    [-.3,.25].forEach(z=>box(g,.075,.1,.40,material(orange,.2,.36),-.91,.40,z,.035));
    [-1,1].forEach(sign=>box(g,1.05,.03,.35,material('#c7cdd3',.05,.6),0,-.015,sign*1.06,.05));
    box(g,.30,.025,.38,material('#080b10',.1,.4),0,-.015,0,.02);
    brandPlane(g,.42,.19,0,1.045,.50,0).rotation.x=-Math.PI/2+.15;
    return g;
  }
  function cupGeometry(w,h,d,r=.23){
    const x=-w/2,y=-h/2,s=new THREE.Shape();s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
    const bevel=Math.min(d/4,.04),geom=new THREE.ExtrudeGeometry(s,{depth:d-bevel*2,steps:1,bevelEnabled:true,bevelSegments:6,bevelSize:bevel,bevelThickness:bevel,curveSegments:12});geom.translate(0,0,-(d-bevel*2)/2);geom.rotateY(Math.PI/2);geom.computeVertexNormals();return geom;
  }
  function buildHeadset(){
    const g=new THREE.Group();g.name='ECHO X';const shell=material('#353d48',.65,.31),pad=material('#11171f',.02,.8);
    const arc=[];for(let i=0;i<=32;i++){const a=i/32*Math.PI;arc.push([Math.cos(a)*1.42,.38+Math.sin(a)*1.63,0]);}
    const band=tube(g,arc,.11,false);band.scale.z=2.4;
    const cushion=tube(g,arc.map(([x,y,z])=>[x*.94,y-.08,z+.015]),.11,false);cushion.material=pad;cushion.scale.z=2.3;
    const edge=tube(g,arc.map(([x,y,z])=>[x,y,z-.13]),.018,false,true,.6);
    [-1,1].forEach(side=>{
      const cup=new THREE.Group();cup.position.set(side*1.39,-.17,0);cup.rotation.z=side*-.08;g.add(cup);
      const housing=new THREE.Mesh(cupGeometry(1.15,1.52,.43,.27),shell);housing.position.x=side*.07;housing.castShadow=true;cup.add(housing);
      const face=new THREE.Mesh(cupGeometry(1.03,1.35,.06,.24),material('#1e2630',.4,.38));face.position.x=side*.32;cup.add(face);
      const cushion=new THREE.Mesh(new THREE.TorusGeometry(.54,.145,12,48),pad);cushion.rotation.y=Math.PI/2;cushion.scale.set(1,1.18,1);cushion.position.x=-side*.22;cup.add(cushion);
      const inner=new THREE.Mesh(new THREE.CircleGeometry(.52,40),material('#151c25',.1,.9));inner.rotation.y=side*Math.PI/2;inner.scale.y=1.17;inner.position.x=-side*.18;cup.add(inner);
      const pts=roundLoop(1.06,1.36,0,.19).map(([x,y,z])=>[side*.385,z,x]);
      tube(cup,pts,.022,true,true,side<0?.15:.65);
      brandPlane(cup,.54,.24,side*.388,.015,0,side*Math.PI/2);
      tube(g,[[side*1.42,.86,0],[side*1.69,.64,0],[side*1.69,.21,0]],.055,false);
    });
    tube(g,[[-1.7,-.4,.2],[-1.78,-.65,.8],[-1.5,-.85,1.40],[-.85,-.9,1.65]],.045,false);
    const mic=new THREE.Mesh(new THREE.SphereGeometry(.12,20,12),pad);mic.scale.z=1.6;mic.position.set(-.85,-.9,1.65);g.add(mic);
    const tip=new THREE.Mesh(new THREE.TorusGeometry(.095,.018,8,24),new THREE.MeshBasicMaterial({color:orange,toneMapped:false}));tip.position.set(-.85,-.9,1.80);g.add(tip);strips.push({mesh:tip,simple:true,phase:.2});
    g.position.y=-.2;return g;
  }
  let target,blurA,blurB,postScene,postCamera,quad,extractMat,blurMat,finalMat;
  function prepareBloom(){
    const options={type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false};
    target=new THREE.WebGLRenderTarget(1,1,{...options,depthBuffer:true});target.samples=renderer.capabilities.isWebGL2?4:0;blurA=new THREE.WebGLRenderTarget(1,1,options);blurB=new THREE.WebGLRenderTarget(1,1,options);
    postScene=new THREE.Scene();postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
    extractMat=new THREE.ShaderMaterial({uniforms:{image:{value:null}},vertexShader:vertex,fragmentShader:'varying vec2 vUv;uniform sampler2D image;void main(){vec4 c=texture2D(image,vUv);float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c.rgb*smoothstep(.72,1.3,l),1.);}'});
    blurMat=new THREE.ShaderMaterial({uniforms:{image:{value:null},direction:{value:new THREE.Vector2()}},vertexShader:vertex,fragmentShader:'varying vec2 vUv;uniform sampler2D image;uniform vec2 direction;void main(){vec3 c=texture2D(image,vUv).rgb*.227027;c+=texture2D(image,vUv+direction*1.384615).rgb*.316216;c+=texture2D(image,vUv-direction*1.384615).rgb*.316216;c+=texture2D(image,vUv+direction*3.230769).rgb*.070270;c+=texture2D(image,vUv-direction*3.230769).rgb*.070270;gl_FragColor=vec4(c,1.);}'});
    finalMat=new THREE.ShaderMaterial({uniforms:{image:{value:target.texture},bloom:{value:blurA.texture},strength:{value:.35}},vertexShader:vertex,fragmentShader:'varying vec2 vUv;uniform sampler2D image;uniform sampler2D bloom;uniform float strength;void main(){vec4 b=texture2D(image,vUv);vec3 glow=texture2D(bloom,vUv).rgb*strength;gl_FragColor=vec4(b.rgb+glow,max(b.a,clamp(max(glow.r,max(glow.g,glow.b)),0.,1.)));#include <colorspace_fragment>}'.replace(';#include',';\n#include')});
    quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),extractMat);postScene.add(quad);
  }
  function resize(){
    if(!renderer)return;const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    const ratio=renderer.getPixelRatio();target.setSize(w*ratio,h*ratio);blurA.setSize(Math.max(1,w*ratio/2),Math.max(1,h*ratio/2));blurB.setSize(Math.max(1,w*ratio/2),Math.max(1,h*ratio/2));start();
  }
  function renderPost(){
    renderer.setRenderTarget(target);renderer.clear();renderer.render(scene,camera);
    quad.material=extractMat;extractMat.uniforms.image.value=target.texture;renderer.setRenderTarget(blurA);renderer.render(postScene,postCamera);
    quad.material=blurMat;blurMat.uniforms.image.value=blurA.texture;blurMat.uniforms.direction.value.set(2/blurA.width,0);renderer.setRenderTarget(blurB);renderer.render(postScene,postCamera);
    blurMat.uniforms.image.value=blurB.texture;blurMat.uniforms.direction.value.set(0,2/blurA.height);renderer.setRenderTarget(blurA);renderer.render(postScene,postCamera);
    quad.material=finalMat;finalMat.uniforms.strength.value=settings.night?.60:.32;renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
  }
  const tint={};
  function colorAt(phase,x,time){
    const color=tint.color||(tint.color=new THREE.Color());const base=tint.base||(tint.base=new THREE.Color());
    base.set(settings.color);let power=settings.brightness/100;
    if(settings.mode==='breathe')power*=.18+.82*(.5+.5*Math.sin(time*1.7));
    if(settings.mode==='wave')power*=.14+.86*Math.pow(.5+.5*Math.sin(time*2.2-phase*6.283),2);
    if(settings.mode==='spectrum')color.setHSL((time*.09+phase*.65)%1,.90,.55);else color.copy(base);
    if(settings.mode==='reactive'){
      const age=elapsed-pulseTime,dist=Math.abs(x-pulseX);
      const wave=Math.exp(-Math.pow(dist-age*5,2)*3.6)*Math.exp(-age*1.3);
      power*=.045+wave*1.6;color.lerp(new THREE.Color('#fff2e4'),wave*.45);
    }
    color.multiplyScalar(power*2.5);return color;
  }
  function animateLights(){
    const time=elapsed*settings.speed;
    if(keyLED&&models.keyboard.visible){
      keys.forEach(k=>keyLED.setColorAt(k.index,colorAt((k.x+4)/8,k.x,time)));keyLED.instanceColor.needsUpdate=true;
    }
    strips.forEach(({mesh,phase,simple})=>{
      if(!mesh.parent?.visible&&!mesh.parent?.parent?.visible)return;
      if(simple){mesh.material.color.copy(colorAt(phase,phase*8-4,time));return;}
      const pos=mesh.geometry.attributes.position,colors=mesh.geometry.attributes.color;
      for(let i=0;i<pos.count;i++){
        const p=(i/7)/(pos.count/7),x=pos.getX(i),c=colorAt(p+phase,x,time);colors.setXYZ(i,c.r,c.g,c.b);
      }colors.needsUpdate=true;
    });
    rimLight.color.set(settings.color);rimLight.intensity=settings.brightness/100*(settings.night?5:2);
  }
  function updatePresses(){
    if(!pressed.size||!keyMesh)return;
    const matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
    pressed.forEach((start,index)=>{
      const age=elapsed-start,k=keys[index],down=age<.08?Math.sin(age/.08*Math.PI/2)*.075:Math.max(0,(.27-age)/.19)*.075;
      matrix.compose(v3(k.x,k.y-down,k.z),q,v3(k.w/.43,1,1));keyMesh.setMatrixAt(index,matrix);
      for(let i=0;i<4;i++)legendPositions.setY(index*4+i,.554-down);
      if(age>.27)pressed.delete(index);
    });keyMesh.instanceMatrix.needsUpdate=true;legendPositions.needsUpdate=true;
  }
  function renderFrame(now){
    loopId=0;if(!visible||document.hidden||!ready)return;
    const delta=lastFrame?Math.min((now-lastFrame)/1000,.05):.016;lastFrame=now;elapsed+=delta;
    if(settings.auto&&api.state.motion&&!dragging)theta+=delta*.18;
    radius+=(targetRadius-radius)*.14;
    camera.position.set(radius*Math.sin(phi)*Math.sin(theta),radius*Math.cos(phi),radius*Math.sin(phi)*Math.cos(theta));
    camera.lookAt(settings.device==='headset'?v3(0,.35,0):v3(0,.05,0));
    animateLights();updatePresses();renderPost();
    stage.dataset.frames=String((Number(stage.dataset.frames)||0)+1);
    if(api.state.motion||dragging||pressed.size||Math.abs(radius-targetRadius)>.01)start();
  }
  function start(){if(!loopId&&ready&&visible&&!document.hidden)loopId=requestAnimationFrame(renderFrame);}
  function setNight(){
    if(!ready)return;hemi.intensity=settings.night?.38:2.1;keyLight.intensity=settings.night?1.0:4.2;renderer.toneMappingExposure=settings.night?.95:1.2;start();
  }
  function setDevice(id){
    if(!['keyboard','mouse','headset','sync'].includes(id))return;settings.device=id;controlsUI();
    if(!ready){boot();return;}
    Object.entries(models).forEach(([name,m])=>{m.visible=name===id||id==='sync';m.position.set(0,name==='headset'?-.2:0,0);m.scale.setScalar(1);m.rotation.set(0,0,0);});
    if(id==='sync'){
      models.keyboard.position.set(-.85,-.35,.8);models.keyboard.scale.setScalar(.72);models.keyboard.rotation.y=.12;
      models.mouse.position.set(3.3,-.20,1.45);models.mouse.scale.setScalar(.75);
      models.headset.position.set(2.4,.85,-1.5);models.headset.scale.setScalar(.90);
    }
    resetView();pulseTime=elapsed;start();
  }
  function resetView(){targetRadius={keyboard:12,mouse:6.6,headset:7.9,sync:15.5}[settings.device];if(innerWidth<701)targetRadius*=1.25;radius=targetRadius;theta=settings.device==='mouse'?Math.PI+.55:.35;phi=settings.device==='headset'?1.13:.77;settings.auto=false;controlsUI();start();}
  let audio;
  function clickSound(){
    if(!settings.sound)return;
    try{
      audio=audio||new(window.AudioContext||window.webkitAudioContext)();audio.resume();
      const len=Math.floor(audio.sampleRate*.045),buffer=audio.createBuffer(1,len,audio.sampleRate),data=buffer.getChannelData(0);
      for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/len*7);
      const src=audio.createBufferSource();src.buffer=buffer;const filter=audio.createBiquadFilter();filter.type='bandpass';filter.frequency.value=1650;filter.Q.value=.8;const gain=audio.createGain();gain.gain.value=.16;src.connect(filter);filter.connect(gain);gain.connect(audio.destination);src.start();
    }catch(_){}
  }
  function flash(index=keys.findIndex(k=>k.label==='G')){
    pulseTime=elapsed;const k=keys[index];pulseX=k?.x||0;if(k)pressed.set(index,elapsed);clickSound();start();
  }
  const raycaster=()=>{const ray=new THREE.Raycaster();return ray;};
  function hitKey(event){
    if(!ready)return;const r=canvas.getBoundingClientRect(),mouse=new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);
    const ray=raycaster();ray.setFromCamera(mouse,camera);
    const hit=models.keyboard.visible?ray.intersectObject(keyMesh)[0]:null;
    flash(hit?.instanceId??keys.findIndex(k=>k.label==='G'));
  }
  canvas.addEventListener('pointerdown',e=>{
    if(!ready||e.button>0)return;canvas.focus({preventScroll:true});pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    canvas.setPointerCapture(e.pointerId);dragging=true;moved=false;settings.auto=false;controlsUI();start();
  });
  canvas.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;const prev=pointers.get(e.pointerId),dx=e.clientX-prev.x,dy=e.clientY-prev.y;
    if(pointers.size===1){theta-=dx*.008;phi=limit(phi-dy*.007,.08,Math.PI-.08);}
    else{const other=[...pointers.entries()].find(([id])=>id!==e.pointerId)?.[1];if(other){const old=Math.hypot(prev.x-other.x,prev.y-other.y),next=Math.hypot(e.clientX-other.x,e.clientY-other.y);if(next>0)targetRadius=limit(targetRadius*old/next,2.5,22);}}
    if(Math.abs(dx)+Math.abs(dy)>2)moved=true;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});start();
  });
  function pointerEnd(e){if(!pointers.has(e.pointerId))return;if(!moved&&pointers.size===1)hitKey(e);pointers.delete(e.pointerId);dragging=pointers.size>0;start();}
  canvas.addEventListener('pointerup',pointerEnd);canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);dragging=false;});
  canvas.addEventListener('wheel',e=>{if(document.activeElement!==canvas&&!e.ctrlKey)return;e.preventDefault();targetRadius=limit(targetRadius*(1+e.deltaY*.001),2.5,22);start();},{passive:false});
  canvas.addEventListener('keydown',e=>{
    if(e.key===' ')e.preventDefault();
    if(e.key.startsWith('Arrow')){e.preventDefault();if(e.key==='ArrowLeft')theta+=.13;if(e.key==='ArrowRight')theta-=.13;if(e.key==='ArrowUp')phi=limit(phi-.1,.08,Math.PI-.08);if(e.key==='ArrowDown')phi=limit(phi+.1,.08,Math.PI-.08);start();}
    else if(e.key==='+'||e.key==='='){e.preventDefault();targetRadius=limit(targetRadius*.88,2.5,22);start();}
    else if(e.key==='-'){e.preventDefault();targetRadius=limit(targetRadius*1.12,2.5,22);start();}
    else if(e.key.toLowerCase()==='r'){resetView();}
  });
  document.addEventListener('keydown',e=>{
    if(!ready||!visible||e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,textarea,select')||$('#dialog').open)return;
    const index=keyLookup.get(e.key.toLowerCase());if(index!==undefined)flash(index);
  });
  document.addEventListener('click',e=>{
    const device=e.target.closest('button[data-device]');if(device){setDevice(device.dataset.device);return;}
    const mode=e.target.closest('button[data-mode]');if(mode){settings.mode=mode.dataset.mode;pulseTime=elapsed;controlsUI();start();return;}
    const color=e.target.closest('button[data-color]');if(color){settings.color=color.dataset.color;controlsUI();start();return;}
    const action=e.target.closest('[data-lab]')?.dataset.lab;if(!action)return;
    if(action==='zoom-in'){targetRadius=limit(targetRadius*.86,2.5,22);start();}
    if(action==='zoom-out'){targetRadius=limit(targetRadius*1.16,2.5,22);start();}
    if(action==='reset')resetView();
    if(action==='rotate'){settings.auto=!settings.auto;controlsUI();start();}
    if(action==='night'){settings.night=!settings.night;setNight();controlsUI();}
    if(action==='sound'){settings.sound=!settings.sound;controlsUI();if(settings.sound)clickSound();}
    if(action==='save'){api.state.light={mode:settings.mode,color:settings.color,brightness:settings.brightness,speed:settings.speed,night:settings.night};api.persist();api.toast(api.t('lightSaved'));}
  });
  $('#lab-color').addEventListener('input',e=>{settings.color=e.target.value;controlsUI();start();});
  $('#lab-brightness').addEventListener('input',e=>{settings.brightness=Number(e.target.value);controlsUI();start();});
  $('#lab-speed').addEventListener('input',e=>{settings.speed=Number(e.target.value)/100;controlsUI();start();});
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(entries=>{entries.forEach(entry=>{visible=entry.isIntersecting;if(visible){boot();lastFrame=0;start();}else if(loopId){cancelAnimationFrame(loopId);loopId=0;}});},{rootMargin:'150px'}).observe(stage);
  document.addEventListener('visibilitychange',()=>{lastFrame=0;start();});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();if(loopId)cancelAnimationFrame(loopId);fail();});
  controlsUI();
  window.SavageLab={setDevice,localize:controlsUI,motionChanged(enabled){if(!enabled){settings.auto=false;settings.mode='solid';}controlsUI();start();},settings,get ready(){return ready;},get diagnostics(){return ready?{device:settings.device,mode:settings.mode,frames:Number(stage.dataset.frames||0),visibleModels:Object.entries(models).filter(([,m])=>m.visible).map(([name])=>name),geometries:renderer.info.memory.geometries,keys:keys.length,theta,phi,radius,audioState:audio?.state||'off'}:null;},flash,boot};
})();
