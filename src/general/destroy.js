'use strict';

var utils = require('../modules/utils.js');

/**
 * Factory that returns a function that attempts to destroy a Node.
 * @param {ConfigObject} config - Main configuration object.
 * @return {function} Function that attempts to destroy a node.
 */
module.exports = function destroyFactory(config = {}) {
  var { tenant = '', documentClient, table } = config;

  utils.checkConfiguration(config);

  return function destroy(options = {}) {
    var { node, type } = options;

    if (node === undefined) throw new Error('Node is undefined');
    if (type === undefined) throw new Error('Type is undefined');

    var params = {
      TableName: table,
      Key: {
        Node: node,
        Type: type
      }
    };

    if (process.env.DEBUG) {
      params.ReturnConsumedCapacity = 'INDEXES';
      params.ReturnItemCollectionMetrics = 'SIZE';
    }

    return documentClient.delete(params).promise();
  };
};
