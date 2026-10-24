import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
await import('./build-studio.mjs');
const source=path.dirname(fileURLToPath(import.meta.url));
const site=path.join(source,'..','14. SAVAGE - Gaming Gear');
const read=file=>fs.readFileSync(path.join(source,file),'utf8');
let css=read('styles.css');
for(const font of ['Geologica-Regular.ttf','Geologica-Bold.ttf','IBMPlexMono-Regular.ttf']){
  css=css.replaceAll('url(assets/fonts/'+font+')','url(data:font/ttf;base64,'+fs.readFileSync(path.join(site,'assets','fonts',font)).toString('base64')+')');
}
let html=read('index.template.html')
  .replace('/*__STYLES__*/',()=>css)
  .replace('/*__CATALOG__*/',()=>read('catalog.js').replaceAll('</script','<\\/script'))
  .replace('/*__APP__*/',()=>read('app.js').replaceAll('</script','<\\/script'))
  .replace('/*__VIEWER__*/',()=>read('viewer.js').replaceAll('</script','<\\/script'));
fs.mkdirSync(path.join(site,'assets'),{recursive:true});
fs.writeFileSync(path.join(site,'index.html'),html);
fs.writeFileSync(path.join(site,'assets','mark.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -20 200 100"><rect x="-6" y="-20" width="200" height="100" rx="12" fill="#0b0d10"/><g fill="#ff4d26"><path d="M0 0h28l24 34L83 0h29L63 58H42Z"/><path d="m68 58 50-58h20l50 58h-29l-31-35-31 35Z"/></g></svg>');
const mark='<path d="M0 0h28l24 34L83 0h29L63 58H42Z"/><path d="m68 58 50-58h20l50 58h-29l-31-35-31 35Z"/>';
const word=read('app.js').match(/const wordPaths = '([^']+)';/)[1];
for(const [name,color] of [['logo','#0b0d10'],['logo-inverse','#f2f1ec']]){
 fs.writeFileSync(path.join(site,'assets','overdrive-'+name+'.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -2 840 64"><title>SAVAGE / Overdrive</title><g fill="#ff4d26">'+mark+'</g><g transform="translate(228)" fill="'+color+'">'+word+'</g></svg>');
}
fs.writeFileSync(path.join(site,'assets','overdrive-mark.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 192 62" fill="#ff4d26"><title>SAVAGE / Overdrive mark</title>'+mark+'</svg>');
fs.writeFileSync(path.join(site,'assets','overdrive-wordmark.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-5 -1 592 60" fill="#0b0d10"><title>SAVAGE</title>'+word+'</svg>');
console.log('SAVAGE built: '+Buffer.byteLength(html)+' bytes; local assets; 24 models.');
