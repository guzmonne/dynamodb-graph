#!/bin/bash

aws cloudformation validate-template \
  --template-body file://template.yml |\
jq
