'use strict';

var cuid = require('cuid');
var { calculateGSIK, prefixTenant, parseItem } = require('./modules/utils.js');

module.exports = nodeFactory;

function nodeFactory(config = {}) {
  var { documentClient, table, maxGSIK, tenant = '' } = config;
  var pTenant = prefixTenant(tenant);

  return function node(options = {}) {
    var { id, type } = options;

    if (id !== undefined && typeof id !== 'string')
      throw new Error('Node ID is not a string');
    if (type === undefined) throw new Error('Type is undefined');

    var api = {
      create,
      get
    };

    return api;

    // ---
    function get() {
      if (id === undefined) throw new Error('Node is undefined');

      return documentClient
        .get({
          TableName: table,
          Key: {
            Node: pTenant(id),
            Type: type
          }
        })
        .promise()
        .then(parseItem);
    }

    get.prototype.edges = function() {};

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
