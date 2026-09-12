import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as TypeScript from 'typescript';

import { Context } from '../../../src/browser/index.js';
import type { ContextScopeInterface } from '../../../src/interfaces/index.js';

import { transform as browserTransform } from '../../../src/browser/transform.js';
import { transform as nodeTransform } from '../../../src/node/transform.js';

const browserContextRuntimeModule = '@studnicky/context/browser';
const nodeContextRuntimeModule = '@studnicky/context/node';

type AwaitExpressionRecord = {
  expression: TypeScript.Expression;
};

function transformSource(
  source: string,
  id: string,
  transformFactory: typeof browserTransform = browserTransform
): string {
  const result = transformFactory().transform(source, id);
  if (result === null) {
    throw new Error(`Expected ${id} to transform`);
  }

  return result.code;
}

function sourceFileFor(source: string, id: string): TypeScript.SourceFile {
  const scriptKind = id.endsWith('.tsx') ? TypeScript.ScriptKind.TSX : TypeScript.ScriptKind.TS;
  return TypeScript.createSourceFile(id, source, TypeScript.ScriptTarget.Latest, true, scriptKind);
}

function runtimeAlias(
  sourceFile: TypeScript.SourceFile,
  contextRuntimeModule = browserContextRuntimeModule
): string {
  for (const statement of sourceFile.statements) {
    if (!TypeScript.isImportDeclaration(statement) || !TypeScript.isStringLiteral(statement.moduleSpecifier) || statement.moduleSpecifier.text !== contextRuntimeModule) {
      continue;
    }

    const bindings = statement.importClause?.namedBindings;
    if (bindings === undefined || !TypeScript.isNamedImports(bindings)) {
      continue;
    }

    for (const element of bindings.elements) {
      const importedName = element.propertyName?.text ?? element.name.text;
      if (importedName === 'ContextAsyncRuntime') {
        return element.name.text;
      }
    }
  }

  throw new Error('Expected ContextAsyncRuntime import');
}

function awaitExpressions(sourceFile: TypeScript.SourceFile): AwaitExpressionRecord[] {
  const expressions: AwaitExpressionRecord[] = [];

  const visit = (node: TypeScript.Node): void => {
    if (TypeScript.isAwaitExpression(node)) {
      expressions.push({ expression: node.expression });
    }
    TypeScript.forEachChild(node, visit);
  };
  visit(sourceFile);

  return expressions;
}

function assertContextRuntimeAwait(expression: TypeScript.Expression, alias: string): void {
  assert.ok(TypeScript.isCallExpression(expression));
  assert.ok(TypeScript.isPropertyAccessExpression(expression.expression));
  assert.ok(TypeScript.isIdentifier(expression.expression.expression));
  assert.strictEqual(expression.expression.expression.text, alias);
  assert.strictEqual(expression.expression.name.text, 'await');
}

