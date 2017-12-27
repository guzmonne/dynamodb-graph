'use strict';

var utils = require('../modules/utils.js');

/**
 * Factory that returns an object with functions used to handle Nodes.
 * @param {ConfigObject} config
 * @return {object} Node functions.
 * @property {function} item - Creates a Node Item object.
 * @property {function} create - Attempts to create a new Node.
 * @property {function} destroy - Attempts to delete a Node.
 */
module.exports = function nodeFactory(config) {
  utils.checkConfiguration(config);

  return {
    item: require('./item.js')(config)
  };
};
