# Gremlin

## Vertex

Represents a "thing." For example a "Movie" or a "Person."

## Edge

Edges are labeled relationships and have a direction.
Two vertexes can have multiple edges connecting them.

## Properties

Similar to fields in a table. They can have meta-properties applied to an edge or a vertex.

```java
graph = TitanFactory.build().set('storage.backend', 'inmemory').open()
g = graph.traversal();
jcvd = graph.addVertex(label, 'actor', 'name', 'jean claude van damme')
kick = graph.addVertex(label, 'movie', 'name', 'Kickboxer', 'year', 1989)
blood = graph.addVertex(label, 'movie', 'name', 'Bloodsport', 'year', 1988)
jvcd.addEdge('acted_in', kick)
jvcd.addEdge('acted_in', blood)
```

## Create a new vertex

```typescript
interface AddVertexValue {
  label: string;
}
```

## Finding vertices

* Single vertex: `g.V(4160)`.
* Matching a property: `g.V().has('name', 'jean claude van damme')`.
* Range filtering: `g.V().has('year', between(1980, 1990))`

## Traversals

We use the `jcvd.out()` function to get all the vertex edges.

* To other vertices: `g.V().has('name', 'jean claude van damme').out()`.
* To edges: `g.V().has('name', 'jean claude van damme').outE()`.
* Filtering with traversals: `g.V().has('name', 'jean claude van damme').out().has('year', between(1980, 1990))`.

## Gremlin queries

A graph `query` is often reffered as a `traversal`. A traversal consists of one or more steps that are chained together.
Almost all `traversals` start with `g.V()` or `g.E()`.

* `g.V()`: Looking for all vertices on the graph.
* `g.E()`: Looking for all the edges on the graph.

## `hasLabel()` and `has()` functions

This method is used to get all the vertices or edges that have a certain label. `g.V().hasLabel('airport')`.
If we want to find the vertexes label and data:

```javascript
g.V().has('code', 'DFW');
```

The `has()` function has another override that accepts a label first.

```javascript
g.V().has('airports', 'code', 'DFW');
```

## Retrieving values from a vertex

To get property values of a given vertex we use the `values()` method.

```javascript
g
  .V()
  .has('airport', 'code', 'DFW')
  .values();
```

It can consume a list of key names to return, instead of all.

```javascript
g
  .V()
  .has('airport', 'code', 'DFW')
  .values('city');
// Dallas
```

## Does a property exists on a given vertex or edge?

You can test if a vertex or an edge contains a specific value using the `has()` method.

```javascript
// Find all edges that have a 'dist' property.
g.E().has('dist');
// Find all vertices that have a 'region' property
g.V().has('region');
// Find all vertices that do not have a 'region' property.
g.V().hasNot('region');
```

## Counting things

We can use the `count()` function to get the number of vertexes that match the query.

```javascript
g
  .V()
  .has('airport')
  .count();
```

The `outE` function looks at outgoing edges. We can combine it with the `count` function to count the number of outward edges.

```javascript
g
  .V()
  .hasLabel('airport')
  .outE('route')
  .count();
// 43400
```

This can also be done by looking at the Edges. The problem is that graphs ussually have more edges that vertices, so it is considered a bad practise.

```javascript
g
  .E()
  .hasLabel('route')
  .count();
```

## Counting group of things

The `group` and `groupCount` functions help to count group of things.
To count all the vertices types like this:

```javascript
g
  .V()
  .label()
  .groupCount();
```

We can be more selective by providing a label to query.

```javascript
// How many airports are there in each country?
g
  .V()
  .hasLabel('airport')
  .groupCount()
  .by('country');
// How many airports are there in each country? (look at country first)
g
  .V()
  .hasLabel('country')
  .group()
  .by('code')
  .by(out().count());
// How many airports are there in each continent?
g
  .V()
  .hasLabel('continent')
  .group()
  .by('code')
  .by(out().count());
// How many airports are in France?
g
  .V()
  .hasLabel('airport')
  .groupCount()
  .by('country')
  .select('FR');
```

## Starting to walk the graph

Where to move while traversing a graph

| Method  | Description                                   |
| ------- | --------------------------------------------- |
| out\*   | Outgoing adjacent vertices.                   |
| in\*    | Incoming adjacent vertices.                   |
| both\*  | Both incoming and outgoing vertices           |
| outE\*  | Outgoing incident edges.                      |
| inE\*   | Incoming incident edges.                      |
| bothE\* | Both outgoing and incoming edges.             |
| outV    | Outgoing vertex.                              |
| inV     | Incoming vertex.                              |
| otherV  | The vertex that was not the vertex we are on. |

