# Explanation Lab conversion report

Converted: 2026-10-28T15:27:44.954Z
Source ZIP: Absences-console-source.zip
jsPsych: 7.3.4
Experiment version: absences-english-console-2.0.0
Client version: 1.5.1
Assignment: between_participant
Launch assignment parameter: condition
Launch conditions: thick, thin_0000, thin_0001, thin_0100, thin_0101, thin_1000, thin_1001, thin_1100, thin_1101
Internal condition cells: none detected
Demographics: age, sex, birth_country, current_country, race_ethnicity, first_language, other_languages_spoken, other_languages, everyday_language
Package fingerprint: bcbe76c640841bb6d2e3418ab4b3e81f8e36dbc964de5a1577d7b2ede939190e

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