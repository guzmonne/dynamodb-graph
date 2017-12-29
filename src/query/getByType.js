'use strict';

var getByFactory = require('../general/getBy.js');

/**
 * Factory that returns a function that attempts query the table indexed by
 * GSIK, through the `ByType` GSI, and sorted by type.
 * @param {ConfigObject} config - Main configuration object.
 * @return {function} Function that attempts to create a new node.
 */
module.exports = function getByTypeFactory(config = {}) {
  return getByFactory('Type', config);
};
