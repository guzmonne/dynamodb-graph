'use strict';

module.exports = dynamodbGraph;

// ---
/**
 *
 * @param {object} config - Configuration object.
 * @property {object} documentClient - DynamoDB Document Client driver.
 * @property {number} [maxGSIK=10] - Max GSIK value.
 * @property {string} [table=TABLE_NAME] - DynamoDB table name. Can inherit its
 *                                         from a TABLE_NAME environment varible
 * @property {string} [tenant=''] - Tenant identifier.
 */
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

  // Configure library _meta_ properties.

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

// Library current version
Object.defineProperty(dynamodbGraph, '__VERSION__', {
  value: require('../package.json').version
});
