'use strict';

var utils = require('../modules/utils.js');

/**
 * Factory function that returns a function able to create valid Node items.
 * @param {Object} config - Configuration object.
 * @property {number} maxGSIK - Maximum GSIK value. Should be a multiple of 10.
 * @property {string} [tenant=''] - Tenant unique identifier.
 * @return {function} Configured item function.
 */
module.exports = function itemFactory(config = {}) {
  var { tenant = '' } = config;

  utils.checkConfiguration(config);

  /**
   * Creates Node items based on the provided configuration.
   * @param {object} options - Options object.
   * @property {string} node - Node unique identifier.
   * @property {string|number} data - Main node data.
   * @property {string} type - Node type.
   * @return {NodeItem} Node item object.
   */
  return function item(options = {}) {
    options = Object.assign({}, config, options);

    var { data, node, type } = options;

    if (node === undefined) throw new Error('Node is undefined');
    if (type === undefined) throw new Error('Type is undefined');
    if (data === undefined) throw new Error('Data is undefined');

    var dataType = typeof data;

    if (dataType !== 'string' && dataType !== 'number')
      throw new Error('Data type must be a string or a number');

    node = [tenant, node].filter(v => v !== '').join('#');

    var Data = dataType === 'string' ? 'String' : 'Number';

    return {
      Node: node,
      GSIK: utils.calculateGSIK(options),
      TGSIK: utils.calculateTGSIK(options),
      Target: node,
      Type: type,
      [Data]: data
    };
  };
};

/**
 * @typedef {Object} NodeItem
 * @property {string} Node - Node unique identifier.
 * @property {string} Type - Node type.
 * @property {string} Target - Node unique identifier.
 * @property {string} [String] - Node data if its a string.
 * @property {number} [Number] - Node data if its a number.
 * @property {string} GSIK - Node GSIK value used for indexing purposes.
 * @property {string} TGSIK - Node TGSIK value used for indexing purposes.
 */
