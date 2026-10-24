/* Detailed original product meshes with tactile materials and studio lighting. Real geometry, orbiting, per-key lighting and SYNC.
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
  let THREE,renderer,scene,camera,models,lights,hemi,keyLight,rimLight,root,fillLight,ground,studioLeather;
  let loopId=0,lastFrame=0,elapsed=0,pulseTime=-10,pulseX=0,dragging=false,moved=false;
  let radius=12,targetRadius=12,theta=.37,phi=.76;
  let keys=[],keyMesh,keyLED,keyLegends,legendPositions,keyLookup=new Map(),pressed=new Map();
  const strips=[],pointers=new Map();
  const v3=(x,y,z)=>new THREE.Vector3(x,y,z);
  const dark='#202123',metal='#555455',orange='#ff4d26';
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
        renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio,1.8),matchMedia('(pointer:coarse)').matches?1.65:2.1));
        renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
        renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
        scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(34,1,.1,80);
        hemi=new THREE.HemisphereLight('#f5f3ef','#29272a',2.05);scene.add(hemi);
        keyLight=new THREE.DirectionalLight('#fff6ec',4.0);keyLight.position.set(-5,8,4);keyLight.castShadow=true;keyLight.shadow.mapSize.set(2048,2048);keyLight.shadow.camera.left=-7;keyLight.shadow.camera.right=7;keyLight.shadow.camera.top=7;keyLight.shadow.camera.bottom=-7;keyLight.shadow.radius=4;keyLight.shadow.normalBias=.025;scene.add(keyLight);
        fillLight=new THREE.DirectionalLight('#eeeff5',2.8);fillLight.position.set(6,3,4);scene.add(fillLight);
        rimLight=new THREE.PointLight(settings.color,10,18,2);rimLight.position.set(0,1.2,3);scene.add(rimLight);

        await loadScript('assets/studio/studio-assets.js');
        await loadScript('assets/vendor/RGBELoader-r160.local.js');
        const packed=window.SAVAGE_STUDIO_ASSETS,binary=atob(packed.hdri),bytes=new Uint8Array(binary.length);
        for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
        const hdr=new window.SavageRGBELoader().parse(bytes.buffer);
        const hdrTexture=new THREE.DataTexture(hdr.data,hdr.width,hdr.height,THREE.RGBAFormat,hdr.type);
        hdrTexture.colorSpace=THREE.LinearSRGBColorSpace;hdrTexture.mapping=THREE.EquirectangularReflectionMapping;hdrTexture.minFilter=hdrTexture.magFilter=THREE.LinearFilter;hdrTexture.flipY=true;hdrTexture.needsUpdate=true;
        const pmrem=new THREE.PMREMGenerator(renderer);pmrem.compileEquirectangularShader();const environment=pmrem.fromEquirectangular(hdrTexture);scene.environment=environment.texture;hdrTexture.dispose();pmrem.dispose();
        const texture=async data=>{const t=await new THREE.TextureLoader().loadAsync(data);t.colorSpace=THREE.NoColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,.65);t.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());return t;};
        const [normal,rough]=await Promise.all([texture(packed.leatherNormal),texture(packed.leatherRough)]);studioLeather={normal,rough};
        stage.dataset.studio='photographic-hdri';stage.dataset.material='scanned-leather';
        root=new THREE.Group();scene.add(root);
        ground=new THREE.Mesh(new THREE.PlaneGeometry(45,45),new THREE.ShadowMaterial({color:'#000000',opacity:.065,depthWrite:false}));
        ground.rotation.x=-Math.PI/2;ground.position.y=-2.0;ground.receiveShadow=true;scene.add(ground);
        models={keyboard:buildKeyboard(),mouse:buildMouse(),headset:buildHeadset()};
        Object.values(models).forEach(model=>root.add(model));
        prepareBloom();resize();ready=true;loading=false;
        $('.lab-loading').hidden=true;stage.dataset.status='ready';setDevice(settings.device);setNight();controlsUI();start();
      }catch(error){console.warn('SAVAGE 3D viewer unavailable:',error?.message);fail();}
    })();
    return bootPromise;
  }


  const tactileMaps=new Map();
  function tactile(kind){
    if(tactileMaps.has(kind))return tactileMaps.get(kind);
    const N=512,H=new Float32Array(N*N),normal=new Uint8Array(N*N*4),rough=new Uint8Array(N*N*4);
    const hash=(x,y)=>{let n=Math.imul(x,374761393)^Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
    const noise=(x,y)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return (hash(ix,iy)*(1-u)+hash(ix+1,iy)*u)*(1-v)+(hash(ix,iy+1)*(1-u)+hash(ix+1,iy+1)*u)*v;};
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      let h;
      if(kind==='leather'){
        const px=x/10,py=y/10,cx=Math.floor(px),cy=Math.floor(py);let d1=9,d2=9;
        for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const xx=cx+i,yy=cy+j,dx=px-xx-hash(xx,yy),dy=py-yy-hash(xx+101,yy+53),d=dx*dx+dy*dy;if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}
        h=.25+.35*Math.min(1,(Math.sqrt(d2)-Math.sqrt(d1))*3.5)+noise(x*.23,y*.23)*.18+noise(x*.65,y*.65)*.06;
      }else if(kind==='rubber'){
        const a=Math.sin((x+y)*.65),b=Math.sin((x-y)*.65);h=.45+.13*a*b+noise(x*.35,y*.35)*.12;
      }else if(kind==='fabric'){
        h=.48+.12*Math.sin(x*1.5)*Math.cos(y*1.5)+noise(x*.5,y*.5)*.09;
      }else if(kind==='metal'){
        h=.48+noise(x*.04,y*.9)*.08+noise(x*.6,y*.6)*.025;
      }else h=.46+noise(x*.52,y*.52)*.16+noise(x*.15,y*.15)*.035;
      H[y*N+x]=h;
    }
    const strength={leather:2.8,rubber:2.0,fabric:2.2,metal:.35,plastic:.65}[kind]||.65;
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){
      const i=(y*N+x)*4,dx=(H[y*N+(x+1)%N]-H[y*N+(x+N-1)%N])*strength,dy=(H[((y+1)%N)*N+x]-H[((y+N-1)%N)*N+x])*strength,l=Math.sqrt(dx*dx+dy*dy+1);
      normal[i]=Math.round(127.5-dx/l*127.5);normal[i+1]=Math.round(127.5+dy/l*127.5);normal[i+2]=Math.round(127.5+127.5/l);normal[i+3]=255;
      const r=Math.round(220+H[y*N+x]*30);rough[i]=rough[i+1]=rough[i+2]=r;rough[i+3]=255;
    }
    const make=data=>{const t=new THREE.DataTexture(data,N,N,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());t.repeat.set(kind==='leather'?3:kind==='metal'?2:4,kind==='metal'?5:3);t.needsUpdate=true;return t;};
    const maps={normal:make(normal),rough:make(rough)};tactileMaps.set(kind,maps);return maps;
  }
  function material(color,metalness=.2,roughness=.45,finish){
    const organic=['leather','rubber','fabric'].includes(finish);
    const m=new THREE.MeshPhysicalMaterial({color,metalness,roughness,envMapIntensity:organic?.65:metalness>.6?1.05:.7,ior:1.48,clearcoat:organic?0:metalness>.6?.055:.025,clearcoatRoughness:.45});
    if(finish){const maps=finish==='leather'&&studioLeather?studioLeather:tactile(finish);m.normalMap=maps.normal;m.roughnessMap=maps.rough;m.normalScale=new THREE.Vector2(finish==='leather'?.48:finish==='rubber'?.28:.18,finish==='leather'?.48:finish==='rubber'?.28:.18);if(finish==='leather')m.roughness=.96;}
    return m;
  }
  const signedPow=(v,p)=>Math.sign(v)*Math.pow(Math.abs(v),p);
  function flipSurface(mesh){
    const a=mesh.geometry.index.array;for(let i=0;i<a.length;i+=3){const t=a[i+1];a[i+1]=a[i+2];a[i+2]=t;}mesh.geometry.computeVertexNormals();return mesh;
  }
  function surface(parent,fn,mat,U=100,V=64,name=''){
    const pos=[],uv=[],ix=[];
    for(let i=0;i<=U;i++)for(let j=0;j<=V;j++){
      pos.push(...fn(i/U,j/V));uv.push(i/U,j/V);
      if(i<U&&j<V){const k=i*(V+1)+j;ix.push(k,k+1,k+V+1,k+1,k+V+2,k+V+1);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,mat);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  // A closed swept shell with many curved bevel rings, expressed in the Y/Z plane.
  function shellYZ(parent,w,h,rings,mat,name=''){
    const N=128,p=[],uv=[],ix=[];
    rings.forEach(([x,scale],r)=>{
      for(let i=0;i<=N;i++){
        const a=i/N*Math.PI*2,yy=signedPow(Math.sin(a),.78),zz=signedPow(Math.cos(a),.78);
        p.push(x,h*.5*scale*yy,w*.5*scale*zz*(1+.055*yy));uv.push(i/N,r/(rings.length-1));
        if(r<rings.length-1&&i<N){const k=r*(N+1)+i;ix.push(k,k+N+1,k+1,k+1,k+N+1,k+N+2);}
      }
    });
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,mat);mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function capsule(parent,a,b,r,mat){
    const va=v3(...a),vb=v3(...b),mid=va.clone().add(vb).multiplyScalar(.5),dir=vb.clone().sub(va);
    const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(r,Math.max(.001,dir.length()-r*2),8,32),mat);mesh.position.copy(mid);mesh.quaternion.setFromUnitVectors(v3(0,1,0),dir.normalize());mesh.castShadow=true;parent.add(mesh);return mesh;
  }

  // A lofted, dished keycap: tapered walls, rolled corners and a concave top.
  function keycapGeometry(){
    const positions=[],uvs=[],indices=[],cornerSteps=12,N=4*(cornerSteps+1);
    const layers=[[-.135,1,1],[-.115,1,1],[.073,.85,.86],[.126,.78,.80],[.139,.71,.73],[.129,.43,.45],[.123,.001,.001]];
    layers.forEach(([y,sx,sz],row)=>{
      const w=.43*sx,d=.45*sz,r=Math.min(.045*sx,.045*sz);
      for(let c=0;c<4;c++)for(let j=0;j<=cornerSteps;j++){
        const angle=c*Math.PI/2+j/cornerSteps*Math.PI/2;
        const cx=[1,-1,-1,1][c]*(w/2-r),cz=[1,1,-1,-1][c]*(d/2-r),x=cx+Math.cos(angle)*r,z=cz+Math.sin(angle)*r;
        positions.push(x,y,z);uvs.push(x/.43+.5,z/.45+.5);
        const i=c*(cornerSteps+1)+j;
        if(row>0){const next=(i+1)%N,lo=(row-1)*N+i,hi=row*N+i;indices.push(lo,hi,(row-1)*N+next,hi,row*N+next,(row-1)*N+next);}
      }
    });
    const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geom.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geom.setIndex(indices);geom.computeVertexNormals();return geom;
  }
  function cylinder(parent,radius,depth,mat,x,y,z,axis='y'){
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,depth,64),mat);
    if(axis==='x')mesh.rotation.z=Math.PI/2;if(axis==='z')mesh.rotation.x=Math.PI/2;
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function knurl(parent,radius,height,y,mat,count=64){
    const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.009,height,.014),mat,count),dummy=new THREE.Object3D();
    for(let i=0;i<count;i++){const a=i/count*Math.PI*2;dummy.position.set(Math.sin(a)*radius,y,Math.cos(a)*radius);dummy.rotation.y=a;dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
    parent.add(mesh);return mesh;
  }
  function screw(parent,x,y,z){
    cylinder(parent,.035,.01,material('#343436',.85,.36),x,y,z);
    box(parent,.038,.003,.006,material('#080808',0,.8),x,y+.006,z,.001);
  }

  function smoothSurface(geom){
    geom.computeVertexNormals();
    const p=geom.attributes.position,n=geom.attributes.normal,groups=new Map();
    for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e5)).join(',');let group=groups.get(key);if(!group){group={sum:new THREE.Vector3(),indices:[]};groups.set(key,group);}group.sum.add(new THREE.Vector3(n.getX(i),n.getY(i),n.getZ(i)));group.indices.push(i);}
    for(const group of groups.values()){group.sum.normalize();for(const i of group.indices)n.setXYZ(i,group.sum.x,group.sum.y,group.sum.z);}
    return geom;
  }
  function roundedGeometry(w,h,d,r=.07){
    r=Math.min(r,w/4,d/4,h/2);
    const x=-w/2+r,y=-d/2+r,a=w-2*r,b=d-2*r;
    const s=new THREE.Shape();s.moveTo(x+r,y);s.lineTo(x+a-r,y);s.quadraticCurveTo(x+a,y,x+a,y+r);
    s.lineTo(x+a,y+b-r);s.quadraticCurveTo(x+a,y+b,x+a-r,y+b);s.lineTo(x+r,y+b);
    s.quadraticCurveTo(x,y+b,x,y+b-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
    const g=new THREE.ExtrudeGeometry(s,{depth:Math.max(.01,h-2*r),steps:1,bevelEnabled:true,bevelSegments:5,bevelSize:r,bevelThickness:r,curveSegments:8});
    g.rotateX(-Math.PI/2);g.translate(0,-(h-2*r)/2,0);smoothSurface(g);return g;
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
    const g=new THREE.Group();g.name='STRIKE 75';const alu=material('#555457',.82,.36,'metal'),plastic=material('#0c0d0e',.03,.77,'plastic');
    box(g,8.3,.36,3.92,alu,0,0,0,.10);
    box(g,8.20,.035,3.82,material('#7c7c7e',.88,.3,'metal'),0,.178,0,.04);
    box(g,8.20,.035,3.82,material('#29292b',.72,.44,'metal'),0,-.185,0,.04);box(g,8.08,.09,3.69,plastic,0,.205,0,.05);
    box(g,7.9,.055,3.46,material('#161719',.25,.64,'plastic'),0,.263,.03,.02);
    tube(g,roundLoop(8.27,3.89,-.105,.13),.012,true,true);
    tube(g,[[-4.12,.035,-1.25],[-4.12,.035,0],[-4.12,.035,1.3]],.009,false,true,.25);
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
        keys.push({label,x,z:-1.45+r*.565,w:width,row:r,col:c,y:.495,index:keys.length});cursor+=units*.49;
      });
    });
    keyMesh=new THREE.InstancedMesh(keycapGeometry(),material('#ffffff',.015,.68,'plastic'),keys.length);
    keyLED=new THREE.InstancedMesh(roundedGeometry(.445,.016,.465,.007),new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false}),keys.length);
    keyMesh.castShadow=true;keyMesh.receiveShadow=true;keyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);keyLED.instanceColor=null;
    const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),scale=new THREE.Vector3(),pos=new THREE.Vector3();
    keys.forEach(k=>{
      scale.set(k.w/.43,1,1);pos.set(k.x,k.y,k.z);matrix.compose(pos,q,scale);keyMesh.setMatrixAt(k.index,matrix);
      keyMesh.setColorAt(k.index,new THREE.Color(k.label==='Esc'||k.label==='Enter'?'#eb4b15':'#202022'));
      pos.y=.337;scale.set(k.w/.43,1,1);matrix.compose(pos,q,scale);keyLED.setMatrixAt(k.index,matrix);keyLED.setColorAt(k.index,new THREE.Color(orange));
      if(k.label.length===1)keyLookup.set(k.label.toLowerCase(),k.index);if(k.label==='SAVAGE')keyLookup.set(' ',k.index);if(k.label==='Enter')keyLookup.set('enter',k.index);
    });
    g.add(keyLED,keyMesh);makeLegends(g);

    const knob=new THREE.Group();knob.position.set(3.55,.43,-1.45);g.add(knob);
    const knobMetal=material('#4b4b4d',.9,.27,'metal');
    cylinder(knob,.272,.22,knobMetal,0,0,0);knurl(knob,.273,.16,0,material('#29292b',.9,.42),80);
    cylinder(knob,.245,.006,material('#666668',.95,.30,'metal'),0,.114,0);
    const dialRing=new THREE.Mesh(new THREE.TorusGeometry(.28,.012,8,64),new THREE.MeshBasicMaterial({color:orange,toneMapped:false}));dialRing.rotation.x=Math.PI/2;dialRing.position.set(3.55,.325,-1.45);g.add(dialRing);strips.push({mesh:dialRing,simple:true,phase:.8});
    box(g,.53,.025,.36,material('#020303',.2,.16),2.78,.30,-1.43,.025);
    const display=canvasTexture((ctx,w,h)=>{ctx.fillStyle='#f96a2e';ctx.font='28px monospace';ctx.fillText('75',20,46);ctx.fillRect(22,70,34,5);ctx.fillRect(74,70,18,5);},128,96);
    const screen=new THREE.Mesh(new THREE.PlaneGeometry(.43,.27),new THREE.MeshBasicMaterial({map:display,transparent:true,toneMapped:false}));screen.rotation.x=-Math.PI/2;screen.position.set(2.78,.317,-1.43);g.add(screen);
    [-3.77,3.77].forEach(x=>[-1.64,1.64].forEach(z=>{const mount=new THREE.Group();mount.position.set(x,-.205,z);mount.rotation.x=Math.PI;g.add(mount);screw(mount,0,0,0);}));
    const labelMap=canvasTexture((ctx,w,h)=>{ctx.fillStyle='#969698';ctx.font='24px monospace';ctx.textAlign='center';ctx.fillText('SAVAGE / STRIKE 75',w/2,80);ctx.font='13px monospace';ctx.fillText('MECHANICAL KEYBOARD   ·   SERIES 001',w/2,112);},512,192);
    const label=new THREE.Mesh(new THREE.PlaneGeometry(2.2,.7),new THREE.MeshBasicMaterial({map:labelMap,transparent:true}));label.rotation.x=Math.PI/2;label.position.set(0,-.207,0);g.add(label);
    brandPlane(g,.47,.20,0,-.015,1.966,0);

    return g;
  }
  function makeLegends(parent){
    const atlas=canvasTexture((ctx,w,h)=>{ctx.fillStyle='#e1e0db';ctx.textAlign='center';ctx.textBaseline='middle';keys.forEach(k=>{const x=(k.index%16)*128+64,y=Math.floor(k.index/16)*128+64;ctx.font=(k.label.length>3?'32':'48')+'px Arial';const label=({SAVAGE:'',Caps:'Caps Lock',Back:'←'})[k.label]??k.label;ctx.fillText(label,x,y);if(k.row===1&&/^[0-9]$/.test(k.label)){ctx.font='24px Arial';ctx.fillStyle='#929292';ctx.fillText(({'1':'!','2':'@','3':'#','4':'$','5':'%','6':'^','7':'&','8':'*','9':'(','0':')'})[k.label],x,y-38);ctx.fillStyle='#e1e0db';}});},2048,1024);
    const positions=[],uvs=[],normals=[],indices=[];
    keys.forEach(k=>{
      const i=k.index,cellx=(i%16)/16,celly=Math.floor(i/16)/8,w=Math.min(k.w*.75,k.label.length>2?.38:.24),h=.19;
      const x=k.x-(k.w>w+.08?(k.w-w)/2-.04:0),z=k.z-.005;
      positions.push(x-w/2,.626,z-h/2,x+w/2,.626,z-h/2,x+w/2,.626,z+h/2,x-w/2,.626,z+h/2);
      uvs.push(cellx,1-celly,cellx+1/16,1-celly,cellx+1/16,1-celly-1/8,cellx,1-celly-1/8);
      for(let n=0;n<4;n++)normals.push(0,1,0);const b=i*4;indices.push(b,b+2,b+1,b,b+3,b+2);
    });
    const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geom.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geom.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geom.setIndex(indices);
    keyLegends=new THREE.Mesh(geom,new THREE.MeshBasicMaterial({map:atlas,transparent:true,alphaTest:.08,side:THREE.DoubleSide,depthWrite:false,toneMapped:false}));parent.add(keyLegends);legendPositions=geom.attributes.position;
  }


  function buildMouse(){
    const g=new THREE.Group();g.name='PULSE PRO';
    const shell=material('#28292c',.04,.58,'plastic'),button=material('#303134',.05,.56,'plastic'),black=material('#101113',.03,.68,'plastic'),grip=material('#171719',0,.88,'rubber');
    // Continuous cubic profiles: broad curved nose, narrow waist, rounded high rear.
    const widthCurve=new THREE.CatmullRomCurve3([v3(.79,0,-1.67),v3(.94,0,-1.34),v3(.91,0,-.75),v3(.83,0,-.1),v3(.91,0,.65),v3(.88,0,1.15),v3(.67,0,1.52),v3(.06,0,1.73)],false,'centripetal');
    const topCurve=new THREE.CatmullRomCurve3([v3(0,.43,-1.67),v3(0,.65,-1.34),v3(0,.91,-.75),v3(0,1.10,-.1),v3(0,1.24,.65),v3(0,1.08,1.15),v3(0,.75,1.52),v3(0,.20,1.73)],false,'centripetal');
    const lookup=curve=>{const table=Array.from({length:801},(_,i)=>curve.getPoint(i/800));return(z,key)=>{let lo=0,hi=800;while(hi-lo>1){const mid=(lo+hi)>>1;if(table[mid].z<z)lo=mid;else hi=mid;}const a=table[lo],b=table[hi],t=limit((z-a.z)/(b.z-a.z||1),0,1);return a[key]*(1-t)+b[key]*t;};};
    const W=lookup(widthCurve),Y=lookup(topCurve);
    function point(z,a,inset=0){
      const cos=Math.cos(a),sin=Math.sin(a),side=.20+.06*Math.exp(-Math.pow((z-.4)/.9,2));
      return [(W(z,'x')+inset)*sin,side+(Y(z,'y')-side)*Math.pow(Math.max(.00001,cos),.68),z+(.13-.20*cos)*Math.exp(-Math.pow((z+1.67)/.27,2))];
    }
    const split=a=>-.13+.25*Math.pow(Math.abs(Math.sin(a)),1.8);
    // Three physical panels. The curved boundary follows the click paddles in the card.
    surface(g,(u,v)=>{const a=-Math.PI/2+Math.PI*v,z=split(a)+.014+(1.73-split(a)-.014)*u;return point(z,a);},shell,112,100,'Upper palm shell');
    for(const side of [-1,1]){
      surface(g,(u,v)=>{
        const approximateZ=-1.67+1.54*u,slot=.12*Math.exp(-Math.pow((approximateZ+.96)/.30,6)),inner=.015+slot;
        const a=side*(inner+(Math.PI/2-inner)*v),z=-1.67+(split(a)+1.67-.014)*u;
        const p=point(z,a);p[1]+=.008;return p;
      },button,96,64,side<0?'Left click paddle':'Right click paddle');
      const border=[];
      for(let i=0;i<=80;i++){const a=side*(.02+(Math.PI/2-.02)*i/80),p=point(split(a),a,.003);border.push(p);}
      const seam=tube(g,border,.009,false);seam.material=black;
      // Thick panel rims close the click paddles at the front, rather than leaving an open skin.
      surface(g,(u,v)=>{const a=side*(.02+(Math.PI/2-.02)*v),p=point(-1.67,a);p[1]-=.075*u;return p;},button,6,64,'Mouse front rim '+side);
    }
    // Sculpted lower shell closes the body and preserves the undercut below the buttons.
    surface(g,(u,v)=>{
      const a=v*Math.PI*2,z=-1.67+3.40*u,w=W(z,'x')*.985;
      return [Math.cos(a)*w,.14+Math.sin(a)*.095,z+(.13-.20*Math.abs(Math.sin(a)))*Math.exp(-Math.pow((z+1.67)/.27,2))];
    },black,112,80,'Lower chassis');
    for(const side of [-1,1]){
      surface(g,(u,v)=>{
        const r=.001+.999*u,t=v*Math.PI*2,z=.56+.76*r*Math.cos(t),a=side*(1.405+.155*r*Math.sin(t));
        return point(z,a,.011);
      },grip,36,128,side<0?'Left thumb grip':'Right thumb grip');
    }
    const frontWall=surface(g,(u,v)=>{const a=-Math.PI/2+Math.PI*v,p=point(-1.67,a);p[1]=.055+u*(p[1]-.115);p[2]+=.016;return p;},black,10,100,'Closed front fascia');flipSurface(frontWall);
    const trim=[];
    for(let i=0;i<=100;i++){const z=-1.65+3.35*i/100;trim.push([W(z,'x')*.992,.206,z]);}
    for(let i=100;i>=0;i--){const z=-1.65+3.35*i/100;trim.push([-W(z,'x')*.992,.206,z]);}
    const polished=tube(g,trim,.010,true);polished.material=material('#77787b',.85,.28,'metal');
    const tail=[];for(let i=0;i<=70;i++){const z=.15+1.54*i/70;tail.push([W(z,'x')*.982,.128,z]);}
    for(let i=70;i>=0;i--){const z=.15+1.54*i/70;tail.push([-W(z,'x')*.982,.128,z]);}
    tube(g,tail,.008,false,true,.18);
    box(g,.20,.052,.05,material('#030405',.2,.35),0,.15,-1.716,.017);
    box(g,.29,.09,.63,black,0,.71,-.96,.04);
    const wheel=new THREE.Group();wheel.position.set(0,.775,-.96);wheel.rotation.z=Math.PI/2;g.add(wheel);
    cylinder(wheel,.18,.22,material('#bb4c13',.5,.46,'metal'),0,0,0);
    // Diamond knurling is actual instanced relief, not a coarse ribbed cylinder.
    const ridges=new THREE.InstancedMesh(new THREE.BoxGeometry(.013,.048,.008),material('#dc5b16',.45,.48,'metal'),320),dummy=new THREE.Object3D();
    for(let i=0;i<80;i++)for(let j=0;j<4;j++){const a=i/80*Math.PI*2+j*.029;dummy.position.set(Math.sin(a)*.182,-.083+j*.055,Math.cos(a)*.182);dummy.rotation.set(0,a,j%2?.38:-.38);dummy.updateMatrix();ridges.setMatrixAt(i*4+j,dummy.matrix);}wheel.add(ridges);
    for(const y of [-.116,.116]){cylinder(wheel,.145,.004,black,0,y,0);const ring=new THREE.Mesh(new THREE.TorusGeometry(.172,.006,8,64),new THREE.MeshBasicMaterial({color:orange,toneMapped:false}));ring.rotation.x=Math.PI/2;ring.position.y=y;wheel.add(ring);strips.push({mesh:ring,simple:true,phase:.35});}
    const thumbSlot=box(g,.08,.115,.49,black,-.765,.72,-.06,.035);thumbSlot.rotation.z=-.1;
    const thumbButton=box(g,.045,.082,.42,material('#d35415',.25,.46,'metal'),-.785,.72,-.06,.030);thumbButton.rotation.z=-.1;
    for(const z of [-1.15,1.17])box(g,1.15,.02,.39,material('#c4c5c3',.03,.61),0,.023,z,.11);
    box(g,.32,.015,.42,material('#060607',.2,.4),0,.017,.1,.045);
    const sensor=new THREE.Mesh(new THREE.CircleGeometry(.06,32),material('#203d50',.6,.12));sensor.rotation.x=Math.PI/2;sensor.position.set(0,.005,.1);g.add(sensor);
    const nameMap=canvasTexture((ctx,w,h)=>{ctx.fillStyle='#8b8b8c';ctx.textAlign='center';ctx.font='22px monospace';ctx.fillText('PULSE PRO',w/2,55);ctx.font='12px monospace';ctx.fillText('SAVAGE / SERIES 001',w/2,85);},512,160);
    const name=new THREE.Mesh(new THREE.PlaneGeometry(.85,.27),new THREE.MeshBasicMaterial({map:nameMap,transparent:true}));name.rotation.x=Math.PI/2;name.position.set(0,.016,.70);g.add(name);
    box(g,.13,.17,.035,black,0,.135,1.728,.035);
    g.traverse(m=>{if(['Upper palm shell','Right click paddle','Right thumb grip','Mouse front rim -1'].includes(m.name))flipSurface(m);});
    return g;
  }

  function cupGeometry(w,h,d,r=.23){
    const x=-w/2,y=-h/2,s=new THREE.Shape();s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
    const bevel=Math.min(d/4,.04),geom=new THREE.ExtrudeGeometry(s,{depth:d-bevel*2,steps:1,bevelEnabled:true,bevelSegments:6,bevelSize:bevel,bevelThickness:bevel,curveSegments:24});geom.translate(0,0,-(d-bevel*2)/2);geom.rotateY(Math.PI/2);smoothSurface(geom);return geom;
  }


  function buildHeadset(){
    const g=new THREE.Group();g.name='ECHO X';
    const aluminum=material('#68696b',.86,.29,'metal'),polymer=material('#26272a',.12,.47,'plastic'),leather=material('#363334',.01,.77,'leather'),soft=material('#141416',.015,.86,'rubber');
    // Rounded swept rectangular sections: a thin metal headband above a deep soft pad.
    function arch(rx,ry,width,thickness,mat,start=.04,end=Math.PI-.04,y=.92){
      return flipSurface(surface(g,(u,v)=>{
        const a=start+(end-start)*u,b=v*Math.PI*2,rad=thickness*.5*signedPow(Math.cos(b),.55),z=width*.5*signedPow(Math.sin(b),.48);
        return [(rx+rad)*Math.cos(a),y+(ry+rad)*Math.sin(a),z];
      },mat,112,40,'Swept headband'));
    }
    arch(1.43,1.40,.50,.075,polymer);
    arch(1.31,1.27,.47,.21,leather,.16,Math.PI-.16,.91);
    for(const side of [-1,1]){
      const rail=arch(1.46,1.43,.038,.021,aluminum,.18,Math.PI-.18);rail.position.z=side*.21;
      const stitch=[];
      for(let i=0;i<=90;i++){const a=.25+(Math.PI-.50)*i/90;stitch.push([1.26*Math.cos(a),.90+1.22*Math.sin(a),side*.20]);}
      const line=tube(g,stitch,.0035,false);line.material=material('#6a5f55',0,.9);
    }
    const padGeometry=()=>{
      const holder=new THREE.Group();
      const mesh=surface(holder,(u,v)=>{
        const a=u*Math.PI*2,b=v*Math.PI*2,fold=.004*Math.sin(a*29)*Math.pow(Math.max(0,Math.cos(b)),5);
        const y=(.72+.165*Math.sin(b))*signedPow(Math.sin(a),.78),z=(.48+.16*Math.sin(b))*signedPow(Math.cos(a),.78);
        return [-.24+(.18+fold)*Math.cos(b),y,z];
      },leather,128,48,'Leather ear cushion');
      // Invert the ring winding: the physically lit side faces the listener.
      const ix=mesh.geometry.index.array;for(let i=0;i<ix.length;i+=3){const t=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=t;}mesh.geometry.computeVertexNormals();return mesh.geometry;
    };
    const padGeo=padGeometry();
    const fabric=material('#090709',0,.96,'fabric');
    for(const side of [-1,1]){
      const cup=new THREE.Group();cup.position.set(side*1.37,-.23,0);cup.rotation.set(-.08,side*.09,-side*.12);cup.scale.x=side;g.add(cup);
      shellYZ(cup,1.30,1.83,[[-.12,.01],[-.12,.88],[-.08,.97],[.0,1],[.23,1],[.32,.975],[.37,.90],[.38,.01]],polymer,'Sculpted earcup chassis');
      shellYZ(cup,1.31,1.84,[[.298,.96],[.315,.975],[.34,.965]],aluminum,'Machined perimeter bevel');
      shellYZ(cup,1.20,1.70,[[.341,.01],[.341,.88],[.35,.97],[.375,1],[.405,.98],[.424,.86],[.438,.5],[.441,.01]],material('#454649',.30,.46,'plastic'),'Curved outer earcup panel');
      const pad=new THREE.Mesh(padGeo,leather);pad.castShadow=pad.receiveShadow=true;cup.add(pad);
      shellYZ(cup,.88,1.30,[[-.13,.01],[-.13,.96],[-.14,1]],fabric,'Recessed driver fabric');
      const seam=[];for(let i=0;i<=128;i++){const a=i/128*Math.PI*2;seam.push([-.31,.81*signedPow(Math.sin(a),.78),.57*signedPow(Math.cos(a),.78)]);}
      const stitch=tube(cup,seam,.0032,true);stitch.material=material('#534b48',0,.96);
      // An inset light channel and a small status bar, rather than a glowing wire on the surface.
      const groove=[];for(let i=0;i<=100;i++){const a=i/100*Math.PI*2;groove.push([.38,.865*signedPow(Math.sin(a),.78),.615*signedPow(Math.cos(a),.78)]);}
      const blackGap=tube(cup,groove,.015,true);blackGap.material=soft;
      const lightPoints=groove.map(([x,y,z])=>[x+.006,y,z]);tube(cup,lightPoints,.0055,true,true,side<0?.2:.65);
      const led=box(cup,.012,.028,.155,new THREE.MeshBasicMaterial({color:orange,toneMapped:false}),.443,.38,-.20,.009);strips.push({mesh:led,simple:true,phase:.4});
      // Fine vent perforations around the lower driver housing.
      const ventMaterial=material('#080809',.01,.96),holes=new THREE.InstancedMesh(new THREE.CircleGeometry(.010,8),ventMaterial,62),dummy=new THREE.Object3D();
      for(let i=0;i<62;i++){const a=.93*Math.PI+i/61*.91*Math.PI;dummy.position.set(.347,.84*Math.sin(a),.60*Math.cos(a));dummy.rotation.y=Math.PI/2;dummy.updateMatrix();holes.setMatrixAt(i,dummy.matrix);}cup.add(holes);
      // A single curved fork with two tapered arms connects the stem to the hinges.
      const fork=new THREE.Group();fork.position.set(side*1.63,0,0);g.add(fork);
      for(const front of [-1,1]){
        const curve=new THREE.CatmullRomCurve3([v3(0,1.06,0),v3(0,.77,front*.04),v3(0,.53,front*.32),v3(0,.13,front*.52)]);
        const geom=new THREE.TubeGeometry(curve,48,.082,16,false);geom.scale(.48,1,1);
        const arm=new THREE.Mesh(geom,aluminum);arm.castShadow=arm.receiveShadow=true;fork.add(arm);
        cylinder(cup,.083,.055,aluminum,.235,.13,front*.51,'x');
        cylinder(cup,.038,.062,soft,.26,.13,front*.51,'x');
      }
      const stem=box(g,.095,.37,.23,aluminum,side*1.47,1.08,0,.035);stem.rotation.z=-side*.06;
      box(g,.24,.13,.23,aluminum,side*1.55,1.065,0,.035);
      cylinder(g,.055,.245,soft,side*1.55,1.065,0,'z');
      const cable=[];for(let i=0;i<=30;i++){const t=i/30;cable.push([side*(1.39+.025*Math.sin(t*5*Math.PI)),.99+t*.38,-.06]);}
      const braid=tube(g,cable,.022,false);braid.material=material('#d3551a',.05,.68,'rubber');
    }
    const micPath=[[1.73,-.70,.39],[1.79,-.80,.82],[1.38,-.97,1.43],[.62,-1.02,1.78]];
    const arm=tube(g,micPath,.028,false);arm.material=material('#161618',.05,.75,'rubber');
    cylinder(g,.097,.14,aluminum,1.73,-.70,.39,'z');
    const joint=new THREE.Mesh(new THREE.TorusGeometry(.092,.009,12,48),new THREE.MeshBasicMaterial({color:orange,toneMapped:false}));joint.position.set(1.73,-.70,.47);g.add(joint);strips.push({mesh:joint,simple:true,phase:.25});
    capsule(g,[.63,-1.02,1.78],[.27,-1.04,1.86],.065,polymer);
    const micTip=new THREE.Mesh(new THREE.SphereGeometry(.046,24,16),new THREE.MeshBasicMaterial({color:orange,toneMapped:false}));micTip.scale.z=.25;micTip.position.set(.25,-1.04,1.867);g.add(micTip);strips.push({mesh:micTip,simple:true,phase:.25});
    g.position.y=-.2;return g;
  }

  let target,blurA,blurB,postScene,postCamera,quad,extractMat,blurMat,finalMat;
  function prepareBloom(){
    const options={type:THREE.HalfFloatType,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,depthBuffer:false};
    target=new THREE.WebGLRenderTarget(1,1,{...options,depthBuffer:true});target.samples=renderer.capabilities.isWebGL2?4:0;blurA=new THREE.WebGLRenderTarget(1,1,options);blurB=new THREE.WebGLRenderTarget(1,1,options);
    postScene=new THREE.Scene();postCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
    const vertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
    extractMat=new THREE.ShaderMaterial({uniforms:{image:{value:null}},vertexShader:vertex,fragmentShader:'varying vec2 vUv;uniform sampler2D image;void main(){vec4 c=texture2D(image,vUv);float l=max(c.r,max(c.g,c.b));gl_FragColor=vec4(c.rgb*smoothstep(1.35,2.1,l),1.);}'});
    blurMat=new THREE.ShaderMaterial({uniforms:{image:{value:null},direction:{value:new THREE.Vector2()}},vertexShader:vertex,fragmentShader:'varying vec2 vUv;uniform sampler2D image;uniform vec2 direction;void main(){vec3 c=texture2D(image,vUv).rgb*.227027;c+=texture2D(image,vUv+direction*1.384615).rgb*.316216;c+=texture2D(image,vUv-direction*1.384615).rgb*.316216;c+=texture2D(image,vUv+direction*3.230769).rgb*.070270;c+=texture2D(image,vUv-direction*3.230769).rgb*.070270;gl_FragColor=vec4(c,1.);}'});
    finalMat=new THREE.ShaderMaterial({uniforms:{image:{value:target.texture},bloom:{value:blurA.texture},strength:{value:.35}},vertexShader:vertex,fragmentShader:'varying vec2 vUv;uniform sampler2D image;uniform sampler2D bloom;uniform float strength;void main(){vec4 b=texture2D(image,vUv);vec3 glow=texture2D(bloom,vUv).rgb*strength;gl_FragColor=vec4(b.rgb+glow,max(b.a,clamp(max(glow.r,max(glow.g,glow.b)),0.,1.)));#include <tonemapping_fragment>\n#include <colorspace_fragment>}'.replace(';#include',';\n#include')});
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
    quad.material=finalMat;finalMat.uniforms.strength.value=settings.night?.34:.14;renderer.setRenderTarget(null);renderer.render(postScene,postCamera);
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
    color.multiplyScalar(power*2.0);return color;
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
    rimLight.color.set(settings.color);rimLight.intensity=settings.brightness/100*(settings.night?3:.8);
  }
  function updatePresses(){
    if(!pressed.size||!keyMesh)return;
    const matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
    pressed.forEach((start,index)=>{
      const age=elapsed-start,k=keys[index],down=age<.08?Math.sin(age/.08*Math.PI/2)*.075:Math.max(0,(.27-age)/.19)*.075;
      matrix.compose(v3(k.x,k.y-down,k.z),q,v3(k.w/.43,1,1));keyMesh.setMatrixAt(index,matrix);
      for(let i=0;i<4;i++)legendPositions.setY(index*4+i,.626-down);
      if(age>.27)pressed.delete(index);
    });keyMesh.instanceMatrix.needsUpdate=true;legendPositions.needsUpdate=true;
  }
  function renderFrame(now){
    loopId=0;if(!visible||document.hidden||!ready)return;
    const delta=lastFrame?Math.min((now-lastFrame)/1000,.05):.016;lastFrame=now;elapsed+=delta;
    if(settings.auto&&api.state.motion&&!dragging)theta+=delta*.18;
    radius+=(targetRadius-radius)*.14;
    camera.position.set(radius*Math.sin(phi)*Math.sin(theta),radius*Math.cos(phi),radius*Math.sin(phi)*Math.cos(theta));
    ground.visible=phi<Math.PI/2;camera.lookAt(settings.device==='headset'?v3(0,.08,.1):v3(0,.05,0));
    animateLights();updatePresses();renderPost();
    stage.dataset.frames=String((Number(stage.dataset.frames)||0)+1);
    if(api.state.motion||dragging||pressed.size||Math.abs(radius-targetRadius)>.01)start();
  }
  function start(){if(!loopId&&ready&&visible&&!document.hidden)loopId=requestAnimationFrame(renderFrame);}
  function setNight(){
    if(!ready)return;stage.dataset.night=String(settings.night);hemi.intensity=settings.night?.32:2.05;keyLight.intensity=settings.night?.85:4.0;fillLight.intensity=settings.night?.45:2.8;renderer.toneMappingExposure=settings.night?.95:1.05;start();
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
  function resetView(){targetRadius={keyboard:12,mouse:6.6,headset:8.4,sync:13}[settings.device];if(innerWidth<701)targetRadius*=1.25;radius=targetRadius;theta=settings.device==='mouse'?Math.PI+.88:settings.device==='headset'?.65:.35;phi=settings.device==='mouse'?1.02:settings.device==='headset'?1.18:.77;settings.auto=false;controlsUI();start();}
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
