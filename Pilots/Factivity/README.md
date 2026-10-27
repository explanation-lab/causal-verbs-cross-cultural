# Factivity: English pilot

This pilot uses the approved Absences layout and researcher review panel, with fact-denoting subjects replacing omission subjects.

## Design

Two between-participant conditions: **thick** and **thin**. Every participant receives three distinct scenarios, in randomized order, with four naturalness ratings per story: **12 ratings total**.

| Scenario | Sampled versions in both conditions | Thick outcome | Thin outcome |
| --- | --- | --- | --- |
| Sewer system | One storm story | Flooded | Stopped working |
| Phone | App/software defect | Heats up | Dies |
| Phone | Texting/manufacturing defect | Heats up | Turns off |
| Scooter | Stop | Crashes | Stops |
| Scooter | Power down | Crashes | Powers down |
| Scooter | Disconnect from battery | Crashes | Disconnects from its battery |
| Scooter | Disconnect from rental network | Crashes | Disconnects from the rental network |

Each person sees the sewer story, one phone version and one scooter version. Phone variants are balanced 50/50 within each condition; scooter variants are balanced 25% each. Assignments are randomized among the least allocated options within a SQLite transaction. This balances assigned sessions; completion counts can differ after withdrawal.

Both phone contexts are retained in both conditions. The app version keeps the software defect and running-the-app subjects. The texting version keeps the manufacturing defect and Suzy's texting subjects. The rental-network scooter version retains the rental setup. A thick participant receives the corresponding setup with its thick single-outcome ending and thick targets.

The four sentence roles are fact-denoting subject/cause construction, fact-denoting subject/lexical construction, direct cause/cause construction and direct cause/lexical construction. Their order is shuffled once per participant and reused for all three stories. The naturalness scale is 1 “Very unnatural” through 7 “Very natural”.

## Approved wording

All factivity setups, single endings and targets are copied verbatim from the workbook's **English source** sheet, filtered to `Study = fact` and `Thin-pair type = alternating`. The generated `js/materials.js` includes original target text, row keys, source row numbers and workbook SHA-256. No translations or workbook cells are changed.

- Keep **die/kill** and **stop working/stop** as written.
- Battery and rental-network disconnection are separate story versions.
- Keep the workbook's **generic disconnect targets** in both disconnection versions. Do not add “from its battery” or “from the rental network” to the four target sentences. The story ending supplies that context.
- Use only the assigned single outcome. Do not show dual outcomes, make constructions or agreement questions.

Regenerate using Python with openpyxl available:

```sh
python3 tools/extract_materials.py "/path/to/Cross-cultural translation master.xlsx" --study fact
```

## Screens and researcher review

Consent uses the same blue outlined card and consent text as Absences. Instructions and buttons are centered, with “Begin” and “Continue” labels and the shared button hover treatment. The story stays in its rounded card. Participants preview all four sentences in numbered tiles, then rate one sentence at a time in a stationary question card of matching width. The naturalness question appears above the bold target sentence and scale. The preview reading instruction disappears during ratings; story and sentence counters are not shown. Demographics/language background and feedback follow the three stories.

`preview.html` has the same panel controls as Absences. Phone and scooter selectors are enabled in **both** thick and thin conditions. Researchers can jump to any story, preview or rating, change condition or source version, shuffle sentence order, generate new review assignments and download review responses. Review data is tab-local, labeled as invalid participant data, and never sent to allocation or save endpoints.

The layout CSS is copied exactly from the approved Absences build; jsPsych 7.3.4 and its button-response plugin are loaded from the repository's existing `Pilots/Absences/vendor/` files. Factivity's materials, design logic, runtime namespace, review storage and participant storage are separate.

## Run and export

From the repository root:

```sh
python3 tools/serve.py --port 8765
```

- [Researcher review](http://127.0.0.1:8765/Pilots/Factivity/preview.html)
- [Participant entry](http://127.0.0.1:8765/Pilots/Factivity/index.html)

The server retains the existing Absences routes and adds `/api/factivity/assign` and `/api/factivity/save`. Factivity uses `data/factivity.sqlite3`, separately from `data/absences.sqlite3`. Both are excluded from Git. Browser storage is namespaced by pilot and version. Reloading returns the same assignment and resumes completed screens. Completion saves require consent and exactly the 12 assigned ratings in order, and can be retried safely.

```sh
python3 tools/export_data.py --study factivity
```

Exports go to `data/exports/factivity-completed.json` and `data/exports/factivity-ratings.csv`. JSON includes all records; CSV has one row per rating, including condition, source version, story and sentence order, candidate, construction, source row/key, target text, rating and response time.

The blue consent form and preliminary participation terms are copied from Absences, including its Tort Cognition source attribution. Payment/duration should match the eventual recruitment listing. This is a local review build; recruitment and public deployment are not configured.

## Checks

```sh
node tests/core.cjs
node tests/factivity.cjs
python3 -m unittest discover -s tests -p '*_test.py'
```

These check the existing Absences design, both Factivity conditions and all eight phone/scooter combinations, source wording and generic disconnection targets, matching layout CSS, concurrent allocation balance, 12-rating completion, version separation and retry handling. Use separate QA database paths with `--database` and `--factivity-database` for synthetic browser runs.
