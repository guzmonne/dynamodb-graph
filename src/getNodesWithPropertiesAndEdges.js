'use strict';

var Rx = require('rxjs/Rx');
var getNodesWithTypeOnGSI = require('./getNodesWithTypeOnGSI.js');
var getNodePropertiesAndEdges = require('./getNodePropertiesAndEdges.js');
var { mergeDynamoResponses } = require('./modules/utils.js');

/**
 * Factory function that returns a function that retrieves
 * all the nodes that exist for a given type, including all its properties and
 * its edges.
 * The maxGSIK is mandatory to check all the possible GSIK where the types
 * might be stored.
 * The table name can be provided while calling the factory, or it can use an
 * environment variable called TABLE_NAME.
 * Gets all the nodes and edges type associated to a node.
 * @param {DBConfig} options - Database driver and table configuration.
 * @returns {function} Function ready to put Node on a DynamoDB table.
 * @param {object} config - Property configuration object.
 * @property {string} tenant - Identifier of the current tenant.
 * @property {string} type - Type to look for.
 * @property {number} maxGSIK - GSIK number to look in.
 * @returns {promise} With the data returned from the database.
 */
module.exports = function getNodesWithPropertiesAndEdges(options) {
  var { db, table = process.env.TABLE_NAME } = options;

  return config =>
    new Promise((resolve, reject) => {
      var { tenant, type, maxGSIK } = config;

      if (maxGSIK === undefined) throw new Error('Max GSIK is undefined');
      if (type === undefined) throw new Error('Type is undefined');

      var getNodesWithTypeOnGSI$$ = getNodesWithTypeOnGSI$(
        tenant,
        type,
        options
      );

      var getNodePropertiesAndEdges$$ = getNodePropertiesAndEdges$(options);

      Rx.Observable.range(0, maxGSIK)
        .map(toGSIK(tenant))
        .mergeMap(getNodesWithTypeOnGSI$$)
        .mergeMap(response =>
          Rx.Observable.from(response.Items)
            .mergeMap(item => {
              item.Properties = [];
              item.Edges = [];
              return getNodePropertiesAndEdges$$(item.Node).map(response => {
                response.Items.forEach(subItem => {
                  let key =
                    subItem.Target === undefined ? 'Properties' : 'Edges';
                  item[key].push(subItem);
                });
                return item;
              });
            })
            .reduce(() => response)
        )
        .reduce(mergeDynamoResponses)
        .subscribe(resolve, reject);
    });
};

function getNodesWithTypeOnGSI$(tenant, type, options) {
  return gsik =>
    Rx.Observable.fromPromise(
      getNodesWithTypeOnGSI(options)({ gsik, tenant, type })
    );
}

function getNodePropertiesAndEdges$(options) {
  var getNodePropertiesAndEdgesPromise = getNodePropertiesAndEdges(options);
  return node =>
    Rx.Observable.fromPromise(getNodePropertiesAndEdgesPromise(node));
}

function toGSIK(tenant) {
  return i => tenant + '#' + i;
}
