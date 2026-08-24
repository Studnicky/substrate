/**
 * @module DefaultConfig
 * @description Default configuration values for FilterEngine
 */

import { ErrorCollectionMode } from '../enums/ErrorCollectionMode.js';
import { FilterMode } from '../enums/FilterMode.js';
import { deepFreeze } from '../utils/deepFreeze.js';

/**
 * Default configuration for FilterEngine instances
 * @readonly
 * @type {Object}
 */
const DefaultConfig = deepFreeze({
  // Performance options
  'cacheCompiled': true,
  'conditions': null,

  // Error handling
  'detailedErrors': false,
  'enablePlugins': true,
  'includeErrors': ErrorCollectionMode.FIRST,

  // Depth and safety limits
  'maxDepth': 10,

  'maxPathDepth': 10,
  'mode': FilterMode.CORE.BLACKLIST,

  // Core engine configuration
  'name': 'FilterEngine',
  'optimizeSingle': true,

  // Plugin system
  'plugins': [],
  // Will create new Plugins() instance if null
  'registry': null,

  // Validation and strictness
  'strict': false
});

export { DefaultConfig };
