import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import type { ProjectHostInterface } from '../../../src/interfaces/ProjectHostInterface.js';

const expectedExports = [
  'HexagonalSuite',
  'entitySuite',
  'hygieneSuite',
  'plugin',
  'v8Plugin',
  'v8Suite'
];

const browserHost: ProjectHostInterface = {
  findPackageRoot(): string | undefined {
    return undefined;
  },
  isBuiltinSpecifier(moduleSpecifier: string): boolean {
    return moduleSpecifier === 'browser:storage';
  },
  readTextFile(): string | undefined {
    return undefined;
  },
  realPath(): string | undefined {
    return undefined;
  },
  resolveModule(): string | undefined {
    return undefined;
  },
  resolveRelativePath(importerFilename: string, relativeSpecifier: string): string {
    return new URL(relativeSpecifier, new URL(importerFilename, 'https://project.test')).pathname;
  }
};

const browserBoundaryOptions = {
  bindings: [
    { unit: 'folder', pattern: 'domain', layer: 'domain' },
    { unit: 'builtin', layer: 'external' }
  ],
  layers: ['domain', 'external'],
  sourceRoot: 'src'
};

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    }
  }
});

void it('keeps the compiled node and browser entrypoints exactly equivalent', async () => {
  const nodeEntry = await import('../../../dist/node/index.js');
  const browserEntry = await import('../../../dist/browser/index.js');

  assert.deepEqual(Object.keys(nodeEntry).toSorted(), expectedExports);
  assert.deepEqual(Object.keys(browserEntry).toSorted(), expectedExports);
  assert.deepEqual(Object.keys(nodeEntry.plugin.rules).toSorted(), Object.keys(browserEntry.plugin.rules).toSorted());
  assert.deepEqual(Object.keys(nodeEntry.v8Plugin.rules).toSorted(), Object.keys(browserEntry.v8Plugin.rules).toSorted());
});

void it('uses a browser project host configured through ESLint settings', async () => {
  const browserEntry = await import('../../../dist/browser/index.js');

  ruleTester.run('layer-import-boundary', browserEntry.plugin.rules['layer-import-boundary']!, {
    invalid: [
      {
        code: "import storage from 'browser:storage';",
        errors: [{ messageId: 'crossLayerImport' }],
        filename: '/repo/src/domain/User.ts',
        options: [browserBoundaryOptions],
        settings: { '@studnicky/projectHost': browserHost }
      }
    ],
    valid: []
  });
});
