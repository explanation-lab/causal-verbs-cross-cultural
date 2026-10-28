#!/usr/bin/env Rscript
# Execute the R Markdown chunks and save figures; do not render a report.
args <- commandArgs(trailingOnly = TRUE)
script <- sub('^--file=', '', grep('^--file=', commandArgs(), value = TRUE)[1])
repo_root <- normalizePath(file.path(dirname(script), '..'))
setwd(repo_root)
if (!length(args) || !args[1] %in% c('mock', 'production'))
  stop('Usage: Rscript analysis/render_figures.R mock | production <Console ZIP/CSV/JSON> [...]')
mode <- args[1]
inputs <- args[-1]
if (mode == 'mock' && length(inputs)) stop('Mock mode takes no input files.')
if (mode == 'production' && !length(inputs)) stop('Supply at least one production Console export.')
params <- list(mode = mode, input_files = inputs,
               output_dir = paste0('analysis/output/', mode), bootstrap_draws = 2000,
               exclusions = Sys.getenv('PILOT_EXCLUSIONS', unset = NA_character_))
if (is.na(params$exclusions)) params$exclusions <- NULL
code <- tempfile(fileext = '.R')
invisible(knitr::purl('analysis/figures.Rmd', output = code, quiet = TRUE, documentation = 0))
tryCatch(source(code, local = environment()), finally = unlink(code))
