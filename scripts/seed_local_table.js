'use strict';

var AWS = require('aws-sdk');
var YAML = require('yamljs');
var path = require('path');
var cuid = require('cuid');
var csv = require('csvtojson');
var path = require('path');
var Rx = require('rxjs/Rx');
var chalk = require('chalk');
var pickBy = require('lodash/pickBy.js');
var identity = require('lodash/identity.js');
var isObject = require('lodash/isObject.js');
var isUndefined = require('lodash/isUndefined.js');
var dynamodbGraph = require('../dist/');
var { hexToDec, decToHex } = require('./toHex.js');

/** Constants */
var CHARACTERS_FILE = './the-simpsons-by-the-data/simpsons_characters.csv';
var LOCATIONS_FILE = './the-simpsons-by-the-data/simpsons_locations.csv';
var EPISODES_FILE = './the-simpsons-by-the-data/simpsons_episodes.csv';
var SCRIPT_LINE_FILE = './the-simpsons-by-the-data/simpsons_script_lines.csv';
var TABLE_NAME = process.env.TABLE_NAME || 'GraphTable';
var TENANT = process.env.TENANT || 'simpsons';
var MAX_GSIK = process.MAX_GSIK || 10;
var INTERVAL = process.INTERVAL || 1;
var ENDPOINT = 'http://localhost:8989';
/** ********* */

/** AWS configuration */
AWS.config.update({ region: 'us-east-1' });
var DynamoDB = new AWS.DynamoDB({ endpoint: ENDPOINT });
var documentClient = new AWS.DynamoDB.DocumentClient({
  service: DynamoDB
});
/** ***************** */
/** DynamoDB Graph configuration */
var g = dynamodbGraph({
  tenant: TENANT,
  table: TABLE_NAME,
  documentClient,
  maxGSIK: MAX_GSIK
});
/** **************************** */
/** Main */
DynamoDB.listTables({})
  .promise()
  .then(checkTable)
  .then(createTable)
  .then(loadData)
  .then(result => console.log('\n\nDONE!!!'))
  .catch(error => {
    console.log(error);
  });
/******* */

/** Functions */
function nodeGenerator(doc) {
  var type = doc.__type;
  var id = doc.id;
  return `${type + '|' || ''}${id}`;
}

function checkTable(result) {
  /** Clean-up before starting dump */
  if (
    process.env.CLEANUP !== undefined &&
    result.TableNames.indexOf(TABLE_NAME) > -1
  ) {
    return DynamoDB.deleteTable({
      TableName: 'GraphTable'
    })
      .promise()
      .then(waitMs(1000))
      .then(() => false);
  }
  /** ***************************** */
  return result.TableNames.indexOf(TABLE_NAME) > -1;
}

function loadData() {
  return Promise.resolve()
    .then(() =>
      g
        .node({ type: 'show' })
        .create({
          data: 'The Simpsons'
        })
        .then(result => result.Item)
    )
    .then(doc =>
      Promise.resolve()
        .then(loadCharacters)
        .then(loadLocations)
        .then(() => loadEpisodes(doc))
        .then(() => loadScriptLines(doc))
    )
    .catch(error => red(error));
}

function loadCharacters() {
  return loadObservable(CHARACTERS_FILE, 'Character', item => {
    return Rx.Observable.fromPromise(
      g
        .node({
          id: `character|${item.id}`,
          type: 'character'
        })
        .create({
          data: item.name
        })
        .then(result => {
          var { Item = {} } = result;
          var { Node: node } = Item;
          var promises = [];

          addProps(['gender', 'normalized_name'], item, node, promises);

          return Promise.all(promises);
        })
    );
  });
}

function loadLocations() {
  return loadObservable(LOCATIONS_FILE, 'Location', item => {
    return Rx.Observable.fromPromise(
      g
        .node({
          id: `location|${item.id}`,
          type: 'location'
        })
        .create({
          data: item.name
        })
        .then(({ Item: { Node: node } }) => {
          var promises = [];

          addProps(['normalized_name'], item, node, promises);

          return Promise.all(promises);
        })
    );
  });
}

