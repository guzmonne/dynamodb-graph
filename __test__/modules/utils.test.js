'use strict';

var cuid = require('cuid');
var range = require('lodash/range');
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

  test('should return just a number stringified if the `tenant` is undefined or empty', () => {
    expect(utils.calculateGSIK({ tenant: undefined, node })).toEqual('0');
  });

  test('should end with |0 if the maxGSIK value is undefined, or less than 2', () => {
    expect(utils.calculateGSIK({ tenant, node }).indexOf('|0') > -1).toBe(true);
    expect(
      utils.calculateGSIK({ tenant, node, maxGSIK: 0 }).indexOf('|0') > -1
    ).toBe(true);
    expect(
      utils.calculateGSIK({ tenant, node, maxGSIK: 1 }).indexOf('|0') > -1
    ).toBe(true);
  });

  test('should end with a | plus a number between 0 and maxGSIK', () => {
    var maxGSIK = Math.floor(Math.random() * 10) + 10;
    expect(
      range(0, maxGSIK).every(
        i =>
          utils.calculateGSIK({ tenant, node, maxGSIK }).indexOf('|' + i) === -1
      )
    ).toBe(false);
  });
});

describe('#parseItem()', () => {
  test('should be a function', () => {
    expect(typeof utils.parseItem).toBe('function');
  });

  test('should remove the `tenant` value from the `Node`, `GSIK`, and `Target` attributes', () => {
    var tenant = cuid();
    var node = cuid();
    var target = cuid();
    var data = cuid();
    var type = cuid();
    var Item = {
      Node: utils.prefixTenant(tenant, node),
      Type: type,
      Data: data,
      Target: utils.prefixTenant(tenant, target),
      GSIK: utils.calculateGSIK({ node, tenant })
    };
    utils.parseItem({ Item });
    expect(utils.parseItem({ Item })).toEqual({
      Item: {
        Node: node,
        Type: type,
        Data: data,
        Target: target,
        GSIK: '0'
      }
    });
  });

  test('should not modify the item is a `tenant` was not used', () => {
    var tenant = '';
    var node = cuid();
    var target = cuid();
    var data = cuid();
    var type = cuid();
    var Item = {
      Node: utils.prefixTenant(tenant, node),
      Type: type,
      Data: data,
      Target: utils.prefixTenant(tenant, target),
      GSIK: utils.calculateGSIK({ node, tenant })
    };
    var expected = Object.assign({}, Item);
    utils.parseItem({ Item });
    expect(Item).toEqual(expected);
  });
});

describe('#parseConditionObject', () => {
  test('should be a function', () => {
    expect(typeof utils.parseConditionObject).toEqual('function');
  });

  test('should fail if `data` and `type` is undefined', () => {
    expect(() => utils.parseConditionObject()).toThrow('Invalid attribute');
  });

  test('should fail if the attribute operator is invalid', () => {
    expect(() => utils.parseConditionObject({ data: { o: true } })).toThrow(
      'Invalid operator'
    );
  });

  test('should fail if the attribute operator value is undefined', () => {
    expect(() =>
      utils.parseConditionObject({ data: { '=': undefined } })
    ).toThrow('Value is undefined');
  });

  test('should return the attribute, the expression, and the value, if the attribute is `type`', () => {
    var operator = pickOne(utils._operators);
    var attribute = 'type';
    var value = operator === 'BETWEEN' ? [cuid(), cuid()] : cuid();

    if (operator === 'IN') value = [cuid(), cuid(), cuid()];

    var actual = utils.parseConditionObject({
      [attribute]: { [operator]: value }
    });
    var expression = `#Type ${operator} :Type`;

    if (operator === 'begins_with') expression = `begins_with(#Type, :Type)`;
    if (operator === 'contains') expression = `contains(#Type, :Type)`;
    if (operator === 'size') expression = `size(#Type) = :Type`;
    if (operator === 'BETWEEN') expression = '#Type BETWEEN :a AND :b';
    if (operator === 'IN') expression = '#Type IN :x0, :x1, :x2';

    expect(actual).toEqual({
      attribute,
      expression,
      value,
      operator
    });
  });

  test('should return the attribute, the expression, and the value, if the attribute is `data`', () => {
    var operator = pickOne(utils._operators);
    var attribute = 'data';
    var value = operator === 'BETWEEN' ? [cuid(), cuid()] : cuid();

    if (operator === 'IN') value = [cuid(), cuid(), cuid()];

    var actual = utils.parseConditionObject({
      [attribute]: { [operator]: value }
    });
    var expression = `#Data ${operator} :Data`;

    if (operator === 'begins_with') expression = `begins_with(#Data, :Data)`;
    if (operator === 'contains') expression = `contains(#Data, :Data)`;
    if (operator === 'size') expression = `size(#Data) = :Data`;
    if (operator === 'BETWEEN') expression = '#Data BETWEEN :a AND :b';
    if (operator === 'IN') expression = '#Data IN :x0, :x1, :x2';

    expect(actual).toEqual({
      attribute,
      expression,
      value,
      operator
    });
  });
});

describe('#prefixTenant', () => {
  test('should be a function', () => {
    expect(typeof utils.prefixTenant).toEqual('function');
  });

  var string = cuid();

  test('should return the string if tenant is undefined', () => {
    expect(utils.prefixTenant(undefined, string)).toEqual(string);
  });

  var tenant = cuid();

  test('should prefix the tenant to the string if it is defined', () => {
    expect(utils.prefixTenant(tenant, string)).toEqual(tenant + '|' + string);
  });

  test('should return just the string if the tenant is empty', () => {
    expect(utils.prefixTenant('', string)).toEqual(string);
  });

  test('should return a function if the string is undefined', () => {
    expect(typeof utils.prefixTenant(tenant)).toEqual('function');
  });

  test('should return a function that returns the prefixed string', () => {
    expect(utils.prefixTenant(tenant)(string)).toEqual(tenant + '|' + string);
    expect(utils.prefixTenant('')(string)).toEqual(string);
  });
});

function pickOne(list) {
  return list[Math.floor(Math.random() * list.length)];
}
