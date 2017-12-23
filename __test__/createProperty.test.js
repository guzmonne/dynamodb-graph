'use strict';

var cuid = require('cuid');
var utils = require('../src/modules/utils.js');
var createProperty = require('../src/createProperty.js');

var table = 'ExampleTable';

describe('#createProperty()', () => {
  var db = function() {
    return {
      put: params => ({ promise: () => Promise.resolve(params) })
    };
  };

  test('should return a function', () => {
    expect(typeof createProperty({ db, table })).toEqual('function');
  });

  test('should build valid DynamoDB put params object', done => {
    var actual = createProperty({ db: db(), table });
    var node = cuid(),
      type = 'Property',
      data = 'test';
    actual({ node, type, data, maxGSIK: 0 }).then(params => {
      expect(params).toEqual({
        TableName: table,
        Item: {
          Node: node,
          Type: type,
          Data: data,
          GSIK: utils.calculateGSIK({ node })
        }
      });
      done();
    });
  });
});
