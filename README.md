# DynamoDB-Graph

## Introduction

This is a library built to work with DynamoDB as if it was storing a Graph. The idea came from the "Advanced Design Patterns for Amazon DynamoDB (DAT403-R)" talk from Rick Houlihan on 2017 AWS re:Invent conference. Close to the end, he describes a way to use a DynamoDB table to represent a directed graph. I found that notion very interesting, so I started working on a library that would abstract the details of the graph representation, on top of DynamoDB using the AWS Document Client driver, from the AWS JavaScript SDK.

Besides the ideas explained in the talk, I other two more:

1. The concept of a `tenant`.
2. A way to handle the amount of GSI partitions to use, by defining the maximum number of GSIK allowed, which are generated from the Nodes ids.

Each node can belong to a `tenant`, which is a way to box entities (users, companie, groups, etc) into their own parititon inside the table. This is done by concatenating the `id` of each node, and their `GSIK`, with the `tenant id`. This last value if configured when the library is intitialized, and is completely abstracted from the user. Meaning, you can interact with the table as if the `tenant` value didn't exist. You could have multiple users handling the same Node `ids`, as long as they have a unique `tenant` id.

This has another aditional benefit: we can apply IAM policies to let the users only access the keys with their corresponding tenant. Making it impossible to access the keys from other users.

To control the number of GSI Keys you can use the `maxGSIK` attribute when configuring the library. This value defines the ammount of GSIK allowed on the table, and shoudl be a multiple of 10 to allow a normal distribution of the nodes in each GSIK.

The data inside every Node item must be stored as a `string`. That means that you have to stringify the data types that you want to store on the table. On the documentation section, I explain a couple of ways of storing numbers on the database.

**Important Note:** This library was built on top of Node 6.10.3, because I wanted to use it on AWS Lambda, and at the moment is the highest version supported. It should work on higher versions, but I haven't tested it.

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

Then you can import it to your project, and you must initialize it before you can start using it. Basically, you musth provide the DynamoDB DocumentClient driver, table name, tenant key, and `maxGSIK` value. The table name can also be taken from an environment variable called `TABLE_NAME`. I am considering letting other important options be configured the same way.

```javascript
var AWS = require('aws-sdk');
var dynamodbGraph = require('dynamodb-graph');

var documentClient = new AWS.DynamoDB.DocumentClient();
var maxGSIK = 10;
var table = process.env.TABLE_NAME;
var tenant = 'Client#123';

var g = dynamodbGraph({ documentClient, maxGSIK, table, tenant });
```

## Playground

To be able to test the library I have provided some scripts that work on existing data. More specifically, ["The Simpsons" by the data](https://www.kaggle.com/wcukierski/the-simpsons-by-the-data). You can go to the link, and download it from [Kaggle](https://www.kaggle.com). Then `unzip` the files inside the `scripts` folder, and run the `seed_local_table.js` script. Then go dring a cup of coffee, eat a sandwich, and catch up on your current series, cause it's gonna take a long time to load. I did my best to show the progress of the upload so you know that something is at least going on.

After all the data is up, you can run the script `playground.js` and see the library in action with some examples I come up with. More examples are welcomed.

Lastly, I left another script called `repl.js`, which contains the library, an instantiated `documentClient` driver, and some other useful functions to use on the node `repl`. Just open up a `node` console and run:

```
var {g, documentClient, dynamo, log, scan} = require('./scripts/repl.js')
```

Or something like that.

**Important note**: both scripts can be used against DynamoDB itself, though I wouldn't recommend to do so while testing the library. I won't take responsability for any charges generated on your account while using this library. Instead, you should run a local instance of DynamoDB.

To my knowledge, there are two alternatives:

1. [Dynalite](https://github.com/mhart/dynalite), from [Michael Hart](https://github.com/mhart).
2. [Official DynamoDB local version](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html).

Any one of those will work fine. Just be sure to run it on `port` **8989** or to set the `ENDPOINT` environment variable pointed to your local port when running all the scripts.

## Documentation

### Initialize the library

To initialie the library we must configure some global options.

* `documentClient`: DynamoDB Document Client driver. You can configure it to point to a local DynamoDB process to avoid unneccesary charges while testing the library.
* `maxGSIK`: Maximum `GSIK` value. Defaults to 10. This value let's you setup the ammount of partitions you believe would be enough to store your data. I recommend setting this value as a multiple of 10, to allow for a close to normal distribution of the keys. **You should never decrease this value, only increase it.**
* `tenant`: Any string identifier you want to apply to the current tenant. This value will be applied to every Node, and will be taken out befor returning back the results of each operation. That way you don't have to deal with it.
* `table`: Name of the DynamoDB table to store the data. Can be defined as an environment variable called `TABLE_NAME`.

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

#### Get all the node edges or all the node props.

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

Take into account that the `type` value declared on the node is not necessary and won't be taken into consideration when the `get` function is called.

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
  });
