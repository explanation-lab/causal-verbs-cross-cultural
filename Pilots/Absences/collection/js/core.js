/* Pure design logic, shared by the participant study, preview, and checks. */
(function(root) {
  'use strict';
  const CASES = ['beach', 'driveway', 'rocket', 'cellar'];
  const VARIANTS = {beach:['change','dry_out'], driveway:['weaken','degrade'], rocket:['activate'], cellar:['increase','dampen']};
  const ROLES = ['absence_cause','absence_lexical','direct_cause','direct_lexical'];
  const LABELS = {absence_cause:'Omission · cause + verb', absence_lexical:'Omission · lexical verb', direct_cause:'Direct cause · cause + verb', direct_lexical:'Direct cause · lexical verb'};
  function shuffle(values, random = Math.random) {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function assignment(condition, variants = {}, random = Math.random) {
    if (!['thick','thin'].includes(condition)) throw new Error('Unknown condition.');
    const selected = {};
    for (const name of CASES) {
      const options = VARIANTS[name];
      const chosen = condition === 'thick' ? options[0] : (variants[name] || options[Math.floor(random()*options.length)]);
      if (!options.includes(chosen)) throw new Error('Unknown variant for ' + name);
      selected[name] = chosen;
    }
    return {condition, variants:selected, case_order:shuffle(CASES,random), sentence_order:shuffle(ROLES,random)};
  }
  function validateAssignment(value) {
    const permutation = (a,b) => Array.isArray(a) && a.length===b.length && new Set(a).size===b.length && a.every(x=>b.includes(x));
    if (!value || !['thick','thin'].includes(value.condition) || !permutation(value.case_order,CASES) || !permutation(value.sentence_order,ROLES)) throw new Error('Invalid study assignment.');
    for (const name of CASES) {
      if (!VARIANTS[name].includes(value.variants?.[name]) || (value.condition==='thick' && value.variants[name]!==VARIANTS[name][0])) throw new Error('Invalid case variant.');
    }
    return value;
  }
  function material(materials, selected, name) {
    validateAssignment(selected);
    const source = materials.cases.find(c=>c.case===name && c.variant===selected.variants[name]);
    if (!source) throw new Error('Missing case materials.');
    const sentences = selected.sentence_order.map(role=>({role, ...source.targets[role+'_'+selected.condition]}));
    if (sentences.some(s=>!s.text)) throw new Error('Missing target sentence.');
    return {...source, ending:source.endings[selected.condition], sentences};
  }
  function screens(selected) {
    validateAssignment(selected);
    const result = [{stage:'consent',label:'Consent'}, {stage:'instructions',label:'Instructions'}];
    selected.case_order.forEach((name,index)=> {
      const title = name[0].toUpperCase()+name.slice(1);
      const base = {case:name, case_position:index+1};
      result.push({...base,stage:'story',label:title+' · Story'}, {...base,stage:'preview',label:title+' · Read all four sentences'});
      selected.sentence_order.forEach((role,i)=>result.push({...base,stage:'rating',role,sentence_position:i+1,label:title+' · Rating '+(i+1)+' · '+LABELS[role]}));
    });
    result.push({stage:'demographics',label:'Demographics and languages'}, {stage:'feedback',label:'Optional feedback'});
    return result;
  }
  const api = {CASES,VARIANTS,ROLES,LABELS,shuffle,assignment,validateAssignment,material,screens};
  if (typeof module!=='undefined' && module.exports) module.exports=api; else root.AbsenceCore=api;
})(globalThis);
