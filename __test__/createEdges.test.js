'use strict';

var cuid = require('cuid');
var range = require('lodash/range.js');
var utils = require('../src/modules/utils.js');
var createEdges = require('../src/createEdges.js');

var table = 'ExampleTable';

describe('#createEdges()', () => {
  var db = function() {
    return {
      batchWrite: params => ({ promise: () => Promise.resolve(params) })
    };
  };
  var _createEdges = createEdges({ db: db(), table });
  var tenant = cuid();
  var node = tenant + '#' + cuid();
  var maxGSIK = 4;
  var gsik = utils.calculateGSIK({ node, tenant, maxGSIK });

  test('should return a function', () => {
    expect(typeof _createEdges).toEqual('function');
  });

  test('should fail is maxGSIK is undefined', () => {
    expect(() => _createEdges({ node, tenant })).toThrow(
      'Max GSIK is undefined'
    );
  });

  test('should fail is node is undefined', () => {
    expect(() => _createEdges({ maxGSIK, tenant })).toThrow(
      'Node is undefined'
    );
  });

  test('should fail is edges is undefined', () => {
    expect(() => _createEdges({ node, maxGSIK, tenant })).toThrow(
      'Edges is undefined or not a list.'
    );
  });

  test('should fail is edges is not a list', () => {
    expect(() => _createEdges({ node, maxGSIK, tenant, edges: 1 })).toThrow(
      'Edges is undefined or not a list.'
    );
  });

  test('should build valid DynamoDB put params object', () => {
    var targets = [];
    return _createEdges({
      tenant,
      node,
      maxGSIK,
      edges: range(0, 51).map(i => {
        var target = cuid();
        targets.push(target);
        return { Type: i.toString(), Data: i, Target: target };
      })
    }).then(params => {
      expect(params[0]).toEqual({
        RequestItems: {
          ExampleTable: range(0, 25).map(i => ({
            PutRequest: {
              Item: {
                Node: node,
                TGSIK: utils.calculateTGSIK({ node, tenant, maxGSIK, type: i }),
                GSIK: utils.calculateGSIK({ node, tenant, maxGSIK }),
                Data: JSON.stringify(i),
                Type: i.toString(),
                Target: targets[i]
              }
            }
          }))
        }
      });
      expect(params[1]).toEqual({
        RequestItems: {
          ExampleTable: range(25, 50).map(i => ({
            PutRequest: {
              Item: {
                Node: node,
                TGSIK: utils.calculateTGSIK({ node, tenant, maxGSIK, type: i }),
                GSIK: utils.calculateGSIK({ node, tenant, maxGSIK }),
                Data: JSON.stringify(i),
                Type: i.toString(),
                Target: targets[i]
              }
            }
          }))
        }
      });
    });
  });
});
