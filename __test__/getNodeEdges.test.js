'use strict';

var cuid = require('cuid');
var getNodeEdges = require('../src/getNodeEdges.js');
var utils = require('../src/modules/utils.js');
var dynamoResponse = require('./dynamoResponse.js');

var table = 'ExampleTable';

describe('#getNodeEdges()', () => {
  var db = function() {
    return {
      query: params => ({ promise: () => Promise.resolve(params) })
    };
  };

  test('should return a function', () => {
    expect(typeof getNodeEdges({ db, table })).toEqual('function');
  });

  test('should fail if the node is undefined', () => {
    expect(() => {
      getNodeEdges({ db: db(), table })();
    }).toThrow('Node is undefined.');
  });

  test('should return a valid DynamoDB params query object', done => {
    var node = cuid();
    getNodeEdges({ db: db(), table })(node).then(params => {
      expect(params).toEqual({
        ExpressionAttributeNames: {
          '#Data': 'Data',
          '#Node': 'Node',
          '#Target': 'Target',
          '#Type': 'Type'
        },
        ExpressionAttributeValues: { ':Node': node },
        FilterExpression: 'attribute_exists(#Target) AND #Target <> :Node',
        KeyConditionExpression: '#Node = :Node',
        ProjectionExpression: '#Type, #Data, #Target',
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
    return getNodeEdges({ db: database, table })({ type: 1, gsik: 2 }).then(
      response => {
        expect(response).toEqual(dynamoResponse.parsed());
      }
    );
  });
});
