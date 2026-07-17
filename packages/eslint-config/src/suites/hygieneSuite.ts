import type { Linter } from 'eslint';

import { plugin } from '../plugin.js';

/**
 * Module/code-hygiene domain — general-purpose export, function, class, and
 * comment conventions not specific to data shape or architecture. Spread
 * this into a flat-config array to enable the full domain with one import.
 */
export const hygieneSuite: Linter.Config = {
  'plugins': { '@studnicky': plugin },
  'rules': {
    '@studnicky/canonical-export-names': 'error',
    '@studnicky/clean-diagnostics': 'error',
    '@studnicky/descriptive-identifiers': 'error',
    '@studnicky/direct-invocation-only': 'error',
    '@studnicky/hash-private-fields': 'error',
    '@studnicky/inline-trivial-logic': 'error',
    '@studnicky/lexical-this-only': 'error',
    '@studnicky/prefer-collection-types': 'error',
    '@studnicky/require-options-object': 'error',
    '@studnicky/single-export': 'error',
    '@studnicky/static-method-verbs': 'error'
  }
};
