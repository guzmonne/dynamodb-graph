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

  test('should return a function', () => {
    expect(typeof createProperties({ db, table })).toEqual('function');
  });

  test('should build valid DynamoDB put params object', done => {
    var tenant = cuid();
    var node = tenant + '#' + cuid();
    var maxGSIK = 4;
    var gsik = utils.calculateGSIK({ node, tenant, maxGSIK });
    createProperties({ db: db(), table })({
      tenant,
      node,
      maxGSIK,
      properties: range(0, 51).map(i => [i.toString(), i])
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
      done();
    });
  });
});
