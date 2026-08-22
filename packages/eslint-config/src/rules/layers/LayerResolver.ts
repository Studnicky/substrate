import {
  dirname, resolve
} from 'node:path';

import type { LayerOptionsEntity } from './LayerOptionsEntity.js';

import {
  CANONICAL_ROLE_ALLOWED_POSITIONS, INFRASTRUCTURE_POSITION, NORMALIZE_CACHE, NORMALIZE_CACHE_CAPACITY, PATH_SEPARATOR_PATTERN
} from './constants/LayerResolverConstants.js';

class PathSegments {
  public static normalize(rawPath: string): readonly string[] {
    const cached = NORMALIZE_CACHE.get(rawPath);

    if (cached !== undefined) {
      NORMALIZE_CACHE.delete(rawPath);
      NORMALIZE_CACHE.set(rawPath, cached);

      return cached;
    }

    const result = rawPath.split(PATH_SEPARATOR_PATTERN).filter((segment) => {
      const result = segment.length > 0;

      return result;
    });

    if (NORMALIZE_CACHE.size >= NORMALIZE_CACHE_CAPACITY) {
      const oldestKey = NORMALIZE_CACHE.keys().next().value;

      if (oldestKey !== undefined) {
        NORMALIZE_CACHE.delete(oldestKey);
      }
    }

    NORMALIZE_CACHE.set(rawPath, result);

    return result;
  }
}

class LayerAfterRoot {
  /**
   * Finds the configured layer immediately after the FIRST occurrence of `rootSegments` in
   * `fileSegments` whose next segment is actually a configured layer — scanning past any earlier
   * occurrence whose next segment is not, rather than giving up at the first occurrence outright.
   *
   * D7 (see the eslint-config objectives): a prior revision returned `undefined` the instant it
   * found ANY occurrence of `sourceRoot`, even when that occurrence's next segment was not a
   * layer. `sourceRoot` is typically a common segment name (`'src'`), which can legitimately
   * recur — e.g. a vendored dependency copied in with its own nested `src/` tree:
   * `…/src/vendor/x/src/domain/Foo.ts` matches `sourceRoot` `'src'` at the OUTER occurrence
   * first, whose next segment `'vendor'` is not a configured layer. Every arch rule built on this
   * resolver treats "no layer" as a silent pass (there is nothing to check an unrecognized file
   * against), so returning `undefined` here does not mean "this file has no layer" — it means a
   * genuine `domain/` file three segments deeper escapes every architecture rule entirely.
   * PROVEN via a direct unit probe against `LayerResolver.layerForPath`
   * (`tests/unit/layers/LayerResolver.scenarios.json`, cases prefixed "D7:") — UNPROVEN end-to-end
   * through `npx eslint`, since the four `arch/*` rules that consume this resolver are not yet
   * enabled (see C3-C6).
   */
  public static find(fileSegments: readonly string[], rootSegments: readonly string[], layers: readonly string[]): string | undefined {
    if (rootSegments.length === 0) {
      return undefined;
    }

    const layerSet = new Set(layers);
    const rootSegmentCount = rootSegments.length;
    const lastStartIndex = fileSegments.length - rootSegmentCount;

    for (let start = 0; start <= lastStartIndex; start += 1) {
      let matches = true;

      for (let offset = 0; offset < rootSegmentCount; offset += 1) {
        if (fileSegments.at(start + offset) !== rootSegments.at(offset)) {
          matches = false; break;
        }
      }
      if (!matches) {
        continue;
      }

      const candidate = fileSegments.at(start + rootSegmentCount);

      if (candidate !== undefined && layerSet.has(candidate)) {
        return candidate;
      }
    }

    return undefined;
  }
}

