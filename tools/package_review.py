"""Build an offline, review-only ZIP with index.html at the archive root."""
import argparse
import hashlib
import json
import re
import subprocess
import zipfile
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PILOTS = ('Absences', 'Factivity', 'Chains')
README = '''CAUSAL VERBS: PILOT REVIEW

1. Extract ALL files from the ZIP into a folder.
2. Double-click index.html in that folder to open the review hub.
3. Open a pilot. Use the review panel to change condition, select story versions,
   or jump to any story or question. Use All pilots to return to the hub.

No installation, local server, or internet connection is needed to review.
Use a current browser with JavaScript enabled. Keep the extracted files together.
The review package does not submit responses or contain participant data.

We are trying alternative thin verbs and story contexts to select the final
materials. Please flag awkward wording, unclear outcomes, and alternatives
that seem to work better.
'''

class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []

    def handle_starttag(self, tag, attrs):
        self.links.extend(value for key, value in attrs if key in ('href', 'src') and value)

def collect():
    files = {}
    # No participant entries, databases, source workbook, tools or Git history.
    hub = (ROOT / 'index.html').read_text()
    hub = re.sub(r'\s*<p id="zip-download">.*?</p>', '', hub, flags=re.S)
    files['index.html'] = hub.encode()
    files['review.css'] = (ROOT / 'review.css').read_bytes()
    for pilot in PILOTS:
        names = ['preview.html', 'css/study.css'] + [f'js/{name}.js' for name in ('config', 'core', 'materials', 'study', 'review')]
        for name in names:
            relative = f'Pilots/{pilot}/{name}'
            files[relative] = (ROOT / relative).read_bytes()
    for name in ('jspsych-7.3.4.js', 'plugin-html-button-response-1.1.3.js', 'jspsych-7.3.4.css', 'THIRD_PARTY_NOTICES.md'):
        relative = f'Pilots/Absences/vendor/{name}'
        files[relative] = (ROOT / relative).read_bytes()
    files['READ_ME_FIRST.txt'] = README.encode()
    return files

def validate(files):
    for name, data in files.items():
        if not name.endswith('.html'):
            continue
        parser = References()
        parser.feed(data.decode())
        for link in parser.links:
            url = urlsplit(link)
            if url.scheme or url.netloc or not url.path:
                continue
            parts = []
            for part in (PurePosixPath(name).parent / unquote(url.path)).parts:
                if part == '..':
                    if not parts:
                        raise ValueError(f'Link escapes package: {name}: {link}')
                    parts.pop()
                elif part != '.':
                    parts.append(part)
            target = '/'.join(parts)
            if target not in files:
                raise ValueError(f'Broken package link: {name}: {link}')
    for pilot in PILOTS:
        page = files[f'Pilots/{pilot}/preview.html'].decode()
        if '_REVIEW=true' not in page:
            raise ValueError('Preview is not explicitly review-only: ' + pilot)
    if any('/index.html' in name or name.startswith(('data/', '.git/', 'tools/')) or name.endswith(('.sqlite3', '.xlsx')) for name in files):
        raise ValueError('Unexpected participant entry or private source in review package.')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'dist/causal-verbs-pilots-review.zip')
    parser.add_argument('--unpack-to', type=Path)
    args = parser.parse_args()
    files = collect()
    validate(files)
    revision = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT, text=True, capture_output=True)
    files['package-manifest.json'] = json.dumps({
        'built_at_utc': datetime.now(timezone.utc).isoformat(),
        'source_revision': revision.stdout.strip() if revision.returncode == 0 else None,
        'entry_point': 'index.html', 'review_only': True,
        'files': {name: hashlib.sha256(data).hexdigest() for name, data in sorted(files.items())}
    }, indent=2).encode()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for name, data in sorted(files.items()):
            archive.writestr(name, data)
    with zipfile.ZipFile(args.output) as archive:
        if archive.testzip() is not None:
            raise ValueError('ZIP integrity check failed.')
        if args.unpack_to:
            if args.unpack_to.exists():
                raise ValueError('Unpack destination already exists; choose a new folder.')
            archive.extractall(args.unpack_to)
    print(f'Created {args.output} ({args.output.stat().st_size:,} bytes; {len(files)} files).')
    print('Entry point: index.html at ZIP root. All local page/script/style links verified.')

if __name__ == '__main__':
    main()
