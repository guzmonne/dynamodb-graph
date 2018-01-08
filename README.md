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
var id = 'Character#2';
var type = 'Character';
var data = 'Homer Simpson';

g
  .node({ id, type })
  .create({ data })
  .then(result => {
    console.log(result.Item);
    /**
     * {
     *    Node: 'Character#2',
     *    Type: 'Character',
     *    Data: 'Homer Simpson',
     *    GSIK: '9',
     *    Target: 'Character#2'
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
var type = 'Character';
g
  .node({ type })
  .create({ data })
  .then(result => {
    console.log(result.Item);
    /**
     * {
     *    Node: 'cjc1bicq30000aetcfkub88p7',
     *    Type: 'Character',
     *    Data: 'Homer Simpson',
     *    GSIK: '9',
     *    Target: 'cjc1bicq30000aetcfkub88p7'
     * }
     */
  });
```

#### Create edge

Here we are connecting a character Node to an episode Node. To do that, we select the node and type where we want to store the edge, and then we call the `create` method, passing the `target` id and the data to be stored.

```javascript
var id = 'Character#2';
var type = 'StarredIn#Episode#1';
var target = 'Episode#1';
var data = 'Bart the Genius';

g
  .node({ id, type })
  .create({ target, data })
  .then(result => {
    console.log(result.Item);
    /**
     * {
     *    Node: 'Character#2',
     *    Type: 'StarredIn#Episode#1',
     *    Data: 'Bart the Genius',
     *    GSIK: '9',
     *    Target: 'Episode#1'
     * }
     */
  });
```

#### Create property

A property is like an edge, but without a target. It allows to store additional information about the node, that will be stored on the same partitions, and which don't require the creation or existance of another node.

To create them we call the `create` function with the `prop` data to be stored.

```javascript
var id = 'Character#2';
var type = 'Gender';
var prop = 'm';

g
  .node({ id, type })
  .create({ prop })
  .then(result => {
    console.log(result.Item);
    /**
     * {
     *    Node: 'Character#2',
     *    Type: 'Gender',
     *    Data: 'm',
     *    GSIK: '9',
     * }
     */
  });
```

### Get methods

#### Get a single node, edge, or prop.

Use the `get` method, after providing the Node `id` and `type` to the `node()` function.

```javascript
var id = 'Character#2';
var type = 'Character';

g
  .node({ id, type })
  .get()
  .then(result => {
    console.log(result.Item);
    /**
     * {
     *    Node: 'Character#2',
     *    Type: 'Character',
     *    Data: 'Homer Simpson',
     *    GSIK: '9',
     *    Target: 'Character#2'
     * }
     */
  });
```

#### Get a list of node items by type

If we pass in a list of `types` to the `get()` function, it will return all the items with those types on that `node`. If you set the `type` when calling the `node` function, it will be added to the list of item types to get.

```javascript
var id = 'Character#2';
var type = 'Character';

g
  .node({ id, type })
  .get(['StarredIn#Episode#1', 'Gender'])
  .then(result => {
    console.log(result.Items);
    /**
     * [{
     *    Node: 'Character#2',
     *    Type: 'Character',
     *    Data: 'Homer Simpson',
     *    GSIK: '9',
     *    Target: 'Character#2'
     * }, {
     *    Node: 'Character#2',
     *    Type: 'StarredIn#Episode#1',
     *    Data: 'Bart the Genius',
     *    GSIK: '9',
     *    Target: 'Episode#1'
     * }, {
     *    Node: 'Character#2',
     *    Type: 'Gender',
     *    Data: 'm',
     *    GSIK: '9',
     * }]
     */
  });
```

#### Get all the node edges, props, or all types.

To get all the Node edges or props, we use the `edges()` or `props()` method respectively, after providing the node `id`, to the `node` function.

```javascript
var id = 'Character#2';

// -- Edges --
g
  .node({ id })
  .edges()
  .then(result => {
    console.log(result.Items);
    /**
     * [{
     *    Node: 'Character#2',
     *    Type: 'StarredIn#Episode#1',
     *    Data: 'Bart the Genius',
     *    GSIK: '9',
     *    Target: 'Episode#1'
     * }]
     */
  });
