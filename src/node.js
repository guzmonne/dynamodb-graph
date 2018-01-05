'use strict';

var cuid = require('cuid');

module.exports = nodeFactory;

var { calculateGSIK } = require('./modules/utils.js');

function nodeFactory(config = {}) {
  var { documentClient, table, maxGSIK, tenant } = config;

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

      var params = {
        TableName: table,
        Item: {
          Node: id,
          Type: type,
          Data: data || prop,
          Target: target || id,
          GSIK: calculateGSIK({ node: id, maxGSIK, tenant })
        }
      };

      if (prop !== undefined) delete params.Item.Target;

      return documentClient.put(params).promise();
    }
  };
}
