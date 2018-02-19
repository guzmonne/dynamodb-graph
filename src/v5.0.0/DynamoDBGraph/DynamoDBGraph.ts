import { IDynamoDBGraphGlobalConfig } from './DynamoDBGraph.types';

/**
 * DynamoDBGraph namespace.
 */
export namespace DynamoDBGraph {
  var global: IDynamoDBGraphGlobalConfig = {};

  export function config(): IDynamoDBGraphGlobalConfig {
    return { ...global };
  }

  config.update = function() {};
}
