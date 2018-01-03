'use stict';

var chunk = require('lodash/chunk.js');
var get = require('lodash/get.js');
var utils = require('../modules/utils.js');

var TIMEOUT = process.env.TIMEOUT || 2; // ms
var MAX_RETRIES = process.env.MAX_RETRIES || 10;

/**
 * Factory that returns a function that attempts to get a bunch of Node items
 * by type.
 * @param {function} item - Item creator function.
 * @param {ConfigObject} config - Main configuration object.
 * @return {function} Function that attempts to create a new node.
 */
module.exports = function getNodeTypesFactory(config) {
  var { documentClient, table } = config;

  utils.checkConfiguration(config);

  /**
   * Function that queries the DynamoDB table recursively. If one of the
   * queries returns with an UnprocessedKeys list of items, it runs the
   * query again, asking for the remaining types. The process continues until
   * more than 10 retries are attempted, or all the items have been found.
   * @param {string[]} types - List of types to get
   * @return {Promise} Resolves to a DynamoDB response with all the types.
   */
  function batchGetHandler(node, types) {
    var retries = 0;
    var accumulatedResponses = [];

    // First recursive iteration.
    return recursive(types);
    /**
     * Recursive Function that queries the DynamoDB table, to get the types.
     * If one of the queries returns with an UnprocessedKeys list of items, it
     * runs the query again, asking for the remaining types. The process
     * continues until more than 10 retries are attempted, or all the items
     * have been found.
     * @param {string[]} types - List of types to get
     * @return {Promise} Resolves to a DynamoDB response with all the types.
     */
    function recursive(types) {
      var params = {
        RequestItems: {
          [table]: {
            Keys: types.map(type => ({
              Node: node,
              Type: type
            }))
          }
        }
      };

      if (process.env.DEBUG) {
        params.ReturnConsumedCapacity = 'INDEXES';
        params.ReturnItemCollectionMetrics = 'SIZE';
      }

      return new Promise((resolve, reject) => {
        return Promise.resolve()
          .then(() => documentClient.batchGet(params).promise())
          .then((response = {}) => {
            // Accumulate results.
            accumulatedResponses = accumulatedResponses.concat(
              response.Responses[table]
            );
            // Check if some keys were left unprocessed.
            if (
              Array.isArray(response.UnprocessedKeys) === true &&
              response.UnprocessedKeys.length > 0
            ) {
              // Throw if this is the MAX_RETRIES attempt.
              if (retries === MAX_RETRIES)
                throw new Error('More than 10 retries while running the query');
              retries += 1;
              // Exponential backoff timeout.
              return new Promise(res =>
                setTimeout(() => res(), TIMEOUT * Math.pow(2, retries))
              ).then(() =>
                recursive(response.UnprocessedKeys.map(key => key.Type))
              );
            }
          })
          .then(() => ({ Items: accumulatedResponses }))
          .then(utils.parseResponse)
          .then(resolve)
          .catch(reject);
      });
    }
  }
  /**
   * Functions that attempts to get various types of items from the table.
   * @param {object} options - Options configuration object.
   * @property {string} node - Node identifier.
   * @property {string[]} types - List of node types to get.
   * @return {Promise} BatchGet DynamoDB request promise.
   */
  return function getNodeTypes(options = {}) {
    var { node, types } = options;

    if (node === undefined) throw new Error('Node is undefined');
    if (Array.isArray(types) === false) throw new Error('Types is not a list');

    return Promise.all(
      chunk(types, 100).map(chunk => {
        var results = [];
        return batchGetHandler(node, chunk);
      })
    ).then(responses => {
      var items = responses.reduce(
        (acc, { Items = [] }) => acc.concat(Items),
        []
      );
      return {
        Items: items,
        Count: items.length,
        ScannedCount: items.length
      };
    });
  };
};
