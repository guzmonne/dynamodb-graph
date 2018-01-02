'use strict';

var utils = require('./modules/utils.js');
var create = (module.exports = function(config) {
  utils.checkConfiguration(config);

  var inter = {
    node: {
      create: require('./node/create.js')(config),
      item: require('./node/item.js')(config)
    },
    edge: {
      create: require('./edge/create.js')(config),
      item: require('./edge/item.js')(config)
    },
    property: {
      create: require('./property/create.js')(config),
      item: require('./property/item.js')(config)
    },
    get: require('./query/getItem.js')(config),
    query: require('./query/')(config)
  };

  inter.get.properties = getFactory(
    require('./query/getNodeProperties.js')(config)
  );

  inter.get.edges = getFactory(require('./query/getNodeEdges.js')(config));

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
