import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';

import { Linter, RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';
import ts from 'typescript';

import { descriptiveIdentifiers } from '../../src/rules/descriptiveIdentifiers.js';
import scenarioGroups from './descriptiveIdentifiers.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repoRoot = resolve(import.meta.dirname, '../../../..');

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts']
      },
      tsconfigRootDir: repoRoot
    }
  }
});

void describe('descriptive-identifiers', () => {
  void it('validates descriptive-identifiers scenarios', () => {
    ruleTester.run('descriptive-identifiers', descriptiveIdentifiers, scenarioGroups.rule);
  });

  void it('resolves external option keys from their contextual type declarations', () => {
    const root = mkdtempSync(join(tmpdir(), 'descriptive-identifiers-external-property-'));
    const dependencyRoot = join(root, 'node_modules', '@fixture', 'options');
    const declaration = join(dependencyRoot, 'index.d.ts');
    const entry = join(root, 'src', 'entry.ts');
    const code = [
      `import { configure, configureCallbacks, configureSchema } from '@fixture/options';`,
      `configure({ argsIgnorePattern: '', maxBuffer: 1, repo_path: '' });
      configureSchema({ minLength: 1, maxItems: 1 });
      configureCallbacks({ cb() {} });`,
      '',
      `interface LocalOptions { argsIgnorePattern: string; maxBuffer: number; repo_path: string; }`,
      `const localOptions: LocalOptions = { argsIgnorePattern: '', maxBuffer: 1, repo_path: '' };`,
      `const untypedOptions = { argsIgnorePattern: '', maxBuffer: 1, repo_path: '' };`,
      `interface LocalCallbacks { cb(): void; }`,
      `const localCallbacks: LocalCallbacks = { cb() {} };`,
      `void [localOptions, untypedOptions, localCallbacks];`
    ].join('\n');

    try {
      mkdirSync(join(root, 'src'), { recursive: true });
      mkdirSync(dependencyRoot, { recursive: true });
      writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'fixture-project', type: 'module' }));
      writeFileSync(join(dependencyRoot, 'package.json'), JSON.stringify({ name: '@fixture/options', types: './index.d.ts' }));
      writeFileSync(declaration, 'export interface ToolOptions { argsIgnorePattern: string; maxBuffer: number; repo_path: string; } export type Schema = boolean | Readonly<{ minLength?: number; maxItems?: number; }>; export declare function configure(options: ToolOptions): void; export declare function configureSchema(options: Schema): void; export interface CallbackOptions { cb(): void; } export declare function configureCallbacks(options: CallbackOptions): void;');
      writeFileSync(entry, code);

      const program = ts.createProgram([entry], {
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        strict: true,
        target: ts.ScriptTarget.ES2022
      });
      const messages = new Linter({ cwd: root }).verify(code, [{
        files: ['**/*.ts'],
        languageOptions: { parser, parserOptions: { programs: [program], tsconfigRootDir: root } },
        plugins: { test: { rules: { 'descriptive-identifiers': descriptiveIdentifiers } } },
        rules: { 'test/descriptive-identifiers': 'error' }
      }], { filename: entry });

      assert.deepEqual(messages.map((message) => { return message.line; }), [6, 6, 6, 7, 7, 7, 9, 10]);
      assert.ok(messages.every((message) => { return message.messageId === 'banned-shortening'; }));
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  void it('does not advise renaming object keys without property provenance', () => {
    const code = [
      "const requestOptions = { argsIgnorePattern: '', maxBuffer: 1, repo_path: '' };",
      "const quotedRequestOptions = { 'argsIgnorePattern': '', 'maxBuffer': 1, 'repo_path': '' };",
      'void [requestOptions, quotedRequestOptions];'
    ].join('\n');
    const messages = new Linter().verify(code, {
      languageOptions: { ecmaVersion: 2024, sourceType: 'module' },
      plugins: { test: { rules: { 'descriptive-identifiers': descriptiveIdentifiers } } },
      rules: { 'test/descriptive-identifiers': 'error' }
    });

    assert.deepEqual(messages, []);
  });

  void it('does not exhibit polynomial blowup on a long uppercase run followed by a digit', () => {
    const linter = new Linter();
    const name = `${'A'.repeat(scenarioGroups.performance.repeatCount)}1x`;
    const start = Date.now();

    linter.verify(`const ${name} = 1; void ${name};`, {
      languageOptions: { ecmaVersion: 2024, sourceType: 'module' },
      plugins: { local: { rules: { 'descriptive-identifiers': descriptiveIdentifiers } } },
      rules: { 'local/descriptive-identifiers': 'error' }
    });

    const elapsedMs = Date.now() - start;

    assert.ok(
      elapsedMs < scenarioGroups.performance.thresholdMs,
      `expected linting a pathological identifier to stay well under ${scenarioGroups.performance.thresholdMs}ms, took ${elapsedMs}ms`
    );
  });
});
