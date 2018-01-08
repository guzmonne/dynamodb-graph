'use strict';

var {
  parseConditionObject,
  parseConditionObject,
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

    var {
      attribute,
      expression: whereExpression,
      value: whereValue
    } = parseConditionObject(where);

    var dataQuery = attribute === 'data';
    var whereAttributeName = `#${dataQuery ? 'Data' : 'Type'}`;
    var whereAttributeValue = `${dataQuery ? 'Data' : 'Type'}`;

    var attributeValues;
    var attributeNames = {
      '#Node': 'Node',
      [whereAttributeName]: whereAttributeValue
    };
    var expression = `#Node = :Node${
      dataQuery ? '' : ` AND ${whereExpression}`
    }`;
    var params = {
      TableName: table
    };

    if (and !== undefined) {
      if (typeof and !== 'object') throw new Error('And is not an object');

      var { expression: andExpression, value: andValue } = parseConditionObject(
        and
      );

      var andAttributeName = `#${dataQuery ? 'Type' : 'Data'}`;
      var andAttributeValue = `${dataQuery ? 'Type' : 'Data'}`;

      attributeNames[andAttributeName] = andAttributeValue;
      attributeValues = expressionValues({
        node,
        whereValue,
        andValue,
        dataQuery
      });

      params.FilterExpression = andExpression;
    }

    if (attributeValues === undefined)
      attributeValues = expressionValues({
        node,
        whereValue,
        dataQuery
      });

    if (dataQuery && params.FilterExpression === undefined)
      params.FilterExpression = whereExpression;

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
   * @property {bool} [dataQuery=false] - Flag indicating that the user is
   *                                      quering over the data..
   * @returns {object} DynamoDB ExpressionAttributeValues object.
   */
  function expressionValues(params) {
    var { node, whereValue, andValue, dataQuery = false } = params;
    var values = {};

    if (node !== undefined) values[':Node'] = prefixTenant(node);

    if (Array.isArray(whereValue)) {
      values[':a'] = whereValue[0];
      values[':b'] = whereValue[1];
    } else {
      values[`:${dataQuery === true ? 'Data' : 'Type'}`] = whereValue;
    }

    if (andValue !== undefined) {
      if (Array.isArray(andValue) === true)
        andValue.forEach((value, i) => (values[`:x${i}`] = value));
      else values[`:${dataQuery === true ? 'Type' : 'Data'}`] = andValue;
    }

    return values;
  }
}
