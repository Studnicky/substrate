import { BaseError, Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as TypeScript from 'typescript';

import type { ContextScopeInterface } from '../../../src/interfaces/index.js';

import { Context } from '../../../src/browser/index.js';
import * as browserTransform from '../../../src/browser/transform.js';
import * as nodeTransform from '../../../src/node/transform.js';

class ContextTransformTestError extends BaseError {
  public override readonly name: string = 'ContextTransformTestError';

  public constructor(message: string, cause?: unknown) {
    super({
      'cause': cause,
      'code': 'context.testTransformFailed',
      'message': message,
      'retryable': false
    });
  }
}

interface EmittedProgramInterface {
  (
    context: Context,
    firstScope: ContextScopeInterface,
    secondScope: ContextScopeInterface,
    delay: (milliseconds: number) => Promise<void>
  ): Promise<unknown>;
}

class ContextTransformHelpers {
  static readonly browserContextRuntimeModule: string = '@studnicky/context/browser';
  static readonly nodeContextRuntimeModule: string = '@studnicky/context/node';

  static assertContextRuntimeAwait(expression: TypeScript.Expression, alias: string): void {
    assert.ok(TypeScript.isCallExpression(expression));
    assert.ok(TypeScript.isPropertyAccessExpression(expression.expression));
    assert.ok(TypeScript.isIdentifier(expression.expression.expression));
    assert.strictEqual(expression.expression.expression.text, alias);
    assert.strictEqual(expression.expression.name.text, 'await');
  }

  static awaitExpressions(sourceFile: TypeScript.SourceFile): TypeScript.Expression[] {
    const expressions: TypeScript.Expression[] = [];
    ContextTransformHelpers.collectAwaitExpressions(sourceFile, expressions);
    return expressions;
  }

  static browserModuleSource(source: string): string {
    let browserEntryUrl = '';
    try {
      browserEntryUrl = new URL('../../../src/browser/index.js', import.meta.url).href;
    } catch (cause) {
      throw new ContextTransformTestError('Browser entry URL did not resolve', cause);
    }
    const result = source.replaceAll(ContextTransformHelpers.browserContextRuntimeModule, browserEntryUrl);
    return result;
  }

  static delay(milliseconds: number): Promise<void> {
    const result = new Promise<void>((resolve) => {
      setTimeout(resolve, milliseconds);
    });
    return result;
  }

  static encodeModuleUrl(moduleSource: string): string {
    let encoded = '';
    try {
      encoded = encodeURIComponent(moduleSource);
    } catch (cause) {
      throw new ContextTransformTestError('Emitted module source did not encode', cause);
    }
    const moduleUrl = `data:text/javascript;charset=utf-8,${encoded}`;
    return moduleUrl;
  }

  static isEmittedProgram(value: unknown): value is EmittedProgramInterface {
    const result = typeof value === 'function';
    return result;
  }

  static runtimeAlias(
    sourceFile: TypeScript.SourceFile,
    contextRuntimeModule: string = ContextTransformHelpers.browserContextRuntimeModule
  ): string {
    let alias: string | undefined;
    const statements = sourceFile.statements;
    for (let index = 0; index < statements.length && alias === undefined; index += 1) {
      alias = ContextTransformHelpers.aliasOfStatement(statements[index], contextRuntimeModule);
    }
    assert.ok(alias !== undefined, 'Expected ContextAsyncRuntime import');
    return alias;
  }

  static sourceFileFor(source: string, id: string): TypeScript.SourceFile {
    const scriptKind = id.endsWith('.tsx') ? TypeScript.ScriptKind.TSX : TypeScript.ScriptKind.TS;
    const sourceFile = TypeScript.createSourceFile(id, source, TypeScript.ScriptTarget.Latest, true, scriptKind);
    return sourceFile;
  }

  static transformSource(
    source: string,
    id: string,
    transformFactory: typeof browserTransform.transform = browserTransform.transform
  ): string {
    const result = transformFactory().transform(source, id);
    assert.ok(result !== null, `Expected ${id} to transform`);
    return result.code;
  }

  private static aliasOfElements(elements: readonly TypeScript.ImportSpecifier[]): string | undefined {
    let alias: string | undefined;
    for (let index = 0; index < elements.length && alias === undefined; index += 1) {
      const element = elements[index];
      if (element !== undefined && (element.propertyName?.text ?? element.name.text) === 'ContextAsyncRuntime') {
        alias = element.name.text;
      }
    }
    return alias;
  }

  private static aliasOfStatement(statement: TypeScript.Statement | undefined, contextRuntimeModule: string): string | undefined {
    let alias: string | undefined;
    if (statement !== undefined && TypeScript.isImportDeclaration(statement) && TypeScript.isStringLiteral(statement.moduleSpecifier) && statement.moduleSpecifier.text === contextRuntimeModule) {
      const bindings = statement.importClause?.namedBindings;
      if (bindings !== undefined && TypeScript.isNamedImports(bindings)) {
        alias = ContextTransformHelpers.aliasOfElements(bindings.elements);
      }
    }
    return alias;
  }

  private static collectAwaitExpressions(node: TypeScript.Node, expressions: TypeScript.Expression[]): void {
    if (TypeScript.isAwaitExpression(node)) {
      expressions.push(node.expression);
    }
    TypeScript.forEachChild(node, (child) => {
      ContextTransformHelpers.collectAwaitExpressions(child, expressions);
    });
  }
}

void describe('ContextAsyncTransform', () => {
  void it('wraps nested awaits and awaits used in expressions', () => {
    const output = ContextTransformHelpers.transformSource(
      'async function total(first, second) { return (await first(await second())) + 1; }',
      '/project/src/total.ts'
    );
    const sourceFile = ContextTransformHelpers.sourceFileFor(output, '/project/src/total.ts');
    const alias = ContextTransformHelpers.runtimeAlias(sourceFile);
    const expressions = ContextTransformHelpers.awaitExpressions(sourceFile);

    assert.strictEqual(expressions.length, 2);
    for (let index = 0; index < expressions.length; index += 1) {
      ContextTransformHelpers.assertContextRuntimeAwait(expressions[index] ?? TypeScript.factory.createNull(), alias);
    }

    const outerCall = expressions[0];
    assert.ok(outerCall !== undefined && TypeScript.isCallExpression(outerCall));
    const outerOperand = outerCall.arguments[0];
    assert.ok(outerOperand !== undefined && TypeScript.isCallExpression(outerOperand));
    assert.strictEqual(outerOperand.expression.getText(sourceFile), 'first');
  });

  void it('transforms TSX source without treating JSX expressions as text', () => {
    const output = ContextTransformHelpers.transformSource(
      'export async function View() { return <section>{await load()}</section>; }',
      '/project/src/View.tsx?raw#preview'
    );
    const sourceFile = ContextTransformHelpers.sourceFileFor(output, '/project/src/View.tsx');
    const expressions = ContextTransformHelpers.awaitExpressions(sourceFile);

    assert.strictEqual(expressions.length, 1);
    ContextTransformHelpers.assertContextRuntimeAwait(expressions[0] ?? TypeScript.factory.createNull(), ContextTransformHelpers.runtimeAlias(sourceFile));
    assert.ok(output.includes('<section>{await '));
  });

  void it('recognizes every supported runtime source extension', () => {
    const extensions = ['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx'];

    for (let index = 0; index < extensions.length; index += 1) {
      const extension = extensions[index];
      const output = ContextTransformHelpers.transformSource('async function work(value) { return await value; }', `/project/src/work${extension}`);
      assert.ok(output.includes('ContextAsyncRuntime'));
    }
  });

  void it('chooses a collision-free runtime import alias', () => {
    const output = ContextTransformHelpers.transformSource(
      'const __contextAsyncRuntime = 1; const __contextAsyncRuntime1 = 2; async function work(value) { return await value; }',
      '/project/src/collision.ts'
    );
    const sourceFile = ContextTransformHelpers.sourceFileFor(output, '/project/src/collision.ts');
    const alias = ContextTransformHelpers.runtimeAlias(sourceFile);

    assert.strictEqual(alias, '__contextAsyncRuntime2');
    const expressions = ContextTransformHelpers.awaitExpressions(sourceFile);
    assert.strictEqual(expressions.length, 1);
    ContextTransformHelpers.assertContextRuntimeAwait(expressions[0] ?? TypeScript.factory.createNull(), alias);
  });

  void it('reuses an existing browser runtime import and is idempotent', () => {
    const input = 'import { ContextAsyncRuntime as runtime } from "@studnicky/context/browser"; async function work(value) { return await value; }';
    const firstPass = ContextTransformHelpers.transformSource(input, '/project/src/idempotent.ts');
    const firstSourceFile = ContextTransformHelpers.sourceFileFor(firstPass, '/project/src/idempotent.ts');
    const expressions = ContextTransformHelpers.awaitExpressions(firstSourceFile);

    assert.strictEqual(ContextTransformHelpers.runtimeAlias(firstSourceFile), 'runtime');
    assert.strictEqual(expressions.length, 1);
    ContextTransformHelpers.assertContextRuntimeAwait(expressions[0] ?? TypeScript.factory.createNull(), 'runtime');
    assert.strictEqual(browserTransform.transform().transform(firstPass, '/project/src/idempotent.ts'), null);
  });

  void it('reuses an existing node runtime import and is idempotent', () => {
    const input = 'import { ContextAsyncRuntime as runtime } from "@studnicky/context/node"; async function work(value) { return await value; }';
    const firstPass = ContextTransformHelpers.transformSource(input, '/project/src/node-idempotent.ts', nodeTransform.transform);
    const firstSourceFile = ContextTransformHelpers.sourceFileFor(firstPass, '/project/src/node-idempotent.ts');
    const expressions = ContextTransformHelpers.awaitExpressions(firstSourceFile);

    assert.strictEqual(ContextTransformHelpers.runtimeAlias(firstSourceFile, ContextTransformHelpers.nodeContextRuntimeModule), 'runtime');
    assert.strictEqual(expressions.length, 1);
    ContextTransformHelpers.assertContextRuntimeAwait(expressions[0] ?? TypeScript.factory.createNull(), 'runtime');
    assert.strictEqual(nodeTransform.transform().transform(firstPass, '/project/src/node-idempotent.ts'), null);
  });

  void it('skips declaration files, dependencies, and unsupported source ids', () => {
    const source = 'async function ignored() { return await task(); }';
    const transform = browserTransform.transform().transform;

    assert.strictEqual(transform(source, '/project/src/contracts.d.ts'), null);
    assert.strictEqual(transform(source, '/project/node_modules/dependency/index.ts'), null);
    assert.strictEqual(transform(source, '/project/src/ignored.json'), null);
  });

  void it('binds each transform entrypoint to its runtime module', () => {
    const source = 'async function work(value) { return await value; }';
    const browserOutput = ContextTransformHelpers.transformSource(source, '/project/src/browser-runtime.ts');
    const nodeOutput = ContextTransformHelpers.transformSource(source, '/project/src/node-runtime.ts', nodeTransform.transform);
    const browserSourceFile = ContextTransformHelpers.sourceFileFor(browserOutput, '/project/src/browser-runtime.ts');
    const nodeSourceFile = ContextTransformHelpers.sourceFileFor(nodeOutput, '/project/src/node-runtime.ts');

    assert.strictEqual(ContextTransformHelpers.runtimeAlias(browserSourceFile, ContextTransformHelpers.browserContextRuntimeModule), '__contextAsyncRuntime');
    assert.strictEqual(ContextTransformHelpers.runtimeAlias(nodeSourceFile, ContextTransformHelpers.nodeContextRuntimeModule), '__contextAsyncRuntime');
  });
});

void describe('ContextAsyncTransform emitted browser behavior', () => {
  void it('runs emitted browser code with isolated overlapping context scopes', async () => {
    const source = [
      'import { Context } from "@studnicky/context/browser";',
      'export async function run(context, firstScope, secondScope, delay) {',
      '  const values = await Promise.all([',
      '    firstScope.execute(async () => {',
      '      await delay(5);',
      '      return context.get("id");',
      '    }),',
      '    secondScope.execute(async () => {',
      '      await delay(1);',
      '      return context.get("id");',
      '    }),',
      '  ]);',
      '  return values;',
      '}'
    ].join('\n');
    const transformed = ContextTransformHelpers.transformSource(source, '/project/src/overlap.mjs');
    const moduleUrl = ContextTransformHelpers.encodeModuleUrl(ContextTransformHelpers.browserModuleSource(transformed));
    const emittedModule: unknown = await import(moduleUrl);
    let candidate: unknown;
    if (Predicates.isObject(emittedModule)) {
      candidate = Reflect.get(emittedModule, 'run');
    }
    assert.ok(ContextTransformHelpers.isEmittedProgram(candidate), 'Expected emitted browser module to export run().');

    const context = Context.create({ 'name': 'emitted' });
    const firstScope = context.initialize({ 'id': 'first' });
    const secondScope = context.initialize({ 'id': 'second' });
    const values = await candidate(context, firstScope, secondScope, ContextTransformHelpers.delay);

    assert.deepStrictEqual(values, ['first', 'second']);
    assert.strictEqual(context.isActive(), false);
    assert.throws(() => {
      context.get('id');
    });
  });
});
