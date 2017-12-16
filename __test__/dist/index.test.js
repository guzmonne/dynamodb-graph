'use strict';

var dynamoGraph = require('../../dist/index.js');

var db = {};
var table = 'TableExample';

test('should be a function', () => {
  expect(typeof dynamoGraph).toEqual('function');
});

test('should throw an error if the db is undefined', () => {
  expect(() => dynamoGraph()).toThrow('DB is undefined');
});

test('should throw an error if the table is undefined', () => {
  expect(() => dynamoGraph({ db })).toThrow('Table is undefined');
});

test('should return an object', () => {
  expect(typeof dynamoGraph({ db, table })).toEqual('object');
});
