'use strict';

var chunk = require('lodash/chunk.js');
var range = require('lodash/range.js');
var get = require('lodash/get.js');
var mergeWith = require('lodash/mergeWith.js');
var isNumber = require('lodash/isNumber.js');

module.exports = {
  calculateGSIK,
  calculateTGSIK,
  createCapacityAccumulator,
  hashCode,
  parseResponseItemsData,
  mergeDynamoResponses,
  checkConfiguration,
  parseItem
};

// ---
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
 * @property {number} maxGSIK - Maximum GSIK value.
 * @property {string} tenant='' - Identifier of the current tenant.
 * @returns {number} Random number between 0 and n.
 */
function calculateGSIK(config = {}) {
  var { tenant = '', node, maxGSIK = 0 } = config;
  var gsik = tenant !== undefined && tenant !== '' ? tenant + '#' : '';
  if (node === undefined) throw new Error('Node is undefined');
  if (maxGSIK < 2) return (gsik += 0);
  return (gsik += Math.abs(hashCode(node)) % maxGSIK);
}
/**
 * Returns a random GSIK based on the tenant and a random number.
 * @param {object} config - GSIK configuration object.
 * @property {string} node - Identifier of the Node.
 * @property {number} maxGSIK - Maximum GSIK value.
 * @property {string} tenant='' - Identifier of the current tenant.
 * @property {string} type - Node type.
 * @returns {number} Random number between 0 and n.
 */
function calculateTGSIK(config = {}) {
  var { tenant, node, type, maxGSIK = 0 } = config;
  var tgsik = tenant !== undefined && tenant !== '' ? tenant + '#' : '';
  if (node === undefined) throw new Error('Node is undefined');
  if (maxGSIK < 2) return (tgsik += type + '#' + 0);
  return (tgsik += type + '#' + Math.abs(hashCode(node)) % maxGSIK);
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

/**
 * @typedef {Object} ConfigObject
 * @property {object} documentClient - DynamoDB Document Client driver.
 * @property {number} maxGSIK - Maximum GSIK value. Should be a multiple of 10.
 * @property {string} [tenant=''] - Tenant unique identifier.
 * @property {string} [table=TABLE_NAME] - Table name. Can be defined in env
 *                                         variable called TABLE_NAME.
 */

/**
 * Utility function that validates if an object is a valid ConfigObject.
 * @param {ConfigObject} config - Main configuration object
 */
function checkConfiguration(config = {}) {
  var { maxGSIK, documentClient, table = process.env.TABLE_NAME } = config;

  if (maxGSIK === undefined) throw new Error('Max GSIK is undefined');
  if (documentClient === undefined)
    throw new Error('DocumentClient is undefined');
  if (table === undefined) throw new Error('Table is undefined');
}

function parseItem(item) {
  item = Object.assign({}, item);

  item.Data = item.String || item.Number;

  delete item.String;
  delete item.Number;

  return item;
}
