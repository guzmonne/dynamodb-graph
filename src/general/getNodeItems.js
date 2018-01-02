'use strict';

var cuid = require('cuid');
var utils = require('../modules/utils.js');

/**
 *
 * @param {"properties"|"edges"} items - Items type.
 */
module.exports = function getNodeItemsFactoryFactory(items) {
  if (items !== 'properties' && items !== 'edges')
    throw new Error('Invalid items value');

  /**
   * Factory that returns a function that attempts to get the node properties or
   * edges.
   * @param {ConfigObject} config - Main configuration object.
   * @return {function} Function that attempts to create a new node.
   */
  return function getNodeItemsFactory(config = {}) {
    var { documentClient, table } = config;

    utils.checkConfiguration(config);

    /**
     * Function that attempts to get all the Node properties or edges.
     * @param {object} options - Node create options.
     * @property {string} node - Node unique identifier.
     * @property {string} expression - Node type expression.
     * @property {string} value - Node expression value.
     */
    return function getNodeItems(options = {}) {
      var { node, expression, value } = options;

      if (node === undefined) throw new Error('Node is undefined');

      var params = {
        TableName: table,
        KeyConditionExpression: `#Node = :Node${
          expression !== undefined ? ` AND ${expression}` : ''
        }`,
        ExpressionAttributeNames: Object.assign(
          {
            '#Node': 'Node',
            '#Target': 'Target'
          },
          value !== undefined ? { '#Type': 'Type' } : {}
        ),
        ExpressionAttributeValues: Object.assign(
          {
            ':Node': node
          },
          value !== undefined ? { ':Type': value } : {}
        ),
        FilterExpression:
          items === 'properties'
            ? 'attribute_not_exists(#Target)'
            : 'attribute_exists(#Target)'
      };

      return documentClient.query(params).promise();
    };
  };
};
