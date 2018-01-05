'use strict';

var cuid = require('cuid');
var { calculateGSIK, prefixTenant } = require('./modules/utils.js');

module.exports = nodeFactory;

function nodeFactory(config = {}) {
  var { documentClient, table, maxGSIK, tenant = '' } = config;

  return function node(options = {}) {
    var { node: id = cuid(), type } = options;

    if (id !== undefined && typeof id !== 'string')
      throw new Error('Node is not a string');

    return {
      id,
      create: create
    };

    // ---
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

      var pTenant = prefixTenant(tenant);

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

      return documentClient.put(params).promise();
    }
  };
}
