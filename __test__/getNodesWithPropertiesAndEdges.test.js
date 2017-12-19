// @ts-nocheck
'use strict';

var cuid = require('cuid');
var getNodesWithPropertiesAndEdges = require('../src/getNodesWithPropertiesAndEdges.js');
var utils = require('../src/modules/utils.js');
var dynamoResponse = require('./dynamoResponse.js');

var table = 'ExampleTable';

describe('#getNodesWithPropertiesAndEdges()', () => {
  var type = 'Testing';
  var tenant = cuid();
  var maxGSIK = 3;
  var node1 = cuid();
  var node2 = cuid();
  var node3 = cuid();

  var cuids = [];
  var targets = [];
  var getNodesWithTypeOnGSIResponse = (function(i = -1) {
    return () => {
      var node1 = cuid();
      var node2 = cuid();
      i++;
      cuids.push(node1);
      cuids.push(node2);
      return dynamoResponse.raw({
        Items: [
          {
            Node: node1,
            Data: `Data ${i}`
          },
          {
            Node: node2,
            Data: `Data ${i}`
          }
        ]
      });
    };
  })();
  var getNodePropertiesResponse = (function(i = 0) {
    return () => {
      var target = cuid();
      targets.push(target);
      var result = dynamoResponse.raw({
        Items: [
          {
            Node: cuids[i],
            Data: 'Prop ' + i
          },
          {
            Node: cuids[i],
            Data: 'Edge ' + i,
            Target: target
          }
        ]
      });
      i += 1;
      return result;
    };
  })();

  var db = () => ({
    query: params => ({
      promise: () => {
        if (params.IndexName) {
          return Promise.resolve(getNodesWithTypeOnGSIResponse(params));
        }
        return Promise.resolve(getNodePropertiesResponse(params));
      }
    })
  });

  test('should return a function', () => {
    expect(typeof getNodesWithPropertiesAndEdges({ tenant, type })).toEqual(
      'function'
    );
  });

  test('should return an error if maxGSIK is undefined', () => {
    return getNodesWithPropertiesAndEdges({ db: db(), table })({
      tenant,
      type
    })
      .then(result => expect(result).toEqual(undefined))
      .catch(error => expect(error.message).toEqual('Max GSIK is undefined'));
  });

  test('should return an error if type is undefined', () => {
    return getNodesWithPropertiesAndEdges({ db: db(), table })({
      tenant,
      maxGSIK
    }).catch(error => expect(error.message).toEqual('Type is undefined'));
  });

  test('should return a response object with all nodes', () => {
    return getNodesWithPropertiesAndEdges({ db: db(), table })({
      tenant,
      type,
      maxGSIK
    })
      .then(response => {
        expect(response).toEqual({
          Count: 6,
          Items: [
            {
              Data: 'Data 0',
              Edges: [
                {
                  Data: 'Edge 0',
                  Node: cuids[0],
                  Target: targets[0]
                }
              ],
              Node: cuids[0],
              Properties: [{ Data: 'Prop 0', Node: cuids[0] }]
            },
            {
              Data: 'Data 0',
              Edges: [
                {
                  Data: 'Edge 1',
                  Node: cuids[1],
                  Target: targets[1]
                }
              ],
              Node: cuids[1],
              Properties: [{ Data: 'Prop 1', Node: cuids[1] }]
            },
            {
              Data: 'Data 1',
              Edges: [
                {
                  Data: 'Edge 2',
                  Node: cuids[2],
                  Target: targets[2]
                }
              ],
              Node: cuids[2],
              Properties: [{ Data: 'Prop 2', Node: cuids[2] }]
            },
            {
              Data: 'Data 1',
              Edges: [
                {
                  Data: 'Edge 3',
                  Node: cuids[3],
                  Target: targets[3]
                }
              ],
              Node: cuids[3],
              Properties: [{ Data: 'Prop 3', Node: cuids[3] }]
            },
            {
              Data: 'Data 2',
              Edges: [
                {
                  Data: 'Edge 4',
                  Node: cuids[4],
                  Target: targets[4]
                }
              ],
              Node: cuids[4],
              Properties: [{ Data: 'Prop 4', Node: cuids[4] }]
            },
            {
              Data: 'Data 2',
              Edges: [
                {
                  Data: 'Edge 5',
                  Node: cuids[5],
                  Target: targets[5]
                }
              ],
              Node: cuids[5],
              Properties: [{ Data: 'Prop 5', Node: cuids[5] }]
            }
          ],
          ScannedCount: 60
        });
      })
      .catch(error => {
        console.log(error);
        expect(error.message).toBe(null);
      });
  });
});
