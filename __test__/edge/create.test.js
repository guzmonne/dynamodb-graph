'use strict';

var cuid = require('cuid');
var sinon = require('sinon');
var utils = require('../../src/modules/utils.js');
var createFactory = require('../../src/edge/create.js');

describe('createFactory', () => {
  var table = 'GraphTableExample';
  var tenant = cuid();
  var maxGSIK = 10;
  var documentClient = {
    put: params => ({
      promise: () => {
        return Promise.resolve({
          Item: params.Item
        });
      }
    })
  };
  var config = { table, tenant, maxGSIK, documentClient };

  test('should be a function', () => {
    expect(typeof createFactory).toEqual('function');
  });

  test('should call the `utils.checkConfiguration` function', () => {
    sinon.spy(utils, 'checkConfiguration');
    var config = { table, tenant, maxGSIK, documentClient };
    createFactory(config);
    expect(utils.checkConfiguration.callCount).toBe(2);
    expect(utils.checkConfiguration.calledWith(config)).toBe(true);
    utils.checkConfiguration.restore();
  });

  test('should return a function', () => {
    var actual = createFactory(config);
    expect(typeof actual).toEqual('function');
  });

  describe('createFactory#create()', () => {
    var create = createFactory(config);
    var node = cuid();
    var target = cuid();
    var data = cuid();
    var number = Math.round(Math.random() * 10, 0);
    var type = 'TestType';

    test('should throw an error if `node` is undefined', () => {
      expect(() => create()).toThrow('Node is undefined');
    });

    test('should throw an error if `target` is undefined', () => {
      expect(() => create({ node })).toThrow('Target is undefined');
    });

    test('should throw an error if `type` is undefined', () => {
      expect(() => create({ node, target })).toThrow('Type is undefined');
    });

    test('should throw an error if `data` is undefined', () => {
      expect(() => create({ node, target, type })).toThrow('Data is undefined');
    });

    test('should return a Promise', () => {
      expect(create({ node, target, data, type }) instanceof Promise).toBe(
        true
      );
    });

    test('should called the `documentClient` function with correct options', () => {
      sinon.spy(documentClient, 'put');
      var node = cuid();
      return create({ node, target, data, type })
        .then(result => {
          expect(documentClient.put.args[0][0]).toEqual({
            TableName: table,
            Item: {
              Node: node,
              Type: type,
              String: data,
              Target: target,
              GSIK: utils.calculateGSIK({ node, maxGSIK, tenant }),
              TGSIK: utils.calculateTGSIK({ node, maxGSIK, tenant, type })
            }
          });
        })
        .then(() => documentClient.put.restore());
    });

    test('should handle errors from the put request', () => {
      var node = cuid();
      sinon.stub(documentClient, 'put').callsFake(() => ({
        promise: () => Promise.reject(new Error('TestError'))
      }));
      return create({ node, data, type, target }).catch(error => {
        expect(error.message).toEqual('TestError');
        documentClient.put.restore();
      });
    });

    test('should store the data in the `Number` key if the data is a number', () => {
      var node = cuid();
      sinon.spy(documentClient, 'put');
      var params = { target, maxGSIK, tenant, node, data: 4, type };
      return create(params).then(() =>
        expect(documentClient.put.args[0][0]).toEqual({
          TableName: table,
          Item: {
            Node: node,
            Type: type,
            Number: 4,
            Target: target,
            GSIK: utils.calculateGSIK(params),
            TGSIK: utils.calculateTGSIK(params)
          }
        })
      );
    });
  });
});
