'use strict';

var getNodeTypes = require('./getNodeTypes.js');

/**
 * Factory function that returns a function that follows the DynamoDB delete
 * interface, to delete a node property or edge.
 * The table name can be provided while calling the factory, or it can use an
 * environment variable called TABLE_NAME.
 * @param {DBConfig} options - Database driver and table configuration.
 * @returns {function} Function ready to put Node on a DynamoDB table.
 * @param {object} config - Node to delete.
 * @returns {promise} With the data returned from the database.
 */
module.exports = function deleteNode(options) {
  var { db, table = process.env.TABLE_NAME } = options;
  return (config = {}) => {
    var { node, type } = config;
    return db
      .delete({
        TableName: table,
        Key: {
          Node: node,
          Type: type
        }
      })
      .promise();
  };
};
