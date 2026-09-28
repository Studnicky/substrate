import type { ProjectHostInterface } from '../../interfaces/ProjectHostInterface.js';
import type { ResolvedDependencyInterface } from './ResolvedDependencyInterface.js';

import { PackageBoundary } from './PackageBoundary.js';

export class DependencyExportResolver {
  public static resolve(
    filename: string,
    host: ProjectHostInterface
  ): readonly ResolvedDependencyInterface[] {
    const dependencyNames = PackageBoundary.directDependencyNamesForFilename(filename, host);
    const dependencies: ResolvedDependencyInterface[] = [];
    const resolvedFilenames = new Set<string>();
    const dependencyCount = dependencyNames.length;

    for (let index = 0; index < dependencyCount; index += 1) {
      const dependencyName = dependencyNames[index]!;
      const moduleSpecifiers = DependencyExportResolver.publicModuleSpecifiers(
        dependencyName,
        filename,
        host
      );
      const specifierCount = moduleSpecifiers.length;

      for (let specifierIndex = 0; specifierIndex < specifierCount; specifierIndex += 1) {
        const resolution = host.resolveModule(moduleSpecifiers[specifierIndex]!, filename);

        if (resolution === undefined || !DependencyExportResolver.isTypeBearing(resolution)) {
          continue;
        }
        const packageRoot = PackageBoundary.rootForFilename(resolution, host);

        if (packageRoot === undefined || resolvedFilenames.has(resolution)) {
          continue;
        }

        resolvedFilenames.add(resolution);
        dependencies.push({
          'dependencyName': dependencyName,
          'filename': resolution,
          'packageRoot': packageRoot
        });
      }
    }

    return dependencies;
  }

  private static publicModuleSpecifiers(
    dependencyName: string,
    importerFilename: string,
    host: ProjectHostInterface
  ): readonly string[] {
    const manifestFilename = host.resolvePackageManifest?.(dependencyName, importerFilename);

    if (manifestFilename === undefined) {
      return [dependencyName];
    }
    const manifestText = host.readTextFile(manifestFilename);

    if (manifestText === undefined) {
      return [];
    }
    const exportSubpaths = DependencyExportResolver.exportSubpaths(manifestText);
    const result = exportSubpaths.map((subpath) => {
      const moduleSpecifier = subpath === '.' ? dependencyName : `${dependencyName}/${subpath.slice(2)}`;

      return moduleSpecifier;
    });

    return result;
  }

  private static exportSubpaths(manifestText: string): readonly string[] {
    let manifest: unknown;
    try {
      manifest = JSON.parse(manifestText);
    } catch {
      return [];
    }

    if (!DependencyExportResolver.isRecord(manifest)) {
      return [];
    }
    const exportsValue: unknown = Reflect.get(manifest, 'exports');

    if (exportsValue === undefined || typeof exportsValue === 'string') {
      return ['.'];
    }
    if (!DependencyExportResolver.isRecord(exportsValue)) {
      return [];
    }
    const keys = Object.keys(exportsValue);
    const hasSubpathMap = keys.some((key) => {
      const result = key === '.' || key.startsWith('./');

      return result;
    });

    if (!hasSubpathMap) {
      return ['.'];
    }
    const result = keys.filter((key) => {
      const isPublicExactSubpath = (key === '.' || key.startsWith('./')) && !key.includes('*');

      return isPublicExactSubpath;
    });

    return result;
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    const result = value !== null && typeof value === 'object' && !Array.isArray(value);

    return result;
  }

  private static isTypeBearing(filename: string): boolean {
    const result = filename.endsWith('.d.cts')
      || filename.endsWith('.d.mts')
      || filename.endsWith('.d.ts')
      || filename.endsWith('.cts')
      || filename.endsWith('.mts')
      || filename.endsWith('.tsx')
      || filename.endsWith('.ts');

    return result;
  }
}
