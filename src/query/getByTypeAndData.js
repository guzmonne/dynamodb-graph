'use strict';

var range = require('lodash/range');
var utils = require('../modules/utils.js');

var START_TGSIK = 0;
var DEFAULT_TGSIK_LIST_SIZE = 10;
var LIMIT = 10;
/**
 * Factory that returns a function that attempts query the table indexed by
 * TGSIK, through the `ByTypeAndData` GSI, sorted by data.
 * @param {"Type", "Data"} index - Valid TGSIK index.
 * @param {ConfigObject} config - Main configuration object.
 * @return {function} Function that attempts to create a new node.
 */
module.exports = function getByTypeAndDataFactory(config = {}) {
  var { documentClient, table, tenant = '' } = config;

  utils.checkConfiguration(config);

  /**
   * Gets the correct attribute given the index and value data.
   * @param {number|string|number[]|string[]} value - Query expression value.
   * @return {string} Name of the attribute.
   */
  function getAttribute(value) {
    return typeof (Array.isArray(value) ? value[0] : value) === 'number'
      ? 'Number'
      : 'String';
  }
  /**
   * Constructs the ExpressionAttributeValues object.
   * @param {string} gsik - TGSIK value.
   * @param {string|number|array} value - Expression value
   * @return {object} ExpressionAttributeValues object.
   * @property {string} :TGSIK - TGSIK value.
   * @property {string|number} [:Type] - Type value.
   * @property {string|number} [:a] - 'a' value.
   * @property {string|number} [:b] - 'b' value.
   */
  function values(tgsik, value) {
    var attribute = getAttribute(value);
    var attributes = {
      ':TGSIK': tgsik
    };

    if (Array.isArray(value) === true) {
      attributes[':a'] = value[0];
      attributes[':b'] = value[1];
    } else {
      attributes[`:${attribute}`] = value;
    }

    return attributes;
  }
  /**
   * Constructs a valid DynamoDB query params object to interact with the
   * 'ByType' GSI, on one TGSIK.
   * @param {string} gsik - TGSIK value.
   * @param {string} expression - Type condition expression.
   * @param {number|string|array} value - Type condition value.
   */
  function params(tgsik, limit, expression, value) {
    var attribute = getAttribute(value);

    return {
      TableName: table,
      IndexName: `ByTypeAnd${attribute}`,
      KeyConditionExpression: `#TGSIK = :TGSIK AND ${expression}`,
      ExpressionAttributeNames: {
        '#TGSIK': 'TGSIK',
        [`#${attribute}`]: attribute
      },
      ExpressionAttributeValues: values(tgsik, value),
      Limit: limit
    };
  }

  /**
   * Function that attempts to get a Node.
   * @param {object} options - Query options.
   * @property {number} [startTGSIK=0] - Start TGSIK value.
   * @property {number} [startTGSIK=startTGSIK + 10] - End TGSIK value.
   * @property {number[]} [listTGSIK] - List of TGSIK values.
   * @property {number} [limit=10] - Number of items to query per TGSIK.
   * @property {string} expression - Query expression.
   * @property {string|number|number[]} valye - Query expression value.
   * @return {Promise} A promise that resolves all the queries to all the
   *                   TGSIKs.
   */
  return function getByTypeAndDataType(options = {}) {
    var {
      type,
      startTGSIK = START_TGSIK,
      endTGSIK,
      listTGSIK,
      limit = LIMIT,
      expression,
      value
    } = options;

    if (type === undefined) throw new Error('Type is undefined');
    if (expression === undefined) throw new Error('Expression is undefined');
    if (value === undefined) throw new Error('Value is undefined');
    if (typeof limit !== 'number') throw new Error('Limit is not a number');

    if (Array.isArray(listTGSIK) === false) {
      if (typeof startTGSIK !== 'number')
        throw new Error('Start TGSIK is not a number');
      if (typeof endTGSIK !== 'number')
        endTGSIK = startTGSIK + DEFAULT_TGSIK_LIST_SIZE;
      if (endTGSIK < startTGSIK)
        throw new Error('Start TGSIK is bigger than End TGSIK');

      listTGSIK = range(startTGSIK, endTGSIK);
    } else {
      if (listTGSIK.every(v => typeof v === 'number') === false)
        throw new Error('List TGSIK is not a list of numbers');
    }

    if (process.env.DEBUG) {
      params.ReturnConsumedCapacity = 'INDEXES';
      params.ReturnItemCollectionMetrics = 'SIZE';
    }

    var promises = [];

    listTGSIK.forEach(i => {
      var tgsik = tenant + '#' + type + '#' + i;
      promises.push(
        documentClient
          .query(params(tgsik, limit, expression, value))
          .promise()
          .then(utils.parseResponse)
      );
    });

    return Promise.all(promises).then((responses = []) =>
      responses.reduce(
        (acc, response = {}, i) => ({
          Count: (acc.Count || 0) + (response.Count || 0),
          ScannedCount: (acc.Count || 0) + (response.Count || 0),
          Items: (acc.Items || []).concat(response.Items || []),
          LastEvaluatedKeys: Object.assign(
            {},
            acc.LastEvaluatedKeys,
            response.LastEvaluatedKey !== undefined
              ? {
                  [listTGSIK[i]]: response.LastEvaluatedKey
                }
              : {}
          )
        }),
        {}
      )
    );
  };
};
