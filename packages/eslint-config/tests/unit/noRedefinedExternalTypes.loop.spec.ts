import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import parser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import ts from 'typescript';

import { noRedefinedExternalTypes } from '../../src/rules/noRedefinedExternalTypes.js';

function lint(code: string, entry: string, root: string): readonly import('eslint').Linter.LintMessage[] {
  writeFileSync(entry, code);

  return new Linter({ cwd: root }).verify(code, [{
    files: ['**/*.ts'],
    languageOptions: { parser, parserOptions: { tsconfigRootDir: root } },
    plugins: { test: { rules: { 'no-redefined-external-types': noRedefinedExternalTypes } } },
    rules: { 'test/no-redefined-external-types': 'error' }
  }], { filename: entry });
}

void describe('no-redefined-external-types', () => {
  void it('requires public direct-dependency types to be reused or extended', () => {
    const root = mkdtempSync(join(tmpdir(), 'no-redefined-external-types-'));
    const contractsRoot = join(root, 'node_modules', '@fixture', 'contracts');
    const transitiveRoot = join(root, 'node_modules', '@fixture', 'transitive');

    try {
      mkdirSync(join(root, 'src'), { recursive: true });
      mkdirSync(contractsRoot, { recursive: true });
      mkdirSync(transitiveRoot, { recursive: true });
      writeFileSync(join(root, 'package.json'), JSON.stringify({
        dependencies: { '@fixture/contracts': '1.0.0' },
        name: 'fixture-project',
        type: 'module'
      }));
      writeFileSync(join(contractsRoot, 'package.json'), JSON.stringify({
        name: '@fixture/contracts',
        types: './index.d.ts'
      }));
      writeFileSync(join(contractsRoot, 'index.d.ts'), [
        "export * from './options.js';",
        "export { type ExternalResult } from './result.js';",
        'interface InternalExternalStatus { readonly status: string; }',
        'export { type InternalExternalStatus as ExternalStatus };'
      ].join('\n'));
      writeFileSync(join(contractsRoot, 'options.d.ts'), 'export interface ExternalOptions { readonly label: string; readonly retries: number; }');
      writeFileSync(join(contractsRoot, 'result.d.ts'), 'export type ExternalResult = { readonly value: string; };');
      writeFileSync(join(transitiveRoot, 'package.json'), JSON.stringify({
        name: '@fixture/transitive',
        types: './index.d.ts'
      }));
      writeFileSync(join(transitiveRoot, 'index.d.ts'), 'export interface TransitiveOptions { readonly code: string; }');

      const redefinitions = lint([
        'export interface RebuiltOptions { readonly label: string; readonly retries: number; }',
        'export type RebuiltResult = { readonly value: string; };',
        'export interface RebuiltStatus { readonly status: string; }',
        'interface PrivateOptions { readonly label: string; readonly retries: number; }',
        'export interface TransitiveOptions { readonly code: string; }'
      ].join('\n'), join(root, 'src', 'redefinitions.ts'), root);
      const composition = lint([
        'import type { ExternalOptions } from "@fixture/contracts";',
        'export interface ComposedOptions extends ExternalOptions { readonly auditLabel: string; }'
      ].join('\n'), join(root, 'src', 'composition.ts'), root);

      assert.deepEqual(redefinitions.map((message) => {
        return {
          line: message.line,
          messageId: message.messageId,
          ruleId: message.ruleId
        };
      }), [
        { line: 1, messageId: 'redefined-external-type', ruleId: 'test/no-redefined-external-types' },
        { line: 2, messageId: 'redefined-external-type', ruleId: 'test/no-redefined-external-types' },
        { line: 3, messageId: 'redefined-external-type', ruleId: 'test/no-redefined-external-types' }
      ]);
      assert.deepEqual(composition, []);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  void it("caches direct dependency candidates for one package", () => {
    const root = mkdtempSync(join(tmpdir(), "no-redefined-external-types-cache-"));
    const contractsRoot = join(root, "node_modules", "fixture-contracts");
    const firstEntry = join(root, "src", "first.ts");
    const secondEntry = join(root, "src", "second.ts");
    const code = "export interface RebuiltOptions { readonly label: string; }";

    try {
      mkdirSync(join(root, "src"), { recursive: true });
      mkdirSync(contractsRoot, { recursive: true });
      writeFileSync(join(root, "package.json"), JSON.stringify({
        dependencies: { "fixture-contracts": "1.0.0" },
        name: "fixture-project",
        type: "module"
      }));
      writeFileSync(join(contractsRoot, "package.json"), JSON.stringify({
        name: "fixture-contracts",
        types: "./index.d.ts"
      }));
      writeFileSync(join(contractsRoot, "index.d.ts"), "export interface ExternalOptions { readonly label: string; }");
      writeFileSync(firstEntry, code);
      writeFileSync(secondEntry, code);

      const firstMessages = lint(code, firstEntry, root);

      writeFileSync(join(contractsRoot, "index.d.ts"), "export interface ChangedOptions { readonly changed: string; }");

      const secondMessages = lint(code, secondEntry, root);

      assert.equal(firstMessages.length, 1);
      assert.equal(secondMessages.length, 1);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  void it("does not construct compiler programs while cataloging dependency types", () => {
    const rulePath = join(import.meta.dirname, "../../src/rules/noRedefinedExternalTypes.ts");
    const source = ts.createSourceFile(rulePath, readFileSync(rulePath, "utf8"), ts.ScriptTarget.Latest, true);
    let constructsProgram = false;
    let accessesParserServices = false;
    let createsContextSourceAst = false;

    const visit = (node: ts.Node): void => {
      if (ts.isPropertyAccessExpression(node) && node.name.text === "parserServices") {
        accessesParserServices = true;
      }
      if (ts.isCallExpression(node) && ((ts.isIdentifier(node.expression) && node.expression.text === "createSourceFile") || (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "createSourceFile"))) {
        const sourceText = node.arguments.at(1);

        if (sourceText !== undefined && ts.isPropertyAccessExpression(sourceText) && sourceText.name.text === "text" && ts.isPropertyAccessExpression(sourceText.expression) && sourceText.expression.name.text === "sourceCode") {
          createsContextSourceAst = true;
        }
      }
      if (ts.isCallExpression(node) && ((ts.isIdentifier(node.expression) && node.expression.text === "createProgram") || (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "createProgram"))) {
        constructsProgram = true;
        return;
      }
      ts.forEachChild(node, visit);
    };

    visit(source);
    assert.equal(constructsProgram, false);
    assert.equal(accessesParserServices, false);
    assert.equal(createsContextSourceAst, false);
  });
});
