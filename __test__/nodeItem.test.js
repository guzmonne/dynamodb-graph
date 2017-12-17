'use strict';

var cuid = require('cuid');
var nodeItem = require('../src/nodeItem.js');
var utils = require('../src/modules/utils.js');

describe('#nodeItem()', () => {
  var tenant = cuid();

  test('should return a correctly build NodeItem', () => {
    var maxGSIK = 10;
    var actual = nodeItem({
      tenant,
      type: 'Test',
      data: 123,
      maxGSIK
    });
    var node = actual.Node;
    var gsik = utils.calculateGSIK({ node, maxGSIK });
    expect(actual).toEqual({
      Node: node,
      Data: JSON.stringify(123),
      Type: 'Test',
      Target: node,
      GSIK: gsik,
      MaxGSIK: maxGSIK
    });
  });

  test('should throw an error if the type is not defined', () => {
    expect(() => nodeItem({ data: 'test' })).toThrow('Type is undefined');
  });

  test('should throw an error if the data is not defined', () => {
    expect(() => nodeItem({ type: 'test' })).toThrow('Data is undefined');
  });

  test('should contain the tenant id on its node, unless the node is defined', () => {
    var withoutNode = nodeItem({
      tenant,
      type: 'Test',
      data: 123
    });
    var withNode = nodeItem({
      node: tenant,
      type: 'Test',
      data: 123
    });
    expect(withoutNode.Node.indexOf(tenant) > -1).toBe(true);
    expect(withNode.Node).toEqual(tenant);
  });
});
