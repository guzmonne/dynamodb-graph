'use strict';

var cuid = require('cuid');
var edgeItem = require('../src/edgeItem.js');

describe('#edgeItem()', () => {
  test('should return an EdgeItem', () => {
    var node = cuid(),
      target = cuid();
    var actual = edgeItem({
      node,
      target,
      type: 'Edge',
      data: 'test'
    });
    expect(actual.Node).toEqual(node);
    expect(actual.Target).toEqual(target);
    expect(typeof actual.Data).toEqual('string');
  });

  var node = cuid();
  var target = cuid();
  var type = 'edge';
  var data = 'test';

  test('should throw an error if the type is not defined', () => {
    expect(() => edgeItem({ node, target, data })).toThrow('Type is undefined');
  });

  test('should throw an error if the data is not defined', () => {
    expect(() => edgeItem({ node, target, type })).toThrow('Data is undefined');
  });

  test('should throw an error if the node is not defined', () => {
    expect(() => edgeItem({ target, type, data })).toThrow('Node is undefined');
  });

  test('should throw an error if the target is not defined', () => {
    expect(() => edgeItem({ node, type, data })).toThrow('Target is undefined');
  });
});
