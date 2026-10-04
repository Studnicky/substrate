import { BaseError } from '@studnicky/types/node';
import parser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';
import ts from 'typescript';
import tseslint from 'typescript-eslint';

import type { ProjectHostInterface } from '../../src/interfaces/ProjectHostInterface.js';

import { TestWorkspace } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { NodeProjectHost } from '../../src/node/NodeProjectHost.js';
import { noRedefinedExternalTypes } from '../../src/rules/noRedefinedExternalTypes.js';

const workspaceRoot = resolve(import.meta.dirname, '../../../..');

class FixtureError extends BaseError {
  public override readonly name: string = 'FixtureError';

  public constructor(message: string, cause: unknown) {
    super({
      'cause': cause,
      'code': 'eslintConfig.noRedefinedExternalTypesFixture',
      'message': message,
      'retryable': false
    });
  }
}

/** Serializes and reads fixture data, surfacing platform failures as FixtureError. */
class FixtureData {
  static json(value: object): string {
    try {
      const text = JSON.stringify(value);
      return text;
    } catch (cause) {
      throw new FixtureError('cannot serialize fixture data', cause);
    }
  }

  static readText(filename: string): string {
    try {
      const text = readFileSync(filename, 'utf8');
      return text;
    } catch (cause) {
      throw new FixtureError(`cannot read ${filename}`, cause);
    }
  }
}

/** A project host whose files, package roots, and module resolution live entirely in memory. */
class BrowserFixtureHost implements ProjectHostInterface {
  readonly #applicationRoot: string;
  readonly #dependencyEntry: string;
  readonly #dependencyRoot: string;
  readonly #dependencyTypes: string;
  readonly #entry: string;
  readonly #files: ReadonlyMap<string, string>;

  constructor(applicationRoot: string, dependencyRoot: string, entry: string, files: ReadonlyMap<string, string>) {
    this.#applicationRoot = applicationRoot;
    this.#dependencyRoot = dependencyRoot;
    this.#dependencyEntry = `${dependencyRoot}/interfaces.d.ts`;
    this.#dependencyTypes = `${dependencyRoot}/options.d.ts`;
    this.#entry = entry;
    this.#files = files;
  }

  findPackageRoot(filename: string): string | undefined {
    if (filename.startsWith(`${this.#dependencyRoot}/`)) {
      return this.#dependencyRoot;
    }
    const result = filename.startsWith(`${this.#applicationRoot}/`) ? this.#applicationRoot : undefined;

    return result;
  }

  isBuiltinSpecifier(_moduleSpecifier: string): boolean {
    return false;
  }

  readTextFile(filename: string): string | undefined {
    const result = this.#files.get(filename);

    return result;
  }

  realPath(path: string): string | undefined {
    const result = this.#files.has(path) ? path : undefined;

    return result;
  }

  resolveModule(moduleSpecifier: string, importerFilename: string): string | undefined {
    if (moduleSpecifier === '@fixture/contracts/interfaces' && importerFilename === this.#entry) {
      return this.#dependencyEntry;
    }
    if (moduleSpecifier === './options.js' && importerFilename === this.#dependencyEntry) {
      return this.#dependencyTypes;
    }

    return undefined;
  }

  resolvePackageManifest(packageName: string, _importerFilename: string): string | undefined {
    const result = packageName === '@fixture/contracts'
      ? `${this.#dependencyRoot}/package.json`
      : undefined;

    return result;
  }

  resolveRelativePath(importerFilename: string, relativeSpecifier: string): string {
    const directoryEnd = importerFilename.lastIndexOf('/');
    const directory = directoryEnd === -1 ? '' : importerFilename.slice(0, directoryEnd);
    const result = relativeSpecifier.startsWith('./')
      ? `${directory}/${relativeSpecifier.slice(2)}`
      : relativeSpecifier;

    return result;
  }
}

/** Walks the rule's own relative-import graph and scans it for compiler-program construction. */
class RuleSourceScan {
  accessesParserServices = false;
  constructsProgram = false;
  createsContextSourceAst = false;

