const assert=require('node:assert/strict'),fs=require('node:fs');
const base=require('../Pilots/Factivity/js/materials.js');
const materials=require('../Pilots/FactivityAccuracy/js/materials.js');
const core=require('../Pilots/FactivityAccuracy/js/core.js');
const allocation=require('../Pilots/FactivityAccuracy/collection/allocation.json');
assert.deepEqual(materials.cases.slice(0,7),base.cases,'Every original story, outcome and target must be unchanged.');
assert.equal(materials.cases.length,9);
assert.deepEqual(allocation.conditions,{thick:36,thin:64});
assert.deepEqual(allocation.distinct_versions,{thick:5,thin:9});
assert.equal(Object.keys(allocation.cells).length,28);
assert.equal(Object.values(allocation.cells).reduce((n,c)=>n+c.target,0),100);
assert.deepEqual(allocation.variant_targets.thin.sewer_system,{stop_working:32,overwhelm:32});
assert.deepEqual(Object.values(allocation.variant_targets.thin.phone).sort(),[21,21,22]);
assert.deepEqual(Object.values(allocation.variant_targets.thin.scooter),[16,16,16,16]);
assert.deepEqual(Object.values(allocation.variant_targets.thick.phone),[18,18]);
assert.deepEqual(Object.values(allocation.variant_targets.thick.scooter),[18,18]);
for(const condition of ['thick','thin']) for(const sewer_system of core.VARIANTS.sewer_system) for(const phone of core.VARIANTS.phone) for(const scooter of core.VARIANTS.scooter) {
 const a=core.assignment(condition,{sewer_system,phone,scooter});
 assert.equal(core.screens(a).filter(x=>x.stage==='rating').length,12);
 assert.equal(new Set(a.case_order).size,3);
 for(const name of core.CASES) {
  const item=core.material(materials,a,name);
  assert.deepEqual(item.sentences.map(s=>s.role),a.sentence_order);
  assert.equal(item.ending,item.endings[condition]);
  assert(item.sentences.every(s=>s.text===s.source_text));
 }
}
const ruin=materials.cases.find(c=>c.variant==='ruin'),overwhelm=materials.cases.find(c=>c.variant==='overwhelm');
assert.equal(ruin.endings.thin,'As a result, the phone is ruined.');
assert.equal(ruin.targets.fact_cause_thin.text,'The manufacturing defect caused the phone to be ruined.');
assert.equal(ruin.targets.fact_lexical_thin.text,'The manufacturing defect ruined the phone.');
assert.equal(overwhelm.targets.fact_cause_thin.text,'The intensity of the storm caused the town’s sewer system to be overwhelmed.');
assert.equal(overwhelm.targets.direct_lexical_thin.text,'The storm overwhelmed the town’s sewer system.');
assert.equal(fs.readFileSync('Pilots/FactivityAccuracy/css/study.css','utf8'),fs.readFileSync('Pilots/Factivity/css/study.css','utf8'));
const runtime=fs.readFileSync('Pilots/FactivityAccuracy/collection/js/study.js','utf8');
assert(!runtime.includes('Very unnatural')&&!runtime.includes('How natural is'));
assert(runtime.includes('Completely inaccurate')&&runtime.includes('Completely accurate'));
assert(runtime.includes('name=accuracy'));
assert(runtime.includes('factivity-accuracy-english-console-2.0.0'));
assert(runtime.includes('causal-verbs-factivity-accuracy-'));
const preview=fs.readFileSync('Pilots/FactivityAccuracy/preview.html','utf8');
for(const value of ['review-sewer_system','value="overwhelm"','value="ruin"'])assert(preview.includes(value));
console.log('PASS: 48 review assignments, unchanged original materials, approved additions, isolated accuracy measure, exact 36/64 quotas and all variant margins.');
