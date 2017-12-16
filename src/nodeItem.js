'use strict';

var cuid = require('cuid');
var utils = require('./modules/utils.js');

/**
 * Returns a NodeItem structure as a JavaScript object. If a `node` is not
 * provided then a new one is created for the Node. The GISK number is
 * generated as a random value from 0 to 4 by default. This can be modified by
 * passing the `maxGSKI` value as a parameter.
 * @param {NodeItemConfig} config NodeItem configuration object.
 * @returns {NodeItem} Node item object.
 */
module.exports = function nodeItem(config) {
  var { tenant = '', type, data, node, maxGSIK } = config;

  if (!type) throw new Error('Type is undefined');
  if (!data) throw new Error('Data is undefined');

  if (!node) node = tenant + '#' + cuid();

  return {
    Node: node,
    Type: type,
    Data: JSON.stringify(data),
    Target: node,
    GSIK: utils.calculateGSIK({ node, tenant, maxGSIK })
  };
};
