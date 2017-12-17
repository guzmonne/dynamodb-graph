'use strict';

var propertyItem = require('./propertyItem.js');

/**
 * Factory function that returns a function that follows the DynamoDB put
 * interface, to add a new property reference to an existing node.
 * The table name can be provided while calling the factory, or it can use an
 * environment variable called TABLE_NAME.
 * Gets all the nodes and edges type associated to a node.
 * @param {DBConfig} options - Database driver and table configuration.
 * @returns {function} Function ready to put Node on a DynamoDB table.
 * @param {PropertyItemConfig} config - Property configuration object.
 * @returns {promise} With the data returned from the database.
 */
module.exports = function createProperty(options) {
  var { db, table = process.env.TABLE_NAME } = options;
  return config => {
    var item = propertyItem(config);
    return db
      .put({
        TableName: table,
        Item: item
      })
      .promise()
      .then(response => Object.assign(response, { Item: item }));
  };
};
