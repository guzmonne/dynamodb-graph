'use strict';

var cuid = require('cuid');
var utils = require('../modules/utils.js');

/**
 * Factory that returns a function that attempts to get a Node.
 * @param {function} item - Item creator function.
 * @param {ConfigObject} config - Main configuration object.
 * @return {function} Function that attempts to create a new node.
 */
module.exports = function getByNodeFactory(config = {}) {
  var { documentClient, table } = config;

  utils.checkConfiguration(config);

  /**
   * Function that attempts to get a Node.
   * @param {object} options - Node create options.
   * @property {string} node - Node unique identifier.
   * @property {string} type - Node type.
   */
  return function get(options = {}) {
    var { node } = options;

    if (node === undefined) throw new Error('Node is undefined');

    var params = {
      TableName: table,
      KeyConditionExpression: '#Node = :Node',
      ExpressionAttributeNames: {
        '#Node': 'Node'
      },
      ExpressionAttributeValues: {
        ':Node': node
      }
    };

    if (process.env.DEBUG) {
      params.ReturnConsumedCapacity = 'INDEXES';
      params.ReturnItemCollectionMetrics = 'SIZE';
    }

    return documentClient.query(params).promise();
  };
};