  static closure(entryPath: string, visited: Set<string> = new Set()): Set<string> {
    if (visited.has(entryPath)) {
      return visited;
    }

    visited.add(entryPath);

    const source = ts.createSourceFile(entryPath, FixtureData.readText(entryPath), ts.ScriptTarget.Latest, true);
    const entryDir = resolve(entryPath, '..');

    ts.forEachChild(source, (node) => {
      const moduleSpecifier = (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) ? node.moduleSpecifier : undefined;

      if (moduleSpecifier !== undefined && ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text.startsWith('.')) {
        const specifier = moduleSpecifier.text.endsWith('.js') ? `${moduleSpecifier.text.slice(0, -3)}.ts` : moduleSpecifier.text;

        RuleSourceScan.closure(resolve(entryDir, specifier), visited);
      }
    });

    return visited;
  }

  scan(filePath: string): void {
    const source = ts.createSourceFile(filePath, FixtureData.readText(filePath), ts.ScriptTarget.Latest, true);

    this.visit(source);
  }

  private static isCallNamed(node: ts.Node, name: string): node is ts.CallExpression {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const isDirect = ts.isIdentifier(callee) && callee.text === name;
      const isMember = ts.isPropertyAccessExpression(callee) && callee.name.text === name;

      const isNamed = isDirect || isMember;

      return isNamed;
    }

    return false;
  }

  private static isContextSourceText(node: ts.Expression | undefined): boolean {
    if (node !== undefined && ts.isPropertyAccessExpression(node) && node.name.text === 'text') {
      const owner = node.expression;

      const isContextSource = ts.isPropertyAccessExpression(owner) && owner.name.text === 'sourceCode';

      return isContextSource;
    }

    return false;
  }

  private visit(node: ts.Node): void {
    if (ts.isPropertyAccessExpression(node) && node.name.text === 'parserServices') {
      this.accessesParserServices = true;
    }
    if (RuleSourceScan.isCallNamed(node, 'createSourceFile') && RuleSourceScan.isContextSourceText(node.arguments.at(1))) {
      this.createsContextSourceAst = true;
    }
    if (RuleSourceScan.isCallNamed(node, 'createProgram')) {
      this.constructsProgram = true;
    } else {
      ts.forEachChild(node, (child) => { this.visit(child); });
    }
  }
}

class NoRedefinedExternalTypesHarness {
  static lint(
    code: string,
    entry: string,
    root: string,
    host: ProjectHostInterface = new NodeProjectHost()
  ): readonly Linter.LintMessage[] {
    const result = new Linter({ 'cwd': root }).verify(code, [{
      'files': ['**/*.ts'],
      'languageOptions': {
        'parser': parser,
        'parserOptions': {
          'project': './tsconfig.json',
          'tsconfigRootDir': root
        }
      },
      'plugins': { 'test': { 'rules': { 'no-redefined-external-types': noRedefinedExternalTypes } } },
      'rules': { 'test/no-redefined-external-types': 'error' },
      'settings': { '@studnicky/projectHost': host }
    }], { 'filename': entry });

    return result;
  }

  static lintWorkspaceSource(filename: string): readonly Linter.LintMessage[] {
    const source = FixtureData.readText(filename);
    const result = new Linter({ 'cwd': workspaceRoot }).verify(source, [{
      'files': ['**/*.ts'],
      'languageOptions': {
        'parser': parser,
        'parserOptions': {
          'projectService': true,
          'tsconfigRootDir': workspaceRoot
        }
      },
      'plugins': {
        '@typescript-eslint': tseslint.plugin,
        'test': { 'rules': { 'no-redefined-external-types': noRedefinedExternalTypes } }
      },
      'rules': {
        '@typescript-eslint/no-redundant-type-constituents': 'error',
        '@typescript-eslint/no-unsafe-assignment': 'error',
        'test/no-redefined-external-types': 'error'
      }
    }], { 'filename': filename });

    return result;
  }

  static prepareFixtureProject(workspace: TestWorkspace): void {
    workspace.write('tsconfig.json', FixtureData.json({
      'compilerOptions': {
        'lib': ['ES2022', 'DOM'],
        'module': 'NodeNext',
        'moduleResolution': 'NodeNext',
        'strict': true,
        'target': 'ES2022'
      },
      'include': ['src/**/*.ts']
    }));
  }
}

