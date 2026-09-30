import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import { join } from 'node:path';
import { it } from 'node:test';
import { fileURLToPath } from 'node:url';

import type { ProjectHostInterface } from '../../../src/interfaces/ProjectHostInterface.js';

import '../../../src/node/index.js';
import { ProjectHostRegistry } from '../../../src/runtime/ProjectHostRegistry.js';

class ProjectHostFixtures {
  public static packageRootPath(): string {
    try {
      const result = fileURLToPath(new URL('../../..', import.meta.url));

      return result;
    } catch (cause) {
      throw RuntimeError.create('Cannot resolve the package root from the test module URL', { 'cause': cause });
    }
  }

  public static realPathOf(path: string): string {
    try {
      const result = realpathSync(path);

      return result;
    } catch (cause) {
      throw RuntimeError.create(`Cannot resolve the real path of ${path}`, { 'cause': cause });
    }
  }
}

class BrowserHost implements ProjectHostInterface {
  public findPackageRoot(_filename: string): string | undefined {
    return '/browser/project';
  }

  public isBuiltinSpecifier(_moduleSpecifier: string): boolean {
    return false;
  }

  public readTextFile(_filename: string): string | undefined {
    return 'export {};';
  }

  public realPath(path: string): string | undefined {
    return path;
  }

  public resolveModule(_moduleSpecifier: string, _importerFilename: string): string | undefined {
    return '/browser/project/node_modules/example/index.d.ts';
  }

  public resolveRelativePath(importerFilename: string, relativeSpecifier: string): string {
    const result = `${importerFilename}/${relativeSpecifier}`;

    return result;
  }
}

const packageRoot = ProjectHostFixtures.packageRootPath();
const browserHost = new BrowserHost();

void it('selects validated project hosts and retains distinct node and browser defaults', () => {
  const nodeDefault = ProjectHostRegistry.hostFor({ 'settings': {} });

  assert.ok(nodeDefault !== undefined);
  assert.equal(nodeDefault.findPackageRoot(join(packageRoot, 'src', 'index.ts')), ProjectHostFixtures.realPathOf(packageRoot));
  assert.equal(nodeDefault.isBuiltinSpecifier('node:fs'), true);

  const configuredHost = ProjectHostRegistry.hostFor({
    'settings': { '@studnicky/projectHost': browserHost }
  });

  assert.equal(configuredHost, browserHost);

  const incompleteHost = {
    'findPackageRoot': function(): string | undefined {
      return '/invalid';
    }
  };
  const fallbackHost = ProjectHostRegistry.hostFor({
    'settings': { '@studnicky/projectHost': incompleteHost }
  });

  assert.equal(fallbackHost, nodeDefault);

  const throwingSettings = Object.defineProperty({}, '@studnicky/projectHost', {
    'get': function(): unknown {
      throw RuntimeError.create('untrusted setting getter');
    }
  });
  const getterFallbackHost = ProjectHostRegistry.hostFor({ 'settings': throwingSettings });

  assert.equal(getterFallbackHost, nodeDefault);

  ProjectHostRegistry.setDefaultHost(undefined);
  assert.equal(ProjectHostRegistry.hostFor({ 'settings': {} }), undefined);
  ProjectHostRegistry.setDefaultHost(nodeDefault);
});
