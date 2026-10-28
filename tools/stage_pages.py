"""Stage only static study assets for GitHub Pages; exclude data and tooling."""
from pathlib import Path
import shutil, subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist/pages'
OUT.mkdir(parents=True,exist_ok=True)
for relative in ['index.html','review.css']:
    shutil.copyfile(ROOT/relative,OUT/relative)
for source in (ROOT/'Pilots').rglob('*'):
    if not source.is_file() or source.suffix not in {'.html','.js','.css','.json','.md'}:continue
    if source.is_symlink():raise ValueError('Unexpected symlink')
    target=OUT/source.relative_to(ROOT);target.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(source,target)
(OUT/'.nojekyll').write_text('')
subprocess.run([sys.executable,str(ROOT/'tools/package_review.py'),'--output',str(OUT/'dist/causal-verbs-pilots-review.zip')],check=True)
print('Static Pages site staged at '+str(OUT))
