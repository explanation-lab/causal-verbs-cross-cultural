/* Source-level runtime checks. Browser walkthroughs and real Sandbox saves are separate. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'..');
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function session(name,ns,code,{storage=new Map(),until=Infinity,decline=false,failSave=false}={}) {
 const dir=path.join(root,'Pilots',name,'collection');
 const allocation=JSON.parse(fs.readFileSync(path.join(dir,'allocation.json')));
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'explanation-lab.config.json')));
 const elements=new Map(),target={innerHTML:''};let timeline,options,finishData,properties={},rows=[],calls=[],ended=false;
 const element=id=>{if(!elements.has(id))elements.set(id,{value:'Synthetic sandbox validation',disabled:true,addEventListener(type,fn){this[type]=fn;},remove(){},scrollIntoView(){}});return elements.get(id);};
 const radio=element('radio');radio.value='4';
 const document={getElementById:id=>id==='jspsych-target'?target:element(id),querySelector:s=>s.includes(':checked')?radio:element('active'),querySelectorAll:()=>[radio]};
 const client={launch:{studyKey:'sandbox-source-test',mode:'sandbox',condition:code,participant:{prolificPid:'SYNTHETIC',studyId:'SYNTHETIC',sessionId:'source-test'}},study:{experimentVersion:manifest.experimentVersion,conditions:manifest.launchConditions},async submitAndRedirect(data,opts){calls.push({trials:JSON.parse(JSON.stringify(data.values())),options:opts});if(failSave)throw Error('synthetic save failure');}};
 let context;
 const initJsPsych=opts=>{options=opts;return {data:{addProperties:p=>Object.assign(properties,p),write:r=>rows.push({...r}),get:()=>({values:()=>rows})},run:t=>timeline=t,finishTrial:extra=>finishData=extra,endExperiment:()=>{ended=true;}};};
 context=vm.createContext({console:{...console,error(){}},document,window:{scrollY:0,scrollTo(){}},location:{search:'?study=sandbox-source-test&mode=sandbox'},URLSearchParams,crypto:webcrypto,performance,CustomEvent:class{},dispatchEvent(){},requestAnimationFrame:f=>f(),setTimeout,clearTimeout,initJsPsych,jsPsychHtmlButtonResponse:function(){},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},FormData:class{constructor(){return Object.entries({age:'31',sex:'Other',birth_country:'Testland',current_country:'Testland',race_ethnicity:'Synthetic',first_language:'English',other_languages_spoken:'Yes',other_languages:'French',everyday_language:'English'})[Symbol.iterator]();}}});
 for(const f of ['materials','core','config'])vm.runInContext(fs.readFileSync(path.join(dir,'js',f+'.js'),'utf8'),context);
 const source=fs.readFileSync(path.join(dir,'js/study.js'),'utf8');
 const module=new vm.SyntheticModule(['default'],function(){this.setExport('default',async()=>client);},{context});
 await module.link(()=>{});await module.evaluate();
 vm.runInContext(source,context,{importModuleDynamically:async()=>module});
 for(let i=0;i<20&&!timeline;i++)await new Promise(r=>setImmediate(r));
 const api=context[ns+'Study'];
 assert(timeline||api?.state.complete,'Runtime did not start: '+target.innerHTML);
 assert.equal(api.assignment.condition,allocation.cells[code].verb_condition);
 assert.deepEqual(JSON.parse(JSON.stringify(api.assignment.variants)),allocation.cells[code].variants);
 let processed=0;
 for(const trial of timeline||[]) {
   if(processed++>=until)break;
   trial.on_start();target.innerHTML=trial.stimulus();trial.on_load();
   const stage=trial.data.stage;
   if(stage==='consent')element(decline?'consent-no':'consent-yes').onclick();
   else if(stage==='rating') {assert(target.innerHTML.includes('How natural is this sentence as a description of the situation?'));assert(target.innerHTML.includes(escape(trial.data.sentence)));radio.onchange();element('rating-continue').onclick();}
   else if(stage==='demographics')element('demographics-form').onsubmit({preventDefault(){}});
   else if(stage==='feedback')element('feedback-form').onsubmit({preventDefault(){}});
   else element('stage-continue').click();
   if(ended)break;
   const row={...properties,...trial.data,...finishData,trial_type:'html-button-response',trial_index:rows.length};
   trial.on_finish(row);rows.push(row);
 }
 if(ended || (timeline && until>=timeline.length))await options.on_finish();
 return {calls,storage,rows,html:target.innerHTML,api,manifest};
}
(async()=> {
 let total=0;
 for(const [name,ns] of [['Absences','absence'],['Factivity','factivity'],['Chains','chains']]) {
  const dir=path.join(root,'Pilots',name,'collection');
  const a=JSON.parse(fs.readFileSync(path.join(dir,'allocation.json'))),codes=Object.keys(a.cells);
  const manifest=JSON.parse(fs.readFileSync(path.join(dir,'explanation-lab.config.json')));
  assert.equal(fs.readFileSync(path.join(root,'Pilots',name,'css/study.css'),'utf8'),fs.readFileSync(path.join(dir,'css/study.css'),'utf8'));
  assert.equal(Object.values(a.conditions).reduce((x,y)=>x+y),100);
  assert(a.conditions.thick<a.conditions.thin);
  assert.deepEqual(manifest.launchConditions,codes);
  for(const code of codes) {
   const r=await session(name,ns,code);assert.equal(r.calls.length,1);
   const saved=r.calls[0];const ratings=saved.trials.filter(r=>r.stage==='rating');
   assert.equal(ratings.length,name==='Factivity'?12:16);
   assert(ratings.every(t=>t.condition===code && t.verb_condition===a.cells[code].verb_condition && t.rating===4));
   assert.equal(saved.trials.find(r=>r.stage==='demographics').age,31);
   assert(r.html.includes('Sandbox complete'));total++;
  }
  const code=codes.at(-1),partial=await session(name,ns,code,{until:9});
  assert.equal(partial.calls.length,0);
  const resumed=await session(name,ns,code,{storage:partial.storage});
  assert.equal(resumed.calls.length,1);assert.equal(resumed.rows.filter(r=>r.stage==='rating').length,name==='Factivity'?12:16);
  const again=await session(name,ns,code,{storage:resumed.storage});assert.equal(again.calls.length,0);
  const refusal=await session(name,ns,code,{decline:true});assert.equal(refusal.calls.length,0);
  const failed=await session(name,ns,code,{failSave:true});assert.equal(failed.calls.length,1);assert(!failed.html.includes('Sandbox complete'));
  console.log(name+': all '+codes.length+' allocation groups, exact materials, complete data, reload, refusal and save failure passed.');
 }
 console.log(total+' source-level sessions passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
