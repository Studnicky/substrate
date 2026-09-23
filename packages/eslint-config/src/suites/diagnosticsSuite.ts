import type { Linter } from 'eslint';

import { plugin } from '../plugin.js';

/**
 * Diagnostics domain — rejects inline lint configuration and diagnostic
 * suppression. Spread this into a flat-config array to enable it.
 */
export const diagnosticsSuite: Linter.Config = {
  'plugins': { '@studnicky': plugin },
  'rules': {
    '@studnicky/clean-diagnostics': 'error'
  }
};
