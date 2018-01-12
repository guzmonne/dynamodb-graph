'use strict';

var range = require('lodash/range.js');
var get = require('lodash/get.js');
var capitalize = require('lodash/capitalize.js');
var { hex2num } = require('hex-2-num');

/**
 * List of valid Node attributes to filter by.
 * @typedef {string[]} ValidAttributesToFilterBy
 */
var VALID_ATTRIBUTES_TO_FILTER_BY = ['node', 'target', 'type', 'data'];
/**
 * List of common operators
 * @typedef {string[]} CommonOperators.
 */
var COMMON_OPERATORS = ['=', '<', '>', '<=', '>='];
/**
 * List of array operators
 * @typedef {string[]} ArrayOperators.
 */
var ARRAY_OPERATORS = ['BETWEEN', 'IN'];
/**
 * List of function operators
 * @typedef {string[]} FunctionOperators.
 */
var FUNCTIONS_OPERATORS = ['begins_with', 'contains', 'size'];
/**
 * List of valid and operators.
 * @typedef {string[]} Operator.
 */
var OPERATORS = COMMON_OPERATORS.concat(ARRAY_OPERATORS, FUNCTIONS_OPERATORS);

module.exports = {
  atob,
  btoa,
  calculateGSIK,
  checkConfiguration,
  hashCode,
  parseItem,
  parseResponse,
  parseConditionObject,
  prefixTenant,
  get _operators() {
    return OPERATORS.slice();
  }
};

// ---
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
 * Regular expression used to test if the Data attribute has been stored as an
 * hexadecimal string.
 * @type RegExp
 */
var HEX_REGEXP = /^0x/;
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

    if (key === 'Data' && HEX_REGEXP.test(Item[key]) === true)
      try {
        Item.Data = hex2num(Item.Data);
      } catch (err) {
        console.log(err.name);
        console.log(err.message);
        console.log(err.stack);
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
 * @typedef {Object} QueryCondition
 * @property {sting|string[]|number} [(Operator)] - Query operator value.
 */
/**
 * @typedef {Object} ConditionExpressionResults
 * @property {string} attribute="data"|"type" - Condition attribute.
 * @property {string} expression - Condition expression.
 * @property {string|bool|number|array} value - Consition value.
 * @property {Operator} operator - Query operator value.
 */
/**
 * Parses a `where` or `and` object expression.
 * @param {object} objectExpression - Object to parse;
 * @property {QueryCondition} [data] - Data query condition.
 * @property {QueryCondition} [type] - Type query condition.
 * @property {number} [level=0] - Condition nesting level.
 * @return {ConditionExpressionResults} Object with the query attribute,
 *                                      expression, and value.
 */
function parseConditionObject(objectExpression = {}, level = 0) {
  //var attributes = objectExpression.data || objectExpression.type;
  var attribute = Object.keys(objectExpression)[0];
  var attributes = objectExpression[attribute];

  if (typeof attributes !== 'object') throw new Error('Invalid attributes');

  var operator = Object.keys(attributes)[0];

  if (OPERATORS.indexOf(operator) === -1) throw new Error('Invalid operator');

  var value = attributes[operator];

  if (value === undefined) throw new Error('Value is undefined');

  if (COMMON_OPERATORS.indexOf(operator) > -1 && typeof value !== 'string')
    throw new Error('Value is not a string');

  if (
    ARRAY_OPERATORS.indexOf(operator) > -1 &&
    (Array.isArray(value) === false ||
      value.every(v => typeof v === 'string') === false)
  )
    throw new Error('Value is not a list of strings');

  var variable = capitalize(attribute);
  var nested = level > 0;

  var expression;

  if (COMMON_OPERATORS.indexOf(operator) > -1)
    expression = `#${variable} ${operator} :${level ? `y${level}` : variable}`;

  if (ARRAY_OPERATORS.indexOf(operator) > -1)
    expression = `#${variable} ${operator} ${
      operator === 'BETWEEN'
        ? level ? `:y${level}0 AND :y${level}1` : ':a AND :b'
        : range(0, value.length)
            .map(i => (level ? `:y${level}${i}` : `:x${i}`))
            .join(', ')
    }`;

  if (FUNCTIONS_OPERATORS.indexOf(operator) > -1)
    expression =
      operator === 'size'
        ? `size(#${variable}) = :${level ? `y${level}` : variable}`
        : `${operator}(#${variable}, :${level ? `y${level}` : variable})`;

  if (expression === undefined) throw new Error('Invalid opertator');

  return { attribute, expression, value, operator };
}
/**
 * Returns either a prefixated string or a function that can apply a prefix to
 * a given string.
 * @param {string} tenant - Tenant identifier.
 * @param {string} string - String to prefix.
 * @return {string|function} Prefixated string, or prefix function.
 */
function prefixTenant(tenant, string) {
  if (tenant === undefined || tenant === '')
    return string === undefined ? string => String(string) : String(string);

  return string === undefined
    ? string => tenant + '|' + string
    : tenant + '|' + String(string);
}
/**
 * Encodes a string to base64
 * @param {string} string - String to encode as a base64 string.
 * @return Base64 encoded string.
 */
function btoa(string) {
  return new Buffer(string).toString('base64');
}
/**
 * Decodes a base64 string back to ascii.
 * @param {string} string - String to decode from base64 to ascii.
 * @return {string} Decoded base64 string.
 */
function atob(string) {
  return new Buffer(string, 'base64').toString('ascii');
}
