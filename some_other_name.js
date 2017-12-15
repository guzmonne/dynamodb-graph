'use strict';

var _ = require('lodash');
var g = require('./index.js');
var utils = require('./modules/utils.js');
var hash = require('./modules/hash.js');

var organizationId = hash('Conatel S.A.');
var nodeId = '613462a2';

var aps = {
  '2c4d37a2#02e6d0a4': {
    Name: 'AP-MH65',
    Model: 'MR-33'
  },
  '2c4d37a2#9bb9dee4': {
    Name: 'AP-TATA-01',
    Model: 'MR-33'
  },
  '2c4d37a2#357cacf1': {
    Name: 'Outdoor',
    Model: 'MR-72'
  },
  '2c4d37a2#41823a20': {
    Name: 'Indoor',
    Model: 'MR-32'
  },
  '2c4d37a2#1cc9201d': {
    Name: 'AP-Prueba-MH65',
    Model: 'MR-32'
  },
  '2c4d37a2#008e14fe': {
    Name: 'AP-Prueba-157-2',
    Model: 'MR-32'
  }
};

var locations = [
  {
    Data: 'Multi Ahorro Hogar Tres Cruces',
    Latitude: -34.89316841809772,
    Longitude: -56.166004794366714
  },
  {
    Data: 'BAS 502',
    Latitude: -34.90627850279898,
    Longitude: -56.19505552502825
  }
];

var connections = {
  '2c4d37a2#02e6d0a4': '2c4d37a2#59c63849',
  '2c4d37a2#9bb9dee4': '2c4d37a2#59c63849',
  '2c4d37a2#357cacf1': '2c4d37a2#59c63849',
  '2c4d37a2#41823a20': '2c4d37a2#299b7aa0',
  '2c4d37a2#1cc9201d': '2c4d37a2#299b7aa0',
  '2c4d37a2#008e14fe': '2c4d37a2#299b7aa0'
};

var promises = [];

g.getNodesByData(organizationId);

// ---

function createLogger(prefix) {
  prefix || (prefix = '');
  return console.log.bind(console, prefix);
}

var log = console.log.bind(console);
