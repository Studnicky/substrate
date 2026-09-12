import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import '../../../src/node/index.js';
import type { ProjectHostInterface } from '../../../src/interfaces/ProjectHostInterface.js';
import type { LayerOptionsEntity } from '../../../src/rules/layers/LayerOptionsEntity.js';
import { layerImportBoundary } from '../../../src/rules/arch/layerImportBoundary.js';
import scenarioGroups from './layerImportBoundary.scenarios.json' with { type: 'json' };

const browserHost: ProjectHostInterface = {
  findPackageRoot(_filename: string): string | undefined {
    return undefined;
  },
  isBuiltinSpecifier(moduleSpecifier: string): boolean {
    return moduleSpecifier === 'browser:storage';
  },
  readTextFile(_filename: string): string | undefined {
    return undefined;
  },
  realPath(_path: string): string | undefined {
    return undefined;
  },
  resolveModule(_moduleSpecifier: string, _importerFilename: string): string | undefined {
    return undefined;
  },
  resolveRelativePath(importerFilename: string, relativeSpecifier: string): string {
    const importer = new URL(importerFilename, 'https://project.test');
    const result = new URL(relativeSpecifier, importer).pathname;

    return result;
  }
};

const browserBoundaryOptions: LayerOptionsEntity.Type = {
  bindings: [
    { unit: 'folder', pattern: 'domain', layer: 'domain' },
    { unit: 'folder', pattern: 'adapters', layer: 'adapters' },
    { unit: 'builtin', layer: 'external' }
  ],
  layers: ['domain', 'ports', 'application', 'adapters', 'external'],
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

void describe('layer-import-boundary', () => {
  void it('uses configured browser project services for builtin and relative bindings', () => {
    ruleTester.run('layer-import-boundary', layerImportBoundary, {
      invalid: [
        {
          code: "import storage from 'browser:storage';",
          errors: [{ messageId: 'crossLayerImport' }],
          filename: '/repo/src/domain/User.ts',
          options: [browserBoundaryOptions],
          settings: { '@studnicky/projectHost': browserHost }
        },
        {
          code: "import adapter from '../adapters/Adapter';",
          errors: [{ messageId: 'crossLayerImport' }],
          filename: '/repo/src/domain/User.ts',
          options: [browserBoundaryOptions],
          settings: { '@studnicky/projectHost': browserHost }
        }
      ],
      valid: []
    });
  });


  void it('validates layer-import-boundary scenarios', () => {
    ruleTester.run('layer-import-boundary', layerImportBoundary, scenarioGroups);
  });
});
