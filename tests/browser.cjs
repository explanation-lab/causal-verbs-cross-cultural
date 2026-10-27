/* Run with Playwright on NODE_PATH and the local server running. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const core=require('../Pilots/Absences/js/core.js');
const base=process.env.PILOT_URL||'http://127.0.0.1:8765';
const results=path.resolve('test-results');fs.mkdirSync(results,{recursive:true});
let browser,phase='starting',lastPage;

(async()=>{
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
  const context=await browser.newContext({viewport:{width:1440,height:1100}});
  const page=await context.newPage();
  lastPage=page;
  const errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(request.url().includes('/api/'))requests.push(request.url());});
  await page.goto(base+'/Pilots/Absences/preview.html');
  await page.waitForFunction(()=>globalThis.absenceStudy);
  assert.equal(requests.length,0);
  for(const condition of ['thick','thin']) {
    for(const beach of core.VARIANTS.beach) for(const driveway of core.VARIANTS.driveway) for(const cellar of core.VARIANTS.cellar) {
      const selected=core.assignment(condition,{beach,driveway,cellar});
      await page.evaluate(a=>absenceStudy.setReviewAssignment(a),selected);
      // Direct review jumps cover every target and every alternative without changing participant allocations.
      for(const name of core.CASES) {
        for(const stage of ['story','preview','rating']) {
          phase=[condition,beach,driveway,cellar,name,stage].join('/');
          const index=await page.evaluate(({name,stage})=>absenceStudy.screens.findIndex(s=>s.case===name&&s.stage===stage),{name,stage});
          await page.goto(base+`/Pilots/Absences/preview.html?autostart=1&screen=${index}`);
          await page.waitForSelector('.story',{timeout:5000});
          const story=await page.locator('.story').innerText();
          assert(!story.includes('both of the following'));
          if(stage==='story')assert.equal(await page.locator('.sentence-slot').count(),0);
          if(stage==='preview') {
            assert.equal(await page.locator('.sentence-slot').count(),4);
            assert.equal(await page.locator('.masked').count(),0);
          }
          if(stage==='rating') {
            assert.equal(await page.locator('.sentence-slot.active').count(),1);
            assert.equal(await page.locator('.sentence-slot').count(),1);
            assert.equal(await page.locator('.sentence-instruction').count(),0);
            assert.equal(await page.locator('input[name=naturalness]').count(),7);
            assert(await page.locator('#rating-continue').isDisabled());
            await page.locator('input[name=naturalness][value="4"]').check();
            assert(await page.locator('#rating-continue').isEnabled());
          }
          if(name==='cellar'&&cellar==='increase'&&condition==='thin') {
            assert(!story.includes('humidity'));
            assert((await page.locator('.page').innerText()).includes('level of water'));
          }
        }
      }
    }
  }
  assert.equal(requests.length,0,'Review must not call allocation or data APIs.');
  // Researcher controls must actually switch condition and variant, and retain assignments on navigation.
  await page.selectOption('#review-condition','thick');
  await page.waitForFunction(()=>absenceStudy.assignment.condition==='thick');
  await page.selectOption('#review-condition','thin');
  await page.waitForFunction(()=>absenceStudy.assignment.condition==='thin');
  await page.selectOption('#review-beach','dry_out');
  await page.waitForFunction(()=>absenceStudy.assignment.variants.beach==='dry_out');
  const a=await page.evaluate(()=>absenceStudy.assignment);
  const storyIndex=await page.evaluate(()=>absenceStudy.screens.findIndex(s=>s.case==='beach'&&s.stage==='story'));
  await page.selectOption('#review-screen',String(storyIndex));await page.click('#panel-go');
  await page.waitForSelector('#stage-continue');
  await page.screenshot({path:path.join(results,'review-story.png'),fullPage:true});
  await page.click('#stage-continue');
  await page.waitForSelector('.sentence-slot');
  await page.screenshot({path:path.join(results,'review-sentences.png'),fullPage:true});
  await page.click('#stage-continue');
  const topPositions=[];
  for(let i=0;i<4;i++) {
    await page.waitForSelector(`.sentence-slot.active[data-position="${i+1}"]`);
    const top=await page.locator('.question-card').evaluate(n=>n.getBoundingClientRect().top+scrollY);
    topPositions.push(top);
    assert(Math.abs(top-topPositions[0])<2,'All four ratings use the same question-card position.');
    const widths=await page.evaluate(()=>({story:document.querySelector('.story').getBoundingClientRect().width,question:document.querySelector('.question-card').getBoundingClientRect().width}));
    assert(Math.abs(widths.story-widths.question)<1,'Story and question cards have matching widths.');
    if(i===0||i===3)await page.screenshot({path:path.join(results,`review-rating-${i+1}.png`),fullPage:true});
    await page.locator('input[name=naturalness][value="5"]').check();await page.click('#rating-continue');
  }
  await page.reload();await page.waitForFunction(()=>absenceStudy);
  assert.deepEqual(await page.evaluate(()=>absenceStudy.assignment),a);
  // Mobile layout and export.
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+`/Pilots/Absences/preview.html?autostart=1&screen=${storyIndex+2}`);
  await page.waitForSelector('.rating-panel');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(results,'review-mobile.png'),fullPage:true});
  const [reviewDownload]=await Promise.all([page.waitForEvent('download'),page.click('#panel-download')]);
  const reviewPayload=JSON.parse(fs.readFileSync(await reviewDownload.path(),'utf8'));
  assert.equal(reviewPayload.review_mode,true);assert.equal(reviewPayload.valid_participant_data,false);
  assert.equal(requests.length,0);

  // Full participant runs in separate browser contexts; save and resume are real server paths.
  for(let run=0;run<4;run++) {
    phase='participant '+run;
    const participantContext=await browser.newContext({viewport:{width:1280,height:1000}});
    const participant=await participantContext.newPage();
    lastPage=participant;
    participant.on('pageerror',error=>errors.push(error.message));
    await participant.goto(base+'/Pilots/Absences/index.html');
    await participant.waitForSelector('#consent-yes');
    assert.equal(await participant.locator('#review-panel').count(),0);
    await participant.click('#consent-yes');await participant.click('#stage-continue');
    const initial=await participant.evaluate(()=>absenceStudy.assignment);
    for(let story=0;story<4;story++) {
      await participant.waitForSelector('.story-action');await participant.click('#stage-continue');
      await participant.waitForSelector('.preview-action');
      assert.equal(await participant.locator('.sentence-slot').count(),4);
      await participant.click('#stage-continue');
      for(let rating=0;rating<4;rating++) {
        await participant.waitForSelector(`.active[data-position="${rating+1}"]`);
        await participant.locator('input[name=naturalness][value="6"]').check();await participant.click('#rating-continue');
        if(story===0&&rating===1) {
          await participant.reload();await participant.waitForSelector('.active[data-position="3"]');
          assert.deepEqual(await participant.evaluate(()=>absenceStudy.assignment),initial);
        }
      }
    }
    await participant.waitForSelector('#demographics-form');
    await participant.fill('#age','32');await participant.fill('#first_language','English');
    await participant.selectOption('#other_languages_spoken','Yes');await participant.fill('#other_languages','Spanish');
    await participant.locator('#demographics-form button').click();await participant.fill('#feedback','Browser verification run.');
    await participant.locator('#feedback-form button').click();await participant.waitForSelector('.saved');
    const data=await participant.evaluate(()=>absenceStudy.state);
    assert.equal(data.records.filter(r=>r.stage==='rating').length,16);
    assert.equal(data.saved,true);
    assert.deepEqual(data.assignment,initial);
    const [download]=await Promise.all([participant.waitForEvent('download'),participant.click('#download-csv')]);
    assert.equal(fs.readFileSync(await download.path(),'utf8').split('\r\n').length,17);
    if(run===0) await participant.screenshot({path:path.join(results,'participant-complete.png'),fullPage:true});
    await participantContext.close();
  }
  const declineContext=await browser.newContext(),decline=await declineContext.newPage();
  await decline.goto(base+'/Pilots/Absences/index.html');await decline.click('#consent-no');
  await decline.waitForFunction(()=>document.body.textContent.includes('You have not consented'));
  assert.equal(await decline.locator('.story').count(),0);
  assert.deepEqual(errors,[]);
  await browser.close();
  console.log('PASS: all materials and preview stages; working review controls; stationary question cards matching story width; mobile layout; review isolation; four complete participant runs; reload recovery; JSON/CSV export; consent refusal.');
})().catch(async error=>{console.error('Failed phase:',phase,error);if(lastPage&&!lastPage.isClosed()){console.error(await lastPage.locator('body').innerText());await lastPage.screenshot({path:path.join(results,'failure.png'),fullPage:true});}await browser?.close();process.exitCode=1;});