// -- Props --
g
  .node({ id })
  .props()
  .then(result => {
    console.log(result.Items);
    /**
     * [{
     *    Node: 'Character#2',
     *    Type: 'Gender',
     *    Data: 'm',
     *    GSIK: '9',
     * }]
     */
  });
```

Take into account that the `type` value declared on the node is not necessary and won't be taken into consideration when this function is called.

Both functions allow to set a limit on how much items you want. Just set the `limit` configuration value to some number.

```javascript
var id = 'Character#2';

g
  .node({ id })
  .edges({ limit: 1 }) // Also applies to `prop()`.
  .then(result => {
    console.log(result.Items);
    /**
     * [{
     *    Node: 'Character#2',
     *    Type: 'StarredIn#Episode#1',
     *    Data: 'Bart the Genius',
     *    GSIK: '9',
     *    Target: 'Episode#1'
     * }]
     */
    console.log(result.Offset);
    /**
     * Q2hhcmFjdGVy
     */
  });
```

If the Node has more edges or props that were not returned but matched the current query, then the `Offset` parameter is returned. This value points to the last element evaluated while performing the query, and can be used in subsequent queries as its starging point. Use the `offset` attribute for this purpose.

```javascript
var id = 'Character#2';
var type = 'Character';
var offset = 'Q2hhcmFjdGVy';

g
  .node({ id })
  .edges({ offset }) // Also applies to `prop()`.
  .then(result => {
    console.log(result.Items);
    /**
     * [{
     *    Node: 'Character#2',
     *    Type: 'SpokeLine#269#Episode#32',
     *    Data: 'Oh.',
     *    GSIK: '9',
     *    Target: 'Line#9609'
     * }]
     */
    console.log(result.LastEvaluatedKey);
    /**
     * Q2hhcmFjdGVyIzJ8Q2hhcmFjdGVy
     */
  });
```

### Query methods

#### Query items by `Node`, sorted by `Type`

[DynamoDB Expression Operators and Functions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.OperatorsAndFunctions.html)

We can query over the `prop` and `edge` types of a Node using the `query()` method. As before, we provide the Node `id` to the `node` function, and then
we call `query()` over its result, providing a `where` and `and` condition objects.

To construct a condition object, we provide just one key to the `where` or `and` object called either `type` or `data`. Inside this key, we store another object, again with just one key, corresponding to a valid [DynamoDB Key Condition operator](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html). The value of this key will be used for the comparison operation. For most of them, the value should be just a string, except the: `size` operator which takes a number; the `BETWEEN` operator which takes an array of two strings; and for the `IN` operator, an array with up to 100 strings.

```javascript
var id = 'Character#2';

g
  .node({ id })
  .query({ where: { type: { begins_with: 'Line' } } })
  .then(result => {
    console.log(result.Items);
    /**
     * [{
     *    Node: 'Character#2',
     *    Type: 'Line#265#Episode#32',
     *    Data: 'Bart didn't get one vote?! Oh, this is...'
     *    GSIK: '9'
     *    Target: 'Line#9605'
     * }, {
     *    Node: 'Character#2',
     *    Type: 'Line#114#Episode#33',
     *    Data: 'Marge! What are you doing?...'
     *    GSIK: '9'
     *    Target: 'Line#9769'
     * }]
     */
  });
```

As mentioned before, we can add another condition to the query using the `and` condition expression object, which should be constructed just as the `where` object, configured with the `data` key, instead of the type. Note that this aditional condition will be applied as a `FilterExpression`, which means, that the condition will be applied after all the items that match the condition on the `type` returns.

```javascript
var id = 'Character#2';
var operator = 'begins_with';
var value = 'Line';
var name = 'Bart';

g
  .node({ id })
  .query({
    where: { type: { [operator]: value } },
    and: { data: { [operator]: name } }
  })
  .then(result => {
    console.log(result.Items);
    /**
     * [{
     *    Node: 'Character#2',
     *    Type: 'Line#265#Episode#32',
     *    Data: 'Bart didn't get one vote?! Oh, this is...'
     *    GSIK: '9'
     *    Target: 'Line#9605'
     * }]
     */
  });
