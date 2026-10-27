const assert=require('node:assert/strict');
const core=require('../Pilots/Absences/js/core.js');
const materials=require('../Pilots/Absences/js/materials.js');

assert.equal(materials.cases.length,7);
for(const condition of ['thin','thick']) {
  for(const beach of core.VARIANTS.beach) for(const driveway of core.VARIANTS.driveway) for(const cellar of core.VARIANTS.cellar) {
    const a=core.assignment(condition,{beach,driveway,cellar});
    const screens=core.screens(a);
    assert.equal(screens.filter(s=>s.stage==='rating').length,16);
    assert.equal(screens.filter(s=>s.stage==='story').length,4);
    for(const name of core.CASES) {
      const item=core.material(materials,a,name);
      assert.deepEqual(item.sentences.map(s=>s.role),a.sentence_order);
      assert.equal(item.sentences.length,4);
      assert(!item.ending.includes('both of the following'));
      assert(item.ending===item.endings[condition]);
      if(condition==='thick') assert.equal(a.variants[name],core.VARIANTS[name][0]);
      if(name==='cellar'&&a.variants.cellar==='increase'&&condition==='thin') {
        assert(item.ending.includes('level of water'));
        assert(item.sentences.every(s=>s.text.includes('level of water')&&!s.text.includes('humidity')&&!s.text.includes('/')));
      }
    }
  }
}
assert.throws(()=>core.validateAssignment({...core.assignment('thin'),sentence_order:Array(4).fill('absence_cause')}));
console.log('PASS: all thin alternative combinations; four distinct stories, 16 ratings, single outcomes, stable sentence roles, and English water-level wording.');
