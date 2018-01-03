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
var dynamo = new AWS.DynamoDB({ endpoint });
var documentClient = new AWS.DynamoDB.DocumentClient({
  service: dynamo
});
/** ***************** */

var scan = (function(lastEvaluatedKey) {
  var limit = 1000;

  function _scan(key) {
    var params = {
      TableName: 'GraphTable',
      Limit: limit
    };

    if (key) params.ExclusiveStartKey = key;

    return documentClient
      .scan(params)
      .promise()
      .then(response => {
        if (response.LastEvaluatedKey)
          lastEvaluatedKey = response.LastEvaluatedKey;
        log(response);
      })
      .catch(log);
  }

  _scan.next = () => _scan(lastEvaluatedKey);

  _scan.setLimit = newLimit => (limit = newLimit);

  return _scan;
})({});

function log(v) {
  return console.log.bind(console)(JSON.stringify(v, null, 2));
}

// ---

module.exports = {
  g: dynamodbGraph({
    tenant: process.env.TENANT || 'simpsons',
    maxGSIK: 10,
    documentClient,
    table: TABLE_NAME
  }),
  documentClient,
  dynamo,
  log,
  scan
};
