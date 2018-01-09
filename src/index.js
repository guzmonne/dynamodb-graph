'use strict';

module.exports = dynamodbGraph;

// ---

function dynamodbGraph(config = {}) {
  var {
    documentClient,
    maxGSIK = 10,
    table = process.env.TABLE_NAME,
    tenant = ''
  } = config;

  if (documentClient === undefined)
    throw new Error('DynamoDB DocumentClient driver is undefined');

  if (table === undefined) throw new Error('Table is undefined');

  Object.defineProperty(dynamodbGraph, '_maxGSIK', {
    value: maxGSIK
  });

  Object.defineProperty(dynamodbGraph, '_tenant', {
    value: tenant
  });

  Object.defineProperty(dynamodbGraph, '_table', {
    value: table
  });

  // ---

  return {
    node: require('./node.js')(config),
    query: require('./query.js')(config)
  };

  // ---
}

Object.defineProperty(dynamodbGraph, '__VERSION__', {
  value: '4.0.0'
});
