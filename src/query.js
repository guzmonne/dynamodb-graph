'use strict';

var { parseWhere } = require('./modules/utils.js');

module.exports = queryFactory;

// ---

function queryFactory(config = {}) {
  var { documentClient, table } = config;

  return function query(options = {}) {
    var { node, where } = options;

    if (where === undefined) throw new Error('Where is undefined');

    var { attribute, expression, value } = parseWhere(where);

    return documentClient
      .query({
        TableName: table,
        KeyConditionExpression: `#Node = :Node AND ${expression}`,
        ExpressionAttributeNames: {
          '#Node': 'Node',
          '#Type': 'Type'
        },
        ExpressionAttributeValues: expressionValues({ node, value })
      })
      .promise();
  };
}

function expressionValues({ node, value }) {
  var values = {};

  if (node !== undefined) values[':Node'] = node;

  if (Array.isArray(value)) {
    values[':a'] = value[0];
    values[':b'] = value[1];
  } else {
    values[':Type'] = value;
  }

  return values;
}
