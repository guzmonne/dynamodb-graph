'use strict';

/**
 * Factory that returns a function that attempts to create new Nodes.
 * @param {ConfigObject} config - Main configuration object.
 * @return {function} Function that attempts to create a new node.
 */
module.exports = function createFactory(config) {
  var item = require('./item.js')(config);
  return require('../general/create.js')(item, config);
};
