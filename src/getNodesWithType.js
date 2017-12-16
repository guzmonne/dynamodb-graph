'use strict';

var Rx = require('rxjs/Rx');
var getNodesWithTypeOnGSI = require('./getNodesWithTypeOnGSI.js');
var { mergeDynamoResponses } = require('./modules/utils.js');
/**
 * Factory function that returns a function that follows calls a GSI to retrieve
 * all the nodes that exist of the a given type. The maxGSIK is mandatory to
 * check all the possible GSIK where the types might be stored.
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
module.exports = function getNodesWithType(options) {
  return config => {
    return new Promise((resolve, reject) => {
      var { tenant, type, maxGSIK } = config;
      if (!maxGSIK) throw new Error('Max GSIK is undefined');
      var getNodesWithTypePromise = getNodesWithTypeOnGSI(options);
      Rx.Observable.range(0, maxGSIK)
        .map(i => tenant + '#' + i)
        .mergeMap(gsik =>
          Rx.Observable.fromPromise(getNodesWithTypePromise({ gsik, type }))
        )
        .reduce(mergeDynamoResponses)
        .subscribe({
          next: resolve,
          error: reject
        });
    });
  };
};
