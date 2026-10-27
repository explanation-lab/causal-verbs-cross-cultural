# Chains: English pilot

This pilot uses the current Absences/Factivity layout, consent, naturalness measure and researcher review panel.

## Design

Two between-participant conditions: **thick** and **thin**. Each participant receives one version of each of four story families, in randomized order, with four ratings per story: **16 ratings total**.

| Story family | Versions sampled in both conditions | Thick outcome | Thin outcome |
| --- | --- | --- | --- |
| Painting frame | Deform / loosen | Frame cracks | Frame deforms / loosens |
| Railing | Detach / separate | Railing breaks | Railing detaches / separates from its posts |
| Roadside object | Activate beacon / disconnect beacon / disconnect sign | Beacon or sign bends | Beacon activates / beacon disconnects / road sign disconnects |
| Wine | Empty glass / decrease glass amount / decrease party supply | Wine spills | Glass empties / glass amount decreases / party supply decreases |

Frame and railing versions are balanced 50/50 within each condition. Roadside-object and wine versions are balanced approximately one-third each within each condition. Allocation randomly chooses among the least allocated options inside a SQLite transaction. This balances allocated sessions; withdrawals can unbalance completion counts.

Each participant sees each family once. Both conditions retain the corresponding source setup, object and quantity context. The electronic-road-sign version uses its sign setup and targets, and the party-supply version uses the large-jug setup and party-supply targets. Some thick versions share identical text; their source version is still recorded.

The four semantic sentence roles are:

- Distal cause, cause + verb
- Distal cause, lexical verb
- Proximal cause, cause + verb
- Proximal cause, lexical verb

The distal cause is earlier in the chain (Gus, cyclist, blue car, Suzy). The proximal cause is nearer the outcome (Billy, pedestrian, red car, Andy). Sentence-role order is shuffled once per participant and reused for all four stories.

The prompt is “How natural is this sentence as a description of the situation?” on a 1–7 scale, anchored 1 “Very unnatural” and 7 “Very natural”. Only the assigned thick or thin **single outcome** is shown. Make constructions, agreement questions and dual-outcome endings are excluded.

## Source materials

`js/materials.js` is generated from the **English source** sheet of `Cross-cultural translation master.xlsx`, filtered to `Study = chain` and `Thin-pair type = alternating`. All ten versions and their 80 cause/lexical targets are copied verbatim. Source row numbers, row keys, original target text and workbook SHA-256 are included. The workbook and all other languages are unchanged.

Story components and lexical targets are in source rows 417–506; cause targets are in rows 591–666. The original wording is preserved, including generic disconnect wording, the painting-frame setup, and the distinct wine contexts.

Regenerate with Python and openpyxl:

```sh
python3 tools/extract_materials.py "/path/to/Cross-cultural translation master.xlsx" --study chain
```

## Screens and researcher review

Consent uses the same blue outlined card and participation terms as the other pilots. Instructions are centered, with Begin and Continue buttons in the shared rounded style. The story remains in its card during the four-sentence preview and ratings. Preview sentences appear as numbered tiles. During ratings, the reading instruction disappears and one target appears in a stationary question card matching the story width, with the prompt above the bold sentence, scale and Continue button. Story and sentence counters are not displayed. Demographics/language background and optional feedback follow the four stories.

`preview.html` provides condition switching, selectors for all four story families, jumps to every story/preview/rating, previous/next screen, sentence-order shuffling, new randomized review assignments and review-response downloads. All variant selectors remain enabled in both conditions.

Review assignments use tab-local storage, separately from participant assignments. Review mode makes no allocation/save requests, labels its records as invalid participant data, and cannot submit them as participant responses. Jumping preserves the assignment and starts a fresh review visit.

Chains has its own materials, runtime namespace and browser-storage keys. The CSS is copied exactly from the approved Factivity layout. The existing jsPsych 7.3.4 runtime and button-response plugin are loaded from `Pilots/Absences/vendor/`.

## Run, save and export

```sh
python3 tools/serve.py --port 8765
```

- [Chains researcher review](http://127.0.0.1:8765/Pilots/Chains/preview.html)
- [Chains participant entry](http://127.0.0.1:8765/Pilots/Chains/index.html)

The existing server adds `/api/chains/assign` and `/api/chains/save`, with a separate ignored database at `data/chains.sqlite3`. Absences and Factivity retain their existing routes and databases. Browser reloads retain the assignment and completed ratings. The server requires consent, the current version and exactly 16 ordered assigned ratings before marking a session complete; retries are idempotent.

```sh
python3 tools/export_data.py --study chains
```

Exports are `data/exports/chains-completed.json` and `data/exports/chains-ratings.csv`. JSON includes the full session. CSV has one row per rating, including source version, story and sentence order, distal/proximal candidate, construction, source row/key, target sentence, rating and response time.

This is a local review build. Recruitment, public hosting and production registration are separate steps. Consent wording and preliminary duration/payment settings are copied from the approved pilot layout and should match the eventual recruitment listing.

## Checks

```sh
node tests/core.cjs
node tests/factivity.cjs
node tests/chains.cjs
python3 -m unittest discover -s tests -p '*_test.py'
```

Checks cover all 72 Chains condition/variant combinations, source wording, single outcomes, 16 ratings, matched sign and party-supply contexts, shared CSS, concurrent balance in both conditions, separate study allocation and completion/retry validation. Browser QA uses separate databases supplied with `--database`, `--factivity-database` and `--chains-database`.
