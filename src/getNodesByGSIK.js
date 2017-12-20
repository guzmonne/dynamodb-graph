'use strict';

var { parseResponseItemsData } = require('./modules/utils.js');

/**
 * Factory function that returns a function that follows the DynamoDB query
 * interface, to get all the nodes with a certain type, by traversing the
 * ByType GSI Index.
 * The table name can be provided while calling the factory, or it can use an
 * environment variable called TABLE_NAME.
 * Gets all the nodes and edges type associated to a node.
 * @param {DBConfig} options - Database driver and table configuration.
 * @returns {function} Function ready to put Node on a DynamoDB table.
 * @param {object} config - Property configuration object.
 * @property {string} type - Type to look for.
 * @property {number} gsik - GSIK number to look in.
 * @returns {promise} With the data returned from the database.
 */
module.exports = function getNodesByGSIK(options) {
  var { db, table = process.env.TABLE_NAME } = options;
  return (config = {}) => {
    var { gsik, type } = config;
    if (!type) throw new Error('Type is undefined');
    if (!gsik) throw new Error('GSIK is undefined');
    return db
      .query({
        TableName: table,
        IndexName: 'ByType',
        KeyConditionExpression: `#GSIK = :GSIK AND #Type = :Type`,
        ExpressionAttributeNames: {
          '#GSIK': 'GSIK',
          '#Type': 'Type',
          '#Data': 'Data',
          '#Node': 'Node'
        },
        ExpressionAttributeValues: {
          ':GSIK': gsik,
          ':Type': type
        },
        ProjectionExpression: '#Data,#Node'
      })
      .promise()
      .then(parseResponseItemsData);
  };
};
