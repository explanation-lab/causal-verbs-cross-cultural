# Data preparation shared by figures.Rmd and the integrity checks.
# No network calls: only explicit local Console exports are read.
suppressPackageStartupMessages({
  library(dplyr)
  library(tidyr)
  library(readr)
  library(jsonlite)
})

read_catalog <- function(root) {
  read <- function(name) read_csv(file.path(root, 'analysis/config', name),
                                 show_col_types = FALSE, na = character())
  list(versions = read('versions.csv'), targets = read('targets.csv'),
       allocation = read('allocation.csv'), studies = read('studies.csv'))
}

raw_rows <- function(path) {
  submissions <- fromJSON(path, simplifyVector = FALSE)
  scalar <- function(x) if (is.null(x) || length(x) == 0) NA_character_ else as.character(x)
  bind_rows(lapply(submissions, function(s) {
    bind_rows(lapply(s$trials, function(t) {
      fields <- c('trial_role', 'screen_index', 'case', 'variant', 'verb_condition',
                  'role', 'construction', 'candidate', 'sentence', 'story_setup',
                  'story_ending', 'source_row', 'source_row_key', 'rating', 'rt',
                  'valid_participant_data', 'review_mode')
      row <- as.list(setNames(vapply(fields, function(k) scalar(t[[k]]), ''), fields))
      row$submission_id <- scalar(s$submissionId)
      row$study_key <- scalar(s$studyId)
      row$mode <- scalar(s$mode)
      row$condition <- scalar(s$condition)
      row$condition_verification <- scalar(s$metadata$conditionVerification$status)
      row$prolific_pid <- scalar(s$participant$prolificPid)
      as_tibble(row)
    }))
  }))
}

read_one_export <- function(path) {
  if (!file.exists(path)) stop('Input file does not exist: ', path)
  if (grepl('\\.zip$', path, ignore.case = TRUE)) {
    members <- unzip(path, list = TRUE)$Name
    if (!'responses.csv' %in% members) stop('Bundle lacks responses.csv: ', path)
    result <- read_csv(unz(path, 'responses.csv'), col_types = cols(.default = col_character()),
                       show_col_types = FALSE, na = c('', 'NA'))
  } else if (grepl('\\.json$', path, ignore.case = TRUE)) {
    result <- raw_rows(path)
  } else if (grepl('\\.csv$', path, ignore.case = TRUE)) {
    result <- read_csv(path, col_types = cols(.default = col_character()),
                       show_col_types = FALSE, na = c('', 'NA'))
  } else stop('Use a Console complete ZIP, responses.csv, or raw-submissions.json.')
  result$input_file <- basename(path)
  result
}