```

If the Node has more edges or props that were not returned but matched the current query, then the `Offset` parameter is returned. This value points to the last element evaluated while performing the query, and can be used in subsequent queries as its starting point. Use the `offset` attribute for this purpose.

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
    console.log(result.Offset);
    // U3Bva2VMaW5lIzI2OSNFcGlzb2RlIzMy
    console.log(result.LastEvaluatedKey);
    /**
     * {
     *    Node: 'Character#2',
     *    Type: 'SpokeLine#269#Episode#32',
     * }
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

As mentioned before, we can add a filter condition to the query using the `filter` condition object, which should be constructed just as the `where` object. Note that this aditional condition will be applied as a `FilterExpression`, which means, that the condition will be applied after all the items that match the condition on the `where` condition object returns.

```javascript
var id = 'Character#2';
var operator = 'begins_with';
var value = 'Line';
var name = 'Bart';

g
  .node({ id })
  .query({
    where: { type: { [operator]: value } },
    filter: { data: { [operator]: name } }
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

If you invert the `data` and `type` keys on the `where` and `filter` objects, it will apply first the condition on the `type` and then on the `data`. This is because the data is indexed by `type` on the table.

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

If you only include a `where` condition object applied to the `data` attribute, the query will be run against all the items of the Node. This could be a very inefficient query if your Node has a lot of items connected to it, and you only need a few of them.

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

On a positive note, `filter` conditions can use more operators. These are:

* `IN`: True if the `data` of the Node is included on the `value` list.
* `contains`: True if the `data` contains a substring equal to the `value`.
* `size`: True if the `data` has a length equal to the `value`.

If you check DynamoDB documentation you'll note that you can use other comparators when working with the `size` function. To make things simpler for myself, I only included the equality for now. I plan to correct this in further versions.

Logical evaluations can also be used up two one level, using an `and`, `or`, or `not` key, with a condition object. _On a future version, I plan to allow more than just one level of logical evaluations._

```javascript
var id = 'Character#2';

g
  .node({ id })
  .query({
    where: { type: { begins_with: 'Line' } },
    filter: {
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

As with the `edges()` and `props()` functions, you can provide a `limit` and an `offset` value. They will work exactly the same as with those other methods. The `Offset` value returned is just the base64 encoded type. To reconstruct it into a DynamoDB key, we just need the node `id`. If you don't want to work with encoded strings, you can just pass to the `offset` attribute an entire DynamoDB key, like the one returned in the `LastEvaluatedKey` value.

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
  // TGluZSMyNjUjRXBpc29kZSMzMg==
  console.log(result.LastEvaluatedKey);
  /**
   * {
   *    Node: 'Character#2',
   *    Type: 'Line#265#Episode#32',
   * }
   */
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

DynamoDB `LastEvaluatedKey` will also be returned on the `result` object, and can also be used on the `offset` attribute. The reason why I also provide the `Offset` value is explained further ahead.

#### Handling numbers

As mentioned before, the Node `data` must be stored as a string. Numbers can be stored as strings easily, for example: `4` as `'4'`. The problem with this approach is that all the numeric query operators will become useless.

A better approach, is to store the numbers as hexadecimal strings. Here is a snippet on how to convert a number as a 4 byte hexadecimal word and back:

```javascript
function numToFloat32Hex(value) {
  var buffer = Buffer.alloc(4);
  buffer.writeFloatLE(value, 0);
  return buffer.toString('hex');
}

function float32HexToNum(value) {
  return Buffer(value, 'hex').readFloatLE(0);
}
```

If you need more precision you can check out [this article](http://www.danvk.org/hex2dec.html) by [danvk](http://www.danvk.org). There is even an [npm module](https://www.npmjs.com/package/hex2dec) if you want to import it to your project.

#### Query items by GSIK, sorted By Type

To query the Node `types`, regardless of the Node `id`, we can leverage the `GSIK` indexes. By default, the queries will be run over every `GSIK` value, and will return a maximum of 100 items each.

Now, instead of using the `node` function we use the `query` function, with a `where` and a `filter` condition object. The `where` condition object will define which index to use (`ByType` or `ByData`). Which means, that the operators allowed on the `where` condition **don't** include: `IN`, `contains`, `size`, and logical expressions. They are only allowed on the `filter` condition. So make sure you select the best index for your query.

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

As before, the results can be filtered further by using a `filter` condition object whith the `data` or `type` key present. This will build a `FilterCondition` expression, which will discard any item that doesn't match the condition, **after** the query operation is done.

```javascript
g
  .query({
    where: { type: { '=': 'Gender' } },
    filter: { data: { '=': 'm' } }
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

To use the index `ByData` we use the `data` key on the `where` object instead of the `type`.

```javascript
g
  .query({
    where: { data: { '=': 'm' } },
    filter: { type: { '=': 'Gender' } }
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

Looking at the last two examples you can see that, even though they return the same information, the first one is a much better option for this usecase. The scanned items on the second example could be much higher than the ones on the first one.

#### GSIK handling

In order to control the `GSIK` being queried, you can provide a `gsik` object. This object must contain some of these keys:

* `startGSIK`: Start value of the `GSIK`. Equals 0 by default.
* `endGSIK`: End value of the `GSIK`. Equals `maxGSIK - 1` by default. **Must be larger than `startGSIK`**.
* `listGSIK`: A list of GSIK to use, provided as a list of numbers. Only the GSIK provided on the list will be queried. If `startGSIK` or `endGSIK` are also defined, they will not be considered.

```javascript
var listGSIK = [9];
var limit = 1;

g
  .query({
    where: { type: { '=': 'Character' } },
    gsik: { listGSIK }
    limit
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

A query by default will only return up too 100 items per GSIK. You can modify this behaviour by changing the `limit` value. None of this means that you'll actually receive the ammount of items you asked for. This is just the behaviour of DynamoDB. If the size of the query is to big, or there aren't enough items on a GSIK, you'll receive a lower count of items. Given this, you can't control how many items will be received after a query (at least no with this version of the library). If you use a `CUID` or `UUID` generator function for the Node `id` value, then you'll probably get the same ammount of items per GSIK, so you can predict how many items will be returned in total.

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
    gsik: { listGSIK }
    limit
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
        gsik: { listGSIK },
        limit
        offset: result.LastEvaluatedKeys
      }),
      g.query({
        where: { type: { '=': 'Character' } },
        gsik: { listGSIK },
        limit
        offset: result.Offset
      })]
  })
  .then(results => {
    // Both queries work exactly the same.
    console.log(results[0].Items[0].Node === results[0].Items[1].Node);
    // true
  })
```

On the example using the `Offset` value doesn't look like and advantage, but it can make a huge difference if you are querying over 10 `GSIK` or more.

**You could also store the offset value on another Node, to query later when you need to paginate the results.**

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

The interface to destroy a node is very similar to how you get one. If you want to destroy an item, you select it with the `node` function, and then call the `destroy` method on it.

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

I tried to include information on each function as a JSDoc comment. I plan in the future to transform it into a proper documentation site. I wish there was something like `Sphix` for JavaScript but for now it should be enough.

## Test

I am using `jest` and `yarn` to test the library, and Node **6.10.3**. So, just clone the repo, install the dependencies with `yarn install`, and run `yarn test` to start them.

```
git clone git@github.com:guzmonne/dynamodb-graph.git

yarn install

yarn test
```

## Contributions

More than welcomed.

## Licence

MIT
