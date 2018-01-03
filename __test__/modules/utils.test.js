'use strict';

var cuid = require('cuid');
var utils = require('../../src/modules/utils.js');

describe('#checkConfiguration', () => {
  var maxGSIK = 10;

  test('should be a function', () => {
    expect(typeof utils.checkConfiguration).toEqual('function');
  });

  test('should throw an error if `maxGSIK` is undefined', () => {
    expect(() => utils.checkConfiguration()).toThrow('Max GSIK is undefined');
  });

  test('should throw an error if `documentClient` is undefined', () => {
    expect(() => utils.checkConfiguration({ maxGSIK })).toThrow(
      'DocumentClient is undefined'
    );
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

describe('#calculateGSIK()', () => {
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

describe('#parseResponseItemsData', () => {
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

describe('#parseItem()', () => {
  test('should be a function', () => {
    expect(typeof utils.parseItem).toBe('function');
  });

  test('should return a new object with default Data property', () => {
    expect(utils.parseItem()).toEqual({ Data: '' });
  });

  test('should transform a `String` or `Number` property into a `Data` property', () => {
    var string = cuid();
    var number = Math.random();
    expect(utils.parseItem({ String: string })).toEqual({ Data: string });
    expect(utils.parseItem({ Number: number })).toEqual({ Data: number });
  });
});

describe('#parseWhere', () => {
  test('should be a function', () => {
    expect(typeof utils.parseWhere).toEqual('function');
  });

  test('should fail if `data` and `type` is undefined', () => {
    expect(() => utils.parseWhere()).toThrow('Invalid attribute');
  });

  test('should fail if the attribute operator is invalid', () => {
    expect(() => utils.parseWhere({ data: { o: true } })).toThrow(
      'Invalid operator'
    );
  });

  test('should fail if the attribute operator value is undefined', () => {
    expect(() => utils.parseWhere({ data: { '=': undefined } })).toThrow(
      'Value is undefined'
    );
  });

  test('should return the attribute, the expression, and the value, if the attribute is `type`', () => {
    var operator =
      utils._operators[Math.floor(Math.random() * utils._operators.length)];
    var attribute = 'type';
    var value =
      operator === 'BETWEEN' ? [Math.random(), Math.random()] : cuid();

    var actual = utils.parseWhere({ [attribute]: { [operator]: value } });

    expect(actual).toEqual({
      attribute,
      expression:
        operator === 'BEGINS_WITH'
          ? `BEGINS_WITH(#Type, :Type)`
          : Array.isArray(value)
            ? '#Type BETWEEN :a AND :b'
            : `#Type ${operator} :Type`,
      value,
      operator
    });
  });

  test('should return the attribute, the expression, and the value, if the attribute is `data` and value is a string', () => {
    var operator =
      utils._operators[Math.floor(Math.random() * utils._operators.length)];
    var attribute = 'data';
    var value = operator === 'BETWEEN' ? [cuid(), cuid()] : cuid();

    var actual = utils.parseWhere({ [attribute]: { [operator]: value } });

    expect(actual).toEqual({
      attribute,
      expression: Array.isArray(value)
        ? '#String BETWEEN :a AND :b'
        : `#String ${operator} :String`,
      value,
      operator
    });
  });

  test('should return the attribute, the expression, and the value, if the attribute is `data` and value is a number', () => {
    var operator =
      utils._operators[Math.floor(Math.random() * utils._operators.length)];
    var attribute = 'data';
    var value =
      operator === 'BETWEEN' ? [Math.random(), Math.random()] : Math.random();

    var actual = utils.parseWhere({ [attribute]: { [operator]: value } });

    expect(actual).toEqual({
      attribute,
      expression: Array.isArray(value)
        ? '#Number BETWEEN :a AND :b'
        : `#Number ${operator} :Number`,
      value,
      operator
    });
  });
});
