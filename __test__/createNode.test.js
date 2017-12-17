'use strict';

var cuid = require('cuid');
var utils = require('../src/modules/utils.js');
var createNode = require('../src/createNode.js');

var table = 'ExampleTable';

describe('#createNode()', () => {
  var db = function() {
    return {
      put: params => ({ promise: () => Promise.resolve(params) })
    };
  };

  test('should return a function', () => {
    var actual = createNode({ db: db(), table });
    expect(typeof actual).toEqual('function');
  });

  test('should build valid DynamoDB put params object', done => {
    var actual = createNode({ db: db(), table });
    var node = cuid(),
      type = 'Node',
      tenant = cuid(),
      data = 'test';
    actual({ node, type, data, tenant, maxGSIK: 0 }).then(params => {
      expect(params).toEqual({
        TableName: table,
        Item: {
          Node: node,
          Type: type,
          Data: JSON.stringify(data),
          Target: node,
          GSIK: utils.calculateGSIK({ node }),
          MaxGSIK: 0
        }
      });
      done();
    });
  });
});
