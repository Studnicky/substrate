import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it } from 'node:test';

import parser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import ts from 'typescript';

import { NodeProjectHost } from '../../src/node/NodeProjectHost.js';
import { folderContentShape } from '../../src/rules/folderContentShape.js';
import scenarios from './boundaryBundleResolution.scenarios.json' with { type: 'json' };

it('recognizes only resolved canonical local boundary bundles', () => {
  const root = mkdtempSync(join(tmpdir(), 'boundary-bundle-resolution-'));
  const compiler = 'export declare class SchemaValidator { static compileEntity<T>(schema: object): {validate:(candidate:unknown)=>candidate is T;intake:(input:unknown)=>T;create:(partial:unknown)=>T}; }';
  try {
    for (const scenario of scenarios) {
      const directory = join(root, scenario.name);
      mkdirSync(join(directory, 'src'), { recursive: true });
      writeFileSync(join(directory, 'package.json'), JSON.stringify({ name: scenario.packageName, type: 'module' }));
      const declaration = join(directory, 'src', scenario.file);
      writeFileSync(declaration, compiler);
      const entry = join(directory, 'src', 'ExampleEntity.ts');
      writeFileSync(entry, scenario.code);
      const program = ts.createProgram([entry, declaration], {
        strict: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext
      });
      const linter = new Linter({ cwd: root });
      const messages = linter.verify(scenario.code, [{
        files: ['**/*.ts'],
        languageOptions: { parser, parserOptions: { programs: [program], tsconfigRootDir: root } },
        plugins: { test: { rules: { shape: folderContentShape } } },
        settings: { '@studnicky/projectHost': new NodeProjectHost() },
        rules: { 'test/shape': 'error' }
      }], { filename: entry });
      if ('expectedMessageIds' in scenario) {
        assert.deepEqual(messages.map((message) => { return message.messageId; }), scenario.expectedMessageIds, scenario.name);
        continue;
      }
      assert.equal(messages.length === 0, scenario.valid, scenario.name + ': ' + JSON.stringify(messages));
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
