'use strict';

var nodeItem = require('../src/nodeItem.js');
var edgeItem = require('../src/edgeItem.js');
var propertyItem = require('../src/propertyItem.js');
var createNode = require('../src/createNode.js');
var getNodeTypes = require('../src/getNodeTypes.js');
var getNodeData = require('../src/getNodeData.js');
var deleteNode = require('../src/deleteNode.js');
var createEdge = require('../src/createEdge.js');
var createProperty = require('../src/createProperty.js');
var getNodesWithTypeOnGSI = require('../src/getNodesWithTypeOnGSI.js');
var getNodesWithType = require('../src/getNodesWithType.js');
var getNodeProperties = require('../src/getNodeProperties.js');
var getNodesWithPropertiesByType = require('../src/getNodesWithPropertiesByType.js');

//EXPORTS
//=======
var fns = {
  createEdge,
  createNode,
  createProperty,
  deleteNode,
  getNodeData,
  getNodeProperties,
  getNodesWithPropertiesByType,
  getNodesWithType,
  getNodesWithTypeOnGSI,
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
