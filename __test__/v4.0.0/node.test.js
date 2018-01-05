'use strict';

var cuid = require('cuid');
var sinon = require('sinon');
var nodeFactory = require('../../src/node.js');
var { calculateGSIK, prefixTenant } = require('../../src/modules/utils.js');

describe('nodeFactory', () => {
  test('should be a function', () => {
    expect(typeof nodeFactory).toEqual('function');
  });

  test('should return a function', () => {
    expect(typeof nodeFactory()).toEqual('function');
  });

  describe('#node', () => {
    var documentClient = {
      put: params => ({
        promise: () => {
          return Promise.resolve({
            Item: params.Item
          });
        }
      }),
      get: params => ({
        promise: () => {
          return Promise.resolve({
            Item: Object.assign({}, params.Key, {
              Data: 'Data',
              Target: 'Target',
              GSIK: '0'
            })
          });
        }
      })
    };
    var maxGSIK = 10;
    var tenant = Math.random() > 0.5 ? undefined : cuid();
    var pTenant = prefixTenant(tenant);
    var table = 'TestTable';
    var id = cuid();
    var type = cuid();
    var data = cuid();
    var node = nodeFactory({
      documentClient,
      maxGSIK,
      tenant,
      table
    });

    test('should throw if `id` is not a string', () => {
      expect(() => node({ id: true })).toThrow('Node ID is not a string');
    });

    test('should throw if the type is undefined', () => {
      expect(() => node({ id })).toThrow('Type is undefined');
    });

    test('should set the node `id` value to a random `cuid` if it is undefined', () => {
      expect(() => node({ type }).create({ data })).not.toThrow();
    });

    test('should return an object', () => {
      expect(typeof node({ id, type })).toEqual('object');
    });

    var testNode = node({ id, type });

    describe('#create', () => {
      test('should be a function', () => {
        expect(typeof node({ id, type }).create).toEqual('function');
      });

      test('should throw if options argument is undefined', () => {
        expect(() => node({ id, type }).create()).toThrow(
          'Options is undefined'
        );
      });

      test('should throw if type is undefined', () => {
        expect(() => node({ id }).create({ data })).toThrow(
          'Type is undefined'
        );
      });

      test('should return a Promise', () => {
        expect(testNode.create({ data, type }) instanceof Promise).toEqual(
          true
        );
      });

      beforeEach(() => {
        sinon.spy(documentClient, 'put');
      });

      afterEach(() => {
        documentClient.put.restore();
      });

      test('should call the `documentClient.put` method with a valid params object, in order to create a new node when the `data` attribute is set', () => {
        return testNode.create({ data }).then(result => {
          expect(documentClient.put.args[0][0]).toEqual({
            TableName: table,
            Item: {
              Node: pTenant(id),
              Data: data,
              Type: type,
              Target: pTenant(id),
              GSIK: calculateGSIK({ node: id, tenant, maxGSIK })
            }
          });
        });
      });

      test('should return a valid Node item when the `data` attribute is set', () => {
        var node = nodeFactory({
          documentClient,
          maxGSIK: 0,
          tenant,
          table
        });
        return node({ id, type })
          .create({ data })
          .then(result => {
            expect(result).toEqual({
              Item: {
                Node: id,
                Data: data,
                Type: type,
                Target: id,
                GSIK: '0'
              }
            });
          });
      });

      test('should call the `documentClient.put` method with a valid params object, in order to create a new edge when the `data` and `target` attributes are set', () => {
        var target = cuid();
        return testNode.create({ data, target }).then(result => {
          expect(documentClient.put.args[0][0]).toEqual({
            TableName: table,
            Item: {
              Node: pTenant(id),
              Data: data,
              Type: type,
              Target: pTenant(target),
              GSIK: calculateGSIK({ node: id, tenant, maxGSIK })
            }
          });
        });
      });

      test('should return a valid Edge item when the `data` and `target` attributes are set', () => {
        var target = cuid();
        return testNode.create({ target, data }).then(result => {
          expect(result).toEqual({
            Item: {
              Node: id,
              Data: data,
              Type: type,
              Target: target,
              GSIK: calculateGSIK({ node: id, maxGSIK })
            }
          });
        });
      });

      test('should throw an error if the `data` or `target` values are configured with the `prop` value', () => {
        var target = cuid();
        var prop = cuid();
        expect(() => testNode.create({ prop, target })).toThrow(
          'Can configure `prop`, `target`, and `data` values at the same type'
        );
        expect(() => testNode.create({ prop, data })).toThrow(
          'Can configure `prop`, `target`, and `data` values at the same type'
        );
      });

      test('should call the `documentClient.put` method with a valid params object, in order to create a new prop when the `prop` attribute is set', () => {
        var prop = cuid();
        return testNode.create({ prop }).then(result => {
          expect(documentClient.put.args[0][0]).toEqual({
            TableName: table,
            Item: {
              Node: pTenant(id),
              Data: prop,
              Type: type,
              GSIK: calculateGSIK({ node: id, tenant, maxGSIK })
            }
          });
        });
      });

      test('should return a valid Edge item when the `prop` attribute is set', () => {
        var prop = cuid();
        return testNode.create({ prop }).then(result => {
          expect(result).toEqual({
            Item: {
              Node: id,
              Data: prop,
              Type: type,
              GSIK: calculateGSIK({ node: id, maxGSIK })
            }
          });
        });
      });
    });

    describe('#get', () => {
      test('should be a function', () => {
        expect(typeof testNode.get).toEqual('function');
      });

      test('should throw if `node` is undefined', () => {
        expect(() => node({ type }).get()).toThrow('Node is undefined');
      });

      test('should return a promise', () => {
        expect(testNode.get() instanceof Promise).toBe(true);
      });

      beforeEach(() => {
        sinon.spy(documentClient, 'get');
      });

      afterEach(() => {
        documentClient.get.restore();
      });

      test('should call `documentClient.get` method with the appropiate parameters to get an item, if the `node` and `type` attributes are defined', () => {
        return node({ id, type })
          .get()
          .then(() => {
            expect(documentClient.get.args[0][0]).toEqual({
              TableName: table,
              Key: {
                Node: prefixTenant(tenant, id),
                Type: type
              }
            });
          });
      });

      test('should return a valid Item', () => {
        return node({ id, type })
          .get()
          .then(result => {
            expect(result).toEqual({
              Item: {
                Node: id,
                Type: type,
                Data: 'Data',
                Target: 'Target',
                GSIK: '0'
              }
            });
          });
      });

      describe('#edges()', () => {
        test('should be a function', () => {
          expect(typeof node({ id, type }).get.edges).toEqual('function');
        });
      });
    });
  });
});
