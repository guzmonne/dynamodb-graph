'use strict';

var utils = require('../modules/utils.js');

module.exports = function nodeFactory(config) {
  utils.checkConfiguration(config);

  return {
    item: require('./item.js')(config)
  };
};
