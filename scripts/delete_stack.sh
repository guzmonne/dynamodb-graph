#!/bin/bash

aws cloudformation delete-stack --stack-name dynamodb-graph | jq
