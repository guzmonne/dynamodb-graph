'use strict';

var cuid = require('cuid');
var utils = require('./modules/utils.js');

/**
 * Returns an PropertyItem structure as a JavaScript object. The node and the
 * target must be defined for te edge to be created. The GISK number is
 * generated as a random value from 0 to 4 by default. This can be modified by
 * passing the `maxGSKI` value as a parameter.
 * @param {PropertyItemConfig} config PropertyItem configuration object.
 * @returns {EdgeItem} Node item object.
 */
module.exports = function propertyItem(config) {
  var { tenant = '', node, type, data, gsik, maxGSIK } = config;

  if (!node) throw new Error('Node is undefined');
  if (!type) throw new Error('Type is undefined');
  if (!data) throw new Error('Data is undefined');

  return {
    Node: node,
    Type: type,
    Data: JSON.stringify(data),
    GSIK: utils.calculateGSIK({ tenant, node, maxGSIK })
  };
};