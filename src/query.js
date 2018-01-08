'use strict';

var {
  parseWhere,
  parseAnd,
  prefixTenant: prefixTenantFactory
} = require('./modules/utils.js');

module.exports = queryFactory;

// ---

function queryFactory(config = {}) {
  var { documentClient, table, tenant } = config;

  var prefixTenant = prefixTenantFactory(tenant);

  return query;

  // ---
  /**
   *
   * @param {object} options - Query options object.
   * @property {string} [node] - Node identifier.
   * @property {WhereObject} where - Where expression object.
   * @property {AndObject} and - And expression object.
   * @return {Promise} Query results.
   */
  function query(options = {}) {
    var { node, where, and } = options;

    if (where === undefined) throw new Error('Where is undefined');

    var { expression: whereExpression, value: whereValue } = parseWhere(where);

    var attributeValues;
    var attributeNames = {
      '#Node': 'Node',
      '#Type': 'Type'
    };
    var expression = `#Node = :Node AND ${whereExpression}`;
    var params = {
      TableName: table
    };

    if (and !== undefined) {
      if (typeof and !== 'object') throw new Error('And is not an object');

      var { expression: andExpression, value: andValue } = parseAnd(and);

      attributeNames['#Data'] = 'Data';
      attributeValues = expressionValues({ node, whereValue, andValue });

      params.FilterExpression = andExpression;
    }

    if (attributeValues === undefined)
      attributeValues = expressionValues({ node, whereValue });

    params.KeyConditionExpression = expression;
    params.ExpressionAttributeNames = attributeNames;
    params.ExpressionAttributeValues = attributeValues;

    return documentClient.query(params).promise();
  }
  /**
   *
   * @param {object} params - Params object.
   * @property {string} [node] - Node identifier.
   * @property {string|string[]|number} whereValue - Where expression value.
   * @property {string|string[]|number} [andValue] - And expression value.
   * @returns {object} DynamoDB ExpressionAttributeValues object.
   */
  function expressionValues(params) {
    var { node, whereValue, andValue } = params;
    var values = {};

    if (node !== undefined) values[':Node'] = prefixTenant(node);

    if (Array.isArray(whereValue)) {
      values[':a'] = whereValue[0];
      values[':b'] = whereValue[1];
    } else {
      values[':Type'] = whereValue;
    }

    if (andValue !== undefined) {
      if (Array.isArray(andValue) === true)
        andValue.forEach((value, i) => (values[`:x${i}`] = value));
      else values[':Data'] = andValue;
    }

    return values;
  }
}
