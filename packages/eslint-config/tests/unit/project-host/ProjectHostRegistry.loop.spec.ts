import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { it } from 'node:test';

import type { ProjectHostInterface } from '../../../src/interfaces/ProjectHostInterface.js';
import '../../../src/node/index.js';
import { ProjectHostRegistry } from '../../../src/runtime/ProjectHostRegistry.js';

const packageRoot = fileURLToPath(new URL('../../..', import.meta.url));
const browserHost: ProjectHostInterface = {
  findPackageRoot(): string | undefined {
    return '/browser/project';
  },
  readTextFile(): string | undefined {
    return 'export {};';
  },
  realPath(path: string): string | undefined {
    return path;
  },
  resolveModule(): string | undefined {
    return '/browser/project/node_modules/example/index.d.ts';
  },
  resolveRelativePath(importerFilename: string, relativeSpecifier: string): string {
    return `${importerFilename}/${relativeSpecifier}`;
  },
  isBuiltinSpecifier(): boolean {
    return false;
  }
};

it('selects validated project hosts and retains distinct node and browser defaults', () => {
  const nodeDefault = ProjectHostRegistry.hostFor({ 'settings': {} });

  assert.ok(nodeDefault);
  assert.equal(nodeDefault.findPackageRoot(join(packageRoot, 'src', 'index.ts')), realpathSync(packageRoot));
  assert.equal(nodeDefault.isBuiltinSpecifier('node:fs'), true);

  const configuredHost = ProjectHostRegistry.hostFor({
    'settings': { '@studnicky/projectHost': browserHost }
  });

  assert.equal(configuredHost, browserHost);

  const incompleteHost = {
    findPackageRoot(): string | undefined {
      return '/invalid';
    }
  };
  const fallbackHost = ProjectHostRegistry.hostFor({
    'settings': { '@studnicky/projectHost': incompleteHost }
  });

  assert.equal(fallbackHost, nodeDefault);

  const throwingSettings = Object.defineProperty({}, '@studnicky/projectHost', {
    get(): unknown {
      throw new Error('untrusted setting getter');
    }
  });
  const getterFallbackHost = ProjectHostRegistry.hostFor({ 'settings': throwingSettings });

  assert.equal(getterFallbackHost, nodeDefault);

  ProjectHostRegistry.setDefaultHost(undefined);
  assert.equal(ProjectHostRegistry.hostFor({ 'settings': {} }), undefined);
  ProjectHostRegistry.setDefaultHost(nodeDefault);
});