function loadEpisodes(doc) {
  return loadObservable(EPISODES_FILE, 'Episode', item => {
    return Rx.Observable.fromPromise(
      g
        .node({
          id: `episode|${item.id}`,
          type: 'episode'
        })
        .create({
          data: item.title
        })
        .then(result => {
          var { Item: { Node: node } } = result;
          return g
            .node({
              id: doc.Node,
              type: `episode|${item.id}`
            })
            .create({
              data: item.title,
              target: node
            })
            .then(result => {
              var promises = [];

              addProps(
                [
                  'original_air_date',
                  'production_code',
                  '+season',
                  '+number_in_season',
                  '+number_in_series',
                  '+us_viewers_in_millions',
                  '+views',
                  '+imdb_rating',
                  '+imdb_votes',
                  'image_url',
                  'video_url'
                ],
                item,
                node,
                promises
              );

              return Promise.all(promises);
            });
        })
    );
  });
}

function addProps(properties, item, node, promises) {
  properties.forEach(prop => {
    let isNumber = prop.indexOf('+') === 0;

    prop = prop.replace('+', '');

    var data =
      isNumber === true
        ? decToHex(parseFloat(item[prop]) || 0, 10)
        : item[prop];

    if (isNumber === true && isNaN(data)) data = decToHex(0);

    if (data === null || data === undefined) return;

    if (item[prop] !== undefined)
      promises.push(
        g
          .node({
            id: node,
            type: prop
          })
          .create({
            prop: data
          })
      );
  });
}

function loadScriptLines(doc) {
  return loadObservable(SCRIPT_LINE_FILE, 'Episode', item => {
    return Rx.Observable.fromPromise(
      g
        .node({
          id: `script_line|${item.id}`,
          type: 'script_line'
        })
        .create({
          data: item.raw_text
        })
        .then(({ Item: { Node: node } }) => {
          var promises = [];

          processModel(item, promises, node, 'episode_id');
          processModel(item, promises, node, 'character_id');
          processModel(item, promises, node, 'location_id');

          addProps(
            [
              '+timestamp_in_ms',
              '+word_count',
              'normalized_text',
              'spoken_words',
              'speaking_line',
              'raw_character_text'
            ],
            item,
            node,
            promises
          );

          return Promise.all(promises).then(() => {
            var promises = [];

            updateShow(doc, item, node, promises);
            updateCharacter(item, node, promises);
            updateEpisode(item, node, promises);

            return Promise.all(promises);
          });
        })
    );
  });
}

function updateEpisode(item, node, promises) {
  if (node === undefined || item.episode_node === undefined) return;

  if (item.number !== undefined && item.raw_text !== undefined)
    promises.push(
      g
        .node({
          id: item.episode_node,
          type: `line|${item.number}`
        })
        .create({
          data: item.raw_text,
          target: node
        })
    );

  if (item.location_node !== undefined)
    promises.push(
      g
        .node({
          id: item.episode_node,
          type: `episode|location|${item.location_id}`
        })
        .create({
          data: item.location,
          target: item.location_node
        })
    );

  if (item.character_node !== undefined)
    promises.push(
      g
        .node({
          id: item.episode_node,
          type: `episode|character|${item.character_id}`
        })
        .create({
          data: item.character,
          target: item.character_node
        })
    );
}

