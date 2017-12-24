'use strict';

var { parseResponseItemsData } = require('./modules/utils.js');

/**
 * Factory function that returns a function that follows the DynamoDB query
 * interface, to get the data stored inside a node.
 * The table name can be provided while calling the factory, or it can use an
 * environment variable called TABLE_NAME.
 * Gets all the nodes and edges type associated to a node.
 * @param {DBConfig} options - Database driver and table configuration.
 * @returns {function} Function ready to put Node on a DynamoDB table.
 * @param {string} node - Node to query.
 * @returns {promise} With the data returned from the database.
 */
module.exports = function getNodeData(options) {
  var { db, table = process.env.TABLE_NAME } = options;
  return node => {
    if (!node) throw new Error('Node is undefined.');
    return db
      .query({
        TableName: table,
        KeyConditionExpression: `#Node = :Node`,
        ExpressionAttributeNames: {
          '#Node': 'Node',
          '#Target': 'Target',
          '#Data': 'Data',
          '#Type': 'Type'
        },
        ExpressionAttributeValues: {
          ':Node': node
        },
        FilterExpression: 'attribute_exists(#Target) && #Target <> :Node',
        ProjectionExpression: '#Type, #Data, #Target'
      })
      .promise()
      .then(parseResponseItemsData);
  };
};
