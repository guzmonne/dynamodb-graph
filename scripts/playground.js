'use strict';

require('console.table');
var AWS = require('aws-sdk');
var sortBy = require('lodash/sortBy.js');
var pick = require('lodash/pick');
var chalk = require('chalk');
var dynamodbGraph = require('../dist/');
var { hexToDec, decToHex } = require('./toHex.js');

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
var RATING = 9;

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
        filter: { data: { '=': decToHex(number) } }
      })
      .then(({ Items: items }) => {
        var promises = items.map(({ Node: node }) =>
          g
            .node({
              id: node,
              type: 'episode'
            })
            .get(['number_in_season', 'number_in_series'])
            .then(({ Items: items }) => {
              var item = items
                .map(item => {
                  if (
                    item.Type === 'number_in_season' ||
                    item.Type === 'number_in_series'
                  )
                    item.Data = +hexToDec(item.Data);
                  return item;
                })
                .reduce(toItem, {});
              item.node = node;
              return item;
            })
        );

        return Promise.all(promises);
      })
      .then(logTable(`Season #${number}`, 'number_in_season'))
      .catch(error);
  };
}

function getEpisodesRatedHigherThan(compareRating) {
  return g
    .query({
      where: { type: { '=': 'imdb_rating' } },
      filter: { data: { '=': decToHex(compareRating) } }
    })
    .then(({ Items: items }) => {
      var promises = items.map(({ Node: id, Data: rating }) =>
        g
          .node({ id, type: 'episode' })
          .get(['number_in_series', 'season'])
          .then(({ Items: items }) => {
            var item = items
              .map(item => {
                if (item.Type === 'number_in_series' || item.Type === 'season')
                  item.Data = hexToDec(item.Data);
                return item;
              })
              .reduce(toItem, {});
            item.imdb_rating = hexToDec(rating);
            item.node = id;
            return item;
          })
      );

      return Promise.all(promises);
    })
    .then(logTable(`Episodes with a rating of #${compareRating}`, 'season'))
    .catch(error);
}

function getMaggieSimpsonLines() {
  return g
    .query({
      where: { type: { '=': 'character' } },
      filter: { data: { '=': 'Maggie Simpson' } },
      limit: 650
    })
    .then(result => {
      var { Items: [{ Node: id }] } = result;
      return g
        .node({ id })
        .query({ where: { type: { begins_with: 'spoke_line' } } });
    })
    .then(({ Items }) =>
      Items.map(item => pick(item, 'Type', 'Data')).map(item => {
        var typeData = item.Type.split('|');
        item.line_number = +typeData[1];
        item.episode = +typeData[3];
        item.line = item.Data.replace('Maggie Simpson: ', '').slice(0, 100);
        delete item.Data;
        delete item.Type;
        return item;
      })
    )
    .then(logTable('Maggie Lines', 'episode'))
    .catch(error);
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