load_ratings <- function(paths, catalog, expected_mode = 'production', exclusions = NULL) {
  if (!length(paths)) stop('Production mode requires explicit input files. Mock data are never a fallback.')
  data <- bind_rows(lapply(paths, read_one_export))
  required <- c('submission_id', 'study_key', 'mode', 'condition', 'condition_verification',
                'prolific_pid', 'trial_role', 'screen_index', 'case', 'variant', 'verb_condition',
                'role', 'candidate', 'construction', 'sentence', 'story_setup', 'story_ending',
                'source_row', 'source_row_key', 'rating', 'rt', 'valid_participant_data', 'review_mode')
  if (length(setdiff(required, names(data))))
    stop('Export lacks required fields: ', paste(setdiff(required, names(data)), collapse = ', '))
  audit <- data %>% distinct(submission_id, mode, input_file) %>% count(mode, name = 'submissions_per_input')
  data <- data %>% filter(mode == expected_mode, trial_role == 'response') %>% select(all_of(required))
  if (!nrow(data)) stop('No ', expected_mode, ' ratings found. Sandbox/mock data are not production results.')
  if (!is.null(exclusions)) {
    excluded <- read_csv(exclusions, col_types = cols(.default = col_character()), show_col_types = FALSE)
    if (!all(c('submission_id', 'reason') %in% names(excluded)) ||
        any(is.na(excluded$reason) | trimws(excluded$reason) == ''))
      stop('Exclusions require submission_id and a nonempty reason.')
    data <- anti_join(data, excluded, by = 'submission_id')
  }
  numeric_fields <- c('rating', 'rt', 'screen_index', 'source_row')
  for (k in numeric_fields) data[[k]] <- suppressWarnings(as.numeric(data[[k]]))
  for (k in c('valid_participant_data', 'review_mode')) data[[k]] <- tolower(data[[k]])
  # Repeated downloads of the same unchanged response are counted once.
  data <- distinct(data)
  if (anyDuplicated(data[c('submission_id', 'screen_index')]))
    stop('Conflicting copies of a submission/screen. Resolve the exports before analysis.')
  if (anyNA(data$rating) || any(!data$rating %in% 1:7)) stop('Ratings must be integers from 1 to 7.')
  if (anyNA(data$screen_index) || anyNA(data$source_row)) stop('Missing screen/source indexes.')
  if (anyNA(data$rt) || any(!is.finite(data$rt) | data$rt < 0)) stop('Invalid response times.')
  valid <- tolower(as.character(data$valid_participant_data)) == 'true'
  review <- tolower(as.character(data$review_mode)) == 'false'
  if (anyNA(valid) || anyNA(review) || !all(valid & review)) stop('Review/invalid rows detected.')
  if (anyNA(data$condition_verification) || any(data$condition_verification != 'matched'))
    stop('Condition verification must be matched for all ratings.')
  if (anyNA(data$prolific_pid) || any(trimws(data$prolific_pid) == '')) stop('Missing participant identifier.')
  if (expected_mode == 'production' && any(grepl('^(SANDBOX|MOCK)-', data$prolific_pid)))
    stop('Test identifiers detected in production rows.')
  data <- left_join(data, catalog$studies %>% select(study, study_key = study_id, expected_ratings),
                    by = 'study_key', relationship = 'many-to-one')
  if (anyNA(data$study)) stop('Unknown study ID. Check studies.csv rather than silently relabeling it.')
  expected <- catalog$allocation %>% select(study, condition, case,
                                            expected_variant = variant, expected_verb = verb_condition)
  data <- left_join(data, expected, by = c('study', 'condition', 'case'), relationship = 'many-to-one')
  if (anyNA(data$expected_variant) || any(data$variant != data$expected_variant |
                                        data$verb_condition != data$expected_verb))
    stop('Condition/variant assignment does not match the saved Console allocation.')
  keys <- c('study', 'case', 'variant', 'verb_condition', 'role')
  text_fields <- c('candidate', 'construction', 'sentence', 'story_setup', 'story_ending',
                   'source_row', 'source_row_key')
  reference <- catalog$targets %>% select(all_of(c(keys, text_fields))) %>%
    rename_with(~paste0('expected_', .x), all_of(text_fields))
  data <- left_join(data, reference, by = keys, relationship = 'many-to-one')
  for (k in text_fields) {
    if (anyNA(data[[k]]) || anyNA(data[[paste0('expected_', k)]]) ||
        any(data[[k]] != data[[paste0('expected_', k)]])) stop('Material mismatch in ', k, '.')
  }
  completeness <- data %>% group_by(study, submission_id) %>%
    summarise(n = n(), unique_items = n_distinct(paste(case, role)),
              expected = first(expected_ratings), .groups = 'drop')
  if (any(completeness$n != completeness$expected | completeness$unique_items != completeness$expected))
    stop('Incomplete or duplicate rating sets. Resolve them explicitly before plotting.')
  people <- data %>% distinct(study, submission_id, prolific_pid)
  if (anyDuplicated(people[c('study', 'prolific_pid')]))
    stop('Multiple submissions from the same participant. Use a documented exclusions CSV.')
  data <- data %>% select(-starts_with('expected_')) %>%
    mutate(participant = paste(study, prolific_pid, sep = '::'), data_kind = 'production')
  if (expected_mode != 'production') data$data_kind <- 'sandbox validation'
  list(ratings = data, import_audit = audit)
}

simulate_ratings <- function(catalog, seed = 20261028) {
  # Illustrates the researcher's stated hypothesis with arbitrary simulated values.
  # These values are not estimates, evidence, or fitted predictions.
  set.seed(seed)
  rows <- list(); ix <- 0L
  for (study in catalog$studies$study) {
    cells <- catalog$allocation %>% filter(.data$study == .env$study) %>%
      distinct(condition, verb_condition, target)
    for (j in seq_len(nrow(cells))) {
      cell <- cells[j, ]; assigned <- catalog$allocation %>%
        filter(.data$study == .env$study, condition == cell$condition)
      for (p in seq_len(cell$target)) {
        pid <- paste('MOCK', study, cell$condition, p, sep = '-')
        person_shift <- rnorm(1, 0, .5)
        targets <- inner_join(assigned %>% select(study, case, variant, verb_condition),
                               catalog$targets, by = c('study', 'case', 'variant', 'verb_condition'))
        for (k in seq_len(nrow(targets))) {
          t <- targets[k, ]
          focal <- t$candidate %in% c('direct', 'proximal')
          mean <- if (focal) 5.9 else if (t$construction == 'cause') 5.8 else 3.0
          if (cell$verb_condition == 'thin') {
            v <- match(t$variant, unique(catalog$versions$variant))
            mean <- if (focal) 5.8 else if (t$construction == 'cause') 5.8 else
              5.0 + c(-.2, .4, -.5, .1)[(v - 1) %% 4 + 1]
          }
          ix <- ix + 1L
          rows[[ix]] <- t %>% mutate(submission_id = pid, participant = paste(study, pid, sep = '::'),
                                    condition = cell$condition,
                                    rating = pmin(7, pmax(1, round(rnorm(1, mean + person_shift, 1.0)))),
                                    rt = 1500, data_kind = 'mock')
        }
      }
    }
  }
  bind_rows(rows)
}

bootstrap_mean <- function(x, B = 2000) {
  if (!length(x)) return(tibble(n = 0L, mean = NA_real_, low = NA_real_, high = NA_real_))
  interval <- if (length(x) >= 2) quantile(replicate(B, mean(sample(x, length(x), replace = TRUE))),
                                          c(.025, .975), names = FALSE) else c(NA_real_, NA_real_)
  tibble(n = length(x), mean = mean(x), low = interval[1], high = interval[2])
}

