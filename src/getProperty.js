'use strict';

var { parseResponseItemsData } = require('./modules/utils.js');

/**
 * Factory function that returns a function that follows the DynamoDB get
 * interface, to get the data stored inside a node property.
 * The table name can be provided while calling the factory, or it can use an
 * environment variable called TABLE_NAME.
 * Gets all the nodes and edges type associated to a node.
 * @param {DBConfig} options - Database driver and table configuration.
 * @returns {function} Function ready to put Node on a DynamoDB table.
 * @param {object} config - Configuration object.
 * @param {string} node - Node to query.
 * @param {string} type - Property type.
 * @returns {promise} With the data returned from the database.
 */
module.exports = function getProperty(options) {
  var { db, table = process.env.TABLE_NAME } = options;
  return ({ node, type }) => {
    if (!node) throw new Error('Node is undefined.');
    return db
      .get({
        TableName: table,
        Key: {
          Node: node,
          Type: type
        },
        ProjectionExpression: '#Node, #Type, #Data'
      })
      .promise()
      .then(parseResponseItemsData);
  };
};
