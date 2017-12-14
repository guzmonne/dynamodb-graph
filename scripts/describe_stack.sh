#!/bin/bash

aws cloudformation describe-stacks \
  --stack-name dynamodb-graph |\
jq
