import type { Linter } from 'eslint';

import { plugin } from '../plugin.js';

/**
 * Entity / data-shape domain — governs how types, interfaces, entity
 * namespaces, and keyed collections are shaped, named, and located. Spread
 * this into a flat-config array to enable the full domain with one import.
 */
export const entityModelSuite: Linter.Config = {
  'linterOptions': { 'noInlineConfig': true },
  'plugins': { '@studnicky': plugin },
  'rules': {
    '@studnicky/all-types-are-entities': 'error',
    '@studnicky/entity-file-shape': 'error',
    '@studnicky/interface-must-be-contract': 'error',
    '@studnicky/interfaces-compose-named-types': 'error',
    '@studnicky/no-double-assertion': 'error',
    '@studnicky/no-mixed-callable-shapes': 'error',
    '@studnicky/no-redefined-external-types': 'error',
    '@studnicky/no-unparsed-assertion': 'error',
    '@studnicky/prefer-collection-types': 'error',
    '@studnicky/type-alias-invariants': 'error',
    '@typescript-eslint/prefer-function-type': 'off'
  }
};
