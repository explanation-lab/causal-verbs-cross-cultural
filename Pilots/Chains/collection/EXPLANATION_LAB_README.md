# Explanation Lab conversion report

Converted: 2026-10-28T15:27:45.431Z
Source ZIP: Chains-console-source.zip
jsPsych: 7.3.4
Experiment version: chains-english-console-2.0.0
Client version: 1.5.1
Assignment: between_participant
Launch assignment parameter: condition
Launch conditions: thick_0000, thick_0001, thick_0002, thick_0010, thick_0011, thick_0012, thin_0000, thin_0001, thin_0002, thin_0010, thin_0011, thin_0012, thin_0020, thin_0021, thin_0022, thin_0100, thin_0101, thin_0102, thin_0110, thin_0111, thin_0112, thin_0120, thin_0121, thin_0122, thin_1000, thin_1001, thin_1002, thin_1010, thin_1011, thin_1012, thin_1020, thin_1021, thin_1022, thin_1100, thin_1101, thin_1102, thin_1110, thin_1111, thin_1112, thin_1120, thin_1121, thin_1122
Internal condition cells: none detected
Demographics: age, sex, birth_country, current_country, race_ethnicity, first_language, other_languages_spoken, other_languages, everyday_language
Package fingerprint: 10da123072717a6d5f86f34102b4b4fd405fd1ffd21e9e06ed88505bd7fb2454

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