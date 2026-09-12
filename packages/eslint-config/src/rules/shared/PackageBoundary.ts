import type { Program, SourceFile } from 'typescript';

import { Predicates } from '@studnicky/types/browser';

import type { ProjectHostInterface } from '../../interfaces/ProjectHostInterface.js';

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
  private static readonly cacheByHost = new WeakMap<ProjectHostInterface, PackageCacheInterface>();
  private static readonly cacheByProgram = new WeakMap<Program, WeakMap<ProjectHostInterface, PackageCacheInterface>>();

  public static directDependencyNamesFor(
    sourceFile: SourceFile,
    program: Program,
    host: ProjectHostInterface | undefined
  ): readonly string[] {
    const packageRoot = PackageBoundary.rootFor(sourceFile, program, host);

    if (packageRoot === undefined || host === undefined) {
      return [];
    }

    return PackageBoundary.manifestFor(packageRoot, program, host).dependencyNames;
  }

  public static directDependencyNamesForFilename(
    filename: string,
    host: ProjectHostInterface | undefined
  ): readonly string[] {
    const packageRoot = PackageBoundary.rootForFilename(filename, host);

    if (packageRoot === undefined || host === undefined) {
      return [];
    }

    return PackageBoundary.manifestForFilename(packageRoot, host).dependencyNames;
  }

  public static isSourceForPackage(
    sourceFile: SourceFile,
    program: Program,
    host: ProjectHostInterface | undefined,
    packageName: string,
    relativeSourcePath: string
  ): boolean {
    const packageRoot = PackageBoundary.rootFor(sourceFile, program, host);

    if (packageRoot === undefined || host === undefined || PackageBoundary.manifestFor(packageRoot, program, host).name !== packageName) {
      return false;
    }

    const sourcePath = host.realPath(sourceFile.fileName);

    if (sourcePath === undefined) {
      return false;
    }

    const expectedSourcePath = host.resolveRelativePath(`${packageRoot}/package-boundary.ts`, `./${relativeSourcePath}`);
    const result = sourcePath === expectedSourcePath;

    return result;
  }

  public static rootFor(
    sourceFile: SourceFile,
    program: Program,
    host: ProjectHostInterface | undefined
  ): string | undefined {
    if (host === undefined) {
      return undefined;
    }

    const cache = PackageBoundary.cacheFor(program, host);
    const filename = sourceFile.fileName;

    if (cache.rootsByFilename.has(filename)) {
      const result = cache.rootsByFilename.get(filename);

      return result;
    }

    const result = host.findPackageRoot(filename);

    cache.rootsByFilename.set(filename, result);
    return result;
  }

  public static rootForFilename(
    filename: string,
    host: ProjectHostInterface | undefined
  ): string | undefined {
    if (host === undefined) {
      return undefined;
    }

    const cache = PackageBoundary.cacheForFilename(host);

    if (cache.rootsByFilename.has(filename)) {
      const result = cache.rootsByFilename.get(filename);

      return result;
    }

    const result = host.findPackageRoot(filename);

    cache.rootsByFilename.set(filename, result);
    return result;
  }

  private static cacheFor(program: Program, host: ProjectHostInterface): PackageCacheInterface {
    let cachesByHost = PackageBoundary.cacheByProgram.get(program);

    if (cachesByHost === undefined) {
      cachesByHost = new WeakMap<ProjectHostInterface, PackageCacheInterface>();
      PackageBoundary.cacheByProgram.set(program, cachesByHost);
    }

    let cache = cachesByHost.get(host);

    if (cache === undefined) {
      cache = PackageBoundary.createCache();
      cachesByHost.set(host, cache);
    }

    return cache;
  }

  private static cacheForFilename(host: ProjectHostInterface): PackageCacheInterface {
    let cache = PackageBoundary.cacheByHost.get(host);

    if (cache === undefined) {
      cache = PackageBoundary.createCache();
      PackageBoundary.cacheByHost.set(host, cache);
    }

    return cache;
  }

  private static createCache(): PackageCacheInterface {
    return {
      'manifestsByRoot': new Map<string, PackageManifestInterface>(),
      'rootsByFilename': new Map<string, string | undefined>()
    };
  }

  private static manifestFor(
    packageRoot: string,
    program: Program,
    host: ProjectHostInterface
  ): PackageManifestInterface {
    const cache = PackageBoundary.cacheFor(program, host);
    const cached = cache.manifestsByRoot.get(packageRoot);

    if (cached !== undefined) {
      return cached;
    }

    const manifest = PackageBoundary.readManifest(packageRoot, host);

    cache.manifestsByRoot.set(packageRoot, manifest);
    return manifest;
  }

  private static manifestForFilename(packageRoot: string, host: ProjectHostInterface): PackageManifestInterface {
    const cache = PackageBoundary.cacheForFilename(host);
    const cached = cache.manifestsByRoot.get(packageRoot);

    if (cached !== undefined) {
      return cached;
    }

    const result = PackageBoundary.readManifest(packageRoot, host);

    cache.manifestsByRoot.set(packageRoot, result);
    return result;
  }

  private static readManifest(packageRoot: string, host: ProjectHostInterface): PackageManifestInterface {
    const manifestFilename = host.resolveRelativePath(`${packageRoot}/package-boundary.ts`, './package.json');
    const sourceText = host.readTextFile(manifestFilename);

    if (sourceText === undefined) {
      return { 'dependencyNames': [], 'name': undefined };
    }

    try {
      const manifest: unknown = JSON.parse(sourceText);

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
