'use strict';

var cuid = require('cuid');
var getNodeTypes = require('../src/getNodeTypes.js');
var utils = require('../src/modules/utils.js');
var dynamoResponse = require('./dynamoResponse.js');

var table = 'ExampleTable';

describe('#getNodeTypes()', () => {
  var db = function() {
    return {
      query: params => ({ promise: () => Promise.resolve(params) })
    };
  };

  test('should return a function', () => {
    var actual = getNodeTypes({ db, table });
    expect(typeof actual).toEqual('function');
  });

  test('should fail if the node is undefined', () => {
    expect(() => {
      getNodeTypes({ db: db(), table })();
    }).toThrow('Node is undefined.');
  });

  test('should return a valid DynamoDB query object', done => {
    var actual = getNodeTypes({ db: db(), table });
    var node = cuid();
    actual({ node }).then(params => {
      expect(params).toEqual({
        TableName: table,
        KeyConditionExpression: '#Node = :Node',
        ExpressionAttributeNames: {
          '#Node': 'Node',
          '#Type': 'Type',
          '#Data': 'Data',
          '#Target': 'Target'
        },
        ExpressionAttributeValues: {
          ':Node': node
        },
        ProjectionExpression: '#Type, #Data, #Target'
      });
      done();
    });
  });

  var node = cuid();

  test('should return the response parsed', () => {
    var database = {
      query: params => ({
        promise: () =>
          Promise.resolve(
            dynamoResponse.raw({
              Items: [{ Type: 'Type 1' }, { Type: 'Type 2' }]
            })
          )
      })
    };
    return getNodeTypes({ db: database, table })({ node }).then(response => {
      expect(response).toEqual({
        Count: 2,
        ScannedCount: 20,
        Items: [{ Type: 'Type 1' }, { Type: 'Type 2' }]
      });
    });
  });

  test('should passed the sortKeyConfition to the DynamoDB query object', () => {
    return getNodeTypes({ db: db(), table })({
      node,
      sortKeyCondition: '#Type = :Value',
      sortKeyValue: 'Something'
    }).then(response => {
      expect(response).toEqual({
        TableName: table,
        KeyConditionExpression: `#Node = :Node AND #Type = :Value`,
        ExpressionAttributeNames: {
          '#Node': 'Node',
          '#Type': 'Type',
          '#Data': 'Data',
          '#Target': 'Target'
        },
        ExpressionAttributeValues: {
          ':Node': node,
          ':Value': 'Something'
        },
        ProjectionExpression: '#Type, #Data, #Target'
      });
    });
  });
});
