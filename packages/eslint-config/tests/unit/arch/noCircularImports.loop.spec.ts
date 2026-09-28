import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import parser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import ts from 'typescript';

import { noCircularImports } from '../../../src/rules/arch/noCircularImports.js';

const compilerOptions: ts.CompilerOptions = {
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  strict: true,
  target: ts.ScriptTarget.ES2022
};

function messageIdsFor(root: string, program: ts.Program, entry: string, code: string): readonly (string | null | undefined)[] {
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

void describe('no-circular-imports', () => {
  void it('reports a real two-file cycle (type-only import) on both sides', () => {
    const root = mkdtempSync(join(tmpdir(), 'no-circular-imports-cycle-'));

    try {
      const packageDir = join(root, 'packages', 'fixture-cycle', 'src');

      mkdirSync(packageDir, { 'recursive': true });
      writeFileSync(join(root, 'packages', 'fixture-cycle', 'package.json'), JSON.stringify({ 'name': 'fixture-cycle', 'type': 'module' }));

      const fileA = join(packageDir, 'A.ts');
      const fileB = join(packageDir, 'B.ts');
      const sourceA = "import type { B } from './B.js';\nexport class A { public sibling!: B; }\n";
      const sourceB = "import type { A } from './A.js';\nexport class B { public constructor(private readonly owner: A) {} }\n";

      writeFileSync(fileA, sourceA);
      writeFileSync(fileB, sourceB);

      const program = ts.createProgram([fileA, fileB], compilerOptions);

      assert.deepEqual(messageIdsFor(root, program, fileA, sourceA), ['circularImport']);
      assert.deepEqual(messageIdsFor(root, program, fileB, sourceB), ['circularImport']);
    } finally {
      rmSync(root, { 'force': true, 'recursive': true });
    }
  });

  void it('stays silent when an import does not close a cycle', () => {
    const root = mkdtempSync(join(tmpdir(), 'no-circular-imports-clean-'));

    try {
      const packageDir = join(root, 'packages', 'fixture-clean', 'src');

      mkdirSync(packageDir, { 'recursive': true });
      writeFileSync(join(root, 'packages', 'fixture-clean', 'package.json'), JSON.stringify({ 'name': 'fixture-clean', 'type': 'module' }));

      const fileC = join(packageDir, 'C.ts');
      const fileD = join(packageDir, 'D.ts');
      const sourceC = "import type { D } from './D.js';\nexport class C { public dependency!: D; }\n";
      const sourceD = 'export class D {}\n';

      writeFileSync(fileC, sourceC);
      writeFileSync(fileD, sourceD);

      const program = ts.createProgram([fileC, fileD], compilerOptions);

      assert.deepEqual(messageIdsFor(root, program, fileC, sourceC), []);
    } finally {
      rmSync(root, { 'force': true, 'recursive': true });
    }
  });
});
