#/bin/bash

echo ">>> Validating template."
./validate_stack.sh

echo ">>> Creating stack"
aws cloudformation create-stack \
  --stack-name dynamodb-graph \
  --template-body file://template.yml |\
jq

echo ">>> Waiting for stack to complete."
sleep 30
echo ">>> Describing created stack."
./describe_stack.sh
