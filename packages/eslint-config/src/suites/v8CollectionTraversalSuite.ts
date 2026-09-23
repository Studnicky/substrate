import type { Linter } from 'eslint';

import { v8Plugin } from '../v8Plugin.js';

/**
 * V8 collection-traversal domain — how a collection is walked, not how
 * often. Spread this into a flat-config array to enable the full domain
 * with one import.
 */
export const v8CollectionTraversalSuite: Linter.Config = {
  'plugins': { '@studnicky/v8': v8Plugin },
  'rules': {
    '@studnicky/v8/array-from-iterators': 'error',
    '@studnicky/v8/array-from-map-callback': 'error',
    '@studnicky/v8/chained-array-iteration': 'error',
    '@studnicky/v8/for-in-loops': 'error',
    '@studnicky/v8/for-of-arrays': 'error'
  }
};
