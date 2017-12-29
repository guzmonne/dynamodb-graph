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
  parseItem,
  parseWhere,
  parseResponse,
  get _operators() {
    return operators.slice();
  }
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
/**
 * Modifies an item to have its data on a `Data` property, instead of on its
 * `String` or `Number` property.
 * @param {object} item - Item object to parse.
 * @property {string} [String] - Item string data.
 * @property {number} [Number] - Item number data.
 * @return {object} Parsed object.
 * @property {string|number} Data='' - Parsed item data.
 */
function parseItem(item) {
  item = Object.assign({}, item);

  item.Data = item.String || item.Number || '';

  delete item.String;
  delete item.Number;

  return item;
}
/**
 * List of valid query operators.
 * @typedef {QueryOperators} QueryOperators.
 */
var operators = ['=', '<', '>', '<=', '>=', 'BETWEEN'];
/**
 * @typedef {Object} QueryCondition
 * @property {any} [QueryOperators] - Query operator value.
 */
/**
 *
 * @param {object} where - Object to parse;
 * @property {QueryCondition} [data] - Data query condition.
 * @property {QueryCondition} [type] - Type query condition.
 * @return {object} Object with the query attribute, expression, and value.
 * @property {string} attribute="data"|"type" - Condition attribute.
 * @property {string} expression - Condition expression.
 * @property {string|bool|number|array} value - Consition value.
 */
function parseWhere(where = {}) {
  var attributes = where.data || where.type;
  var attribute = Object.keys(where)[0];

  if (attributes === undefined) throw new Error('Invalid attributes');

  var operator = Object.keys(attributes)[0];

  if (operators.indexOf(operator) === -1) throw new Error('Invalid operator');

  var value = attributes[operator];

  if (value === undefined) throw new Error('Value is undefined');

  var variable =
    attribute === 'type'
      ? 'Type'
      : typeof (Array.isArray(value) ? value[0] : value) === 'number'
        ? 'Number'
        : 'String';

  var expression = `#${variable} ${operator} ${
    Array.isArray(value) ? ':a AND :b' : `:${variable}`
  }`;

  return { attribute, expression, value };
}
/**
 * Applies the `parseItem` function to each Item of the response.
 * @param {object} response - Response object.
 * @property {array} Items - List of items.
 */
function parseResponse(response = {}) {
  var { Items = [] } = response;
  response.Items = Items.map(parseItem);
  return response;
}
