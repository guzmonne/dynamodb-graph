'use strict';

var sinon = require('sinon');
var cuid = require('cuid');
var getNodeEdgesFactory = require('../../src/query/getNodeEdges.js');
var utils = require('../../src/modules/utils.js');

describe('getNodeEdgesFactory()', () => {
  var node = cuid();
  var type = 'PropType';
  var maxGSIK = 10;
  var string = cuid();
  var number = Math.random();
  var table = 'TestTable';
  var documentClient = {
    query: params => ({
      promise: () =>
        Promise.resolve({
          Items: [
            {
              Node: params.ExpressionAttributeValues[':Node'],
              Type: type,
              String: string,
              GSIK: utils.calculateGSIK({
                node: params.ExpressionAttributeValues[':Node'],
                maxGSIK
              }),
              TGSIK: utils.calculateTGSIK({
                node: params.ExpressionAttributeValues[':Node'],
                type: type,
                maxGSIK
              })
            },
            {
              Node: params.ExpressionAttributeValues[':Node'],
              Type: type,
              Number: number,
              GSIK: utils.calculateGSIK({
                node: params.ExpressionAttributeValues[':Node'],
                maxGSIK
              }),
              TGSIK: utils.calculateTGSIK({
                node: params.ExpressionAttributeValues[':Node'],
                type: type,
                maxGSIK
              })
            }
          ]
        })
    })
  };
  var config = { table, maxGSIK, documentClient };

  test('should be a function', () => {
    expect(typeof getNodeEdgesFactory).toEqual('function');
  });

  test('should call the `utils.checkConfiguration` function', () => {
    sinon.spy(utils, 'checkConfiguration');
    getNodeEdgesFactory(config);
    expect(utils.checkConfiguration.calledOnce).toBe(true);
    utils.checkConfiguration.restore();
  });

  describe('#getNodeEdges()', () => {
    var getNodeEdges = getNodeEdgesFactory(config);

    test('should throw if `node` is undefined', () => {
      expect(() => getNodeEdges()).toThrow('Node is undefined');
    });

    test('should return a promise', () => {
      expect(getNodeEdges({ node }) instanceof Promise).toBe(true);
    });

    beforeEach(() => {
      sinon.spy(documentClient, 'query');
    });

    afterEach(() => {
      documentClient.query.restore();
    });

    test('should call the `documentClient.query` method with valid params if only the node is provided', () => {
      return getNodeEdges({ node }).then(response => {
        expect(documentClient.query.args[0][0]).toEqual({
          TableName: table,
          KeyConditionExpression: '#Node = :Node',
          ExpressionAttributeValues: {
            ':Node': node
          },
          ExpressionAttributeNames: {
            '#Node': 'Node',
            '#Target': 'Target'
          },
          FilterExpression: 'attribute_not_exists(#Target)'
        });
      });
    });

    test('should call the `documentClient.query` method with valid params if a `node` and a type `expression` is provided', () => {
      return getNodeEdges({
        node,
        expression: `BEGINS_WITH(#Type, :Type)`,
        value: type
      }).then(response => {
        expect(documentClient.query.args[0][0]).toEqual({
          ExpressionAttributeNames: {
            '#Node': 'Node',
            '#Target': 'Target',
            '#Type': 'Type'
          },
          ExpressionAttributeValues: {
            ':Node': node,
            ':Type': type
          },
          FilterExpression: 'attribute_not_exists(#Target)',
          KeyConditionExpression: '#Node = :Node AND BEGINS_WITH(#Type, :Type)',
          TableName: table
        });
      });
    });
  });
});
