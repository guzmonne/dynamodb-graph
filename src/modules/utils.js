'use strict';

var chunk = require('lodash/chunk.js');
var range = require('lodash/range.js');
var get = require('lodash/get.js');
var mergeWith = require('lodash/mergeWith.js');
var isNumber = require('lodash/isNumber.js');

module.exports = {
  calculateGSIK,
  createCapacityAccumulator,
  hashCode,
  parseResponseItemsData,
  mergeDynamoResponses,
  randomMac
};

// ---
/**
 * List of valid hexadecimal values.
 * @type {array}
 */
const HEXA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 'a', 'b', 'c', 'd', 'e', 'f'];
/**
 * Returns a random MAC number.
 * @returns {string} New random mac.
 */
function randomMac() {
  return chunk(range(12).map(() => HEXA[randomInt(16)]), 2)
    .join(':')
    .replace(/,/g, '');
}
/**
 * Merges two DynamoDB Response objects.
 * @param {DynamoDBResponse} response1
 * @param {DynamoDBResponse} response2
 */
function mergeDynamoResponses(response1, response2) {
  if (!response1) return response2;

  var result = {
    Items: response1.Items.concat(response2.Items),
    Count: response1.Count + response2.Count,
    ScannedCount: response1.ScannedCount + response2.ScannedCount
  };

  return result;
}
/**
 * Takes a DynamoDB response, and parses all the Data attibute of all its items.
 * @param {DynamoDBResponse} response DynamoDB response object.
 * @returns {DynamoDBResponse} DynamoDB response, with all its items Data parsed
 */
function parseResponseItemsData(response) {
  if (response && response.Items) {
    response = Object.assign({}, response);
    response.Items.forEach(item => {
      if (item.Data !== undefined) item.Data = JSON.parse(item.Data);
    });
  }
  if (response && response.Item) {
    if (response.Item.Data !== undefined)
      response.Item.Data = JSON.parse(response.Item.Data);
  }
  return response;
}
/**
 * Applies the hashcode algorithm to turn a string into a number.
 * @param {string} string - String to encode to a number.
 * @returns {number} Encoded string
 */
function hashCode(string = '') {
  var hash = 0,
    i,
    chr;
  if (string.length === 0) return hash;
  for (i = 0; i < string.length; i++) {
    chr = string.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
/**
 * @param {number} n - Maximum random int.
 * @returns {number} Random number between 0 and n.
 */
function randomInt(n) {
  return Math.floor(Math.random() * n);
}
/**
 * Returns a random GSIK based on the tenant and a random number.
 * @param {object} config - GSIK configuration object.
 * @property {string} node - Identifier of the Node.
 * @property {string} tenant='' - Identifier of the current tenant.
 * @property {number} maxGSIK - Maximum GSIK value.
 * @returns {number} Random number between 0 and n.
 */
function calculateGSIK(config = {}) {
  var { tenant = '', node, maxGSIK = 0 } = config;
  if (node === undefined) throw new Error('Node is undefined');
  if (maxGSIK < 2) return node + '#' + 0;
  return tenant + '#' + Math.abs(hashCode(node)) % maxGSIK;
}
/**
 * Accumulates the capacity consumed by DynamoDB. You have to instantiate it,
 * and then provide it with each DynamoDB response as they came along. Then you
 * can get the accumulated value by calling `accumulator.dump()`.
 * @return {function} Acumulator function.
 * @property {function} dump - Returns the current accumulated object.
 */
function createCapacityAccumulator() {
  var consumedCapacity = {};

  function accumulator(response) {
    consumedCapacity = mergeWith(
      consumedCapacity,
      response.ConsumedCapacity || {},
      (objValue, srcValue) => {
        if (isNumber(objValue) && isNumber(srcValue))
          return objValue + srcValue;
      }
    );
  }

  accumulator.dump = () => Object.assign({}, consumedCapacity);

  return accumulator;
}
