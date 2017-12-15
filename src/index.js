'use strict';

var cuid = require('cuid');

// TYPE DEFINITIONS
// ================

/**
 * Node schema to store on DynamoDB.
 * @typedef {object} NodeItem
 * @property {string} Node - Node ID.
 * @property {string} Type - Node Type.
 * @property {string} Data - Node main data for easy access.
 * @property {string} Target=Node - A Node always targets itself.
 * @property {string} GSIK - The GSI Key to use by DynamoDB indexes.
 */

//EXPORTS
//=======

module.exports = {
  nodeItem
};

//=======

/**
 * @param {number} n - Maximum random int.
 * @returns {number} Random number between 0 and n.
 */
function randomInt(n) {
  return Math.floor(Math.random() * n) + 1;
}
/**
 * Returns a Node structure as a JavaScript object. If a `node` is not
 * provided then a new one is created for the Node. The GISK number is
 * generated as a random value from 0 to 4 by default. This can be modified by
 * passing the `maxGSKI` value as a parameter.
 * @param {object} options Options object.
 * @property {string} tenant='' - Identifier of the current tenant.
 * @property {string} type - Node type.
 * @property {any}    data - Main data of the node. Will be encoded so it
 *                           maintains its type even though it is stored as
 *                           a string.
 * @property {string} [node] - Existing node reference. Will be created if it
 *                             is not provided.
 * @property {number} [maxGSIK=4] - Maximum GSIK value to add on the node.
 * @returns {NodeItem} Node item object.
 */
function nodeItem(options) {
  var { tenant, type, data, node = cuid() } = options;
  return {
    Node: node,
    Type: type,
    Data: JSON.stringify(data),
    Target: node,
    GSIK: randomInt(options.maxGSIK || 4)
  };
}

module.exports = sum;
