'use strict';

var sinon = require('sinon');
var cuid = require('cuid');
var utils = require('../../src/modules/utils.js');
var gFactory = require('../../dist/');

var tenant = cuid();
var maxGSIK = 10;
var documentClient = {
  put: () => ({ promise: () => Promise.resolve() }),
  get: () => ({ promise: () => Promise.resolve() }),
  query: () => ({ promise: () => Promise.resolve() })
};
var table = 'TableTest';
var config = { tenant, maxGSIK, documentClient, table };

describe('dynamodb-graph', () => {
  test('should be a function', () => {
    expect(typeof gFactory).toEqual('function');
  });

  test('should call the `utils.checkConfiguration()` method', () => {
    sinon.spy(utils, 'checkConfiguration');
    gFactory(config);
    expect(utils.checkConfiguration.callCount).toBe(19);
    utils.checkConfiguration.restore();
  });

  var g = gFactory(config);

  describe('.node', () => {
    var node = cuid();
    var type = cuid();
    var data = Math.random();

    test('should be an object', () => {
      expect(typeof g.node).toEqual('object');
    });

    describe('#create()', () => {
      test('should be a function', () => {
        expect(typeof g.node.create).toBe('function');
      });

      test('should call the `documentClient.put` method', () => {
        sinon.spy(documentClient, 'put');
        return g.node.create({ node, type, data }).then(() => {
          expect(documentClient.put.calledOnce).toBe(true);
          documentClient.put.restore();
        });
      });
    });

    describe('#item()', () => {
      test('should be a function', () => {
        expect(typeof g.node.item).toBe('function');
      });

      test('should return a valid node item', () => {
        var expected = {
          Node: node,
          Number: data,
          Type: type,
          Target: node,
          GSIK: utils.calculateGSIK({ node, maxGSIK, tenant }),
          TGSIK: utils.calculateTGSIK({ node, maxGSIK, tenant, type })
        };
        var actual = g.node.item({ node, type, data });
        expect(actual).toEqual(expected);
      });
    });
  });

  describe('.edge', () => {
    var node = cuid();
    var type = cuid();
    var target = cuid();
    var data = Math.random();

    test('should be an object', () => {
      expect(typeof g.edge).toEqual('object');
    });

    describe('#create()', () => {
      test('should be a function', () => {
        expect(typeof g.edge.create).toBe('function');
      });

      test('should call the `documentClient.put` method', () => {
        sinon.spy(documentClient, 'put');
        return g.edge.create({ node, type, data, target }).then(() => {
          expect(documentClient.put.calledOnce).toBe(true);
          documentClient.put.restore();
        });
      });
    });

    describe('#item()', () => {
      test('should be a function', () => {
        expect(typeof g.edge.item).toBe('function');
      });

      test('should return a valid node item', () => {
        var expected = {
          Node: tenant + '#' + node,
          Number: data,
          Type: type,
          Target: target,
          GSIK: utils.calculateGSIK({ node, maxGSIK, tenant }),
          TGSIK: utils.calculateTGSIK({ node, maxGSIK, tenant, type })
        };
        var actual = g.edge.item({ node, type, data, target });
        expect(actual).toEqual(expected);
      });
    });
  });

  describe('.property', () => {
    var node = cuid();
    var type = cuid();
    var target = cuid();
    var data = Math.random();

    test('should be an object', () => {
      expect(typeof g.property).toEqual('object');
    });

    describe('#create()', () => {
      test('should be a function', () => {
        expect(typeof g.property.create).toBe('function');
      });

      test('should call the `documentClient.put` method', () => {
        sinon.spy(documentClient, 'put');
        return g.property.create({ node, type, data, target }).then(() => {
          expect(documentClient.put.calledOnce).toBe(true);
          documentClient.put.restore();
        });
      });
    });

    describe('#item()', () => {
      test('should be a function', () => {
        expect(typeof g.property.item).toBe('function');
      });

      test('should return a valid node item', () => {
        var expected = {
          Node: tenant + '#' + node,
          Number: data,
          Type: type,
          GSIK: utils.calculateGSIK({ node, maxGSIK, tenant }),
          TGSIK: utils.calculateTGSIK({ node, maxGSIK, tenant, type })
        };
        var actual = g.property.item({ node, type, data, target });
        expect(actual).toEqual(expected);
      });
    });
  });

  describe('.get', () => {
    var node = cuid();
    var type = cuid();
    var data = Math.random();

    test('should be a function', () => {
      expect(typeof g.get).toEqual('function');
    });

    test('should call the `documentClient.get` method', () => {
      sinon.spy(documentClient, 'get');
      g.get({ node, type }).then(() => {
        expect(documentClient.get.calledOnce).toBe(true);
        documentClient.get.restore();
      });
    });

    describe('#properties()', () => {
      test('should be a function', () => {
        expect(typeof g.get.properties).toBe('function');
      });

      test('should call the `documentClient.query` method', () => {
        sinon.spy(documentClient, 'query');
        g.get
          .properties({ node })
          .then(() => {
            expect(documentClient.query.calledOnce).toBe(true);
            documentClient.query.restore();
          })
          .catch(error => console.log(error));
      });

      test('should call the `documentClient.query` method, passing the correct expression and value if the `where` option is defined', () => {
        sinon.spy(documentClient, 'query');
        g.get
          .properties({ node, where: { type: { BEGINS_WITH: type } } })
          .then(() => {
            expect(documentClient.query.args[0][0]).toEqual({
              TableName: table,
              KeyConditionExpression:
                '#Node = :Node AND BEGINS_WITH(#Type, :Type)',
              ExpressionAttributeNames: {
                '#Node': 'Node',
                '#Type': 'Type',
                '#Target': 'Target'
              },
              ExpressionAttributeValues: {
                ':Node': node,
                ':Type': type
              },
              FilterExpression: 'attribute_not_exists(#Target)'
            });
            documentClient.query.restore();
          })
          .catch(() => {});
      });
    });
  });

  describe('.query', () => {
    var node = cuid();
    var type = cuid();
    var target = cuid();
    var data = Math.random();

    test('should be a function', () => {
      expect(typeof g.property).toEqual('object');
    });
  });
});
