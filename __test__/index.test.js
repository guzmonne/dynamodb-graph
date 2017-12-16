// @ts-nocheck
'use strict';

var cuid = require('cuid');
var g = require('../src/index.js');
var utils = require('../src/modules/utils.js');
var dynamoResponse = require('./dynamoResponse.js');

var table = 'ExampleTable';

describe('#deleteNode()', () => {
  var response = {
    Items: [{ Type: 'Edge1' }, { Type: 'Edge2' }]
  };
  var db = function() {
    return {
      query: params => ({ promise: () => Promise.resolve(response) }),
      delete: params => ({ promise: () => Promise.resolve(params) })
    };
  };

  test('should return a function', () => {
    expect(typeof g.deleteNode({ db, table })).toEqual('function');
  });

  test('should return a valid DynamoDB delete interface object', done => {
    var node = cuid();
    g
      .deleteNode({ db: db(), table })(node)
      .then(params => {
        expect(params).toEqual([
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

describe('#createProperty()', () => {
  var db = function() {
    return {
      put: params => ({ promise: () => Promise.resolve(params) })
    };
  };

  test('should return a function', () => {
    expect(typeof g.createProperty({ db, table })).toEqual('function');
  });

  test('should build valid DynamoDB put params object', done => {
    var actual = g.createProperty({ db: db(), table });
    var node = cuid(),
      type = 'Property',
      data = 'test';
    actual({ node, type, data, maxGSIK: 0 }).then(params => {
      expect(params).toEqual({
        TableName: table,
        Item: {
          Node: node,
          Type: type,
          Data: JSON.stringify(data),
          GSIK: utils.calculateGSIK({ node })
        }
      });
      done();
    });
  });
});

describe('#createEdge()', () => {
  var response = () => ({
    Items: [{ Data: JSON.stringify('Test') }]
  });
  var db = function(response) {
    return {
      query: params => ({ promise: () => Promise.resolve(response()) }),
      put: params => ({ promise: () => Promise.resolve(params) })
    };
  };

  test('should return a function', () => {
    expect(typeof g.createEdge({ db, table })).toEqual('function');
  });

  var node = cuid();
  var target = cuid();
  var type = 'Edge';

  test('should fail if the node is not defined', () => {
    expect(() => {
      g.createEdge({ db: db(), table })({ target, type });
    }).toThrow('Node is undefined.');
  });

  test('should fail if the target is not defined', () => {
    var createEdge = g.createEdge({ db: db(response), table });
    return createEdge({ node }).catch(error => {
      expect(error.message).toEqual('Target is undefined');
    });
  });

  test('should fail if the type is not defined', () => {
    var createEdge = g.createEdge({ db: db(response), table });
    return createEdge({ node, target }).catch(error => {
      expect(error.message).toEqual('Type is undefined');
    });
  });

  test('should return a valid DynamoDB put params object', () => {
    var createEdge = g.createEdge({ db: db(response), table });
    return createEdge({ node, target, type, maxGSIK: 0 }).then(result => {
      expect(result).toEqual({
        TableName: table,
        Item: {
          Node: node,
          Type: type,
          Data: JSON.stringify('Test'),
          Target: target,
          GSIK: utils.calculateGSIK({ node })
        }
      });
    });
  });
});

describe('#getNodesWithTypeOnGSI()', () => {
  var type = 'Test';
  var node = cuid() + '#' + cuid();
  var gsik = utils.calculateGSIK({ node });

  var db = () => ({
    query: params => ({ promise: () => Promise.resolve(params) })
  });

  test('should return a function', () => {
    expect(typeof g.getNodesWithTypeOnGSI({ type, gsik })).toEqual('function');
  });

  test('should fail if type is undefined', () => {
    expect(() => g.getNodesWithTypeOnGSI({ db, table })({ type })).toThrow(
      'GSIK is undefined'
    );
  });

  test('should fail if type is undefined', () => {
    expect(() => g.getNodesWithTypeOnGSI({ db, table })({ gsik })).toThrow(
      'Type is undefined'
    );
  });

  test('should return a valid DynamoDB query params object', () => {
    return g
      .getNodesWithTypeOnGSI({ db: db(), table })({ type, gsik })
      .then(params =>
        expect(params).toEqual({
          ExpressionAttributeNames: {
            '#Data': 'Data',
            '#GSIK': 'GSIK',
            '#Node': 'Node',
            '#Type': 'Type'
          },
          ExpressionAttributeValues: {
            ':GSIK': gsik,
            ':Type': type
          },
          IndexName: 'ByType',
          KeyConditionExpression: '#GSIK = :GSIK AND #Type = :Type',
          ProjectionExpression: '#Data,#Node',
          TableName: 'ExampleTable'
        })
      );
  });

  test('should return the response parsed', () => {
    var database = {
      query: params => ({
        promise: () => Promise.resolve(dynamoResponse.raw())
      })
    };
    return g
      .getNodesWithTypeOnGSI({ db: database, table })({ type: 1, gsik: 2 })
      .then(response => {
        expect(response).toEqual(dynamoResponse.parsed());
      });
  });
});

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
