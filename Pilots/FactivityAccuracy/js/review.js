/* Separate entry point: no participant API, assignment counter, or data writes. */
(function() {
  'use strict';
  function ready() {
    const study=globalThis.factivityStudy,core=FactivityCore;
    const condition=document.getElementById('review-condition'),jump=document.getElementById('review-screen');
    const variants=Object.fromEntries(['sewer_system','phone','scooter'].map(name=>[name,document.getElementById('review-'+name)]));
    function refresh(index=study.currentIndex) {
      condition.value=study.assignment.condition;
      for(const [name,select] of Object.entries(variants)) {select.value=study.assignment.variants[name];select.disabled=false;}
      jump.replaceChildren(...study.screens.map((screen,i)=>{const option=document.createElement('option');option.value=i;option.textContent=`${i+1}. ${screen.label}`;return option;}));
      jump.value=String(index);
      document.getElementById('review-status').textContent=`${study.assignment.condition==='thick'?'Thick':'Thin'} · Stories: ${study.assignment.case_order.join(' → ')} · Sentence order: ${study.assignment.sentence_order.map(r=>core.LABELS[r]).join(' → ')} · ${Object.entries(study.assignment.variants).map(([k,v])=>k+': '+v).join('; ')}`;
    }
    function navigate(index) {
      const url=new URL(location.href);url.search='';if(url.protocol==='file:')url.searchParams.set('assignment',JSON.stringify(study.assignment));url.searchParams.set('screen',index);url.searchParams.set('autostart','1');location.assign(url);
    }
    function update() {
      const next=core.assignment(condition.value,Object.fromEntries(Object.entries(variants).map(([k,v])=>[k,v.value])));
      next.case_order=[...study.assignment.case_order];next.sentence_order=[...study.assignment.sentence_order];
      study.setReviewAssignment(next);navigate(study.currentIndex);
    }
    condition.onchange=update;Object.values(variants).forEach(select=>select.onchange=update);
    document.getElementById('panel-toggle').onclick=e=>{const content=document.getElementById('panel-content');content.hidden=!content.hidden;e.target.textContent=content.hidden?'Show review controls':'Hide review controls';e.target.setAttribute('aria-expanded',String(!content.hidden));};
    document.getElementById('panel-go').onclick=()=>navigate(Number(jump.value));
    document.getElementById('panel-previous').onclick=()=>navigate(Math.max(0,study.currentIndex-1));
    document.getElementById('panel-next').onclick=()=>navigate(Math.min(study.screens.length-1,study.currentIndex+1));
    document.getElementById('panel-randomize').onclick=()=>{study.setReviewAssignment(core.assignment(condition.value));navigate(0);};
    document.getElementById('panel-order').onclick=()=>{study.setReviewAssignment({...study.assignment,sentence_order:core.shuffle(core.ROLES)});navigate(study.currentIndex);};
    document.getElementById('panel-download').onclick=()=>study.exportData();
    globalThis.addEventListener('factivity-screen',event=>{jump.value=String(event.detail.index);});
    const params=new URLSearchParams(location.search),requested=Number(params.get('screen')||0);
    const index=Number.isInteger(requested)&&requested>=0&&requested<study.screens.length?requested:0;
    refresh(index);document.getElementById('review-start').onclick=()=>study.run(index);
    if(params.get('autostart')==='1')study.run(index);
  }
  if(globalThis.factivityStudy)ready();else globalThis.addEventListener('factivity-ready',ready,{once:true});
})();
