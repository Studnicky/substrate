import type { Linter } from 'eslint';

import { plugin } from '../plugin.js';

/**
 * Class-mechanics domain — governs `this` binding, field privacy, and method
 * invocation style within class bodies. Spread this into a flat-config array
 * to enable the full domain with one import.
 */
export const classMechanicsSuite: Linter.Config = {
  'plugins': { '@studnicky': plugin },
  'rules': {
    '@studnicky/direct-invocation-only': 'error',
    '@studnicky/hash-private-fields': 'error',
    '@studnicky/lexical-this-only': 'error'
  }
};
