'use strict';

/**
 * Factory that returns a function that attempts to create new Nodes.
 * @param {ConfigObject} config - Main configuration object.
 * @return {function} Function that attempts to create a new node.
 */
module.exports = function createFactory(config) {
  var item = require('./item.js')(config);
  var edgeCreate = require('../general/create.js')(item, config);

  return function create(options = {}) {
    var { node, target } = options;

    if (node === undefined) throw new Error('Node is undefined');
    if (target === undefined) throw new Error('Target is undefined');

    return edgeCreate(options);
  };
};
