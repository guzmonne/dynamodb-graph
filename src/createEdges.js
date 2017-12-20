'use strict';

var chunk = require('lodash/chunk.js');
var flatten = require('lodash/flatten.js');
var edgeItem = require('./edgeItem.js');

/**
 * Factory function that returns a function that follows the DynamoDB put
 * interface, to add a new edges on an existing node.
 * The table name can be provided while calling the factory, or it can use an
 * environment variable called TABLE_NAME.
 * Gets all the nodes and edges type associated to a node.
 * @param {DBConfig} options - Database driver and table configuration.
 * @returns {function} Function ready to put Node on a DynamoDB table.
 * @param {object} config - Property configuration object.
 * @property {string} tenant - Identifier of current tenant.
 * @property {string} node - Identifier for the node to attach edges.
 * @property {number} maxGSIK - Maximum number of GSIK.
 * @property {Edge[]} edges - List of edges to add to node.
 * @returns {promise} With the data returned from the database.
 */
module.exports = function createEdges(options) {
  var { db, table = process.env.TABLE_NAME } = options;
  return config => {
    var { tenant = '', node, maxGSIK, edges } = config;

    if (maxGSIK === undefined) throw new Error('Max GSIK is undefined');
    if (node === undefined) throw new Error('Node is undefined');
    if (!edges || !edges.length)
      throw new Error('Edges is undefined or not a list.');

    var promises = chunk(edges, 25).map(edgesChunk =>
      db
        .batchWrite({
          RequestItems: {
            [table]: edgesChunk.map(edge => ({
              PutRequest: {
                Item: edgeItem({
                  tenant,
                  node,
                  type: edge.Type,
                  data: edge.Data,
                  target: edge.Target,
                  maxGSIK
                })
              }
            }))
          }
        })
        .promise()
    );

    return Promise.all(flatten(promises));
  };
};
