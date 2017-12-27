'use strict';

var sinon = require('sinon');
var cuid = require('cuid');
var utils = require('../../src/modules/utils.js');
var destroyFactory = require('../../src/node/destroy.js');

describe('destroyFactory()', () => {
  var maxGSIK = 10;
  var tenant = cuid();
  var documentClient = {
    delete: () => ({
      promise: () => {
        return Promise.resolve({});
      }
    })
  };
  var table = 'GraphTable';
  var config = { table, maxGSIK, tenant, documentClient };

  test('should be a function', () => {
    expect(typeof destroyFactory).toEqual('function');
  });

  test('should call the `utils.checkConfig` function', () => {
    sinon.spy(utils, 'checkConfiguration');
    destroyFactory(config);
    expect(utils.checkConfiguration.callCount).toEqual(1);
    utils.checkConfiguration.restore();
  });

  test('should return a function', () => {
    expect(typeof destroyFactory(config)).toEqual('function');
  });

  describe('#destroy()', () => {
    var destroy = destroyFactory(config);
    var node = cuid();
    var type = cuid();

    test('should throw an error if node is undefined', () => {
      expect(() => destroy()).toThrow('Node is undefined');
    });

    test('should throw an error if node is undefined', () => {
      expect(() => destroy({ node })).toThrow('Type is undefined');
    });

    test('should return a promise', () => {
      expect(destroy({ node, type }) instanceof Promise).toBe(true);
    });

    test('should call the `documentClient.delete` function with valid params', () => {
      sinon.spy(documentClient, 'delete');
      return destroy({ node, type }).then(() => {
        expect(documentClient.delete.args[0][0]).toEqual({
          TableName: table,
          Key: {
            Node: node,
            Type: type
          }
        });
        documentClient.delete.restore();
      });
    });
  });
});
