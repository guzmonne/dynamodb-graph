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
  .has('gender', 'm')
  .count()
  .addV('female_characters')
  .properties({inMemory: true})
  .next()
  .then(vertex => /* ... */);
// Check if the female_characters vertex exists.
G.V('female_characters')
  .hasNext()
  .then(result => {
    console.log(result === true) // true
  });
```

Explicit information on the graph are the vertices and edges that composes them. Implicit data can be found by exploring the chart using a traversal. For example, on a graph with nodes that depict "projects" and "creators", connected by a "created" edges; we can find the "co-creators" implicit data by looking for creators of the same project. Using the `addE()` step function, we can transform this implicit data to explicit.

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
