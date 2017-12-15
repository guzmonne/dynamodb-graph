// @ts-nocheck
'use strict';

var cuid = require('cuid');
var g = require('../src/index.js');

describe('#nodeItem()', () => {
  var tenant = cuid();

  test('should return a correctly build NodeItem', () => {
    var actual = g.nodeItem({
      tenant,
      type: 'Test',
      data: 123
    });
    expect(actual.Node).toBeDefined();
    expect(actual.Target).toEqual(actual.Node);
    expect(typeof actual.Data).toEqual('string');
  });

  test('should throw an error if the type is not defined', () => {
    expect(() => g.nodeItem({ data: 'test' })).toThrow('Type is undefined');
  });

  test('should throw an error if the data is not defined', () => {
    expect(() => g.nodeItem({ type: 'test' })).toThrow('Data is undefined');
  });

  test('should contain the tenant id on its node, unless the node is defined', () => {
    var withoutNode = g.nodeItem({
      tenant,
      type: 'Test',
      data: 123
    });
    var withNode = g.nodeItem({
      node: tenant,
      type: 'Test',
      data: 123
    });
    expect(withoutNode.Node.indexOf(tenant) > -1).toBe(true);
    expect(withNode.Node).toEqual(tenant);
  });
});

describe('#edgeItem()', () => {
  test('should return an EdgeItem', () => {
    var node = cuid(),
      target = cuid();
    var actual = g.edgeItem({
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
    expect(() => g.edgeItem({ node, target, data })).toThrow(
      'Type is undefined'
    );
  });

  test('should throw an error if the data is not defined', () => {
    expect(() => g.edgeItem({ node, target, type })).toThrow(
      'Data is undefined'
    );
  });

  test('should throw an error if the node is not defined', () => {
    expect(() => g.edgeItem({ target, type, data })).toThrow(
      'Node is undefined'
    );
  });

  test('should throw an error if the target is not defined', () => {
    expect(() => g.edgeItem({ node, type, data })).toThrow(
      'Target is undefined'
    );
  });
});

describe('#createNode()', () => {
  var db = function() {
    return {
      put: params => ({ promise: () => Promise.resolve(params) })
    };
  };
  var table = 'ExampleTable';

  test('should return a function', () => {
    var actual = g.createNode(db(), table);
    expect(typeof actual).toEqual('function');
  });

  test('should build valid DynamoDB put params object', done => {
    var actual = g.createNode(db(), table);
    var node = cuid(),
      type = 'Node',
      data = 'test';
    actual({ node, type, data, maxGSIK: 0 }).then(params => {
      expect(params).toEqual({
        TableName: table,
        Item: {
          Node: node,
          Type: type,
          Data: JSON.stringify(data),
          Target: node,
          GSIK: 1
        }
      });
      done();
    });
  });
});
