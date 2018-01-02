// @ts-nocheck
'use strict';

var cuid = require('cuid');
var getNodes = require('../src/getNodes.js');
var utils = require('../src/modules/utils.js');
var dynamoResponse = require('./dynamoResponse.js');

var table = 'ExampleTable';

describe('#getNodes()', () => {
  var type = 'Testing';
  var tenant = cuid();
  var maxGSIK = 3;

  var db = () => ({
    query: params => ({
      promise: () => {
        var gsik = params.ExpressionAttributeValues[':GSIK'];
        if (gsik === tenant + '#' + 0)
          return Promise.resolve(
            dynamoResponse.raw({
              Items: [{ Data: 1 }],
              ConsumedCapacity: {
                Table: table,
                CapacityUnits: 1
              }
            })
          );
        if (gsik === tenant + '#' + 1)
          return Promise.resolve(
            dynamoResponse.raw({
              Items: [{ Data: 2 }],
              ConsumedCapacity: {
                Table: table,
                CapacityUnits: 1
              }
            })
          );
        if (gsik === tenant + '#' + 2)
          return Promise.resolve(
            dynamoResponse.raw({
              Items: [{ Data: 3 }],
              ConsumedCapacity: {
                Table: table,
                CapacityUnits: 1
              }
            })
          );
        return Promise.resolve();
      }
    })
  });

  test('should return a function', () => {
    expect(typeof getNodes({ tenant, type })).toEqual('function');
  });

  test('should return an error if maxGSIK is undefined', () => {
    return getNodes({ db: db(), table })({ tenant, type }).catch(error =>
      expect(error.message).toEqual('Max GSIK is undefined')
    );
  });

  test('should return an error if type is undefined', () => {
    return getNodes({ db: db(), table })({ tenant, maxGSIK }).catch(error =>
      expect(error.message).toEqual('Type is undefined')
    );
  });

  test('should return a response object with all nodes', () => {
    return getNodes({ db: db(), table })({ tenant, type, maxGSIK }).then(
      response => {
        expect(response).toEqual({
          Count: 3,
          Items: [{ Data: 1 }, { Data: 2 }, { Data: 3 }],
          ScannedCount: 30
        });
      }
    );
  });
});
