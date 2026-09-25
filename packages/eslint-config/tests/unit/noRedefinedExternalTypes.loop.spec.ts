import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';

import parser from '@typescript-eslint/parser';
import tseslint from 'typescript-eslint';
import { Linter } from 'eslint';
import ts from 'typescript';

import type { ProjectHostInterface } from '../../src/interfaces/ProjectHostInterface.js';

import { NodeProjectHost } from '../../src/node/NodeProjectHost.js';
import { noRedefinedExternalTypes } from '../../src/rules/noRedefinedExternalTypes.js';

const workspaceRoot = resolve(import.meta.dirname, '../../../..');

function lintWorkspaceSource(filename: string): readonly import('eslint').Linter.LintMessage[] {
  const source = readFileSync(filename, 'utf8');
  const result = new Linter({ cwd: workspaceRoot }).verify(source, [{
    files: ['**/*.ts'],
    languageOptions: {
      parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: workspaceRoot
      }
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      test: { rules: { 'no-redefined-external-types': noRedefinedExternalTypes } }
    },
    rules: {
      '@typescript-eslint/no-redundant-type-constituents': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      'test/no-redefined-external-types': 'error'
    }
  }], { filename });

  return result;
}

// Real import-graph traversal, bounded to the rule's own relative-imported files — the set
// this rule owns and must never build a second TS compiler program across.
function collectLocalModuleClosure(entryPath: string, visited: Set<string> = new Set()): Set<string> {
  if (visited.has(entryPath)) {
    return visited;
  }

  visited.add(entryPath);

  const source = ts.createSourceFile(entryPath, readFileSync(entryPath, "utf8"), ts.ScriptTarget.Latest, true);
  const entryDir = resolve(entryPath, "..");

  ts.forEachChild(source, (node) => {
    const moduleSpecifier = (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) ? node.moduleSpecifier : undefined;

    if (moduleSpecifier === undefined || !ts.isStringLiteral(moduleSpecifier) || !moduleSpecifier.text.startsWith(".")) {
      return;
    }

    const resolvedPath = resolve(entryDir, moduleSpecifier.text.replace(/\.js$/, ".ts"));

    collectLocalModuleClosure(resolvedPath, visited);
  });

  return visited;
}

function prepareFixtureProject(root: string, sources: ReadonlyMap<string, string>): void {
  for (const [entry, source] of sources) {
    writeFileSync(entry, source);
  }

  writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      lib: ['ES2022', 'DOM'],
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      strict: true,
      target: 'ES2022'
    },
    include: ['src/**/*.ts']
  }));
}

