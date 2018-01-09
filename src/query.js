'use strict';

var capitalize = require('lodash/capitalize.js');
var {
  btoa,
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
  var { documentClient, table, tenant } = config;

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

    if (node !== undefined) {
      if (limit > 0) params.Limit = limit;
      if (offset !== undefined)
        params.ExclusiveStartKey = {
          Node: prefixTenant(node),
          Type: typeof offset === 'string' ? atob(offset) : offset.Type
        };
    }

    applyWhereCondition(params, where, node);

    if (filter !== undefined) {
      applyFilterCondition(params, filter, node);
    }

    return documentClient
      .query(params)
      .promise()
      .then(parseResponse);
  }
  /**
   * Applies the where condition into the DynamoDB params object.
   * @param {object} params - DynamoDB query params object.
   * @param {object} where - Where condition object.
   * @param {string} node - Node identifier.
   */
  function applyWhereCondition(params, where, node) {
    if (where === undefined) throw new Error('Where is undefined');

    var { attribute, expression, value } = parseConditionObject(where);

    attribute = capitalize(attribute);

    if (node !== undefined) {
      if (attribute === 'Type')
        params.KeyConditionExpression += ` AND ${expression}`;
      else if (attribute === 'Data') params.FilterExpression = expression;
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
  function parseResponse(response) {
    return Object.assign(
      {},
      response,
      {
        Items: response.Items.map(parseItem)
      },
      response.LastEvaluatedKey !== undefined
        ? { Offset: btoa(response.LastEvaluatedKey.Type) }
        : {}
    );
  }
}