```

If you invert the `data` and `type` keys on the `where` and `and` objects, it will apply first the condition on the `type` and then on the `data`.

```javascript
var id = 'Character#2';
var operator = 'begins_with';
var value = 'Line';
var name = 'Bart';

g
  .node({ id })
  .query({
    where: { data: { [operator]: name } },
    and: { type: { [operator]: value } }
  })
  .then(result => {
    console.log(result.Items); // Same result as before.
    /**
     * [{
     *    Node: 'Character#2',
     *    Type: 'Line#265#Episode#32',
     *    Data: 'Bart didn't get one vote?! Oh, this is...'
     *    GSIK: '9'
     *    Target: 'Line#9605'
     * }]
     */
  });
```

If you only include a `where` condition object applied to the `data` attribute, the query will be run against all the items of the Node. This could be a very inefficient query if your Node has a lot of items connected to it.

```javascript
var id = 'Character#2';
var operator = 'begins_with';
var name = 'Bart';

g
  .node({ id })
  .query({
    where: { data: { [operator]: name } }
  })
  .then(result => {
    console.log(result.Items);
    /**
     * [{
     *    Node: 'Character#2',
     *    Type: 'Line#265#Episode#32',
     *    Data: 'Bart didn't get one vote?! Oh, this is...'
     *    GSIK: '9'
     *    Target: 'Line#9605'
     * }]
     */
    console.log(result.ScannedCount);
    // This will equal to all the items connected to the Node 'Character#2'
    // which could be a very big number.
  });
```

On a positive note, `FilterExpresions` has more operators that we can use. Not all of them can be applied while using this pattern, so I have only included the ones with value. These are:

* `IN`: True if the `data` of the Node is included on the `value` list.
* `contains`: True if the `data` contains a substring equal to the `value`.
* `size`: True if the `data` has a length equal to the `value`.

If you check DynamoDB documentation you'll note that you can use other comparators when working with the `size` function. To make things simpler for myself, I only included the equality. I plan to correct this in further versions.

Logical evaluations can also be used up two one level, using an `AND`, `OR`, or `NOT` key, with a condition object. _On a future version, I plan to allow more than just one level of logical evaluations._

```javascript
var id = 'Character#2';

g
  .node({ id })
  .query({
    where: { type: { begins_with: 'Line' } },
    and: {
      data: {
        begins_with: 'Bart',
        and: { size: 25 }
      }
    }
  })
  .then(result => {
    console.log(result.Items);
    /**
     * [{
     *    Node: 'Character#2',
     *    Type: 'Line#166#Episode#99',
     *    Data: 'Bart, you're coming home.'
     *    GSIK: '9'
     *    Target: 'Line#29206'
     * }]
     */
  });
