'use strict';

var utils = require('../modules/utils.js');
var getItemFactory = require('./getItem.js');
var getByNodeFactory = require('./getByNode.js');

/**
 * Factory function that returns a function that can run queries against the
 * table.
 * @param {ConfigObject} config - Main configuration object.
 * @return {function} Function that attempts to create a new node.
 */
module.exports = function createFactory(config = {}) {
  var { tenant = '', documentClient, table } = config;

  utils.checkConfiguration(config);

  var getItem = getItemFactory(config);
  var getByNode = getByNodeFactory(config);

  /**
   * Function that queries the table for items.
   * @param {object} options - Node create options.
   * @property {string} [node] - Node unique identifier.
   * @property {string} [type] - Node type.
   * @property {WhereCondition} [where] - Where condition to apply on the data
   *                                      or on the type.
   * @property {string|number} data - Node main data.
   */
  return function query(options) {
    if (options === undefined || typeof options !== 'object')
      return Promise.resolve({});

    var { node, type, where } = options;

    if (node !== undefined) {
      if (type !== undefined) return getItem({ node, type });

      if (where !== undefined) {
        var { expression, value } = utils.parseWhere(where);

        return getByNode({ node, expression, value });
      }

      return getByNode({ node });
    }

    return Promise.resolve();
  };
};
