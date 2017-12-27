'use strict';

var cuid = require('cuid');
var utils = require('../src/modules/utils.js');
var createEdge = require('../src/createEdge.js');

var table = 'ExampleTable';

describe('#createEdge()', () => {
  var db = function() {
    return {
      query: params => ({
        promise: () =>
          Promise.resolve({
            Items: [{ Data: JSON.stringify('Test') }]
          })
      }),
      put: params => ({ promise: () => Promise.resolve(params) })
    };
  };

  test('should return a function', () => {
    expect(typeof createEdge({ db, table })).toEqual('function');
  });

  var node = cuid();
  var target = cuid();
  var type = 'Edge';

  test('should fail if the target is undefined', () => {
    expect(() => {
      createEdge({ db: db(), table })({ node, type });
    }).toThrow('Target is undefined');
  });

  test('should fail if the node is undefined', () => {
    return createEdge({ db: db(), table })({ target, type }).catch(error =>
      expect(error.message).toEqual('Node is undefined')
    );
  });

  test('should fail if the type is not defined', () => {
    var fn = createEdge({ db: db(), table });
    return fn({ node, target }).catch(error => {
      expect(error.message).toEqual('Type is undefined');
    });
  });

  test('should return a valid DynamoDB put params object', () => {
    var fn = createEdge({ db: db(), table });
    var params = { node, target, type, maxGSIK: 0 };
    return fn(params).then(result => {
      expect(result).toEqual({
        TableName: table,
        Item: {
          Node: node,
          Type: type,
          Data: 'Test',
          Target: target,
          GSIK: utils.calculateGSIK(params),
          TGSIK: utils.calculateTGSIK(params)
        }
      });
    });
  });
});