```

As with the `edges()` and `props()` functions, you can provide a `limit` and an `offset` value. They will work exactly the same as with those other methods.

```javascript
var node = g.node({id});
node.query({
  where: { type: { begins_with: 'Line' } }
  limit: 1,
})
.then(result => {
  console.log(result.Items);
  /**
   * [{
   *    Node: 'Character#2',
   *    Type: 'Line#265#Episode#32',
   *    Data: 'Bart didn't get one vote?! Oh, this is...'
   *    GSIK: '9'
   *    Target: 'Line#9605'
   * }]
   */
  console.log(result.Offset);
  // OSxDaGFyYWN0ZXIjMixMaW5lIzI2NSNFcGlzb2RlIzMy
  return node.query({
    where: { type: { begins_with: 'Line' } }
    limit: 1,
    offset: result.Offset
  })
})
.then(result => {
  console.log(result.Items);
  /**
   * [{
   *    Node: 'Character#2',
   *    Type: 'Line#114#Episode#33',
   *    Data: 'Marge! What are you doing?...'
   *    GSIK: '9'
   *    Target: 'Line#9769'
   * }]
   */
});
```

#### Handling numbers

As mentioned before, the Node `data` must be stored as a string. Numbers can be stored as strings easily, for example: `4` as `'4'`. The problem with this approach is that all the numeric query operators will become useless.

A better approach, is to store the numbers as hexadecimal strings. Here is a snippet on how to convert a number as a 4 byte hexadecimal word and back:

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

To query the Node `types`, regardless of the Node `id`, we can leverage the `GSIK` indexes. By default, the queries will be run over every `GSIK` value, and will return a maximum of 100 items each.

Now instead of using the `node` function, we use the `query` function, with a `where` and a `and` condition object. The `where` condition object will define which index to use (`ByType` or `ByData`). Which means, that the operators allowed on the `where` condition **don't** include: `IN`, `contains`, `size`, and logical expressions. They are only allowed on the `and` condition. So make sure you select the best index for your query.

```javascript
g.query({ where: { type: { '=': 'Character' } } }).then(result => {
  console.log(result.Items);
  /**
   * [{
   *    Node: 'Character#2',
   *    Type: 'Character',
   *    Data: 'Homer Simpson'
   *    GSIK: '9'
   *    Target: 'Character#2'
   * }, {
   *    Node: 'Character#8',
   *    Type: 'Character',
   *    Data: 'Bart Simpson'
   *    GSIK: '5'
   *    Target: 'Character#8'
   * }]
   */
});
```

As before, the results can be filtered further by using an `and` object whith the `data` or `type` key present. This will build a `FilterCondition` expression, which will discard any item that doesn't match the condition, **after** the query operation is done.

```javascript
g
  .query({
    where: { type: { '=': 'Gender' } },
    and: { data: { '=': 'm' } }
  })
  .then(result => {
    console.log(result.Items);
    /**
     * [{
     *    Node: 'Character#2',
     *    Type: 'Gender',
     *    Data: 'm'
     *    GSIK: '9'
     * }, {
     *    Node: 'Character#8',
     *    Type: 'Gender',
     *    Data: 'm'
     *    GSIK: '5'
     * }]
     */
  });
```

To use the index `ByData` we invert the `data` and `type` keys.

```javascript
g
  .query({
    where: { data: { '=': 'm' } },
    and: { type: { '=': 'Gender' } }
  })
  .then(result => {
    console.log(result.Items);
    /**
     * [{
     *    Node: 'Character#2',
     *    Type: 'Gender',
     *    Data: 'm'
     *    GSIK: '9'
     * }, {
     *    Node: 'Character#8',
     *    Type: 'Gender',
     *    Data: 'm'
     *    GSIK: '5'
     * }]
     */
  });
```

Looking at the last two examples you can see that, even though they return the same information, the first one is a much better option. The scanned items on the second example could be much higher than the ones on the first one.

#### GSIK handling

In order to control the `GSIK` being queried, you can provide a `gsik` object. This object must contain some of this keys:

* `startGSIK`: Start value of the `GSIK`. Equals 0 by default.
* `endGSIK`: End value of the `GSIK`. Equals `maxGSIK - 1` by default. **Must be larger than `startGSIK`**.
* `listGSIK`: A list of GSIK to use, provided as a list of numbers. Only the GSIK provided on the list will be queried. If `startGSIK` or `endGSIK` are also defined, they will not be considered.
* `limit`: Number of items to get per `GSIK`.

```javascript
var listGSIK = [9];
var limit = 1;

g
  .query({
    where: { type: { '=': 'Character' } },
    gsik: { listGSIK, limit }
  })
  .then(result => {
    console.log(result.Items);
    /**
     * [{
     *    Node: 'Character#2',
     *    Type: 'Character',
     *    Data: 'Homer Simpson'
     *    GSIK: '9'
     *    Target: 'Character#2'
     * }]
     */
  });
