'use strict';

var dynamodbGraph = require('../../src/index.js');

describe('dynamodbGraph', () => {
  var documentClient = {};
  var table = 'GraphTable';

  test('should be a function', () => {
    expect(typeof dynamodbGraph).toEqual('function');
  });

  test('should have configured the current library version', () => {
    dynamodbGraph({ documentClient, table });
    expect(dynamodbGraph.VERSION).toEqual('4.0.0');
  });

  test('should throw if `documentClient` is undefined', () => {
    expect(() => dynamodbGraph()).toThrow(
      'DynamoDB DocumentClient driver is undefined'
    );
  });

  test('should throw if `table` is undefined', () => {
    expect(() => dynamodbGraph({ documentClient })).toThrow(
      'Table is undefined'
    );
  });

  test('should define `dynamodbGraph._maxGSIK` value to 10 if none is provided', () => {
    dynamodbGraph({ documentClient, table });
    expect(dynamodbGraph._maxGSIK).toEqual(10);
  });

  test('should define `dynamodbGraph._tenant` value to an empty string if none is provided', () => {
    dynamodbGraph({ documentClient, table });
    expect(dynamodbGraph._tenant).toEqual('');
  });

  test('should define `dynamodbGraph._table` value to the provided table value', () => {
    dynamodbGraph({ documentClient, table });
    expect(dynamodbGraph._table).toEqual(table);
  });

  test('should be an object', () => {
    expect(typeof dynamodbGraph({ documentClient, table })).toEqual('object');
  });

  describe('#g.node', () => {
    var g = dynamodbGraph({ documentClient, table });

    test('should be a function', () => {
      expect(typeof g.node).toEqual('function');
    });
  });
});
