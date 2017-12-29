'use strict';

var range = require('lodash/range');
var utils = require('../modules/utils.js');
var getByFactory = require('../general/getBy.js');

var START_GSIK = 0;
var DEFAULT_GSIK_LIST_SIZE = 10;
var LIMIT = 10;
/**
 * Factory that returns a function that attempts query the table indexed by
 * GSIK, through the `ByType` GSI, and sorted by type.
 * @param {ConfigObject} config - Main configuration object.
 * @return {function} Function that attempts to create a new node.
 */
module.exports = function getByTypeFactory(config = {}) {
  return getByFactory('Type', config);
};
