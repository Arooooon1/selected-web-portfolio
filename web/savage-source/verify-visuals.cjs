/* Actual browser captures of the product meshes; no catalog imagery is substituted. */
const {chromium}=require('playwright'),path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
(async()=>{
 const site=path.resolve(__dirname,'../14. SAVAGE - Gaming Gear'),shots=path.join(site,'screenshots'),checks=[],errors=[],failed=[];
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:1600,height:1100}}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>failed.push(r.url()));
  await context.route(/^https?:\/\//,route=>route.abort());
  const check=(name,ok)=>{assert.ok(ok,name);checks.push(name);console.log('PASS '+name);};
  await page.goto(pathToFileURL(path.join(site,'index.html')).href,{waitUntil:'load'});
  await page.locator('#lab').scrollIntoViewIfNeeded();await page.waitForFunction(()=>window.SavageLab?.ready,null,{timeout:30000});
  check('offline photographic studio and scanned leather load',await page.locator('#lab-stage').evaluate(el=>el.dataset.studio==='photographic-hdri'&&el.dataset.material==='scanned-leather'));
  check('desktop canvas renders above CSS resolution',await page.locator('#lab-canvas').evaluate(el=>el.width>=el.clientWidth*1.75));
  await page.locator('[data-mode="solid"]').click();await page.locator('#lab-brightness').fill('60');
  const capture=async name=>{await page.waitForTimeout(220);await page.locator('#lab-stage').screenshot({path:path.join(shots,name+'.png')});};
  for(const device of ['keyboard','mouse','headset']){
    await page.locator('[data-device="'+device+'"]').click();await capture('quality-'+device);
    await page.screenshot({path:path.join(shots,'refined-'+device+'.png')});
    const a=await page.locator('#lab-canvas').screenshot();
    await page.locator('#lab-canvas').focus();for(let i=0;i<15;i++)await page.keyboard.press('ArrowRight');
    await capture('quality-'+device+'-side');
    const b=await page.locator('#lab-canvas').screenshot();
    check(device+' changes rendered view when rotated',crypto.createHash('sha256').update(a).digest('hex')!==crypto.createHash('sha256').update(b).digest('hex'));
    for(let i=0;i<15;i++)await page.keyboard.press('ArrowRight');await capture('quality-'+device+'-back');
    await page.locator('[data-lab="reset"]').click();
  }
  await page.locator('[data-device="sync"]').click();await capture('quality-sync');
  await page.screenshot({path:path.join(shots,'refined-sync.png')});
  await page.locator('[data-device="headset"]').click();await page.locator('[data-lab="night"]').click();await page.locator('[data-mode="spectrum"]').click();await capture('quality-headset-night');
  check('night scene and spectrum remain operable',await page.evaluate(()=>SavageLab.settings.night&&SavageLab.settings.mode==='spectrum'));
  await page.locator('[data-lab="night"]').click();
  await page.setViewportSize({width:390,height:844});
  for(const device of ['keyboard','mouse','headset']){
    await page.locator('[data-device="'+device+'"]').click();await capture('quality-mobile-'+device);
    check(device+' mobile scene has no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  check('no shader or JavaScript errors',errors.length===0);
  check('no failed local files or external dependencies',failed.length===0);
  const result={testedAt:new Date().toISOString(),browser:'Microsoft Edge / isolated Playwright context',htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(site,'index.html'))).digest('hex'),checks:checks.length,passed:checks,errors,resourceFailures:failed,note:'Image quality judged from the real captured views; functional checks do not establish photorealism.'};
  fs.writeFileSync(path.join(site,'visual-verification.json'),JSON.stringify(result,null,2)+'\n');console.log('Visual viewer checks: '+checks.length);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