function updateCharacter(item, node, promises) {
  if (node === undefined || item.character_node === undefined) return;

  var action = item.speaking_line === 'true' ? 'spoke' : 'reacted';

  if (item.location_node !== undefined && item.episode_node !== undefined)
    promises.push(
      g
        .node({
          id: item.character_node,
          type: `${action}_line|${item.id}|episode|${item.episode_id}`
        })
        .create({
          data: item.raw_text,
          target: node
        })
    );

  if (item.location_node !== undefined && item.episode_node !== undefined)
    promises.push(
      g
        .node({
          id: item.character_node,
          type: `${action}_at|location|${item.location_id}|episode|${
            item.episode_id
          }`
        })
        .create({
          data: item.location,
          target: item.location_node
        })
    );
}

function updateShow(doc, item, node, promises) {
  if (doc.Node === undefined || node === undefined) return;

  promises.push(
    g
      .node({
        id: doc.Node,
        type: `line|${item.id}`
      })
      .create({
        data: item.raw_text,
        target: node
      })
  );
}

function processModel(item, promises, node, key) {
  var id = item[key];
  var type = key.replace('_id', '');

  if (id === undefined || id === '') return;

  promises.push(
    g
      .node({
        id: `${type}|${id}`,
        type
      })
      .get()
      .then(result => {
        if (result && result.Item && result.Item.Node && result.Item.Data) {
          item[type] = result.Item.Data;
          item[`${type}_node`] = result.Item.Node;
          return g
            .node({
              id: node,
              type: `line|${type}`
            })
            .create({
              data: result.Item.Data,
              target: result.Item.Node
            });
        }
      })
  );
}

function loadObservable(file, type, processItem$) {
  return new Promise((resolve, reject) => {
    var data = [];
    green(`Loading file: ${file}`);
    csv()
      .fromFile(path.resolve(__dirname, file))
      .on('json', row => data.push(row))
      .on('done', (error, json) => {
        if (error) reject(error);

        var data$ = Rx.Observable.from(data);
        var interval$ = Rx.Observable.interval(INTERVAL).take(data.length);

        //Rx.Observable.zip(data$, interval$)
        //.concatMap([item, i] =>
        data$
          .concatMap((item, i) => {
            item = pickBy(item, identity);

            return processItem$(item);
          })
          .scan(acc => {
            return acc + 1;
          }, 0)
          .do(i => {
            process.stdout.write(
              purple(
                `   Processing ${i} of ${data.length} (${Math.round(
                  i / data.length * 10000,
                  0
                ) / 100}%)\r`
              )
            );
          })
          .catch(error => {
            red(error);
            return Rx.Observable.of(error);
          })
          .reduce((acc, item) => acc.concat(item), [])
          .subscribe({
            error: error => reject(error),
            complete: () => {
              console.log(
                purple(`   Processing ${data.length} of ${data.length} (100%)`)
              );
              green(`${type} loading complete.`);
              resolve();
            }
          });
      });
  });
}

var purple = (function() {
  return chalk.hex('|551A8B');
})();

function red(v) {
  if (isObject(v)) {
    console.log.bind(console)(chalk.red(v.name));
    console.log.bind(console)(chalk.red(v.message));
    console.log.bind(console)(chalk.red(v.stack));
    return;
  }
  console.log.bind(console)(chalk.red(v));
}

function green(v) {
  console.log.bind(console)(chalk.green(v));
}

function blue(v) {
  if (process.env.DEBUG === undefined) return;
  console.log.bind(console)(chalk.blue(v));
}

function createTable(tableExists) {
  if (tableExists === false) {
    var template = YAML.load(path.resolve(__dirname, './template.yml'));
    return DynamoDB.createTable(template.Resources.Graph.Properties)
      .promise()
      .then(waitMs(1000))
      .then(response => {
        console.log('Table created.');
      });
  }
  return Promise.resolve();
}
/**
 * Promise helper function to halt the execution of the code of `time` ammount
 * of secons.
 * @param {number} time - Time to wait.
 * @return {Promise} A resolved promise after `time` miliseconds.
 */
function waitMs(time) {
  return () =>
    new Promise((res, rej) => {
      setTimeout(() => {
        res();
      }, time);
    });
}
/************ */
