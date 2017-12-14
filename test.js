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

g
  .getNodesOfType(organizationId, 'AP', 1)
  .then(createLogger('Success\n'))
  .catch(createLogger('Error\n'));

// ---

function createLogger(prefix) {
  prefix || (prefix = '');
  return console.log.bind(console, prefix);
}

var log = console.log.bind(console);
