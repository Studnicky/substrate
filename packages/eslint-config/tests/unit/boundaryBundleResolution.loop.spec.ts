import { RuntimeError } from '@studnicky/errors/node';
import parser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import { strict } from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it } from 'node:test';
import ts from 'typescript';

import { NodeProjectHost } from '../../src/node/NodeProjectHost.js';
import { entityFileShape } from '../../src/rules/entityFileShape.js';
import scenarios from './boundaryBundleResolution.scenarios.json' with { 'type': 'json' };

const compiler = 'export declare class EntityCompiler { static compileEntity<T>(schema: object): {validate:(candidate:unknown)=>candidate is T;intake:(input:unknown)=>T;create:(partial:unknown)=>T}; }';

class BundleResolutionHarness {
  public static createRoot(prefix: string): string {
    try {
      const result = mkdtempSync(join(tmpdir(), prefix));

      return result;
    } catch (cause) {
      throw RuntimeError.create(`Cannot create fixture root ${prefix}`, { 'cause': cause });
    }
  }

  public static createPackage(directory: string, packageName: string): void {
    try {
      mkdirSync(join(directory, 'src'), { 'recursive': true });
      writeFileSync(join(directory, 'package.json'), JSON.stringify({ 'name': packageName, 'type': 'module' }));
    } catch (cause) {
      throw RuntimeError.create(`Cannot create fixture package ${packageName}`, { 'cause': cause });
    }
  }

  public static writeSource(filename: string, source: string): void {
    try {
      writeFileSync(filename, source);
    } catch (cause) {
      throw RuntimeError.create(`Cannot write fixture file ${filename}`, { 'cause': cause });
    }
  }

  public static removeRoot(root: string): void {
    try {
      rmSync(root, { 'force': true, 'recursive': true });
    } catch (cause) {
      throw RuntimeError.create(`Cannot remove fixture root ${root}`, { 'cause': cause });
    }
  }

  public static describeMessages(messages: readonly unknown[]): string {
    try {
      const result = JSON.stringify(messages);

      return result;
    } catch (cause) {
      throw RuntimeError.create('Cannot serialize lint messages', { 'cause': cause });
    }
  }

  public static runScenario(root: string, scenario: (typeof scenarios)[number]): void {
    const directory = join(root, scenario.name);

    BundleResolutionHarness.createPackage(directory, scenario.packageName);

    const declaration = join(directory, 'src', scenario.file);

    BundleResolutionHarness.writeSource(declaration, compiler);

    const entry = join(directory, 'src', 'ExampleEntity.ts');

    BundleResolutionHarness.writeSource(entry, scenario.code);

    const program = ts.createProgram([entry, declaration], {
      'module': ts.ModuleKind.NodeNext,
      'moduleResolution': ts.ModuleResolutionKind.NodeNext,
      'strict': true,
      'target': ts.ScriptTarget.ES2022
    });
    const linter = new Linter({ 'cwd': root });
    const messages = linter.verify(scenario.code, [{
      'files': ['**/*.ts'],
      'languageOptions': { 'parser': parser, 'parserOptions': { 'programs': [program], 'tsconfigRootDir': root } },
      'plugins': { 'test': { 'rules': { 'shape': entityFileShape } } },
      'rules': { 'test/shape': 'error' },
      'settings': { '@studnicky/projectHost': new NodeProjectHost() }
    }], { 'filename': entry });

    strict.equal(messages.length === 0, scenario.valid, `${scenario.name}: ${BundleResolutionHarness.describeMessages(messages)}`);
  }

  public static runAll(): void {
    const root = BundleResolutionHarness.createRoot('boundary-bundle-resolution-');

    try {
      scenarios.forEach((scenario) => {
        BundleResolutionHarness.runScenario(root, scenario);
      });
    } finally {
      BundleResolutionHarness.removeRoot(root);
    }
  }
}

void it('rejects bundled entity boundary calls', () => {
  BundleResolutionHarness.runAll();
});
