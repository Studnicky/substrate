import type { Program, SourceFile } from 'typescript';

import { Predicates } from '@studnicky/types';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';

interface PackageManifestInterface {
  readonly 'dependencyNames': readonly string[];
  readonly 'name': string | undefined;
}

interface PackageCacheInterface {
  readonly 'manifestsByRoot': Map<string, PackageManifestInterface>;
  readonly 'rootsByFilename': Map<string, string | undefined>;
}

/** Resolves source files to their owning package and manifest-defined boundary. */
export class PackageBoundary {
  private static readonly cacheByProgram = new WeakMap<Program, PackageCacheInterface>();
  private static readonly manifestsByRoot = new Map<string, PackageManifestInterface>();
  private static readonly rootsByFilename = new Map<string, string | undefined>();

  public static directDependencyNamesFor(sourceFile: SourceFile, program: Program): readonly string[] {
    const packageRoot = PackageBoundary.rootFor(sourceFile, program);

    if (packageRoot === undefined) {
      return [];
    }

    return PackageBoundary.manifestFor(packageRoot, program).dependencyNames;
  }

  public static directDependencyNamesForFilename(filename: string): readonly string[] {
    const packageRoot = PackageBoundary.rootForFilename(filename);

    if (packageRoot === undefined) {
      return [];
    }

    return PackageBoundary.manifestForFilename(packageRoot).dependencyNames;
  }

  public static isSourceForPackage(
    sourceFile: SourceFile,
    program: Program,
    packageName: string,
    relativeSourcePath: string
  ): boolean {
    const packageRoot = PackageBoundary.rootFor(sourceFile, program);

    if (packageRoot === undefined || PackageBoundary.manifestFor(packageRoot, program).name !== packageName) {
      return false;
    }

    let sourcePath: string;
    try {
      sourcePath = realpathSync(sourceFile.fileName);
    } catch {
      return false;
    }

    const result = sourcePath === join(packageRoot, relativeSourcePath);

    return result;
  }

  public static rootFor(sourceFile: SourceFile, program: Program): string | undefined {
    const cache = PackageBoundary.cacheFor(program);
    const filename = sourceFile.fileName;

    if (cache.rootsByFilename.has(filename)) {
      const result = cache.rootsByFilename.get(filename);

      return result;
    }

    const result = PackageBoundary.findRootForFilename(filename);

    cache.rootsByFilename.set(filename, result);
    return result;
  }

  public static rootForFilename(filename: string): string | undefined {
    if (PackageBoundary.rootsByFilename.has(filename)) {
      const result = PackageBoundary.rootsByFilename.get(filename);

      return result;
    }

    const result = PackageBoundary.findRootForFilename(filename);

    PackageBoundary.rootsByFilename.set(filename, result);
    return result;
  }

  private static cacheFor(program: Program): PackageCacheInterface {
    let cache = PackageBoundary.cacheByProgram.get(program);

    if (cache === undefined) {
      cache = {
        'manifestsByRoot': new Map<string, PackageManifestInterface>(),
        'rootsByFilename': new Map<string, string | undefined>()
      };
      PackageBoundary.cacheByProgram.set(program, cache);
    }

    return cache;
  }

  private static findRootForFilename(filename: string): string | undefined {
    let directory: string;
    try {
      directory = dirname(realpathSync(filename));
    } catch {
      return undefined;
    }

    while (true) {
      if (existsSync(join(directory, 'package.json'))) {
        return directory;
      }
      const parent = dirname(directory);

      if (parent === directory) {
        return undefined;
      }
      directory = parent;
    }
  }

  private static manifestFor(packageRoot: string, program: Program): PackageManifestInterface {
    const cache = PackageBoundary.cacheFor(program);
    const cached = cache.manifestsByRoot.get(packageRoot);

    if (cached !== undefined) {
      return cached;
    }

    const manifest = PackageBoundary.readManifest(packageRoot);

    cache.manifestsByRoot.set(packageRoot, manifest);
    return manifest;
  }

  private static manifestForFilename(packageRoot: string): PackageManifestInterface {
    const cached = PackageBoundary.manifestsByRoot.get(packageRoot);

    if (cached !== undefined) {
      return cached;
    }

    const result = PackageBoundary.readManifest(packageRoot);

    PackageBoundary.manifestsByRoot.set(packageRoot, result);
    return result;
  }

  private static readManifest(packageRoot: string): PackageManifestInterface {
    try {
      const manifest: unknown = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));

      if (!Predicates.isRecord(manifest)) {
        return { 'dependencyNames': [], 'name': undefined };
      }

      const dependencyNames = new Set<string>();
      const dependencyFields = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];

      const dependencyFieldCount = dependencyFields.length;

      for (let fieldIndex = 0; fieldIndex < dependencyFieldCount; fieldIndex += 1) {
        const field = dependencyFields.at(fieldIndex)!;
        const dependencies = manifest[field];

        if (!Predicates.isRecord(dependencies)) {
          continue;
        }

        const dependencyNamesInField = Object.keys(dependencies);
        const dependencyNameCount = dependencyNamesInField.length;

        for (let dependencyNameIndex = 0; dependencyNameIndex < dependencyNameCount; dependencyNameIndex += 1) {
          dependencyNames.add(dependencyNamesInField.at(dependencyNameIndex)!);
        }
      }

      const sortedDependencyNames = [...dependencyNames].toSorted((left, right) => {
        const result = left.localeCompare(right);

        return result;
      });

      return {
        'dependencyNames': sortedDependencyNames,
        'name': typeof manifest.name === 'string' ? manifest.name : undefined
      };
    } catch {
      return { 'dependencyNames': [], 'name': undefined };
    }
  }
}
