'use strict';

var sinon = require('sinon');
var cuid = require('cuid');
var range = require('lodash/range');
var queryFactory = require('../../src/query/');
var utils = require('../../src/modules/utils.js');

var OPERATORS = utils._operators;

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
    expect(utils.checkConfiguration.callCount).toBe(5);
    utils.checkConfiguration.restore();
  });

  test('should return a function', () => {
    expect(typeof queryFactory(config)).toEqual('function');
  });

  describe('#query()', () => {
    var query = queryFactory(config);

    beforeEach(() => {
      sinon.stub(documentClient, 'query').callsFake(() => ({
        promise: () => {
          return Promise.resolve({
            Items: [{}]
          });
        }
      }));
    });

    afterEach(() => {
      documentClient.query.restore();
    });

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
          }
        );
      });
    });

    test('should call the `getByNode` function just with the node, if that is the only defined property', () => {
      var node = cuid();

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
      });
    });

    var values = (i = 0, value, attribute = 'Type') =>
      Object.assign(
        {
          ':GSIK': tenant + '#' + i
        },
        Array.isArray(value)
          ? { ':a': value[0], ':b': value[1] }
          : {
              [`:${attribute}`]: value
            }
      );

    test('should call the `getByType` function, when the node is undefined and the `where` type expression attributes are defined', () => {
      var value = cuid();
      var { value, expression, operator } = getRandomExpressionAttributes(
        'Type'
      );
      return query({
        where: { type: { [operator]: value } }
      }).then(result => {
        expect(documentClient.query.args[0][0]).toEqual({
          TableName: table,
          IndexName: 'ByType',
          KeyConditionExpression: `#GSIK = :GSIK AND ${expression}`,
          ExpressionAttributeNames: {
            '#GSIK': 'GSIK',
            '#Type': 'Type'
          },
          Limit: 10,
          ExpressionAttributeValues: values(0, value)
        });
        expect(documentClient.query.args[9][0]).toEqual({
          TableName: table,
          IndexName: 'ByType',
          KeyConditionExpression: `#GSIK = :GSIK AND ${expression}`,
          ExpressionAttributeNames: {
            '#GSIK': 'GSIK',
            '#Type': 'Type'
          },
          Limit: 10,
          ExpressionAttributeValues: values(9, value)
        });
      });
    });

    test('should call the `getByType` function, when the node is undefined and the `where` type expression attributes and the gsik `limit` option is defined', () => {
      var value = cuid();
      var { value, expression, operator } = getRandomExpressionAttributes(
        'Type'
      );
      var limit = random(10);
      return query({
        where: { type: { [operator]: value } },
        gsik: { limit }
      }).then(result => {
        expect(documentClient.query.args[0][0]).toEqual({
          TableName: table,
          IndexName: 'ByType',
          KeyConditionExpression: `#GSIK = :GSIK AND ${expression}`,
          ExpressionAttributeNames: {
            '#GSIK': 'GSIK',
            '#Type': 'Type'
          },
          Limit: limit,
          ExpressionAttributeValues: values(0, value)
        });
        expect(documentClient.query.args[9][0]).toEqual({
          TableName: table,
          IndexName: 'ByType',
          KeyConditionExpression: `#GSIK = :GSIK AND ${expression}`,
          ExpressionAttributeNames: {
            '#GSIK': 'GSIK',
            '#Type': 'Type'
          },
          Limit: limit,
          ExpressionAttributeValues: values(9, value)
        });
      });
    });

    test('should call the `getByType` function, when the node is undefined and the `where` type expression attributes and the gsik `start` option is defined', () => {
      var value = cuid();
      var { value, expression, operator } = getRandomExpressionAttributes(
        'Type'
      );
      var start = random(10);
      return query({
        where: { type: { [operator]: value } },
        gsik: { start }
      }).then(result => {
        expect(documentClient.query.args[0][0]).toEqual({
          TableName: table,
          IndexName: 'ByType',
          KeyConditionExpression: `#GSIK = :GSIK AND ${expression}`,
          ExpressionAttributeNames: {
            '#GSIK': 'GSIK',
            '#Type': 'Type'
          },
          Limit: 10,
          ExpressionAttributeValues: values(start, value)
        });
        expect(documentClient.query.args[9][0]).toEqual({
          TableName: table,
          IndexName: 'ByType',
          KeyConditionExpression: `#GSIK = :GSIK AND ${expression}`,
          ExpressionAttributeNames: {
            '#GSIK': 'GSIK',
            '#Type': 'Type'
          },
          Limit: 10,
          ExpressionAttributeValues: values(start + 9, value)
        });
      });
    });

    test('should call the `getByType` function, when the node is undefined and the `where` type expression attributes and the gsik `start` and `end` option are defined', () => {
      var value = cuid();
      var { value, expression, operator } = getRandomExpressionAttributes(
        'Type'
      );
      var start = 10 + random(10);
      var end = 10 + start + random(10);
      return query({
        where: { type: { [operator]: value } },
        gsik: { start, end }
      }).then(result => {
        expect(documentClient.query.args[0][0]).toEqual({
          TableName: table,
          IndexName: 'ByType',
          KeyConditionExpression: `#GSIK = :GSIK AND ${expression}`,
          ExpressionAttributeNames: {
            '#GSIK': 'GSIK',
            '#Type': 'Type'
          },
          Limit: 10,
          ExpressionAttributeValues: values(start, value)
        });
        expect(documentClient.query.args[end - start - 1][0]).toEqual({
          TableName: table,
          IndexName: 'ByType',
          KeyConditionExpression: `#GSIK = :GSIK AND ${expression}`,
          ExpressionAttributeNames: {
            '#GSIK': 'GSIK',
            '#Type': 'Type'
          },
          Limit: 10,
          ExpressionAttributeValues: values(end - 1, value)
        });
      });
    });

    test('should call the `getByType` function, when the node is undefined and the `where` type expression attributes and the gsik `list` option is defined', () => {
      var value = cuid();
      var { value, expression, operator } = getRandomExpressionAttributes(
        'Type'
      );
      var list = range(0, random(20) + 10).map(() => random(100));
      return query({
        where: { type: { [operator]: value } },
        gsik: { list }
      }).then(result => {
        expect(documentClient.query.args[0][0]).toEqual({
          TableName: table,
          IndexName: 'ByType',
          KeyConditionExpression: `#GSIK = :GSIK AND ${expression}`,
          ExpressionAttributeNames: {
            '#GSIK': 'GSIK',
            '#Type': 'Type'
          },
          Limit: 10,
          ExpressionAttributeValues: values(list[0], value)
        });
        expect(documentClient.query.args[list.length - 1][0]).toEqual({
          TableName: table,
          IndexName: 'ByType',
          KeyConditionExpression: `#GSIK = :GSIK AND ${expression}`,
          ExpressionAttributeNames: {
            '#GSIK': 'GSIK',
            '#Type': 'Type'
          },
          Limit: 10,
          ExpressionAttributeValues: values(list[list.length - 1], value)
        });
      });
    });

    test('should call the `getByType` function, when the node is undefined and the `where` type expression attributes and gsik options are defined', () => {
      var value = cuid();
      var { value, expression, operator } = getRandomExpressionAttributes(
        'Type'
      );
      var start = random(10);
      var end = start + random(100);
      var limit = random(10);
      return query({
        where: { type: { [operator]: value } },
        gsik: { start, end, limit }
      }).then(result => {
        expect(documentClient.query.args[0][0]).toEqual({
          TableName: table,
          IndexName: 'ByType',
          KeyConditionExpression: `#GSIK = :GSIK AND ${expression}`,
          ExpressionAttributeNames: {
            '#GSIK': 'GSIK',
            '#Type': 'Type'
          },
          Limit: limit,
          ExpressionAttributeValues: values(start, value)
        });
        expect(documentClient.query.args[end - start - 1][0]).toEqual({
          TableName: table,
          IndexName: 'ByType',
          KeyConditionExpression: `#GSIK = :GSIK AND ${expression}`,
          ExpressionAttributeNames: {
            '#GSIK': 'GSIK',
            '#Type': 'Type'
          },
          Limit: limit,
          ExpressionAttributeValues: values(end - 1, value)
        });
      });
    });

    test('should call the `getByData` function, when the node is undefined and the `where` data expression attributes are defined with number values', () => {
      var attribute = 'Number';
      var { value, expression, operator } = getRandomExpressionAttributes(
        attribute
      );
      return query({
        where: { data: { [operator]: value } }
      }).then(result => {
        expect(documentClient.query.args[0][0]).toEqual({
          TableName: table,
          IndexName: 'ByNumber',
          KeyConditionExpression: `#GSIK = :GSIK AND ${expression}`,
          ExpressionAttributeNames: {
            '#GSIK': 'GSIK',
            '#Number': 'Number'
          },
          Limit: 10,
          ExpressionAttributeValues: values(0, value, attribute)
        });
        expect(documentClient.query.args[9][0]).toEqual({
          TableName: table,
          IndexName: 'ByNumber',
          KeyConditionExpression: `#GSIK = :GSIK AND ${expression}`,
          ExpressionAttributeNames: {
            '#GSIK': 'GSIK',
            '#Number': 'Number'
          },
          Limit: 10,
          ExpressionAttributeValues: values(9, value, attribute)
        });
      });
    });

    test('should call the `getByData` function, when the node is undefined and the `where` data expression attributes are defined with string values', () => {
      var attribute = 'String';
      var { value, expression, operator } = getRandomExpressionAttributes(
        attribute
      );
      return query({
        where: { data: { [operator]: value } }
      }).then(result => {
        expect(documentClient.query.args[0][0]).toEqual({
          TableName: table,
          IndexName: 'ByString',
          KeyConditionExpression: `#GSIK = :GSIK AND ${expression}`,
          ExpressionAttributeNames: {
            '#GSIK': 'GSIK',
            '#String': 'String'
          },
          Limit: 10,
          ExpressionAttributeValues: values(0, value, attribute)
        });
        expect(documentClient.query.args[9][0]).toEqual({
          TableName: table,
          IndexName: 'ByString',
          KeyConditionExpression: `#GSIK = :GSIK AND ${expression}`,
          ExpressionAttributeNames: {
            '#GSIK': 'GSIK',
            '#String': 'String'
          },
          Limit: 10,
          ExpressionAttributeValues: values(9, value, attribute)
        });
      });
    });
  });
});

function getRandomExpressionAttributes(attribute) {
  var fn = attribute === 'Number' ? Math.random : cuid;
  var operator = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
  var value = operator === 'BETWEEN' ? [fn(), fn()] : fn();
  var expression =
    operator === 'BETWEEN'
      ? `#${attribute} BETWEEN :a AND :b`
      : `#${attribute} ${operator} :${attribute}`;
  return { operator, value, expression };
}

function random(i) {
  return Math.floor(Math.random() * i);
}
