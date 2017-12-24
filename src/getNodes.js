'use strict';

var Rx = require('rxjs/Rx');
var getNodesByGSIK = require('./getNodesByGSIK.js');
var { mergeDynamoResponses } = require('./modules/utils.js');
/**
 * Factory function that returns a function that retrieves
 * all the nodes that exist for a given type.
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
module.exports = function getNodes(options) {
  var getNodesPromise = getNodesByGSIK(options);
  return config => {
    return new Promise((resolve, reject) => {
      var { tenant, type, maxGSIK } = config;

      if (maxGSIK === undefined) throw new Error('Max GSIK is undefined');

      Rx.Observable.range(0, maxGSIK)
        .map(i => tenant + '#' + i)
        .mergeMap(gsik =>
          Rx.Observable.fromPromise(getNodesPromise({ gsik, type }))
        )
        .reduce(mergeDynamoResponses)
        .subscribe({
          next: resolve,
          error: reject
        });
    });
  };
};