```

#### Handling offset values

A query by default will only return up too 100 items per GSIK. You can modify this behaviour by changing the `gsik.limit`. None of this means that you'll actually receive the ammount of items you asked for. This is just the behaviour of DynamoDB. If the size of the query is to big, or there aren't enough items on a GSIK, you'll receive a lower count of items. Given this, you can't control how many items will be received after a query (at least no with this version of the library). If you use a `CUID` or `UUID` generator function for the Node `id` value, then you'll probably get the same ammount of items per GSIK, so you can predict how many items will be returned in total.

DynamoDB uses a `LastEvaluatedKey` value to handle offsets on a query. Whenever this key is returned by DynamoDB, it means that there are more items that match the query, but where not returned. Doing the same query using this value will return the remaing items, or a subset of them and another `LastEvaluatedKey` value.

On each call to the query function, you'll receive two of three different attributes you can use to handle the offset of subsequential queries. These are:

* `LastEvaluatedKey`: Only returned when running a query against a known Node.
* `LastEvaluatedKeys`: A map of `GSIK` to `LastEvaluatedKey's` scanned on each.
* `Offset`: A base64 encoded string containing just the needed information to reconstruct the `LastEvaluatedKeys` object.

Using the `Offset` value allows for easier paging, since you only care about one value. Also, JSON objects are quite verbose, a simplified base64 encoded string can be much smaller than a stringified JSON object. This is particularly usefull if you must use this value from the frontend through an API.

To paginate the query, you can use (or construct) this results and apply them to the `offset` attribute. The library will make sure to transform it into something that DynamoDB can understand.

If you want to construct your own `GSIK` to `LastEvaluatedKey` map, you don't have to include every `GSIK` you plan to query. The ones that are not defined will just be queried from the beginning.

```javascript
var listGSIK = [9];
var limit = 1;

g
  .query({
    where: { type: { '=': 'Character' } },
    gsik: { listGSIK, limit: 1 }
  })
  .then(result => {
    console.log(result.LastEvaluatedKeys);
    /**
     * {
     *    '9': {
     *      Node: 'Character#2',
     *      Type: 'Character',
     *      GSIK: '9'
     *    }
     * }
     */
    console.log(result.Offset);
    // OSxDaGFyYWN0ZXIjMixDaGFyYWN0ZXI
    console.log(JSON.stringify(result.LastEvaluatedKeys));
    // eyJOb2RlIjoiQ2hhcmFjdGVyIzIiLCJUeXBlIjoiQ2hhcmFjdGVyIiwiR1NJSyI6IjkifQ==
    return Promise.all(
      g.query({
        where: { type: { '=': 'Character' } },
        gsik: { listGSIK, limit: 1 },
        offset: result.LastEvaluatedKeys
      }),
      g.query({
        where: { type: { '=': 'Character' } },
        gsik: { listGSIK, limit: 1 },
        offset: result.Offset
      })]
  })
  .then(results => {
    // Both queries work exactly the same.
    console.log(results[0].Items[0].Node === results[0].Items[1].Node);
    // true
  })
```

On the example using the `Offset` value doesn't look like and advantage, but it can make a difference if you are querying 10 `GSIK` or more.

**Another idea would be to store the next page on another node, and then retrieve it when trying to access the next page.**

### Update method

To update a node value you just overwrite it with a new node with the same Node `id` and `type`.

```javascript
var id = 'Character#2';
var type = 'Character';
var data = 'homer simpson';

var Node = g.node({ id, type });

Node.create({ data })
  .then(result => {
    console.log(result.Item);
    /**
     * {
     *    Node: 'Character#2',
     *    Type: 'Character',
     *    Data: 'homer simpson',
     *    GSIK: '9',
     *    Target: 'Character#2'
     * }
     */
    return Node.create({ data: 'Homer Simpson' });
  })
  .then(result => {
    console.log(result.Item);
    /**
     * {
     *    Node: 'Character#2',
     *    Type: 'Character',
     *    Data: 'Homer Simpson',
     *    GSIK: '9',
     *    Target: 'Character#2'
     * }
     */
    return Node.create({ data: 'Homer Simpson' });
  });
```

### Destroy method

The interface to destroy a node is very similar to how you create one. You just define a Node with its `id` and `type`, and then you call the `destroy` method on it.

```javascript
var id = 'Character#2';
var type = 'Character';

g
  .node({ id, type })
  .destroy()
  .then(result => {
    console.log(result);
    // {}
  });
```

#### JSDoc Comments

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
