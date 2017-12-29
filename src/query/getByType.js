'use strict';

var range = require('lodash/range');
var utils = require('../modules/utils.js');

var START_GSIK = 0;
var DEFAULT_GSIK_LIST_SIZE = 10;
var LIMIT = 10;
/**
 * Factory that returns a function that attempts query the table indexed by
 * GSIK, through the `ByType` GSI, and sorted by type.
 * @param {ConfigObject} config - Main configuration object.
 * @return {function} Function that attempts to create a new node.
 */
module.exports = function getByTypeFactory(config = {}) {
  var { documentClient, table, tenant = '' } = config;

  utils.checkConfiguration(config);

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
    var attributes = {
      ':GSIK': gsik
    };

    if (Array.isArray(value) === true) {
      attributes[':a'] = value[0];
      attributes[':b'] = value[1];
    } else {
      attributes[':Type'] = value;
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
    return {
      TableName: table,
      IndexName: 'ByType',
      KeyConditionExpression: `#Node = :Node AND ${expression}`,
      ExpressionAttributeNames: {
        '#GSIK': 'GSIK',
        '#Type': 'Type'
      },
      ExpressionAttributeValues: values(gsik, value)
    };
  }

  /**
   * Function that attempts to get a Node.
   * @param {object} options - Query options.
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
      promises.push(
        documentClient
          .query(params(gsik, limit, expression, value))
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
