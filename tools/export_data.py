"""Export completed Absences records from the local pilot database."""
import argparse
import csv
import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--database', type=Path, default=ROOT / 'data/absences.sqlite3')
parser.add_argument('--output', type=Path, default=ROOT / 'data/exports')
args = parser.parse_args()
if not args.database.is_file():
    parser.error('Database does not exist.')
with sqlite3.connect(f'file:{args.database}?mode=ro', uri=True) as db:
    records = [json.loads(row[0]) for row in db.execute('SELECT payload FROM sessions WHERE completed_at IS NOT NULL ORDER BY created_at')]
args.output.mkdir(parents=True, exist_ok=True)
(args.output / 'absences-completed.json').write_text(json.dumps(records, ensure_ascii=False, indent=2))
fields = ['session_id','condition','case','variant','case_position','sentence_position','role','candidate','construction',
          'sentence','story_setup','story_ending','source_row','source_row_key','rating','rt','study_version']
with (args.output / 'absences-ratings.csv').open('w', newline='') as output:
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction='ignore')
    writer.writeheader()
    for record in records:
        for trial in record['trials']:
            if trial.get('stage') == 'rating':
                writer.writerow(dict(trial, session_id=record['session_id'], condition=record['assignment']['condition'], study_version=record['study_version']))
print(f'Exported {len(records)} complete sessions to {args.output}')
