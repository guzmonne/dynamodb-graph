'use strict';

var cuid = require('cuid');
var sinon = require('sinon');
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
      getNode({ db: db, table })();
    }).toThrow('Node is undefined.');
  });

  var db = {
    query: params => ({
      promise: () => {
        return Promise.resolve({
          Items: [
            {
              Node: params.ExpressionAttributeValues[':Node'],
              Data: JSON.stringify('TestData'),
              Type: 'TestType',
              Target: params.ExpressionAttributeValues[':Node'],
              GSIK: '#0'
            }
          ]
        });
      }
    }),
    get: params => ({
      promise: () => {
        return Promise.resolve({
          Item: {
            Node: params.Key.Node,
            Data: JSON.stringify('TestData'),
            Type: params.Key.Type,
            Target: params.Key.Node,
            GSIK: '#0'
          }
        });
      }
    })
  };

  beforeEach(() => {
    sinon.spy(db, 'query');
    sinon.spy(db, 'get');
  });

  afterEach(() => {
    db.query.restore();
    db.get.restore();
  });

  var getNode$ = getNode({ db, table });

  test('should produce a valid DynamoDB query params object if type is undefined', () => {
    var node = cuid();

    return getNode$(node).then(response => {
      expect(
        db.query.calledWith({
          ExpressionAttributeNames: {
            '#Data': 'Data',
            '#Node': 'Node',
            '#Target': 'Target',
            '#Type': 'Type',
            '#GSIK': 'GSIK'
          },
          ExpressionAttributeValues: { ':Node': node },
          FilterExpression: '#Target = :Node',
          KeyConditionExpression: '#Node = :Node',
          ProjectionExpression: '#Node, #Type, #Data, #GSIK',
          TableName: table,
          ReturnConsumedCapacity: 'NONE'
        })
      ).toBe(true);
      expect(response).toEqual({
        Item: {
          Node: node,
          Data: 'TestData',
          Type: 'TestType',
          Target: node,
          GSIK: '#0'
        }
      });
    });
  });

  test('should produce a valid DynamoDB get params object if type is defined', () => {
    var node = cuid();
    var type = 'SomeType';

    return getNode$(node, type).then(response => {
      expect(
        db.get.calledWith({
          TableName: table,
          Key: {
            Node: node,
            Type: type
          }
        })
      ).toBe(true);
      expect(response).toEqual({
        Item: {
          Node: node,
          Data: 'TestData',
          Type: type,
          Target: node,
          GSIK: '#0'
        }
      });
    });
  });

  test('should return the response parsed', () => {
    var node = cuid();
    return getNode$(node).then(response => {
      expect(response).toEqual({
        Item: {
          Node: node,
          Data: 'TestData',
          Type: 'TestType',
          Target: node,
          GSIK: '#0'
        }
      });
    });
  });
});
