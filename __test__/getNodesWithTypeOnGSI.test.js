'use strict';

var cuid = require('cuid');
var utils = require('../src/modules/utils.js');
var dynamoResponse = require('./dynamoResponse.js');
var getNodesWithTypeOnGSI = require('../src/getNodesWithTypeOnGSI.js');

var table = 'ExampleTable';

describe('#getNodesWithTypeOnGSI()', () => {
  var type = 'Test';
  var node = cuid() + '#' + cuid();
  var gsik = utils.calculateGSIK({ node });

  var db = () => ({
    query: params => ({ promise: () => Promise.resolve(params) })
  });

  test('should return a function', () => {
    expect(typeof getNodesWithTypeOnGSI({ type, gsik })).toEqual('function');
  });

  test('should fail if type is undefined', () => {
    expect(() => getNodesWithTypeOnGSI({ db, table })({ type })).toThrow(
      'GSIK is undefined'
    );
  });

  test('should fail if type is undefined', () => {
    expect(() => getNodesWithTypeOnGSI({ db, table })({ gsik })).toThrow(
      'Type is undefined'
    );
  });
  test('should return a valid DynamoDB query params object', () => {
    return getNodesWithTypeOnGSI({ db: db(), table })({ type, gsik }).then(
      params =>
        expect(params).toEqual({
          ExpressionAttributeNames: {
            '#Data': 'Data',
            '#GSIK': 'GSIK',
            '#Node': 'Node',
            '#Type': 'Type'
          },
          ExpressionAttributeValues: {
            ':GSIK': gsik,
            ':Type': type
          },
          IndexName: 'ByType',
          KeyConditionExpression: '#GSIK = :GSIK AND #Type = :Type',
          ProjectionExpression: '#Data,#Node',
          TableName: 'ExampleTable'
        })
    );
  });

  test('should return the response parsed', () => {
    var database = {
      query: params => ({
        promise: () => Promise.resolve(dynamoResponse.raw())
      })
    };
    return getNodesWithTypeOnGSI({ db: database, table })({
      type: 1,
      gsik: 2
    }).then(response => {
      expect(response).toEqual(dynamoResponse.parsed());
    });
  });
});
