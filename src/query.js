'use strict';

var capitalize = require('lodash/capitalize.js');
var range = require('lodash/range.js');
var {
  btoa,
  mergeDynamoResponses,
  parseItem,
  parseConditionObject,
  prefixTenant: prefixTenantFactory
} = require('./modules/utils.js');

module.exports = queryFactory;

// ---

/**
 * Query factory that returns a `query` function, configured with the global
 * options.
 * @param {object} config - Global configuration object.
 * @return {function} Configured `query` function.
 */
function queryFactory(config = {}) {
  var { documentClient, table, tenant, maxGSIK } = config;

  var prefixTenant = prefixTenantFactory(tenant);

  return query;

  // ---
  /**
   *
   * @param {object} options - Query options object.
   * @property {string} [node] - Node identifier.
   * @property {ConditionObject} where - Where expression object.
   * @property {ConditionObject} [filter] - Filter expression object.
   * @property {number} [limit] - Limit value to use when querying a Node.
   * @return {Promise} Query results.
   */
  function query(options = {}) {
    var { node } = options;

    if (node !== undefined) return nodeQuery(options);

    var { where, filter, gsik = {} } = options;

    var { startGSIK = 0, endGSIK = maxGSIK, listGSIK, limit } = gsik;

    if (startGSIK >= endGSIK)
      throw new Error('Start GSIK must be smaller than end GSIK');

    if (Array.isArray(listGSIK) === false) {
      listGSIK = range(startGSIK, endGSIK);
    }

    var promises = [];

    listGSIK.forEach(i => {
      var params = gsikParams(`${i}`);

      applyWhereCondition(params, where);

      if (filter !== undefined) {
        applyFilterCondition(params, filter);
      }

      if (limit > 0) params.Limit = limit;

      promises.push(
        documentClient
          .query(params)
          .promise()
          .then(parseResponse())
      );
    });

    return Promise.all(promises).then(mergeResponses);
  }

  function nodeQuery(options = {}) {
    var { node, where, filter, limit, offset } = options;

    var params = {
      TableName: table,
      KeyConditionExpression: '#Node = :Node',
      ExpressionAttributeNames: {
        '#Node': 'Node'
      },
      ExpressionAttributeValues: {
        ':Node': prefixTenant(node)
      }
    };

    if (limit > 0) params.Limit = limit;

    if (offset !== undefined)
      params.ExclusiveStartKey = {
        Node: prefixTenant(node),
        Type: typeof offset === 'string' ? atob(offset) : offset.Type
      };

    applyWhereCondition(params, where, node);

    if (filter !== undefined) {
      applyFilterCondition(params, filter);
    }

    return documentClient
      .query(params)
      .promise()
      .then(parseResponse(node));
  }
  /**
   * Applies the where condition into the DynamoDB params object.
   * @param {object} params - DynamoDB query params object.
   * @param {object} where - Where condition object.
   */
  function applyWhereCondition(params, where, node) {
    if (where === undefined) throw new Error('Where is undefined');

    var { attribute, expression, value } = parseConditionObject(where);

    attribute = capitalize(attribute);

    if (attribute === 'Type')
      params.KeyConditionExpression += ` AND ${expression}`;
    else {
      if (node !== undefined) params.FilterExpression = expression;
      else params.KeyConditionExpression += ` AND ${expression}`;
    }

    params.ExpressionAttributeNames['#' + attribute] = attribute;

    if (Array.isArray(value)) {
      params.ExpressionAttributeValues[':a'] = value[0];
      params.ExpressionAttributeValues[':b'] = value[1];
    } else {
      params.ExpressionAttributeValues[`:${attribute}`] = value;
    }
  }
  /**
   * Applies the filter condition into the DynamoDB params object recursively.
   * @param {object} params - DynamoDB query params object.
   * @param {object} filter - Filter condition object.
   */
  function applyFilterCondition(params, filter) {
    recursiveApply(filter);
    // ---
    /**
     * Applies the filter condition into the DynamoDB params object.
     * @param {object} filter - Filter condition object.
     * @param {string} [logicOperator] - Logic operator used to concatenate the
     *                                   condition to the current
     *                                   FilterExpression.
     * @param {number} [level=0] - Current recursive condition level.
     */
    function recursiveApply(filter, logicOperator, level = 0) {
      if (typeof filter !== 'object')
        throw new Error('Filter is not an object');

      var nested = level > 0;

      var { attribute, expression, value, operator } = parseConditionObject(
        filter,
        level
      );

      attribute = capitalize(attribute);

      params.ExpressionAttributeNames['#' + attribute] = attribute;

      if (Array.isArray(value) === true)
        if (operator === 'BETWEEN') {
          params.ExpressionAttributeValues[`:${nested ? `y${level}0` : `a`}`] =
            value[0];
          params.ExpressionAttributeValues[`:${nested ? `y${level}1` : `b`}`] =
            value[1];
        } else
          value.forEach((v, i) => {
            params.ExpressionAttributeValues[
              `:${nested ? `y${level}` : `x`}${i}`
            ] = v;
          });
      else
        params.ExpressionAttributeValues[
          `:${nested ? `y${level}` : attribute}`
        ] = value;

      if (nested) {
        params.FilterExpression += ` ${logicOperator.toUpperCase()} ${expression}`;
      } else {
        params.FilterExpression = expression;
      }

      var logicalExpression = Object.keys(filter).filter(
        key => key !== 'data' && key !== 'type'
      );

      if (logicalExpression.length > 0)
        logicalExpression
          .slice(0, 1)
          .forEach(key => recursiveApply(filter[key], key, level + 1));
    }
  }
  /**
   * Removes tenant information and adds the Offset value to the response.
   * @param {object} response - DynamoDB response object.
   */
  function parseResponse(node) {
    return function(response) {
      return Object.assign(
        {},
        response,
        {
          Items: response.Items.map(parseItem)
        },
        response.LastEvaluatedKey !== undefined
          ? parseLastEvaluatedKey(response.LastEvaluatedKey, node)
          : {}
      );
    };
  }
  /**
   * Constructs the default DynamoDB GSIK query params object.
   * @param {string} gsik - GSIK number.
   */
  function gsikParams(gsik) {
    return {
      TableName: table,
      KeyConditionExpression: '#GSIK = :GSIK',
      ExpressionAttributeNames: {
        '#GSIK': 'GSIK'
      },
      ExpressionAttributeValues: {
        ':GSIK': prefixTenant(gsik)
      },
      Limit: 100
    };
  }

  function parseLastEvaluatedKey(key, node) {
    var key = parseItem(key);

    var result = {
      LastEvaluatedKey: key
    };

    if (node !== undefined) {
      result.Offset = btoa(response.LastEvaluatedKey.Type);
      return result;
    }

    var { Node, Data, Type, GSIK } = key;

    result.Offset = btoa(`${GSIK}|${Node}|${Type || Data}`);

    return result;
  }

  function mergeResponses(responses) {
    return responses.reduce(
      (acc, response) => {
        var { Offset, LastEvaluatedKey } = response;

        acc.Items = acc.Items.concat(response.Items);
        acc.Count += response.Count;
        acc.ScannedCount += response.ScannedCount;

        if (Offset !== undefined)
          acc.Offset =
            acc.Offset !== undefined
              ? acc.Offset + response.Offset
              : response.Offset;

        if (LastEvaluatedKey !== undefined) {
          var { GSIK } = LastEvaluatedKey;
          acc.LastEvaluatedKeys =
            acc.LastEvaluatedKeys !== undefined
              ? Object.assign(acc.LastEvaluatedKeys, {
                  [GSIK]: LastEvaluatedKey
                })
              : { [GSIK]: LastEvaluatedKey };
        }

        return acc;
      },
      {
        Items: [],
        Count: 0,
        ScannedCount: 0
      }
    );
  }
}
