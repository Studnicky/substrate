import type { Linter } from 'eslint';

import type { LayerOptionsType } from '../types/LayerOptionsType.js';

import { plugin } from '../plugin.js';

/**
 * Hexagonal-architecture domain — layer-import-boundary, domain-purity, and
 * adapter-only-import all share the same layers/sourceRoot configuration but
 * take distinct extra options, so this domain is a factory rather than a
 * static suite: call `HexagonalSuite.create(...)` with the shared layer
 * config plus each rule's own extras to get one ready-to-spread flat-config
 * entry enabling all three consistently.
 */
export class HexagonalSuite {
  public static create(options: LayerOptionsType & {
    'adapterOnlyImport'?: {
      'adapterLayerName'?: string;
      'adapterOnlyImports'?: string[];
    };
    'domainPurity'?: {
      'domainLayerName'?: string;
      'forbiddenCalls'?: string[];
      'forbiddenImports'?: string[];
    };
    'knownTypesOutsideAdapters'?: {
      'adapterLayerName'?: string;
    };
  }): Linter.Config {
    const { adapterOnlyImport, domainPurity, knownTypesOutsideAdapters, ...layerOptions } = options;

    return {
      'plugins': { '@studnicky': plugin },
      'rules': {
        '@studnicky/adapter-only-import': ['error', { ...layerOptions, ...adapterOnlyImport }],
        '@studnicky/domain-purity': ['error', { ...layerOptions, ...domainPurity }],
        '@studnicky/known-types-outside-adapters': ['error', { ...layerOptions, ...knownTypesOutsideAdapters }],
        '@studnicky/layer-import-boundary': ['error', layerOptions]
      }
    };
  }
}
