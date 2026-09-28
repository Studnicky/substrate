import type { Linter } from 'eslint';

import { v8Plugin } from '../v8Plugin.js';

/**
 * V8 repeated-work domain — cost that compounds per hot-loop iteration.
 * Spread this into a flat-config array to enable the full domain with one
 * import.
 */
export const v8RepeatedWorkSuite: Linter.Config = {
  'plugins': { '@studnicky/v8': v8Plugin },
  'rules': {
    '@studnicky/v8/array-concat-outside-loops': 'error',
    '@studnicky/v8/array-scan-outside-loops': 'error',
    '@studnicky/v8/array-splice-outside-loops': 'error',
    '@studnicky/v8/array-spread-outside-loops': 'error',
    '@studnicky/v8/inline-arrow-functions': 'error',
    '@studnicky/v8/inline-functions': 'error',
    '@studnicky/v8/max-switch-cases': 'error',
    '@studnicky/v8/memoize-array-length': 'error',
    '@studnicky/v8/regexp-in-loops': 'error',
    '@studnicky/v8/switch-statements': 'error',
    '@studnicky/v8/try-catch-in-loops': 'error'
  }
};
