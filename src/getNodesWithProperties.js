'use strict';

var Rx = require('rxjs/Rx');
var getNodesByGSIK = require('./getNodesByGSIK.js');
var getNodeProperties = require('./getNodeProperties.js');
var { mergeDynamoResponses } = require('./modules/utils.js');

/**
 * Factory function that returns a function that retrieves
 * all the nodes that exist for a given type, including all its properties.
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
module.exports = function getNodesWithProperties(options) {
  var { db, table = process.env.TABLE_NAME } = options;
  return config => {
    return new Promise((resolve, reject) => {
      var { maxGSIK, tenant, type } = config;
      if (maxGSIK === undefined) throw new Error('Max GSIK is undefined');
      var getNodesByGSIKPromise = getNodesByGSIK(options);
      var getNodePropertiesPromise = getNodeProperties(options);
      Rx.Observable.range(0, maxGSIK)
        .map(i => tenant + '#' + i)
        .mergeMap(gsik =>
          Rx.Observable.fromPromise(
            getNodesByGSIKPromise({ gsik, tenant, type })
          )
        )
        .reduce(mergeDynamoResponses)
        .switchMap(result =>
          Rx.Observable.from(result.Items.map(item => item.Node))
            .mergeMap(node =>
              Rx.Observable.fromPromise(getNodePropertiesPromise(node)).map(
                response => {
                  var current = result.Items.find(item => item.Node === node);
                  response.Items.forEach(item => {
                    current[item.Type] = JSON.parse(item.Data);
                  });
                  return current;
                }
              )
            )
            .reduce(() => result)
        )
        .subscribe({
          next: resolve,
          error: reject
        });
    });
  };
};
