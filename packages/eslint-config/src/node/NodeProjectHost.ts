import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { findPackageJSON, isBuiltin } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  type CompilerOptions,
  createModuleResolutionCache,
  ModuleKind,
  type ModuleResolutionCache,
  ModuleResolutionKind,
  resolveModuleName,
  ScriptTarget,
  sys
} from 'typescript';

import type { ProjectHostInterface } from '../interfaces/ProjectHostInterface.js';

const NODE_MODULE_RESOLUTION_OPTIONS: CompilerOptions = {
  'module': ModuleKind.NodeNext,
  'moduleResolution': ModuleResolutionKind.NodeNext,
  'target': ScriptTarget.ES2022
};

/** Provides Node filesystem and TypeScript module-resolution services to lint rules. */
export class NodeProjectHost implements ProjectHostInterface {
  private readonly moduleResolutionCache: ModuleResolutionCache = createModuleResolutionCache(
    process.cwd(),
    NodeProjectHost.canonicalizeFilename,
    NODE_MODULE_RESOLUTION_OPTIONS
  );

  private static canonicalizeFilename(filename: string): string {
    if (sys.useCaseSensitiveFileNames) {
      const result = filename;

      return result;
    }

    const result = filename.toLowerCase();

    return result;
  }
  public findPackageRoot(filename: string): string | undefined {
    const canonicalFilename = this.realPath(filename) ?? filename;

    let directory = dirname(canonicalFilename);

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

  public readTextFile(filename: string): string | undefined {
    try {
      const result = readFileSync(filename, 'utf8');

      return result;
    } catch {
      return undefined;
    }
  }

  public realPath(path: string): string | undefined {
    try {
      const result = realpathSync(path);

      return result;
    } catch {
      return undefined;
    }
  }

  public resolvePackageManifest(packageName: string, importerFilename: string): string | undefined {
    try {
      const result = findPackageJSON(packageName, pathToFileURL(importerFilename));

      return result;
    } catch {
      return undefined;
    }
  }

  public resolveModule(moduleSpecifier: string, importerFilename: string): string | undefined {
    const resolution = resolveModuleName(moduleSpecifier, importerFilename, NODE_MODULE_RESOLUTION_OPTIONS, sys, this.moduleResolutionCache).resolvedModule;
    const result = resolution?.resolvedFileName;

    return result;
  }

  public resolveRelativePath(importerFilename: string, relativeSpecifier: string): string {
    const result = resolve(dirname(importerFilename), relativeSpecifier);

    return result;
  }

  public isBuiltinSpecifier(moduleSpecifier: string): boolean {
    const result = isBuiltin(moduleSpecifier);

    return result;
  }
}
