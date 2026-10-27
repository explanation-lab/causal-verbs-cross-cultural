const assert=require('node:assert/strict');
const fs=require('node:fs');
const core=require('../Pilots/Factivity/js/core.js');
const materials=require('../Pilots/Factivity/js/materials.js');

assert.equal(materials.cases.length,7);
assert.deepEqual(materials.source.filter,{'Study':'fact','Thin-pair type':'alternating'});
assert.deepEqual(materials.source.edits,[]);
for(const condition of ['thick','thin']) {
  for(const phone of core.VARIANTS.phone) for(const scooter of core.VARIANTS.scooter) {
    const assigned=core.assignment(condition,{phone,scooter});
    assert.equal(assigned.variants.phone,phone);
    assert.equal(assigned.variants.scooter,scooter);
    assert.equal(core.screens(assigned).filter(s=>s.stage==='story').length,3);
    assert.equal(core.screens(assigned).filter(s=>s.stage==='rating').length,12);
    for(const name of core.CASES) {
      const item=core.material(materials,assigned,name);
      assert.deepEqual(item.sentences.map(s=>s.role),assigned.sentence_order);
      assert.equal(item.ending,item.endings[condition]);
      assert(!item.ending.includes('both of the following'));
      assert(item.sentences.every(s=>s.text===s.source_text));
    }
    const phoneItem=core.material(materials,assigned,'phone');
    assert(phoneItem.setup.includes(phone==='die_kill'?'software defect':'manufacturing defect'));
    assert(phoneItem.sentences.some(s=>s.text.includes(phone==='die_kill'?'Running the app':'Suzy’s texting')));
  }
}
const battery=materials.cases.find(c=>c.variant==='disconnect_battery');
const network=materials.cases.find(c=>c.variant==='disconnect_network');
assert(battery.endings.thin.includes('from its battery'));
assert(network.endings.thin.includes('from the rental network'));
assert(network.setup.includes('rental e-scooter'));
for(const role of core.ROLES) {
  const key=role+'_thin';
  assert.equal(battery.targets[key].text,network.targets[key].text);
  assert(!battery.targets[key].text.includes('battery'));
  assert(!network.targets[key].text.includes('rental network'));
}
assert(materials.cases.find(c=>c.variant==='die_kill').targets.fact_lexical_thin.text.includes('killed'));
assert(materials.cases.find(c=>c.case==='sewer_system').targets.fact_cause_thin.text.includes('stop working'));
assert.equal(fs.readFileSync('Pilots/Factivity/css/study.css','utf8'),fs.readFileSync('Pilots/Absences/css/study.css','utf8'));
console.log('PASS: both conditions × all eight phone/scooter combinations; three stories and 12 ratings; unchanged source wording; generic disconnect targets; identical layout CSS.');
