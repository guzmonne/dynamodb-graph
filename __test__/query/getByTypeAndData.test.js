'use strict';

var sinon = require('sinon');
var cuid = require('cuid');
var get = require('lodash/get');
var range = require('lodash/range');
var getByTypeAndDataFactory = require('../../src/query/getByTypeAndData.js');
var utils = require('../../src/modules/utils.js');

var OPERATORS = utils._operators;

describe('getByTypeAndDataFactory()', () => {
  var table = 'TestTable';
  var tenant = cuid();
  var maxGSIK = 100;
  var node = cuid();
  var type = cuid();
  var number = Math.random();
  var documentClient = {
    query: params => {
      return {
        promise: () => {
          var attribute = Math.random() > 0.5 ? 'String' : 'Number';
          var data =
            attribute === 'String'
              ? params.ExpressionAttributeValues[':TGSIK']
              : number;
          return Promise.resolve({
            Count: 1,
            ScannedCount: 1,
            Items: [
              {
                [attribute]: data
              }
            ],
            LastEvaluatedKey: {
              Node: tenant + node,
              [attribute]: data
            }
          });
        }
      };
    }
  };
  var config = { tenant, table, maxGSIK, documentClient };

  test('should be a function', () => {
    expect(typeof getByTypeAndDataFactory).toEqual('function');
  });

  test('should call the `utils.checkConfiguration` function', () => {
    sinon.spy(utils, 'checkConfiguration');
    getByTypeAndDataFactory(config);
    expect(utils.checkConfiguration.calledOnce).toBe(true);
    utils.checkConfiguration.restore();
  });

  describe('#getByTypeAndData()', () => {
    var getByTypeAndData = getByTypeAndDataFactory(config);
    var operator = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
    var type = cuid();
    var expression =
      operator === 'BETWEEN'
        ? '#Type BETWEEN :a AND :b'
        : `#Type ${operator} :Type`;
    var value =
      operator === 'BETWEEN' ? [Math.random(), Math.random()] : Math.random();

    test('should throw if `type` is undefined', () => {
      expect(() => getByTypeAndData()).toThrow('Type is undefined');
    });

    test('should throw if `expression` is undefined', () => {
      expect(() => getByTypeAndData({ type })).toThrow(
        'Expression is undefined'
      );
    });

    test('should throw if `value` is undefined', () => {
      expect(() => getByTypeAndData({ type, expression })).toThrow(
        'Value is undefined'
      );
    });

    test('should throw if `limit` is not a number', () => {
      expect(() =>
        getByTypeAndData({ type, expression, value, limit: true })
      ).toThrow('Limit is not a number');
    });

    test('should throw if `listTGSIK` is not a list, and `endTGSIK` is not a number', () => {
      expect(() =>
        getByTypeAndData({ type, expression, value, startTGSIK: true })
      ).toThrow('Start TGSIK is not a number');
    });

    test('should fail if the `startTGSIK` is bigger thant the `endTGSIK`', () => {
      expect(() =>
        getByTypeAndData({
          type,
          expression,
          value,
          startTGSIK: 10,
          endTGSIK: 9
        })
      ).toThrow('Start TGSIK is bigger than End TGSIK');
    });

    test('should fail if the `listGSIK` contains values that are not numbers', () => {
      expect(() =>
        getByTypeAndData({ type, expression, value, listTGSIK: [1, 2, true] })
      ).toThrow('List TGSIK is not a list of numbers');
    });

    beforeEach(() => {
      sinon.spy(documentClient, 'query');
    });

    afterEach(() => {
      documentClient.query.restore();
    });

    test('should call the query on 10 GSIK by default', () => {
      return getByTypeAndData({ type, expression, value }).then(() => {
        expect(documentClient.query.callCount).toBe(10);
      });
    });

    test('should allow to set the `startTGSIK` while keeping the value of `endGSIK` at ten times the `startTGSIK` value', () => {
      var startTGSIK = Math.floor(Math.random() * 100);
      return getByTypeAndData({ type, expression, value, startTGSIK }).then(
        () => {
          expect(documentClient.query.callCount).toBe(10);
          expect(
            get(
              documentClient,
              `query.args[0][0].ExpressionAttributeValues.:TGSIK`
            )
          ).toEqual(`${tenant}#${type}#${startTGSIK}`);
          expect(
            get(
              documentClient,
              `query.args[9][0].ExpressionAttributeValues.:TGSIK`
            )
          ).toEqual(`${tenant}#${type}#${startTGSIK + 10 - 1}`);
        }
      );
    });

    test('should allow to set the `startTGSIK` and the `endTGSIK`', () => {
      var startTGSIK = Math.floor(Math.random() * 10 + 5);
      var endTGSIK = startTGSIK + Math.floor(Math.random() * 10);
      var difference = endTGSIK - startTGSIK;
      return getByTypeAndData({
        type,
        expression,
        value,
        startTGSIK,
        endTGSIK
      }).then(() => {
        expect(documentClient.query.callCount).toBe(difference);
        expect(
          get(
            documentClient,
            `query.args[0][0].ExpressionAttributeValues.:TGSIK`
          )
        ).toEqual(`${tenant}#${type}#${startTGSIK}`);
        expect(
          get(
            documentClient,
            `query.args[${difference - 1}][0].ExpressionAttributeValues.:TGSIK`
          )
        ).toEqual(`${tenant}#${type}#${endTGSIK - 1}`);
      });
    });

    test('should allow passing a custom `listTGSIK`', () => {
      var listTGSIK = range(0, Math.floor(Math.random() * 10) + 1).map(
        Math.random
      );
      return getByTypeAndData({ type, expression, value, listTGSIK }).then(
        () => {
          expect(documentClient.query.callCount).toBe(listTGSIK.length);
        }
      );
    });

    test('should return valid DynamoDB query params objects if the value is a number', () => {
      var listTGSIK = range(0, Math.floor(Math.random() * 10) + 3).map(
        Math.random
      );
      return getByTypeAndData({ type, expression, value, listTGSIK }).then(
        result => {
          listTGSIK.forEach((i, j) => {
            expect(documentClient.query.args[j][0]).toEqual({
              TableName: table,
              IndexName: 'ByTypeAndNumber',
              KeyConditionExpression: `#TGSIK = :TGSIK AND ${expression}`,
              ExpressionAttributeNames: {
                '#TGSIK': 'TGSIK',
                '#Number': 'Number'
              },
              Limit: 10,
              ExpressionAttributeValues: Object.assign(
                {
                  ':TGSIK': tenant + '#' + type + '#' + i
                },
                Array.isArray(value)
                  ? { ':a': value[0], ':b': value[1] }
                  : { ':Number': value }
              )
            });
          });
        }
      );
    });

    test('should return valid DynamoDB query params objects if the value is a string', () => {
      var value = cuid();
      var listTGSIK = range(0, Math.floor(Math.random() * 10) + 3).map(
        Math.random
      );
      return getByTypeAndData({ type, expression, value, listTGSIK }).then(
        result => {
          listTGSIK.forEach((i, j) => {
            expect(documentClient.query.args[j][0]).toEqual({
              TableName: table,
              IndexName: 'ByTypeAndString',
              KeyConditionExpression: `#TGSIK = :TGSIK AND ${expression}`,
              ExpressionAttributeNames: {
                '#TGSIK': 'TGSIK',
                '#String': 'String'
              },
              Limit: 10,
              ExpressionAttributeValues: Object.assign(
                {
                  ':TGSIK': tenant + '#' + type + '#' + i
                },
                Array.isArray(value)
                  ? { ':a': value[0], ':b': value[1] }
                  : { ':String': value }
              )
            });
          });
        }
      );
    });

    test('should allow to set a custom limit value', () => {
      var listTGSIK = range(0, Math.floor(Math.random() * 10) + 10).map(
        Math.random
      );
      var limit = Math.floor(Math.random() * 10);
      return getByTypeAndData({
        type,
        expression,
        value,
        listTGSIK,
        limit
      }).then(result => {
        listTGSIK.forEach((i, j) => {
          expect(documentClient.query.args[j][0]).toEqual({
            TableName: table,
            IndexName: 'ByTypeAndNumber',
            KeyConditionExpression: `#TGSIK = :TGSIK AND ${expression}`,
            ExpressionAttributeNames: {
              '#TGSIK': 'TGSIK',
              '#Number': 'Number'
            },
            Limit: limit,
            ExpressionAttributeValues: Object.assign(
              {
                ':TGSIK': tenant + '#' + type + '#' + i
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
      var listTGSIK = range(0, Math.floor(Math.random() * 100)).map(
        Math.random
      );
      return getByTypeAndData({ type, expression, value, listTGSIK }).then(
        result => {
          expect(result).toEqual({
            Count: listTGSIK.length,
            ScannedCount: listTGSIK.length,
            Items: range(0, listTGSIK.length).map(i => ({
              Data:
                result.LastEvaluatedKeys[listTGSIK[i]].String !== undefined
                  ? tenant + '#' + type + '#' + listTGSIK[i]
                  : number
            })),
            LastEvaluatedKeys: listTGSIK.reduce((acc, i, j) => {
              var attribute =
                typeof result.Items[j].Data === 'number' ? 'Number' : 'String';
              var data =
                attribute === 'String' ? tenant + '#' + type + '#' + i : number;
              return Object.assign(acc, {
                [i]: {
                  Node: tenant + node,
                  [attribute]: data
                }
              });
            }, {})
          });
        }
      );
    });
  });
});
