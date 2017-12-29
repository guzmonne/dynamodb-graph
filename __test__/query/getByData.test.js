'use strict';

var sinon = require('sinon');
var cuid = require('cuid');
var get = require('lodash/get');
var range = require('lodash/range');
var getByDataFactory = require('../../src/query/getByData.js');
var utils = require('../../src/modules/utils.js');

var OPERATORS = utils._operators;

describe('getByDataFactory()', () => {
  var table = 'TestTable';
  var tenant = cuid();
  var maxGSIK = 100;
  var node = cuid();
  var type = cuid();
  var documentClient = {
    query: params => {
      return {
        promise: () => {
          return Promise.resolve({
            Count: 1,
            ScannedCount: 1,
            Items: [
              {
                [Math.random() > 0.5 ? 'String' : 'Number']: params
                  .ExpressionAttributeValues[':GSIK']
              }
            ],
            LastEvaluatedKey: {
              Node: tenant + node,
              Type: type
            }
          });
        }
      };
    }
  };
  var config = { tenant, table, maxGSIK, documentClient };

  test('should be a function', () => {
    expect(typeof getByDataFactory).toEqual('function');
  });

  test('should call the `utils.checkConfiguration` function', () => {
    sinon.spy(utils, 'checkConfiguration');
    getByDataFactory(config);
    expect(utils.checkConfiguration.calledOnce).toBe(true);
    utils.checkConfiguration.restore();
  });

  describe('#getByData()', () => {
    var getByData = getByDataFactory(config);
    var operator = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
    var expression =
      operator === 'BETWEEN'
        ? '#Type BETWEEN :a AND :b'
        : `#Type ${operator} :Number`;
    var value =
      operator === 'BETWEEN' ? [Math.random(), Math.random()] : Math.random();

    test('should throw if `expression` is undefined', () => {
      expect(() => getByData()).toThrow('Expression is undefined');
    });

    test('should throw if `value` is undefined', () => {
      expect(() => getByData({ expression })).toThrow('Value is undefined');
    });

    test('should throw if `limit` is not a number', () => {
      expect(() => getByData({ expression, value, limit: true })).toThrow(
        'Limit is not a number'
      );
    });

    test('should throw if `listGSIK` is not a list, and `endGSIK` is not a number', () => {
      expect(() => getByData({ expression, value, startGSIK: true })).toThrow(
        'Start GSIK is not a number'
      );
    });

    test('should fail if the `startGSIK` is bigger thant the `endGSIK`', () => {
      expect(() =>
        getByData({ expression, value, startGSIK: 10, endGSIK: 9 })
      ).toThrow('Start GSIK is bigger than End GSIK');
    });

    test('should fail if the `listGSIK` contains values that are not numbers', () => {
      expect(() =>
        getByData({ expression, value, listGSIK: [1, 2, true] })
      ).toThrow('List GSIK is not a list of numbers');
    });

    beforeEach(() => {
      sinon.spy(documentClient, 'query');
    });

    afterEach(() => {
      documentClient.query.restore();
    });

    test('should call the query on 10 GSIK by default', () => {
      return getByData({ expression, value }).then(() => {
        expect(documentClient.query.callCount).toBe(10);
      });
    });

    test('should allow to set the `startGSIK` while keeping the value of `endGSIK` at ten times the `startGSIK` value', () => {
      var startGSIK = Math.floor(Math.random() * 100);
      return getByData({ expression, value, startGSIK }).then(() => {
        expect(documentClient.query.callCount).toBe(10);
        expect(
          get(
            documentClient,
            `query.args[0][0].ExpressionAttributeValues.:GSIK`
          )
        ).toEqual(`${tenant}#${startGSIK}`);
        expect(
          get(
            documentClient,
            `query.args[9][0].ExpressionAttributeValues.:GSIK`
          )
        ).toEqual(`${tenant}#${startGSIK + 10 - 1}`);
      });
    });

    test('should allow to set the `startGSIK` and the `endGSIK`', () => {
      var startGSIK = Math.floor(Math.random() * 10 + 5);
      var endGSIK = startGSIK + Math.floor(Math.random() * 10 + 5);
      var difference = endGSIK - startGSIK;
      return getByData({ expression, value, startGSIK, endGSIK }).then(() => {
        expect(documentClient.query.callCount).toBe(difference);
        expect(
          get(
            documentClient,
            `query.args[0][0].ExpressionAttributeValues.:GSIK`
          )
        ).toEqual(`${tenant}#${startGSIK}`);
        expect(
          get(
            documentClient,
            `query.args[${difference - 1}][0].ExpressionAttributeValues.:GSIK`
          )
        ).toEqual(`${tenant}#${endGSIK - 1}`);
      });
    });

    test('should allow passing a custom `listGSIK`', () => {
      var listGSIK = range(0, Math.floor(Math.random() * 10) + 1).map(
        Math.random
      );
      return getByData({ expression, value, listGSIK }).then(() => {
        expect(documentClient.query.callCount).toBe(listGSIK.length);
      });
    });

    test('should return valid DynamoDB query params objects if value is a number', () => {
      var listGSIK = range(0, Math.floor(Math.random() * 10) + 3).map(
        Math.random
      );
      return getByData({ expression, value, listGSIK }).then(result => {
        listGSIK.forEach((i, j) => {
          expect(documentClient.query.args[j][0]).toEqual({
            TableName: table,
            IndexName: 'ByNumber',
            KeyConditionExpression: `#GSIK = :GSIK AND ${expression}`,
            ExpressionAttributeNames: {
              '#GSIK': 'GSIK',
              '#Number': 'Number'
            },
            Limit: 10,
            ExpressionAttributeValues: Object.assign(
              {
                ':GSIK': tenant + '#' + i
              },
              Array.isArray(value)
                ? { ':a': value[0], ':b': value[1] }
                : { ':Number': value }
            )
          });
        });
      });
    });

    test('should return valid DynamoDB query params objects if value is a number', () => {
      var listGSIK = range(0, Math.floor(Math.random() * 10) + 3).map(
        Math.random
      );
      var value = cuid();
      return getByData({ expression, value, listGSIK }).then(result => {
        listGSIK.forEach((i, j) => {
          expect(documentClient.query.args[j][0]).toEqual({
            TableName: table,
            IndexName: 'ByString',
            KeyConditionExpression: `#GSIK = :GSIK AND ${expression}`,
            ExpressionAttributeNames: {
              '#GSIK': 'GSIK',
              '#String': 'String'
            },
            Limit: 10,
            ExpressionAttributeValues: Object.assign(
              {
                ':GSIK': tenant + '#' + i
              },
              Array.isArray(value)
                ? { ':a': value[0], ':b': value[1] }
                : { ':String': value }
            )
          });
        });
      });
    });

    test('should allow to set a custom limit value', () => {
      var listGSIK = range(0, Math.floor(Math.random() * 10) + 3).map(
        Math.random
      );
      var limit = Math.floor(Math.random() * 10);
      return getByData({ expression, value, listGSIK, limit }).then(result => {
        listGSIK.forEach((i, j) => {
          expect(documentClient.query.args[j][0]).toEqual({
            TableName: table,
            IndexName: 'ByNumber',
            KeyConditionExpression: `#GSIK = :GSIK AND ${expression}`,
            ExpressionAttributeNames: {
              '#GSIK': 'GSIK',
              '#Number': 'Number'
            },
            Limit: limit,
            ExpressionAttributeValues: Object.assign(
              {
                ':GSIK': tenant + '#' + i
              },
              Array.isArray(value)
                ? { ':a': value[0], ':b': value[1] }
                : { ':Number': value }
            )
          });
        });
      });
    });

    test('should return the parsed and accumulated items', () => {
      var listGSIK = range(0, Math.floor(Math.random() * 100)).map(Math.random);
      return getByData({ expression, value, listGSIK }).then(result => {
        expect(result).toEqual({
          Count: listGSIK.length,
          ScannedCount: listGSIK.length,
          Items: range(0, listGSIK.length).map(i => ({
            Data: tenant + '#' + listGSIK[i]
          })),
          LastEvaluatedKeys: listGSIK.reduce(
            (acc, i) =>
              Object.assign(acc, {
                [i]: {
                  Node: tenant + node,
                  Type: type
                }
              }),
            {}
          )
        });
      });
    });
  });
});
