'use strict';

var cuid = require('cuid');
var utils = require('../../src/modules/utils.js');
var itemFactory = require('../../src/property/item.js');

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
    test('should throw an error if Node is undefined', () => {
      expect(() => item()).toThrow('Node is undefined');
    });

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

    test('should apply an empty value to tenant if it is undefined', () => {
      var item = itemFactory(Object.assign({}, config, { tenant: undefined }));

      expect(item({ node, data, type }).Node).toEqual(node);
    });

    test('should apply the tenant value to the Node, GSIK, and TGSIK', () => {
      var options = { node, data, type };
      var actual = item(options);
      expect(actual.Node.indexOf(tenant) === 0).toBe(true);
      expect(actual.GSIK.indexOf(tenant) === 0).toBe(true);
      expect(actual.TGSIK.indexOf(tenant) === 0).toBe(true);
    });

    test('should not contain a target', () => {
      var options = { node, data, type };
      var actual = item(options);
      expect(actual.Target).toBe(undefined);
    });

    test('should return a valid Node object if data is a string', () => {
      var options = { node, data, type };
      var config = Object.assign({}, options, { maxGSIK, tenant });
      expect(item(options)).toEqual({
        Node: tenant + '#' + node,
        Type: type,
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
        Node: tenant + '#' + node,
        Type: type,
        Number: data,
        GSIK: utils.calculateGSIK(config),
        TGSIK: utils.calculateTGSIK(config)
      });
    });
  });
});