import { isBuiltin } from 'node:module';
import {
  dirname, resolve
} from 'node:path';

import type { LayerBindingEntity } from './LayerBindingEntity.js';
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
      const isNonEmptySegment = segment.length > 0;

      return isNonEmptySegment;
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

// BINDING RESOLUTION: THE SAME ORDERED LIST ANSWERS BOTH "WHAT LAYER IS THIS FILE IN" AND
// "WHAT LAYER IS THIS IMPORT TARGET IN".
//
// `forSegment` considers only `'folder'`/`'package'` bindings (a path resolution question);
// `forSpecifier` considers only `'module'`/`'dependency'`/`'builtin'` bindings (an import
// resolution question). Each walks `bindings` in ARRAY ORDER and returns the first entry whose
// kind applies and whose pattern matches — the config author's own declared order IS the
// precedence, not an implicit "most specific wins" this resolver would otherwise have to
// define. A binding whose `layer` is not in the configured `layers` set never matches, the
// same as any other typo — see `LayerBindingEntity`'s own module comment for why 'folder' and
// 'package' (both exact path-segment equality) and 'module' and 'dependency' (both specifier-
// prefix matching) share their matching mechanics while staying distinct `kind` values.
class BindingResolution {
  public static forSegment(
    candidate: string | undefined,
    layerSet: ReadonlySet<string>,
    bindings: readonly LayerBindingEntity.Type[]
  ): string | undefined {
    if (candidate === undefined) {
      return undefined;
    }

    const bindingCount = bindings.length;

    for (let index = 0; index < bindingCount; index += 1) {
      const binding = bindings.at(index);

      if (binding === undefined) {
        continue;
      }
      if (binding.kind !== 'folder' && binding.kind !== 'package') {
        continue;
      }
      if (binding.pattern !== candidate) {
        continue;
      }
      if (!layerSet.has(binding.layer)) {
        continue;
      }

      return binding.layer;
    }

    return undefined;
  }

  public static forSpecifier(
    specifier: string,
    layerSet: ReadonlySet<string>,
    bindings: readonly LayerBindingEntity.Type[]
  ): string | undefined {
    const bindingCount = bindings.length;

    for (let index = 0; index < bindingCount; index += 1) {
      const binding = bindings.at(index);

      if (binding === undefined) {
        continue;
      }
      if (!layerSet.has(binding.layer)) {
        continue;
      }

      if (binding.kind === 'builtin') {
        if (isBuiltin(specifier)) {
          return binding.layer;
        }

        continue;
      }

      if (binding.kind !== 'module' && binding.kind !== 'dependency') {
        continue;
      }
      if (binding.pattern === undefined || !specifier.startsWith(binding.pattern)) {
        continue;
      }

      return binding.layer;
    }

    return undefined;
  }
}

class LayerAfterRoot {
  /**
   * Finds the layer bound to the candidate segment immediately after the FIRST occurrence of
   * `rootSegments` in `fileSegments` that actually resolves to a configured layer — scanning
   * past any earlier occurrence whose candidate does not, rather than giving up at the first
   * occurrence outright.
   *
   * D7 (see the eslint-config objectives): a prior revision returned `undefined` the instant it
   * found ANY occurrence of `sourceRoot`, even when that occurrence's next segment was not a
   * layer. `sourceRoot` is typically a common segment name (`'src'`, `'packages'`), which can
   * legitimately recur — e.g. a vendored dependency copied in with its own nested tree:
   * `…/src/vendor/x/src/domain/Foo.ts` matches `sourceRoot` `'src'` at the OUTER occurrence
   * first, whose next segment `'vendor'` binds to no layer. Every arch rule built on this
   * resolver treats "no layer" as a silent pass (there is nothing to check an unrecognized file
   * against), so returning `undefined` here does not mean "this file has no layer" — it means a
   * genuine `domain/` file three segments deeper escapes every architecture rule entirely.
   * PROVEN via a direct unit probe against `LayerResolver.layerForPath`
   * (`tests/unit/layers/LayerResolver.scenarios.json`, cases prefixed "D7:"). The four `arch/*`
   * rules that consume this resolver are not yet wired into `eslint.config.mjs`, so end-to-end
   * verification through `npx eslint` remains a separate, later step; this resolver's own
   * behavior is fully covered at the unit level regardless.
   */
  public static find(
    fileSegments: readonly string[],
    rootSegments: readonly string[],
    layers: readonly string[],
    bindings: readonly LayerBindingEntity.Type[]
  ): string | undefined {
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
      const resolved = BindingResolution.forSegment(candidate, layerSet, bindings);

      if (resolved !== undefined) {
        return resolved;
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

    const result = LayerAfterRoot.find(fileSegments, rootSegments, options.layers, options.bindings);

    return result;
  }

  /**
   * Resolves what layer an import TARGET is in — the specifier side of the same vocabulary
   * `layerForPath` resolves the file side with. `'module'`/`'dependency'`/`'builtin'` bindings
   * are tried first, against the specifier text itself: this is what makes an external
   * dependency (an npm package, a Node builtin) bindable to a layer at all, so a boundary rule
   * can constrain it — previously a non-relative specifier matching no alias prefix resolved to
   * `undefined` unconditionally, making the entire external dependency surface invisible to
   * every architecture rule. A relative specifier (`./`, `../`) that matches no specifier
   * binding resolves through the file it points at, via `layerForPath` — the same `'folder'`/
   * `'package'` bindings used for the importing file itself. An import matching NEITHER still
   * resolves to `undefined` and stays a silent pass: an unbound external import is not an
   * implicit violation, only a bound one is checkable at all.
   */
  public static layerForImport(importSpecifier: string, importingFilePath: string, options: LayerOptionsEntity.Type): string | undefined {
    const layerSet = new Set(options.layers);
    const specifierMatch = BindingResolution.forSpecifier(importSpecifier, layerSet, options.bindings);

    if (specifierMatch !== undefined) {
      return specifierMatch;
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
