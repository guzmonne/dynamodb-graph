'use strict';

var cuid = require('cuid');

//EXPORTS
//=======

module.exports = {
  _hashCode: hashCode,
  _calculateGSIK: calculateGSIK,
  __parseResponseItemsData: parseResponseItemsData,
  nodeItem,
  edgeItem,
  propertyItem,
  createNode,
  deleteNode,
  createProperty,
  getNodeTypes,
  getNodeData,
  getNodesWithType,
  createEdge
};

//=======
/**
 * Takes a DynamoDB response, and parses all the Data attibute of all its items.
 * @param {DynamoDBResponse} response DynamoDB response object.
 * @returns {DynamoDBResponse} DynamoDB response, with all its items Data parsed
 */
function parseResponseItemsData(response) {
  if (response && response.Items) {
    response = Object.assign({}, response);
    response.Items.forEach(item => {
      if (item.Data) item.Data = JSON.parse(item.Data);
    });
  }
  return response;
}
/**
 * Applies the hashcode algorithm to turn a string into a number.
 * @param {string} string - String to encode to a number.
 * @returns {number} Encoded string
 */
function hashCode(string = '') {
  var hash = 0,
    i,
    chr;
  if (string.length === 0) return hash;
  for (i = 0; i < string.length; i++) {
    chr = string.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
/**
 * @param {number} n - Maximum random int.
 * @returns {number} Random number between 0 and n.
 */
function randomInt(n) {
  return Math.floor(Math.random() * n) + 1;
}
/**
 * Returns a random GSIK based on the tenant and a random number.
 * @property {string} tenant='' - Identifier of the current tenant.
 * @param {number} n - Maximum GSIK value.
 * @returns {number} Random number between 0 and n.
 */
function calculateGSIK(node, maxGSIK = 4) {
  if (!node) throw new Error('Node is undefined');
  if (maxGSIK < 2) return node + '#' + 1;
  return node + '#' + Math.abs(hashCode(node)) % maxGSIK;
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
  var { tenant, type, data, node, maxGSIK } = config;

  if (!type) throw new Error('Type is undefined');
  if (!data) throw new Error('Data is undefined');

  if (!node) node = tenant + '#' + cuid();

  return {
    Node: node,
    Type: type,
    Data: JSON.stringify(data),
    Target: node,
    GSIK: calculateGSIK(node, maxGSIK)
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
  var { tenant, node, target, type, data, maxGSIK } = config;

  if (!node) throw new Error('Node is undefined');
  if (!target) throw new Error('Target is undefined');
  if (!type) throw new Error('Type is undefined');
  if (!data) throw new Error('Data is undefined');

  return {
    Node: node,
    Type: type,
    Data: JSON.stringify(data),
    Target: target,
    GSIK: calculateGSIK(node, maxGSIK)
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
  var { node, type, data, gsik, maxGSIK } = config;

  if (!node) throw new Error('Node is undefined');
  if (!type) throw new Error('Type is undefined');
  if (!data) throw new Error('Data is undefined');

  return {
    Node: node,
    Type: type,
    Data: JSON.stringify(data),
    GSIK: calculateGSIK(node, maxGSIK)
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
  return node => {
    if (!node) throw new Error('Node is undefined.');
    return db
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
  };
}
/**
 * Factory function that returns a function that follows the DynamoDB query
 * interface, to get all the data stored inside a node.
 * The table name can be provided while calling the factory, or it can use an
 * environment variable called TABLE_NAME.
 * Gets all the nodes and edges type associated to a node.
 * @param {DBConfig} options - Database driver and table configuration.
 * @returns {function} Function ready to put Node on a DynamoDB table.
 * @param {string} node - Node to query.
 * @returns {promise} With the data returned from the database.
 */
function getNodeData(options) {
  var { db, table = process.env.TABLE_NAME } = options;
  return node => {
    if (!node) throw new Error('Node is undefined.');
    return db
      .query({
        TableName: table,
        KeyConditionExpression: `#Node = :Node`,
        ExpressionAttributeNames: {
          '#Node': 'Node',
          '#Target': 'Target',
          '#Data': 'Data'
        },
        ExpressionAttributeValues: {
          ':Node': node
        },
        FilterExpression: '#Target = :Node',
        ProjectionExpression: '#Data'
      })
      .promise();
  };
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
 * Factory function that returns a function that follows the DynamoDB put
 * interface, to add a new edge between two nodes.
 * The table name can be provided while calling the factory, or it can use an
 * environment variable called TABLE_NAME.
 * Gets all the nodes and edges type associated to a node.
 * @param {DBConfig} options - Database driver and table configuration.
 * @returns {function} Function ready to put Node on a DynamoDB table.
 * @param {EdgeItemConfig} config - Property configuration object.
 * @returns {promise} With the data returned from the database.
 */
function createEdge(options) {
  var { db, table = process.env.TABLE_NAME } = options;
  var getNodeDataPromise = getNodeData(options);
  return (config = {}) => {
    return getNodeDataPromise(config.node).then(response => {
      if (response.Items.length === 0)
        throw new Error(`Empty data for Node ${node}`);
      config.data = response.Items[0].Data;
      return db
        .put({
          TableName: table,
          Item: edgeItem(config)
        })
        .promise();
    });
  };
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
function getNodesWithType(options) {
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

function getNodesByType(organizationId, type, depth) {
  depth || (depth = 0);
  var response = { Items: [], Count: 0, ScannedCount: 0 };
  var getNodesWithTypePromise = getNodesWithType(options);
  return new Promise((resolve, reject) => {
    Rx.Observable.range(0, GSI_PARTITIONS)
      .mergeMap(i => {
        return Rx.Observable.fromPromise(getNodesWithTypePromise(config));
      })
      .map(parseResponseItems)
      .reduce(
        (acc, response) => ({
          Items: acc.Items.concat(response.Items),
          Count: acc.Count + response.Count,
          ScannedCount: acc.ScannedCount + response.ScannedCount
        }),
        Object.assign({}, response)
      )
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
