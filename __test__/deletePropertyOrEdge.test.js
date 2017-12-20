'use strict';

var cuid = require('cuid');
var deletePropertyOrEdge = require('../src/deletePropertyOrEdge.js');

var table = 'ExampleTable';

describe('#deletePropertyOrEdge()', () => {
  var db = function() {
    return {
      delete: params => ({ promise: () => Promise.resolve(params) })
    };
  };

  test('should return a function', () => {
    expect(typeof deletePropertyOrEdge({ db, table })).toEqual('function');
  });

  test('should return a valid DynamoDB delete interface object', () => {
    var node = cuid();
    var type = 'Test';
    return deletePropertyOrEdge({ db: db(), table })({ node, type })
      .then(params => {
        expect(params).toEqual({
          TableName: table,
          Key: {
            Node: node,
            Type: type
          }
        });
      })
      .catch(error => {
        expect(error.message).toBe(null);
      });
  });
});