summarise_ratings <- function(data, B = 2000, seed = 481) {
  set.seed(seed)
  data %>% group_by(study, case, variant, verb_condition, candidate, construction) %>%
    group_modify(~bootstrap_mean(.x$rating, B)) %>% ungroup()
}

comparison_rows <- function(data, version) {
  data %>% filter(study == version$study, case == version$case,
                   (verb_condition == 'thin' & variant == version$variant) |
                   (verb_condition == 'thick' & variant == version$thick_variant))
}

contrast_rows <- function(data, versions, B = 2000, seed = 928) {
  # Within-person cause gaps retain pairing. Thick/thin participants are independent.
  set.seed(seed)
  result <- bind_rows(lapply(seq_len(nrow(versions)), function(i) {
    v <- versions[i, ]; d <- comparison_rows(data, v)
    focal <- if (v$study == 'Chains') 'proximal' else 'direct'
    other <- if (v$study == 'Chains') 'distal' else if (v$study == 'Absences') 'absence' else 'fact'
    paired <- d %>% select(participant, verb_condition, construction, candidate, rating) %>%
      pivot_wider(names_from = candidate, values_from = rating)
    if (!all(c(focal, other) %in% names(paired))) return(tibble())
    paired$gap <- paired[[focal]] - paired[[other]]
    bind_rows(lapply(c('lexical', 'cause'), function(form) {
      thick <- paired$gap[paired$verb_condition == 'thick' & paired$construction == form]
      thin <- paired$gap[paired$verb_condition == 'thin' & paired$construction == form]
      if (!length(thick) || !length(thin)) return(tibble())
      draws <- if (min(length(thick), length(thin)) >= 2)
        replicate(B, mean(sample(thin, length(thin), TRUE)) - mean(sample(thick, length(thick), TRUE))) else NA_real_
      ci <- if (all(is.na(draws))) c(NA_real_, NA_real_) else quantile(draws, c(.025, .975), names = FALSE)
      tibble(study = v$study, case = v$case, variant = v$variant, construction = form,
             thick_gap = mean(thick), thin_gap = mean(thin), gap_difference = mean(thin) - mean(thick),
             low = ci[1], high = ci[2], n_thick = length(thick), n_thin = length(thin))
    }))
  }))
  if (!ncol(result)) return(tibble(study = character(), case = character(), variant = character(),
                                  construction = character(), thick_gap = double(), thin_gap = double(),
                                  gap_difference = double(), low = double(), high = double(),
                                  n_thick = integer(), n_thin = integer()))
  result
}

construction_advantage <- function(data, versions, B = 2000, seed = 615) {
  # For each participant and causal subject, subtract lexical from cause + verb.
  # Thick/thin comparisons then resample these paired differences independently.
  set.seed(seed)
  boosts <- contrasts <- list()
  for (i in seq_len(nrow(versions))) {
    v <- versions[i, ]
    d <- comparison_rows(data, v) %>%
      select(participant, verb_condition, candidate, construction, rating) %>%
      pivot_wider(names_from = construction, values_from = rating)
    if (!all(c('cause', 'lexical') %in% names(d))) next
    d <- mutate(d, boost = cause - lexical)
    boosts[[i]] <- d %>% group_by(verb_condition, candidate) %>%
      group_modify(~bootstrap_mean(.x$boost, B)) %>% ungroup() %>%
      mutate(study = v$study, case = v$case, variant = v$variant)
    contrasts[[i]] <- bind_rows(lapply(unique(d$candidate), function(cand) {
      thick <- d$boost[d$candidate == cand & d$verb_condition == 'thick']
      thin <- d$boost[d$candidate == cand & d$verb_condition == 'thin']
      if (!length(thick) || !length(thin)) return(tibble())
      ci <- c(NA_real_, NA_real_)
      if (min(length(thick), length(thin)) >= 2) ci <- quantile(replicate(B,
        mean(sample(thick, length(thick), TRUE)) - mean(sample(thin, length(thin), TRUE))),
        c(.025, .975), names = FALSE)
      tibble(study = v$study, case = v$case, variant = v$variant, candidate = cand,
             thick_boost = mean(thick), thin_boost = mean(thin),
             thick_minus_thin_boost = mean(thick) - mean(thin), low = ci[1], high = ci[2],
             n_thick = length(thick), n_thin = length(thin))
    }))
  }
  empty_boosts <- tibble(verb_condition = character(), candidate = character(), n = integer(),
                         mean = double(), low = double(), high = double(),
                         study = character(), case = character(), variant = character())
  empty_contrasts <- tibble(study = character(), case = character(), variant = character(),
                            candidate = character(), thick_boost = double(), thin_boost = double(),
                            thick_minus_thin_boost = double(), low = double(), high = double(),
                            n_thick = integer(), n_thin = integer())
  list(boosts = bind_rows(empty_boosts, bind_rows(boosts)),
       contrasts = bind_rows(empty_contrasts, bind_rows(contrasts)))
}
