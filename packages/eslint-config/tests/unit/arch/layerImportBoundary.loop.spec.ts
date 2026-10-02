import { RuntimeError } from '@studnicky/errors/node';
import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'node:test';

import '../../../src/node/index.js';
import type { ProjectHostInterface } from '../../../src/interfaces/ProjectHostInterface.js';
import type { LayerOptionsEntity } from '../../../src/rules/layers/LayerOptionsEntity.js';

import { layerImportBoundary } from '../../../src/rules/arch/layerImportBoundary.js';
import scenarioGroups from './layerImportBoundary.scenarios.json' with { 'type': 'json' };

class BrowserHost implements ProjectHostInterface {
  public findPackageRoot(_filename: string): string | undefined {
    return undefined;
  }

  public isBuiltinSpecifier(moduleSpecifier: string): boolean {
    const result = moduleSpecifier === 'browser:storage';

    return result;
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
      const importer = new URL(importerFilename, 'https://project.test');
      const result = new URL(relativeSpecifier, importer).pathname;

      return result;
    } catch (cause) {
      throw RuntimeError.create(`Cannot resolve ${relativeSpecifier} from ${importerFilename}`, { 'cause': cause });
    }
  }
}

const browserHost = new BrowserHost();

const browserBoundaryOptions: LayerOptionsEntity.Type = {
  'bindings': [
    { 'layer': 'domain', 'pattern': 'domain', 'unit': 'folder' },
    { 'layer': 'adapters', 'pattern': 'adapters', 'unit': 'folder' },
    { 'layer': 'external', 'unit': 'builtin' }
  ],
  'layers': ['domain', 'ports', 'application', 'adapters', 'external'],
  'sourceRoot': 'src'
};

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

void describe('layer-import-boundary', () => {
  void it('uses configured browser project services for builtin and relative bindings', () => {
    ruleTester.run('layer-import-boundary', layerImportBoundary, {
      'invalid': [
        {
          'code': "import storage from 'browser:storage';",
          'errors': [{ 'messageId': 'crossLayerImport' }],
          'filename': '/repo/src/domain/User.ts',
          'options': [browserBoundaryOptions],
          'settings': { '@studnicky/projectHost': browserHost }
        },
        {
          'code': "import adapter from '../adapters/Adapter';",
          'errors': [{ 'messageId': 'crossLayerImport' }],
          'filename': '/repo/src/domain/User.ts',
          'options': [browserBoundaryOptions],
          'settings': { '@studnicky/projectHost': browserHost }
        }
      ],
      'valid': []
    });
  });


  void it('validates layer-import-boundary scenarios', () => {
    ruleTester.run('layer-import-boundary', layerImportBoundary, scenarioGroups);
  });
});
