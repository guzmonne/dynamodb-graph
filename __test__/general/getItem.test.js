'use strict';

var sinon = require('sinon');
var cuid = require('cuid');
var getItemFactory = require('../../src/general/getItem.js');
var utils = require('../../src/modules/utils.js');

describe('getItemFactory()', () => {
  var node = cuid();
  var type = cuid();
  var data = cuid();
  var target = cuid();
  var maxGSIK = 10;
  var table = 'TestTable';
  var documentClient = {
    get: params => ({
      promise: () =>
        Promise.resolve({
          Item: {
            Node: params.Key.Node,
            Type: params.Key.Type,
            String: data,
            Target: target,
            GSIK: utils.calculateGSIK({
              node: params.Key.Node,
              maxGSIK
            }),
            TGSIK: utils.calculateTGSIK({
              node: params.Key.Node,
              type: params.Key.Type,
              maxGSIK
            })
          }
        })
    })
  };
  var config = { table, maxGSIK, documentClient };

  test('should be a function', () => {
    expect(typeof getItemFactory).toEqual('function');
  });

  test('should call the `utils.checkConfiguration` function', () => {
    sinon.spy(utils, 'checkConfiguration');
    getItemFactory(config);
    expect(utils.checkConfiguration.calledOnce).toBe(true);
    utils.checkConfiguration.restore();
  });

  describe('#get()', () => {
    var getItem = getItemFactory(config);

    test('should throw if `node` is undefined', () => {
      expect(() => getItem()).toThrow('Node is undefined');
    });

    test('should throw if `type` is undefined', () => {
      expect(() => getItem({ node })).toThrow('Type is undefined');
    });

    test('should return a promise', () => {
      expect(getItem({ node, type }) instanceof Promise).toBe(true);
    });

    test('should call the `documentClient.get function`', () => {
      sinon.stub(documentClient, 'get').callsFake(() => ({
        promise: () => Promise.resolve()
      }));
      return getItem({ node, type }).then(() => {
        expect(documentClient.get.calledOnce).toBe(true);
        documentClient.get.restore();
      });
    });

    test('should call the `documentClient.get function` with a valid params object', () => {
      sinon.spy(documentClient, 'get');
      return getItem({ node, type }).then(() => {
        expect(documentClient.get.args[0][0]).toEqual({
          TableName: table,
          Key: {
            Node: node,
            Type: type
          }
        });
        documentClient.get.restore();
      });
    });
  });
});
