# DynamoDB Gremlin

## General Steps

There are five general steps, by which all other specific steps are described.

```typescript
// Map the traverser to some object of tyoe E
// for the next step.
map(Traversal<S, E>);
map(Function<Traverser<S>, Iterator<E>>);

// Map the traverser to an iterator of E objects
// that are streamed to the next step.
flatMap(Traversal<S, E>);
flatMap(Function<Traverser<S>, Iterator<E>>);

// Map the traverser to either true or false,
// where false will not pass the traverser to
// the next step.
filter(Traversal<?, ?>);
filter(Predicate<Traverser<S>>);

// Perform some operation on the traverser and
// pass it to the next step.
sideEffect(<Traversal<S, S>>);
sideEffect(Consumer<Traverser<S>>);

// Split the traverser to all the traversals
// indexed by the M token.
branch(Traersal<S, M>);
branch(Function<Traverser<S>, M>);
```

The `Traverser<S>` object provides:

* Current traversed `S` object. `Traverser.get()`.
* The current path traversed by the traverser. `Traverser.path()`.
* The number of times the traverser has gone through the current loop. `Traverser.loops()`.
* The number of objects represented by this traverser. `Traverser.bulk()`.
* The local data structure associated with this traverser. `Traverser.sack()`.
* The side-effects associated with the traversal. `Traverser.sideEffects()`.

## Terminal steps

Concatenated steps ussually return another traversal. But some return a result instead. This steps are known as `terminal steps`. Some of this are:

* `hasNext(): bool`.
* `next(index: number): any`.
* `tryNext(index: number): Maybe<any>`.
* `toList(): array`.
* `toSet(): set`.
* `toBulkSet(): set`.
* `fill(collection)`: collection.

## Add edge step

The elements of a chart are their vertices and edges. Nonetheless there is implicit data stored in the data. For example, on a graph representing authors and project, to authors that created the same project can be considered co-authors. This implicit information can explicited by using the `addE()` step.

```javascript
g
  .V(1) // Start at vertex 1
  .as('a') // Call this vertex 'a'
  .out('created') // Look for an outward edge called 'created'
  .in('created') // Look for inward edges called 'created'
  .where(neq('a')) // Except for those that corresponde to 'a'
  .addE('co-developer') // Create a virtual edge,
  .from('a') // between the vertex 'a'
  .property('year', 2009); // and the results that have a property called 'year' of value 2009.
```
