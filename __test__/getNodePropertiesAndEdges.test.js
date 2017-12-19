'use strict';

var cuid = require('cuid');
var getNodePropertiesAndEdges = require('../src/getNodePropertiesAndEdges.js');
var utils = require('../src/modules/utils.js');
var dynamoResponse = require('./dynamoResponse.js');

var table = 'ExampleTable';

describe('#getNodePropertiesAndEdges()', () => {
  var db = function() {
    return {
      query: params => ({ promise: () => Promise.resolve(params) })
    };
  };

  test('should return a function', () => {
    var actual = getNodePropertiesAndEdges({ db, table });
    expect(typeof actual).toEqual('function');
  });

  test('should fail if the node is undefined', () => {
    expect(() => {
      getNodePropertiesAndEdges({ db: db(), table })();
    }).toThrow('Node is undefined.');
  });

  test('should return a valid DynamoDB query object', done => {
    var actual = getNodePropertiesAndEdges({ db: db(), table });
    var node = cuid();
    actual(node).then(params => {
      expect(params).toEqual({
        TableName: table,
        KeyConditionExpression: `#Node = :Node`,
        ExpressionAttributeNames: {
          '#Node': 'Node',
          '#Target': 'Target',
          '#Type': 'Type'
        },
        ExpressionAttributeValues: {
          ':Node': node
        },
        FilterExpression: '#Target <> :Node OR attribute_not_exists(#Target)',
        ProjectionExpression: '#Node, #Type, #Data, #Target'
      });
      done();
    });
  });

  var node = cuid();

  test('should return the response parsed', () => {
    var edge1 = cuid();
    var edge2 = cuid();
    var database = {
      query: params => ({
        promise: () =>
          Promise.resolve(
            dynamoResponse.raw({
              Count: 4,
              ScannedCount: 5,
              Items: [
                {
                  Node: node,
                  Type: 'Prop1',
                  Data: 1
                },
                {
                  Node: node,
                  Type: 'Prop2',
                  Data: 'string'
                },
                {
                  Node: node,
                  Type: 'Edge1',
                  Data: edge1,
                  Target: edge1
                },
                {
                  Node: node,
                  Type: 'Edge2',
                  Data: edge2,
                  Target: edge2
                }
              ]
            })
          )
      })
    };
    return getNodePropertiesAndEdges({ db: database, table })({
      type: 1,
      gsik: 2
    }).then(response => {
      expect(response).toEqual({
        Count: 4,
        ScannedCount: 40,
        Items: [
          {
            Node: node,
            Type: 'Prop1',
            Data: 1
          },
          {
            Node: node,
            Type: 'Prop2',
            Data: 'string'
          },
          {
            Node: node,
            Type: 'Edge1',
            Data: edge1,
            Target: edge1
          },
          {
            Node: node,
            Type: 'Edge2',
            Data: edge2,
            Target: edge2
          }
        ]
      });
    });
  });
});
