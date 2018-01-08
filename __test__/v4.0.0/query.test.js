'use strict';

var cuid = require('cuid');
var sinon = require('sinon');
var queryFactory = require('../../src/query.js');
var utils = require('../../src/modules/utils.js');

var COMMON_OPERATORS = ['=', '<', '>', '<=', '>='];

var table = 'GraphTable';
var documentClient = {
  query: params => ({
    promise: () => {
      return Promise.resolve({
        Items: []
      });
    }
  })
};
var node = cuid();

describe('queryFactory()', () => {
  test('should be a function', () => {
    expect(typeof queryFactory).toEqual('function');
  });

  test('should return a function', () => {
    expect(typeof queryFactory()).toEqual('function');
  });

  var query = queryFactory({ documentClient, table });

  describe('#query()', () => {
    test('should throw if `where` is not defined', () => {
      expect(() => query()).toThrow('Where is undefined');
    });

    test('should fail if an invalid `where` attribute is used', () => {
      expect(() => query({ where: { error: true } })).toThrow(
        'Invalid attributes'
      );
    });

    test('should fail if an invalid `where` attribute operator is used', () => {
      expect(() => query({ where: { type: { contains: 'test' } } })).toThrow(
        'Invalid operator'
      );
    });

    test('should fail if the `where` attribute value is undefined', () => {
      expect(() =>
        query({ where: { type: { begins_with: undefined } } })
      ).toThrow('Value is undefined');
    });

    test('should fail if the `where` attribute value is not a string for a common operator', () => {
      var operator = pickOne(COMMON_OPERATORS);
      expect(() =>
        query({ where: { type: { [operator]: Math.random() } } })
      ).toThrow('Value is not a string');
    });

    test('should fail if the `where` attribute value is not an array of strings when using a `BETWEEN` operator', () => {
      var operator = 'BETWEEN';
      expect(() =>
        query({ where: { type: { [operator]: Math.random() } } })
      ).toThrow('Value is not a list with a pair of strings');
      expect(() =>
        query({
          where: { type: { [operator]: [Math.random(), Math.random()] } }
        })
      ).toThrow('Value is not a list with a pair of strings');
      expect(() =>
        query({
          where: { type: { [operator]: [cuid(), cuid(), cuid()] } }
        })
      ).toThrow('Value is not a list with a pair of strings');
      expect(() =>
        query({
          where: { type: { [operator]: [cuid(), cuid()] } }
        })
      ).not.toThrow('Value is not a list with a pair of strings');
    });

    test('should query over the table indexed by type, if the `node` attribute is defined, and the `where` attribute points to the type', () => {
      var string = cuid();
      var array = [cuid(), cuid()];
      sinon.spy(documentClient, 'query');
      return query({ node, where: { type: { begins_with: string } } })
        .then(() => {
          expect(documentClient.query.args[0][0]).toEqual({
            TableName: table,
            KeyConditionExpression: `#Node = :Node AND begins_with(#Type, :Type)`,
            ExpressionAttributeNames: {
              '#Node': 'Node',
              '#Type': 'Type'
            },
            ExpressionAttributeValues: {
              ':Node': node,
              ':Type': string
            }
          });
          return query({ node, where: { type: { BETWEEN: array } } });
        })
        .then(() => {
          expect(documentClient.query.args[1][0]).toEqual({
            TableName: table,
            KeyConditionExpression: `#Node = :Node AND #Type BETWEEN :a AND :b`,
            ExpressionAttributeNames: {
              '#Node': 'Node',
              '#Type': 'Type'
            },
            ExpressionAttributeValues: {
              ':Node': node,
              ':a': array[0],
              ':b': array[1]
            }
          });
          documentClient.query.restore();
        });
    });
  });
});

function pickOne(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function promiseItems(items, count) {
  return {
    promise: () => {
      return Promise.resolve({
        Items: items,
        Count: items.length,
        ScannedCount: count || items.length
      });
    }
  };
}

var result = [
  {
    Node: node,
    Type: 'Line#265#Episode#32',
    Data: "Bart didn't get one vote?! Oh, this is...",
    GSIK: '9',
    Target: 'Line#9605'
  },
  {
    Node: node,
    Type: 'Line#114#Episode#33',
    Data: 'Marge! What are you doing?...',
    GSIK: '9',
    Target: 'Line#9769'
  }
];
