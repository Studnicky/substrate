import type { Linter } from 'eslint';

import { plugin } from '../plugin.js';

/**
 * Entity / data-shape domain — governs how types, interfaces, and entity
 * namespaces are shaped, named, and located. Spread this into a flat-config
 * array to enable the full domain with one import.
 */
export const entitySuite: Linter.Config = {
  'plugins': { '@studnicky': plugin },
  'rules': {
    '@studnicky/all-types-are-entities': 'error',
    '@studnicky/folder-content-shape': 'error',
    '@studnicky/interface-must-be-contract': 'error',
    '@studnicky/interface-suffix': 'error',
    '@studnicky/interfaces-compose-named-types': 'error',
    '@studnicky/type-alias-invariants': 'error',
    '@studnicky/whole-canonical-types': 'error'
  }
};
