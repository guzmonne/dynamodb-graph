'use stict';

var chunk = require('lodash/chunk.js');
var get = require('lodash/get.js');
var utils = require('../modules/utils.js');

/**
 * Factory that returns a function that attempts to get a bunch of Node items
 * by type.
 * @param {function} item - Item creator function.
 * @param {ConfigObject} config - Main configuration object.
 * @return {function} Function that attempts to create a new node.
 */
module.exports = function getNodeTypesFactory(config) {
  var { tenant = '', documentClient, table } = config;

  function batchGetNodePromise(node, types, previousResponse) {
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
      return documentClient
        .batchGet(params)
        .promise()
        .then(response => {
          if (typeof previousResponse === 'object') {
            var accumulatedResponses = {
              Count:
                get(previousResponse, 'Count', 0) + get(response, 'Count', 0),
              ScannedCount:
                get(previousResponse, 'ScannedCount', 0) +
                get(response, 'ScannedCount', 0),
              Items: get(previousResponse, 'Items', []).concat(
                get(response, 'Items', [])
              )
            };

            if (response.UnprocessedKeys)
              accumulatedResponses.UnprocessedKeys = response.UnprocessedKeys;

            return accumulatedResponses;
          }
          return response;
        })
        .then(response => {
          if (Array.isArray(response.UnprocessedKeys) === true)
            return batchGetNodePromise(
              node,
              response.UnprocessedKeys,
              response
            );
          return response;
        })
        .then(utils.parseResponse)
        .then(resolve)
        .catch(reject);
    });
  }

  utils.checkConfiguration(config);

  /**
   * Functions that attempts to get various types of items from the table.
   * @return {Promise} BatchGet DynamoDB request promise.
   */
  return function getNodeTypes(options = {}) {
    var { node, types } = options;

    if (node === undefined) throw new Error('Node is undefined');
    if (Array.isArray(types) === false) throw new Error('Types is not a list');

    return Promise.all(
      chunk(types, 100).map(chunk => {
        var results = [];
        return batchGetNodePromise(node, chunk);
      })
    ).then(results => {
      return results.reduce(utils.mergeDynamoResponses, {
        Count: 0,
        ScannedCount: 0,
        Items: []
      });
    });
  };
};
