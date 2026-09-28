import type { Linter } from 'eslint';

import type { LayerOptionsEntity } from '../rules/layers/LayerOptionsEntity.js';

import { plugin } from '../plugin.js';

/**
 * Layer-boundary domain — adapter-only-import, domain-purity,
 * known-types-outside-adapters, and layer-import-boundary all share the same
 * layers/sourceRoot configuration but take distinct extra options, and
 * intake-parse-only takes its own unrelated options, so this domain is a
 * factory rather than a static suite: call `LayerBoundarySuite.create(...)`
 * with the shared layer config plus each rule's own extras to get one
 * ready-to-spread flat-config entry enabling all six consistently.
 * no-circular-imports, no-reflect-argument-laundering, and
 * no-unchecked-overload-implementation take no options of their own — each
 * runs off the TypeScript program, not the layer configuration.
 */
export class LayerBoundarySuite {
  public static create(options: LayerOptionsEntity.Type & {
    'adapterOnlyImport'?: {
      'adapterLayerName'?: string;
      'adapterOnlyImports'?: string[];
    };
    'domainPurity'?: {
      'domainLayerName'?: string;
      'forbiddenCalls'?: string[];
      'forbiddenImports'?: string[];
    };
    'intakeParseOnly'?: {
      'exemptPackages'?: string[];
      'structuralProperties'?: string[];
    };
    'knownTypesOutsideAdapters'?: {
      'adapterLayerName'?: string;
    };
  }): Linter.Config {
    const { adapterOnlyImport, domainPurity, intakeParseOnly, knownTypesOutsideAdapters, ...layerOptions } = options;

    return {
      'plugins': { '@studnicky': plugin },
      'rules': {
        '@studnicky/adapter-only-import': ['error', { ...layerOptions, ...adapterOnlyImport }],
        '@studnicky/domain-purity': ['error', { ...layerOptions, ...domainPurity }],
        // Takes only its own question, not the shared layer axis: which parameters must be
        // parsed through an entity's intake is independent of what `layers` measures.
        '@studnicky/intake-parse-only': ['error', { ...intakeParseOnly }],
        '@studnicky/known-types-outside-adapters': ['error', { ...layerOptions, ...knownTypesOutsideAdapters }],
        '@studnicky/layer-import-boundary': ['error', layerOptions],
        '@studnicky/no-circular-imports': 'error',
        '@studnicky/no-reflect-argument-laundering': 'error',
        '@studnicky/no-unchecked-overload-implementation': 'error'
      }
    };
  }
}
