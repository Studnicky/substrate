import type { Linter } from 'eslint';

import { v8Plugin } from '../v8Plugin.js';

/**
 * V8 object-shape domain — constructs that destabilize hidden-class and
 * inline-cache assumptions. Spread this into a flat-config array to enable
 * the full domain with one import.
 */
export const v8ObjectShapeSuite: Linter.Config = {
  'plugins': { '@studnicky/v8': v8Plugin },
  'rules': {
    '@studnicky/v8/arguments-object': 'error',
    '@studnicky/v8/computed-class-properties': 'error',
    '@studnicky/v8/computed-object-properties': 'error',
    '@studnicky/v8/conditional-property-assignment': 'error',
    '@studnicky/v8/define-property': 'error',
    '@studnicky/v8/delete-property': 'error',
    '@studnicky/v8/dynamic-property-access': 'error',
    '@studnicky/v8/eval-function': 'error',
    '@studnicky/v8/object-spread': 'error',
    '@studnicky/v8/prototype-modification': 'error',
    '@studnicky/v8/with-statement': 'error'
  }
};
