/** Defines synchronous project services required by project-aware lint rules. */
export interface ProjectHostInterface {
  findPackageRoot(filename: string): string | undefined;

  isBuiltinSpecifier(moduleSpecifier: string): boolean;

  readTextFile(filename: string): string | undefined;

  realPath(path: string): string | undefined;

  resolveModule(moduleSpecifier: string, importerFilename: string): string | undefined;

  resolveRelativePath(importerFilename: string, relativeSpecifier: string): string;
}
