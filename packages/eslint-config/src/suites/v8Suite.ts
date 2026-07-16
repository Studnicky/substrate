import type { Linter } from 'eslint';

import { v8Plugin } from '../v8Plugin.js';

/**
 * V8 performance domain — hidden-class stability, hot-path allocation, and
 * other engine-optimization rules. Spread this into a flat-config array to
 * enable the full domain with one import.
 */
export const v8Suite: Linter.Config = {
  'plugins': { '@studnicky/v8': v8Plugin },
  'rules': {
    '@studnicky/v8/arguments-object': 'error',
    '@studnicky/v8/array-concat-outside-loops': 'error',
    '@studnicky/v8/array-from-iterators': 'error',
    '@studnicky/v8/array-from-map-callback': 'error',
    '@studnicky/v8/array-spread-outside-loops': 'error',
    '@studnicky/v8/computed-class-properties': 'error',
    '@studnicky/v8/computed-object-properties': 'error',
    '@studnicky/v8/conditional-property-assignment': 'error',
    '@studnicky/v8/define-property': 'error',
    '@studnicky/v8/delete-property': 'error',
    '@studnicky/v8/dynamic-property-access': 'error',
    '@studnicky/v8/eval-function': 'error',
    '@studnicky/v8/for-in-loops': 'error',
    '@studnicky/v8/for-of-arrays': 'error',
    '@studnicky/v8/inline-arrow-functions': 'error',
    '@studnicky/v8/inline-functions': 'error',
    '@studnicky/v8/max-switch-cases': 'error',
    '@studnicky/v8/memoize-array-length': 'error',
    '@studnicky/v8/object-spread': 'error',
    '@studnicky/v8/prototype-modification': 'error',
    '@studnicky/v8/regexp-in-loops': 'error',
    '@studnicky/v8/switch-statements': 'error',
    '@studnicky/v8/try-catch-in-loops': 'error',
    '@studnicky/v8/with-statement': 'error'
  }
};