_The steps with `*` can optionally take the name of an edge label as a parameter. All the edges must be traversed if omitted._

Examples:

```javascript
// Where can I fly from Austin?
g
  .V()
  .has('airport', 'code', 'AUS')
  .out()
  .values('code')
  .fold();
```

It is considered a best practice to add labels to the `step` functions to limit the number of items we have to query over.

```javascript
// Where can I fly from Austin?
g
  .V()
  .has('airport', 'code', 'AUS')
  .out('route')
  .values('code')
  .fold();
// Where can I fly to from Austin, with one stop on the way?
g
  .V()
  .has('airport', 'code', 'LCY')
  .out('route')
  .out('route')
  .values('code');
```

## What vertices did I visit?

To check the vertices and edges visited we use the `path` function.

```javascript
// This time, for each route, return both vertices and the edge that connects them.
g
  .V()
  .has('airport', 'code', 'LCY')
  .outE()
  .inV()
  .path();
```

## Does an edge exist between two vertices?

The `hasNext` step function checks if an edge exists between two vertices, and get a boolean back.

```javascript
g
  .V()
  .has('code', 'AUS')
  .out('route')
  .has('code', 'DFW')
  .hasNext();
```

## Examining the edge between two vertices.

The `as` function is used to reference a query.

```javascript
g
  .V()
  .has('code', 'MIA')
  .outE()
  .as('e')
  .inV()
  .has('code', 'DFW')
  .select('e')
  .values('dist');
```

# Posible implementation #1

# G

The `G` function is used to construct an object to traverse the graph. You can configure the `tenant`, `table`, and `maxGSIK` value.

```javascript
var g = G({
  tenant: 'Simpsons',
  table: 'GraphTable',
  maxGSIK: 10
});
```

## Traversals

You can then use this object to create graph `traversal` objects.

```javascript
// Vertex traversals starting from the character vertexes.
var v = g.V().hasLabel('character');
// Get all characters name and genders.
v
  .properties(['name', 'gender'])
  .next()
  .then(properties => /* ... */);

// Edge traversals.
var e = g.E().hasLabel('starredIn');
// Get all characters from episode 1
e.in() // Moved from the 'starredIn' edge to the `episode` vertices.
  .property('number_in_series', 1) // Keep only the ones from episode 1.
  .properties(['name', 'gender']) // Get the 'name' and 'gender' properties.
  .next()
  .then(properties => /* ... */);
```

## Create vertices and edges

To create new vertices we use the `addV()` step method. We can chain this method with the `properties` method with an `object` of properties to attach to the vertex.

```javascript
// Create a new character vertex
g.addV('character').properties({ name: 'Homer Simpson', gender: 'm' });
```

We can use the `addV` method inside a traveral to generate new vertices.

```javascript
// Create a female_characters vertex.
G.V()
  .hasLabel('character')
  .has('gender', 'f')
  .count()
  .addV('female_characters')
  .next()
  .then(vertex => /* ... */);
// Check if the female_characters vertex exists.
G.V('female_characters')
  .hasNext()
  .then(result => {
    console.log(result === true) // true
  });
```

Explicit information on the graph are the vertices and edges that composes them. Implicit data can be found by exploring the chart using a traversal. For example, on a graph with vertexes that depict "projects" and "creators", connected by a "created" edges; we can find the "co-creators" implicit data by looking for creators of the same project. Using the `addE()` step function, we can transform this implicit data to explicit.

```javascript
// Add a 'spokeBy' edge with an `at` property between a 'script_line' and a the
// character spoking it.
g
  .V('script_line|9550')
  .addE('spoken_by')
  .to('character|9')
  .next(edge => /* ... */)
// Add an 'episode|32|co-star' edge with an episode name property between "Lisa
// Simpson" and its episode 32 co-stars.
g
  .V('character|10')
  .as('c')
  .out('starredIn').has('number_in_series', 32).as('e')
  .in('starredIn').where(neq('c'))
  .addE('episode|32|co-star')
  .from('a')
  .property('name', 'Lisa\'s Substitute')
```

# Posible implementation #2

## Getting started

### Global Configuration

Before using the library the `config.update()` method on the `DynamoDBGraph` namespace must be run to set the global variables. The required values are:

* `table`: The table name where the vertexes and edges will be stored.
* `tenant`: The `tenant` value for the current entity.
* `maxGSIK`: Maximum `GSIK` value to store the vertexes and edges. It should be a multiple of `10`. You can increase this value in the future, but you can't decrease it.

