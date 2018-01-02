'use strict';

var cuid = require('cuid');
var sinon = require('sinon');
var utils = require('../../src/modules/utils.js');
var createFactory = require('../../src/node/create.js');

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
    var data = cuid();
    var number = Math.round(Math.random() * 10, 0);
    var type = 'TestType';

    test('should throw an error if `type` is undefined', () => {
      expect(() => create()).toThrow('Type is undefined');
    });

    test('should throw an error if `data` is undefined', () => {
      expect(() => create({ type })).toThrow('Data is undefined');
    });

    test('should return a Promise', () => {
      expect(create({ data, type }) instanceof Promise).toBe(true);
    });

    test('should create a new cuid if `node` is undefined', () => {
      return create({ data, type }).then(result => {
        expect(!!result.Item.Node).toBe(true);
        expect(result.Item.Node.indexOf(tenant)).toBe(0);
      });
    });

    test('should use the provided `node` if defined', () => {
      var node = cuid();
      return create({ node, data, type }).then(result => {
        expect(result.Item.Node).toEqual(node);
      });
    });

    test('should called the `documentClient` function with correct options', () => {
      sinon.spy(documentClient, 'put');
      var node = cuid();
      return create({ node, data, type })
        .then(result => {
          expect(documentClient.put.args[0][0]).toEqual({
            TableName: table,
            Item: {
              Node: node,
              Type: type,
              String: data,
              Target: node,
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
      return create({ node, data, type }).catch(error => {
        expect(error.message).toEqual('TestError');
        documentClient.put.restore();
      });
    });

    test('should store the data in the `Number` key if the data is a number', () => {
      var node = cuid();
      sinon.spy(documentClient, 'put');
      var params = { maxGSIK, tenant, node, data: 4, type };
      return create(params).then(() =>
        expect(documentClient.put.args[0][0]).toEqual({
          TableName: table,
          Item: {
            Node: node,
            Type: type,
            Number: 4,
            Target: node,
            GSIK: utils.calculateGSIK(params),
            TGSIK: utils.calculateTGSIK(params)
          }
        })
      );
    });
  });
});
