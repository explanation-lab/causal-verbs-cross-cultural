# Explanation Lab conversion report

Converted: 2026-10-28T15:41:03.340Z
Source ZIP: Factivity-console-source.zip
jsPsych: 7.3.4
Experiment version: factivity-english-console-2.0.0
Client version: 1.5.1
Assignment: between_participant
Launch assignment parameter: condition
Launch conditions: thick_000, thick_001, thick_010, thick_011, thin_000, thin_001, thin_002, thin_003, thin_010, thin_011, thin_012, thin_013
Internal condition cells: none detected
Demographics: age, sex, birth_country, current_country, race_ethnicity, first_language, other_languages_spoken, other_languages, everyday_language
Package fingerprint: 1bf4968cc977eec87cf01d2eb416c311030b477f940717f54e907824f5decff9

## Changes
- Added explanation-lab.config.json with confirmed versions and data mappings.
- Added a frozen local Explanation Lab client at js/explanation-lab-client.js.
- Preserved the existing Explanation Lab save integration and re-verified its launch assignment wiring.
- Verified that every condition reader in the package uses the Console assignment.

## Warnings from inspection
- None

## Required next steps
1. Open and test the converted study locally.
2. Publish this converted folder through GitHub Pages.
3. Register the public Pages URL in the Explanation Lab Console.
4. Paste the Pages URL into the Console; it will read and verify this manifest automatically.
5. Complete every Sandbox condition and inspect both CSV exports.
6. Do not launch while any readiness item remains incomplete.