'use strict';

var cuid = require('cuid');
var utils = require('../modules/utils.js');

/**
 * Factory that returns a function that attempts to create new Nodes.
 * @param {function} item - Item creator function.
 * @param {ConfigObject} config - Main configuration object.
 * @return {function} Function that attempts to create a new node.
 */
module.exports = function createFactory(item, config = {}) {
  var { tenant = '', documentClient, table } = config;

  utils.checkConfiguration(config);

  /**
   * Function that attempts to create a new Node.
   * @param {object} options - Node create options.
   * @property {string} [node] - Node unique identifier.
   * @property {string} type - Node type.
   * @property {string|number} data - Node main data.
   */
  return function create(options = {}) {
    var { node = cuid(), type, data, target } = options;

    if (type === undefined) throw new Error('Type is undefined');
    if (data === undefined) throw new Error('Data is undefined');

    var params = {
      TableName: table,
      Item: item({ node, type, data, target })
    };

    if (process.env.DEBUG) {
      params.ReturnConsumedCapacity = 'INDEXES';
      params.ReturnItemCollectionMetrics = 'SIZE';
    }

    return documentClient.put(params).promise();
  };
};