```javascript
var DynamoDBGraph = require('dynamodb-graph');

// Here we are using environment variables to configure the library.
DynamoDBGraph.config.update({
  table: process.env.TABLE_NAME,
  tenant: process.env.TENANT,
  maxGSIK: process.env.MAX_GSIK
  //documentClient
});
// You can check the current configuration by reading the `.config` value.
console.log(DynamoDBGraph.condif);
// { ... }
```

You can also provide your own instance of the `DynamoDB.DocumentClient` driver instance. If not, the library would try to create one using the current `AWS` configuration.

### Traversals

To interact with the graph we must first create a `traversal` instance. Everything from creating vertexes, edges, and properties, to queries, are done through `traversals`.

A `traversal` instance is created using the `traversal` method on the DynamoDBGraph namespace.

```javascript
var g = DynamoDBGraph.traversal();
```

### Creating vertexes and edges.

To create a new vertex we use the `addVertex` method on the `traversal` instance.

```javascript
var jcvd = g.addV('actor', {name: 'jean claude van damme'});
var kick = g.addV('movie', {name: 'Kickboxer', year: 1989});
var blood = g.addV('movie', {name: 'Bloodsport', year: 1988);
```

Then we can create edges between the previously defined vetexes.

```javascript
jvcd.addE('acted_in', kick);
jvcd.addE('acted_in', blood);
```

The important part here is that we haven't actually stored this information on the table. For now, everthing is happening in memory. If we want to store the changes we have to call the `next` method on each of the elements created, or use the `next` on the `traversal` object itself, which has a reference to every created element, and will iterate over each of them, and run the `next` method on them. Every time we call the `next` method, the return value is a promise.

For example, given the last example we can save the data on the table in two different ways:

**#1**

```javascript
Promise.all([jcvd, kick, blood]).then(([vertex1, vertex2, vertex3]) => {
  /*...*/
});
```

**#2**

```javascript
g.next().then(([vertex1, vertex2, vertex3]) => {
  /* ... */
});
```

### Traversing the graph

A graph `query` is often reffered as a `traversal`. A traversal consists of one or more steps that are chained together.

Almost all `traversals` start with either `g.V()` or `g.E()`.

* `g.V()`: Looking for all vertices on the graph.
* `g.E()`: Looking for all the edges on the graph.

Running this methods without an argument will trigger a traversal along all the vertices of the graph. This almost always something you want to avoid. Instead you should select a type of vertexes from where to start the traversal, or select a vertex specifically by passing the `id` of the node to the `V()`, or `E()` method. To select a group of vertexes by label or type, you use the `has()` method. It has several overrides to select the nodes from where you want to start the traversal.

```javascript
// Select one vertex
g.V(123);
// Select all airports.
g.V().has('airport');
// Select all the vertexes with a property `code` equal to `DFW`.
g.V().has('code', 'DFW');
// Select all the airports with a property `code` equal to `DFW`.
g.V().has('airport', 'code', 'DFW');
```

### Handling properties

Properties are meta-data that can be stored along a vertex or an edge. They can be added to them when creating each element, or by using the `property` method on a vertex, edge, or group of them.

```javascript
// Add a property to the edge with id `123`
g.E('123').property('something', 'cool');
// Add a property to every airport vertex.
g
  .V()
  .has('airport')
  .property('active', true);
```

To get a list of properties of a selection of elements you use the `properties` method passing a list of properties to return.

```javascript
// List of properties.
g
  .V()
  .has('airport')
  .properties('code', 'address');
// List of properties provided as array.
g
  .V()
  .has('airport')
  .properties(['code', 'address']);
```

## Starting to walk the graph

Once we select the starting edges or vertices we can start to 'walk' the graph to start our queries. To do this we use th following list of methods.

| Method  | Description                                   |
| ------- | --------------------------------------------- |
| out\*   | Outgoing adjacent vertices.                   |
| in\*    | Incoming adjacent vertices.                   |
| both\*  | Both incoming and outgoing vertices           |
| outE\*  | Outgoing incident edges.                      |
| inE\*   | Incoming incident edges.                      |
| bothE\* | Both outgoing and incoming edges.             |
| outV    | Outgoing vertex.                              |
| inV     | Incoming vertex.                              |
| otherV  | The vertex that was not the vertex we are on. |

_The steps with `*` can optionally take the name of an edge label as a parameter. All the edges must be traversed if omitted._

So, for example, if I wanted to know: Where can I fly from Austin? I could do something like this.

```javascript
g
  .V() // All vertices
  .has('airport', 'code', 'AUS') // Start from the airport vertex with code AUS
  .out('airport') // Analize all the vertexes connected out
  .properties('code') // Get the properties values.
  .fold(); // Returns a list of codes after calling `next`
```
