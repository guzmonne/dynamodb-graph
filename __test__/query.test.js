'use strict';

var cuid = require('cuid');
var sinon = require('sinon');
var range = require('lodash/range');
var queryFactory = require('../src/query.js');
var utils = require('../src/modules/utils.js');

var COMMON_OPERATORS = ['=', '<', '>', '<=', '>='];

var maxGSIK = 10;
var tenant = cuid();
var prefixTenant = utils.prefixTenant(tenant);
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

    beforeEach(() => {
      sinon.spy(documentClient, 'query');
    });

    afterEach(() => {
      documentClient.query.restore();
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
        });
    });

    test('should query by GSIK when `node` is undefined', () => {
      var type = cuid();
      return query({ where: { type: { '=': type } } }).then(() => {
        expect(documentClient.query.args[0][0]).toEqual({
          TableName: table,
          IndexName: 'ByType',
          KeyConditionExpression: `#GSIK = :GSIK AND #Type = :Type`,
          ExpressionAttributeNames: {
            '#GSIK': 'GSIK',
            '#Type': 'Type'
          },
          ExpressionAttributeValues: {
            ':GSIK': prefixTenant('0'),
            ':Type': type
          },
          Limit: 100
        });
        expect(documentClient.query.args[9][0]).toEqual({
          TableName: table,
          IndexName: 'ByType',
          KeyConditionExpression: `#GSIK = :GSIK AND #Type = :Type`,
          ExpressionAttributeNames: {
            '#GSIK': 'GSIK',
            '#Type': 'Type'
          },
          ExpressionAttributeValues: {
            ':GSIK': prefixTenant('9'),
            ':Type': type
          },
          Limit: 100
        });
      });
    });

    test('should allow to filter the query response using the `filter` attribute', () => {
      var type = cuid();
      var filter = cuid();
      return query({
        where: { type: { '=': type } },
        filter: { data: { '>': filter } }
      }).then(() => {
        expect(documentClient.query.args[0][0]).toEqual({
          TableName: table,
          IndexName: 'ByType',
          KeyConditionExpression: `#GSIK = :GSIK AND #Type = :Type`,
          ExpressionAttributeNames: {
            '#GSIK': 'GSIK',
            '#Type': 'Type',
            '#Data': 'Data'
          },
          ExpressionAttributeValues: {
            ':GSIK': prefixTenant('0'),
            ':Type': type,
            ':Data': filter
          },
          Limit: 100,
          FilterExpression: '#Data > :Data'
        });
        expect(documentClient.query.args[9][0]).toEqual({
          TableName: table,
          IndexName: 'ByType',
          KeyConditionExpression: `#GSIK = :GSIK AND #Type = :Type`,
          ExpressionAttributeNames: {
            '#GSIK': 'GSIK',
            '#Type': 'Type',
            '#Data': 'Data'
          },
          ExpressionAttributeValues: {
            ':GSIK': prefixTenant('9'),
            ':Type': type,
            ':Data': filter
          },
          Limit: 100,
          FilterExpression: '#Data > :Data'
        });
      });
    });

    test('should allow one level logical operations on the `filter` attribute', () => {
      var type = cuid();
      var filter = cuid();
      return query({
        where: { type: { '=': type } },
        filter: {
          data: { '>': filter },
          and: { type: { begins_with: 'c' } }
        }
      })
        .then(() => {
          expect(documentClient.query.args[0][0]).toEqual({
            TableName: table,
            IndexName: 'ByType',
            KeyConditionExpression: `#GSIK = :GSIK AND #Type = :Type`,
            ExpressionAttributeNames: {
              '#GSIK': 'GSIK',
              '#Type': 'Type',
              '#Data': 'Data'
            },
            ExpressionAttributeValues: {
              ':GSIK': prefixTenant('0'),
              ':Type': type,
              ':Data': filter,
              ':y1': 'c'
            },
            Limit: 100,
            FilterExpression: '#Data > :Data AND begins_with(#Type, :y1)'
          });
          expect(documentClient.query.args[9][0]).toEqual({
            TableName: table,
            IndexName: 'ByType',
            KeyConditionExpression: `#GSIK = :GSIK AND #Type = :Type`,
            ExpressionAttributeNames: {
              '#GSIK': 'GSIK',
              '#Type': 'Type',
              '#Data': 'Data'
            },
            ExpressionAttributeValues: {
              ':GSIK': prefixTenant('9'),
              ':Type': type,
              ':Data': filter,
              ':y1': 'c'
            },
            Limit: 100,
            FilterExpression: '#Data > :Data AND begins_with(#Type, :y1)'
          });
          return query({
            where: { data: { '=': filter } },
            filter: {
              type: { '>': type },
              and: { type: { IN: ['c', 'd'] } }
            }
          });
        })
        .then(() => {
          expect(documentClient.query.args[10][0]).toEqual({
            TableName: table,
            IndexName: 'ByData',
            KeyConditionExpression: `#GSIK = :GSIK AND #Data = :Data`,
            ExpressionAttributeNames: {
              '#GSIK': 'GSIK',
              '#Type': 'Type',
              '#Data': 'Data'
            },
            ExpressionAttributeValues: {
              ':GSIK': prefixTenant('0'),
              ':y10': 'c',
              ':y11': 'd',
              ':Type': type,
              ':Data': filter
            },
            Limit: 100,
            FilterExpression: '#Type > :Type AND #Type IN :y10, :y11'
          });
          expect(documentClient.query.args[19][0]).toEqual({
            TableName: table,
            IndexName: 'ByData',
            KeyConditionExpression: `#GSIK = :GSIK AND #Data = :Data`,
            ExpressionAttributeNames: {
              '#GSIK': 'GSIK',
              '#Type': 'Type',
              '#Data': 'Data'
            },
            ExpressionAttributeValues: {
              ':GSIK': prefixTenant('9'),
              ':y10': 'c',
              ':y11': 'd',
              ':Type': type,
              ':Data': filter
            },
            Limit: 100,
            FilterExpression: '#Type > :Type AND #Type IN :y10, :y11'
          });
        });
    });

    test('should run between 0 and `maxGSIK` by default', () => {
      var maxGSIK = randomNumber(10, 100);
      var type = cuid();
      var query = queryFactory({ documentClient, table, tenant, maxGSIK });
      return query({ where: { type: { '=': type } } }).then(() => {
        for (let i = 0; i < maxGSIK; i++) {
          expect(documentClient.query.args[i][0]).toEqual({
            TableName: table,
            IndexName: 'ByType',
            KeyConditionExpression: `#GSIK = :GSIK AND #Type = :Type`,
            ExpressionAttributeNames: {
              '#GSIK': 'GSIK',
              '#Type': 'Type'
            },
            ExpressionAttributeValues: {
              ':GSIK': prefixTenant(`${i}`),
              ':Type': type
            },
            Limit: 100
          });
        }
      });
    });

    test('should run between `startGSIK`, and `maxGSIK` if the `startGSIK` is defined on the `gsik` object', () => {
      var startGSIK = randomNumber(5, 10);
      var type = cuid();
      return query({
        where: { type: { '=': type } },
        gsik: { startGSIK }
      }).then(() => {
        expect(documentClient.query.args.length).toEqual(maxGSIK - startGSIK);
        for (let i = 0; i < maxGSIK - startGSIK; i++) {
          expect(documentClient.query.args[i][0]).toEqual({
            TableName: table,
            IndexName: 'ByType',
            KeyConditionExpression: `#GSIK = :GSIK AND #Type = :Type`,
            ExpressionAttributeNames: {
              '#GSIK': 'GSIK',
              '#Type': 'Type'
            },
            ExpressionAttributeValues: {
              ':GSIK': prefixTenant(`${i + startGSIK}`),
              ':Type': type
            },
            Limit: 100
          });
        }
      });
    });

    test('should run between `startGSIK`, and `endGSIK` if the `startGSIK` and `endGSIK` values are defined on the `gsik` object', () => {
      var startGSIK = randomNumber(5, 10);
      var endGSIK = randomNumber(10, 20);
      var type = cuid();
      return query({
        where: { type: { '=': type } },
        gsik: { startGSIK, endGSIK }
      }).then(() => {
        expect(documentClient.query.args.length).toEqual(endGSIK - startGSIK);
        for (let i = 0; i < endGSIK - startGSIK; i++) {
          expect(documentClient.query.args[i][0]).toEqual({
            TableName: table,
            IndexName: 'ByType',
            KeyConditionExpression: `#GSIK = :GSIK AND #Type = :Type`,
            ExpressionAttributeNames: {
              '#GSIK': 'GSIK',
              '#Type': 'Type'
            },
            ExpressionAttributeValues: {
              ':GSIK': prefixTenant(`${i + startGSIK}`),
              ':Type': type
            },
            Limit: 100
          });
        }
      });
    });

    test('should run over the GSIK defined on `listGSIK`, if the `listGSIK` attribute is defined on the `gsik` object, regardless of the `startGSIK` and `endGSIK` value', () => {
      var startGSIK = randomNumber(5, 10);
      var endGSIK = randomNumber(10, 20);
      var listGSIK = range(0, 10).map(() => randomNumber(0, 10000));
      var type = cuid();
      return query({
        where: { type: { '=': type } },
        gsik: { startGSIK, endGSIK, listGSIK }
      }).then(() => {
        expect(documentClient.query.args.length).toEqual(listGSIK.length);
        listGSIK.map((gsik, i) => {
          expect(documentClient.query.args[i][0]).toEqual({
            TableName: table,
            IndexName: 'ByType',
            KeyConditionExpression: `#GSIK = :GSIK AND #Type = :Type`,
            ExpressionAttributeNames: {
              '#GSIK': 'GSIK',
              '#Type': 'Type'
            },
            ExpressionAttributeValues: {
              ':GSIK': prefixTenant(`${gsik}`),
              ':Type': type
            },
            Limit: 100
          });
        });
      });
    });

    test('should return a `limit` value of items, if the `limit` attribute on the `gsik` object is defined', () => {
      var startGSIK = randomNumber(5, 10);
      var endGSIK = randomNumber(10, 20);
      var listGSIK = range(0, 10).map(() => randomNumber(0, 10000));
      var limit = 1;
      var type = cuid();
      return query({
        where: { type: { '=': type } },
        gsik: { startGSIK, endGSIK, listGSIK },
        limit
      }).then(() => {
        expect(documentClient.query.args.length).toEqual(listGSIK.length);
        listGSIK.map((gsik, i) => {
          expect(documentClient.query.args[i][0]).toEqual({
            TableName: table,
            IndexName: 'ByType',
            KeyConditionExpression: `#GSIK = :GSIK AND #Type = :Type`,
            ExpressionAttributeNames: {
              '#GSIK': 'GSIK',
              '#Type': 'Type'
            },
            ExpressionAttributeValues: {
              ':GSIK': prefixTenant(`${gsik}`),
              ':Type': type
            },
            Limit: 1
          });
        });
      });
    });

    test('should return the `LastEvaluatedKeys` object, plus an `Offset` property, to handle pagination', () => {
      documentClient.query.restore();

      var expectedOffset = '';
      var expectedKeys = {};

      sinon.stub(documentClient, 'query').callsFake(params => ({
        promise: () => {
          var node = `Character#${randomNumber(0, 10000)}`;
          var gsik = utils.calculateGSIK({ node, maxGSIK });
          var key = {
            Node: node,
            Type: 'Gender',
            GSIK: gsik
          };

          expectedOffset += btoa(`${gsik}|${node}|Gender|`);
          expectedKeys[gsik] = key;

          return Promise.resolve({
            ScannedCount: 2,
            Count: 1,
            Items: [
              {
                Node: prefixTenant(node),
                Type: 'Gender',
                Data: 'm',
                GSIK: utils.calculateGSIK({ node, maxGSIK, tenant })
              }
            ],
            LastEvaluatedKey: {
              Node: prefixTenant(node),
              Type: 'Gender',
              GSIK: prefixTenant(gsik)
            }
          });
        }
      }));

      var endGSIK = 3;
      var limit = 1;

      return query({
        where: { type: { '=': 'Gender' } },
        filter: { data: { '=': 'm' } },
        gsik: { endGSIK },
        limit
      }).then(result => {
        expect(documentClient.query.args.length).toEqual(3);
        expect(result.Offset).toEqual(expectedOffset);
        expect(result.LastEvaluatedKeys).toEqual(expectedKeys);
      });
    });

    test('should use the transform the `offset` value into each GSIK `ExclusiveStartKey`, if provided a `LastEvaluatedKey` map', () => {
      var listGSIK = [0, 1, 2];
      var node0 = cuid();
      var node1 = cuid();
      var node2 = cuid();
      var type = 'Gender';
      return query({
        where: { type: { '=': type } },
        filter: { data: { '=': 'm' } },
        gsik: { listGSIK },
        limit: 1,
        offset: {
          0: {
            Node: node0,
            Type: type,
            GSIK: `0`
          },
          1: {
            Node: node1,
            Type: type,
            GSIK: `1`
          },
          2: {
            Node: node2,
            Type: type,
            GSIK: `2`
          }
        }
      }).then(result => {
        expect(documentClient.query.args.length).toEqual(3);
        expect(documentClient.query.args[0][0].ExclusiveStartKey).toEqual({
          Node: prefixTenant(node0),
          Type: type,
          GSIK: prefixTenant(`0`)
        });
        expect(documentClient.query.args[1][0].ExclusiveStartKey).toEqual({
          Node: prefixTenant(node1),
          Type: type,
          GSIK: prefixTenant(`1`)
        });
        expect(documentClient.query.args[2][0].ExclusiveStartKey).toEqual({
          Node: prefixTenant(node2),
          Type: type,
          GSIK: prefixTenant(`2`)
        });
      });
    });

    test('should use the transform the `offset` value into each GSIK `ExclusiveStartKey`, if provided a `LastEvaluatedKey` encoded string', () => {
      var listGSIK = [0, 1, 2];
      var node0 = cuid();
      var node1 = cuid();
      var node2 = cuid();
      var type = 'Gender';
      return query({
        where: { type: { '=': type } },
        filter: { data: { '=': 'm' } },
        gsik: { listGSIK },
        limit: 1,
        offset: btoa(`0|${node0}|Gender|1|${node1}|Gender|2|${node2}|Gender|`)
      }).then(result => {
        expect(documentClient.query.args.length).toEqual(3);
        expect(documentClient.query.args[0][0].ExclusiveStartKey).toEqual({
          Node: prefixTenant(node0),
          Type: type,
          GSIK: prefixTenant(`0`)
        });
        expect(documentClient.query.args[1][0].ExclusiveStartKey).toEqual({
          Node: prefixTenant(node1),
          Type: type,
          GSIK: prefixTenant(`1`)
        });
        expect(documentClient.query.args[2][0].ExclusiveStartKey).toEqual({
          Node: prefixTenant(node2),
          Type: type,
          GSIK: prefixTenant(`2`)
        });
      });
    });
  });
});

function pickOne(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomNumber(min, max) {
  return min + Math.floor(Math.random() * (max - min));
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
