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

class FactivityTests(unittest.TestCase):
    def test_balanced_variants_in_both_conditions_and_separate_studies(self):
        with tempfile.TemporaryDirectory() as folder:
            store = server.Store(Path(folder) / 'factivity.sqlite3', server.FACTIVITY)
            ids = [str(uuid.uuid4()) for _ in range(80)]
            with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
                assignments = list(pool.map(store.allocate, ids))
            for condition in ('thick', 'thin'):
                group = [a for a in assignments if a['condition'] == condition]
                self.assertEqual(len(group), 40)
                for case, options in server.FACTIVITY['variants'].items():
                    counts = [sum(a['variants'][case] == variant for a in group) for variant in options]
                    self.assertLessEqual(max(counts) - min(counts), 1)
                for assignment in group:
                    self.assertEqual(set(assignment['case_order']), set(server.FACTIVITY['cases']))
                    self.assertEqual(set(assignment['sentence_order']), set(server.FACTIVITY['roles']))
            self.assertEqual(store.allocate(ids[0]), assignments[0])
            absence = server.Store(Path(folder) / 'absences.sqlite3')
            other = absence.allocate(ids[0])
            self.assertEqual(set(other['case_order']), set(server.CASES))
            with absence.connect() as db:
                self.assertEqual(db.execute('SELECT count(*) FROM sessions').fetchone()[0], 1)

    def test_twelve_ratings_and_version_isolation(self):
        with tempfile.TemporaryDirectory() as folder:
            store = server.Store(Path(folder) / 'factivity.sqlite3', server.FACTIVITY)
            session_id = str(uuid.uuid4())
            assignment = store.allocate(session_id)
            trials = [{'stage':'consent', 'consent':True}]
            for i, case in enumerate(assignment['case_order']):
                for j, role in enumerate(assignment['sentence_order']):
                    trials.append({'stage':'rating', 'case':case, 'role':role, 'case_position':i+1,
                        'sentence_position':j+1, 'condition':assignment['condition'],
                        'variant':assignment['variants'][case], 'rating':4, 'rt':900,
                        'review_mode':False, 'valid_participant_data':True})
            trials += [{'stage':'demographics'}, {'stage':'feedback'}]
            payload = {'session_id':session_id, 'assignment':assignment, 'study_version':server.FACTIVITY['version'],
                'review_mode':False, 'valid_participant_data':True, 'consented':True, 'complete':True, 'trials':trials}
            incomplete = json.loads(json.dumps(payload))
            incomplete['trials'].pop(1)
            with self.assertRaisesRegex(ValueError, '12 assigned ratings'):
                store.save(incomplete)
            wrong_version = dict(payload, study_version=server.VERSION)
            with self.assertRaises(ValueError):
                store.save(wrong_version)
            with self.assertRaises(ValueError):
                store.save(dict(payload, review_mode=True))
            store.save(payload)
            store.save(payload)
            with store.connect() as db:
                saved = json.loads(db.execute('SELECT payload FROM sessions WHERE session_id=?', (session_id,)).fetchone()[0])
                self.assertEqual(len([r for r in saved['trials'] if r['stage']=='rating']), 12)

class ChainsTests(unittest.TestCase):
    def test_concurrent_balance_and_study_isolation(self):
        with tempfile.TemporaryDirectory() as folder:
            store = server.Store(Path(folder) / 'chains.sqlite3', server.CHAINS)
            ids = [str(uuid.uuid4()) for _ in range(120)]
            with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
                assignments = list(pool.map(store.allocate, ids))
            for condition in ('thick', 'thin'):
                group = [a for a in assignments if a['condition'] == condition]
                self.assertEqual(len(group), 60)
                for case, options in server.CHAINS['variants'].items():
                    counts = [sum(a['variants'][case] == variant for a in group) for variant in options]
                    self.assertLessEqual(max(counts) - min(counts), 1)
                for assigned in group:
                    self.assertEqual(set(assigned['case_order']), set(server.CHAINS['cases']))
                    self.assertEqual(set(assigned['sentence_order']), set(server.CHAINS['roles']))
            self.assertEqual(store.allocate(ids[0]), assignments[0])
            for design in (server.ABSENCES, server.FACTIVITY):
                other = server.Store(Path(folder) / (design['version'] + '.sqlite3'), design)
                assigned = other.allocate(ids[0])
                self.assertEqual(set(assigned['case_order']), set(design['cases']))
                with other.connect() as db:
                    self.assertEqual(db.execute('SELECT count(*) FROM sessions').fetchone()[0], 1)

    def test_ordered_completion_and_retry_validation(self):
        with tempfile.TemporaryDirectory() as folder:
            store = server.Store(Path(folder) / 'chains.sqlite3', server.CHAINS)
            identity = str(uuid.uuid4())
            assigned = store.allocate(identity)
            trials = [{'stage':'consent', 'consent':True}]
            for i, case in enumerate(assigned['case_order']):
                for j, role in enumerate(assigned['sentence_order']):
                    trials.append({'stage':'rating', 'case':case, 'role':role, 'case_position':i+1,
                        'sentence_position':j+1, 'condition':assigned['condition'],
                        'variant':assigned['variants'][case], 'rating':4, 'rt':1000,
                        'review_mode':False, 'valid_participant_data':True})
            trials += [{'stage':'demographics'}, {'stage':'feedback'}]
            payload = {'session_id':identity, 'assignment':assigned, 'study_version':server.CHAINS['version'],
                'review_mode':False, 'valid_participant_data':True, 'consented':True, 'complete':True, 'trials':trials}
            bad = json.loads(json.dumps(payload))
            bad['trials'].pop(1)
            with self.assertRaisesRegex(ValueError, '16 assigned ratings'): store.save(bad)
            bad = json.loads(json.dumps(payload))
            bad['trials'][1], bad['trials'][2] = bad['trials'][2], bad['trials'][1]
            with self.assertRaises(ValueError): store.save(bad)
            with self.assertRaises(ValueError): store.save(dict(payload, study_version=server.FACTIVITY['version']))
            with self.assertRaises(ValueError): store.save(dict(payload, review_mode=True))
            store.save(payload)
            store.save(payload)
            with store.connect() as db:
                saved = json.loads(db.execute('SELECT payload FROM sessions WHERE session_id=?', (identity,)).fetchone()[0])
                self.assertEqual(len([r for r in saved['trials'] if r['stage']=='rating']),16)

if __name__ == '__main__':
    unittest.main()
