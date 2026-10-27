import concurrent.futures
import importlib.util
import json
import tempfile
import unittest
import uuid
from pathlib import Path

spec = importlib.util.spec_from_file_location('pilot_server', Path(__file__).resolve().parents[1] / 'tools/serve.py')
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)

class AllocationTests(unittest.TestCase):
    def test_atomic_balance_and_stable_reloads(self):
        with tempfile.TemporaryDirectory() as folder:
            store = server.Store(Path(folder) / 'test.sqlite3')
            ids = [str(uuid.uuid4()) for _ in range(80)]
            with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
                assignments = list(pool.map(store.allocate, ids))
            self.assertEqual(sum(a['condition'] == 'thin' for a in assignments), 40)
            for case, options in server.VARIANTS.items():
                counts = [sum(a['condition']=='thin' and a['variants'][case]==v for a in assignments) for v in options]
                self.assertLessEqual(max(counts)-min(counts), 1)
            self.assertEqual(store.allocate(ids[0]), assignments[0])

    def test_reject_review_missing_and_duplicate_ratings(self):
        with tempfile.TemporaryDirectory() as folder:
            store = server.Store(Path(folder) / 'test.sqlite3')
            identity = str(uuid.uuid4())
            assignment = store.allocate(identity)
            payload = {'session_id':identity, 'assignment':assignment, 'study_version':server.VERSION,
                       'review_mode':False, 'valid_participant_data':True, 'consented':True, 'complete':True,
                       'trials':[{'stage':'consent','consent':True}]}
            with self.assertRaises(ValueError): store.save(payload)
            ratings = []
            for i, case in enumerate(assignment['case_order']):
                for j, role in enumerate(assignment['sentence_order']):
                    ratings.append({'stage':'rating','case':case,'role':role,'case_position':i+1,'sentence_position':j+1,
                                    'condition':assignment['condition'],'variant':assignment['variants'][case],
                                    'rating':4,'rt':1200,'review_mode':False,'valid_participant_data':True})
            payload['trials'] += ratings + [{'stage':'demographics'},{'stage':'feedback'}]
            store.save(payload)
            store.save(payload)  # Idempotent retry must work.
            bad = json.loads(json.dumps(payload))
            bad['review_mode'] = True
            with self.assertRaises(ValueError): store.save(bad)
            bad = json.loads(json.dumps(payload))
            bad['trials'][2] = bad['trials'][1]
            with self.assertRaises(ValueError): store.save(bad)

if __name__ == '__main__':
    unittest.main()
