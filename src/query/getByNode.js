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
  return function getByNode(options = {}) {
    var { node, value, expression } = options;

    if (node === undefined) throw new Error('Node is undefined');
    if (expression !== undefined) {
      if (typeof expression !== 'string')
        throw new Error('Expression is not a string');
      if (value === undefined) throw new Error('Value is undefined');
    }

    var names = {
      '#Node': 'Node'
    };

    var values = {
      ':Node': node
    };

    if (expression) {
      names['#Type'] = 'Type';
      if (Array.isArray(value) === true) {
        values[':a'] = value[0];
        values[':b'] = value[1];
      } else {
        values[':Type'] = value;
      }
    }

    var params = {
      TableName: table,
      KeyConditionExpression: `#Node = :Node${
        expression ? ' AND' + expression : ''
      }`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values
    };

    if (process.env.DEBUG) {
      params.ReturnConsumedCapacity = 'INDEXES';
      params.ReturnItemCollectionMetrics = 'SIZE';
    }

    return documentClient.query(params).promise();
  };
};
