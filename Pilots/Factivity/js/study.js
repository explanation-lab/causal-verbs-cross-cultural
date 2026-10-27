/* jsPsych 7 study. Researcher review never calls the participant API. */
(function() {
  'use strict';
  const core=FactivityCore, materials=FactivityMaterials, config=FactivityConfig;
  const review=globalThis.FACTIVITY_REVIEW===true;
  const storageKey='causal-verbs-factivity-'+config.studyVersion;
  const escape = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let selected, state, jsPsych, currentIndex=0, priorScroll=0, priorCase=null, priorStage=null;
  const target=document.getElementById('jspsych-target');
  function persist() { if (!review) localStorage.setItem(storageKey,JSON.stringify(state)); }
  function download(payload,name,type='application/json') {
    const url=URL.createObjectURL(new Blob([payload],{type}));
    const link=document.createElement('a');link.href=url;link.download=name;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function payload() {
    return {study_version:config.studyVersion,materials_sha256:materials.source.sha256,
      review_mode:review,valid_participant_data:!review,session_id:state.id,
      assignment:selected,consented:state.consented,complete:state.complete,
      trials:state.records};
  }
  function exportData(format='json') {
    const data=payload(),name=`factivity-${review?'review':state.id}`;
    if (format==='json') return download(JSON.stringify(data,null,2),name+'.json');
    const columns=['session_id','condition','case','variant','case_position','sentence_position','candidate','construction','sentence','rating','rt','study_version'];
    const csvValue=value=>'"'+String(value??'').replace(/"/g,'""')+'"';
    const rows=state.records.filter(r=>r.stage==='rating').map(r=>({...r,session_id:state.id,condition:selected.condition,study_version:config.studyVersion}));
    download([columns.join(','),...rows.map(r=>columns.map(k=>csvValue(r[k])).join(','))].join('\r\n'),name+'.csv','text/csv');
  }
  async function request(path,body) {
    const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(!response.ok) throw new Error('The study could not save or load your session. Please try again.');
    return response.json();
  }
  function page(content,classes='') {return `<section class="page ${classes}">${content}</section>`;}
  function consent() {
    return page(`<div class="consent-card"><h1>Consent Form</h1>
      <p>Thank you for agreeing to take part in this study. We appreciate your time and effort. In this study, we will present you with fictional scenarios, and then we will ask you to answer a brief series of questions about those scenarios. The questions have no right or wrong answers-- we're just exploring features of human psychology in this research. ${escape(config.compensation)} We do not anticipate any risks from participating in this research. While you will not directly benefit from taking part in this research study, we hope society and the scientific community will benefit from the knowledge gained about human psychology and judgment.</p>
      <p>Your involvement should take ${escape(config.duration)}. Your participation is voluntary and you can stop at any time. If you consent to take part in this survey, please indicate so below. If not, simply close your browser window.</p>
      <p>The research data will be collected anonymously. We will not ask you to provide any personally identifiable information (such as an email-address, name, etc.) and will not be able to link your response to you. We anticipate that your participation in this survey presents no greater risk than everyday use of the Internet. Of course, please note that there is always the possible risk of intrusion by outside agents (i.e. hacking) whenever information is shared over the Internet. This study will run in your browser. Additionally, we will not ask for directly or indirectly identifiable information in the survey.</p>
      <p>If you have any questions about the research study, please contact Shaun Nichols (sbn44@cornell.edu) at Cornell University. If you have any questions or concerns regarding your rights as a subject in this study, you may contact the Institutional Review Board (IRB) for Human Participants at 607-255-5138 or access their website at <a href="http://www.irb.cornell.edu" target="_blank" rel="noopener">http://www.irb.cornell.edu</a>. You may also report your concerns or complaints anonymously through Ethicspoint online at <a href="http://www.hotline.cornell.edu" target="_blank" rel="noopener">www.hotline.cornell.edu</a> or by calling toll free at 1-866-293-3077. Ethicspoint is an independent organization that serves as a liaison between the University and the person bringing the complaint so that anonymity can be ensured.</p>
      <p>Taking part in this study is voluntary. You can stop at any time. Withdrawal or refusal to participate will not result in any penalty. You do not waive any legal rights or release any agent from liability for negligence by consenting to participate.</p>
      <p>If you consent to take part in this survey, please indicate so below:</p></div>
      <div class="consent-actions"><button id="consent-yes">I consent</button><button id="consent-no">I do NOT consent</button></div>`,'simple-page');
  }
  function storyHTML(item,screen) {
    return `<div class="story-block"><strong class="read-instruction">Please read the following very carefully before answering any questions.</strong><div class="story"><p>${escape(item.setup)}</p><p>${escape(item.ending)}</p></div></div>`;
  }
  function scale() {
    return `<div class="rating-panel"><fieldset class="scale" aria-describedby="naturalness-question"><legend>Naturalness rating</legend><div class="scale-options">${Array.from({length:7},(_,i)=>`<label><input type="radio" name="naturalness" value="${i+1}" aria-label="${i+1}${i===0?' — Very unnatural':i===6?' — Very natural':''}"><span>${i+1}</span></label>`).join('')}</div><div class="scale-anchors"><span>Very unnatural</span><span>Very natural</span></div></fieldset><div class="rating-action"><button id="rating-continue" disabled>Continue</button></div></div>`;
  }
  function caseHTML(screen) {
    const item=core.material(materials,selected,screen.case);
    let content=storyHTML(item,screen);
    if (screen.stage==='story') return page(content+'<div class="story-action"><button id="stage-continue">Continue</button></div>');
    if(screen.stage==='preview') {
      content+='<p class="sentence-instruction"><strong>Please carefully read all of the following sentences before rating them.</strong></p>';
      content+='<ol class="sentence-list">'+item.sentences.map((sentence,index)=>
        `<li class="sentence-slot preview-sentence" data-position="${index+1}"><span class="sentence-number" aria-hidden="true">${index+1}</span><span class="sentence-text">${escape(sentence.text)}</span></li>`
      ).join('')+'</ol><div class="preview-action"><button id="stage-continue">Continue</button></div>';
    } else {
      const sentence=item.sentences[screen.sentence_position-1];
      content+=`<section class="question-card sentence-slot active" data-position="${screen.sentence_position}" aria-label="Sentence rating"><p class="rating-question" id="naturalness-question">How natural is this sentence as a description of the situation?</p><span class="sentence-text">${escape(sentence.text)}</span>${scale()}</section>`;
    }
    return page(content);
  }
  function demographics() {
    const s=materials.shared;
    const text=(name,key)=>`<div class="field"><label for="${name}">${escape(s[key])} <span class="optional">(optional)</span></label><input id="${name}" name="${name}" type="text" autocomplete="off"></div>`;
    return page(`<h1>About you</h1><p>You may leave any of these questions blank.</p><form id="demographics-form">
      <div class="field"><label for="age">${escape(s.demo_age_question)} <span class="optional">(optional)</span></label><input type="number" id="age" name="age" min="18" max="120" step="1"><p class="optional">${escape(s.demo_age_instruction)}</p></div>
      <div class="field"><label for="sex">${escape(s.demo_sex_question)}</label><select id="sex" name="sex"><option value="">Prefer not to answer</option><option>Male</option><option>Female</option><option>Other</option></select></div>
      ${text('birth_country','demo_birth_country_question')}${text('current_country','demo_current_country_question')}${text('race_ethnicity','demo_race_ethnicity_question')}${text('first_language','demo_first_language_question')}
      <div class="field"><label for="other_languages_spoken">${escape(s.demo_other_languages_question)}</label><select name="other_languages_spoken" id="other_languages_spoken"><option value="">Prefer not to answer</option><option value="No">No</option><option value="Yes">Yes</option></select></div>
      <div id="other-languages-field" hidden>${text('other_languages','demo_other_languages_if_yes')}</div>
      ${text('everyday_language','demo_everyday_language_question')}<button type="submit">Continue</button></form>`,'simple-page');
  }
  function html(screen) {
    if(screen.case) return caseHTML(screen);
    if(screen.stage==='consent') return consent();
    if(screen.stage==='instructions') return page(`<h1>Instructions</h1><p>${escape(materials.shared.instructions_intro)}</p><p>For each story, you'll read four sentences about what happened, and then you'll rate each sentence.</p><p>When you're ready to begin, click Begin below.</p><button id="stage-continue">Begin</button>`,'simple-page instructions-page');
    if(screen.stage==='demographics') return demographics();
    return page('<h1>Feedback</h1><form id="feedback-form"><div class="field"><label for="feedback">Do you have any feedback about any part of this study? <span class="optional">(optional)</span></label><textarea id="feedback" name="feedback" rows="5"></textarea></div><button type="submit">Finish</button></form>','simple-page');
  }
  function bind(screen) {
    const began=performance.now();
    const finish=extra=>jsPsych.finishTrial({rt:Math.round(performance.now()-began),...extra});
    document.getElementById('stage-continue')?.addEventListener('click',()=>finish({}));
    if(screen.stage==='consent') {
      document.getElementById('consent-yes').onclick=()=>{state.consented=true;finish({consent:true});};
      document.getElementById('consent-no').onclick=()=>{
        state.consented=false;state.records=[];persist();
        jsPsych.endExperiment('Thank you. You have not consented, and no study responses have been submitted. You may close this window.');
      };
    }
    if(screen.stage==='rating') {
      const active=document.querySelector('.sentence-slot.active');
      const button=document.getElementById('rating-continue');
      document.querySelectorAll('input[name=naturalness]').forEach(input=>input.onchange=()=>{button.disabled=false;});
      button.onclick=()=>{const input=document.querySelector('input[name=naturalness]:checked');if(input)finish({rating:Number(input.value)});};
      requestAnimationFrame(()=> {
        window.scrollTo(0,priorCase===screen.case?priorScroll:0);
        if(priorStage!=='rating' || priorCase!==screen.case) active.scrollIntoView({block:'nearest',behavior:'auto'});
      });
    } else window.scrollTo(0,0);
    if(screen.stage==='demographics') {
      document.getElementById('other_languages_spoken').onchange=e=>{document.getElementById('other-languages-field').hidden=e.target.value!=='Yes';};
      document.getElementById('demographics-form').onsubmit=e=>{
        e.preventDefault();const values=Object.fromEntries(new FormData(e.target));
        if(values.age && (!Number.isInteger(Number(values.age)) || Number(values.age)<18 || Number(values.age)>120)) return;
        values.age=values.age?Number(values.age):null;
        if(values.other_languages_spoken!=='Yes') values.other_languages='';
        finish({demographics:values});
      };
    }
    if(screen.stage==='feedback') document.getElementById('feedback-form').onsubmit=e=>{e.preventDefault();finish({feedback:document.getElementById('feedback').value});};
    globalThis.dispatchEvent(new CustomEvent('factivity-screen',{detail:{screen,index:currentIndex}}));
  }
  function trial(screen,index) {
    const item=screen.case?core.material(materials,selected,screen.case):null;
    const sentence=screen.stage==='rating'?item.sentences[screen.sentence_position-1]:null;
    return {type:jsPsychHtmlButtonResponse,choices:[],stimulus:()=>html(screen),
      data:{...screen,condition:selected.condition,variant:item?.variant??null,story_setup:item?.setup??null,story_ending:item?.ending??null,
        sentence:sentence?.text??null,candidate:sentence?.role.split('_')[0]??null,construction:sentence?.role.split('_')[1]??null,
        source_row:sentence?.source_row??null,source_row_key:sentence?.row_key??null,screen_index:index},
      on_start:()=>{currentIndex=index;priorScroll=window.scrollY;},on_load:()=>bind(screen),
      on_finish:data=>{
        delete data.stimulus;
        data.review_mode=review;data.valid_participant_data=!review;data.study_version=config.studyVersion;
        if(state.consented || review) {
          state.records.push({...data});state.next=index+1;priorCase=screen.case??null;priorStage=screen.stage;persist();
        }
      }};
  }
  async function complete() {
    if(!state.consented && !review) return;
    state.complete=true;persist();
    if(review) {target.innerHTML=page('<h1>Review complete</h1><p>No responses were submitted. Use the review panel to inspect another screen.</p>');return;}
    target.innerHTML=page('<h1>Saving your responses…</h1><p>Please keep this page open.</p>');
    try {
      await request('/api/factivity/save',payload());state.saved=true;persist();
      target.innerHTML=page('<h1>Thank you!</h1><p class="saved">Your responses have been saved.</p><p>You may close this window.</p><div class="downloads"><button id="download-json">Download responses (JSON)</button><button id="download-csv">Download ratings (CSV)</button></div>');
      document.getElementById('download-json').onclick=()=>exportData();document.getElementById('download-csv').onclick=()=>exportData('csv');
    } catch(error) {
      target.innerHTML=page('<h1>Your responses are ready</h1><p class="error">The save did not complete. Your responses remain in this browser. Please retry before closing this page, or download a copy.</p><div class="downloads"><button id="retry-save">Retry saving</button><button id="download-json">Download responses (JSON)</button><button id="download-csv">Download ratings (CSV)</button></div>');
      document.getElementById('retry-save').onclick=complete;document.getElementById('download-json').onclick=()=>exportData();document.getElementById('download-csv').onclick=()=>exportData('csv');
    }
  }
  function run(index=0) {
    document.getElementById('review-entry')?.remove();
    const list=core.screens(selected);
    jsPsych=initJsPsych({display_element:'jspsych-target',show_progress_bar:true,on_finish:complete});
    globalThis.factivityStudy.jsPsych=jsPsych;
    jsPsych.data.addProperties({session_id:state.id,condition:selected.condition,review_mode:review,valid_participant_data:!review,
      case_order:[...selected.case_order],sentence_order:[...selected.sentence_order],assigned_variants:{...selected.variants},study_version:config.studyVersion});
    if(!review && state.complete) {complete();return;}
    if(index>=list.length) {complete();return;}
    const timeline=list.slice(index).map((screen,i)=>trial(screen,index+i));
    jsPsych.run(timeline);
  }
  async function start() {
    if(review) {
      const params=new URLSearchParams(location.search);
      if(params.has('PROLIFIC_PID') || params.has('participant')) throw new Error('Use the participant entry for participant sessions.');
      let saved=null;
      try{saved=JSON.parse(sessionStorage.getItem(storageKey+'-review'));}catch{}
      selected=core.validateAssignment(saved || core.assignment('thick'));
      sessionStorage.setItem(storageKey+'-review',JSON.stringify(selected));
      state={id:'review',consented:false,records:[],next:0,complete:false};
    } else {
      try {state=JSON.parse(localStorage.getItem(storageKey));}catch{}
      state ||= {id:crypto.randomUUID(),consented:false,records:[],next:0,complete:false};
      const result=await request('/api/factivity/assign',{session_id:state.id,study_version:config.studyVersion});
      selected=core.validateAssignment(result.assignment);
      if(state.assignment && JSON.stringify(state.assignment)!==JSON.stringify(selected)) throw new Error('The saved study assignment differs from the server. Please contact the researcher.');
      state.assignment=selected;persist();
    }
    globalThis.factivityStudy={review,assignment:selected,state,run,exportData,get screens(){return core.screens(selected);},get currentIndex(){return currentIndex;},
      setReviewAssignment(value){if(!review)throw new Error('Review only.');selected=core.validateAssignment(value);this.assignment=selected;sessionStorage.setItem(storageKey+'-review',JSON.stringify(selected));}};
    if(review) globalThis.dispatchEvent(new Event('factivity-ready'));else run(state.next);
  }
  start().catch(error=>{target.innerHTML=page(`<h1>Unable to open the study</h1><p class="error">${escape(error.message)}</p><p>Please reopen your study link or contact the researcher.</p>${review?'':'<p><a href="preview.html">Researcher preview</a></p>'}`);console.error(error);});
})();
