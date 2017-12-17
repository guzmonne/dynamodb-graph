'use strict';

var cuid = require('cuid');
var nodeItem = require('./nodeItem.js');

/**
 * Factory function that returns a function that follow the DynamoDB put
 * interface, to store items on a table. The table name can be provided while
 * calling the factory, or it can use an environment variable called
 * TABLE_NAME.
 * @param {DBConfig} options - Database driver and table configuration.
 * @returns {function} Function ready to put Node on a DynamoDB table.
 * @param {NodeItemConfig} config - NodeItem configuration object.
 * @returns {promise} With the data returned from the database.
 */
module.exports = function createNode(options) {
  var { db, table = process.env.TABLE_NAME } = options;
  return config => {
    var item = nodeItem(config);
    return db
      .put({
        TableName: table,
        Item: nodeItem(config)
      })
      .promise()
      .then(response => Object.assign(response, { Item: item }));
  };
};
