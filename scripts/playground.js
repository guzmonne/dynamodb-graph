'use strict';

var AWS = require('aws-sdk');
var cuid = require('cuid');
var dynamodbGraph = require('../dist/index.js');

var endpoint = 'http://localhost:8989';

/** Constants */
var TABLE_NAME = 'GraphTable';
/** ********* */

/** AWS configuration */
AWS.config.update({ region: 'us-east-1' });
var DynamoDB = new AWS.DynamoDB({ endpoint });
var documentClient = new AWS.DynamoDB.DocumentClient({
  service: DynamoDB
});
/** ***************** */

module.exports = {
  g: dynamodbGraph({
    db: documentClient,
    table: TABLE_NAME
  }),
  db: documentClient
};
