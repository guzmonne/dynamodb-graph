'use strict';

module.exports = dynamodbGraph;

// ---

function dynamodbGraph(config = {}) {
  var { tenant = '', maxGSIK = 10, documentClient, table } = config;

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
}

Object.defineProperty(dynamodbGraph, 'VERSION', {
  value: '4.0.0'
});
