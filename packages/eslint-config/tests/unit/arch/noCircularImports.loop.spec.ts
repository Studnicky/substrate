import { RuntimeError } from '@studnicky/errors/node';
import parser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import { strict } from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import ts from 'typescript';

import { noCircularImports } from '../../../src/rules/arch/noCircularImports.js';

const compilerOptions: ts.CompilerOptions = {
  'module': ts.ModuleKind.NodeNext,
  'moduleResolution': ts.ModuleResolutionKind.NodeNext,
  'strict': true,
  'target': ts.ScriptTarget.ES2022
};

class CircularImportHarness {
  public static createRoot(prefix: string): string {
    try {
      const result = mkdtempSync(join(tmpdir(), prefix));

      return result;
    } catch (cause) {
      throw RuntimeError.create(`Cannot create fixture root ${prefix}`, { 'cause': cause });
    }
  }

  public static createPackage(root: string, name: string): string {
    try {
      const packageDir = join(root, 'packages', name, 'src');

      mkdirSync(packageDir, { 'recursive': true });
      writeFileSync(join(root, 'packages', name, 'package.json'), JSON.stringify({ 'name': name, 'type': 'module' }));

      return packageDir;
    } catch (cause) {
      throw RuntimeError.create(`Cannot create fixture package ${name}`, { 'cause': cause });
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

  public static messageIdsFor(root: string, program: ts.Program, entry: string, code: string): readonly (string | null | undefined)[] {
    const linter = new Linter({ 'cwd': root });
    const messages = linter.verify(code, [{
      'files': ['**/*.ts'],
      'languageOptions': { 'parser': parser, 'parserOptions': { 'programs': [program], 'tsconfigRootDir': root } },
      'plugins': { 'test': { 'rules': { 'no-circular-imports': noCircularImports } } },
      'rules': { 'test/no-circular-imports': 'error' }
    }], { 'filename': entry });
    const result = messages.map((message) => { return message.messageId; });

    return result;
  }
}

void describe('no-circular-imports', () => {
  void it('reports a real two-file cycle (type-only import) on both sides', () => {
    const root = CircularImportHarness.createRoot('no-circular-imports-cycle-');

    try {
      const packageDir = CircularImportHarness.createPackage(root, 'fixture-cycle');

      const fileA = join(packageDir, 'A.ts');
      const fileB = join(packageDir, 'B.ts');
      const sourceA = "import type { B } from './B.js';\nexport class A { public sibling!: B; }\n";
      const sourceB = "import type { A } from './A.js';\nexport class B { public constructor(private readonly owner: A) {} }\n";

      CircularImportHarness.writeSource(fileA, sourceA);
      CircularImportHarness.writeSource(fileB, sourceB);

      const program = ts.createProgram([fileA, fileB], compilerOptions);

      strict.deepEqual(CircularImportHarness.messageIdsFor(root, program, fileA, sourceA), ['circularImport']);
      strict.deepEqual(CircularImportHarness.messageIdsFor(root, program, fileB, sourceB), ['circularImport']);
    } finally {
      CircularImportHarness.removeRoot(root);
    }
  });

  void it('stays silent when an import does not close a cycle', () => {
    const root = CircularImportHarness.createRoot('no-circular-imports-clean-');

    try {
      const packageDir = CircularImportHarness.createPackage(root, 'fixture-clean');

      const fileC = join(packageDir, 'C.ts');
      const fileD = join(packageDir, 'D.ts');
      const sourceC = "import type { D } from './D.js';\nexport class C { public dependency!: D; }\n";
      const sourceD = 'export class D {}\n';

      CircularImportHarness.writeSource(fileC, sourceC);
      CircularImportHarness.writeSource(fileD, sourceD);

      const program = ts.createProgram([fileC, fileD], compilerOptions);

      strict.deepEqual(CircularImportHarness.messageIdsFor(root, program, fileC, sourceC), []);
    } finally {
      CircularImportHarness.removeRoot(root);
    }
  });
});
