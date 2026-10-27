/* Source-level regression check for file URLs with browser storage unavailable.
   No browser is opened and no files or network URLs are accessed by the runtime. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function runtime(pilot,url,includePanel=false) {
  const elements=new Map();
  const element=id=>{
    if(!elements.has(id)) elements.set(id,{id,value:'',hidden:false,textContent:'',innerHTML:'',
      replaceChildren(...children){this.children=children;},setAttribute(){},remove(){}});
    return elements.get(id);
  };
  const location={href:url,search:new URL(url).search,protocol:new URL(url).protocol,
    assign(value){this.assigned=String(value);}};
  const sandbox={console,URL,URLSearchParams,location,
    document:{getElementById:element,createElement:()=>({})},
    sessionStorage:{getItem(){throw new Error('Storage unavailable');},setItem(){throw new Error('Storage unavailable');}},
    Event:class Event{},CustomEvent:class CustomEvent{},dispatchEvent(){},addEventListener(){}};
  const prefix=pilot==='Absences'?'Absence':pilot;
  sandbox[(pilot==='Absences'?'ABSENCE':pilot.toUpperCase())+'_REVIEW']=true;
  const context=vm.createContext(sandbox);
  for(const file of ['materials','core','config','study'])vm.runInContext(fs.readFileSync(`Pilots/${pilot}/js/${file}.js`,'utf8'),context);
  const namespace=pilot==='Absences'?'absenceStudy':pilot.toLowerCase()+'Study';
  const study=context[namespace];
  assert(study,'Review initialization must survive unavailable session storage.');
  if(includePanel)vm.runInContext(fs.readFileSync(`Pilots/${pilot}/js/review.js`,'utf8'),context);
  return {context,study,element,location};
}
for(const pilot of ['Absences','Factivity','Chains']) {
  const first=runtime(pilot,`file:///review/Pilots/${pilot}/preview.html`,true);
  const chosen=first.context[(pilot==='Absences'?'Absence':pilot)+'Core'].assignment('thin');
  first.study.setReviewAssignment(chosen);
  first.element('panel-go').onclick();
  const next=new URL(first.location.assigned);
  assert.equal(next.protocol,'file:');
  assert.deepEqual(JSON.parse(next.searchParams.get('assignment')),JSON.parse(JSON.stringify(chosen)));
  const restored=runtime(pilot,next.href);
  assert.deepEqual(JSON.parse(JSON.stringify(restored.study.assignment)),JSON.parse(JSON.stringify(chosen)));
}
console.log('PASS: all three review runtimes initialize with blocked storage and preserve assignments through file-URL navigation.');
