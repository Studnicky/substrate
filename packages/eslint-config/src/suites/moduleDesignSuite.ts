import type { Linter } from 'eslint';

import { plugin } from '../plugin.js';

/**
 * Module-design domain — export shape, return-binding, function-registry
 * safety, options-object calls, and non-trivial method bodies. Spread this
 * into a flat-config array to enable the full domain with one import.
 */
export const moduleDesignSuite: Linter.Config = {
  'plugins': { '@studnicky': plugin },
  'rules': {
    '@studnicky/explicit-return-binding': 'error',
    '@studnicky/export-shape': 'error',
    '@studnicky/inline-trivial-logic': 'error',
    '@studnicky/no-function-registries': 'error',
    '@studnicky/require-options-object': 'error'
  }
};
