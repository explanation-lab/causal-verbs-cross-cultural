"""Read English omission or factivity rows without modifying the workbook."""
import argparse
import hashlib
import json
from pathlib import Path
import openpyxl

parser = argparse.ArgumentParser()
parser.add_argument('workbook', type=Path)
parser.add_argument('--study', choices=('omission', 'fact'), default='omission')
args = parser.parse_args()
workbook = openpyxl.load_workbook(args.workbook, read_only=True, data_only=True)
rows = list(workbook['English source'].values)
records = [dict(zip(rows[0], row[:13]), source_row=index) for index, row in enumerate(rows, 1)]
selected = [r for r in records if r['Study'] == args.study and r['Thin-pair type'] == 'alternating']
cases = []
for case, variant in dict.fromkeys((r['Case'], r['Variant']) for r in selected):
    group = [r for r in selected if r['Case'] == case and r['Variant'] == variant]
    fields = {r['Variable / field']: r for r in group if r['Type'] == 'case_component'}
    targets = {}
    for r in group:
        if r['Type'] != 'target' or r['Construction'] not in ('cause', 'lexical'):
            continue
        key = '_'.join([r['Candidate'], r['Construction'], r['Predicate']])
        original = r['English source']
        text = original
        if args.study == 'omission' and case == 'cellar' and variant == 'increase' and r['Predicate'] == 'thin':
            text = text.replace('the humidity/the level of water', 'the level of water')
            text = text.replace('the humidity', 'the level of water')
        targets[key] = {'text': text, 'source_text': original, 'source_row': r['source_row'], 'row_key': r['row_key']}
    cases.append({'case': case, 'variant': variant,
        'setup': fields['case_setup']['English source'],
        'endings': {p: fields['ending_single_' + p]['English source'] for p in ('thick', 'thin')},
        'source_rows': {name: row['source_row'] for name, row in fields.items() if name in ('case_setup', 'ending_single_thick', 'ending_single_thin')},
        'targets': targets})
shared = {r['Variable / field']: r['English source'] for r in records if r['Study'] == 'shared'}
output = {'source': {'file': args.workbook.name, 'sha256': hashlib.sha256(args.workbook.read_bytes()).hexdigest(),
        'sheet': 'English source', 'filter': {'Study': args.study, 'Thin-pair type': 'alternating'},
        'edits': ['English cellar/increase thin targets consistently use the level of water. Source workbook and other languages are unchanged.'] if args.study == 'omission' else []},
    'shared': shared, 'cases': cases}
pilot = 'Absences' if args.study == 'omission' else 'Factivity'
namespace = 'AbsenceMaterials' if args.study == 'omission' else 'FactivityMaterials'
destination = Path(__file__).resolve().parents[1] / f'Pilots/{pilot}/js/materials.js'
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text('// Generated from English source; see tools/extract_materials.py.\n'
    + '(function(root){const materials = ' + json.dumps(output, ensure_ascii=False, indent=2)
    + f'; if(typeof module!=="undefined"&&module.exports)module.exports=materials;else root.{namespace}=materials;}})(globalThis);\n')
print(f'Extracted {len(cases)} English case variants; workbook unchanged.')
