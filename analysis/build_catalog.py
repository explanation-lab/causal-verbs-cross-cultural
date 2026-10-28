"""Build public analysis metadata from the frozen pilot materials, not responses."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'analysis/config'
SPEC = {
    'Absences': [
        ('beach', 'change', 'Beach change', 'change', 'burn'),
        ('beach', 'dry_out', 'Beach dry out', 'dry out', 'burn'),
        ('driveway', 'weaken', 'Driveway weaken', 'weaken', 'crack'),
        ('driveway', 'degrade', 'Driveway degrade', 'degrade', 'crack'),
        ('rocket', 'activate', 'Rocket activate', 'activate', 'melt'),
        ('cellar', 'increase', 'Cellar increase water level', 'increase water level', 'flood'),
        ('cellar', 'dampen', 'Cellar dampen', 'dampen', 'flood'),
    ],
    'Factivity': [
        ('sewer_system', 'stop_working', 'Sewer system stop working', 'stop working', 'flood'),
        ('phone', 'die_kill', 'Phone app and software defect', 'die / kill', 'heat up'),
        ('phone', 'turn_off', 'Phone texting and manufacturing defect', 'turn off', 'heat up'),
        ('scooter', 'stop', 'Scooter stop', 'stop', 'crash'),
        ('scooter', 'power_down', 'Scooter power down', 'power down', 'crash'),
        ('scooter', 'disconnect_battery', 'Scooter disconnect from battery', 'disconnect: battery', 'crash'),
        ('scooter', 'disconnect_network', 'Scooter disconnect from rental network', 'disconnect: rental network', 'crash'),
    ],
    'Chains': [
        ('frame', 'deform', 'Painting frame deform', 'deform', 'crack'),
        ('frame', 'loosen', 'Painting frame loosen', 'loosen', 'crack'),
        ('railing', 'detach', 'Railing detach', 'detach', 'break'),
        ('railing', 'separate', 'Railing separate', 'separate', 'break'),
        ('street_sign', 'activate_beacon', 'Roadside object activate beacon', 'activate beacon', 'bend'),
        ('street_sign', 'disconnect_beacon', 'Roadside object disconnect beacon', 'disconnect beacon', 'bend'),
        ('street_sign', 'disconnect_sign', 'Roadside object disconnect sign', 'disconnect sign', 'bend'),
        ('wine', 'empty_glass', 'Wine empty glass', 'empty glass', 'spill'),
        ('wine', 'decrease_glass_amount', 'Wine decrease amount in glass', 'decrease amount in glass', 'spill'),
        ('wine', 'decrease_party_supply', 'Wine decrease party supply', 'decrease party supply', 'spill'),
    ],
}
DOCS = {
    'Absences': ('CAUSAL-VERBS-ABSENCES-PILOT-WNJ4', '1ycMkzgoRYXODO7MbfmzzrLWd3gPciFkSeyUyaJBQ9KM'),
    'Factivity': ('CAUSAL-VERBS-FACTIVITY-PILOT-ESBT', '1fzADX1Wqx7z9KtDTh-fY845VSUWhwxykWHLNLK91LiE'),
    'Chains': ('CAUSAL-VERBS-CHAINS-PILOT-JBXE', '16ljBHnv3Tt-8j9iZkSsjKSUCWsC9cNDgU0SyamtAXD8'),
}
THICK_HEADINGS = {
    ('Absences', 'beach', 'change'): 'Beach | burn',
    ('Absences', 'driveway', 'weaken'): 'Driveway | crack',
    ('Absences', 'rocket', 'activate'): 'Rocket | melt',
    ('Absences', 'cellar', 'increase'): 'Cellar: storm | flood',
    ('Factivity', 'sewer_system', 'stop_working'): 'Sewer system | flood',
    ('Factivity', 'phone', 'die_kill'): 'Phone: app / software defect | heat up',
    ('Factivity', 'phone', 'turn_off'): 'Phone: texting / manufacturing defect | heat up',
    ('Factivity', 'scooter', 'stop'): 'Scooter: mountain road | crash',
    ('Factivity', 'scooter', 'disconnect_network'): 'Scooter: rental / mountain road | crash',
    ('Chains', 'frame', 'deform'): 'Painting frame | crack',
    ('Chains', 'railing', 'detach'): 'Railing | break',
    ('Chains', 'street_sign', 'activate_beacon'): 'Hazard beacon | bend',
    ('Chains', 'street_sign', 'disconnect_sign'): 'Electronic road sign | bend',
    ('Chains', 'wine', 'empty_glass'): 'Wine: held wine spills | spill',
    ('Chains', 'wine', 'decrease_glass_amount'): 'Wine: wine spills | spill',
    ('Chains', 'wine', 'decrease_party_supply'): 'Wine: party supply spills | spill',
}


def signature(c):
    return [c['setup'], c['endings']['thick'],
            {k: v['text'] for k, v in c['targets'].items() if k.endswith('_thick')}]


def write(name, rows):
    with (DEST / name).open('w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]), lineterminator='\n')
        w.writeheader()
        w.writerows(rows)


def main():
    DEST.mkdir(exist_ok=True)
    versions, targets, allocation, studies = [], [], [], []
    for study, specs in SPEC.items():
        raw = (ROOT / f'Pilots/{study}/collection/js/materials.js').read_text()
        material = json.JSONDecoder().raw_decode(raw[raw.index('{', raw.index('const materials =')):])[0]
        cells = json.loads((ROOT / f'Pilots/{study}/collection/allocation.json').read_text())['cells']
        cases = {(c['case'], c['variant']): c for c in material['cases']}
        assert set(cases) == {(s[0], s[1]) for s in specs}
        studies.append(dict(study=study, study_id=DOCS[study][0], document_id=DOCS[study][1],
                            expected_ratings=len(next(iter(cells.values()))['variants']) * 4))
        for code, cell in cells.items():
            for family, variant in cell['variants'].items():
                allocation.append(dict(study=study, condition=code, verb_condition=cell['verb_condition'],
                                       target=cell['target'], case=family, variant=variant))
        for family, variant, heading, thin_label, thick_label in specs:
            c = cases[family, variant]
            collected = list(dict.fromkeys(cell['variants'][family] for cell in cells.values()
                                          if cell['verb_condition'] == 'thick'))
            matches = [v for v in collected if signature(cases[family, v]) == signature(c)]
            if not matches:
                assert (study, family, variant) == ('Absences', 'cellar', 'dampen')
            thick = matches[0] if matches else collected[0]
            versions.append(dict(study=study, case=family, variant=variant, doc_heading=heading,
                                 thin_label=thin_label, thick_label=thick_label,
                                 thick_variant=thick, context_match=bool(matches),
                                 thick_heading=THICK_HEADINGS[study, family, thick],
                                 comparison_note='' if matches else
                                 'Different story setups: thick uses a huge storm; thin uses several days of rain.'))
            for key, target in c['targets'].items():
                role, verb_condition = key.rsplit('_', 1)
                candidate, construction = role.rsplit('_', 1)
                targets.append(dict(study=study, case=family, variant=variant, verb_condition=verb_condition,
                                    role=role, candidate=candidate, construction=construction,
                                    story_setup=c['setup'], story_ending=c['endings'][verb_condition],
                                    sentence=target['text'], source_row=target['source_row'],
                                    source_row_key=target['row_key']))
    write('versions.csv', versions)
    write('targets.csv', targets)
    write('allocation.csv', allocation)
    write('studies.csv', studies)
    print(f'Wrote {len(versions)} comparisons, {len(targets)} target records, and {len(allocation)} allocation records.')


if __name__ == '__main__':
    main()
