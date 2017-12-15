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
    expect(typeof actual.data).toEqual('string');
  });
});
