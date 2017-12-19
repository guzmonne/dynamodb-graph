'use strict';

var cuid = require('cuid');
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

describe('#_hashCode()', () => {
  var string = 'Test Me';

  test('should return a number', () => {
    expect(typeof utils.hashCode(string)).toEqual('number');
  });

  test('should return 0 if given an empty string or undefined', () => {
    expect(utils.hashCode()).toEqual(0);
    expect(utils.hashCode('')).toEqual(0);
  });

  test('should return the same hash for the same string', () => {
    var first = utils.hashCode(string);
    var second = utils.hashCode(string);
    expect(first).toEqual(second);
  });
});

describe('#_calculateGSIK()', () => {
  var tenant = cuid();
  var node = cuid();

  test('should throw an error if `node` is undefined', () => {
    expect(() => utils.calculateGSIK()).toThrow('Node is undefined');
  });

  test('should return a string', () => {
    expect(typeof utils.calculateGSIK({ tenant, node })).toEqual('string');
  });

  test('should end with #0 if the maxGSIK value is undefined or less than 2', () => {
    expect(utils.calculateGSIK({ tenant, node }).indexOf('#0') > -1).toBe(true);
    expect(utils.calculateGSIK({ tenant, node }).indexOf('#0') > -1).toBe(true);
  });

  test('should end with a # plus a number between 0 and maxGSIK', () => {
    var maxGSIK = Math.floor(Math.random() * 4) + 2;
    var gsik = utils.calculateGSIK({ tenant, node, maxGSIK });
    expect(gsik.indexOf('#' + gsik[gsik.length - 1]) > -1).toBe(true);
  });
});

describe('#_parseResponseItemsData', () => {
  var response = {
    Items: [
      { Data: JSON.stringify(true) },
      { Data: JSON.stringify(123) },
      {
        Data: JSON.stringify('text')
      },
      {
        Data: JSON.stringify([1, true, 'string'])
      }
    ]
  };

  test('should return another response object with parsed data items', () => {
    var actual = utils.parseResponseItemsData(response);
    var expected = {
      Items: [
        { Data: true },
        { Data: 123 },
        {
          Data: 'text'
        },
        {
          Data: [1, true, 'string']
        }
      ]
    };
    expect(actual).toEqual(expected);
  });
});
