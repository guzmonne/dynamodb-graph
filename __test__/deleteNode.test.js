'use strict';

var cuid = require('cuid');
var deleteNode = require('../src/deleteNode.js');

var table = 'ExampleTable';

describe('#deleteNode()', () => {
  var response = {
    Items: [
      { Type: 'Node' },
      { Type: 'Prop' },
      { Type: 'Edge1' },
      { Type: 'Edge2' }
    ]
  };
  var db = function() {
    return {
      query: params => ({ promise: () => Promise.resolve(response) }),
      delete: params => ({ promise: () => Promise.resolve(params) })
    };
  };

  test('should return a function', () => {
    expect(typeof deleteNode({ db, table })).toEqual('function');
  });

  test('should return a valid DynamoDB delete interface object', done => {
    var node = cuid();
    deleteNode({ db: db(), table })(node).then(params => {
      expect(params).toEqual([
        {
          TableName: table,
          Key: {
            Node: node,
            Type: 'Node'
          }
        },
        {
          TableName: table,
          Key: {
            Node: node,
            Type: 'Prop'
          }
        },
        {
          TableName: table,
          Key: {
            Node: node,
            Type: 'Edge1'
          }
        },
        {
          TableName: table,
          Key: {
            Node: node,
            Type: 'Edge2'
          }
        }
      ]);
      done();
    });
  });
});
