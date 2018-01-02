'use strict';

var cuid = require('cuid');
var utils = require('../../src/modules/utils.js');
var itemFactory = require('../../src/node/item.js');

describe('itemFactory()', () => {
  var table = 'TableExample';
  var documentClient = {};
  var tenant = cuid();
  var maxGSIK = 10;
  var node = cuid();
  var type = 'NodeTestType';
  var data = 'Something';
  var config = { table, documentClient, tenant, maxGSIK };

  test('should be a function', () => {
    expect(typeof itemFactory).toEqual('function');
  });

  test('should return a function', () => {
    expect(typeof itemFactory({ table, maxGSIK, documentClient })).toEqual(
      'function'
    );
  });

  var item = itemFactory({ documentClient, table, maxGSIK, tenant });

  describe('#item', () => {
    test('should throw an error if Type is undefined', () => {
      expect(() => item({ node })).toThrow('Type is undefined');
    });

    test('should throw an error if Data is undefined', () => {
      expect(() => item({ node, type })).toThrow('Data is undefined');
    });

    test('should throw an error if data is not a string or a number', () => {
      expect(() => item({ node, type, data: true })).toThrow(
        'Data type must be a string or a number'
      );
    });

    test('should return an object', () => {
      expect(typeof item({ node, data, type })).toBe('object');
    });

    test('should assign a random node id using the tenant id if none is provided', () => {
      var actual = item({ data: 1, type: 'Number' });
      expect(!!actual.Node).toBe(true);
      expect(actual.Node.indexOf(tenant) > -1).toBe(true);
    });

    test('should apply an empty value to tenant if it is undefined', () => {
      var item = itemFactory(Object.assign({}, config, { tenant: undefined }));

      expect(item({ node, data, type }).Node).toEqual(node);
    });

    test('should apply the tenant value to the Node, GSIK, and TGSIK', () => {
      var options = { data, type };
      var actual = item(options);
      expect(actual.Node.indexOf(tenant) === 0).toBe(true);
      expect(actual.GSIK.indexOf(tenant) === 0).toBe(true);
      expect(actual.TGSIK.indexOf(tenant) === 0).toBe(true);
    });

    test('should target itself', () => {
      var options = { node, data, type };
      var actual = item(options);
      expect(actual.Node === actual.Target).toBe(true);
    });

    test('should return a valid Node object if data is a string', () => {
      var options = { node, data, type };
      var config = Object.assign({}, options, { maxGSIK, tenant });
      expect(item(options)).toEqual({
        Node: node,
        Type: type,
        Target: node,
        String: data,
        GSIK: utils.calculateGSIK(config),
        TGSIK: utils.calculateTGSIK(config)
      });
    });

    test('should return a valid Node object if data is a number', () => {
      var data = 4;
      var options = { node, data, type };
      var config = Object.assign({}, options, { maxGSIK, tenant });
      expect(item(options)).toEqual({
        Node: node,
        Type: type,
        Target: node,
        Number: data,
        GSIK: utils.calculateGSIK(config),
        TGSIK: utils.calculateTGSIK(config)
      });
    });
  });
});
