'use strict';

var utils = require('../modules/utils.js');
var getItemFactory = require('./getItem.js');
var getByNodeFactory = require('./getByNode.js');
var getByTypeFactory = require('./getByType.js');
var getByDataFactory = require('./getByData.js');
var getByTypeAndDataFactory = require('./getByTypeAndData.js');

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
  var getByType = getByTypeFactory(config);
  var getByData = getByDataFactory(config);
  var getByTypeAndData = getByTypeAndDataFactory(config);

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

    var { node, where, and } = options;

    if (node !== undefined) {
      var { type } = options;

      if (type !== undefined)
        return getItem({ node, type }).then((response = {}) => {
          response.Items = [Object.assign({}, response.Item)];
          delete response.Item;
          return response;
        });

      if (where !== undefined) {
        var { expression, value } = utils.parseWhere(where);

        return getByNode({ node, expression, value });
      }

      return getByNode({ node });
    }

    if (where === undefined) throw new Error('Where is undefined');

    var { gsik = {} } = options;
    var { start, end, limit, list } = gsik;

    var { attribute, expression, value } = utils.parseWhere(where);

    if (and !== undefined) {
      var { expression, value: data } = utils.parseWhere(and);

      return getByTypeAndData({
        expression,
        value: data,
        type: value,
        startTGSIK: start,
        endTGSIK: end,
        listTGSIK: list,
        limit
      });
    }

    var get = attribute === 'type' ? getByType : getByData;

    return get({
      expression,
      value,
      startGSIK: start,
      endGSIK: end,
      listGSIK: list,
      limit
    });
  };
};
