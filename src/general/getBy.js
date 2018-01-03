'use strict';

var range = require('lodash/range');
var utils = require('../modules/utils.js');

var START_GSIK = 0;
var DEFAULT_GSIK_LIST_SIZE = 10;
var LIMIT = 10;
/**
 * Factory that returns a function that attempts query the table indexed by
 * GSIK, through the `ByType` or `ByData` GSI, sorted by type or data.
 * @param {"Type", "Data"} index - Valid GSIK index.
 * @param {ConfigObject} config - Main configuration object.
 * @return {function} Function that attempts to create a new node.
 */
module.exports = function getByFactory(index, config = {}) {
  var { documentClient, table, tenant = '' } = config;

  utils.checkConfiguration(config);

  /**
   * Gets the correct attribute given the index and value data.
   * @param {number|string|number[]|string[]} value - Query expression value.
   * @return {string} Name of the attribute.
   */
  function getAttribute(value) {
    var data = Array.isArray(value) ? value[0] : value;
    return index === 'Type'
      ? 'Type'
      : typeof data === 'number' ? 'Number' : 'String';
  }
  /**
   * Constructs the ExpressionAttributeValues object.
   * @param {string} gsik - GSIK value.
   * @param {string|number|array} value - Expression value
   * @return {object} ExpressionAttributeValues object.
   * @property {string} :GSIK - GSIK value.
   * @property {string|number} [:Type] - Type value.
   * @property {string|number} [:a] - 'a' value.
   * @property {string|number} [:b] - 'b' value.
   */
  function values(gsik, value) {
    var attribute = getAttribute(value);
    var attributes = {
      ':GSIK': gsik
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
   * 'ByType' GSI, on one GSIK.
   * @param {string} gsik - GSIK value.
   * @param {string} expression - Type condition expression.
   * @param {number|string|array} value - Type condition value.
   */
  function params(gsik, limit, expression, value) {
    var attribute = getAttribute(value);

    return {
      TableName: table,
      IndexName: `By${attribute}`,
      KeyConditionExpression: `#GSIK = :GSIK AND ${expression}`,
      ExpressionAttributeNames: {
        '#GSIK': 'GSIK',
        [`#${attribute}`]: attribute
      },
      ExpressionAttributeValues: values(gsik, value),
      Limit: limit
    };
  }

  /**
   * Function that attempts to get a Node.
   * @param {object} options - Query options.
   * @property {number} [startGSIK=0] - Start GSIK value.
   * @property {number} [startGSIK=startGSIK + 10] - End GSIK value.
   * @property {number[]} [listGSIK] - List of GSIK values.
   * @property {number} [limit=10] - Number of items to query per GSIK.
   * @property {string} expression - Query expression.
   * @property {string|number|number[]} valye - Query expression value.
   * @return {Promise} A promise that resolves all the queries to all the
   *                   GSIKs.
   */
  return function getByType(options = {}) {
    var {
      startGSIK = START_GSIK,
      endGSIK,
      listGSIK,
      limit = LIMIT,
      expression,
      value
    } = options;

    if (expression === undefined) throw new Error('Expression is undefined');
    if (value === undefined) throw new Error('Value is undefined');
    if (typeof limit !== 'number') throw new Error('Limit is not a number');

    if (Array.isArray(listGSIK) === false) {
      if (typeof startGSIK !== 'number')
        throw new Error('Start GSIK is not a number');
      if (typeof endGSIK !== 'number')
        endGSIK = startGSIK + DEFAULT_GSIK_LIST_SIZE;
      if (endGSIK < startGSIK)
        throw new Error('Start GSIK is bigger than End GSIK');

      listGSIK = range(startGSIK, endGSIK);
    } else {
      if (listGSIK.every(v => typeof v === 'number') === false)
        throw new Error('List GSIK is not a list of numbers');
    }

    if (process.env.DEBUG) {
      params.ReturnConsumedCapacity = 'INDEXES';
      params.ReturnItemCollectionMetrics = 'SIZE';
    }

    var promises = [];

    listGSIK.forEach(i => {
      var gsik = tenant + '#' + i;
      var parameters = params(gsik, limit, expression, value);

      promises.push(
        documentClient
          .query(parameters)
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
                  [listGSIK[i]]: response.LastEvaluatedKey
                }
              : {}
          )
        }),
        {}
      )
    );
  };
};
