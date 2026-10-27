const assert=require('node:assert/strict');
const fs=require('node:fs');
const core=require('../Pilots/Chains/js/core.js');
const materials=require('../Pilots/Chains/js/materials.js');

assert.equal(materials.cases.length,10);
assert.deepEqual(materials.source.filter,{'Study':'chain','Thin-pair type':'alternating'});
assert.deepEqual(materials.source.edits,[]);
assert.deepEqual(core.ROLES,['distal_cause','distal_lexical','proximal_cause','proximal_lexical']);
let combinations=0;
for(const condition of ['thick','thin']) {
  for(const frame of core.VARIANTS.frame) for(const railing of core.VARIANTS.railing)
  for(const street_sign of core.VARIANTS.street_sign) for(const wine of core.VARIANTS.wine) {
    combinations++;
    const variants={frame,railing,street_sign,wine};
    const assigned=core.assignment(condition,variants);
    assert.deepEqual(assigned.variants,variants);
    assert.equal(core.screens(assigned).filter(s=>s.stage==='story').length,4);
    assert.equal(core.screens(assigned).filter(s=>s.stage==='rating').length,16);
    for(const name of core.CASES) {
      const item=core.material(materials,assigned,name);
      assert.deepEqual(item.sentences.map(s=>s.role),assigned.sentence_order);
      assert.equal(item.ending,item.endings[condition]);
      assert(!item.ending.includes('both of the following'));
      assert(item.sentences.every(s=>s.text===s.source_text));
    }
    const roadside=core.material(materials,assigned,'street_sign');
    assert(roadside.setup.includes(street_sign==='disconnect_sign'?'electronic road sign':'hazard beacon'));
    assert(roadside.sentences.every(s=>s.text.includes(street_sign==='disconnect_sign'?'electronic road sign':'hazard beacon')));
    const wineItem=core.material(materials,assigned,'wine');
    if(wine==='decrease_party_supply') {
      assert(wineItem.setup.includes('large jug'));
      assert(wineItem.sentences.every(s=>s.text.includes("party's supply")));
    }
  }
}
assert.equal(combinations,72);
const sourceTargets=materials.cases.flatMap(c=>Object.values(c.targets));
assert.equal(sourceTargets.length,80);
assert(sourceTargets.every(s=>s.row_key.includes('|chain|')||s.row_key.startsWith('chain|')));
assert.equal(fs.readFileSync('Pilots/Chains/css/study.css','utf8'),fs.readFileSync('Pilots/Factivity/css/study.css','utf8'));
console.log('PASS: 72 condition/variant combinations; four distinct stories and 16 ratings; 80 unchanged source targets; matched object/party contexts; identical layout CSS.');
