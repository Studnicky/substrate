import type { Linter } from 'eslint';

import type { ResolutionSiteEntity } from '../rules/arch/ResolutionSiteEntity.js';

import { plugin } from '../plugin.js';

/**
 * Naming and vocabulary domain — identifier and static-method wording plus
 * closed-vocabulary threading. `no-threaded-vocabulary` requires a project
 * `sourceRoot` with no default, so this domain is a factory rather than a
 * static suite: call `VocabularySuite.create(...)` with that root plus any
 * resolution-site overrides to get one ready-to-spread flat-config entry.
 */
export class VocabularySuite {
  public static create(options: {
    'noThreadedVocabulary'?: {
      'resolutionSites'?: readonly ResolutionSiteEntity.Type[];
    };
    'sourceRoot': string;
  }): Linter.Config {
    const { noThreadedVocabulary, sourceRoot } = options;

    return {
      'plugins': { '@studnicky': plugin },
      'rules': {
        '@studnicky/descriptive-identifiers': 'error',
        '@studnicky/no-threaded-vocabulary': ['error', {
          'resolutionSites': noThreadedVocabulary?.resolutionSites ?? [],
          'sourceRoot': sourceRoot
        }],
        '@studnicky/static-method-verbs': 'error'
      }
    };
  }
}
