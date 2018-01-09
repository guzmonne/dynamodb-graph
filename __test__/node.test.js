'use strict';

var cuid = require('cuid');
var sinon = require('sinon');
var nodeFactory = require('../src/node.js');
var { calculateGSIK, prefixTenant, btoa } = require('../src/modules/utils.js');

var maxGSIK = 10;
var tenant = Math.random() > 0.5 ? undefined : cuid();
var pTenant = prefixTenant(tenant);
var table = 'TestTable';
var id = cuid();
var type = cuid();
var data = cuid();
var documentClient = {
  put: params => ({
    promise: () => {
      return Promise.resolve({
        Item: params.Item
      });
    }
  }),
  delete: params => ({
    promise: () => {
      return Promise.resolve({});
    }
  }),
  get: params => ({
    promise: () => {
      return Promise.resolve({
        Item: Object.assign({}, params.Key, {
          Data: 'Data',
          Target: 'Target',
          GSIK: '0'
        })
      });
    }
  }),
  batchGet: params => ({
    promise: () => {
      return Promise.resolve({
        Responses: {
          [table]: params.RequestItems[table].Keys.map(key => {
            var node = key.Node;
            return Object.assign({}, key, {
              Data: 'Data',
              Target: pTenant('Target'),
              GSIK: calculateGSIK({ node, tenant })
            });
          })
        }
      });
    }
  }),
  query: params => ({
    promise: () => {
      var id = params.ExpressionAttributeValues[':Node'];
      return Promise.resolve({
        Count: 1,
        ScannedCount: 3,
        LastEvaluatedKey: {
          Node: id,
          Type: 'Type'
        },
        Items: [
          {
            Node: id,
            Type: 'Type',
            Data: 'Data',
            Target: 'Target',
            GSIK: '0'
          }
        ]
      });
    }
  })
};
var node = nodeFactory({
  documentClient,
  maxGSIK,
  tenant,
  table
});

