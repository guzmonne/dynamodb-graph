'use strict';

var sinon = require('sinon');
var cuid = require('cuid');
var utils = require('../../src/modules/utils.js');
var nodeFactory = require('../../src/node/');

describe('nodeFactory', () => {
  beforeEach(() => {
    sinon.spy(utils, 'checkConfiguration');
  });

  afterEach(() => {
    utils.checkConfiguration.restore();
  });

  var maxGSIK = 10;
  var tenant = cuid();
  var documentClient = {};

  test('should be a function', () => {
    expect(typeof nodeFactory).toEqual('function');
  });

  test('should call the utils.checkConfiguration function', () => {
    nodeFactory({ documentClient, maxGSIK, tenant });
    expect(utils.checkConfiguration.callCount).toBe(2);
  });

  test('should return an object', () => {
    var actual = nodeFactory({ documentClient, maxGSIK, tenant });
    expect(typeof actual).toEqual('object');
  });

  describe('node.item()', () => {
    test('should be a function', () => {
      var node = nodeFactory({ documentClient, maxGSIK, tenant });

      expect(typeof node.item).toEqual('function');
    });
  });
});
