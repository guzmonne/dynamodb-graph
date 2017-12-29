'use strict';

var sinon = require('sinon');
var cuid = require('cuid');
var get = require('lodash/get');
var range = require('lodash/range');
var getByTypeFactory = require('../../src/query/getByType.js');
var utils = require('../../src/modules/utils.js');

var OPERATORS = utils._operators;

describe('getByTypeFactory()', () => {
  var table = 'TestTable';
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
              Node: node + params.ExpressionAttributeValues[':GSIK'],
              Type: type + params.ExpressionAttributeValues[':GSIK']
            }
          });
        }
      };
    }
  };
  var config = { table, maxGSIK, documentClient };

  test('should be a function', () => {
    expect(typeof getByTypeFactory).toEqual('function');
  });

  test('should call the `utils.checkConfiguration` function', () => {
    sinon.spy(utils, 'checkConfiguration');
    getByTypeFactory(config);
    expect(utils.checkConfiguration.calledOnce).toBe(true);
    utils.checkConfiguration.restore();
  });

  describe('#getByType()', () => {
    var getByType = getByTypeFactory(config);
    var operator = OPERATORS[Math.floor(Math.random() * OPERATORS.length)];
    var expression =
      operator === 'BETWEEN'
        ? '#Type BETWEEN :a AND :b'
        : `#Type ${operator} :Type`;
    var value =
      operator === 'BETWEEN' ? [Math.random(), Math.random()] : Math.random();

    test('should throw if `expression` is undefined', () => {
      expect(() => getByType()).toThrow('Expression is undefined');
    });

    test('should throw if `value` is undefined', () => {
      expect(() => getByType({ expression })).toThrow('Value is undefined');
    });

    test('should throw if `limit` is not a number', () => {
      expect(() => getByType({ expression, value, limit: true })).toThrow(
        'Limit is not a number'
      );
    });

    test('should throw if `listGSIK` is not a list, and `endGSIK` is not a number', () => {
      expect(() => getByType({ expression, value, startGSIK: true })).toThrow(
        'Start GSIK is not a number'
      );
    });

    test('should fail if the `startGSIK` is bigger thant the `endGSIK`', () => {
      expect(() =>
        getByType({ expression, value, startGSIK: 10, endGSIK: 9 })
      ).toThrow('Start GSIK is bigger than End GSIK');
    });

    test('should fail if the `listGSIK` contains values that are not numbers', () => {
      expect(() =>
        getByType({ expression, value, listGSIK: [1, 2, true] })
      ).toThrow('List GSIK is not a list of numbers');
    });

    beforeEach(() => {
      sinon.spy(documentClient, 'query');
    });

    afterEach(() => {
      documentClient.query.restore();
    });

    test('should call the query on 10 GSIK by default', () => {
      return getByType({ expression, value }).then(() => {
        expect(documentClient.query.callCount).toBe(10);
      });
    });

    test('should allow to set the `startGSIK` while keeping the value of `endGSIK` at ten times the `startGSIK` value', () => {
      var startGSIK = Math.floor(Math.random() * 100);
      return getByType({ expression, value, startGSIK }).then(() => {
        expect(documentClient.query.callCount).toBe(10);
        expect(
          get(
            documentClient,
            `query.args[0][0].ExpressionAttributeValues.:GSIK`
          )
        ).toEqual(`#${startGSIK}`);
        expect(
          get(
            documentClient,
            `query.args[9][0].ExpressionAttributeValues.:GSIK`
          )
        ).toEqual(`#${startGSIK + 10 - 1}`);
      });
    });

    test('should allow to set the `startGSIK` and the `endGSIK`', () => {
      var startGSIK = Math.floor(Math.random() * 10 + 5);
      var endGSIK = startGSIK + Math.floor(Math.random() * 10);
      var difference = endGSIK - startGSIK;
      return getByType({ expression, value, startGSIK, endGSIK }).then(() => {
        expect(documentClient.query.callCount).toBe(difference);
        expect(
          get(
            documentClient,
            `query.args[0][0].ExpressionAttributeValues.:GSIK`
          )
        ).toEqual(`#${startGSIK}`);
        expect(
          get(
            documentClient,
            `query.args[${difference - 1}][0].ExpressionAttributeValues.:GSIK`
          )
        ).toEqual(`#${endGSIK - 1}`);
      });
    });

    test('should allow passing a custom `listGSIK`', () => {
      var listGSIK = range(0, Math.floor(Math.random() * 10) + 1).map(
        Math.random
      );
      return getByType({ expression, value, listGSIK }).then(() => {
        expect(documentClient.query.callCount).toBe(listGSIK.length);
      });
    });

    test('should return the parsed and accumulated items', () => {
      var listGSIK = range(0, Math.floor(Math.random() * 100)).map(Math.random);
      return getByType({ expression, value, listGSIK }).then(result => {
        expect(result).toEqual({
          Count: listGSIK.length,
          ScannedCount: listGSIK.length,
          Items: range(0, listGSIK.length).map(i => ({
            Data: '#' + listGSIK[i]
          })),
          LastEvaluatedKeys: listGSIK.reduce(
            (acc, i) =>
              Object.assign(acc, {
                [i]: {
                  Node: node + '#' + i,
                  Type: type + '#' + i
                }
              }),
            {}
          )
        });
      });
    });
  });
});
