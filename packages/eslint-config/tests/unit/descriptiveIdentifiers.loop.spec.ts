import { RuntimeError } from '@studnicky/errors/node';
import parser from '@typescript-eslint/parser';
import { Linter, RuleTester } from 'eslint';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import ts from 'typescript';

import { NodeProjectHost } from '../../src/node/NodeProjectHost.js';
import { descriptiveIdentifiers } from '../../src/rules/descriptiveIdentifiers.js';
import scenarioGroups from './descriptiveIdentifiers.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repositoryRoot = resolve(import.meta.dirname, '../../../..');

const ruleTester = new RuleTester({
  'languageOptions': {
    'parser': parser,
    'parserOptions': {
      'projectService': {
        'allowDefaultProject': ['*.ts']
      },
      'tsconfigRootDir': repositoryRoot
    }
  }
});

class ExternalPropertyFixture {
  static createDirectory(path: string): void {
    try {
      mkdirSync(path, { 'recursive': true });
    } catch (cause) {
      throw RuntimeError.create(`Cannot create directory ${path}`, { 'cause': cause });
    }
  }

  static createTemporaryRoot(prefix: string): string {
    try {
      const root = mkdtempSync(join(tmpdir(), prefix));
      return root;
    } catch (cause) {
      throw RuntimeError.create(`Cannot create temporary root ${prefix}`, { 'cause': cause });
    }
  }

  static removeTree(path: string): void {
    try {
      rmSync(path, { 'force': true, 'recursive': true });
    } catch (cause) {
      throw RuntimeError.create(`Cannot remove ${path}`, { 'cause': cause });
    }
  }

  static repeatCharacter(character: string, count: number): string {
    try {
      const repeated = character.repeat(count);
      return repeated;
    } catch (cause) {
      throw RuntimeError.create(`Cannot repeat a character ${String(count)} times`, { 'cause': cause });
    }
  }

  static writeJson(path: string, value: unknown): void {
    try {
      writeFileSync(path, JSON.stringify(value));
    } catch (cause) {
      throw RuntimeError.create(`Cannot write JSON to ${path}`, { 'cause': cause });
    }
  }

  static writeText(path: string, content: string): void {
    try {
      writeFileSync(path, content);
    } catch (cause) {
      throw RuntimeError.create(`Cannot write ${path}`, { 'cause': cause });
    }
  }
}

