# DynamoDB-Graph

This is a library aimed to work with DynamoDB as if it was a Graph. The idea came from the "Advanced Design Patterns for Amazon DynamoDB (DAT403-R)" talk from Rick Houlihan on 2017 AWS re:Invent conference. Close to the end, he describes a way to use a DynamoDB table to represent a directed graph. I found that notion very interesting, so I wanted to create a library that would abstract the details of the graph representation, on top of the AWS SDK.

As a perk, I added three notions of my own:

1. The concept of a `tenant`.
2. A way to handle the amount of GSI partitions to use.
3. Storing the data in two separate keys, depending on wether it's a string, or a number.

So, each node can belong to a `tenant` by concatenating the random ID of the node, with the `tenant` id. The GSI Keys are also prepended with the tenant ID, so that you can check for the data only in the proper GSI partitions. Doing this has another aditional benefit: applying IAM policies to users to allow access only on rows whose `hash` key begins with the `tenant`. That way, you may have multiple users using the same table, without access to the data of the other tenants.

To control the number of GSI Keys you can use the `maxGSIK` option. To allow for a normal distribution on the keys, you should work with mutltiples of 10 for the `maxGSIK`. This will allow to grow this value in the future, while still providing good distribution between the GSI partitions.

I also added another GSI key to each element, called `TGSIK`. This attribute includes the value of the node `type`, plus the `GSIK`. Indexing on this key, sorted by data, allows to perform queries over the `type` and the `data`, without needing to use a `FilterExpression`, or creating custom logic. I am still debating if this a good call, but for now, its there.

At first I implemented this design storing the data of the node on a `Data` attribute of type `String`. This was good since I could stringify any type of data and store it there. The problem happens when you want to query the data. Since the data is stored as a string, you loose all the number operators. So, I modified the `create` functions to check wether the data is a string, or a number. If it is a number, then it stores it as a `Number` attribute, and a `String` attibute otherwise. To avoid having the user deal with this functionality, all the `query` operations parses the results, and returns them on a `Data` attribute. The details are handled by the library. This separation of types allow for a finer query system, in my opinion.

The downside of this approach is that this table implementation uses all 5 possible GSI. But, I think most usecases can be solved using the 5 provided by this implementation.

**Important Note:** This library was built on top of Node 6.10.3, because I wanted to use it on AWS Lambda, and at the moment is the highest version supported. It should work on higher versions, but I haven't tried it.

## DynamoDB table.

The schema for the DynamoDB table, written as a CloudFormation template is the following:

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
          AttributeName: "String"
          AttributeType: "S"
        -
          AttributeName: "Number"
          AttributeType: "N"
        -
          AttributeName: "GSIK"
          AttributeType: "S"
        -
          AttributeName: "TGSIK"
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
            ProjectionType: "ALL"
          ProvisionedThroughput:
            ReadCapacityUnits: "2"
            WriteCapacityUnits: "2"
        -
          IndexName: "ByNumber"
          KeySchema:
            -
              AttributeName: "GSIK"
              KeyType: "HASH"
            -
              AttributeName: "Number"
              KeyType: "RANGE"
          Projection:
            ProjectionType: "ALL"
          ProvisionedThroughput:
            ReadCapacityUnits: "2"
            WriteCapacityUnits: "2"
        -
          IndexName: "ByString"
          KeySchema:
            -
              AttributeName: "GSIK"
              KeyType: "HASH"
            -
              AttributeName: "String"
              KeyType: "RANGE"
          Projection:
            ProjectionType: "ALL"
          ProvisionedThroughput:
            ReadCapacityUnits: "2"
            WriteCapacityUnits: "2"
        -
          IndexName: "ByTypeAndNumber"
          KeySchema:
            -
              AttributeName: "TGSIK"
              KeyType: "HASH"
            -
              AttributeName: "Number"
              KeyType: "RANGE"
          Projection:
            ProjectionType: "ALL"
          ProvisionedThroughput:
            ReadCapacityUnits: "2"
            WriteCapacityUnits: "2"
        -
          IndexName: "ByTypeAndString"
          KeySchema:
            -
              AttributeName: "TGSIK"
              KeyType: "HASH"
            -
              AttributeName: "String"
              KeyType: "RANGE"
          Projection:
            ProjectionType: "ALL"
          ProvisionedThroughput:
            ReadCapacityUnits: "2"
            WriteCapacityUnits: "2"
```

On the `scripts` folder you'll find scripts to implement this table on your AWS account.

## Getting Started

Install the library on your project using `npm` or `yarn`.

```
npm install --save dynamodb-graph

yarn install dynamodb-graph
```

Then you can import it to your project, and you must initialize it before you can start using it. Basically, you musth provide the DynamoDB DocumentClient driver, table name, tenant key, and `maxGSIK` value. The table name can also be taken from an environment table called `TABLE_NAME`. I am considering letting other important options be configured the same way.

```javascript
var AWS = require('aws-sdk');
var dynamodbGraph = require('dynamodb-graph');

var documentClient = new AWS.DynamoDB.DocumentClient();
var maxGSIK = 10;
var table = process.env.TABLE_NAME;
var tenant = 'Client#123';

var g = dynamodbGraph({ documentClient, maxGSIK, table, tenant });
```

Each function returns a promise, exept the ones who create items.

## Documentation

**TODO**

I tried to include information on each function as a JSDoc comment. I plan in the future to transform it into a proper documentation page. I wish there was something like `Sphix` for JavaScript.

## Test

I am using `jest` to test the library, and Node **6.10.3**. So, just clone the repo, install the dependencies, and run `yarn test` or `npm run test` to run them.

```
git clone git@github.com:guzmonne/dynamodb-graph.git
yarn install
yarn test
```

## Licence

MIT
