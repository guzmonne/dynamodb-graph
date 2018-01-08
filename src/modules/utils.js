'use strict';

var chunk = require('lodash/chunk.js');
var range = require('lodash/range.js');
var get = require('lodash/get.js');
var mergeWith = require('lodash/mergeWith.js');
var isNumber = require('lodash/isNumber.js');

module.exports = {
  atob,
  btoa,
  calculateGSIK,
  calculateTGSIK,
  checkConfiguration,
  createCapacityAccumulator,
  hashCode,
  mergeDynamoResponses,
  parseItem,
  parseResponse,
  parseResponseItemsData,
  parseWhere,
  prefixTenant,
  get _operators() {
    return WHERE_OPERATORS.slice();
  }
};

// ---
/**
 * Merges two DynamoDB Response objects.
 * @param {DynamoDBResponse} response1
 * @param {DynamoDBResponse} response2
 */
function mergeDynamoResponses(res1, res2) {
  if (!res1) return res2;

  var result = Object.assign(
    {},
    {
      Items: get(res1, 'Items', []).concat(get(res2, 'Items', [])),
      Count: get(res1, 'Count', 0) + get(res2, 'Count', 0),
      ScannedCount: get(res1, 'ScannedCount', 0) + get(res2, 'ScannedCount', 0)
    },
    process.env.DEBUG !== undefined
      ? {
          ConsumedCapacity: {
            TableName:
              get(res1, 'ConsumedCapacity.TableName', '') ||
              get(res2, 'ConsumedCapacity.TableName', ''),
            CapacityUnits:
              get(res1, 'ConsumedCapacity.CapacityUnits', 0) +
              get(res2, 'ConsumedCapacity.CapacityUnits', 0)
          }
        }
      : {}
  );

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

  if (node === undefined) throw new Error('Node is undefined');

  if (maxGSIK < 2) return prefixTenant(tenant, 0);

  return prefixTenant(tenant, Math.abs(hashCode(node)) % maxGSIK);
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
 * List of GraphItem keys that may contain the `tenant` information.
 * @type string[]
 */
var GRAPH_ITEM_KEYS_WITH_TENANT = ['Node', 'GSIK', 'Target'];
/**
 * Removes the tenant from the item.
 * @param {GraphItem} item - Item object to parse.
 */
function parseItem(item = {}) {
  var list,
    Item =
      typeof item.Item === 'object'
        ? Object.assign({}, item.Item)
        : Object.assign({}, item);

  Object.keys(Item).forEach(key => {
    if (GRAPH_ITEM_KEYS_WITH_TENANT.indexOf(key) > -1) {
      list = Item[key].split('|');
      if (list.length > 1) {
        Item[key] = list.slice(1).join('|');
      }
    }
  });

  return typeof item.Item === 'object' ? { Item } : Item;
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
/**
 * List of common operators
 * @typedef {CommonOperators} CommonOperators.
 */
var COMMON_OPERATORS = ['=', '<', '>', '<=', '>=', 'begins_with'];
/**
 * List of array operators
 * @typedef {ArrayOperators} ArrayOperators.
 */
var ARRAY_OPERATORS = ['BETWEEN'];
/**
 * List of function operators
 * @typedef {FunctionOperators} FunctionOperators.
 */
var FUNCTIONS_OPERATORS = ['IN', 'contains', 'size'];
/**
 * List of valid where operators.
 * @typedef {WhereOperators} WhereOperators.
 */
var WHERE_OPERATORS = COMMON_OPERATORS.concat(ARRAY_OPERATORS);
/**
 * @typedef {Object} QueryCondition
 * @property {sting|string[]|number} [WhereOperators] - Query operator value.
 */
/**
 * @typedef {Object} WhereResult
 * @property {string} attribute="data"|"type" - Condition attribute.
 * @property {string} expression - Condition expression.
 * @property {string|bool|number|array} value - Consition value.
 * @property {WhereOperators} operator - Query operator value.
 */
/**
 *
 * @param {object} where - Object to parse;
 * @property {QueryCondition} [data] - Data query condition.
 * @property {QueryCondition} [type] - Type query condition.
 * @return {WhereResult} Object with the query attribute, expression, and value.
 */
function parseWhere(where = {}) {
  var attributes = where.data || where.type;
  var attribute = Object.keys(where)[0];

  if (attributes === undefined) throw new Error('Invalid attributes');

  var operator = Object.keys(attributes)[0];

  if (WHERE_OPERATORS.indexOf(operator) === -1)
    throw new Error('Invalid operator');

  var value = attributes[operator];

  if (value === undefined) throw new Error('Value is undefined');

  if (COMMON_OPERATORS.indexOf(operator) > -1 && typeof value !== 'string')
    throw new Error('Value is not a string');

  if (
    ARRAY_OPERATORS.indexOf(operator) > -1 &&
    (Array.isArray(value) === false ||
      value.length > 2 ||
      value.every(v => typeof v === 'string') === false)
  )
    throw new Error('Value is not a list with a pair of strings');

  var variable = attribute === 'type' ? 'Type' : 'Data';

  var expression =
    operator === 'begins_with'
      ? `begins_with(#${variable}, :${variable})`
      : `#${variable} ${operator} ${
          Array.isArray(value) ? ':a AND :b' : `:${variable}`
        }`;

  return { attribute, expression, value, operator };
}

function prefixTenant(tenant, string) {
  if (tenant === undefined || tenant === '')
    return string === undefined ? string => String(string) : String(string);

  return string === undefined
    ? string => tenant + '|' + string
    : tenant + '|' + String(string);
}

function btoa(string) {
  return new Buffer(string).toString('base64');
}

function atob(string) {
  return new Buffer(string, 'base64').toString('ascii');
}
