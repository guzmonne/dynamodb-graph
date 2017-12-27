'use strict';

var cuid = require('cuid');
var utils = require('../modules/utils.js');

/**
 * Factory that returns a function that attempts to create new Nodes.
 * @param {function} item - Item creator function.
 * @param {ConfigObject} config - Main configuration object.
 * @return {function} Function that attempts to create a new node.
 */
module.exports = function getFactory(config = {}) {
  var { documentClient, table } = config;

  utils.checkConfiguration(config);

  /**
   * Function that attempts to create a new Node.
   * @param {object} options - Node create options.
   * @property {string} [node] - Node unique identifier.
   * @property {string} type - Node type.
   * @property {string|number} data - Node main data.
   */
  return function get(options = {}) {
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

    return documentClient.get(params).promise();
  };
};