class DefaultAllowedImports {
  /**
   * Precomputes the default allow-matrix for one `options.layers` array, keyed by the actual
   * (possibly renamed) layer names, from {@link CANONICAL_ROLE_ALLOWED_POSITIONS}'s
   * position-indexed matrix. Cached per `layers` array reference — the same identity for every
   * file in one lint run, since it comes from static rule configuration — so the matrix is built
   * once, not once per `canImport` call. Mirrors `PathSegments`' `NORMALIZE_CACHE` pattern above.
   */
  private static readonly cache = new WeakMap<readonly string[], ReadonlyMap<string, readonly string[]>>();

  public static matrixFor(layers: readonly string[]): ReadonlyMap<string, readonly string[]> {
    const cached = DefaultAllowedImports.cache.get(layers);

    if (cached !== undefined) {
      return cached;
    }

    const matrix = new Map<string, readonly string[]>();

    const infrastructureName = layers.at(INFRASTRUCTURE_POSITION);

    if (infrastructureName !== undefined) {
      matrix.set(infrastructureName, layers);
    }

    const roleCount = CANONICAL_ROLE_ALLOWED_POSITIONS.length;

    for (let sourcePosition = 0; sourcePosition < roleCount; sourcePosition += 1) {
      const sourceName = layers.at(sourcePosition);

      if (sourceName === undefined) {
        continue;
      }

      const allowedPositions = CANONICAL_ROLE_ALLOWED_POSITIONS.at(sourcePosition) ?? [];
      const allowedNames: string[] = [];
      const allowedCount = allowedPositions.length;

      for (let index = 0; index < allowedCount; index += 1) {
        const position = allowedPositions.at(index);
        const name = position === undefined ? undefined : layers.at(position);

        if (name !== undefined) {
          allowedNames.push(name);
        }
      }
      matrix.set(sourceName, allowedNames);
    }

    DefaultAllowedImports.cache.set(layers, matrix);

    return matrix;
  }
}

export class LayerResolver {
  public static layerForPath(filePath: string, options: LayerOptionsEntity.Type): string | undefined {
    const fileSegments = PathSegments.normalize(filePath);
    const rootSegments = PathSegments.normalize(options.sourceRoot);

    const result = LayerAfterRoot.find(fileSegments, rootSegments, options.layers);

    return result;
  }

  public static layerForImport(importSpecifier: string, importingFilePath: string, options: LayerOptionsEntity.Type): string | undefined {
    const aliasPrefixes = options.aliasPrefixes;

    if (aliasPrefixes !== undefined) {
      const prefixes = Object.keys(aliasPrefixes);
      const prefixCount = prefixes.length;

      for (let pi = 0; pi < prefixCount; pi += 1) {
        const prefix = prefixes.at(pi);

        if (prefix !== undefined && importSpecifier.startsWith(prefix)) {
          const layer: unknown = Reflect.get(aliasPrefixes, prefix);

          const result = typeof layer === 'string' ? layer : undefined;

          return result;
        }
      }
    }

    const isRelative = importSpecifier.startsWith('./') || importSpecifier.startsWith('../');

    if (!isRelative) {
      return undefined;
    }

    const resolvedPath = resolve(dirname(importingFilePath), importSpecifier);

    const result = LayerResolver.layerForPath(resolvedPath, options);

    return result;
  }

  public static canImport(sourceLayer: string, targetLayer: string, options: LayerOptionsEntity.Type): boolean {
    if (!options.layers.includes(sourceLayer) || !options.layers.includes(targetLayer)) {
      return false;
    }
    if (sourceLayer === targetLayer) {
      return true;
    }

    const allowedImports = options.allowedImports;
    const overrideValue: unknown = allowedImports === undefined ? undefined : Reflect.get(allowedImports, sourceLayer);
    const override = Array.isArray(overrideValue) ? overrideValue : undefined;
    const allowed = override ?? DefaultAllowedImports.matrixFor(options.layers).get(sourceLayer);

    if (allowed === undefined) {
      return false;
    }

    const result = allowed.includes(targetLayer);

    return result;
  }
}
