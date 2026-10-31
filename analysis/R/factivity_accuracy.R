# Public material metadata and participant-level statistics for the accuracy pilot.
# No results or participant data are stored in this source file.
read_accuracy_catalog <- function(root) {
  study <- 'FactivityAccuracy'
  path <- file.path(root,'Pilots/FactivityAccuracy/collection')
  raw <- paste(readLines(file.path(path,'js/materials.js'),warn=FALSE),collapse='\n')
  json <- substr(raw,regexpr('\\{\n',raw)[1],regexpr(';\nif\\(typeof module',raw)[1]-1)
  material <- fromJSON(json,simplifyVector=FALSE)
  allocation <- fromJSON(file.path(path,'allocation.json'),simplifyVector=FALSE)
  # Same order as the materials document, placing each addition beside its family.
  spec <- tribble(~case,~variant,~doc_heading,~thin_label,~thick_label,
    'sewer_system','stop_working','Sewer system stop working','stop working','flood',
    'sewer_system','overwhelm','Sewer system overwhelm','overwhelm','flood',
    'phone','die_kill','Phone app and software defect','die / kill','heat up',
    'phone','turn_off','Phone texting and manufacturing defect','turn off','heat up',
    'phone','ruin','Phone texting and manufacturing defect: ruin','ruin','heat up',
    'scooter','stop','Scooter stop','stop','crash',
    'scooter','power_down','Scooter power down','power down','crash',
    'scooter','disconnect_battery','Scooter disconnect from battery','disconnect: battery','crash',
    'scooter','disconnect_network','Scooter disconnect from rental network','disconnect: rental network','crash')
  find <- function(f,v) Filter(function(c)c$case==f&&c$variant==v,material$cases)[[1]]
  signature <- function(c) toJSON(list(c$setup,c$endings$thick,
    lapply(c$targets[grepl('_thick$',names(c$targets))],`[[`,'text')),auto_unbox=TRUE)
  versions <- bind_rows(lapply(seq_len(nrow(spec)),function(i){
    v<-spec[i,]; ref<-find(v$case,v$variant)
    collected<-unique(vapply(Filter(function(c)c$verb_condition=='thick',allocation$cells),
                              function(c)c$variants[[v$case]],''))
    matches<-collected[vapply(collected,function(x)signature(find(v$case,x))==signature(ref),TRUE)]
    stopifnot(length(matches)==1)
    mutate(v,study=study,thick_variant=matches[1],context_match=TRUE,
           thick_heading=paste(v$case,matches[1],v$thick_label,sep=' | '),comparison_note='')
  }))
  targets<-bind_rows(lapply(material$cases,function(c)bind_rows(lapply(names(c$targets),function(k){
    role<-sub('_(thick|thin)$','',k);t<-c$targets[[k]]
    tibble(study=study,case=c$case,variant=c$variant,verb_condition=sub('^.*_','',k),
      role=role,candidate=sub('_.*$','',role),construction=sub('^.*_','',role),
      story_setup=c$setup,story_ending=c$endings[[sub('^.*_','',k)]],sentence=t$text,
      source_row=t$source_row,source_row_key=t$row_key)
  }))))
  cells<-bind_rows(lapply(names(allocation$cells),function(code){
    c<-allocation$cells[[code]]
    tibble(study=study,condition=code,verb_condition=c$verb_condition,target=c$target,
           case=names(c$variants),variant=unlist(c$variants,use.names=FALSE))
  }))
  stopifnot(nrow(versions)==9,nrow(targets)==72,nrow(cells)==84)
  list(versions=versions,targets=targets,allocation=cells,
       studies=tibble(study=study,study_id='CAUSAL-VERBS-FACTIVITY-ACCUR-ZDDV',
         document_id='1fzADX1Wqx7z9KtDTh-fY845VSUWhwxykWHLNLK91LiE',expected_ratings=12))
}

accuracy_statistics <- function(ratings, versions, B=100000L,seed=20261031) {
  set.seed(seed)
  draw<-function(x)colMeans(matrix(sample(x,length(x)*B,TRUE),nrow=length(x)))
  difference<-function(a,b){
    interval<-quantile(draw(a)-draw(b),c(.025,.975),names=FALSE)
    test<-t.test(a,b,var.equal=FALSE)
    tibble(mean_a=mean(a),mean_b=mean(b),difference=mean(a)-mean(b),low=interval[1],high=interval[2],
           t=unname(test$statistic),df=unname(test$parameter),p=test$p.value,n_a=length(a),n_b=length(b))
  }
  p<-ratings %>% select(participant,case,variant,verb_condition,candidate,construction,rating) %>%
    pivot_wider(names_from=c(candidate,construction),values_from=rating) %>%
    mutate(fact_loss=fact_cause-fact_lexical,direct_loss=direct_cause-direct_lexical,
           specificity=fact_loss-direct_loss,lexical_subject_gap=direct_lexical-fact_lexical)
  metrics<-c('fact_lexical','direct_lexical','fact_cause','direct_cause','fact_loss','direct_loss','specificity','lexical_subject_gap')
  comparisons<-bind_rows(lapply(seq_len(nrow(versions)),function(i){
    v<-versions[i,]; z<-filter(p,case==v$case,
      (verb_condition=='thin'&variant==v$variant)|(verb_condition=='thick'&variant==v$thick_variant))
    a<-filter(z,verb_condition=='thin'); b<-filter(z,verb_condition=='thick')
    bind_rows(lapply(metrics,function(m){
      # Lexical advantage: thin minus thick. Construction and subject interactions:
      # thick minus thin, retaining pairing before comparing independent groups.
      reverse<-m %in% c('fact_loss','direct_loss','specificity','lexical_subject_gap')
      r<-if(reverse)difference(b[[m]],a[[m]])else difference(a[[m]],b[[m]])
      mutate(r,case=v$case,variant=v$variant,label=v$doc_heading,metric=m,
        thin=mean(a[[m]]),thick=mean(b[[m]]),n_thin=nrow(a),n_thick=nrow(b),
        direction=if(reverse)'thick minus thin' else 'thin minus thick')
    }))
  })) %>% group_by(metric) %>% mutate(p_holm=p.adjust(p,method='holm')) %>% ungroup()
  # Each participant contributes one value per family and three families equally.
  # Shared thick baselines are not expanded into repeated independent rows.
  people<-p %>% group_by(participant,verb_condition) %>% summarise(across(all_of(metrics),mean),.groups='drop')
  a<-filter(people,verb_condition=='thin'); b<-filter(people,verb_condition=='thick')
  overall<-bind_rows(lapply(metrics,function(m){
    reverse<-m %in% c('fact_loss','direct_loss','specificity','lexical_subject_gap')
    r<-if(reverse)difference(b[[m]],a[[m]])else difference(a[[m]],b[[m]])
    mutate(r,metric=m,thin=mean(a[[m]]),thick=mean(b[[m]]),direction=if(reverse)'thick minus thin' else 'thin minus thick')
  }))
  # Paired thick event-versus-fact lexical contrast.
  x<-b$lexical_subject_gap; test<-t.test(x,mu=0); q<-quantile(draw(x),c(.025,.975),names=FALSE)
  thick_subject<-tibble(difference=mean(x),low=q[1],high=q[2],t=unname(test$statistic),
                        df=unname(test$parameter),p=test$p.value,n=length(x))
  list(versions=comparisons,overall=overall,thick_subject=thick_subject,paired=p)
}
