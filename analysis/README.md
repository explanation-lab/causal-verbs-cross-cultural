# Pilot figures

`figures.Rmd` contains the analysis and plotting code. It saves figures without producing a report. `R/data.R` handles imports, material checks, simulation, and summaries.

Generate mock figures from the repository root:

```sh
Rscript analysis/render_figures.R mock
```

This creates PNG and vector PDF files in ignored `analysis/output/mock/`: two display styles for all 24 material versions, thick-only and thin-only overviews for each study, and two beach examples comparing the styles. Every mock figure is labeled **MOCK DATA**. The simulated patterns are arbitrary layout examples, not predictions.

The R packages are `ggplot2`, `dplyr` (1.1 or newer), `tidyr`, `readr`, `jsonlite`, and `knitr`. Install any missing packages with `install.packages()`. Tested with R 4.5.2, ggplot2 4.0.2, dplyr 1.2.0, tidyr 1.3.2, readr 2.1.6, jsonlite 2.0.0, and knitr 1.51. Pandoc is not needed for this figure-only workflow.

## Display choices

- **Profile:** naturalness from 1 to 7, with direct/event/later versus omission/fact/earlier on the horizontal axis. Thick and thin have distinct colors and shapes; lexical and cause + verb forms have separate panels. Points show means, whiskers show pointwise 95% bootstrap intervals, and n shows participants per cell.
- **Difference:** thin minus thick for each causal subject and sentence form. Zero means equal group means; positive means thin was rated higher. The horizontal range adapts to include all displayed intervals, with a minimum range of -2 to 2.
- **Overviews:** separate thick-only and thin-only matrices show all four means and participant counts for each material version. These compact figures help compare alternatives; the profile figures show uncertainty.

The code also calculates within-person direct-versus-other gaps and the thin-minus-thick difference in those gaps, separately for each sentence form. These summaries are available in `cause-gap-summary.csv`; no candidates are automatically ranked or selected.

## Use real exports after choosing the figures

Place Console complete bundles, Responses CSVs, or raw-submissions JSON files in ignored `analysis/input/`. Then:

```sh
Rscript analysis/render_figures.R production analysis/input/absences.zip analysis/input/factivity.zip analysis/input/chains.zip
```

Production outputs stay in ignored `analysis/output/production/`. The import checks study IDs, assigned variants, exact story/target text, source references, complete rating sets, and condition verification. Repeated copies of the same responses count once. Conflicting copies and repeated participants stop the run for review. Sandbox and mock records are excluded; an input with no production data stops rather than substituting mock data. There are no automatic speed or language exclusions. If needed, `PILOT_EXCLUSIONS` can name a CSV with `submission_id,reason` for explicitly reviewed exclusions.

Participants are the unit for each cell interval. Cause-gap contrasts subtract paired ratings before independently resampling the thick and thin groups. Intervals are descriptive and pointwise; they do not adjust for multiple comparisons or selecting an alternative. Sparse cells retain their n; n=1 has no interval, and missing cells display no data.

Shared thick observations are reused under the appropriate thin sections but appear only once in the thick overview. Matching uses the collected story and all four thick target sentences. Cellar/dampen is flagged because its rain setup differs from the collected storm/flood baseline. Phone and scooter contexts remain separate where their thick stories differ. The three wine thick endings remain separate even where targets match.

`google-doc-figure-placement.csv` maps every figure to the verified document ID and exact section heading in the [materials folder](https://drive.google.com/drive/folders/1gGhEg-Fbk3wLj1nceKjL3vCVCoQNfEg3). It specifies placement immediately after that section's materials table. This workflow makes no Google Docs edits; actual figures will be inserted after the display style is selected and production data are analyzed.

Regenerate public metadata after an intentional material change with `python3 analysis/build_catalog.py`. Run integrity checks with `Rscript analysis/tests/check_analysis.R`. Only code, material metadata, and explicitly simulated example images belong in this public repository. Do not commit real exports or results.