describe('nodeFactory', () => {
  test('should be a function', () => {
    expect(typeof nodeFactory).toEqual('function');
  });

  test('should return a function', () => {
    expect(typeof nodeFactory()).toEqual('function');
  });

  describe('#node', () => {
    test('should throw if `id` is not a string', () => {
      expect(() => node({ id: true })).toThrow('Node ID is not a string');
    });

    test('should set the node `id` value to a random `cuid` if it is undefined', () => {
      expect(() => node({ type }).create({ data })).not.toThrow();
    });

    test('should return an object', () => {
      expect(typeof node({ id, type })).toEqual('object');
    });

    var testNode = node({ id, type });

    describe('#create', () => {
      test('should be a function', () => {
        expect(typeof node({ id, type }).create).toEqual('function');
      });

      test('should throw if options argument is undefined', () => {
        expect(() => node({ id, type }).create()).toThrow(
          'Options is undefined'
        );
      });

      test('should throw if type is undefined', () => {
        expect(() => node({ id }).create({ data })).toThrow(
          'Type is undefined'
        );
      });

      test('should return a Promise', () => {
        expect(testNode.create({ data, type }) instanceof Promise).toEqual(
          true
        );
      });

      beforeEach(() => {
        sinon.spy(documentClient, 'put');
      });

      afterEach(() => {
        documentClient.put.restore();
      });

      test('should call the `documentClient.put` method with a valid params object, in order to create a new node when the `data` attribute is set', () => {
        return testNode.create({ data }).then(result => {
          expect(documentClient.put.args[0][0]).toEqual({
            TableName: table,
            Item: {
              Node: pTenant(id),
              Data: data,
              Type: type,
              Target: pTenant(id),
              GSIK: calculateGSIK({ node: id, tenant, maxGSIK })
            }
          });
        });
      });

      test('should return a valid Node item when the `data` attribute is set', () => {
        var node = nodeFactory({
          documentClient,
          maxGSIK: 0,
          tenant,
          table
        });
        return node({ id, type })
          .create({ data })
          .then(result => {
            expect(result).toEqual({
              Item: {
                Node: id,
                Data: data,
                Type: type,
                Target: id,
                GSIK: '0'
              }
            });
          });
      });

      test('should call the `documentClient.put` method with a valid params object, in order to create a new edge when the `data` and `target` attributes are set', () => {
        var target = cuid();
        return testNode.create({ data, target }).then(result => {
          expect(documentClient.put.args[0][0]).toEqual({
            TableName: table,
            Item: {
              Node: pTenant(id),
              Data: data,
              Type: type,
              Target: pTenant(target),
              GSIK: calculateGSIK({ node: id, tenant, maxGSIK })
            }
          });
        });
      });

      test('should return a valid Edge item when the `data` and `target` attributes are set', () => {
        var target = cuid();
        return testNode.create({ target, data }).then(result => {
          expect(result).toEqual({
            Item: {
              Node: id,
              Data: data,
              Type: type,
              Target: target,
              GSIK: calculateGSIK({ node: id, maxGSIK })
            }
          });
        });
      });

      test('should throw an error if the `data` or `target` values are configured with the `prop` value', () => {
        var target = cuid();
        var prop = cuid();
        expect(() => testNode.create({ prop, target })).toThrow(
          'Can configure `prop`, `target`, and `data` values at the same type'
        );
        expect(() => testNode.create({ prop, data })).toThrow(
          'Can configure `prop`, `target`, and `data` values at the same type'
        );
      });

      test('should call the `documentClient.put` method with a valid params object, in order to create a new prop when the `prop` attribute is set', () => {
        var prop = cuid();
        return testNode.create({ prop }).then(result => {
          expect(documentClient.put.args[0][0]).toEqual({
            TableName: table,
            Item: {
              Node: pTenant(id),
              Data: prop,
              Type: type,
              GSIK: calculateGSIK({ node: id, tenant, maxGSIK })
            }
          });
        });
      });

      test('should return a valid Edge item when the `prop` attribute is set', () => {
        var prop = cuid();
        return testNode.create({ prop }).then(result => {
          expect(result).toEqual({
            Item: {
              Node: id,
              Data: prop,
              Type: type,
              GSIK: calculateGSIK({ node: id, maxGSIK })
            }
          });
        });
      });
    });

    describe('#destroy', () => {
      test('should be a function', () => {
        expect(typeof node({ id, type }).destroy).toEqual('function');
      });

      test('should return a Promise', () => {
        expect(node({ id, type }).destroy() instanceof Promise).toEqual(true);
      });

      beforeEach(() => {
        sinon.spy(documentClient, 'delete');
      });

      afterEach(() => {
        documentClient.delete.restore();
      });

      test('should destroy the item pointed by the node `id` and `type`', () => {
        return node({ id, type })
          .destroy()
          .then(result => {
            expect(documentClient.delete.args[0][0]).toEqual({
              TableName: table,
              Key: {
                Node: pTenant(id),
                Type: type
              }
            });
          });
      });
    });

    describe('#get', () => {
      test('should be a function', () => {
        expect(typeof testNode.get).toEqual('function');
      });

      test('should throw if `node` is undefined', () => {
        expect(() => node({ type }).get()).toThrow('Node is undefined');
      });

      test('should throw if the type is undefined', () => {
        expect(() => node({ id }).get()).toThrow('Type is undefined');
      });

      test('should return a promise', () => {
        expect(testNode.get() instanceof Promise).toBe(true);
      });

      beforeEach(() => {
        sinon.spy(documentClient, 'get');
      });

      afterEach(() => {
        documentClient.get.restore();
      });

      test('should call `documentClient.get` method with the appropiate parameters to get an item, if the `node` and `type` attributes are defined', () => {
        return node({ id, type })
          .get()
          .then(() => {
            expect(documentClient.get.args[0][0]).toEqual({
              TableName: table,
              Key: {
                Node: prefixTenant(tenant, id),
                Type: type
              }
            });
          });
      });

      test('should return a valid Item', () => {
        return node({ id, type })
          .get()
          .then(result => {
            expect(result).toEqual({
              Item: {
                Node: id,
                Type: type,
                Data: 'Data',
                Target: 'Target',
                GSIK: '0'
              }
            });
          });
      });

      test('should call the `documentClient.batchGet` method with valid params, when the argument to the `get()` method is a list of types.', () => {
        sinon.spy(documentClient, 'batchGet');
        return node({ id, type })
          .get(['Type1', 'Type2'])
          .then(() => {
            expect(documentClient.batchGet.args[0][0]).toEqual({
              RequestItems: {
                TestTable: {
                  Keys: [
                    { Node: pTenant(id), Type: type },
                    { Node: pTenant(id), Type: 'Type1' },
                    { Node: pTenant(id), Type: 'Type2' }
                  ]
                }
              }
            });
            documentClient.batchGet.restore();
          });
      });

      test('should get a list of items if a list of types is provided as an argument', () => {
        return node({ id, type })
          .get(['Type1', 'Type2'])
          .then(result => {
            expect(result).toEqual({
              Count: 3,
              ScannedCount: 3,
              Items: [
                {
                  Node: id,
                  Type: type,
                  Data: 'Data',
                  Target: 'Target',
                  GSIK: '0'
                },
                {
                  Node: id,
                  Type: 'Type1',
                  Data: 'Data',
                  Target: 'Target',
                  GSIK: '0'
                },
                {
                  Node: id,
                  Type: 'Type2',
                  Data: 'Data',
                  Target: 'Target',
                  GSIK: '0'
                }
              ]
            });
          });
      });

      test('should get the list of items parsed', () => {
        return node({ id, type })
          .get(['Type1', 'Type2'])
          .then(result => {
            expect(result).toEqual({
              Count: 3,
              ScannedCount: 3,
              Items: [
                {
                  Node: id,
                  Type: type,
                  Data: 'Data',
                  Target: 'Target',
                  GSIK: '0'
                },
                {
                  Node: id,
                  Type: 'Type1',
                  Data: 'Data',
                  Target: 'Target',
                  GSIK: '0'
                },
                {
                  Node: id,
                  Type: 'Type2',
                  Data: 'Data',
                  Target: 'Target',
                  GSIK: '0'
                }
              ]
            });
          });
      });
    });

    describe('#edges()', () => {
      beforeEach(() => {
        sinon.spy(documentClient, 'query');
      });

      afterEach(() => {
        documentClient.query.restore();
      });

      test('should be a function', () => {
        expect(typeof node({ id, type }).edges).toEqual('function');
      });

      test('should throw if `id` is undefined', () => {
        expect(() => node({ type }).edges()).toThrow('Node ID is undefined');
      });

      test('should return a Promise', () => {
        expect(node({ id, type }).edges() instanceof Promise).toBe(true);
      });

      test('should call the `documentClient.query` method to get all the Node edges, if no attribute is defined', () => {
        return node({ id, type })
          .edges()
          .then(() => {
            expect(documentClient.query.args[0][0]).toEqual({
              TableName: table,
              KeyConditionExpression: '#Node = :Node',
              ExpressionAttributeNames: {
                '#Node': 'Node',
                '#Target': 'Target'
              },
              ExpressionAttributeValues: {
                ':Node': pTenant(id)
              },
              FilterExpression: '#Target <> :Node'
            });
          });
      });

      test('should call the `documentClient.query` method to get a specic ammount of node edges, if the `limit` attribute is a number', () => {
        return node({ id, type })
          .edges({ limit: 1 })
          .then(() => {
            expect(documentClient.query.args[0][0]).toEqual({
              TableName: table,
              KeyConditionExpression: '#Node = :Node',
              ExpressionAttributeNames: {
                '#Node': 'Node',
                '#Target': 'Target'
              },
              ExpressionAttributeValues: {
                ':Node': pTenant(id)
              },
              FilterExpression: '#Target <> :Node',
              Limit: 1
            });
          });
      });

      test('should return a parsed list of items', () => {
        return node({ id, type })
          .edges()
          .then(result => {
            expect(result.Items).toEqual([
              {
                Node: id,
                Type: 'Type',
                Data: 'Data',
                Target: 'Target',
                GSIK: '0'
              }
            ]);
          });
      });

      test('should return the offset value if a `LastEvaluatedKey` was returned by DynamoDB', () => {
        return node({ id })
          .edges()
          .then(result => {
            expect(result.Offset).toEqual(btoa('Type'));
          });
      });

      test('should start the query from the `offset` value', () => {
        var offset = btoa(type);
        return node({ id, type })
          .edges({ offset })
          .then(result => {
            expect(documentClient.query.args[0][0]).toEqual({
              TableName: table,
              KeyConditionExpression: '#Node = :Node',
              ExpressionAttributeNames: {
                '#Node': 'Node',
                '#Target': 'Target'
              },
              ExpressionAttributeValues: {
                ':Node': pTenant(id)
              },
              ExclusiveStartKey: {
                Node: id,
                Type: type
              },
              FilterExpression: '#Target <> :Node'
            });
          });
      });
    });

    describe('#props()', () => {
      beforeEach(() => {
        sinon.spy(documentClient, 'query');
      });

      afterEach(() => {
        documentClient.query.restore();
      });

      test('should be a function', () => {
        expect(typeof node({ id, type }).props).toEqual('function');
      });

      test('should throw if `id` is undefined', () => {
        expect(() => node({ type }).props()).toThrow('Node ID is undefined');
      });

      test('should return a Promise', () => {
        expect(node({ id, type }).props() instanceof Promise).toBe(true);
      });

      test('should call the `documentClient.query` method to get all the Node props, if no attribute is defined', () => {
        return node({ id, type })
          .props()
          .then(() => {
            expect(documentClient.query.args[0][0]).toEqual({
              TableName: table,
              KeyConditionExpression: '#Node = :Node',
              ExpressionAttributeNames: {
                '#Node': 'Node',
                '#Target': 'Target'
              },
              ExpressionAttributeValues: {
                ':Node': pTenant(id)
              },
              FilterExpression: 'attribute_not_exists(#Target)'
            });
          });
      });

      test('should call the `documentClient.query` method to get a specic ammount of node props, if the `limit` attribute is a number', () => {
        return node({ id, type })
          .props({ limit: 1 })
          .then(() => {
            expect(documentClient.query.args[0][0]).toEqual({
              TableName: table,
              KeyConditionExpression: '#Node = :Node',
              ExpressionAttributeNames: {
                '#Node': 'Node',
                '#Target': 'Target'
              },
              ExpressionAttributeValues: {
                ':Node': pTenant(id)
              },
              FilterExpression: 'attribute_not_exists(#Target)',
              Limit: 1
            });
          });
      });

      test('should return a parsed list of items', () => {
        return node({ id, type })
          .props()
          .then(result => {
            expect(result.Items).toEqual([
              {
                Node: id,
                Type: 'Type',
                Data: 'Data',
                Target: 'Target',
                GSIK: '0'
              }
            ]);
          });
      });

      test('should return the offset value if a `LastEvaluatedKey` was returned by DynamoDB', () => {
        return node({ id })
          .props()
          .then(result => {
            expect(result.Offset).toEqual(btoa('Type'));
          });
      });

      test('should start the query from the `offset` value', () => {
        var offset = btoa(type);
        return node({ id, type })
          .props({ offset })
          .then(result => {
            expect(documentClient.query.args[0][0]).toEqual({
              TableName: table,
              KeyConditionExpression: '#Node = :Node',
              ExpressionAttributeNames: {
                '#Node': 'Node',
                '#Target': 'Target'
              },
              ExpressionAttributeValues: {
                ':Node': pTenant(id)
              },
              ExclusiveStartKey: {
                Node: id,
                Type: type
              },
              FilterExpression: 'attribute_not_exists(#Target)'
            });
          });
      });
    });

    describe('#query()', () => {
      beforeEach(() => {
        sinon.spy(documentClient, 'query');
      });

      afterEach(() => {
        documentClient.query.restore();
      });

      test('should be a function', () => {
        expect(typeof testNode.query).toEqual('function');
      });

      test('should pass the Node `id` into the `query` attributes', () => {
        var value = cuid();
        return testNode.query({ where: { type: { '=': value } } }).then(() => {
          expect(documentClient.query.args[0][0]).toEqual({
            TableName: table,
            KeyConditionExpression: `#Node = :Node AND #Type = :Type`,
            ExpressionAttributeNames: {
              '#Node': 'Node',
              '#Type': 'Type'
            },
            ExpressionAttributeValues: {
              ':Node': pTenant(id),
              ':Type': value
            }
          });
        });
      });

      test('should pass the Node `id` into the `query` attributes', () => {
        var value = cuid();
        return testNode.query({ where: { type: { '=': value } } }).then(() => {
          expect(documentClient.query.args[0][0]).toEqual({
            TableName: table,
            KeyConditionExpression: `#Node = :Node AND #Type = :Type`,
            ExpressionAttributeNames: {
              '#Node': 'Node',
              '#Type': 'Type'
            },
            ExpressionAttributeValues: {
              ':Node': pTenant(id),
              ':Type': value
            }
          });
        });
      });

      test('should allow to query by Node `type` and filter by `data` using a `FilterCondition expression`', () => {
        var value = cuid();
        var data = cuid();
        return testNode
          .query({
            filter: { type: { '=': value } },
            where: { data: { '=': data } }
          })
          .then(() => {
            expect(documentClient.query.args[0][0]).toEqual({
              TableName: table,
              KeyConditionExpression: `#Node = :Node AND #Type = :Type`,
              ExpressionAttributeNames: {
                '#Node': 'Node',
                '#Type': 'Type',
                '#Data': 'Data'
              },
              ExpressionAttributeValues: {
                ':Node': pTenant(id),
                ':Type': value,
                ':Data': data
              },
              FilterExpression: `#Data = :Data`
            });
            return testNode.query({
              filter: { type: { '>': value } },
              where: { type: { '=': data } }
            });
          })
          .then(() => {
            expect(documentClient.query.args[1][0]).toEqual({
              TableName: table,
              KeyConditionExpression: `#Node = :Node AND #Type = :Type`,
              ExpressionAttributeNames: {
                '#Node': 'Node',
                '#Type': 'Type'
              },
              ExpressionAttributeValues: {
                ':Node': pTenant(id),
                ':Type': value
              },
              FilterExpression: `#Type > :Type`
            });
          });
      });

      test('should query only by `data` when a `type` condition expression is missing', () => {
        var data = cuid();
        return testNode
          .query({
            where: { data: { contains: data } }
          })
          .then(() => {
            expect(documentClient.query.args[0][0]).toEqual({
              TableName: table,
              KeyConditionExpression: `#Node = :Node`,
              ExpressionAttributeNames: {
                '#Node': 'Node',
                '#Data': 'Data'
              },
              ExpressionAttributeValues: {
                ':Node': pTenant(id),
                ':Data': data
              },
              FilterExpression: `contains(#Data, :Data)`
            });
          });
      });
      test('should allow a one level deep logical evaluation on the `and` query condition', () => {
        var data = [cuid(), cuid()];
        var type = cuid();
        return testNode
          .query({
            where: { type: { '=': type } },
            filter: {
              data: { BETWEEN: data },
              and: { data: { size: 25 } }
            }
          })
          .then(() => {
            expect(documentClient.query.args[0][0]).toEqual({
              TableName: table,
              KeyConditionExpression: `#Node = :Node AND #Type = :Type`,
              ExpressionAttributeNames: {
                '#Node': 'Node',
                '#Type': 'Type',
                '#Data': 'Data'
              },
              ExpressionAttributeValues: {
                ':Node': pTenant(id),
                ':Type': type,
                ':a': data[0],
                ':b': data[1],
                ':y1': 25
              },
              FilterExpression: `#Data BETWEEN :a AND :b AND size(#Data) = :y1`
            });
            return testNode.query({
              where: { type: { '=': type } },
              filter: {
                data: { BETWEEN: data },
                and: { data: { IN: data.concat(data) } }
              }
            });
          })
          .then(() => {
            expect(documentClient.query.args[1][0]).toEqual({
              TableName: table,
              KeyConditionExpression: `#Node = :Node AND #Type = :Type`,
              ExpressionAttributeNames: {
                '#Node': 'Node',
                '#Type': 'Type',
                '#Data': 'Data'
              },
              ExpressionAttributeValues: {
                ':Node': pTenant(id),
                ':Type': type,
                ':a': data[0],
                ':b': data[1],
                ':y10': data[0],
                ':y11': data[1],
                ':y12': data[0],
                ':y13': data[1]
              },
              FilterExpression: `#Data BETWEEN :a AND :b AND #Data IN :y10, :y11, :y12, :y13`
            });
            return testNode.query({
              where: { type: { '=': type } },
              filter: {
                data: { contains: data[0] },
                and: { data: { contains: data[1] } }
              }
            });
          })
          .then(() => {
            expect(documentClient.query.args[2][0]).toEqual({
              TableName: table,
              KeyConditionExpression: `#Node = :Node AND #Type = :Type`,
              ExpressionAttributeNames: {
                '#Node': 'Node',
                '#Type': 'Type',
                '#Data': 'Data'
              },
              ExpressionAttributeValues: {
                ':Node': pTenant(id),
                ':Type': type,
                ':Data': data[0],
                ':y1': data[1]
              },
              FilterExpression: `contains(#Data, :Data) AND contains(#Data, :y1)`
            });
            return testNode.query({
              where: { type: { '=': type } },
              filter: {
                data: { contains: data[0] },
                and: { type: { contains: data[1] } }
              }
            });
          })
          .then(() => {
            expect(documentClient.query.args[3][0]).toEqual({
              TableName: table,
              KeyConditionExpression: `#Node = :Node AND #Type = :Type`,
              ExpressionAttributeNames: {
                '#Node': 'Node',
                '#Type': 'Type',
                '#Data': 'Data'
              },
              ExpressionAttributeValues: {
                ':Node': pTenant(id),
                ':Type': type,
                ':Data': data[0],
                ':y1': data[1]
              },
              FilterExpression: `contains(#Data, :Data) AND contains(#Type, :y1)`
            });
            return testNode.query({
              where: { type: { '=': type } },
              filter: {
                data: { contains: data[0] },
                and: {
                  type: { contains: data[1] },
                  or: {
                    data: { BETWEEN: ['1', '2'] },
                    not: { type: { IN: ['2', '3', '4'] } }
                  }
                }
              }
            });
          })
          .then(() => {
            expect(documentClient.query.args[4][0]).toEqual({
              TableName: table,
              KeyConditionExpression: `#Node = :Node AND #Type = :Type`,
              ExpressionAttributeNames: {
                '#Node': 'Node',
                '#Type': 'Type',
                '#Data': 'Data'
              },
              ExpressionAttributeValues: {
                ':Node': pTenant(id),
                ':Type': type,
                ':Data': data[0],
                ':y1': data[1],
                ':y20': '1',
                ':y21': '2',
                ':y30': '2',
                ':y31': '3',
                ':y32': '4'
              },
              FilterExpression: `contains(#Data, :Data) AND contains(#Type, :y1) OR #Data BETWEEN :y20 AND :y21 NOT #Type IN :y30, :y31, :y32`
            });
          });
      });

      test('should limit the number of results when the `limit` attribute is defined', () => {
        var type = 'Line#265#Episode#32';
        var begins_with = 'Line';
        var node = 'Character#2';
        documentClient.query.restore();
        sinon.stub(documentClient, 'query').callsFake(() => ({
          promise: () => {
            return Promise.resolve({
              Count: 1,
              ScannedCount: 3,
              Items: [
                {
                  Node: pTenant(node),
                  Type: type,
                  Data: "Bart didn't get one vote?! Oh, this is...",
                  GSIK: pTenant('9'),
                  Target: pTenant('Line#9605')
                }
              ],
              LastEvaluatedKey: {
                Node: node,
                Type: type
              }
            });
          }
        }));
        return testNode
          .query({
            where: { type: { begins_with: type } },
            limit: 1
          })
          .then(result => {
            expect(documentClient.query.args[0][0]).toEqual({
              TableName: table,
              KeyConditionExpression: `#Node = :Node AND begins_with(#Type, :Type)`,
              ExpressionAttributeNames: {
                '#Node': 'Node',
                '#Type': 'Type'
              },
              ExpressionAttributeValues: {
                ':Node': pTenant(id),
                ':Type': type
              },
              Limit: 1
            });
            expect(result.Items[0].Node).toEqual(node);
            expect(result.LastEvaluatedKey).toEqual({
              Node: node,
              Type: type
            });
            expect(result.Offset).toEqual('TGluZSMyNjUjRXBpc29kZSMzMg==');
          });
      });
      test('should add the `offset` value to the query if defined both as a string and as a DynamoDB key', () => {
        var type = 'Line#265#Episode#32';
        var begins_with = 'Line';
        return testNode
          .query({
            where: { type: { begins_with: type } },
            limit: 1,
            offset: {
              Node: id,
              Type: type
            }
          })
          .then(() => {
            expect(documentClient.query.args[0][0]).toEqual({
              TableName: table,
              KeyConditionExpression: `#Node = :Node AND begins_with(#Type, :Type)`,
              ExpressionAttributeNames: {
                '#Node': 'Node',
                '#Type': 'Type'
              },
              ExpressionAttributeValues: {
                ':Node': pTenant(id),
                ':Type': type
              },
              Limit: 1,
              ExclusiveStartKey: {
                Node: pTenant(id),
                Type: type
              }
            });
            return testNode.query({
              where: { type: { begins_with: type } },
              limit: 1,
              offset: btoa(type)
            });
          })
          .then(() => {
            expect(documentClient.query.args[0][0]).toEqual({
              TableName: table,
              KeyConditionExpression: `#Node = :Node AND begins_with(#Type, :Type)`,
              ExpressionAttributeNames: {
                '#Node': 'Node',
                '#Type': 'Type'
              },
              ExpressionAttributeValues: {
                ':Node': pTenant(id),
                ':Type': type
              },
              Limit: 1,
              ExclusiveStartKey: {
                Node: pTenant(id),
                Type: type
              }
            });
          });
      });
    });
  });
});