function lint(
  code: string,
  entry: string,
  root: string,
  host: ProjectHostInterface = new NodeProjectHost()
): readonly import('eslint').Linter.LintMessage[] {
  return new Linter({ cwd: root }).verify(code, [{
    files: ['**/*.ts'],
    languageOptions: {
      parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: root
      }
    },
    plugins: { test: { rules: { 'no-redefined-external-types': noRedefinedExternalTypes } } },
    settings: { '@studnicky/projectHost': host },
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
        exports: {
          './interfaces': { import: './interfaces.js', types: './interfaces.d.ts' },
          './runtime': { import: './runtime.js' }
        },
        name: '@fixture/contracts'
      }));
      writeFileSync(join(contractsRoot, 'interfaces.d.ts'), [
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

      const redefinitionsEntry = join(root, 'src', 'redefinitions.ts');
      const compositionEntry = join(root, 'src', 'composition.ts');
      const redefinitionsSource = [
        'import type { ExternalOptions } from "@fixture/contracts/interfaces";',
        'export interface RebuiltOptions { readonly label: string; readonly retries: number; }',
        'export type RebuiltResult = { readonly value: string; };',
        'export interface RebuiltStatus { readonly status: string; }',
        'interface PrivateOptions { readonly label: string; readonly retries: number; }',
        'export interface TransitiveOptions { readonly code: string; }'
      ].join('\n');
      const compositionSource = [
        'import type { ExternalOptions } from "@fixture/contracts/interfaces";',
        'export interface ComposedOptions extends ExternalOptions { readonly auditLabel: string; }'
      ].join('\n');
      prepareFixtureProject(root, new Map([
        [redefinitionsEntry, redefinitionsSource],
        [compositionEntry, compositionSource]
      ]));

      const redefinitions = lint(redefinitionsSource, redefinitionsEntry, root);
      const composition = lint(compositionSource, compositionEntry, root);

      assert.deepEqual(redefinitions.map((message) => {
        return {
          line: message.line,
          messageId: message.messageId,
          ruleId: message.ruleId
        };
      }), [
        { line: 2, messageId: 'redefined-external-type', ruleId: 'test/no-redefined-external-types' },
        { line: 3, messageId: 'redefined-external-type', ruleId: 'test/no-redefined-external-types' },
        { line: 4, messageId: 'redefined-external-type', ruleId: 'test/no-redefined-external-types' }
      ]);
      assert.deepEqual(composition, []);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });


  void it('uses TypeScript semantic identity for platform contracts and canonical entities', () => {
    const root = mkdtempSync(join(tmpdir(), 'no-redefined-external-types-semantic-'));
    const entry = join(root, 'src', 'semantic.ts');

    try {
      mkdirSync(join(root, 'src'), { recursive: true });
      writeFileSync(join(root, 'package.json'), JSON.stringify({
        name: 'semantic-fixture',
        type: 'module'
      }));

      const redefinitionsSource = [
        'export type RebuiltStorage = {',
        '  readonly length: number;',
        '  clear: () => void;',
        '  getItem: (key: string) => string | null;',
        '  key: (index: number) => string | null;',
        '  removeItem: (key: string) => void;',
        '  setItem: (key: string, value: string) => void;',
        '};',
        'export type RebuiltWorkerConstructor = {',
        '  readonly prototype: Worker;',
        '  new(scriptURL: string | URL, options?: WorkerOptions): Worker;',
        '};',
        'export type RebuiltRequestInit = {',
        '  body?: BodyInit | null;',
        '  cache?: RequestCache;',
        '  credentials?: RequestCredentials;',
        '  headers?: HeadersInit;',
        '  integrity?: string;',
        '  keepalive?: boolean;',
        '  method?: string;',
        '  mode?: RequestMode;',
        '  priority?: RequestPriority;',
        '  redirect?: RequestRedirect;',
        '  referrer?: string;',
        '  referrerPolicy?: ReferrerPolicy;',
        '  signal?: AbortSignal | null;',
        '  window?: null;',
        '};',
        'export namespace AccountEntity {',
        '  export const Schema = {};',
        '  export type Type = { readonly id: string; };',
        '}',
        'export interface RebuiltAccount { readonly id: string; }'
      ].join('\n');
      const allowedEntry = join(root, 'src', 'allowed.ts');
      const allowedSource = [
        "export type RequestWithMethod = Omit<RequestInit, 'method'> & { readonly method: 'GET'; };",
        'export interface ParserServicePort { readonly parse: (input: string) => unknown; }'
      ].join('\n');
      prepareFixtureProject(root, new Map([
        [entry, redefinitionsSource],
        [allowedEntry, allowedSource]
      ]));

      const redefinitions = lint(redefinitionsSource, entry, root);
      const allowed = lint(allowedSource, allowedEntry, root);

      assert.deepEqual(redefinitions.map((message) => {
        return {
          line: message.line,
          messageId: message.messageId,
          ruleId: message.ruleId
        };
      }), [
        { line: 1, messageId: 'redefined-external-type', ruleId: 'test/no-redefined-external-types' },
        { line: 9, messageId: 'redefined-external-type', ruleId: 'test/no-redefined-external-types' },
        { line: 33, messageId: 'redefined-external-type', ruleId: 'test/no-redefined-external-types' }
      ]);
      assert.deepEqual(allowed, []);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  void it("exempts canonical entity Types and optional external data shapes", () => {
    const root = mkdtempSync(join(tmpdir(), "no-redefined-external-types-canonical-"));
    const contractsRoot = join(root, "node_modules", "@fixture", "contracts");
    const entityInterfacesRoot = join(root, "node_modules", "@studnicky", "entity", "interfaces");
    const entityTypesRoot = join(root, "node_modules", "@studnicky", "entity", "types");
    const entry = join(root, "src", "entity.ts");

    try {
      mkdirSync(join(root, "src"), { recursive: true });
      mkdirSync(contractsRoot, { recursive: true });
      mkdirSync(entityInterfacesRoot, { recursive: true });
      mkdirSync(entityTypesRoot, { recursive: true });
      writeFileSync(join(root, "package.json"), JSON.stringify({
        dependencies: { "@fixture/contracts": "1.0.0", "@studnicky/entity": "1.0.0" },
        name: "canonical-entity-fixture",
        type: "module"
      }));
      writeFileSync(join(contractsRoot, "package.json"), JSON.stringify({
        name: "@fixture/contracts",
        types: "./index.d.ts"
      }));
      writeFileSync(join(contractsRoot, "index.d.ts"), "export interface ExternalRecord { readonly id: string; }");
      writeFileSync(join(entityInterfacesRoot, "package.json"), JSON.stringify({
        name: "@studnicky/entity/interfaces",
        types: "./index.d.ts"
      }));
      writeFileSync(join(entityInterfacesRoot, "index.d.ts"), "export interface SchemaNodeInterface<TSchema, TStatic> { readonly '__schema'?: TSchema; readonly '__static'?: TStatic; }");
      writeFileSync(join(entityTypesRoot, "package.json"), JSON.stringify({
        name: "@studnicky/entity/types",
        types: "./index.d.ts"
      }));
      writeFileSync(join(entityTypesRoot, "index.d.ts"), [
        "import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';",
        "export type NodeStaticType<TNode extends SchemaNodeInterface<unknown, unknown>> = { readonly id: string; };"
      ].join("\n"));

      const source = [
        "import type { ExternalRecord } from '@fixture/contracts';",
        "import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';",
        "import type { NodeStaticType } from '@studnicky/entity/types';",
        "declare function defineNode<S>(schema: unknown): SchemaNodeInterface<unknown, S>;",
        "export namespace AccountEntity {",
        "  export const Node = defineNode<{ id: string }>({ type: 'object' } as const);",
        "  export type Type = NodeStaticType<typeof Node>;",
        "}",
        "export namespace TeamEntity {",
        "  export const Node = defineNode<{ id: string }>({ type: 'object' } as const);",
        "  export interface Type extends NodeStaticType<typeof Node> {}",
        "}",
        "export interface RebuiltRecord { readonly id: string; }",
        "export interface ErrorDetailPort { readonly cause?: Error; readonly id?: string; }",
        "export interface UnrelatedOptionalShape { readonly id?: string; }"
      ].join("\n");
      prepareFixtureProject(root, new Map([[entry, source]]));

      const messages = lint(source, entry, root);

      assert.deepEqual(messages.map((message) => {
        return { line: message.line, messageId: message.messageId };
      }), [{ line: 13, messageId: "redefined-external-type" }]);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  void it("exempts a canonical entity InputType even when it structurally coincides with an unrelated dependency's public type", () => {
    const root = mkdtempSync(join(tmpdir(), "no-redefined-external-types-input-type-"));
    const entityInterfacesRoot = join(root, "node_modules", "@studnicky", "entity", "interfaces");
    const entityTypesRoot = join(root, "node_modules", "@studnicky", "entity", "types");
    const bundlerRoot = join(root, "node_modules", "@fixture", "bundler");
    const entry = join(root, "src", "entity.ts");

    try {
      mkdirSync(join(root, "src"), { recursive: true });
      mkdirSync(entityInterfacesRoot, { recursive: true });
      mkdirSync(entityTypesRoot, { recursive: true });
      mkdirSync(bundlerRoot, { recursive: true });
      writeFileSync(join(root, "package.json"), JSON.stringify({
        dependencies: { "@fixture/bundler": "1.0.0", "@studnicky/entity": "1.0.0" },
        name: "input-type-fixture",
        type: "module"
      }));
      writeFileSync(join(entityInterfacesRoot, "package.json"), JSON.stringify({
        name: "@studnicky/entity/interfaces",
        types: "./index.d.ts"
      }));
      writeFileSync(join(entityInterfacesRoot, "index.d.ts"), "export interface SchemaNodeInterface<TSchema, TStatic> { readonly '__schema'?: TSchema; readonly '__static'?: TStatic; }");
      writeFileSync(join(entityTypesRoot, "package.json"), JSON.stringify({
        name: "@studnicky/entity/types",
        types: "./index.d.ts"
      }));
      writeFileSync(join(entityTypesRoot, "index.d.ts"), [
        "import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';",
        "export type NodeStaticType<TNode extends SchemaNodeInterface<unknown, unknown>> = { readonly build: string; readonly entryFileNames?: string; };",
        "export type NodeInputType<TNode extends SchemaNodeInterface<unknown, unknown>> = { readonly build: string; readonly entryFileNames?: string; };"
      ].join("\n"));
      writeFileSync(join(bundlerRoot, "package.json"), JSON.stringify({
        name: "@fixture/bundler",
        types: "./index.d.ts"
      }));
      writeFileSync(join(bundlerRoot, "index.d.ts"), "export interface OutputPlugin { readonly build: string; readonly entryFileNames?: string; }");

      const source = [
        "import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';",
        "import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';",
        "declare function defineNode<S>(schema: unknown): SchemaNodeInterface<unknown, S>;",
        "export namespace ContextConfigEntity {",
        "  export const Node = defineNode<{ build: string }>({ type: 'object' } as const);",
        "  export type Type = NodeStaticType<typeof Node>;",
        "  export type InputType = NodeInputType<typeof Node>;",
        "}"
      ].join("\n");
      prepareFixtureProject(root, new Map([[entry, source]]));

      const messages = lint(source, entry, root);

      assert.deepEqual(messages, []);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  void it("still reports a hand-written InputType with no schema provenance that structurally coincides with a dependency's public type", () => {
    const root = mkdtempSync(join(tmpdir(), "no-redefined-external-types-input-type-invalid-"));
    const bundlerRoot = join(root, "node_modules", "@fixture", "bundler");
    const entry = join(root, "src", "entity.ts");

    try {
      mkdirSync(join(root, "src"), { recursive: true });
      mkdirSync(bundlerRoot, { recursive: true });
      writeFileSync(join(root, "package.json"), JSON.stringify({
        dependencies: { "@fixture/bundler": "1.0.0" },
        name: "input-type-invalid-fixture",
        type: "module"
      }));
      writeFileSync(join(bundlerRoot, "package.json"), JSON.stringify({
        name: "@fixture/bundler",
        types: "./index.d.ts"
      }));
      writeFileSync(join(bundlerRoot, "index.d.ts"), "export interface OutputPlugin { readonly build: string; readonly entryFileNames?: string; }");

      const source = [
        "export namespace ContextConfigEntity {",
        "  export type InputType = { readonly build: string; readonly entryFileNames?: string; };",
        "}"
      ].join("\n");
      prepareFixtureProject(root, new Map([[entry, source]]));

      const messages = lint(source, entry, root);

      assert.deepEqual(messages.map((message) => {
        return { line: message.line, messageId: message.messageId };
      }), [{ line: 2, messageId: "redefined-external-type" }]);
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
      prepareFixtureProject(root, new Map([
        [firstEntry, code],
        [secondEntry, code]
      ]));

      const host = new NodeProjectHost();
      const firstMessages = lint(code, firstEntry, root, host);

      writeFileSync(join(contractsRoot, "index.d.ts"), "export interface ChangedOptions { readonly changed: string; }");

      const secondMessages = lint(code, secondEntry, root, host);

      assert.equal(firstMessages.length, 1);
      assert.equal(secondMessages.length, 1);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  void it("does not construct compiler programs anywhere across its own files", () => {
    const rulePath = join(import.meta.dirname, "../../src/rules/noRedefinedExternalTypes.ts");
    const ruleFiles = collectLocalModuleClosure(rulePath);

    let constructsProgram = false;
    let accessesParserServices = false;
    let createsContextSourceAst = false;

    for (const filePath of ruleFiles) {
      const source = ts.createSourceFile(filePath, readFileSync(filePath, "utf8"), ts.ScriptTarget.Latest, true);

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
    }

    // The real invariant: no file the rule owns ever builds a second TS compiler program —
    // it relies exclusively on the linter-supplied `parserServices.program`.
    assert.equal(constructsProgram, false);
    assert.equal(accessesParserServices, true);
    assert.equal(createsContextSourceAst, false);
  });
  void it('uses a browser project host to detect public direct-dependency type redefinitions', () => {
    const applicationRoot = '/browser-project';
    const dependencyRoot = '/browser-project/dependencies/fixture-contracts';
    const entry = `${applicationRoot}/src/redefinitions.ts`;
    const dependencyEntry = `${dependencyRoot}/interfaces.d.ts`;
    const dependencyTypes = `${dependencyRoot}/options.d.ts`;
    const files = new Map<string, string>([
      [`${applicationRoot}/package.json`, JSON.stringify({
        dependencies: { '@fixture/contracts': '1.0.0' },
        name: 'browser-project'
      })],
      [`${dependencyRoot}/package.json`, JSON.stringify({
        exports: {
          './interfaces': { import: './interfaces.js', types: './interfaces.d.ts' },
          './runtime': { import: './runtime.js' }
        },
        name: '@fixture/contracts'
      })],
      [dependencyEntry, "export { type ExternalOptions } from './options.js';"],
      [dependencyTypes, 'export interface ExternalOptions { readonly label: string; readonly retries: number; }']
    ]);
    const browserHost: ProjectHostInterface = {
      'findPackageRoot': (filename) => {
        if (filename.startsWith(`${dependencyRoot}/`)) {
          return dependencyRoot;
        }
        const result = filename.startsWith(`${applicationRoot}/`) ? applicationRoot : undefined;

        return result;
      },
      'isBuiltinSpecifier': () => false,
      'readTextFile': (filename) => {
        const result = files.get(filename);

        return result;
      },
      'realPath': (filename) => {
        const result = files.has(filename) ? filename : undefined;

        return result;
      },
      'resolvePackageManifest': (packageName) => {
        const result = packageName === '@fixture/contracts'
          ? dependencyRoot + '/package.json'
          : undefined;

        return result;
      },
      'resolveModule': (moduleSpecifier, importerFilename) => {
        if (moduleSpecifier === '@fixture/contracts/interfaces' && importerFilename === entry) {
          return dependencyEntry;
        }
        if (moduleSpecifier === './options.js' && importerFilename === dependencyEntry) {
          return dependencyTypes;
        }

        return undefined;
      },
      'resolveRelativePath': (importerFilename, relativeSpecifier) => {
        const directoryEnd = importerFilename.lastIndexOf('/');
        const directory = directoryEnd === -1 ? '' : importerFilename.slice(0, directoryEnd);
        const result = relativeSpecifier.startsWith('./')
          ? `${directory}/${relativeSpecifier.slice(2)}`
          : relativeSpecifier;

        return result;
      }
    };
    const messages = new Linter({ cwd: '/' }).verify(
      'export interface RebuiltOptions { readonly label: string; readonly retries: number; }',
      [{
        files: ['**/*.ts'],
        languageOptions: { parser },
        plugins: { test: { rules: { 'no-redefined-external-types': noRedefinedExternalTypes } } },
        rules: { 'test/no-redefined-external-types': 'error' },
        settings: { '@studnicky/projectHost': browserHost }
      }],
      { filename: entry }
    );

    assert.deepEqual(messages.map((message) => {
      return {
        messageId: message.messageId,
        ruleId: message.ruleId
      };
    }), [{ messageId: 'redefined-external-type', ruleId: 'test/no-redefined-external-types' }]);
  });

  void it('keeps MutexKeyTransitionEventEntity and CircuitBreaker consumers concrete in the workspace type service', () => {
    const mutexEntityMessages = lintWorkspaceSource(join(workspaceRoot, 'packages/mutex/src/entities/MutexKeyTransitionEventEntity.ts'));
    const mutexMachineMessages = lintWorkspaceSource(join(workspaceRoot, 'packages/mutex/src/mutex/MutexKeyMachine.ts'));
    const circuitBreakerMessages = lintWorkspaceSource(join(workspaceRoot, 'packages/resilience/src/CircuitBreaker.ts'));

    assert.deepEqual(mutexEntityMessages, []);
    assert.deepEqual(mutexMachineMessages, []);
    assert.deepEqual(circuitBreakerMessages, []);
  });

});
