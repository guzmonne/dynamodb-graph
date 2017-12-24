'use strict';

var cuid = require('cuid');
var getNodeProperties = require('../src/getNodeProperties.js');
var utils = require('../src/modules/utils.js');
var dynamoResponse = require('./dynamoResponse.js');

var table = 'ExampleTable';

describe('#getNodeProperties()', () => {
  var db = function() {
    return {
      query: params => ({ promise: () => Promise.resolve(params) })
    };
  };

  test('should return a function', () => {
    var actual = getNodeProperties({ db, table });
    expect(typeof actual).toEqual('function');
  });

  test('should fail if the node is undefined', () => {
    expect(() => {
      getNodeProperties({ db: db(), table })();
    }).toThrow('Node is undefined.');
  });

  test('should return a valid DynamoDB query object', done => {
    var actual = getNodeProperties({ db: db(), table });
    var node = cuid();
    actual(node).then(params => {
      expect(params).toEqual({
        TableName: table,
        KeyConditionExpression: `#Node = :Node`,
        ExpressionAttributeNames: {
          '#Node': 'Node',
          '#Target': 'Target',
          '#Type': 'Type',
          '#Data': 'Data'
        },
        ExpressionAttributeValues: {
          ':Node': node
        },
        FilterExpression: 'attribute_not_exists(#Target)',
        ProjectionExpression: '#Node, #Type, #Data'
      });
      done();
    });
  });

  var node = cuid();

  test('should return the response parsed', () => {
    var database = {
      query: params => ({
        promise: () => Promise.resolve(dynamoResponse.raw())
      })
    };
    return getNodeProperties({ db: database, table })({
      type: 1,
      gsik: 2
    }).then(response => {
      expect(response).toEqual(dynamoResponse.parsed());
    });
  });
});
