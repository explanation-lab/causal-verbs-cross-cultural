# Run from repository root: Rscript analysis/tests/check_analysis.R [sandbox ZIPs...]
source('analysis/R/data.R')
# A production invocation must try to read its explicit file, never execute mock
# defaults injected from the R Markdown YAML by knitr::purl.
runner_check <- suppressWarnings(system2(file.path(R.home('bin'), 'Rscript'),
  c('analysis/render_figures.R', 'production', '/nonexistent/pilot-runner-regression.zip'),
  stdout = TRUE, stderr = TRUE))
stopifnot(!is.null(attr(runner_check, 'status')),
          any(grepl('Input file does not exist', runner_check, fixed = TRUE)))
catalog <- read_catalog('.')
stopifnot(nrow(catalog$versions) == 24,
          nrow(distinct(catalog$versions, study, case, thick_variant)) == 16,
          sum(!catalog$versions$context_match) == 1,
          catalog$versions$variant[!catalog$versions$context_match] == 'dampen')
mock <- simulate_ratings(catalog)
people <- mock %>% distinct(study, participant, verb_condition) %>% count(study, verb_condition)
stopifnot(nrow(mock) == 4400, nrow(distinct(mock, participant)) == 300,
          identical(people$n, c(36L, 64L, 41L, 59L, 42L, 58L)))

# Synthetic Console-shaped fixture. Never stored in the repository or used as results.
fixture <- mock %>% left_join(catalog$studies %>% select(study, study_key = study_id), by = 'study') %>%
  group_by(submission_id) %>% mutate(screen_index = row_number() + 3L) %>% ungroup() %>%
  mutate(mode = 'production', condition_verification = 'matched',
         prolific_pid = sub('^MOCK-', 'FIXTURE-', submission_id), trial_role = 'response',
         valid_participant_data = 'true', review_mode = 'false')
temp <- tempfile(fileext = '.csv')
write_csv(fixture, temp)
clean <- load_ratings(temp, catalog)$ratings
stopifnot(nrow(clean) == 4400, nrow(load_ratings(c(temp, temp), catalog)$ratings) == 4400)
expect_failure <- function(expr, pattern) {
  error <- tryCatch({ force(expr); NULL }, error = identity)
  if (is.null(error) || !grepl(pattern, conditionMessage(error)))
    stop('Expected failure containing: ', pattern)
}
try_fixture <- function(data, pattern) {
  path <- tempfile(fileext = '.csv'); on.exit(unlink(path))
  write_csv(data, path)
  expect_failure(load_ratings(path, catalog), pattern)
}
bad <- fixture; bad$rating[1] <- 8; try_fixture(bad, 'Ratings')
bad <- fixture; bad$sentence[1] <- 'Tampered text'; try_fixture(bad, 'Material mismatch')
bad <- fixture; bad$variant[1] <- 'unassigned'; try_fixture(bad, 'assignment')
bad <- fixture; bad$condition_verification[1] <- 'mismatch'; try_fixture(bad, 'verification')
bad <- fixture; bad$prolific_pid[1] <- 'MOCK-TEST'; try_fixture(bad, 'Test identifiers')
try_fixture(fixture[-1, ], 'Incomplete')
try_fixture(mutate(fixture, mode = 'sandbox'), 'No production')
try_fixture(select(fixture, -role), 'required fields')
bad <- fixture
same_study <- unique(bad$submission_id[bad$study == 'Absences'])[1:2]
bad$prolific_pid[bad$submission_id %in% same_study] <- 'FIXTURE-REPEAT'
try_fixture(bad, 'Multiple submissions')
bad <- fixture; bad$rating[1] <- ifelse(bad$rating[1] == 1, 2, 1)
try_fixture(bind_rows(fixture, bad[1, ]), 'Conflicting copies')

# Known paired cause gaps: thick lexical 4, thin lexical 1; cause form both 1.
v <- catalog$versions[1, ]
paired <- crossing(participant = 1:2, verb_condition = c('thick', 'thin'),
                    candidate = c('direct', 'absence'), construction = c('lexical', 'cause')) %>%
  mutate(study = 'Absences', case = 'beach', variant = 'change',
         participant = paste(verb_condition, participant),
         rating = case_when(candidate == 'direct' & verb_condition == 'thin' & construction == 'lexical' ~ 5,
                            candidate == 'direct' ~ 6,
                            construction == 'cause' ~ 5,
                            verb_condition == 'thick' ~ 2, TRUE ~ 4))
gaps <- contrast_rows(paired, v, B = 200)
stopifnot(gaps$gap_difference[gaps$construction == 'lexical'] == -3,
          gaps$gap_difference[gaps$construction == 'cause'] == 0)
stopifnot(nrow(contrast_rows(filter(paired, verb_condition == 'thick'), v, B = 200)) == 0)
boost <- construction_advantage(paired, v, B = 200)
stopifnot(nrow(boost$boosts) == 4, nrow(boost$contrasts) == 2,
          boost$contrasts$thick_minus_thin_boost[boost$contrasts$candidate == 'absence'] == 2,
          boost$contrasts$thick_minus_thin_boost[boost$contrasts$candidate == 'direct'] == -1,
          all(boost$boosts$n == 2),
          all(boost$boosts$low == boost$boosts$high))
# Perfectly covarying lexical/cause responses have zero uncertainty in their
# within-person difference even though the component ratings vary across people.
paired_varying <- paired %>% mutate(rating = rating + if_else(grepl('1$', participant), -1, 0))
boost_varying <- construction_advantage(paired_varying, v, B = 200)
stopifnot(all(boost_varying$boosts$low == boost_varying$boosts$high),
          identical(boost_varying$boosts$mean, boost$boosts$mean))
mock_boost <- construction_advantage(mock, catalog$versions, B = 200)
stopifnot(nrow(mock_boost$boosts) == 96, nrow(mock_boost$contrasts) == 48,
          all(filter(mock_boost$boosts, study == 'Absences', case == 'beach', verb_condition == 'thick')$n == 36))

# Optional integration check against previously generated, explicitly supplied QA bundles.
args <- commandArgs(trailingOnly = TRUE)
if (length(args)) {
  imported <- load_ratings(args, catalog, expected_mode = 'sandbox')$ratings
  stopifnot(nrow(imported) == 960, n_distinct(imported$submission_id) == 63)
  expect_failure(load_ratings(args, catalog), 'No production')
  raw_path <- tempfile(fileext = '.json')
  json <- readLines(unz(args[1], 'raw-submissions.json'), warn = FALSE)
  writeLines(json, raw_path)
  stopifnot(nrow(load_ratings(c(args[1], raw_path), catalog, expected_mode = 'sandbox')$ratings) == 144)
  unlink(raw_path)
}
unlink(temp)
cat('Analysis checks passed: mappings, quotas, deduplication, rejection paths, paired contrasts',
    if (length(args)) ', and all 63 hosted QA exports' else '', '.\n', sep = '')
