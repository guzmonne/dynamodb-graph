'use strict';

var cuid = require('cuid');
var {
  calculateGSIK,
  prefixTenant,
  parseItem,
  atob,
  btoa
} = require('./modules/utils.js');

module.exports = nodeFactory;

function nodeFactory(config = {}) {
  var { documentClient, table, maxGSIK, tenant = '' } = config;
  var pTenant = prefixTenant(tenant);
  var getNodeTypes = require('./getNodeTypes.js')(config);

  return function node(options = {}) {
    var { id, type } = options;

    if (id !== undefined && typeof id !== 'string')
      throw new Error('Node ID is not a string');

    var api = {
      create,
      get,
      edges: items('edge'),
      props: items('prop'),
      all: items()
    };

    return api;

    // ---
    function get(types) {
      if (id === undefined) throw new Error('Node is undefined');
      if (type === undefined) throw new Error('Type is undefined');

      var promise =
        Array.isArray(types) === true
          ? getNodeTypes({ node: pTenant(id), types })
          : documentClient
              .get({
                TableName: table,
                Key: {
                  Node: pTenant(id),
                  Type: type
                }
              })
              .promise()
              .then(parseItem);

      return promise;
    }

    function items(itemType) {
      return function(attributes = {}) {
        if (id === undefined) throw new Error('Node ID is undefined');

        var { limit, offset } = attributes;

        var params = {
          TableName: table,
          ExpressionAttributeNames: {
            '#Node': 'Node',
            '#Target': 'Target'
          },
          ExpressionAttributeValues: {
            ':Node': pTenant(id)
          },
          KeyConditionExpression: '#Node = :Node'
        };

        if (itemType === 'edge') params.FilterExpression = '#Target <> :Node';
        else if (itemType === 'prop')
          params.FilterExpression = 'attribute_not_exists(#Target)';

        if (limit > 0) params.Limit = limit;

        if (typeof offset === 'string')
          params.ExclusiveStartKey = {
            Node: id,
            Type: atob(offset)
          };

        return documentClient
          .query(params)
          .promise()
          .then(response =>
            Object.assign(
              {},
              response,
              {
                Items: response.Items.map(parseItem)
              },
              response.LastEvaluatedKey !== undefined
                ? { Offset: btoa(response.LastEvaluatedKey.Type) }
                : {}
            )
          );
      };
    }

    function create(attributes) {
      if (attributes === undefined) throw new Error('Options is undefined');
      if (type === undefined) throw new Error('Type is undefined');

      var { data, target, prop } = attributes;

      if (
        (target !== undefined && prop !== undefined) ||
        (data !== undefined && prop !== undefined)
      )
        throw new Error(
          'Can configure `prop`, `target`, and `data` values at the same type'
        );

      id || (id = cuid());

      var item = {
        Node: pTenant(id),
        Type: type,
        Data: data || prop,
        Target: pTenant(target || id),
        GSIK: calculateGSIK({ node: id, maxGSIK, tenant })
      };

      var params = {
        TableName: table,
        Item: item
      };

      if (prop !== undefined) delete params.Item.Target;

      return documentClient
        .put(params)
        .promise()
        .then(parseItem);
    }
  };
}
