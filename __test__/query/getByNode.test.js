'use strict';

var sinon = require('sinon');
var cuid = require('cuid');
var getByNodeFactory = require('../../src/query/getByNode.js');
var utils = require('../../src/modules/utils.js');

describe('getByNodeFactory()', () => {
  var node = cuid();
  var type = cuid();
  var data = cuid();
  var number = Math.random();
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
            },
            {
              Node: params.ExpressionAttributeValues[':Node'],
              Type: type,
              Number: number,
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
    var value = cuid();
    var expression = '#Type = :Type';
    var getByNode = getByNodeFactory(config);

    test('should throw if `node` is undefined', () => {
      expect(() => getByNode()).toThrow('Node is undefined');
    });

    test('should throw if `expression` is not a string', () => {
      expect(() => getByNode({ node, expression: false })).toThrow(
        'Expression is not a string'
      );
    });

    test('should throw if `expression` is defined but `value` is not', () => {
      expect(() => getByNode({ node, expression })).toThrow(
        'Value is undefined'
      );
    });

    test('should return a promise', () => {
      expect(getByNode({ node, expression, value }) instanceof Promise).toBe(
        true
      );
    });

    test('should call the `documentClient.query function`', () => {
      sinon.stub(documentClient, 'query').callsFake(() => ({
        promise: () => Promise.resolve()
      }));
      return getByNode({ node }).then(() => {
        expect(documentClient.query.calledOnce).toBe(true);
        documentClient.query.restore();
      });
    });

    test('should call the `documentClient.query function` with a valid params object', () => {
      sinon.spy(documentClient, 'query');
      return getByNode({ node }).then(() => {
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

    test('should rename the query Items `String` and `Number` property to `Data`', () => {
      var node = cuid();
      return getByNode({ node }).then(result => {
        expect(result.Items.map(item => item.Data)).toEqual([data, number]);
      });
    });

    test('should call the `documentClient.query function` with a valid params object when `expression` and `value` is defined', () => {
      sinon.spy(documentClient, 'query');
      var value = cuid();
      var symbols = ['=', '<', '>', '<=', '>='];
      var random = Math.floor(Math.random() * symbols.length);
      var expression = ['#Type', symbols[random], ':Type'].join(' ');
      var expression2 = '#Type BETWEEN :a AND :b';
      var values = [Math.random(), Math.random()];
      return getByNode({ node, expression, value })
        .then(() => {
          expect(documentClient.query.args[0][0]).toEqual({
            TableName: table,
            KeyConditionExpression: '#Node = :Node' + ' AND ' + expression,
            ExpressionAttributeNames: {
              '#Node': 'Node',
              '#Type': 'Type'
            },
            ExpressionAttributeValues: {
              ':Node': node,
              ':Type': value
            }
          });
          return getByNode({ node, expression: expression2, value: values });
        })
        .then(() => {
          expect(documentClient.query.args[1][0]).toEqual({
            TableName: table,
            KeyConditionExpression: '#Node = :Node' + ' AND ' + expression2,
            ExpressionAttributeNames: {
              '#Node': 'Node',
              '#Type': 'Type'
            },
            ExpressionAttributeValues: {
              ':Node': node,
              ':a': values[0],
              ':b': values[1]
            }
          });
          documentClient.query.restore();
        });
    });
  });
});
