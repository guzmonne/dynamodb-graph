'use strict';

var cuid = require('cuid');
var propertyItem = require('../src/propertyItem.js');
var utils = require('../src/modules/utils.js');

describe('#propertyItem()', () => {
  test('should return a PropertyItem', () => {
    var node = cuid();
    var actual = propertyItem({
      node,
      type: 'Property',
      data: 'test',
      gsik: 1
    });
    expect(actual.Node).toEqual(node);
    expect(actual.Type).toEqual('Property');
    expect(typeof actual.Data).toEqual('string');
  });

  var node = cuid();
  var type = 'property';
  var data = 'test';

  test('should throw an error if the type is not defined', () => {
    expect(() => propertyItem({ node, data })).toThrow('Type is undefined');
  });

  test('should throw an error if the data is not defined', () => {
    expect(() => propertyItem({ node, type })).toThrow('Data is undefined');
  });

  test('should throw an error if the node is not defined', () => {
    expect(() => propertyItem({ type, data })).toThrow('Node is undefined');
  });
});
