"""Local pilot server with atomic balanced allocation and completed-response storage.

Run from any directory: python3 tools/serve.py --port 8765
The default bind address is loopback; this is not a production deployment.
"""
import argparse
import json
import math
import random
import re
import sqlite3
import threading
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
VERSION = 'absences-english-1.0.0'
CASES = ['beach', 'driveway', 'rocket', 'cellar']
VARIANTS = {'beach': ['change', 'dry_out'], 'driveway': ['weaken', 'degrade'], 'rocket': ['activate'], 'cellar': ['increase', 'dampen']}
ROLES = ['absence_cause', 'absence_lexical', 'direct_cause', 'direct_lexical']
RANDOM = random.SystemRandom()

class Store:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS sessions (session_id TEXT PRIMARY KEY, assignment TEXT NOT NULL, created_at TEXT NOT NULL, completed_at TEXT, payload TEXT)')

    def connect(self):
        return sqlite3.connect(self.path, timeout=30)

    def allocate(self, session_id):
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            existing = db.execute('SELECT assignment FROM sessions WHERE session_id=?', (session_id,)).fetchone()
            if existing:
                return json.loads(existing[0])
            assigned = [json.loads(row[0]) for row in db.execute('SELECT assignment FROM sessions')]
            counts = {c: sum(a['condition'] == c for a in assigned) for c in ('thick', 'thin')}
            minimum = min(counts.values())
            condition = RANDOM.choice([c for c in counts if counts[c] == minimum])
            thin = [a for a in assigned if a['condition'] == 'thin']
            variants = {}
            for name, options in VARIANTS.items():
                if condition == 'thick':
                    variants[name] = options[0]
                    continue
                counts = {v: sum(a['variants'][name] == v for a in thin) for v in options}
                minimum = min(counts.values())
                variants[name] = RANDOM.choice([v for v in counts if counts[v] == minimum])
            case_order, sentence_order = list(CASES), list(ROLES)
            RANDOM.shuffle(case_order)
            RANDOM.shuffle(sentence_order)
            assignment = {'condition': condition, 'variants': variants, 'case_order': case_order, 'sentence_order': sentence_order}
            db.execute('INSERT INTO sessions(session_id,assignment,created_at) VALUES(?,?,?)',
                       (session_id, json.dumps(assignment), datetime.now(timezone.utc).isoformat()))
            return assignment

    def save(self, payload):
        if payload.get('review_mode') is not False or payload.get('valid_participant_data') is not True:
            raise ValueError('Review responses cannot be saved as participant data.')
        if payload.get('study_version') != VERSION or payload.get('consented') is not True or payload.get('complete') is not True:
            raise ValueError('Consent and a complete, current study are required.')
        with self.connect() as db:
            row = db.execute('SELECT assignment,payload FROM sessions WHERE session_id=?', (payload.get('session_id'),)).fetchone()
            if not row:
                raise ValueError('Unknown session.')
            assignment = json.loads(row[0])
            if payload.get('assignment') != assignment:
                raise ValueError('Assignment does not match the session.')
            trials = payload.get('trials')
            if not isinstance(trials, list):
                raise ValueError('Missing study responses.')
            ratings = [r for r in trials if r.get('stage') == 'rating']
            expected = [(case, role, case_index+1, role_index+1)
                        for case_index, case in enumerate(assignment['case_order'])
                        for role_index, role in enumerate(assignment['sentence_order'])]
            actual = [(r.get('case'), r.get('role'), r.get('case_position'), r.get('sentence_position')) for r in ratings]
            if actual != expected:
                raise ValueError('Exactly the 16 assigned ratings must be completed in order.')
            for rating in ratings:
                value, rt = rating.get('rating'), rating.get('rt')
                if type(value) is not int or not 1 <= value <= 7:
                    raise ValueError('Every naturalness rating must be an integer from 1 to 7.')
                if type(rt) not in (int, float) or not math.isfinite(rt) or rt < 0:
                    raise ValueError('Invalid response time.')
                if (rating.get('condition') != assignment['condition'] or
                    rating.get('variant') != assignment['variants'][rating['case']] or
                    rating.get('review_mode') is not False or rating.get('valid_participant_data') is not True):
                    raise ValueError('Rating assignment mismatch.')
            if not any(r.get('stage') == 'consent' and r.get('consent') is True for r in trials):
                raise ValueError('Missing consent record.')
            if not any(r.get('stage') == 'demographics' for r in trials) or not any(r.get('stage') == 'feedback' for r in trials):
                raise ValueError('The final study screens must be completed.')
            if row[1]:
                if json.loads(row[1]) != payload:
                    raise ValueError('This completed session has already been saved with different responses.')
                return
            db.execute('UPDATE sessions SET payload=?,completed_at=? WHERE session_id=?',
                       (json.dumps(payload, ensure_ascii=False), datetime.now(timezone.utc).isoformat(), payload['session_id']))

def handler(store):
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(ROOT), **kwargs)

        def log_message(self, format, *args):
            # Do not include URL parameters or session identifiers in access logs.
            pass

        def do_GET(self):
            path = unquote(urlsplit(self.path).path)
            if path == '/':
                self.send_response(302)
                self.send_header('Location', '/Pilots/Absences/preview.html')
                self.end_headers()
                return
            resolved = Path(self.translate_path(path)).resolve()
            public = ROOT / 'Pilots' / 'Absences'
            if not resolved.is_relative_to(public) or not resolved.is_file():
                self.send_error(404)
                return
            super().do_GET()

        def do_HEAD(self):
            self.do_GET()

        def end_headers(self):
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            super().end_headers()

        def respond(self, status, value):
            encoded = json.dumps(value).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)

        def do_POST(self):
            try:
                size = int(self.headers.get('Content-Length', '0'))
                if not 0 < size <= 1_000_000:
                    raise ValueError('Invalid request size.')
                body = json.loads(self.rfile.read(size))
                if not isinstance(body, dict):
                    raise ValueError('Invalid request.')
                session_id = body.get('session_id', '')
                if not isinstance(session_id, str) or not re.fullmatch(r'[a-f0-9-]{36}', session_id):
                    raise ValueError('Invalid session identifier.')
                if self.path == '/api/assign':
                    if body.get('study_version') != VERSION:
                        raise ValueError('Study version mismatch.')
                    self.respond(200, {'assignment': store.allocate(session_id)})
                elif self.path == '/api/save':
                    store.save(body)
                    self.respond(200, {'saved': True})
                else:
                    self.respond(404, {'error': 'Unknown endpoint.'})
            except (ValueError, KeyError, TypeError) as error:
                self.respond(400, {'error': str(error)})
            except Exception:
                self.respond(500, {'error': 'Unable to save or load this session. Please retry.'})
    return Handler

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--bind', default='127.0.0.1')
    parser.add_argument('--database', type=Path, default=ROOT / 'data/absences.sqlite3')
    args = parser.parse_args()
    server = ThreadingHTTPServer((args.bind, args.port), handler(Store(args.database)))
    print(f'Researcher review: http://{args.bind}:{args.port}/Pilots/Absences/preview.html', flush=True)
    print(f'Participant entry: http://{args.bind}:{args.port}/Pilots/Absences/index.html', flush=True)
    print(f'Local database: {args.database}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()

if __name__ == '__main__':
    main()
