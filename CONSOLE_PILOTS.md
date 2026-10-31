# Study Console pilots

## Factivity accuracy follow-up — October 31, 2026

The separate [Factivity accuracy pilot](https://explanation-lab-studies.web.app/?view=projects&project=CAUSAL-VERBS-CROSS-CULTURAL-WLKQ&study=CAUSAL-VERBS-FACTIVITY-ACCUR-ZDDV&data=sandbox) is in **Sandbox testing**, with **28 passed Sandbox groups and zero production submissions**. It has not been launched. Original study registrations and data are unchanged.

- Console ID: `CAUSAL-VERBS-FACTIVITY-ACCUR-ZDDV`.
- Target: 100 participants, 36 thick / 64 thin, with exact 28-group quotas in `Pilots/FactivityAccuracy/collection/allocation.json`.
- Retains all seven original thin versions and five distinct thick contexts; adds phone/ruin and sewer/overwhelm.
- Uses the *Cause and Burn* English-learner accuracy probe, 1 Completely inaccurate to 7 Completely accurate; records `measure=accuracy` and the probe/scale fields.
- [Researcher review](https://explanation-lab.github.io/causal-verbs-cross-cultural/Pilots/FactivityAccuracy/preview.html), using the same layout and added sewer/phone selectors.
- Collection version: `factivity-accuracy-english-console-2.0.0`; official client 1.5.1; package fingerprint `5674f4ca7d91cb543f4c594c6ed606ab8b36c40d4494b3dd414a22b4ce45d151`.

All 28 hosted sessions completed the actual browser flow and passed the Console's exact-condition verification. The downloaded bundle was checked independently against source materials and allocation: 616 raw trials, 336 accuracy ratings, 28 demographic rows, correct source references, single endings, stable sentence roles, assigned variants, scale metadata, and 22 unique screens per session. The first thick session was reloaded after two ratings and exported all 12 assigned answers without loss or duplication. Source-level checks additionally cover refusal, failed-save handling, resume and duplicate reload behavior for every allocation group. Data format is confirmed in the Console.

The final one-click preflight leaves only the actual **Prolific completion URL** and **Prolific link/100 places/completion-code confirmation** outstanding. No completion URL was invented or copied from the original pilot, and the Prolific configuration checkbox remains unchecked. After supplying the actual URL, verify its redirect and rerun preflight before any authorized launch.

Recheck a downloaded Sandbox bundle with `python3 tools/validate_accuracy_sandbox.py /path/to/sandbox_data.zip`. Exports and screenshots remain excluded from Git.

## Original pilot setup record — October 28, 2026

Prepared and verified October 28, 2026. All three studies remain in **Sandbox testing**, with zero production submissions. Completion URLs are intentionally blank. Recruitment has not been launched.

[Open the Console project](https://explanation-lab-studies.web.app/?view=projects&project=CAUSAL-VERBS-CROSS-CULTURAL-WLKQ).

| Study | Console study ID | Thick target | Thin target | Total | Sandbox groups passed |
|---|---|---:|---:|---:|---:|
| Absences | `CAUSAL-VERBS-ABSENCES-PILOT-WNJ4` | 36 | 64 | 100 | 9 |
| Factivity | `CAUSAL-VERBS-FACTIVITY-PILOT-ESBT` | 42 | 58 | 100 | 12 |
| Chains | `CAUSAL-VERBS-CHAINS-PILOT-JBXE` | 41 | 59 | 100 | 42 |

## Allocation

Each participant stays entirely in the thick or thin group and sees one version of each story family. Story order is randomized. The four sentence roles are randomized once per participant and retain that order across stories.

The smaller thick groups approximate equal observations per distinct version across the materials as a whole. Identical thick stories and targets are pooled. The splits use the ratio of distinct thick to thin versions: 4:7 for Absences, 5:7 for Factivity, and 7:10 for Chains. A common split cannot equalize every family because families contain different numbers of alternatives.

Console launch groups encode the full version combination. The single participant link assigns the group furthest below its target. Exact group quotas and variant mappings are in each study's `collection/allocation.json`; Console targets match those files. These are assignment targets. Dropouts can make completion counts differ.

| Study / thin story family | Planned thin observations per alternative |
|---|---|
| Absences: beach | change 32; dry out 32 |
| Absences: driveway | weaken 32; degrade 32 |
| Absences: rocket | activate 64 |
| Absences: cellar | increase 32; dampen 32 |
| Factivity: sewer | stop working 58 |
| Factivity: phone | die/kill context 29; turn off context 29 |
| Factivity: scooter | stop 14; power down 15; disconnect from battery 14; disconnect from rental network 15 |
| Chains: frame | deform 29; loosen 30 |
| Chains: railing | detach 30; separate 29 |
| Chains: roadside object | activate beacon 20; disconnect beacon 20; disconnect sign 19 |
| Chains: wine | empty glass 20; decrease amount in glass 19; decrease party supply 20 |

Thick Factivity contexts receive sewer 42, each phone context 21, and each distinct scooter context 21. Thick Chains versions receive frame 41, railing 41, beacon 20/sign 21, and wine versions 14/13/14. Thick Absences receives 36 observations for each story.

## Hosting and data

The existing repository was made public with the researcher's approval. GitHub Pages publishes a static allowlist built by `tools/stage_pages.py`. The original reviewer pages and offline ZIP remain separate from data collection.

Hosted collection entries:

- [Absences](https://explanation-lab.github.io/causal-verbs-cross-cultural/Pilots/Absences/collection/)
- [Factivity](https://explanation-lab.github.io/causal-verbs-cross-cultural/Pilots/Factivity/collection/)
- [Chains](https://explanation-lab.github.io/causal-verbs-cross-cultural/Pilots/Chains/collection/)

Use the Console-generated participant link, which supplies study/mode and Prolific identifiers, rather than distributing these bare URLs. Collection uses the official Explanation Lab client 1.5.1 and jsPsych 7.3.4. Responses save through the Console integration; local review does not submit data. Participant data and exports are excluded from Git and Pages.

Each response preserves the Console `condition` code, `verb_condition`, assigned variants, case and sentence order, source row/key, exact story and target sentence, rating, and response time. For rating analyses, filter `trial_role` to `response`. `screen_index` is the stable study screen identifier; jsPsych's `trial_index` and elapsed time can restart after a page reload. Demographics are exported separately as one row per participant. Raw JSON preserves all fields.

## Verification

All 63 final launch groups completed the hosted browser flow and passed the Console's exact-condition verification: 9 Absences sessions, 12 Factivity sessions, and 42 Chains sessions. Downloaded complete bundles contained 960 ratings in total (144, 144, 672), with 63 demographic rows. Every assigned variant, story setup/ending, target sentence, source reference, rating range, role order, and family count was checked against the approved materials and allocation files. CSV and raw JSON counts agree. Response and demographic export formats are confirmed in the Console.

An Absences session was reloaded after two ratings; all prior answers were restored and the final export contained the complete 16 unique ratings. Automated collection checks cover all launch groups, consent refusal, failed-save handling, resume, and duplicate reload behavior. Existing material/core checks and six Python tests passed; GitHub checks and Pages deployment passed for collection revision `4d9a2c9b64b077cb4d07d25b9325a694733b73b0`.

One earlier test-only Absences registration (`CAUSAL-VERBS-ABSENCES-PILOT-7FFX`) is closed and archived after the reload repair. It has no production submissions. Use the final `WNJ4` registration above.

## Remaining Prolific steps

The one-click preflight was run for each study. Only these two actions remain:

1. Add that pilot's actual Prolific completion URL in **Setup & launch**. Then run the completion/redirect check with that URL.
2. Copy that pilot's single external-study link into Prolific, enter **100 places**, select the corresponding completion code, and confirm those settings in the Console.

Run preflight again after completing those steps. Completion redirects cannot be verified until the actual URLs are supplied. No Prolific launch confirmation has been checked, and no study has been changed to Ready or Live.
