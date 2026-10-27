# Absences: English pilot

## Design

Two between-participant conditions: **thick** and **thin**. Each participant reads four distinct scenarios (beach, driveway, rocket, cellar), in randomized order, and gives four naturalness ratings per scenario. Total: **16 ratings**.

| Scenario | Thick verb | Thin alternatives |
| --- | --- | --- |
| Beach | Burn | Change / dry out |
| Driveway | Crack | Weaken / degrade |
| Rocket | Melt | Activate |
| Cellar | Flood | Increase water level / dampen |

The thick pool has four story versions. The thin pool has seven; each thin participant receives exactly one alternative for each scenario. Thick materials use the first source variant for each scenario; the thick cellar story therefore uses the storm setup and “the storm” direct cause. The thin dampen version retains its source rain-for-several-days setup and “the rain” direct cause. Thin alternatives are material candidates, not controlled synonyms; their source setups can differ.

Each story uses its own **single outcome**. A thick story states the thick outcome; a thin story states its selected thin outcome. Dual-outcome endings and make constructions are not presented.

Four semantic sentence roles appear in a random order chosen once per participant and reused across all four scenarios:

- Omission, cause + verb
- Omission, lexical verb
- Direct cause, cause + verb
- Direct cause, lexical verb

Every target uses the assigned condition's predicate. The prompt is “How natural is this sentence as a description of this situation?” with seven response points, anchored 1 “Very unnatural” and 7 “Very natural”.

## Participant screens

1. Adult participation consent, then instructions.
2. A bold reading instruction above the centered story and its single outcome; Continue.
3. The same story plus the instruction to read all four sentences. All four appear in the participant's fixed order; Continue to ratings.
4. Four rating screens. One sentence at a time appears in bold in a stationary question card directly beneath the story, with the same width as the story card. A blue outline and stronger shadow distinguish the question card. Its scale and Continue button remain centered. The preview reading instruction is removed. Story and sentence counters are not displayed. A response is required before continuing.
5. Repeat for all four stories, then optional demographics/language background and feedback.
6. Save completion, with retry and JSON/CSV download options.

Assignments, completed screens and ratings survive a reload in the same browser. A selected but unsubmitted rating is intentionally not counted; after a reload the participant answers that rating again. One browser profile represents one participant session. Use a new browser profile or private session for a different participant; reloading does not create a new assignment.

## Researcher review

Open `preview.html`. Its controls follow the adult Tort Cognition preview pattern:

- Switch thick/thin conditions.
- Force beach, driveway, and cellar alternatives in the thin condition.
- Jump to consent, instructions, any case story, sentence preview, individual rating, demographics, or feedback.
- Use Previous/Next screen, reset randomized assignments, or shuffle sentence order.
- Hide controls to inspect the participant display and download review responses from the current visit.

Review assignments are stored separately in tab session storage. No preview screen calls `/api/assign` or `/api/save`. Preview records have `review_mode: true` and `valid_participant_data: false`; the server rejects them as participant submissions. Jumps reload the preview with the same assignment; responses from earlier visits are not accumulated into a participant record.

## Allocation and data

Run `python3 tools/serve.py --port 8765` from the repository root. It binds to `127.0.0.1` by default.

The local service uses a SQLite transaction to randomly choose among the least allocated conditions. Among thin participants, it independently chooses each scenario's least allocated thin variant. Condition counts and each thin pair's counts therefore differ by at most one at allocation time. Existing session IDs return their original assignments. This balances **allocated sessions**, not completers; withdrawal can unbalance completed counts.

Case order and sentence order are uniformly shuffled per new assignment. No participant is shown a second version of a scenario.

Completed records go to `data/absences.sqlite3`, excluded from Git. Only the study assets are served as files; the database and repository metadata are not exposed. The client persists progress locally and retries failed completion saves. The server validates consent, condition/variant assignment, all 16 ordered ratings, 1–7 responses and final-screen completion, and accepts idempotent save retries. It never accepts a partial session as complete.

Export completed records:

```sh
python3 tools/export_data.py
```

This writes `data/exports/absences-completed.json` (full records) and `data/exports/absences-ratings.csv` (one row per rating). Fields include session ID, condition, scenario, variant, case and sentence order, candidate, construction, target sentence, single-outcome story, source row/key, rating, response time, and study version. JSON also includes consent, demographics and feedback.

The service is intended for local piloting and review. A participant-facing deployment and recruitment integration remain a separate step. Do not expose the local service publicly without the lab's production hosting/data workflow.

## Sources and English-only correction

`js/materials.js` is generated from the **English source** tab of `Cross-cultural translation master.xlsx`. It includes source row keys, Excel row numbers, original target text, and the source workbook SHA-256. The included shared text contains English consent/instruction/demographic source fields. The study's participation consent is adapted separately from Tort Cognition as described below.

Only omission rows with `Thin-pair type = alternating` are eligible. Source lexical targets are in rows 273–325; cause targets are in rows 507–558. No target-language tabs are imported.

The researcher authorized using **water level consistently in the English cellar/increase pilot**. Its four thin targets now use “the level of water in the cellar”; the slash alternative and humidity wording are removed from participant-facing English text. Original English text remains alongside the corrected text as provenance. The original workbook and every other language are unchanged.

To regenerate materials using the bundled Python environment (requires openpyxl):

```sh
python3 tools/extract_materials.py "/path/to/Cross-cultural translation master.xlsx"
```

The extraction script only reads the workbook and writes `js/materials.js`.

## Consent

Participation consent is adapted from the recent adult Tort Cognition form, not from that project's fictional consent/no-consent manipulation:

- `explanation-lab/tort_cognition/code/shared/js/pilot-adult-forms.js`
- Recent adult adaptation: `code/experiments/experiment3/adults/js/study.js`

It preserves the substantive risk, privacy, contact, voluntary-participation and rights paragraphs. Adaptations are plural scenarios, accurate button instructions, and the existing browser-platform wording. `js/config.js` centralizes the preliminary duration (about 10 minutes, consistent with the source workbook) and the recent adult pilot's $1.50 compensation. Confirm both against the eventual recruitment listing and measured timing before recruitment. No recruitment listing is created by this build.

## Checks

```sh
node tests/core.cjs
python3 -m unittest discover -s tests -p '*_test.py'
node tests/browser.cjs
```

The browser check requires Playwright available on Node's package path and the local server running. Set `PILOT_URL` to a separate QA server and `--database /tmp/absences-qa.sqlite3` to keep synthetic assignments out of the research database. `CHROMIUM_PATH` can select an already-installed Chromium binary. Screenshots go to ignored `test-results/`.

Core checks cover all alternative combinations, single outcomes, 16 ratings and the English water-level correction. Service checks cover concurrent balance, stable assignments, review rejection, missing/duplicate ratings and save retries. Browser checks cover every material and phase, researcher navigation, the stationary question card and its matching story width, mobile layout, consent refusal, full participant completion, reload recovery and exports.
