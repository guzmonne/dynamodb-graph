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

We use the `jcvd.out()` function to get all the node edges.

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

We can use the `count()` function to get the number of nodes that match the query.

```javascript
g
  .V()
  .has('airport')
  .coun();
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

|         |                                               |
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

_The steps with `*` can optionally take the name of an edge label as a parameter. All the edges are must be traversed if omitted._

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

## `limit` and `timeLimit`
