'use strict';

var getNodeTypes = require('./getNodeTypes.js');

/**
 * Factory function that returns a function that follows the DynamoDB delete
 * interface, to get delete a node and all its edged from the table.
 * The table name can be provided while calling the factory, or it can use an
 * environment variable called TABLE_NAME.
 * Gets all the nodes and edges type associated to a node.
 * @param {DBConfig} options - Database driver and table configuration.
 * @returns {function} Function ready to put Node on a DynamoDB table.
 * @param {string} node - Node to delete.
 * @returns {promise} With the data returned from the database.
 */
module.exports = function deleteNode(options) {
  var { db, table = process.env.TABLE_NAME } = options;
  return node =>
    getNodeTypes(options)(node).then(response =>
      Promise.all(
        response.Items.map(item =>
          db
            .delete({
              TableName: table,
              Key: {
                Node: node,
                Type: item.Type
              }
            })
            .promise()
        )
      )
    );
};
