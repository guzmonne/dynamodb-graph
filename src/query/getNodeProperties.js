'use strict';

var getNodeItemsFactory = require('../general/getNodeItems.js');

/**
 * Factory that returns a function that attempts to get the node properties.
 * @param {ConfigObject} config - Main configuration object.
 * @return {function} Function that attempts to create a new node.
 */
module.exports = getNodeItemsFactory('properties');
