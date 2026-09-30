import { RuntimeError } from '@studnicky/errors/node';
import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ProjectHostInterface } from '../../../src/interfaces/ProjectHostInterface.js';

class BrowserHost implements ProjectHostInterface {
  public findPackageRoot(_filename: string): string | undefined {
    return undefined;
  }

  public isBuiltinSpecifier(moduleSpecifier: string): boolean {
    const isBuiltin = moduleSpecifier === 'browser:storage';

    return isBuiltin;
  }

  public readTextFile(_filename: string): string | undefined {
    return undefined;
  }

  public realPath(_path: string): string | undefined {
    return undefined;
  }

  public resolveModule(_moduleSpecifier: string, _importerFilename: string): string | undefined {
    return undefined;
  }

  public resolveRelativePath(importerFilename: string, relativeSpecifier: string): string {
    try {
      const pathname = new URL(relativeSpecifier, new URL(importerFilename, 'https://project.test')).pathname;

      return pathname;
    } catch (cause) {
      throw RuntimeError.create(`Cannot resolve ${relativeSpecifier} from ${importerFilename}`, { 'cause': cause });
    }
  }
}

class EntryParityFixture {
  static readonly 'browserBoundaryOptions' = {
    'bindings': [
      { 'layer': 'domain', 'pattern': 'domain', 'unit': 'folder' },
      { 'layer': 'external', 'unit': 'builtin' }
    ],
    'layers': ['domain', 'external'],
    'sourceRoot': 'src'
  };

  static readonly 'browserHost': ProjectHostInterface = new BrowserHost();

  static readonly 'expectedExports': readonly string[] = [
    'LayerBoundarySuite',
    'PlatformCallDefaults',
    'VocabularySuite',
    'classMechanicsSuite',
    'diagnosticsSuite',
    'entityModelSuite',
    'moduleDesignSuite',
    'plugin',
    'v8CollectionTraversalSuite',
    'v8ObjectShapeSuite',
    'v8Plugin',
    'v8RepeatedWorkSuite'
  ];
}

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': {
    'parser': parser,
    'parserOptions': {
      'ecmaVersion': 2022,
      'sourceType': 'module'
    }
  }
});

void it('keeps the compiled node and browser entrypoints exactly equivalent', async () => {
  const nodeEntry = await import('../../../dist/node/index.js');
  const browserEntry = await import('../../../dist/browser/index.js');

  assert.deepEqual(Object.keys(nodeEntry).toSorted(), EntryParityFixture.expectedExports);
  assert.deepEqual(Object.keys(browserEntry).toSorted(), EntryParityFixture.expectedExports);
  assert.deepEqual(Object.keys(nodeEntry.plugin.rules).toSorted(), Object.keys(browserEntry.plugin.rules).toSorted());
  assert.deepEqual(Object.keys(nodeEntry.v8Plugin.rules).toSorted(), Object.keys(browserEntry.v8Plugin.rules).toSorted());
});

void it('uses a browser project host configured through ESLint settings', async () => {
  const browserEntry = await import('../../../dist/browser/index.js');

  ruleTester.run('layer-import-boundary', browserEntry.plugin.rules['layer-import-boundary']!, {
    'invalid': [
      {
        'code': "import storage from 'browser:storage';",
        'errors': [{ 'messageId': 'crossLayerImport' }],
        'filename': '/repo/src/domain/User.ts',
        'options': [EntryParityFixture.browserBoundaryOptions],
        'settings': { '@studnicky/projectHost': EntryParityFixture.browserHost }
      }
    ],
    'valid': []
  });
});