class NoRedefinedExternalTypesScenarios {
  static requiresPublicDirectDependencyTypes(): void {
    using workspace = TestWorkspace.create('no-redefined-external-types-');
    workspace.mkdir('src');
    workspace.mkdir('node_modules/@fixture/contracts');
    workspace.mkdir('node_modules/@fixture/transitive');
    workspace.write('package.json', FixtureData.json({
      'dependencies': { '@fixture/contracts': '1.0.0' },
      'name': 'fixture-project',
      'type': 'module'
    }));
    workspace.write('node_modules/@fixture/contracts/package.json', FixtureData.json({
      'exports': {
        './interfaces': { 'import': './interfaces.js', 'types': './interfaces.d.ts' },
        './runtime': { 'import': './runtime.js' }
      },
      'name': '@fixture/contracts'
    }));
    workspace.write('node_modules/@fixture/contracts/interfaces.d.ts', [
      "export * from './options.js';",
      "export { type ExternalResult } from './result.js';",
      'interface InternalExternalStatus { readonly status: string; }',
      'export { type InternalExternalStatus as ExternalStatus };'
    ].join('\n'));
    workspace.write('node_modules/@fixture/contracts/options.d.ts', 'export interface ExternalOptions { readonly label: string; readonly retries: number; }');
    workspace.write('node_modules/@fixture/contracts/result.d.ts', 'export type ExternalResult = { readonly value: string; };');
    workspace.write('node_modules/@fixture/transitive/package.json', FixtureData.json({
      'name': '@fixture/transitive',
      'types': './index.d.ts'
    }));
    workspace.write('node_modules/@fixture/transitive/index.d.ts', 'export interface TransitiveOptions { readonly code: string; }');

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
    const compositionEntry = workspace.write('src/composition.ts', compositionSource);
    const redefinitionsEntry = workspace.write('src/redefinitions.ts', redefinitionsSource);
    NoRedefinedExternalTypesHarness.prepareFixtureProject(workspace);

    const redefinitions = NoRedefinedExternalTypesHarness.lint(redefinitionsSource, redefinitionsEntry, workspace.root);
    const composition = NoRedefinedExternalTypesHarness.lint(compositionSource, compositionEntry, workspace.root);

    assert.deepEqual(redefinitions.map((message) => {
      return {
        'line': message.line,
        'messageId': message.messageId,
        'ruleId': message.ruleId
      };
    }), [
      { 'line': 2, 'messageId': 'redefined-external-type', 'ruleId': 'test/no-redefined-external-types' },
      { 'line': 3, 'messageId': 'redefined-external-type', 'ruleId': 'test/no-redefined-external-types' },
      { 'line': 4, 'messageId': 'redefined-external-type', 'ruleId': 'test/no-redefined-external-types' }
    ]);
    assert.deepEqual(composition, []);
  }

