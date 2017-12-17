'use strict';

var chunk = require('lodash/chunk.js');
var flatten = require('lodash/flatten.js');
var propertyItem = require('./propertyItem.js');

/**
 * Factory function that returns a function that follows the DynamoDB put
 * interface, to add a new property reference to an existing node.
 * The table name can be provided while calling the factory, or it can use an
 * environment variable called TABLE_NAME.
 * Gets all the nodes and edges type associated to a node.
 * @param {DBConfig} options - Database driver and table configuration.
 * @returns {function} Function ready to put Node on a DynamoDB table.
 * @param {object} config - Property configuration object.
 * @property {string} tenant - Identifier of current tenant.
 * @property {string} node - Identifier for the node to attach properties.
 * @property {number} maxGSIK - Maximum number of GSIK.
 * @property {Property[]} properties - List of properties to add to node.
 * @returns {promise} With the data returned from the database.
 */
module.exports = function createProperties(options) {
  var { db, table = process.env.TABLE_NAME } = options;
  return config => {
    var { tenant = '', node, maxGSIK, properties } = config;

    if (maxGSIK === undefined) throw new Error('Max GSIK is undefined');
    if (!properties || !properties.length)
      throw new Error('Properties is undefined');

    var promises = chunk(properties, 25).map(propertiesChunk =>
      db
        .batchWrite({
          RequestItems: {
            [table]: propertiesChunk.map(([type, data]) => ({
              PutRequest: {
                Item: propertyItem({ tenant, node, type, data, maxGSIK })
              }
            }))
          }
        })
        .promise()
    );

    return Promise.all(flatten(promises));
  };
};
