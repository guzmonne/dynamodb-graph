'use strict';

var cuid = require('cuid');

// TYPE DEFINITIONS
// ================

/**
 * NodeItem schema to store on DynamoDB.
 * @typedef {object} NodeItem
 * @property {string} Node - Node ID.
 * @property {string} Type - Node Type.
 * @property {string} Data - Node main data for easy access.
 * @property {string} Target=Node - A Node always targets itself.
 * @property {string} GSIK - The GSI Key to use by DynamoDB indexes.
 */

/**
 * EdgeItem schema to store on DynamoDB.
 * @typedef {object} EdgeItem
 * @property {string} Node - Node ID from where the edge begins.
 * @property {string} Type - Edge Type.
 * @property {string} Data - Edge main data for easy access.
 * @property {string} Target - The end node of the edge.
 * @property {string} GSIK - The GSI Key to use by DynamoDB indexes.
 */

//EXPORTS
//=======

module.exports = {
  nodeItem,
  edgeItem
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
 * Returns a NodeItem structure as a JavaScript object. If a `node` is not
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
  var { tenant, type, data, node } = options;

  if (!type) throw new Error('Type is undefined');
  if (!data) throw new Error('Data is undefined');

  if (!node) node = tenant + '#' + cuid();

  return {
    Node: node,
    Type: type,
    Data: JSON.stringify(data),
    Target: node,
    GSIK: randomInt(options.maxGSIK || 4)
  };
}
/**
 * Returns an EdgeItem structure as a JavaScript object. The node and the
 * target must be defined for te edge to be created. The GISK number is
 * generated as a random value from 0 to 4 by default. This can be modified by
 * passing the `maxGSKI` value as a parameter.
 * @param {object} options Options object.
 * @property {string} tenant='' - Identifier of the current tenant.
 * @property {string} type - Node type.
 * @property {any}    data - Main data of the node. Will be encoded so it
 *                           maintains its type even though it is stored as
 *                           a string.
 * @property {string} node - Existing node reference. Will be created if it
 *                           is not provided.
 * @property {string} target - Existing node reference. Will be created if it
 *                             is not provided.
 * @property {number} [maxGSIK=4] - Maximum GSIK value to add on the node.
 * @returns {EdgeItem} Node item object.
 */
function edgeItem(options) {
  var { tenant, node, target, type, data } = options;

  if (!node) throw new Error('Node is undefined');
  if (!target) throw new Error('Target is undefined');
  if (!type) throw new Error('Type is undefined');
  if (!data) throw new Error('Data is undefined');

  return {
    Node: node,
    Type: type,
    Data: JSON.stringify(data),
    Target: target,
    GSIK: randomInt(options.maxGSIK || 4)
  };
}
