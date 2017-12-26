'use strict';

var { parseResponseItemsData } = require('./modules/utils.js');

/**
 * Factory function that returns a function that follows the DynamoDB get
 * interface, to get a node with or without knowing its type.
 * The table name can be provided while calling the factory, or it can use an
 * environment variable called TABLE_NAME.
 * Gets all the nodes and edges type associated to a node.
 * @param {DBConfig} options - Database driver and table configuration.
 * @returns {function} Function ready to put Node on a DynamoDB table.
 * @param {string} node - Node to query.
 * @returns {promise} With the data returned from the database.
 */
module.exports = function getNode(options) {
  var { db, table = process.env.TABLE_NAME } = options;
  return (node, type) => {
    if (!node) throw new Error('Node is undefined.');
    return type === undefined
      ? db
          .query({
            TableName: table,
            KeyConditionExpression: `#Node = :Node`,
            ExpressionAttributeNames: {
              '#Node': 'Node',
              '#Target': 'Target',
              '#Type': 'Type',
              '#Data': 'Data',
              '#GSIK': 'GSIK'
            },
            ExpressionAttributeValues: {
              ':Node': node
            },
            FilterExpression: '#Target = :Node',
            ProjectionExpression: '#Node, #Type, #Data, #GSIK',
            ReturnConsumedCapacity:
              process.env.DEBUG !== undefined ? 'INDEXES' : 'NONE'
          })
          .promise()
          .then(parseResponseItemsData)
          .then(response => {
            response.Item = response.Items[0];
            delete response.Items;
            return response;
          })
      : db
          .get({
            TableName: table,
            Key: {
              Node: node,
              Type: type
            }
          })
          .promise()
          .then(parseResponseItemsData);
  };
};
