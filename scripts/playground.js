'use strict';

require('console.table');
var AWS = require('aws-sdk');
var sortBy = require('lodash/sortBy.js');
var pick = require('lodash/pick');
var chalk = require('chalk');
var dynamodbGraph = require('../dist/');

/** Constants */
var ENDPOINT = process.env.ENDPOINT || 'http://localhost:8989';
var TABLE_NAME = process.env.TABLE_NAME || 'GraphTable';
var TENANT = process.env.TENANT || 'simpsons';
var MAX_GSIK = process.MAX_GSIK || 10;
/** ***************** */
/** AWS configuration */
AWS.config.update({ region: 'us-east-1' });
var DynamoDB = new AWS.DynamoDB({ endpoint: ENDPOINT });
var documentClient = new AWS.DynamoDB.DocumentClient({
  service: DynamoDB
});
/** **************************** */
/** DynamoDB Graph configuration */
var g = dynamodbGraph({
  tenant: TENANT,
  table: TABLE_NAME,
  documentClient,
  maxGSIK: MAX_GSIK
});
/** *** **/
/** Main */
var SEASON_NUMBER = 2;
var RATING = 8.5;

DynamoDB.listTables({})
  .promise()
  .then(checkTable)
  .then(getSeason(SEASON_NUMBER))
  .then(getEpisodesRatedHigherThan(RATING))
  .then(getMaggieSimpsonLines())
  /*
  .then(() => {
    return g.query({
      where: { type: { begins_with: 'imdb_rating' } }
    });
  })
  .then(log)
  */
  .catch(error);
/** ******** */
/* Functions */
/**
 * Checks for the existence of a table called TABLE_NAME on the DyanamoDB table.
 * @param {string[]} tables - DynamoDB table names.
 * @return {bool} Wether the table exists or not.
 */
function checkTable(tables) {
  return tables.TableNames.indexOf(TABLE_NAME) > -1;
}
/**
 * Prints the error on the console with colors and ephasis.
 * @param {object|string} v - Error object or error string.
 */
function error(v) {
  if (typeof v === 'object') {
    console.log.bind(console)(chalk.red.bold(v.name));
    console.log.bind(console)(chalk.red(v.message));
    console.log.bind(console)(chalk.red(v.stack));
    return;
  }
  console.log.bind(console)(chalk.red(v));
}
/**
 * Logs to the console an arbitrary number of arguments line by line.
 */
function log() {
  var args = Array.prototype.slice.call(arguments);
  args.forEach(arg => console.table(chalk.blue(JSON.stringify(arg, null, 2))));
}

function toItem(acc = {}, { Type, Data }) {
  return Object.assign(acc, {
    [Type]: Data
  });
}

function logTable(title, sortKey) {
  return function(rows) {
    console.table(title, sortBy(rows, sortKey));
  };
}
/**
 * Queries the table for all the episodes of a season.
 * @param {number} number - Season number.
 * @return {Promise} Query results.
 */
function getSeason(number) {
  return function() {
    return g
      .query({
        where: { type: { '=': 'season' } },
        and: { data: { '=': number } }
      })
      .then(({ Items: items }) => {
        var promises = items.map(({ Node: node }) =>
          g
            .query({
              node,
              types: ['episode', 'number_in_series']
            })
            .then(({ Items: items }) => {
              var item = items.reduce(toItem, {});
              item.node = node;
              return item;
            })
        );

        return Promise.all(promises);
      })
      .then(logTable(`Season #${number}`, 'number_in_series'))
      .catch(error);
  };
}

function getEpisodesRatedHigherThan(compareRating) {
  return g
    .query({
      where: { type: { '=': 'imdb_rating' } },
      and: { data: { '>': compareRating } }
    })
    .then(({ Items: items }) => {
      var promises = items.map(({ Node: node, Data: rating }) =>
        g
          .query({ node, types: ['episode', 'number_in_series', 'season'] })
          .then(({ Items: items }) => {
            var item = items.reduce(toItem, {});
            item.imdb_rating = rating;
            item.node = node;
            return item;
          })
      );

      return Promise.all(promises);
    })
    .then(
      logTable(
        `Episodes with rating higher than #${compareRating}`,
        'imdb_rating'
      )
    )
    .catch(error);
}

function getMaggieSimpsonLines() {
  return g
    .query({
      where: { type: { '=': 'character' } },
      and: { data: { '=': 'Maggie Simpson' } }
    })
    .then(({ Items: [{ Node: node }] }) =>
      g.query({ node, where: { type: { begins_with: 'spoke_line' } } })
    )
    .then(({ Items }) =>
      Items.map(item => pick(item, 'Type', 'Data')).map(item => {
        var typeData = item.Type.split('#');
        item.line_number = +typeData[1];
        item.episode = +typeData[3];
        item.line = item.Data.replace('Maggie Simpson: ', '').slice(0, 100);
        delete item.Data;
        delete item.Type;
        return item;
      })
    )
    .then(logTable('Maggie Lines', 'episode'));
}

function query() {
  documentClient
    .batchGet({
      RequestItems: {
        GraphTable: {
          Keys: [
            {
              Node: 'simpsons#episode#3',
              Type: 'views'
            }
          ]
        }
      }
    })
    .promise()
    .then(x => console.log(JSON.stringify(x, null, 2)));
}
