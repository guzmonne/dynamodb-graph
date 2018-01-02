'use strict';

var utils = require('../src/modules/utils.js');
var create = (module.exports = function(config) {
  utils.checkConfiguration(config);

  var inter = {
    node: {
      create: require('../src/node/create.js')(config),
      item: require('../src/node/item.js')(config)
    },
    edge: {
      create: require('../src/edge/create.js')(config),
      item: require('../src/edge/item.js')(config)
    },
    property: {
      create: require('../src/property/create.js')(config),
      item: require('../src/property/item.js')(config)
    },
    get: require('../src/query/getItem.js')(config),
    query: require('../src/query/')(config)
  };

  inter.get.properties = getFactory(
    require('../src/query/getNodeProperties.js')(config)
  );

  inter.get.edges = getFactory(require('../src/query/getNodeEdges.js')(config));

  return inter;

  // ---
  /**
   * Calls the query function after passing the `where` option.
   * @param {function} fn - Query function to use.
   */
  function getFactory(fn) {
    return function(options) {
      var { where } = options;

      if (where !== undefined)
        options = Object.assign({}, options, utils.parseWhere(where));

      return fn(options);
    };
  }
});
