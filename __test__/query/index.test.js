'use strict';

var sinon = require('sinon');
var cuid = require('cuid');
var queryFactory = require('../../src/query/');
var utils = require('../../src/modules/utils.js');

describe('queryFactory()', () => {
  var maxGSIK = 10;
  var tenant = cuid();
  var data = cuid();
  var number = 23;
  var target = cuid();
  var node1 = cuid();
  var node2 = cuid();
  var type1 = cuid();
  var type2 = cuid();
  var documentClient = {
    query: params => {
      promise: () => {
        return Promise.resolve({
          Items: [
            {
              Node: node1,
              Type: type1,
              String: data,
              Target: target,
              GSIK: utils.calculateGSIK({ node, tenant, maxGSIK }),
              TGSIK: utils.calculateTGSIK({ node, type, tenant, maxGSIK })
            },
            {
              Node: node2,
              Type: type2,
              Number: number,
              GSIK: utils.calculateGSIK({ node, tenant, maxGSIK }),
              TGSIK: utils.calculateTGSIK({ node, type, tenant, maxGSIK })
            }
          ]
        });
      };
    },
    get: params => ({
      promise: () => {
        var node = params.Key.Node;
        var type = params.Key.Type;
        return Promise.resolve({
          Item: {
            Node: node,
            Type: type,
            String: data,
            Target: target,
            GSIK: utils.calculateGSIK({ node, tenant, maxGSIK }),
            TGSIK: utils.calculateTGSIK({ node, type, tenant, maxGSIK })
          }
        });
      }
    })
  };
  var table = 'TestTable';
  var config = { tenant, maxGSIK, documentClient, table };

  test('should be a function', () => {
    expect(typeof queryFactory).toBe('function');
  });

  test('should call the `utils.checkConfiguration()` method', () => {
    sinon.spy(utils, 'checkConfiguration');
    queryFactory(config);
    expect(utils.checkConfiguration.callCount).toBe(3);
    utils.checkConfiguration.restore();
  });

  test('should return a function', () => {
    expect(typeof queryFactory(config)).toEqual('function');
  });

  describe('#query()', () => {
    var query = queryFactory(config);

    test('should return a promise', () => {
      expect(query() instanceof Promise).toBe(true);
    });

    test('should return an empty object if `options` is undefined', () => {
      return query().then(result => expect(result).toEqual({}));
    });

    test('should return an empty object if `options` is not an object', () => {
      return query(true).then(result => expect(result).toEqual({}));
    });

    test('should call the `getItem` function, if a `node` and `type` are defined on the `options` object', () => {
      var node = cuid();
      var type = cuid();
      return query({ node, type }).then(result => {
        expect(result).toEqual({
          Items: [
            {
              Node: node,
              Type: type,
              Data: data,
              Target: target,
              GSIK: utils.calculateGSIK({ node, tenant, maxGSIK }),
              TGSIK: utils.calculateTGSIK({ node, type, tenant, maxGSIK })
            }
          ]
        });
      });
    });

    test('should call the `getByNode` function, with the appropiate condition expression, given the `where` and `node` options', () => {
      var node = cuid();
      var value = cuid();
      var symbols = ['=', '<', '>', '<=', '>='];
      var random = Math.floor(Math.random() * symbols.length);
      var rSymbol = symbols[random];
      var where = {
        type: { [rSymbol]: value }
      };
      sinon.stub(documentClient, 'query').callsFake(() => ({
        promise: () => {
          return Promise.resolve({
            Items: [{}]
          });
        }
      }));
      return query({ node, where }).then(result => {
        expect(documentClient.query.args[0][0]).toEqual({
          TableName: table,
          KeyConditionExpression: `#Node = :Node AND #Type ${rSymbol} :Type`,
          ExpressionAttributeNames: {
            '#Node': 'Node',
            '#Type': 'Type'
          },
          ExpressionAttributeValues: {
            ':Node': node,
            ':Type': value
          }
        });
        return query({ node, where: { type: { BETWEEN: [1, 2] } } }).then(
          result => {
            expect(documentClient.query.args[1][0]).toEqual({
              TableName: table,
              KeyConditionExpression: `#Node = :Node AND #Type BETWEEN :a AND :b`,
              ExpressionAttributeNames: {
                '#Node': 'Node',
                '#Type': 'Type'
              },
              ExpressionAttributeValues: {
                ':Node': node,
                ':a': 1,
                ':b': 2
              }
            });
            documentClient.query.restore();
          }
        );
      });
    });

    test('should call the `getByNode` function just with the node, if that is the only defined property', () => {
      var node = cuid();
      sinon.stub(documentClient, 'query').callsFake(() => ({
        promise: () => {
          return Promise.resolve({
            Items: [{}]
          });
        }
      }));
      return query({ node }).then(result => {
        expect(documentClient.query.args[0][0]).toEqual({
          TableName: table,
          KeyConditionExpression: `#Node = :Node`,
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
