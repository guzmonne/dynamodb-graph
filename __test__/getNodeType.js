// @ts-nocheck
'use strict';

var sinon = require('sinon');
var cuid = require('cuid');
var getNodeType = require('../src/getNodeType.js');
var utils = require('../src/modules/utils.js');
var dynamoResponse = require('./dynamoResponse.js');

var table = 'ExampleTable';

describe('#getNodeType()', () => {
  var type = 'PropTest';
  var tenant = cuid();
  var node = cuid();
  var maxGSIK = 1;
  var data = 100;

  var db = {
    get: params => ({
      promise: () => {
        return Promise.resolve({
          Item: {
            Node: node,
            Data: data,
            Type: type
          }
        });
      }
    })
  };

  beforeEach(() => {
    sinon.spy(db, 'get');
  });

  afterEach(() => {
    db.get.restore();
  });

  test('should return a function', () => {
    expect(typeof getNodeType({ db, table })).toEqual('function');
  });

  test('should return an error if maxGSIK is undefined', () => {
    return getNodeType({ db, table })({ node, type }).catch(error =>
      expect(error.message).toEqual('Max GSIK is undefined')
    );
  });

  test('should return an error if type is undefined', () => {
    return getNodeType({ db, table, maxGSIK })({ node }).catch(error =>
      expect(error.message).toEqual('Type is undefined')
    );
  });

  test('should return an error if node is undefined', () => {
    expect(() => getNodeType({ db, table, maxGSIK })({ type })).toThrow(
      'Node is undefined'
    );
  });

  test('should return the property', () => {
    return getNodeType({ db: db, table })({ node, type }).then(response => {
      expect(response).toEqual({
        Item: {
          Node: node,
          Type: type,
          Data: data
        }
      });
    });
  });
});
