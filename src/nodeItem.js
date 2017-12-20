'use strict';

var cuid = require('cuid');
var utils = require('./modules/utils.js');

/**
 * Returns a NodeItem structure as a JavaScript object. If a `node` is not
 * provided then a new one is created for the Node. The GISK number is
 * generated as a random value from 0 to 4 by default. This can be modified by
 * passing the `maxGSKI` value as a parameter.
 * The node will be stored with the MaxGSIK value, so you can have multiple
 * nodes with different GSIK values. Even two nodes of the same type can have
 * different maxGSKI values. Having this information close to them simplifies
 * the task of finding the associated properties and edges. You should only
 * increase this value, never decrease it. Doing so can make finding certain
 * information impossible, until you turn it up again.
 * @param {NodeItemConfig} config NodeItem configuration object.
 * @returns {NodeItem} Node item object.
 */
module.exports = function nodeItem(config) {
  var { tenant = '', type, data, node, maxGSIK } = config;

  if (type === undefined) throw new Error('Type is undefined');
  if (data === undefined) throw new Error('Data is undefined');

  if (!node) node = tenant + '#' + cuid();

  return {
    Node: node,
    Type: type,
    Data: JSON.stringify(data),
    Target: node,
    GSIK: utils.calculateGSIK({ node, tenant, maxGSIK }),
    MaxGSIK: maxGSIK
  };
};
