'use strict';

var utils = require('../src/modules/utils.js');

describe('#utils.randomMac', () => {
  test('should return a string', () => {
    expect(typeof utils.randomMac()).toEqual('string');
  });

  test('should return a valid MAC address', () => {
    var regex = /^([0-9a-f]{2}:|-){5}([0-9a-f]{2})$/;
    expect(regex.test(utils.randomMac())).toBe(true);
  });
});