  static usesSemanticIdentity(): void {
    using workspace = TestWorkspace.create('no-redefined-external-types-semantic-');
    workspace.mkdir('src');
    workspace.write('package.json', FixtureData.json({
      'name': 'semantic-fixture',
      'type': 'module'
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
    const allowedSource = [
      "export type RequestWithMethod = Omit<RequestInit, 'method'> & { readonly method: 'GET'; };",
      'export interface ParserServicePort { readonly parse: (input: string) => unknown; }'
    ].join('\n');
    const allowedEntry = workspace.write('src/allowed.ts', allowedSource);
    const entry = workspace.write('src/semantic.ts', redefinitionsSource);
    NoRedefinedExternalTypesHarness.prepareFixtureProject(workspace);

    const redefinitions = NoRedefinedExternalTypesHarness.lint(redefinitionsSource, entry, workspace.root);
    const allowed = NoRedefinedExternalTypesHarness.lint(allowedSource, allowedEntry, workspace.root);

    assert.deepEqual(redefinitions.map((message) => {
      return {
        'line': message.line,
        'messageId': message.messageId,
        'ruleId': message.ruleId
      };
    }), [
      { 'line': 1, 'messageId': 'redefined-external-type', 'ruleId': 'test/no-redefined-external-types' },
      { 'line': 9, 'messageId': 'redefined-external-type', 'ruleId': 'test/no-redefined-external-types' },
      { 'line': 33, 'messageId': 'redefined-external-type', 'ruleId': 'test/no-redefined-external-types' }
    ]);
    assert.deepEqual(allowed, []);
  }

  static exemptsCanonicalEntityTypes(): void {
    using workspace = TestWorkspace.create('no-redefined-external-types-canonical-');
    workspace.mkdir('src');
    workspace.mkdir('node_modules/@fixture/contracts');
    workspace.mkdir('node_modules/@studnicky/entity/interfaces');
    workspace.mkdir('node_modules/@studnicky/entity/types');
    workspace.write('package.json', FixtureData.json({
      'dependencies': { '@fixture/contracts': '1.0.0', '@studnicky/entity': '1.0.0' },
      'name': 'canonical-entity-fixture',
      'type': 'module'
    }));
    workspace.write('node_modules/@fixture/contracts/package.json', FixtureData.json({
      'name': '@fixture/contracts',
      'types': './index.d.ts'
    }));
    workspace.write('node_modules/@fixture/contracts/index.d.ts', 'export interface ExternalRecord { readonly id: string; }');
    workspace.write('node_modules/@studnicky/entity/interfaces/package.json', FixtureData.json({
      'name': '@studnicky/entity/interfaces',
      'types': './index.d.ts'
    }));
    workspace.write('node_modules/@studnicky/entity/interfaces/index.d.ts', "export interface SchemaNodeInterface<TSchema, TStatic> { readonly '__schema'?: TSchema; readonly '__static'?: TStatic; }");
    workspace.write('node_modules/@studnicky/entity/types/package.json', FixtureData.json({
      'name': '@studnicky/entity/types',
      'types': './index.d.ts'
    }));
    workspace.write('node_modules/@studnicky/entity/types/index.d.ts', [
      "import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';",
      'export type NodeStaticType<TNode extends SchemaNodeInterface<unknown, unknown>> = { readonly id: string; };'
    ].join('\n'));

    const source = [
      "import type { ExternalRecord } from '@fixture/contracts';",
      "import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';",
      "import type { NodeStaticType } from '@studnicky/entity/types';",
      'declare function defineNode<S>(schema: unknown): SchemaNodeInterface<unknown, S>;',
      'export namespace AccountEntity {',
      "  export const Node = defineNode<{ id: string }>({ type: 'object' } as const);",
      '  export type Type = NodeStaticType<typeof Node>;',
      '}',
      'export namespace TeamEntity {',
      "  export const Node = defineNode<{ id: string }>({ type: 'object' } as const);",
      '  export interface Type extends NodeStaticType<typeof Node> {}',
      '}',
      'export interface RebuiltRecord { readonly id: string; }',
      'export interface ErrorDetailPort { readonly cause?: Error; readonly id?: string; }',
      'export interface UnrelatedOptionalShape { readonly id?: string; }'
    ].join('\n');
    const entry = workspace.write('src/entity.ts', source);
    NoRedefinedExternalTypesHarness.prepareFixtureProject(workspace);

    const messages = NoRedefinedExternalTypesHarness.lint(source, entry, workspace.root);

    assert.deepEqual(messages.map((message) => {
      return { 'line': message.line, 'messageId': message.messageId };
    }), [{ 'line': 13, 'messageId': 'redefined-external-type' }]);
  }

  static exemptsCanonicalInputType(): void {
    using workspace = TestWorkspace.create('no-redefined-external-types-input-type-');
    workspace.mkdir('src');
    workspace.mkdir('node_modules/@studnicky/entity/interfaces');
    workspace.mkdir('node_modules/@studnicky/entity/types');
    workspace.mkdir('node_modules/@fixture/bundler');
    workspace.write('package.json', FixtureData.json({
      'dependencies': { '@fixture/bundler': '1.0.0', '@studnicky/entity': '1.0.0' },
      'name': 'input-type-fixture',
      'type': 'module'
    }));
    workspace.write('node_modules/@studnicky/entity/interfaces/package.json', FixtureData.json({
      'name': '@studnicky/entity/interfaces',
      'types': './index.d.ts'
    }));
    workspace.write('node_modules/@studnicky/entity/interfaces/index.d.ts', "export interface SchemaNodeInterface<TSchema, TStatic> { readonly '__schema'?: TSchema; readonly '__static'?: TStatic; }");
    workspace.write('node_modules/@studnicky/entity/types/package.json', FixtureData.json({
      'name': '@studnicky/entity/types',
      'types': './index.d.ts'
    }));
    workspace.write('node_modules/@studnicky/entity/types/index.d.ts', [
      "import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';",
      'export type NodeStaticType<TNode extends SchemaNodeInterface<unknown, unknown>> = { readonly build: string; readonly entryFileNames?: string; };',
      'export type NodeInputType<TNode extends SchemaNodeInterface<unknown, unknown>> = { readonly build: string; readonly entryFileNames?: string; };'
    ].join('\n'));
    workspace.write('node_modules/@fixture/bundler/package.json', FixtureData.json({
      'name': '@fixture/bundler',
      'types': './index.d.ts'
    }));
    workspace.write('node_modules/@fixture/bundler/index.d.ts', 'export interface OutputPlugin { readonly build: string; readonly entryFileNames?: string; }');

    const source = [
      "import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';",
      "import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';",
      'declare function defineNode<S>(schema: unknown): SchemaNodeInterface<unknown, S>;',
      'export namespace ContextConfigEntity {',
      "  export const Node = defineNode<{ build: string }>({ type: 'object' } as const);",
      '  export type Type = NodeStaticType<typeof Node>;',
      '  export type InputType = NodeInputType<typeof Node>;',
      '}'
    ].join('\n');
    const entry = workspace.write('src/entity.ts', source);
    NoRedefinedExternalTypesHarness.prepareFixtureProject(workspace);

    const messages = NoRedefinedExternalTypesHarness.lint(source, entry, workspace.root);

    assert.deepEqual(messages, []);
  }

  static reportsHandWrittenInputType(): void {
    using workspace = TestWorkspace.create('no-redefined-external-types-input-type-invalid-');
    workspace.mkdir('src');
    workspace.mkdir('node_modules/@fixture/bundler');
    workspace.write('package.json', FixtureData.json({
      'dependencies': { '@fixture/bundler': '1.0.0' },
      'name': 'input-type-invalid-fixture',
      'type': 'module'
    }));
    workspace.write('node_modules/@fixture/bundler/package.json', FixtureData.json({
      'name': '@fixture/bundler',
      'types': './index.d.ts'
    }));
    workspace.write('node_modules/@fixture/bundler/index.d.ts', 'export interface OutputPlugin { readonly build: string; readonly entryFileNames?: string; }');

    const source = [
      'export namespace ContextConfigEntity {',
      '  export type InputType = { readonly build: string; readonly entryFileNames?: string; };',
      '}'
    ].join('\n');
    const entry = workspace.write('src/entity.ts', source);
    NoRedefinedExternalTypesHarness.prepareFixtureProject(workspace);

    const messages = NoRedefinedExternalTypesHarness.lint(source, entry, workspace.root);

    assert.deepEqual(messages.map((message) => {
      return { 'line': message.line, 'messageId': message.messageId };
    }), [{ 'line': 2, 'messageId': 'redefined-external-type' }]);
  }

  static cachesDirectDependencyCandidates(): void {
    using workspace = TestWorkspace.create('no-redefined-external-types-cache-');
    const code = 'export interface RebuiltOptions { readonly label: string; }';
    workspace.mkdir('src');
    workspace.mkdir('node_modules/fixture-contracts');
    workspace.write('package.json', FixtureData.json({
      'dependencies': { 'fixture-contracts': '1.0.0' },
      'name': 'fixture-project',
      'type': 'module'
    }));
    workspace.write('node_modules/fixture-contracts/package.json', FixtureData.json({
      'name': 'fixture-contracts',
      'types': './index.d.ts'
    }));
    workspace.write('node_modules/fixture-contracts/index.d.ts', 'export interface ExternalOptions { readonly label: string; }');
    const firstEntry = workspace.write('src/first.ts', code);
    const secondEntry = workspace.write('src/second.ts', code);
    NoRedefinedExternalTypesHarness.prepareFixtureProject(workspace);

    const host = new NodeProjectHost();
    const firstMessages = NoRedefinedExternalTypesHarness.lint(code, firstEntry, workspace.root, host);

    workspace.write('node_modules/fixture-contracts/index.d.ts', 'export interface ChangedOptions { readonly changed: string; }');

    const secondMessages = NoRedefinedExternalTypesHarness.lint(code, secondEntry, workspace.root, host);

    assert.equal(firstMessages.length, 1);
    assert.equal(secondMessages.length, 1);
  }

  static constructsNoCompilerPrograms(): void {
    const rulePath = join(import.meta.dirname, '../../src/rules/noRedefinedExternalTypes.ts');
    const ruleFiles = RuleSourceScan.closure(rulePath);
    const scan = new RuleSourceScan();

    for (const filePath of ruleFiles) {
      scan.scan(filePath);
    }

    // The real invariant: no file the rule owns ever builds a second TS compiler program —
    // it relies exclusively on the linter-supplied `parserServices.program`.
    assert.equal(scan.constructsProgram, false);
    assert.equal(scan.accessesParserServices, true);
    assert.equal(scan.createsContextSourceAst, false);
  }

  static usesBrowserProjectHost(): void {
    const applicationRoot = '/browser-project';
    const dependencyRoot = '/browser-project/dependencies/fixture-contracts';
    const entry = `${applicationRoot}/src/redefinitions.ts`;
    const files = new Map<string, string>([
      [`${applicationRoot}/package.json`, FixtureData.json({
        'dependencies': { '@fixture/contracts': '1.0.0' },
        'name': 'browser-project'
      })],
      [`${dependencyRoot}/interfaces.d.ts`, "export { type ExternalOptions } from './options.js';"],
      [`${dependencyRoot}/options.d.ts`, 'export interface ExternalOptions { readonly label: string; readonly retries: number; }'],
      [`${dependencyRoot}/package.json`, FixtureData.json({
        'exports': {
          './interfaces': { 'import': './interfaces.js', 'types': './interfaces.d.ts' },
          './runtime': { 'import': './runtime.js' }
        },
        'name': '@fixture/contracts'
      })]
    ]);
    const browserHost = new BrowserFixtureHost(applicationRoot, dependencyRoot, entry, files);
    const messages = new Linter({ 'cwd': '/' }).verify(
      'export interface RebuiltOptions { readonly label: string; readonly retries: number; }',
      [{
        'files': ['**/*.ts'],
        'languageOptions': { 'parser': parser },
        'plugins': { 'test': { 'rules': { 'no-redefined-external-types': noRedefinedExternalTypes } } },
        'rules': { 'test/no-redefined-external-types': 'error' },
        'settings': { '@studnicky/projectHost': browserHost }
      }],
      { 'filename': entry }
    );

    assert.deepEqual(messages.map((message) => {
      return {
        'messageId': message.messageId,
        'ruleId': message.ruleId
      };
    }), [{ 'messageId': 'redefined-external-type', 'ruleId': 'test/no-redefined-external-types' }]);
  }

  static keepsWorkspaceConsumersConcrete(): void {
    const mutexEntityMessages = NoRedefinedExternalTypesHarness.lintWorkspaceSource(join(workspaceRoot, 'packages/concurrency/src/entities/MutexKeyTransitionEventEntity.ts'));
    const mutexMachineMessages = NoRedefinedExternalTypesHarness.lintWorkspaceSource(join(workspaceRoot, 'packages/concurrency/src/mutex/MutexKeyMachine.ts'));
    const circuitBreakerMessages = NoRedefinedExternalTypesHarness.lintWorkspaceSource(join(workspaceRoot, 'packages/resilience/src/CircuitBreaker.ts'));

    assert.deepEqual(mutexEntityMessages, []);
    assert.deepEqual(mutexMachineMessages, []);
    assert.deepEqual(circuitBreakerMessages, []);
  }
}

void describe('no-redefined-external-types', () => {
  void it('requires public direct-dependency types to be reused or extended', () => { NoRedefinedExternalTypesScenarios.requiresPublicDirectDependencyTypes(); });

  void it('uses TypeScript semantic identity for platform contracts and canonical entities', () => { NoRedefinedExternalTypesScenarios.usesSemanticIdentity(); });

  void it('exempts canonical entity Types and optional external data shapes', () => { NoRedefinedExternalTypesScenarios.exemptsCanonicalEntityTypes(); });

  void it("exempts a canonical entity InputType even when it structurally coincides with an unrelated dependency's public type", () => { NoRedefinedExternalTypesScenarios.exemptsCanonicalInputType(); });

  void it("still reports a hand-written InputType with no schema provenance that structurally coincides with a dependency's public type", () => { NoRedefinedExternalTypesScenarios.reportsHandWrittenInputType(); });

  void it('caches direct dependency candidates for one package', () => { NoRedefinedExternalTypesScenarios.cachesDirectDependencyCandidates(); });

  void it('does not construct compiler programs anywhere across its own files', () => { NoRedefinedExternalTypesScenarios.constructsNoCompilerPrograms(); });

  void it('uses a browser project host to detect public direct-dependency type redefinitions', () => { NoRedefinedExternalTypesScenarios.usesBrowserProjectHost(); });

  void it('keeps MutexKeyTransitionEventEntity and CircuitBreaker consumers concrete in the workspace type service', () => { NoRedefinedExternalTypesScenarios.keepsWorkspaceConsumersConcrete(); });
});
