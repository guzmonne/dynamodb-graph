# Dynamo-Graph

This is a library aimed to work with DynamoDB as if it was a Graph. The idea
came from the "Advanced Design Patterns for Amazon DynamoDB (DAT403-R)" talk
from Rick Houlihan on 2017 AWS re:Invent conference. Close to the end he
describes a way to use a DynamoDB table to represent a graph. I found that idea
very interesting, so I wanted to create a library that would let me interact
with that kind of table structure. I added only two things to the pattern
presented on this talk:

1. The concept of a `tenant`.
2. A way to handle the amount of GSI partitions to use.

So, each node can belong to a `tenant` by concatenating the random ID of the
node (a cuid in this case), with the `tenant` id (also a CUID). The GSI Keys are
also prepended with the tenant ID, so that you can check for the data only in
the proper GSI partitions.

To control the number of GSI Keys you can use the `maxGSIK` option, when calling
this funcions. I plan to create a library on top of this one, that can keep
track of different `maxGSIK` values.

## DynamoDB table.

The schema for the DynamoDB table, written as a CloudFormation template is the
following:

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Resources:
  Graph:
    Type: "AWS::DynamoDB::Table"
    Properties:
      AttributeDefinitions:
        -
          AttributeName: "Node"
          AttributeType: "S"
        -
          AttributeName: "Type"
          AttributeType: "S"
        -
          AttributeName: "Data"
          AttributeType: "S"
        -
          AttributeName: "GSIK"
          AttributeType: "S"
      KeySchema:
        -
          AttributeName: "Node"
          KeyType: "HASH"
        -
          AttributeName: "Type"
          KeyType: "RANGE"
      ProvisionedThroughput:
        ReadCapacityUnits: "1"
        WriteCapacityUnits: "1"
      TableName: "GraphExample"
      GlobalSecondaryIndexes:
        -
          IndexName: "ByType"
          KeySchema:
            -
              AttributeName: "GSIK"
              KeyType: "HASH"
            -
              AttributeName: "Type"
              KeyType: "RANGE"
          Projection:
            NonKeyAttributes:
              - "Data"
              - "Target"
              - "MetaData"
            ProjectionType: "INCLUDE"
          ProvisionedThroughput:
            ReadCapacityUnits: "2"
            WriteCapacityUnits: "2"
        -
          IndexName: "ByData"
          KeySchema:
            -
              AttributeName: "GSIK"
              KeyType: "HASH"
            -
              AttributeName: "Data"
              KeyType: "RANGE"
          Projection:
            NonKeyAttributes:
              - "Type"
              - "Target"
              - "MetaData"
            ProjectionType: "INCLUDE"
          ProvisionedThroughput:
            ReadCapacityUnits: "2"
            WriteCapacityUnits: "2"
```

On the `scripts` folder you'll find scripts to implement this table on your AWS
account.

All the data is stored as strings. Which doesn't mean that you can't store other
data on the Table. You just have to encode it first. This library takes care of
thar for you.

## Getting Started

Install the library on your project using `npm` or `yarn`.

```
npm install --save dynamodb-graph

yarn install dynamodb-graph
```

Then you can import it to your project using `require`, and you must initialize
it before you can use it, by passing the DynamoDB DocumentClient driver and
the table name. The table name can also be taken from an environment table
called `TABLE_NAME`.

```javascript
var AWS = require('aws-sdk');
var dynamoGraph = require('dynamodb-graph');

var db = new AWS.DynamoDB.DocumentClient();
var table = process.env.TABLE_NAME;

var dg = dynamoGraph({ db, table });
```

Each function returns a promise.

## Documentation

**TODO**

I tried to include information on each function as a JSDoc comment. I plan in
the future to transform it into a proper documentation page. I wish there was
something like `Sphix` for JavaScript.

There is also a `types.js` file with information on the types of most of the
consumable interfaces.

## Test

I am using `jest` to test the library. So, just clone the repo, install the
dependencies, and run `yarn test` or `npm run test` to run them.

```
git clone git@github.com:guzmonne/dynamodb-graph.git
yarn install
yarn test
```

## Licence

MIT
