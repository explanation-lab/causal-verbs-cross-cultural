# Pilot figures

`figures.Rmd` contains the analysis and plotting code. It saves figures without producing a report. `R/data.R` handles imports, material checks, simulation, and summaries.

Generate mock figures from the repository root:

```sh
Rscript analysis/render_figures.R mock
```

Outputs are PNG and vector PDF files in ignored `analysis/output/mock/`. Exactly one figure is generated for each of the 24 material versions. Beach change and Beach dry out are separate figures, as are Driveway weaken and Driveway degrade. Combined figures, overview figures, and earlier alternative designs are not generated.

Mock figures illustrate the proposed hypothesis using arbitrary simulated values. As requested, the figures have no title, subtitle, or footer, including no mock watermark. Mock files are kept in the `mock/` directory; the committed individual example filenames include `-mock`. They are not pilot results. The approved previews in `examples/` have `selected-` filenames. Earlier alternatives are preserved in `examples/archive/`; their original filenames are retained for links in the discussion.

The R packages are `ggplot2`, `dplyr` (1.1 or newer), `tidyr`, `readr`, `jsonlite`, and `knitr`. Install any missing packages with `install.packages()`. Tested with R 4.5.2, ggplot2 4.0.2, dplyr 1.2.0, tidyr 1.3.2, readr 2.1.6, jsonlite 2.0.0, and knitr 1.51. Colored labels use native R grid text; no additional package or Pandoc is needed.

## Approved layout

- Horizontal axis: lexical verb versus cause + verb. Thick and thin have distinct colors and shapes.
- Separate columns: direct/event/proximal versus omission/fact/distal. Each figure contains only one material version, with its matching thick and thin results.
- Left labels: bold black case name, followed by the thin verb in red, black “vs,” and the thick verb in blue. Text and lines use the same color values.
- Points show means, whiskers show pointwise 95% bootstrap intervals, and n shows participants per cell. The naturalness scale remains 1–7.
- No title, subtitle, or footer. Context-comparison notes remain in the placement CSV and this guide instead of inside the figure.

Summary and across-version comparison figures are deferred. The plotting function rejects multiple versions in one figure. Individual mock figures are available in `examples/individual/`.

The code also saves descriptive summaries. `construction-advantage.csv` contains paired cause + verb minus lexical estimates. `construction-interaction.csv` compares those increases: `(cause-thick - lexical-thick) - (cause-thin - lexical-thin)`, separately for each causal subject. Positive values indicate a larger thick increase. `cause-gap-summary.csv` contains within-person direct-versus-other gaps and their thin-minus-thick differences, separately for each sentence form. No candidates are automatically ranked or selected.

## Use real exports

Place Console complete bundles, Responses CSVs, or raw-submissions JSON files in ignored `analysis/input/`. Then:

```sh
Rscript analysis/render_figures.R production analysis/input/absences.zip analysis/input/factivity.zip analysis/input/chains.zip
```

Production outputs stay in ignored `analysis/output/production/`. The import checks study IDs, assigned variants, exact story/target text, source references, complete rating sets, and condition verification. Repeated copies of the same responses count once. Conflicting copies and repeated participants stop the run for review. Sandbox and mock records are excluded; an input with no production data stops rather than substituting mock data. There are no automatic speed or language exclusions. If needed, `PILOT_EXCLUSIONS` can name a CSV with `submission_id,reason` for explicitly reviewed exclusions.

Participants are the unit for each cell interval. Construction and cause-gap contrasts subtract paired ratings before independently resampling the thick and thin groups. Intervals are descriptive and pointwise; they do not adjust for multiple comparisons or selecting an alternative. Sparse cells retain their n; n=1 has no interval, and missing cells display no data. A nonsignificant contrast does not establish equivalence for direct subjects.

Shared thick observations are reused as references in the appropriate individual figures; these are the same participants, not additional independent samples. Matching uses the collected story and all four thick target sentences. Cellar/dampen uses a different rain setup from the collected storm/flood baseline; this comparison is flagged in `google-doc-figure-placement.csv`. Phone and scooter contexts remain separate where their thick stories differ. The three wine thick endings remain separate even where targets match.

`google-doc-figure-placement.csv` maps every approved figure to the verified document ID and exact section heading in the [materials folder](https://drive.google.com/drive/folders/1gGhEg-Fbk3wLj1nceKjL3vCVCoQNfEg3). Placement is immediately after that section's materials table. The layout is approved; production analysis and Google Docs insertion are subsequent steps. This script does not modify Google Docs.

Regenerate public metadata after an intentional material change with `python3 analysis/build_catalog.py`. Run integrity checks with `Rscript analysis/tests/check_analysis.R`. Only code, material metadata, and explicitly simulated example images belong in this public repository. Do not commit real exports or results.
