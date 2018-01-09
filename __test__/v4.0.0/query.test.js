'use strict';

var cuid = require('cuid');
var sinon = require('sinon');
var queryFactory = require('../../src/query.js');
var utils = require('../../src/modules/utils.js');

var COMMON_OPERATORS = ['=', '<', '>', '<=', '>='];

var maxGSIK = 10;
var tenant = cuid();
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

  var query = queryFactory({ documentClient, table, tenant, maxGSIK });

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
      expect(() => query({ where: { type: { containing: 'test' } } })).toThrow(
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
      ).toThrow('Value is not a list of strings');
      expect(() =>
        query({
          where: { type: { [operator]: [Math.random(), Math.random()] } }
        })
      ).toThrow('Value is not a list of strings');
      expect(() =>
        query({
          where: { type: { [operator]: [cuid(), cuid()] } }
        })
      ).not.toThrow('Value is not a list of strings');
    });

    test('should query over the table indexed by type if the `node` attribute is defined, and the `where` attribute points to the type', () => {
      var string = cuid();
      var array = [cuid(), cuid()];
      var operator = pickOne(utils._operators);
      if (
        operator === 'BETWEEN' ||
        operator === 'begins_with' ||
        operator === 'contains' ||
        operator === 'size' ||
        operator === 'IN'
      )
        operator = '=';
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
              ':Node': utils.prefixTenant(tenant, node),
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
              ':Node': utils.prefixTenant(tenant, node),
              ':a': array[0],
              ':b': array[1]
            }
          });
          return query({ node, where: { type: { [operator]: string } } });
        })
        .then(() => {
          expect(documentClient.query.args[2][0]).toEqual({
            TableName: table,
            KeyConditionExpression: `#Node = :Node AND #Type ${operator} :Type`,
            ExpressionAttributeNames: {
              '#Node': 'Node',
              '#Type': 'Type'
            },
            ExpressionAttributeValues: {
              ':Node': utils.prefixTenant(tenant, node),
              ':Type': string
            }
          });
          documentClient.query.restore();
        });
    });

    test('should throw an error if the `node` and `where` attributes are defined, but the `filter` attribute is not an object', () => {
      expect(() =>
        query({ node, where: { type: { '=': cuid() } }, filter: false })
      ).toThrow('Filter is not an object');
    });

    test('should query over the table indexed by type if the `node` attribute is defined, the `where` attribute points to the type, and the `filter` attribute points to the data', () => {
      var string = cuid();
      var dstring = cuid();
      var array = [cuid(), cuid()];
      var darray = [cuid(), cuid(), cuid()];
      var operator = pickOne(utils._operators);
      var doperator = pickOne(utils._operators);
      if (
        operator === 'BETWEEN' ||
        operator === 'begins_with' ||
        operator === 'contains' ||
        operator === 'size' ||
        operator === 'IN'
      )
        operator = '=';
      if (
        doperator === 'BETWEEN' ||
        doperator === 'begins_with' ||
        doperator === 'contains' ||
        doperator === 'size' ||
        doperator === 'IN'
      )
        doperator = '=';
      sinon.spy(documentClient, 'query');
      return query({
        node,
        where: { type: { begins_with: string } },
        filter: { data: { begins_with: dstring } }
      })
        .then(() => {
          expect(documentClient.query.args[0][0]).toEqual({
            TableName: table,
            KeyConditionExpression: `#Node = :Node AND begins_with(#Type, :Type)`,
            ExpressionAttributeNames: {
              '#Node': 'Node',
              '#Type': 'Type',
              '#Data': 'Data'
            },
            ExpressionAttributeValues: {
              ':Node': utils.prefixTenant(tenant, node),
              ':Type': string,
              ':Data': dstring
            },
            FilterExpression: `begins_with(#Data, :Data)`
          });
          return query({
            node,
            where: { type: { BETWEEN: array } },
            filter: { data: { IN: darray } }
          });
        })
        .then(() => {
          expect(documentClient.query.args[1][0]).toEqual({
            TableName: table,
            KeyConditionExpression: `#Node = :Node AND #Type BETWEEN :a AND :b`,
            ExpressionAttributeNames: {
              '#Node': 'Node',
              '#Type': 'Type',
              '#Data': 'Data'
            },
            ExpressionAttributeValues: {
              ':Node': utils.prefixTenant(tenant, node),
              ':a': array[0],
              ':b': array[1],
              ':x0': darray[0],
              ':x1': darray[1],
              ':x2': darray[2]
            },
            FilterExpression: `#Data IN :x0, :x1, :x2`
          });
          return query({
            node,
            where: { type: { [operator]: string } },
            filter: { data: { [doperator]: dstring } }
          });
        })
        .then(() => {
          expect(documentClient.query.args[2][0]).toEqual({
            TableName: table,
            KeyConditionExpression: `#Node = :Node AND #Type ${operator} :Type`,
            ExpressionAttributeNames: {
              '#Node': 'Node',
              '#Type': 'Type',
              '#Data': 'Data'
            },
            ExpressionAttributeValues: {
              ':Node': utils.prefixTenant(tenant, node),
              ':Type': string,
              ':Data': dstring
            },
            FilterExpression: `#Data ${doperator} :Data`
          });
          documentClient.query.restore();
          //return query({ node, where: { type: { BETWEEN: array } } });
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