describe('ContextAsyncTransform', () => {
  it('wraps nested awaits and awaits used in expressions', () => {
    const output = transformSource(
      'async function total(first, second) { return (await first(await second())) + 1; }',
      '/project/src/total.ts'
    );
    const sourceFile = sourceFileFor(output, '/project/src/total.ts');
    const alias = runtimeAlias(sourceFile);
    const expressions = awaitExpressions(sourceFile);

    assert.strictEqual(expressions.length, 2);
    for (const expression of expressions) {
      assertContextRuntimeAwait(expression.expression, alias);
    }

    const outerCall = expressions[0]?.expression;
    assert.ok(outerCall !== undefined && TypeScript.isCallExpression(outerCall));
    const outerOperand = outerCall.arguments[0];
    assert.ok(outerOperand !== undefined && TypeScript.isCallExpression(outerOperand));
    assert.strictEqual(outerOperand.expression.getText(sourceFile), 'first');
  });

  it('transforms TSX source without treating JSX expressions as text', () => {
    const output = transformSource(
      'export async function View() { return <section>{await load()}</section>; }',
      '/project/src/View.tsx?raw#preview'
    );
    const sourceFile = sourceFileFor(output, '/project/src/View.tsx');
    const expressions = awaitExpressions(sourceFile);

    assert.strictEqual(expressions.length, 1);
    assertContextRuntimeAwait(expressions[0]?.expression ?? TypeScript.factory.createNull(), runtimeAlias(sourceFile));
    assert.ok(output.includes('<section>{await '));
  });

  it('recognizes every supported runtime source extension', () => {
    const extensions = ['.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx'];

    for (const extension of extensions) {
      const output = transformSource('async function work(value) { return await value; }', `/project/src/work${extension}`);
      assert.ok(output.includes('ContextAsyncRuntime'));
    }
  });

  it('chooses a collision-free runtime import alias', () => {
    const output = transformSource(
      'const __contextAsyncRuntime = 1; const __contextAsyncRuntime1 = 2; async function work(value) { return await value; }',
      '/project/src/collision.ts'
    );
    const sourceFile = sourceFileFor(output, '/project/src/collision.ts');
    const alias = runtimeAlias(sourceFile);

    assert.strictEqual(alias, '__contextAsyncRuntime2');
    const expressions = awaitExpressions(sourceFile);
    assert.strictEqual(expressions.length, 1);
    assertContextRuntimeAwait(expressions[0]?.expression ?? TypeScript.factory.createNull(), alias);
  });

  it('reuses an existing browser runtime import and is idempotent', () => {
    const input = 'import { ContextAsyncRuntime as runtime } from "@studnicky/context/browser"; async function work(value) { return await value; }';
    const firstPass = transformSource(input, '/project/src/idempotent.ts');
    const firstSourceFile = sourceFileFor(firstPass, '/project/src/idempotent.ts');
    const expressions = awaitExpressions(firstSourceFile);

    assert.strictEqual(runtimeAlias(firstSourceFile), 'runtime');
    assert.strictEqual(expressions.length, 1);
    assertContextRuntimeAwait(expressions[0]?.expression ?? TypeScript.factory.createNull(), 'runtime');
    assert.strictEqual(browserTransform().transform(firstPass, '/project/src/idempotent.ts'), null);
  });

  it('reuses an existing node runtime import and is idempotent', () => {
    const input = 'import { ContextAsyncRuntime as runtime } from "@studnicky/context/node"; async function work(value) { return await value; }';
    const firstPass = transformSource(input, '/project/src/node-idempotent.ts', nodeTransform);
    const firstSourceFile = sourceFileFor(firstPass, '/project/src/node-idempotent.ts');
    const expressions = awaitExpressions(firstSourceFile);

    assert.strictEqual(runtimeAlias(firstSourceFile, nodeContextRuntimeModule), 'runtime');
    assert.strictEqual(expressions.length, 1);
    assertContextRuntimeAwait(expressions[0]?.expression ?? TypeScript.factory.createNull(), 'runtime');
    assert.strictEqual(nodeTransform().transform(firstPass, '/project/src/node-idempotent.ts'), null);
  });

  it('skips declaration files, dependencies, and unsupported source ids', () => {
    const source = 'async function ignored() { return await task(); }';
    const transform = browserTransform().transform;

    assert.strictEqual(transform(source, '/project/src/contracts.d.ts'), null);
    assert.strictEqual(transform(source, '/project/node_modules/dependency/index.ts'), null);
    assert.strictEqual(transform(source, '/project/src/ignored.json'), null);
  });

  it('binds each transform entrypoint to its runtime module', () => {
    const source = 'async function work(value) { return await value; }';
    const browserOutput = transformSource(source, '/project/src/browser-runtime.ts');
    const nodeOutput = transformSource(source, '/project/src/node-runtime.ts', nodeTransform);
    const browserSourceFile = sourceFileFor(browserOutput, '/project/src/browser-runtime.ts');
    const nodeSourceFile = sourceFileFor(nodeOutput, '/project/src/node-runtime.ts');

    assert.strictEqual(runtimeAlias(browserSourceFile, browserContextRuntimeModule), '__contextAsyncRuntime');
    assert.strictEqual(runtimeAlias(nodeSourceFile, nodeContextRuntimeModule), '__contextAsyncRuntime');
  });
});

interface EmittedProgramInterface {
  (
    context: Context,
    firstScope: ContextScopeInterface,
    secondScope: ContextScopeInterface,
    delay: (milliseconds: number) => Promise<void>
  ): Promise<unknown>;
}

function isEmittedProgram(value: unknown): value is EmittedProgramInterface {
  const result = typeof value === 'function';
  return result;
}

function browserModuleSource(source: string): string {
  const browserEntryUrl = new URL('../../../src/browser/index.js', import.meta.url).href;
  const result = source.replaceAll(browserContextRuntimeModule, browserEntryUrl);
  return result;
}

function delay(milliseconds: number): Promise<void> {
  const result = new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
  return result;
}

describe('ContextAsyncTransform emitted browser behavior', () => {
  it('runs emitted browser code with isolated overlapping context scopes', async () => {
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
    const transformed = transformSource(source, '/project/src/overlap.mjs');
    const moduleUrl = 'data:text/javascript;charset=utf-8,' + encodeURIComponent(browserModuleSource(transformed));
    const emittedModule = await import(moduleUrl);
    const candidate = emittedModule['run'];
    if (!isEmittedProgram(candidate)) {
      throw new Error('Expected emitted browser module to export run().');
    }

    const context = Context.create({ 'name': 'emitted' });
    const firstScope = context.initialize({ 'id': 'first' });
    const secondScope = context.initialize({ 'id': 'second' });
    const values = await candidate(context, firstScope, secondScope, delay);

    assert.deepStrictEqual(values, ['first', 'second']);
    assert.strictEqual(context.isActive(), false);
    assert.throws(() => context.get('id'));
  });
});
