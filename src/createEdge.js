'use strict';

var getNodeData = require('./getNodeData.js');
var edgeItem = require('./edgeItem.js');

/**
 * Factory function that returns a function that follows the DynamoDB put
 * interface, to add a new edge between two nodes.
 * The table name can be provided while calling the factory, or it can use an
 * environment variable called TABLE_NAME.
 * Gets all the nodes and edges type associated to a node.
 * @param {DBConfig} options - Database driver and table configuration.
 * @returns {function} Function ready to put Node on a DynamoDB table.
 * @param {EdgeItemConfig} config - Property configuration object.
 * @returns {promise} With the data returned from the database.
 */
module.exports = function createEdge(options) {
  var { db, table = process.env.TABLE_NAME } = options;
  var getNodeDataPromise = getNodeData(options);
  return (config = {}) => {
    return getNodeDataPromise(config.node).then(response => {
      if (response.Items.length === 0)
        throw new Error(`Empty data for Node ${node}`);
      config.data = response.Items[0].Data;
      return db
        .put({
          TableName: table,
          Item: edgeItem(config)
        })
        .promise();
    });
  };
};
