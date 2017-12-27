'use strict';

var cuid = require('cuid');
var utils = require('../modules/utils.js');
var itemFactory = require('./item.js');

/**
 * Factory that returns a function that attempts to create new Nodes.
 * @param {ConfigObject} config - Main configuration object.
 * @return {function} Function that attempts to create a new node.
 */
module.exports = function createFactory(config = {}) {
  var { tenant = '', documentClient, table } = config;

  utils.checkConfiguration(config);

  var item = itemFactory(config);

  /**
   * Function that attempts to create a new Node.
   * @param {object} options - Node create options.
   * @property {string} [node] - Node unique identifier.
   */
  return function create(options = {}) {
    var { node = cuid(), type, data } = options;

    if (type === undefined) throw new Error('Type is undefined');
    if (data === undefined) throw new Error('Data is undefined');

    var params = {
      TableName: table,
      Item: item({ node, type, data })
    };

    if (process.env.DEBUG) {
      params.ReturnConsumedCapacity = 'INDEXES';
      params.ReturnItemCollectionMetrics = 'SIZE';
    }

    return documentClient.put(params).promise();
  };
};
