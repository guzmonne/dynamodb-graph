# DynamoDB-Graph

## Introduction

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

##DynamoDB table.

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
      TableName: "GraphTable"
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
          IndexName: "ByData"
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
          IndexName: "ByTypeAndData"
          KeySchema:
            -
              AttributeName: "Type"
              KeyType: "HASH"
            -
              AttributeName: "Data"
              KeyType: "RANGE"
          Projection:
            ProjectionType: "ALL"
          ProvisionedThroughput:
            ReadCapacityUnits: "2"
            WriteCapacityUnits: "2"
```

On the `scripts` folder you'll find scripts to implement this table on your AWS account. You can call them directly or using `yarn` or `npm` tasks:

```
yarn validate:stack // Validates the template.
yarn delete:stack   // Deletes the current stack.
yarn describe:stack // Describes the current stack status and info.
yarn deploy:stack   // Deploys the stack to your configured AWS account.
```

## Getting Started

Install the library on your project using npm or yarn.

```
// NPM
npm install --save dynamodb-graph
// YARN
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

## Playground

To be able to test the library I have provided some scripts that work on existing data. More specifically, ["The Simpsons" by the data](https://www.kaggle.com/wcukierski/the-simpsons-by-the-data). You can go to the link, and download it from [Kaggle](https://www.kaggle.com). Then `unzip` the file inside the `scripts` folder, and run the `seed_local_table.js` script. Then go take a cup of coffee, a sandwich, and catch up on your current series, cause it's gonna take a long time to load. I did my best to show the progress of the upload so you know that something is going on.

After all the data is up, you can run the script `playground.js` and see the library in action with some examples I come up with. More examples are welcomed.

Lastly, I left another script called `repl.js`, which contains the library, an instantiated `documentClient` driver, and some other useful functions to use on the node `repl`. Just open up a `node` console and run:

```
var {g, documentClient, dynamo, log, scan} = require('./scripts/repl.js')
```

Or something like that.

**Important note**: both scripts can be used against DynamoDB itself, though I wouldn't suggest to do so. I won't take responsability for any charges generated on your account while using this library. Instead, you should run a local instance of DynamoDB. To my knowledge, there are two alternatives:

1. [Dynalite](https://github.com/mhart/dynalite), from [Michael Hart](https://github.com/mhart).
2. [Official DynamoDB local version](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html).

Any one of those will work fine, just be sure to run it on `port` **8989** or to set the `ENDPOINT` environment variable pointed to your local process, when running all scripts.

## Documentation

### Initialize the library

```javascript
var g = require('dynamodb-graph')({
  documentClient, // DynamoDB DocumentClient driver.
  maxGSIK: 10, // Max GSIK value. Multiples of 10 recommended.
  tenant: 'Simpsons', // Tenant identifier. Defaults to ''.
  table: TABLE_NAME // DynamoDB table name. Can be provided as env variable.
});
```

### Create methods

#### Create node

We can provide our own Node identifier, or let the library create a random CUID value. To create a new node, we call the `create` function passing the data to be stored on the node. The data must be a string, if it is not, it will throw an Error. If you want to store numbers, booleans, or any other kind of object, you must stringify it before saving it to the table.

```javascript
var node = 'Character#2';
var type = 'Character';
var data = 'Homer Simpson';

g
  .node({ node, type })
  .create({ data })
  .then(result => {
    console.log(result.Item);
    /**
     * {
     *    Node: 'Simpsons#Character#2',
     *    Type: 'Character',
     *    Data: 'Homer Simpson',
     *    GSIK: 'Simpsons#9',
     *    Target: 'Simpsons#Character#2'
     * }
     */
  });
```

If the Node `id` is not set when calling the `node()` method, then a random
`cuid` will be configured on it. You can check this value by accessing the Node
`id` property.

```javascript
var type = 'Character';
var node = g.node({ type });

console.log(node.id);
// cjc1bicq30000aetcfkub88p7
```

Running the `create` method on that node will create it with the random `cuid` selected as Node `id`.

```javascript
var data = 'Homer Simpson';
node.create({ data }).then(result => {
  console.log(result.Item);
  /**
   * {
   *    Node: 'Simpsons#cjc1bicq30000aetcfkub88p7',
   *    Type: 'Character',
   *    Data: 'Homer Simpson',
   *    GSIK: 'Simpsons#9',
   *    Target: 'Simpsons#cjc1bicq30000aetcfkub88p7'
   * }
   */
});
```

#### Create edge

Here we are connecting a character Node to an episode Node. To do that, we select the node and type where we want to store the edge, and then we call the `create` method, passing the `target` id and the data to be stored.

```javascript
var node = 'Character#2';
var type = 'StarredIn';
var target = 'Episode#1';
var data = 'Bart the Genius';

g
  .node({ node, type })
  .create({ target, data })
  .then(result => {
    console.log(result.Item);
    /**
     * {
     *    Node: 'Simpsons#Character#2',
     *    Type: 'StarredIn',
     *    Data: 'Bart the Genius',
     *    GSIK: 'Simpsons#9',
     *    Target: 'Simpsons#Episode#1'
     * }
     */
  });
```

#### Create property

A property is like an edge, but without a target. It allows to store additional information about the node, that will be stored on the same partitions, and which don't require the creation or existance of another node.

To create them we call the `create` function with the `prop` data to be stored.

```javascript
var node = 'Character#2';
var type = 'Gender';
var prop = 'm';

g
  .node({ node, type })
  .create({ prop })
  .then(result => {
    console.log(result.Item);
    /**
     * {
     *    Node: 'Simpsons#Character#2',
     *    Type: 'Gender',
     *    Data: 'm',
     *    GSIK: 'Simpsons#9',
     * }
     */
  });
```

### Get methods

#### Get a single node, edge, or prop.

Use the `get` method, after providing the Node `id` and `type` to the `node()` function.

```javascript
var node = 'Character#2';
var type = 'Character';

g
  .node({ node, type })
  .get()
  .then(result => {
    console.log(result.Item);
    /**
     * {
     *    Node: 'Simpsons#Character#2',
     *    Type: 'Character',
     *    Data: 'Homer Simpson',
     *    GSIK: 'Simpsons#9',
     *    Target: 'Simpsons#Character#2'
     * }
     */
  });
```

#### Get all the node edges or props.

To get all the Node edges or props, we use the `get.edges()` or `get.props()` method respectively, after providing the node `id`, to the `node` function.

```javascript
var node = 'Character#2';
var type = 'Character';

// -- Edges --
g
  .node({ node, type })
  .get.edges()
  .then(result => {
    console.log(result.Items);
    /**
     * [{
     *    Node: 'Simpsons#Character#2',
     *    Type: 'StarredIn',
     *    Data: 'Bart the Genius',
     *    GSIK: 'Simpsons#9',
     *    Target: 'Simpsons#Episode#1'
     * }]
     */
  });
// -- Props --
g
  .node({ node, type })
  .get.props()
  .then(result => {
    console.log(result.Items);
    /**
     * [{
     *    Node: 'Simpsons#Character#2',
     *    Type: 'Gender',
     *    Data: 'm',
     *    GSIK: 'Simpsons#9',
     * }]
     */
  });
```

#### Get a list of props or edges.

Both the `get.edges` and `get.props` methods accept an options object to modify their behaviour. If we pass in a list of `types`, it will return all the items with those types on the `node`. If a `type` is also provided when calling the `node()` method it will also be returned.

```javascript
var node = 'Character#2';

// -- Edges --
g
  .node({ node })
  .get.edges({ types: ['StarredIn'] })
  .then(result => {
    console.log(result.Items);
    /**
     * [{
     *    Node: 'Simpsons#Character#2',
     *    Type: 'StarredIn',
     *    Data: 'Bart the Genius',
     *    GSIK: 'Simpsons#9',
     *    Target: 'Simpsons#Episode#1'
     * }]
     */
  });
// -- Props --
var type = 'Character';

g
  .node({ node, type })
  .get.props({ types: ['Gender'] })
  .then(result => {
    console.log(result);
    /**
     * Note that now `result` is a **list**.
     * [{
     *    Node: 'Simpsons#Character#2',
     *    Type: 'Character',
     *    Data: 'Homer Simpson',
     *    GSIK: 'Simpsons#9',
     *    Target: 'Simpsons#Character#2'
     * }, {
     *    Node: 'Simpsons#Character#2',
     *    Type: 'Gender',
     *    Data: 'm',
     *    GSIK: 'Simpsons#9',
     * }]
     */
  });
```

### Query methods

#### Query items by Node, sorted by Type

[DynamoDB Expression Operators and Functions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.OperatorsAndFunctions.html)

We can query over the props and edges types of a node by providing the `query` function with the Node `id`, and a `where` claus object. The `where` object, should contain only a key called `type`, pointing to an object with just one key, corresponding to a valid DynamoDB query operator, and its value. The value must be a string for most operators. except the `between` and `in` operator, which requires an array of two or more strings.

```javascript
var node = 'Character#2';
var operator = 'begins_with';
var value = 'Line';

g.query({ node, where: { type: { [operator]: value } } }).then(result => {
  console.log(result.Items);
  /**
   * [{
   *    Node: 'Simpsons#Character#2',
   *    Type: 'Line#265#Episode#32',
   *    Data: 'Bart didn't get one vote?! Oh, this is...'
   *    GSIK: 'Simpsons#9'
   *    Target: 'Simpsons#Line#9605'
   * }, {
   *    Node: 'Simpsons#Character#2',
   *    Type: 'Line#114#Episode#33',
   *    Data: 'Marge! What are you doing?...'
   *    GSIK: 'Simpsons#9'
   *    Target: 'Simpsons#Line#9769'
   * }]
   */
});
```

We can add another condition to the query using the `and` object, which should be constructed just as the `where` object, but with a key called `data` instead of `type`. Note that this aditional condition will be applied as a `FilterExpression`, which means, that the condition will be used after all the items that match the first conditions are returned.

```javascript
var node = 'Character#2';
var operator = 'begins_with';
var value = 'Line';
var name = 'Bart';

g
  .query({
    node,
    where: { type: { [operator]: value } },
    and: { data: { [operator]: name } }
  })
  .then(result => {
    console.log(result.Items);
    /**
     * [{
     *    Node: 'Simpsons#Character#2',
     *    Type: 'Line#265#Episode#32',
     *    Data: 'Bart didn't get one vote?! Oh, this is...'
     *    GSIK: 'Simpsons#9'
     *    Target: 'Simpsons#Line#9605'
     * }]
     */
  });
```

#### Query items by Node, sorted by Data

Just as with types, we can query the props and edges of a node by using the `where` object, configured with a `data` object.

```javascript
var node = 'Character#2';
var operator = 'begins_with';
var value = 'Bart';

g.query({ node, where: { data: { [operator]: value } } }).then(result => {
  console.log(result.Items);
  /**
   * [{
   *    Node: 'Simpsons#Character#2',
   *    Type: 'Line#265#Episode#32',
   *    Data: 'Bart didn't get one vote?! Oh, this is...'
   *    GSIK: 'Simpsons#9'
   *    Target: 'Simpsons#Line#9605'
   * }, {
   *    Node: 'Simpsons#Character#2',
   *    Type: 'Line#140#Episode#34',
   *    Data: 'Bart! Stop it!'
   *    GSIK: 'Simpsons#9'
   *    Target: 'Simpsons#Line#10134'
   * }]
   */
});
```

We can add another condition to the query using the `and` object, which should be constructed just as the `where` object, but with a key called `type` instead of `data`. Note that this aditional condition will be applied as a `FilterExpression`, which means, that the condition will be used after all the items that match the first conditions are returned.

```javascript
var node = 'Character#2';
var operator = 'begins_with';
var value = 'Bart';

g
  .query({
    node,
    where: { type: { [operator]: value } },
    and: { data: { contains: 'Episode#34' } }
  })
  .then(result => {
    console.log(result.Items);
    /**
     * [{
     *    Node: 'Simpsons#Character#2',
     *    Type: 'Line#140#Episode#34',
     *    Data: 'Bart! Stop it!'
     *    GSIK: 'Simpsons#9'
     *    Target: 'Simpsons#Line#10134'
     * }]
     */
  });
```

#### Handling numbers

As mentioned before, the Node data must be stored as a string. A simple way to store numbers could be converting them to a string. For example: `4` to `'4'`. The problem with this approach is that all the numeric query operators will become useless.

A better approach to resolve this issue is by storing the numbers as hexadecimal strings. Here is a snippet on how to store a number as a 4 byte hexadecimal word:

```javascript
function numToFloat32Hex(value) {
  var buffer = Buffer.alloc(4);
  buffer.writeFloatLE(value, 0);
  return buffer.toString('hex');
}

function float64HexToNum(value) {
  return Buffer(value, 'hex').readFloatLE(0);
}
```

If you need more precision you can check out [this article](http://www.danvk.org/hex2dec.html) by [danvk](http://www.danvk.org). There is even an [npm module](https://www.npmjs.com/package/hex2dec) if you want to import it to your project.

#### Query items by GSIK, sorted By Type

To query the Node `types`, regardless of the Node `id`, we can leverage the `GSIK` index. By default, the queries will be run over each `GSIK` possible value, and will return 100 items from each.

The interface is the same as before, only now we don't specify the value of the node. Only the `where` object is necessary.

```javascript
var operator = '=';
var value = 'Character';

g.query({ where: { type: { [operator]: value } } }).then(result => {
  console.log(result.Items);
  /**
   * [{
   *    Node: 'Simpsons#Character#2',
   *    Type: 'Character',
   *    Data: 'Homer Simpson'
   *    GSIK: 'Simpsons#9'
   *    Target: 'Simpsons#Character#2'
   * }, {
   *    Node: 'Simpsons#Character#8',
   *    Type: 'Character',
   *    Data: 'Bart Simpson'
   *    GSIK: 'Simpsons#5'
   *    Target: 'Simpsons#Character#8'
   * }]
   */
});
```

As before, the results can be filtered further by using an `and` object whith the `data` key defined. This will uses the `FilterCondition` expression, which will discard any item that doesn't pass the filter, after the query operation is done.

```javascript
var operator = '=';
var value = 'Character';

g
  .query({
    node,
    where: { type: { [operator]: value } },
    and: { data: { contains: 'Bart' } }
  })
  .then(result => {
    console.log(result.Items);
    /**
     * [{
     *    Node: 'Simpsons#Character#8',
     *    Type: 'Character',
     *    Data: 'Bart Simpson'
     *    GSIK: 'Simpsons#5'
     *    Target: 'Simpsons#Character#8'
     * }]
     */
  });
```

#### Query by GSIK sorted By Type

Just as with the `types`, we can use the `GSIK` to query by `data`. And the interface to do it is very similar. You only have to change `type` for `data`.

```javascript
var operator = 'contains';
var value = 'Simpson';

g.query({ where: { data: { [operator]: value } } }).then(result => {
  console.log(result.Items);
  /**
   * [{
   *    Node: 'Simpsons#Character#2',
   *    Type: 'Character',
   *    Data: 'Homer Simpson'
   *    GSIK: 'Simpsons#9'
   *    Target: 'Simpsons#Character#2'
   * }, {
   *    Node: 'Simpsons#Location#5',
   *    Type: 'Location',
   *    Data: 'Simpson Home'
   *    GSIK: 'Simpsons#0'
   *    Target: 'Simpsons#Location#5'
   * }, {
   *    Node: 'Simpsons#Character#8',
   *    Type: 'Character',
   *    Data: 'Bart Simpson'
   *    GSIK: 'Simpsons#5'
   *    Target: 'Simpsons#Character#8'
   * }]
   */
});
```

Now we can use the `and` object whith the `type` key defined, to filter the `types` that don't match our needs. This will uses the `FilterCondition` expression, which will discard any item that doesn't pass the filter, after the query operation is done.

```javascript
var operator = 'contains';
var value = 'Simpson';

g
  .query({
    node,
    where: { data: { [operator]: value } },
    and: { type: { '=': 'Location' } }
  })
  .then(result => {
    console.log(result.Items);
    /**
     * [{
     *    Node: 'Simpsons#Location#5',
     *    Type: 'Location',
     *    Data: 'Simpson Home'
     *    GSIK: 'Simpsons#0'
     *    Target: 'Simpsons#Location#5'
     * }]
     */
  });
```

#### GSIK handling

In order to control the `GSIK` being queried, you can provide a `gsik` object. This object must contain some of this keys:

* `startGSIK`: Start value of the `GSIK`. Equals 0 by default.
* `endGSIK`: End value of the `GSIK`. Equals `maxGSIK - 1` by default. **Must be larger than `startGSIK`**.
* `listGSIK`: A list of GSIK to use, provided as a list of numbers. Only the GSIK provided on the list will be used. If `startGSIK` or `endGSIK` are also defined, they will not be considered.
* `limit`: Number of items to get per `GSIK`.

```javascript
var operator = '=';
var value = 'Character';

g
  .query({
    where: { type: { [operator]: value } },
    gsik: { listGSIK: [9], limit: 1 }
  })
  .then(result => {
    console.log(result.Items);
    /**
     * [{
     *    Node: 'Simpsons#Character#2',
     *    Type: 'Character',
     *    Data: 'Homer Simpson'
     *    GSIK: 'Simpsons#9'
     *    Target: 'Simpsons#Character#2'
     * }]
     */
  });
```

### Update method

To update a node value you just overwrite it by creating a new node with the same Node `id` and `type`.

```javascript
var node = 'Character#2';
var type = 'Character';
var data = 'homer simpson';

var Node = g.node({ node, type });

Node.create({ data })
  .then(result => {
    console.log(result.Item);
    /**
     * {
     *    Node: 'Simpsons#Character#2',
     *    Type: 'Character',
     *    Data: 'homer simpson',
     *    GSIK: 'Simpsons#9',
     *    Target: 'Simpsons#Character#2'
     * }
     */
    return Node.create({ data: 'Homer Simpson' });
  })
  .then(result => {
    console.log(result.Item);
    /**
     * {
     *    Node: 'Simpsons#Character#2',
     *    Type: 'Character',
     *    Data: 'Homer Simpson',
     *    GSIK: 'Simpsons#9',
     *    Target: 'Simpsons#Character#2'
     * }
     */
    return Node.create({ data: 'Homer Simpson' });
  });
```

### Destroy method

The interface to delete a node is very similar to how you create one. You just define a Node with its `id` and `type`, and then you call the `destroy` method on it.

```javascript
var node = 'Character#2';
var type = 'Character';

g
  .node({ node, type })
  .destroy()
  .then(result => {
    console.log(result);
    // {}
  });
```

**Note**

I tried to include information on each function as a JSDoc comment. I plan in the future to transform it into a proper documentation page. I wish there was something like `Sphix` for JavaScript. For now this should be enough, since the surface of the library is quite small.

## Test

I am using `jest` to test the library, and Node **6.10.3**. So, just clone the repo, install the dependencies, and run `yarn test` or `npm run test` to run them.

```
git clone git@github.com:guzmonne/dynamodb-graph.git

yarn install

yarn test
```

## Licence

MIT
