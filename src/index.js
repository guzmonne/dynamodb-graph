'use strict';

var cuid = require('cuid');

//EXPORTS
//=======

module.exports = {
  nodeItem,
  edgeItem,
  propertyItem,
  createNode,
  deleteNode,
  addPropertyToNode,
  getNodeTypes
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
 * @param {NodeItemConfig} config NodeItem configuration object.
 * @returns {NodeItem} Node item object.
 */
function nodeItem(config) {
  var { tenant, type, data, node } = config;

  if (!type) throw new Error('Type is undefined');
  if (!data) throw new Error('Data is undefined');

  if (!node) node = tenant + '#' + cuid();

  return {
    Node: node,
    Type: type,
    Data: JSON.stringify(data),
    Target: node,
    GSIK: randomInt(config.maxGSIK >= 0 ? config.maxGSIK : 4)
  };
}
/**
 * Returns an EdgeItem structure as a JavaScript object. The node and the
 * target must be defined for te edge to be created. The GISK number is
 * generated as a random value from 0 to 4 by default. This can be modified by
 * passing the `maxGSKI` value as a parameter.
 * @param {EdgeItemConfig} config EdgeItem configuration object.
 * @returns {EdgeItem} Node item object.
 */
function edgeItem(config) {
  var { tenant, node, target, type, data } = config;

  if (!node) throw new Error('Node is undefined');
  if (!target) throw new Error('Target is undefined');
  if (!type) throw new Error('Type is undefined');
  if (!data) throw new Error('Data is undefined');

  return {
    Node: node,
    Type: type,
    Data: JSON.stringify(data),
    Target: target,
    GSIK: randomInt(config.maxGSIK >= 0 ? config.maxGSIK : 4)
  };
}

/**
 * Returns an PropertyItem structure as a JavaScript object. The node and the
 * target must be defined for te edge to be created. The GISK number is
 * generated as a random value from 0 to 4 by default. This can be modified by
 * passing the `maxGSKI` value as a parameter.
 * @param {PropertyItemConfig} config PropertyItem configuration object.
 * @returns {EdgeItem} Node item object.
 */
function propertyItem(config) {
  var { node, type, data } = config;

  if (!node) throw new Error('Node is undefined');
  if (!type) throw new Error('Type is undefined');
  if (!data) throw new Error('Data is undefined');

  return {
    Node: node,
    Type: type,
    Data: JSON.stringify(data),
    GSIK: randomInt(config.maxGSIK >= 0 ? config.maxGSIK : 4)
  };
}

/**
 * Factory function that returns a function that follow the DynamoDB put
 * interface, to store items on a table. The table name can be provided while
 * calling the factory, or it can use an environment variable called
 * TABLE_NAME.
 * @param {DBConfig} options - Database driver and table configuration.
 * @returns {function} Function ready to put Node on a DynamoDB table.
 * @param {NodeItemConfig} config - NodeItem configuration object.
 * @returns {promise} With the data returned from the database.
 */
function createNode(options) {
  var { db, table = process.env.TABLE_NAME } = options;
  return config =>
    db
      .put({
        TableName: table,
        Item: nodeItem(config)
      })
      .promise();
}
/**
 * Factory function that returns a function that follows the DynamoDB query
 * interface, to get all the node types from the table.
 * The table name can be provided while calling the factory, or it can use an
 * environment variable called TABLE_NAME.
 * Gets all the nodes and edges type associated to a node.
 * @param {DBConfig} options - Database driver and table configuration.
 * @returns {function} Function ready to put Node on a DynamoDB table.
 * @param {string} node - Node to query.
 * @returns {promise} With the data returned from the database.
 */
function getNodeTypes(options) {
  var { db, table = process.env.TABLE_NAME } = options;
  return node =>
    db
      .query({
        TableName: table,
        KeyConditionExpression: '#Node = :Node',
        ExpressionAttributeNames: {
          '#Node': 'Node',
          '#Type': 'Type'
        },
        ExpressionAttributeValues: {
          ':Node': node
        },
        ProjectionExpression: '#Type'
      })
      .promise();
}
/**
 * Factory function that returns a function that follows the DynamoDB delete
 * interface, to get delete a node and all its edged from the table.
 * The table name can be provided while calling the factory, or it can use an
 * environment variable called TABLE_NAME.
 * Gets all the nodes and edges type associated to a node.
 * @param {DBConfig} options - Database driver and table configuration.
 * @returns {function} Function ready to put Node on a DynamoDB table.
 * @param {string} node - Node to delete.
 * @returns {promise} With the data returned from the database.
 */
function deleteNode(options) {
  var { db, table = process.env.TABLE_NAME } = options;
  var getNodeTypesPromise = getNodeTypes(options);
  return node =>
    getNodeTypesPromise(node).then(response =>
      Promise.all(
        response.Items.map(item =>
          db
            .delete({
              TableName: table,
              Key: {
                Node: node,
                Type: item.Type
              }
            })
            .promise()
        )
      )
    );
}
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
function addPropertyToNode(options) {
  var { db, table = process.env.TABLE_NAME } = options;
  return config =>
    db
      .put({
        TableName: table,
        Item: propertyItem(config)
      })
      .promise();
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
