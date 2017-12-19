// @ts-nocheck
'use strict';

var cuid = require('cuid');
var getNodesWithProperties = require('../src/getNodesWithProperties.js');
var utils = require('../src/modules/utils.js');
var dynamoResponse = require('./dynamoResponse.js');

var table = 'ExampleTable';

describe('#getNodesWithProperties()', () => {
  var type = 'Testing';
  var tenant = cuid();
  var maxGSIK = 3;
  var node1 = cuid();
  var node2 = cuid();
  var node3 = cuid();

  var cuids = [];
  var getNodesWithTypeOnGSIResponse = () => {
    var node = cuid();
    cuids.push(node);
    return dynamoResponse.raw({ Items: [{ Node: node }] });
  };
  var getNodePropertiesResponse = (function(i = -1) {
    var values = [['One', 1], ['Two', 2], ['Three', 3]];
    return () => {
      i += 1;
      var value = values[i];
      return dynamoResponse.raw({
        Items: [{ Node: cuids[i], Type: value[0], Data: value[1] }]
      });
    };
  })();

  var db = () => ({
    query: params => ({
      promise: () => {
        if (params.IndexName) {
          return Promise.resolve(getNodesWithTypeOnGSIResponse());
        }
        return Promise.resolve(getNodePropertiesResponse());
      }
    })
  });

  test('should return a function', () => {
    expect(typeof getNodesWithProperties({ tenant, type })).toEqual('function');
  });

  test('should return an error if maxGSIK is undefined', () => {
    return getNodesWithProperties({ db: db(), table })({
      tenant,
      type
    })
      .then(result => expect(result).toEqual(undefined))
      .catch(error => expect(error.message).toEqual('Max GSIK is undefined'));
  });

  test('should return an error if type is undefined', () => {
    return getNodesWithProperties({ db: db(), table })({
      tenant,
      maxGSIK
    }).catch(error => expect(error.message).toEqual('Type is undefined'));
  });

  test('should return a response object with all nodes', () => {
    return getNodesWithProperties({ db: db(), table })({
      tenant,
      type,
      maxGSIK
    })
      .then(response => {
        expect(response).toEqual({
          Count: 3,
          Items: [
            { Node: cuids[0], One: 1 },
            { Node: cuids[1], Two: 2 },
            { Node: cuids[2], Three: 3 }
          ],
          ScannedCount: 30
        });
      })
      .catch(error => expect(error).toEqual(null));
  });
});
