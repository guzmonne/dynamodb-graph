'use strict';

var nodeItem = require('./nodeItem.js');
var { parseResponseItemsData } = require('./modules/utils.js');

/**
 * Factory function that returns a function that follows the DynamoDB query
 * interface, to get all the node types from the table.
 * The table name can be provided while calling the factory, or it can use an
 * environment variable called TABLE_NAME.
 * Gets all the nodes and edges type associated to a node.
 * @param {DBConfig} options - Database driver and table configuration.
 * @returns {function} Function ready to put Node on a DynamoDB table.
 * @param {string} node - Node to query.
 * @returns {promise} With the data returned from the database.
 */
module.exports = function getNodeTypes(options) {
  var { db, table = process.env.TABLE_NAME } = options;
  return (config = {}) => {
    var { node, sortKeyCondition, sortKeyValue } = config;

    if (!node) throw new Error('Node is undefined.');

    var keyConditionExpression = '#Node = :Node';

    var expressionAttributeValues = {
      ':Node': node
    };

    if (typeof sortKeyCondition === 'string') {
      keyConditionExpression += ` AND ${sortKeyCondition}`;
      expressionAttributeValues[':Value'] = sortKeyValue;
    }

    return db
      .query({
        TableName: table,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeNames: {
          '#Node': 'Node',
          '#Type': 'Type',
          '#Target': 'Target',
          '#Data': 'Data'
        },
        ExpressionAttributeValues: expressionAttributeValues,
        ProjectionExpression: '#Type, #Data, #Target',
        ReturnConsumedCapacity:
          process.env.debug !== undefined ? 'INDEXES' : 'NONE'
      })
      .promise()
      .then(parseResponseItemsData);
  };
};
