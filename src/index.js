'use strict';

var cuid = require('cuid');
var Rx = require('rxjs/Rx');
var {
  randomMac,
  hashCode,
  calculateGSIK,
  parseResponseItemsData,
  mergeDynamoResponses
} = require('./modules/utils.js');
var nodeItem = require('./nodeItem.js');
var edgeItem = require('./edgeItem.js');
var propertyItem = require('./propertyItem.js');
var createNode = require('./createNode.js');
var getNodeTypes = require('./getNodeTypes.js');
var getNodeData = require('./getNodeData.js');
var deleteNode = require('./deleteNode.js');
var createEdge = require('./createEdge.js');
//EXPORTS
//=======

module.exports = {
  edgeItem,
  propertyItem,
  createNode,
  deleteNode,
  createProperty,
  getNodeTypes,
  getNodeData,
  getNodesWithTypeOnGSI,
  getNodesWithType,
  createEdge
};

//=======

/**
 * Factory function that returns a function that follows the DynamoDB put
 * interface, to add a new property reference to an existing node.
 * The table name can be provided while calling the factory, or it can use an
 * environment variable called TABLE_NAME.
 * Gets all the nodes and edges type associated to a node.
 * @param {DBConfig} options - Database driver and table configuration.
 * @returns {function} Function ready to put Node on a DynamoDB table.
 * @param {PropertyItemConfig} config - Property configuration object.
 * @returns {promise} With the data returned from the database.
 */
function createProperty(options) {
  var { db, table = process.env.TABLE_NAME } = options;
  return config =>
    db
      .put({
        TableName: table,
        Item: propertyItem(config)
      })
      .promise();
}

/**
 * Factory function that returns a function that follows the DynamoDB query
 * interface, to get all the nodes with a certain type, by traversing the
 * ByType GSI Index.
 * The table name can be provided while calling the factory, or it can use an
 * environment variable called TABLE_NAME.
 * Gets all the nodes and edges type associated to a node.
 * @param {DBConfig} options - Database driver and table configuration.
 * @returns {function} Function ready to put Node on a DynamoDB table.
 * @param {object} config - Property configuration object.
 * @property {string} type - Type to look for.
 * @property {number} gsik - GSIK number to look in.
 * @returns {promise} With the data returned from the database.
 */
function getNodesWithTypeOnGSI(options) {
  var { db, table = process.env.TABLE_NAME } = options;
  return (config = {}) => {
    var { gsik, type } = config;
    if (!type) throw new Error('Type is undefined');
    if (!gsik) throw new Error('GSIK is undefined');
    return db
      .query({
        TableName: table,
        IndexName: 'ByType',
        KeyConditionExpression: `#GSIK = :GSIK AND #Type = :Type`,
        ExpressionAttributeNames: {
          '#GSIK': 'GSIK',
          '#Type': 'Type',
          '#Data': 'Data',
          '#Node': 'Node'
        },
        ExpressionAttributeValues: {
          ':GSIK': gsik,
          ':Type': type
        },
        ProjectionExpression: '#Data,#Node'
      })
      .promise()
      .then(parseResponseItemsData);
  };
}
/**
 * Factory function that returns a function that follows calls a GSI to retrieve
 * all the nodes that exist of the a given type. The maxGSIK is mandatory to
 * check all the possible GSIK where the types might be stored.
 * The table name can be provided while calling the factory, or it can use an
 * environment variable called TABLE_NAME.
 * Gets all the nodes and edges type associated to a node.
 * @param {DBConfig} options - Database driver and table configuration.
 * @returns {function} Function ready to put Node on a DynamoDB table.
 * @param {object} config - Property configuration object.
 * @property {string} tenant - Identifier of the current tenant.
 * @property {string} type - Type to look for.
 * @property {number} maxGSIK - GSIK number to look in.
 * @returns {promise} With the data returned from the database.
 */
function getNodesWithType(options) {
  return config => {
    return new Promise((resolve, reject) => {
      var { tenant, type, maxGSIK } = config;
      if (!maxGSIK) throw new Error('Max GSIK is undefined');
      var getNodesWithTypePromise = getNodesWithTypeOnGSI(options);
      Rx.Observable.range(0, maxGSIK)
        .map(i => tenant + '#' + i)
        .mergeMap(gsik =>
          Rx.Observable.fromPromise(getNodesWithTypePromise({ gsik, type }))
        )
        .reduce(mergeDynamoResponses)
        .subscribe({
          next: resolve,
          error: reject
        });
    });
  };
}

function getNodesByType__(organizationId, type, depth) {
  depth || (depth = 0);
  var response = { Items: [], Count: 0, ScannedCount: 0 };
  var getNodesWithTypePromise = getNodesWithType(options);
  return new Promise((resolve, reject) => {
    Rx.Observable.range(0, GSI_PARTITIONS)
      .mergeMap(i => Rx.Observable.fromPromise(getNodesWithTypePromise(config)))
      .reduce(mergeDynamoResponses)
      .mergeMap(result => {
        if (depth > 0) {
          return Rx.Observable.from(result.Items.map(item => item.Node))
            .mergeMap(node =>
              Rx.Observable.fromPromise(
                db
                  .query({
                    TableName: TABLE_NAME,
                    KeyConditionExpression: `#Node = :Node`,
                    ExpressionAttributeNames: {
                      '#Node': 'Node',
                      '#Target': 'Target'
                    },
                    ExpressionAttributeValues: {
                      ':Node': node
                    },
                    FilterExpression: '#Target <> :Node'
                  })
                  .promise()
              ).map(response => {
                var current = result.Items.find(item => {
                  return item.Node === node;
                });
                response.Items.forEach(item => {
                  current[item.Type] = JSON.parse(item.Data);
                });
                return current;
              })
            )
            .reduce(acc => acc, result);
        }
        return Rx.Observable.of(result);
      })
      .subscribe({
        next: resolve,
        error: reject
      });
  });
}

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
