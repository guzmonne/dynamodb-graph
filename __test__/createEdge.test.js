'use strict';

var cuid = require('cuid');
var utils = require('../src/modules/utils.js');
var createEdge = require('../src/createEdge.js');

var table = 'ExampleTable';

describe('#createEdge()', () => {
  var response = () => ({
    Items: [{ Data: JSON.stringify('Test') }]
  });
  var db = function(response) {
    return {
      query: params => ({ promise: () => Promise.resolve(response()) }),
      put: params => ({ promise: () => Promise.resolve(params) })
    };
  };

  test('should return a function', () => {
    expect(typeof createEdge({ db, table })).toEqual('function');
  });

  var node = cuid();
  var target = cuid();
  var type = 'Edge';

  test('should fail if the node is not defined', () => {
    expect(() => {
      createEdge({ db: db(), table })({ target, type });
    }).toThrow('Node is undefined.');
  });

  test('should fail if the target is not defined', () => {
    var fn = createEdge({ db: db(response), table });
    return fn({ node }).catch(error => {
      expect(error.message).toEqual('Target is undefined');
    });
  });

  test('should fail if the type is not defined', () => {
    var fn = createEdge({ db: db(response), table });
    return fn({ node, target }).catch(error => {
      expect(error.message).toEqual('Type is undefined');
    });
  });

  test('should return a valid DynamoDB put params object', () => {
    var fn = createEdge({ db: db(response), table });
    return fn({ node, target, type, maxGSIK: 0 }).then(result => {
      expect(result).toEqual({
        TableName: table,
        Item: {
          Node: node,
          Type: type,
          Data: JSON.stringify('Test'),
          Target: target,
          GSIK: utils.calculateGSIK({ node })
        }
      });
    });
  });
});
