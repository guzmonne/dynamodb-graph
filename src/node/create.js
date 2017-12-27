'use strict';

var cuid = require('cuid');

/**
 * Factory that returns a function that attempts to create new Nodes.
 * @param {ConfigObject} config - Main configuration object.
 * @return {function} Function that attempts to create a new node.
 */
module.exports = function createFactory(config) {
  var item = require('./item.js')(config);
  var nodeCreate = require('../general/create.js')(item, config);

  return function create(options) {
    options = Object.assign({}, options);

    if (options.node === undefined) options.node = cuid();

    return nodeCreate(options);
  };
};
