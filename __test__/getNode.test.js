'use strict';

var cuid = require('cuid');
var getNode = require('../src/getNode.js');
var utils = require('../src/modules/utils.js');
var dynamoResponse = require('./dynamoResponse.js');

var table = 'ExampleTable';

describe('#getNode()', () => {
  var db = function() {
    return {
      query: params => ({ promise: () => Promise.resolve(params) })
    };
  };

  test('should return a function', () => {
    expect(typeof getNode({ db, table })).toEqual('function');
  });

  test('should fail if the node is undefined', () => {
    expect(() => {
      getNode({ db: db(), table })();
    }).toThrow('Node is undefined.');
  });

  test('should return a valid DynamoDB params query object', done => {
    var node = cuid();
    getNode({ db: db(), table })(node).then(params => {
      expect(params).toEqual({
        ExpressionAttributeNames: {
          '#Data': 'Data',
          '#Node': 'Node',
          '#Target': 'Target',
          '#Type': 'Type',
          '#GSIK': 'GSIK',
          '#MaxGSIK': 'MaxGSIK'
        },
        ExpressionAttributeValues: { ':Node': node },
        FilterExpression: '#Target = :Node',
        KeyConditionExpression: '#Node = :Node',
        ProjectionExpression: '#Node, #Type, #Data, #GSIK, #MaxGSIK',
        TableName: table,
        ReturnConsumedCapacity: 'NONE'
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
    return getNode({ db: database, table })({ type: 1, gsik: 2 }).then(
      response => {
        expect(response).toEqual(dynamoResponse.parsed());
      }
    );
  });
});
