'use strict';

var cuid = require('cuid');
var sinon = require('sinon');
var nodeFactory = require('../src/node.js');
var { calculateGSIK, prefixTenant } = require('../src/modules/utils.js');

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
      })
    };
    var maxGSIK = 10;
    var tenant = Math.random() > 0.5 ? undefined : cuid();
    var pTenant = prefixTenant(tenant);
    var table = 'TestTable';
    var node = nodeFactory({
      documentClient,
      maxGSIK,
      tenant,
      table
    });

    test('should throw if `node` is undefined', () => {
      expect(() => node({ node: true })).toThrow('Node is not a string');
    });

    test('should set the node `id` value to a random `cuid` if it is undefined', () => {
      expect(!!node().id).toEqual(true);
    });

    var id = cuid();

    test('should return an object', () => {
      expect(typeof node({ node: id })).toEqual('object');
    });

    describe('#create', () => {
      test('should be a function', () => {
        expect(typeof node({ node: id }).create).toEqual('function');
      });

      test('should throw if options argument is undefined', () => {
        expect(() => node({ node: id }).create()).toThrow(
          'Options is undefined'
        );
      });

      test('should throw if type is undefined', () => {
        expect(() => node({ node: id }).create({ data })).toThrow(
          'Type is undefined'
        );
      });

      var data = 'TestData';
      var type = 'TestType';
      var _node = node({ node: id, type });

      test('should return a Promise', () => {
        expect(_node.create({ data, type }) instanceof Promise).toEqual(true);
      });

      beforeEach(() => {
        sinon.spy(documentClient, 'put');
      });

      afterEach(() => {
        documentClient.put.restore();
      });

      test('should call the `documentClient.put` method with a valid params object, in order to create a new node when the `data` attribute is set', () => {
        return _node.create({ data }).then(result => {
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
        return node({ node: id, type })
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
        return _node.create({ data, target }).then(result => {
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
        return _node.create({ target, data }).then(result => {
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
        var data = cuid();
        expect(() => _node.create({ prop, target })).toThrow(
          'Can configure `prop`, `target`, and `data` values at the same type'
        );
        expect(() => _node.create({ prop, data })).toThrow(
          'Can configure `prop`, `target`, and `data` values at the same type'
        );
      });

      test('should call the `documentClient.put` method with a valid params object, in order to create a new prop when the `prop` attribute is set', () => {
        var prop = cuid();
        return _node.create({ prop }).then(result => {
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
        return _node.create({ prop }).then(result => {
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
  });
});
