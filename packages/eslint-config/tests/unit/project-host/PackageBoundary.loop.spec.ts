import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import ts from 'typescript';

import type { ProjectHostInterface } from '../../../src/interfaces/ProjectHostInterface.js';

import { PackageBoundary } from '../../../src/rules/shared/PackageBoundary.js';

class BrowserHost implements ProjectHostInterface {
  private static readonly 'manifestSource': string = '{"dependencies":{"@fixture/contracts":"1.0.0"},"name":"browser-project"}';

  public findPackageRoot(filename: string): string | undefined {
    const result = filename.startsWith('/browser-project/') ? '/browser-project' : undefined;

    return result;
  }

  public isBuiltinSpecifier(_moduleSpecifier: string): boolean {
    return false;
  }

  public readTextFile(filename: string): string | undefined {
    const result = filename === '/browser-project/package.json' ? BrowserHost.manifestSource : undefined;

    return result;
  }

  public realPath(filename: string): string | undefined {
    const result = filename.startsWith('/browser-project/') ? filename : undefined;

    return result;
  }

  public resolveModule(_moduleSpecifier: string, _importerFilename: string): string | undefined {
    return undefined;
  }

  public resolveRelativePath(importerFilename: string, relativeSpecifier: string): string {
    const directoryEnd = importerFilename.lastIndexOf('/');
    const directory = directoryEnd === -1 ? '' : importerFilename.slice(0, directoryEnd);
    const result = relativeSpecifier.startsWith('./')
      ? `${directory}/${relativeSpecifier.slice(2)}`
      : relativeSpecifier;

    return result;
  }
}

const browserHost = new BrowserHost();

void describe('PackageBoundary', () => {
  void it('reads package boundaries through a browser project host and retains per-program caches', () => {
    const source = ts.createSourceFile('/browser-project/src/entry.ts', 'export {};', ts.ScriptTarget.Latest, true);
    const program = ts.createProgram({ 'options': {}, 'rootNames': [] });

    assert.deepEqual(
      PackageBoundary.directDependencyNamesFor(source, program, browserHost),
      ['@fixture/contracts']
    );
    assert.equal(
      PackageBoundary.isSourceForPackage(source, program, browserHost, 'browser-project', 'src/entry.ts'),
      true
    );
    assert.deepEqual(
      PackageBoundary.directDependencyNamesForFilename('/browser-project/src/entry.ts', browserHost),
      ['@fixture/contracts']
    );
  });

  void it('has no project boundary without a configured host', () => {
    const source = ts.createSourceFile('/browser-project/src/entry.ts', 'export {};', ts.ScriptTarget.Latest, true);
    const program = ts.createProgram({ 'options': {}, 'rootNames': [] });

    assert.equal(PackageBoundary.rootFor(source, program, undefined), undefined);
    assert.deepEqual(PackageBoundary.directDependencyNamesForFilename('/browser-project/src/entry.ts', undefined), []);
  });
});
