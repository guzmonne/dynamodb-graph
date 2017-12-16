'use strict';

var cuid = require('cuid');
var getNodeData = require('../src/getNodeData.js');
var utils = require('../src/modules/utils.js');
var dynamoResponse = require('./dynamoResponse.js');

var table = 'ExampleTable';

describe('#getNodeData()', () => {
  var db = function() {
    return {
      query: params => ({ promise: () => Promise.resolve(params) })
    };
  };

  test('should return a function', () => {
    expect(typeof getNodeData({ db, table })).toEqual('function');
  });

  test('should fail if the node is undefined', () => {
    expect(() => {
      getNodeData({ db: db(), table })();
    }).toThrow('Node is undefined.');
  });

  test('should return a valid DynamoDB params query object', done => {
    var node = cuid();
    getNodeData({ db: db(), table })(node).then(params => {
      expect(params).toEqual({
        ExpressionAttributeNames: {
          '#Data': 'Data',
          '#Node': 'Node',
          '#Target': 'Target'
        },
        ExpressionAttributeValues: { ':Node': node },
        FilterExpression: '#Target = :Node',
        KeyConditionExpression: '#Node = :Node',
        ProjectionExpression: '#Data',
        TableName: table
      });
      done();
    });
  });

  test('should return the response parsed', () => {
    var database = {
      query: params => ({
        promise: () => Promise.resolve(dynamoResponse.raw())
      })
    };
    return getNodeData({ db: database, table })({ type: 1, gsik: 2 }).then(
      response => {
        expect(response).toEqual(dynamoResponse.parsed());
      }
    );
  });
});
