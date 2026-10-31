"""Validate an actual Console Sandbox export against the accuracy pilot source."""
import csv
import io
import json
from pathlib import Path
import sys
import zipfile
from collections import Counter

ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/'Pilots/FactivityAccuracy'
source=(DIR/'js/materials.js').read_text()
materials=json.JSONDecoder().raw_decode(source[source.index('{\n'):])[0]
catalog={(c['case'],c['variant']):c for c in materials['cases']}
allocation=json.loads((DIR/'collection/allocation.json').read_text())
with zipfile.ZipFile(sys.argv[1]) as z:
    raw=json.loads(z.read('raw-submissions.json'))
    manifest=json.loads(z.read('manifest.json'))
    responses=list(csv.DictReader(io.StringIO(z.read('responses.csv').decode('utf-8-sig'))))
    demographics=list(csv.DictReader(io.StringIO(z.read('demographics.csv').decode('utf-8-sig'))))
assert len(raw)==28 and manifest['mode']=='sandbox'
assert Counter(s['condition'] for s in raw)==Counter({c:1 for c in allocation['cells']})
for submission in raw:
    assert submission['mode']=='sandbox'
    code=submission['condition']; cell=allocation['cells'][code]
    meta=submission['metadata']; rows=submission['trials']
    assert meta['conditionVerification']['status']=='matched'
    assert meta['assigned_variants']==cell['variants']
    assert meta['verb_condition']==cell['verb_condition']
    assert meta['experimentVersion']=='factivity-accuracy-english-console-2.0.0'
    assert meta['materials_sha256']==materials['source']['sha256']
    assert len(rows)==22 and sorted(r['screen_index'] for r in rows)==list(range(22))
    ratings=[r for r in rows if r['stage']=='rating']
    assert len(ratings)==12
    assert Counter(r['case'] for r in ratings)==Counter({'sewer_system':4,'phone':4,'scooter':4})
    assert sorted(meta['case_order'])==['phone','scooter','sewer_system']
    assert sorted(meta['sentence_order'])==['direct_cause','direct_lexical','fact_cause','fact_lexical']
    assert next(r for r in rows if r['stage']=='demographics')['age']==31
    for i,r in enumerate(ratings):
        family=meta['case_order'][i//4]; role=meta['sentence_order'][i%4]
        item=catalog[family,cell['variants'][family]]
        target=item['targets'][role+'_'+cell['verb_condition']]
        assert r['condition']==code and r['verb_condition']==cell['verb_condition']
        assert r['case']==family and r['role']==role and r['variant']==cell['variants'][family]
        assert r['case_position']==i//4+1 and r['sentence_position']==i%4+1
        assert r['story_setup']==item['setup'] and r['story_ending']==item['endings'][cell['verb_condition']]
        assert r['sentence']==target['text'] and r['source_row']==target['source_row'] and r['source_row_key']==target['row_key']
        assert r['measure']=='accuracy' and r['probe_id']=='english-learner-cause-and-burn'
        assert r['rating_scale_min']==1 and r['rating_scale_max']==7
        assert r['rating_scale_anchors']==['Completely inaccurate','Completely accurate']
        assert type(r['rating'])==int and 1<=r['rating']<=7
        assert r['review_mode'] is False and r['trial_role']=='response'
        assert r['rt']>=0
csv_ratings=[r for r in responses if r['trial_role']=='response']
assert len(csv_ratings)==336 and len(responses)==588 and len(demographics)==28
assert Counter(r['condition'] for r in csv_ratings)==Counter({c:12 for c in allocation['cells']})
for r in csv_ratings:
    assert r['measure']=='accuracy' and r['mode']=='sandbox' and r['condition_verification']=='matched'
assert {r['age'] for r in demographics}=={'31'}
print(json.dumps({'sandbox_submissions':len(raw),'matched_groups':28,'raw_trials':sum(len(s['trials']) for s in raw),'ratings':len(csv_ratings),'demographic_rows':len(demographics),'all_materials_scales_orders_and_resume_verified':True},indent=2))
