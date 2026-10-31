# Factivity follow-up: English-learner accuracy

Separate pilot approved October 31, 2026. The original Factivity pilot and its data remain unchanged.

Each participant stays in the thick or thin group and sees one sewer, one phone, and one scooter story in random order. Four sentence roles (fact/direct × cause/lexical) are shuffled once and reused across all three stories: 12 ratings in total. Stories use only their assigned single outcome.

The probe is from *Cause and Burn* (Rose, Sievers, & Nichols, 2021), Study 2, p. 5: “Imagine someone is trying to learn English from you and asks you to indicate how accurate each of these statements is:” Ratings are 1 Completely inaccurate through 7 Completely accurate. The individual rating card adapts “each of these statements” to “this statement.” This adopts the probe and scale while retaining the first Factivity pilot's three-story procedure.

All seven original thin versions, matching thick contexts, subjects, and targets are retained. Added workbook materials are sewer/overwhelm and manufacturing-defect phone/ruin, including passive complements under cause. Their thick baselines reuse the unchanged existing sewer and manufacturing-defect materials. The new versions do not create additional unique thick stories. No workbook or translation is edited.

| Family | Thick observations per distinct context | Thin observations per alternative |
|---|---:|---|
| Sewer | 36 | stop working 32; overwhelm 32 |
| Phone | app 18; texting 18 | die/kill 21; turn off 22; ruin 21 |
| Scooter | standard 18; rental 18 | stop 16; power down 16; disconnect battery 16; disconnect network 16 |

Total: 100 completed participants targeted, 36 thick / 64 thin. Four thick launch groups have nine places each; 24 thin groups have two or three places each. See `collection/allocation.json` for exact quotas. Assignment and completion counts may differ after withdrawals; check completed margins during recruitment. Shared thick baselines are never counted as independent extra observations.

The review uses the original CSS, consent, buttons, story and rating cards, and navigation controls. It adds sewer and phone selectors for the new versions. Review answers stay in the tab and are never submitted. Open `preview.html` on a static server or GitHub Pages. For data collection use only the separate Console-registered `collection/` entry and its generated link; the local allocation API is intentionally separate from the original pilot and is not configured.

Accuracy responses record `measure=accuracy`, `probe_id=english-learner-cause-and-burn`, scale endpoints/anchors, exact text, source row/key, assignment, case/sentence order, version, rating, and response time. Collection storage and study IDs are separate from the first pilot. Real participant data and private exports remain excluded from Git.

Build with the bundled Python environment providing openpyxl:

```
python3 tools/build_factivity_accuracy.py '/path/to/Cross-cultural translation master.xlsx'
node tools/build_console.mjs /path/to/study-console-source FactivityAccuracy
```

The second step uses the established Console converter and official client. It does not modify the other collection packages. Run `node tests/factivity-accuracy.cjs` and `node --experimental-vm-modules tests/collection.cjs`. Hosted Sandbox sessions and exported records are verified separately before recruitment. Leave the study in Sandbox testing until explicitly authorized to launch.
