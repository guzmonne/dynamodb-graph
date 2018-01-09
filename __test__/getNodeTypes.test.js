'use strict';

var sinon = require('sinon');
var cuid = require('cuid');
var chunk = require('lodash/chunk.js');
var range = require('lodash/range.js');
var getNodeTypesFactory = require('../src/getNodeTypes.js');
var utils = require('../src/modules/utils.js');

describe('getNodeTypesFactory()', () => {
  var node = cuid();
  var types = [cuid(), cuid(), cuid()];
  var maxGSIK = 10;
  var table = 'TestTable';
  var documentClient = {
    batchGet: params => ({
      promise: () => {
        var attribute = Math.random() * 10 > 5 ? 'String' : 'Number';
        var data = type => (attribute === 'String' ? type : type.length);
        return Promise.resolve({
          Responses: {
            [table]: params.RequestItems[table].Keys.map(key =>
              Object.assign({}, key, {
                [attribute]: data(key.Type)
              })
            )
          }
        });
      }
    })
  };
  var config = { table, maxGSIK, documentClient };

  test('should be a function', () => {
    expect(typeof getNodeTypesFactory).toEqual('function');
  });

  describe('#getNodeTypes()', () => {
    var getNodeTypes = getNodeTypesFactory(config);

    test('should throw if `node` is undefined', () => {
      expect(() => getNodeTypes()).toThrow('Node is undefined');
    });

    test('should throw if `types` is not a list', () => {
      expect(() => getNodeTypes({ node })).toThrow('Types is not a list');
    });

    test('should return a promise', () => {
      expect(getNodeTypes({ node, types }) instanceof Promise).toBe(true);
    });

    beforeEach(() => {
      sinon.spy(documentClient, 'batchGet');
    });

    afterEach(() => {
      documentClient.batchGet.restore();
    });

    test('should call the `documentClient.batchGet` function', () => {
      return getNodeTypes({ node, types }).then(() => {
        expect(documentClient.batchGet.calledOnce).toBe(true);
      });
    });

    test('should call the `documentClient.batchGet` function with valid params', () => {
      return getNodeTypes({ node, types }).then(() => {
        expect(documentClient.batchGet.args[0][0]).toEqual({
          RequestItems: {
            [table]: {
              Keys: types.map(type => ({
                Node: node,
                Type: type
              }))
            }
          }
        });
      });
    });

    test('should split the types reques in chunks of 100', () => {
      var types = range(0, 1000).map(cuid);

      return getNodeTypes({ node, types }).then(() => {
        expect(documentClient.batchGet.callCount).toEqual(10);
        expect(documentClient.batchGet.args[0][0]).toEqual({
          RequestItems: {
            [table]: {
              Keys: range(0, 100).map(i => ({
                Node: node,
                Type: types[i]
              }))
            }
          }
        });
        expect(documentClient.batchGet.args[9][0]).toEqual({
          RequestItems: {
            [table]: {
              Keys: range(900, 1000).map(i => ({
                Node: node,
                Type: types[i]
              }))
            }
          }
        });
      });
    });

    test('should combine all the items returned', () => {
      var types = range(0, 1000).map(cuid);

      return getNodeTypes({ node, types }).then(result => {
        expect(result.Items.length).toEqual(1000);
      });
    });

    test('should continue trying to read from the table if `UnprocessedKeys` is returned', () => {
      var types = range(0, Math.floor(1000 + Math.random() * 10) * 2).map(cuid);
      documentClient.batchGet.restore();
      sinon.stub(documentClient, 'batchGet').callsFake(params => ({
        promise: () => {
          var attribute = Math.random() * 10 > 5 ? 'String' : 'Number';
          var data = type => (attribute === 'String' ? type : type.length);
          var result;
          var keys = params.RequestItems[table].Keys;
          if (Math.round(Math.random()) < 0.999) {
            result = {
              Responses: {
                [table]: keys.slice(0, keys.length / 2).map(key =>
                  Object.assign({}, key, {
                    [attribute]: data(key.Type)
                  })
                )
              },
              UnprocessedKeys: keys.slice(keys.length / 2, keys.length)
            };
          } else {
            result = {
              Responses: {
                [table]: keys.map(key =>
                  Object.assign({}, key, {
                    [attribute]: data(key.Type)
                  })
                )
              }
            };
          }
          return Promise.resolve(result);
        }
      }));

      return getNodeTypes({ node, types }).then(result => {
        expect(result.Items.length).toBe(types.length);
        expect(documentClient.batchGet.callCount >= 10).toBe(true);
      });
    });
  });
});
