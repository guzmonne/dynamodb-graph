'use strict';

var sinon = require('sinon');
var cuid = require('cuid');
var getByNodeFactory = require('../../src/query/getByNode.js');
var utils = require('../../src/modules/utils.js');

describe('getByNodeFactory()', () => {
  var node = cuid();
  var type = cuid();
  var data = cuid();
  var target = cuid();
  var maxGSIK = 10;
  var table = 'TestTable';
  var documentClient = {
    query: params => ({
      promise: () =>
        Promise.resolve({
          Items: [
            {
              Node: params.ExpressionAttributeValues[':Node'],
              Type: type,
              String: data,
              Target: target,
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
    expect(typeof getByNodeFactory).toEqual('function');
  });

  test('should call the `utils.checkConfiguration` function', () => {
    sinon.spy(utils, 'checkConfiguration');
    getByNodeFactory(config);
    expect(utils.checkConfiguration.calledOnce).toBe(true);
    utils.checkConfiguration.restore();
  });

  describe('#getByNode()', () => {
    var getByNode = getByNodeFactory(config);

    test('should throw if `node` is undefined', () => {
      expect(() => getByNode()).toThrow('Node is undefined');
    });

    test('should return a promise', () => {
      expect(getByNode({ node }) instanceof Promise).toBe(true);
    });

    test('should call the `documentClient.query function`', () => {
      sinon.stub(documentClient, 'query').callsFake(() => ({
        promise: () => Promise.resolve()
      }));
      return getByNode({ node, type }).then(() => {
        expect(documentClient.query.calledOnce).toBe(true);
        documentClient.query.restore();
      });
    });

    test('should call the `documentClient.query function` with a valid params object', () => {
      sinon.spy(documentClient, 'query');
      return getByNode({ node, type }).then(() => {
        expect(documentClient.query.args[0][0]).toEqual({
          TableName: table,
          KeyConditionExpression: '#Node = :Node',
          ExpressionAttributeNames: {
            '#Node': 'Node'
          },
          ExpressionAttributeValues: {
            ':Node': node
          }
        });
        documentClient.query.restore();
      });
    });
  });
});
