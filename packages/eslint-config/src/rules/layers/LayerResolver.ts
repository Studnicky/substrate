import * as path from 'node:path';

import type { LayerOptionsType } from '../../types/LayerOptionsType.js';

// Default allow-matrix for the canonical 5-layer hexagonal architecture.
// 'infrastructure' is resolved dynamically against options.layers (it may import any configured layer).
const DEFAULT_STATIC_ALLOWED_IMPORTS: Record<string, readonly string[]> = {
  'adapters': ['domain', 'ports', 'adapters'],
  'application': ['domain', 'ports', 'application'],
  'domain': ['domain'],
  'ports': ['domain', 'ports']
};

class PathSegments {
  public static normalize(rawPath: string): readonly string[] {
    const result = rawPath.split(/[\\/]+/u).filter((segment) => { return segment.length > 0; });
    return result;
  }
}

class LayerAfterRoot {
  public static find(fileSegments: readonly string[], rootSegments: readonly string[], layers: readonly string[]): string | undefined {
    if (rootSegments.length === 0) { return undefined; }

    const rootLen = rootSegments.length;
    const maxStart = fileSegments.length - rootLen;
    for (let start = 0; start <= maxStart; start += 1) {
      let matches = true;
      for (let offset = 0; offset < rootLen; offset += 1) {
        if (fileSegments[start + offset] !== rootSegments[offset]) { matches = false; break; }
      }
      if (matches) {
        const candidate = fileSegments[start + rootLen];
        if (candidate !== undefined && layers.includes(candidate)) { return candidate; }
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
  public static layerForPath(filePath: string, options: LayerOptionsType): string | undefined {
    const fileSegments = PathSegments.normalize(filePath);
    const rootSegments = PathSegments.normalize(options.sourceRoot);
    return LayerAfterRoot.find(fileSegments, rootSegments, options.layers);
  }

  public static layerForImport(importSpecifier: string, importingFilePath: string, options: LayerOptionsType): string | undefined {
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

  public static canImport(sourceLayer: string, targetLayer: string, options: LayerOptionsType): boolean {
    if (!options.layers.includes(sourceLayer) || !options.layers.includes(targetLayer)) { return false; }
    if (sourceLayer === targetLayer) { return true; }

    const override = options.allowedImports?.[sourceLayer];
    const allowed = override ?? DefaultAllowedImports.get(sourceLayer, options.layers);
    if (allowed === undefined) { return false; }

    return allowed.includes(targetLayer);
  }
}
