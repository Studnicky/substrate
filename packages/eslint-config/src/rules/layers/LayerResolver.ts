import * as path from 'node:path';

import type { LayerOptionsEntity } from './LayerOptionsEntity.js';

import { DEFAULT_STATIC_ALLOWED_IMPORTS, NORMALIZE_CACHE, NORMALIZE_CACHE_CAPACITY, PATH_SEPARATOR_PATTERN } from './constants/LayerResolverConstants.js';

class PathSegments {
  public static normalize(rawPath: string): readonly string[] {
    const cached = NORMALIZE_CACHE.get(rawPath);
    if (cached !== undefined) {
      NORMALIZE_CACHE.delete(rawPath);
      NORMALIZE_CACHE.set(rawPath, cached);
      return cached;
    }

    const result = rawPath.split(PATH_SEPARATOR_PATTERN).filter((segment) => { return segment.length > 0; });

    if (NORMALIZE_CACHE.size >= NORMALIZE_CACHE_CAPACITY) {
      const oldestKey = NORMALIZE_CACHE.keys().next().value;
      if (oldestKey !== undefined) { NORMALIZE_CACHE.delete(oldestKey); }
    }

    NORMALIZE_CACHE.set(rawPath, result);
    return result;
  }
}

class LayerAfterRoot {
  public static find(fileSegments: readonly string[], rootSegments: readonly string[], layers: readonly string[]): string | undefined {
    if (rootSegments.length === 0) { return undefined; }

    const layerSet = new Set(layers);
    const rootLen = rootSegments.length;
    const maxStart = fileSegments.length - rootLen;
    for (let start = 0; start <= maxStart; start += 1) {
      let matches = true;
      for (let offset = 0; offset < rootLen; offset += 1) {
        if (fileSegments[start + offset] !== rootSegments[offset]) { matches = false; break; }
      }
      if (matches) {
        const candidate = fileSegments[start + rootLen];
        if (candidate !== undefined && layerSet.has(candidate)) { return candidate; }
        return undefined;
      }
    }

    return undefined;
  }
}

class DefaultAllowedImports {
  public static get(sourceLayer: string, layers: readonly string[]): readonly string[] | undefined {
    if (sourceLayer === 'infrastructure') { return layers; }
    return DEFAULT_STATIC_ALLOWED_IMPORTS[sourceLayer];
  }
}

export class LayerResolver {
  public static layerForPath(filePath: string, options: LayerOptionsEntity.Type): string | undefined {
    const fileSegments = PathSegments.normalize(filePath);
    const rootSegments = PathSegments.normalize(options.sourceRoot);
    return LayerAfterRoot.find(fileSegments, rootSegments, options.layers);
  }

  public static layerForImport(importSpecifier: string, importingFilePath: string, options: LayerOptionsEntity.Type): string | undefined {
    const aliasPrefixes = options.aliasPrefixes;
    if (aliasPrefixes !== undefined) {
      const prefixes = Object.keys(aliasPrefixes);
      const prefixesLen = prefixes.length;
      for (let pi = 0; pi < prefixesLen; pi += 1) {
        const prefix = prefixes[pi];
        if (prefix !== undefined && importSpecifier.startsWith(prefix)) {
          return aliasPrefixes[prefix];
        }
      }
    }

    const isRelative = importSpecifier.startsWith('./') || importSpecifier.startsWith('../');
    if (!isRelative) { return undefined; }

    const resolvedPath = path.resolve(path.dirname(importingFilePath), importSpecifier);
    return LayerResolver.layerForPath(resolvedPath, options);
  }

  public static canImport(sourceLayer: string, targetLayer: string, options: LayerOptionsEntity.Type): boolean {
    if (!options.layers.includes(sourceLayer) || !options.layers.includes(targetLayer)) { return false; }
    if (sourceLayer === targetLayer) { return true; }

    const override = options.allowedImports?.[sourceLayer];
    const allowed = override ?? DefaultAllowedImports.get(sourceLayer, options.layers);
    if (allowed === undefined) { return false; }

    return allowed.includes(targetLayer);
  }
}