void describe('descriptive-identifiers', () => {
  void it('validates descriptive-identifiers scenarios', () => {
    ruleTester.run('descriptive-identifiers', descriptiveIdentifiers, scenarioGroups.rule);
  });

  void it('exempts JSON Schema vocabulary by exact name inside a SchemaNode.defineX(...) call, never by enclosing-call position', () => {
    const packageRuleTester = new RuleTester({
      'languageOptions': {
        'parser': parser,
        'parserOptions': {
          'projectService': { 'allowDefaultProject': ['*.ts'] },
          'tsconfigRootDir': import.meta.dirname
        }
      }
    });

    packageRuleTester.run('descriptive-identifiers', descriptiveIdentifiers, {
      'invalid': [{
        'code': "import { SchemaNode } from '@studnicky/entity/types';\nexport const Node = SchemaNode.defineObject({ type: 'object' } as const, { minVal: SchemaNode.defineNumber({ type: 'number' } as const) });",
        'errors': [{ 'messageId': 'banned-shortening' }],
        'filename': 'BadFieldInSchemaNodeCall.ts'
      }],
      'valid': [{
        'code': "import { SchemaNode } from '@studnicky/entity/types';\nexport const Node = SchemaNode.defineObject({ type: 'object' } as const, { field: SchemaNode.defineString({ minLength: 3, type: 'string' } as const) });",
        'filename': 'VocabKeyInSchemaNodeCall.ts'
      }]
    });
  });

  void it('resolves external option keys from their contextual type declarations', () => {
    const root = ExternalPropertyFixture.createTemporaryRoot('descriptive-identifiers-external-property-');
    const dependencyRoot = join(root, 'node_modules', '@fixture', 'options');
    const declaration = join(dependencyRoot, 'index.d.ts');
    const entry = join(root, 'src', 'entry.ts');
    const code = [
      'import { configure, configureCallbacks, configureSchema } from \'@fixture/options\';',
      `configure({ argsIgnorePattern: '', maxBuffer: 1, repo_path: '' });
      configureSchema({ minLength: 1, maxItems: 1 });
      configureCallbacks({ cb() {} });`,
      '',
      'interface LocalOptions { argsIgnorePattern: string; maxBuffer: number; repo_path: string; }',
      'const localOptions: LocalOptions = { argsIgnorePattern: \'\', maxBuffer: 1, repo_path: \'\' };',
      'const untypedOptions = { argsIgnorePattern: \'\', maxBuffer: 1, repo_path: \'\' };',
      'interface LocalCallbacks { cb(): void; }',
      'const localCallbacks: LocalCallbacks = { cb() {} };',
      'void [localOptions, untypedOptions, localCallbacks];'
    ].join('\n');

    try {
      ExternalPropertyFixture.createDirectory(join(root, 'src'));
      ExternalPropertyFixture.createDirectory(dependencyRoot);
      ExternalPropertyFixture.writeJson(join(root, 'package.json'), { 'name': 'fixture-project', 'type': 'module' });
      ExternalPropertyFixture.writeJson(join(dependencyRoot, 'package.json'), { 'name': '@fixture/options', 'types': './index.d.ts' });
      ExternalPropertyFixture.writeText(declaration, 'export interface ToolOptions { argsIgnorePattern: string; maxBuffer: number; repo_path: string; } export type Schema = boolean | Readonly<{ minLength?: number; maxItems?: number; }>; export declare function configure(options: ToolOptions): void; export declare function configureSchema(options: Schema): void; export interface CallbackOptions { cb(): void; } export declare function configureCallbacks(options: CallbackOptions): void;');
      ExternalPropertyFixture.writeText(entry, code);

      const program = ts.createProgram([entry], {
        'module': ts.ModuleKind.NodeNext,
        'moduleResolution': ts.ModuleResolutionKind.NodeNext,
        'strict': true,
        'target': ts.ScriptTarget.ES2022
      });
      const messages = new Linter({ 'cwd': root }).verify(code, [{
        'files': ['**/*.ts'],
        'languageOptions': { 'parser': parser, 'parserOptions': { 'programs': [program], 'tsconfigRootDir': root } },
        'plugins': { 'test': { 'rules': { 'descriptive-identifiers': descriptiveIdentifiers } } },
        'rules': { 'test/descriptive-identifiers': 'error' },
        'settings': { '@studnicky/projectHost': new NodeProjectHost() }
      }], { 'filename': entry });

      assert.deepEqual(messages.map((message) => { return message.line; }), [6, 6, 6, 7, 7, 7, 9, 10]);
      assert.ok(messages.every((message) => {
        const isShortening = message.messageId === 'banned-shortening';
        return isShortening;
      }));
    } finally {
      ExternalPropertyFixture.removeTree(root);
    }
  });

  void it('does not advise renaming object keys without property provenance', () => {
    const code = [
      "const requestOptions = { argsIgnorePattern: '', maxBuffer: 1, repo_path: '' };",
      "const quotedRequestOptions = { 'argsIgnorePattern': '', 'maxBuffer': 1, 'repo_path': '' };",
      'void [requestOptions, quotedRequestOptions];'
    ].join('\n');
    const messages = new Linter().verify(code, {
      'languageOptions': { 'ecmaVersion': 2024, 'sourceType': 'module' },
      'plugins': { 'test': { 'rules': { 'descriptive-identifiers': descriptiveIdentifiers } } },
      'rules': { 'test/descriptive-identifiers': 'error' }
    });

    assert.deepEqual(messages, []);
  });

  void it('does not exhibit polynomial blowup on a long uppercase run followed by a digit', () => {
    const linter = new Linter();
    const name = `${ExternalPropertyFixture.repeatCharacter('A', scenarioGroups.performance.repeatCount)}1x`;
    const start = Date.now();

    linter.verify(`const ${name} = 1; void ${name};`, {
      'languageOptions': { 'ecmaVersion': 2024, 'sourceType': 'module' },
      'plugins': { 'local': { 'rules': { 'descriptive-identifiers': descriptiveIdentifiers } } },
      'rules': { 'local/descriptive-identifiers': 'error' }
    });

    const elapsedMs = Date.now() - start;

    assert.ok(
      elapsedMs < scenarioGroups.performance.thresholdMs,
      `expected linting a pathological identifier to stay well under ${scenarioGroups.performance.thresholdMs}ms, took ${elapsedMs}ms`
    );
  });
});
