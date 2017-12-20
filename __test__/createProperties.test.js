'use strict';

var cuid = require('cuid');
var range = require('lodash/range.js');
var utils = require('../src/modules/utils.js');
var createProperties = require('../src/createProperties.js');

var table = 'ExampleTable';

describe('#createProperties()', () => {
  var db = function() {
    return {
      batchWrite: params => ({ promise: () => Promise.resolve(params) })
    };
  };
  var _createProperties = createProperties({ db: db(), table });
  var tenant = cuid();
  var node = tenant + '#' + cuid();
  var maxGSIK = 4;
  var gsik = utils.calculateGSIK({ node, tenant, maxGSIK });

  test('should return a function', () => {
    expect(typeof _createProperties).toEqual('function');
  });

  test('should fail is maxGSIK is undefined', () => {
    expect(() => _createProperties({ node, tenant })).toThrow(
      'Max GSIK is undefined'
    );
  });

  test('should fail is node is undefined', () => {
    expect(() => _createProperties({ maxGSIK, tenant })).toThrow(
      'Node is undefined'
    );
  });

  test('should fail is properties is undefined', () => {
    expect(() => _createProperties({ node, maxGSIK, tenant })).toThrow(
      'Properties is undefined or not a list.'
    );
  });

  test('should fail is properties is not a list', () => {
    expect(() =>
      _createProperties({ node, maxGSIK, tenant, properties: 1 })
    ).toThrow('Properties is undefined or not a list.');
  });

  test('should build valid DynamoDB put params object', () => {
    return _createProperties({
      tenant,
      node,
      maxGSIK,
      properties: range(0, 51).map(i => ({ Type: i.toString(), Data: i }))
    }).then(params => {
      expect(params[0]).toEqual({
        RequestItems: {
          ExampleTable: range(0, 25).map(i => ({
            PutRequest: {
              Item: {
                Node: node,
                GSIK: gsik,
                Data: JSON.stringify(i),
                Type: i.toString()
              }
            }
          }))
        }
      });
      expect(params[1]).toEqual({
        RequestItems: {
          ExampleTable: range(25, 50).map(i => ({
            PutRequest: {
              Item: {
                Node: node,
                GSIK: gsik,
                Data: JSON.stringify(i),
                Type: i.toString()
              }
            }
          }))
        }
      });
    });
  });
});
