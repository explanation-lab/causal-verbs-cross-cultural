# Causal Verbs Cross-Cultural

English pilots for comparing thick causal verbs with alternating thin verbs.

Implemented pilots are **Pilots/Absences**, **Pilots/Factivity**, and **Pilots/Chains**.

## Open the review hub

From the repository root, run:

```sh
python3 tools/serve.py --port 8765
```

Open the [main review page](http://127.0.0.1:8765/). It links to all three pilots and explains the alternative materials. Every pilot has persistent All pilots / Absences / Factivity / Chains navigation above the review controls.

Open [Absences researcher review](http://127.0.0.1:8765/Pilots/Absences/preview.html).
The [participant entry](http://127.0.0.1:8765/Pilots/Absences/index.html) uses the local allocation and response service.

The [Factivity review](http://127.0.0.1:8765/Pilots/Factivity/preview.html) and [Factivity participant entry](http://127.0.0.1:8765/Pilots/Factivity/index.html) run on the same server with separate assignments and response storage. See [Factivity design and operation notes](Pilots/Factivity/README.md).

The [Chains review](http://127.0.0.1:8765/Pilots/Chains/preview.html) and [Chains participant entry](http://127.0.0.1:8765/Pilots/Chains/index.html) also run on this server with their own assignments and data. See [Chains design and operation notes](Pilots/Chains/README.md).

The preview also works on an ordinary static HTTP server. The participant entry requires `tools/serve.py`; it does not silently collect unsaved responses on static hosting.

The repository is public and the review hub is hosted on [GitHub Pages](https://explanation-lab.github.io/causal-verbs-cross-cultural/). Separate `collection/` entries are registered in the Study Console and remain in Sandbox testing. See [Console setup and handoff](CONSOLE_PILOTS.md) for allocation targets, validation, and the remaining Prolific steps. No recruitment has been launched.

See [the Absences design and operation notes](Pilots/Absences/README.md) for materials, allocation, consent, data, and checks.

## Share a review ZIP

```sh
python3 tools/package_review.py
```

This creates `dist/causal-verbs-pilots-review.zip`. Its top level contains `index.html`: collaborators extract all files and double-click that file to open the hub. The package includes all review pages, scripts, styles, fonts and third-party notices, with no installation or server required. It excludes participant entries, data, the source workbook, Git history and development tools. `READ_ME_FIRST.txt` gives brief opening instructions. A manifest records file hashes and the source revision.

The package builder verifies every local HTML link, script and stylesheet reference and tests ZIP integrity. Run `node tests/review-portability.cjs` to check that all three review runtimes tolerate unavailable browser storage and preserve review assignments through local-file navigation. For file URLs, assignments travel in the review URL if storage is restricted. Participant behavior and data submission are unchanged.
