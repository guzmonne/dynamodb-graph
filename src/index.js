'use strict';

var nodeItem = require('./nodeItem.js');
var edgeItem = require('./edgeItem.js');
var propertyItem = require('./propertyItem.js');
var createNode = require('./createNode.js');
var getNodeTypes = require('./getNodeTypes.js');
var getNodeData = require('./getNodeData.js');
var deleteNode = require('./deleteNode.js');
var createEdge = require('./createEdge.js');
var createProperty = require('./createProperty.js');
var getNodesWithTypeOnGSI = require('./getNodesWithTypeOnGSI.js');
var getNodesWithType = require('./getNodesWithType.js');
var getNodeProperties = require('./getNodeProperties.js');
var getNodesWithPropertiesByType = require('./getNodesWithPropertiesByType.js');
//EXPORTS
//=======

module.exports = {
  createEdge,
  createNode,
  createProperty,
  edgeItem,
  deleteNode,
  getNodeData,
  getNodeTypes,
  getNodesWithPropertiesByType,
  getNodesWithTypeOnGSI,
  getNodesWithType,
  propertyItem
};

// TYPE DEFINITIONS
// ================

/**
 * NodeItem schema to store on DynamoDB.
 * @typedef {Object} NodeItem
 * @property {string} Node - Node ID.
 * @property {string} Type - Node Type.
 * @property {string} Data - Node main data for easy access.
 * @property {string} Target=Node - A Node always targets itself.
 * @property {string} GSIK - The GSI Key to use by DynamoDB indexes.
 */

/**
 * EdgeItem schema to store on DynamoDB.
 * @typedef {Object} EdgeItem
 * @property {string} Node - Node ID from where the edge begins.
 * @property {string} Type - Edge Type.
 * @property {string} Data - Edge main data for easy access.
 * @property {string} Target - The end node of the edge.
 * @property {string} GSIK - The GSI Key to use by DynamoDB indexes.
 */

/**
 * @typedef {Object} NodeItemConfig
 * @description NodeItem configuration object.
 * @property {string} tenant='' - Identifier of the current tenant.
 * @property {string} type - Node type.
 * @property {any}    data - Main data of the node. Will be encoded so it
 *                           maintains its type even though it is stored as
 *                           a string.
 * @property {string} [node] - Existing node reference. Will be created if it
 *                             is not provided.
 * @property {number} [maxGSIK=4] - Maximum GSIK value to add on the node.
 */

/**
 * @typedef {Object} EdgeItemConfig
 * @description EdgeItem configuration object.
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
 */

/**
 * @typedef {Object} PropertyItemConfig
 * @description EdgeItem configuration object.
 * @property {string} tenant='' - Identifier of the current tenant.
 * @property {string} type - Node type.
 * @property {any}    data - Main data of the node. Will be encoded so it
 *                           maintains its type even though it is stored as
 *                           a string.
 * @property {string} node - Existing node reference. Will be created if it
 *                           is not provided.
 * @property {number} [maxGSIK=4] - Maximum GSIK value to add on the node.
 */

/**
 * @typedef {Object} DBConfig
 * @description Database driver and table configuration.
 * @property {object} db - DynamoDB put interface compatible object.
 * @property {string} table=TABLE_NAME - Name of the DynamoDB table to use.
 */

/**
 * @typedef {Object} DynamoDBResponse
 * @description DynamoDB Response Object.
 * @property {number} Count - Number of items found.
 * @property {number} ScannedCount - Number of items analyzed.
 * @property {object[]} Items - Items results.
 */
