'use strict';

var createEdge = require('../src/createEdge.js');
var createEdges = require('../src/createEdges.js');
var createNode = require('../src/createNode.js');
var createProperties = require('../src/createProperties.js');
var createProperty = require('../src/createProperty.js');
var deleteNode = require('../src/deleteNode.js');
var deletePropertyOrEdge = require('../src/deletePropertyOrEdge.js');
var edgeItem = require('../src/edgeItem.js');
var getNode = require('../src/getNode.js');
var getNodeData = require('../src/getNodeData.js');
var getNodeEdges = require('../src/getNodeEdges.js');
var getNodeProperties = require('../src/getNodeProperties.js');
var getNodePropertiesAndEdges = require('../src/getNodePropertiesAndEdges.js');
var getNodesWithProperties = require('../src/getNodesWithProperties.js');
var getNodesWithPropertiesAndEdges = require('../src/getNodesWithPropertiesAndEdges.js');
var getNodes = require('../src/getNodes.js');
var getNodesByGSIK = require('../src/getNodesByGSIK.js');
var getNodeTypes = require('../src/getNodeTypes.js');
var nodeItem = require('../src/nodeItem.js');
var propertyItem = require('../src/propertyItem.js');

//EXPORTS
//=======
var fns = {
  createEdge,
  createEdges,
  createNode,
  createProperty,
  createProperties,
  deleteNode,
  deletePropertyOrEdge,
  getNode,
  getNodeData,
  getNodeEdges,
  getNodeProperties,
  getNodePropertiesAndEdges,
  getNodesWithProperties,
  getNodesWithPropertiesAndEdges,
  getNodes,
  getNodesByGSIK,
  getNodeTypes
};

var props = {
  edgeItem,
  nodeItem,
  propertyItem
};

module.exports = function dynamodbGraoh(options = {}) {
  options.table || (options.table = process.env.TABLE_NAME);

  if (!options.db) throw new Error('DB is undefined');
  if (!options.table) throw new Error('Table is undefined');

  return Object.assign(
    Object.keys(fns).reduce(
      (acc, key) =>
        Object.assign(acc, {
          [key]: fns[key](options)
        }),
      {}
    ),
    props
  );
};
