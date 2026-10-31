#!/usr/bin/env Rscript
# Execute the R Markdown analysis and figures without producing a report.
args<-commandArgs(trailingOnly=TRUE)
if(length(args)!=1)stop('Usage: Rscript analysis/render_accuracy.R <production Console ZIP>')
script<-sub('^--file=','',grep('^--file=',commandArgs(),value=TRUE)[1])
repo_root<-normalizePath(file.path(dirname(script),'..'));setwd(repo_root)
params<-list(input_file=normalizePath(args[1],mustWork=TRUE),bootstrap_draws=100000L,
             output_dir='analysis/output/factivity-accuracy')
lines<-readLines('analysis/factivity_accuracy.Rmd',warn=FALSE)
if(lines[1]=='---')lines<-lines[-seq_len(which(seq_along(lines)>1&lines=='---')[1])]
code<-tempfile(fileext='.R')
invisible(knitr::purl(text=lines,output=code,quiet=TRUE,documentation=0))
tryCatch(source(code,local=environment()),finally=unlink(code))
