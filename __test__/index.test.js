// @ts-nocheck
'use strict';

var cuid = require('cuid');
var g = require('../src/index.js');
var utils = require('../src/modules/utils.js');
var dynamoResponse = require('./dynamoResponse.js');

var table = 'ExampleTable';

describe('#getNodesWithType()', () => {
  var type = 'Testing';
  var tenant = cuid();
  var maxGSIK = 3;

  var db = () => ({
    query: params => ({
      promise: () => {
        var gsik = params.ExpressionAttributeValues[':GSIK'];
        if (gsik === tenant + '#' + 0)
          return Promise.resolve(dynamoResponse.raw({ Items: [{ Data: 1 }] }));
        if (gsik === tenant + '#' + 1)
          return Promise.resolve(dynamoResponse.raw({ Items: [{ Data: 2 }] }));
        if (gsik === tenant + '#' + 2)
          return Promise.resolve(dynamoResponse.raw({ Items: [{ Data: 3 }] }));
        return Promise.resolve();
      }
    })
  });

  test('should return a function', () => {
    expect(typeof g.getNodesWithType({ tenant, type })).toEqual('function');
  });

  test('should return an error if maxGSIK is undefined', () => {
    return g
      .getNodesWithType({ db: db(), table })({ tenant, type })
      .catch(error => expect(error.message).toEqual('Max GSIK is undefined'));
  });

  test('should return an error if type is undefined', () => {
    return g
      .getNodesWithType({ db: db(), table })({ tenant, maxGSIK })
      .catch(error => expect(error.message).toEqual('Type is undefined'));
  });

  test('should return a response object with all nodes', () => {
    return g
      .getNodesWithType({ db: db(), table })({ tenant, type, maxGSIK })
      .then(response => {
        expect(response).toEqual({
          Count: 3,
          Items: [{ Data: 1 }, { Data: 2 }, { Data: 3 }],
          ScannedCount: 30
        });
      })
      .catch(error => expect(error).toEqual(null));
  });
});
