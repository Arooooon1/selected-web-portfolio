/* Verify the collection as shipped, including the local SAVAGE WebGL entry. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {pathToFileURL,fileURLToPath}=require('node:url');
(async()=>{
  const base=__dirname, url=pathToFileURL(path.join(base,'index.html')).href, checks=[], errors=[], resourceFailures=[];
  const browser=await chromium.launch({headless:true,channel:'msedge',args:['--enable-unsafe-swiftshader']});
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
    await context.route(/^https?:\/\//,route=>route.abort());
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    page.on('requestfailed',r=>resourceFailures.push(r.url()));
    const check=(name,ok)=>{assert.ok(ok,name);checks.push(name);console.log('PASS '+name);};
    const images=async()=>page.locator('.work:visible img').evaluateAll(async imgs=>{
      await Promise.all(imgs.map(img=>img.decode().catch(()=>{})));
      return imgs.every(img=>img.complete&&img.naturalWidth>0);
    });
    const overflow=async()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
    await page.goto(url,{waitUntil:'load'});
    check('order: SAVAGE, RIFTLINE, OBJECTORY, STILLFRAME',JSON.stringify(await page.locator('.work h2').allTextContents())===JSON.stringify(['SAVAGE','RIFTLINE','OBJECTORY','STILLFRAME']));
    check('sequential display numbers 01 through 04',JSON.stringify(await page.locator('.work .number').allTextContents())===JSON.stringify(['01 /','02 /','03 /','04 /']));
    check('SAVAGE is the only featured work',await page.locator('.featured').count()===1&&await page.locator('.featured h2').innerText()==='SAVAGE'&&await page.locator('.featured-label').isVisible());
    check('all four desktop previews load',await images());
    const links=await page.locator('a').evaluateAll(as=>as.map(a=>a.href).filter(h=>h.startsWith('file:')));
    check('all local project links resolve to files',links.every(h=>fs.existsSync(fileURLToPath(new URL(h)))));
    check('desktop layout fits viewport',await overflow());
    const tab=async view=>{await page.locator('[data-view="'+view+'"]').click();};
    await tab('mobile');
    check('all four mobile previews load',await images());
    check('mobile preview includes SAVAGE',await page.locator('.work:visible').count()===4&&await page.locator('.featured img').getAttribute('src')==='../14. SAVAGE - Gaming Gear/preview-mobile.png');
    await tab('admin');
    check('admin tab contains only three projects with admin panels',JSON.stringify(await page.locator('.work:visible h2').allTextContents())===JSON.stringify(['RIFTLINE','OBJECTORY','STILLFRAME'])&&!(await page.locator('.featured').isVisible()));
    check('all three admin previews load',await images());
    check('admin previews link to corresponding panels',(await page.locator('.work:visible .preview').evaluateAll(as=>as.map(a=>a.hash))).every(h=>h==='#/admin'));
    await tab('desktop');
    check('returning to Sites restores SAVAGE first',await page.locator('.work:visible h2').first().innerText()==='SAVAGE'&&await page.locator('.work:visible').count()===4);
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:path.join(base,'preview.png'),fullPage:true});
    for(const width of [768,390,360]){
      await page.setViewportSize({width,height:844});
      check(width+'px layout fits viewport',await overflow());
      check(width+'px main-work badge stays visible',await page.locator('.featured-label').isVisible());
      if(width===390){
        await tab('mobile');check('phone tab works at 390px',await images()&&await overflow());
        await page.evaluate(()=>scrollTo(0,0));
        await page.screenshot({path:path.join(base,'preview-mobile.png'),fullPage:true});
        await tab('desktop');
      }
    }
    await page.setViewportSize({width:1440,height:1100});
    const savageUrl=await page.locator('.featured .site-link').evaluate(a=>a.href);
    await page.goto(savageUrl,{waitUntil:'load'});
    check('featured project opens the packaged SAVAGE website',await page.evaluate(()=>SAVAGE_CATALOG.products.length===24));
    await page.locator('#lab').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>window.SavageLab&&SavageLab.ready,{},{timeout:25000});
    check('packaged LIGHT LAB initializes local Three.js, photographic studio and scanned leather',await page.evaluate(()=>SavageLab.ready&&THREE.REVISION==='160'&&document.querySelector('#lab-stage').dataset.studio==='photographic-hdri'&&document.querySelector('#lab-stage').dataset.material==='scanned-leather'));
    await page.locator('[data-device="sync"]').click();
    check('packaged SYNC control selects all three devices',await page.evaluate(()=>SavageLab.settings.device==='sync'&&SavageLab.diagnostics.visibleModels.length===3));
    check('no JavaScript or console errors',errors.length===0);
    check('no failed local resources or network dependencies',resourceFailures.length===0);
    const report={testedAt:new Date().toISOString(),browser:'Microsoft Edge / isolated Playwright context',offline:true,htmlSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(base,'index.html'))).digest('hex'),checks:checks.length,passed:checks,errors,resourceFailures};
    fs.writeFileSync(path.join(base,'showcase-verification.json'),JSON.stringify(report,null,2)+'\n');
    console.log('Collection verification complete: '+checks.length+' checks.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
