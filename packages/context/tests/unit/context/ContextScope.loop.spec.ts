import { RuntimeError } from '@studnicky/errors/node';
import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite, ScenarioValues } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { Context } from '../../../src/node/index.js';
import scenarioGroups from './ContextScope.scenarios.json' with { 'type': 'json' };
import { ContextScopeScenarioCaseEntity } from './entities/ContextScopeScenarioCaseEntity.js';

class ContextScopeTestError extends BaseError {
  public override readonly name: string = 'ContextScopeTestError';

  public constructor(message: string, cause?: unknown) {
    super({
      'cause': cause,
      'code': 'context.testScopeFixtureFailed',
      'message': message,
      'retryable': false
    });
  }
}

interface DoubleFixtureInterface {
  (value: number): number;
}

class FunctionFixtures {
  static readonly fixtures: ReadonlyMap<string, DoubleFixtureInterface> = new Map<string, DoubleFixtureInterface>([
    ['doubleNumber', FunctionFixtures.doubleNumber]
  ]);

  static doubleNumber(value: number): number {
    const doubled = value * 2;
    return doubled;
  }

  static isFixture(value: unknown): value is DoubleFixtureInterface {
    const result = typeof value === 'function';
    return result;
  }
}

class ContextScopeRunners {
  static 'active-on-construction'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'active-on-construction'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    const result = scope.execute(() => {
      const value = context.get('key');
      return value;
    });
    assert.strictEqual(result, scenarioCase.expected.result);
  }

  static async 'async-accumulates-state'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'async-accumulates-state'>): Promise<void> {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    await scope.execute(async () => {
      await setTimeout(5);
      context.set('step', 1);
      context.set('async1', 'done');
    });
    await scope.execute(async () => {
      await setTimeout(5);
      assert.strictEqual(context.get('step'), 1);
      context.set('step', 2);
      context.set('async2', 'done');
    });
    assert.deepStrictEqual(scope.terminate(), new Map(Object.entries(scenarioCase.expected.terminate)));
  }

  static async 'async-execute-errors-propagate'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'async-execute-errors-propagate'>): Promise<void> {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize();
    const message = scenarioCase.input.scope.message;
    assert.strictEqual(message, scenarioCase.expected.message);
    await assert.rejects(scope.execute(async () => {
      await setTimeout(5);
      throw RuntimeError.create(message);
    }), { 'message': message });
  }

  static 'complex-object-values'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'complex-object-values'>): void {
    const context = Context.create(scenarioCase.input.context);
    const initial = scenarioCase.input.scope.initial;
    const complex = initial.complex;
    const scope = context.initialize(initial);
    scope.execute(() => {
      const retrieved = context.get('complex');
      assert.strictEqual(retrieved, complex);
    });
    const final = scope.terminate();
    assert.strictEqual(final.get('complex'), complex);
  }

  static 'delete-affects-later-executes'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'delete-affects-later-executes'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.execute(() => {
      context.delete('remove');
    });
    scope.execute(() => {
      assert.strictEqual(context.has('keep'), true);
      assert.strictEqual(context.has('remove'), false);
    });
    assert.deepStrictEqual(scope.terminate(), new Map(Object.entries(scenarioCase.expected.terminate)));
  }

  static 'empty-string-key'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'empty-string-key'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.execute(() => {
      assert.strictEqual(context.get(''), scenarioCase.expected.value);
    });
    scope.terminate();
  }

  static 'execute-errors-propagate'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'execute-errors-propagate'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize();
    const message = scenarioCase.input.scope.message;
    assert.strictEqual(message, scenarioCase.expected.message);
    assert.throws(() => {
      scope.execute(() => {
        throw RuntimeError.create(message);
      });
    }, { 'message': message });
  }

  static 'function-values'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'function-values'>): void {
    const context = Context.create(scenarioCase.input.context);
    const fixture = FunctionFixtures.fixtures.get(scenarioCase.input.scope.initial.callable);
    assert.ok(fixture !== undefined, 'input.scope.initial.callable must reference a known function fixture');
    const scope = context.initialize({ 'callable': fixture });
    scope.execute(() => {
      const retrieved = context.get('callable');
      assert.ok(FunctionFixtures.isFixture(retrieved), 'Expected callable context value');
      assert.strictEqual(retrieved(5), scenarioCase.expected.result);
    });
  }

  static 'immediate-terminate-empty'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'immediate-terminate-empty'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize();
    assert.deepStrictEqual(scenarioCase.input.scope.terminate, scenarioCase.expected.terminate);
    assert.deepStrictEqual(scope.terminate(), new Map(Object.entries(scenarioCase.expected.terminate)));
  }

  static 'immediate-terminate-with-values'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'immediate-terminate-with-values'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    assert.deepStrictEqual(scope.terminate(), new Map(Object.entries(scenarioCase.expected.terminate)));
  }

  static async 'independent-key-sets'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'independent-key-sets'>): Promise<void> {
    const context = Context.create(scenarioCase.input.context);
    const scope1 = context.initialize(scenarioCase.input.scope.initial);
    const scope2 = context.initialize(scenarioCase.input.scope.initial);
    await Promise.all([
      scope1.execute(async () => {
        context.set('only1', 'value1');
        await setTimeout(10);
      }),
      scope2.execute(async () => {
        context.set('only2', 'value2');
        await setTimeout(10);
      })
    ]);
    const final1 = scope1.terminate();
    const final2 = scope2.terminate();
    assert.ok(final1.has('only1'));
    assert.ok(!final1.has('only2'));
    assert.ok(final2.has('only2'));
    assert.ok(!final2.has('only1'));
  }

  static 'long-key-name'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'long-key-name'>): void {
    const context = Context.create(scenarioCase.input.context);
    const key = ContextScopeRunners.repeatLetter('a', scenarioCase.input.scope.keyLength);
    const initial = ContextScopeRunners.parseRecord(`{${ContextScopeRunners.stringify(key)}:${ContextScopeRunners.stringify(scenarioCase.expected.value)}}`);
    const scope = context.initialize(initial);
    scope.execute(() => {
      assert.strictEqual(context.get(key), scenarioCase.expected.value);
    });
    scope.terminate();
  }

  static 'many-keys'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'many-keys'>): void {
    const context = Context.create(scenarioCase.input.context);
    const count = scenarioCase.input.scope.count;
    const fragments: string[] = [];
    for (let index = 0; index < count; index += 1) {
      fragments.push(`"key${String(index)}":${String(index)}`);
    }
    const scope = context.initialize(ContextScopeRunners.parseRecord(`{${fragments.join(',')}}`));
    scope.execute(() => {
      assert.strictEqual(context.keys().length, scenarioCase.expected.size);
      assert.strictEqual(context.get('key500'), scenarioCase.expected.key500);
    });
    assert.strictEqual(scope.terminate().size, scenarioCase.expected.size);
  }

  static 'middleware-chain-pattern'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'middleware-chain-pattern'>): void {
    const context = Context.create(scenarioCase.input.context);
    const expectedUser = scenarioCase.expected.user;
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.execute(() => {
      context.set('authenticated', true);
      context.set('user', expectedUser);
    });
    scope.execute(() => {
      context.set('logged', true);
    });
    scope.execute(() => {
      if (context.get('authenticated') === true) {
        context.set('validated', true);
      }
    });
    assert.deepStrictEqual(scope.terminate(), new Map(Object.entries(scenarioCase.expected)));
  }

  static 'multi-execute-before-terminate'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'multi-execute-before-terminate'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize();
    const executionInput = scenarioCase.input.scope.executions;
    const executions: number[] = [];
    for (let index = 0; index < executionInput.length; index += 1) {
      scope.execute(() => {
        executions.push(Number(executionInput[index]));
      });
    }
    assert.deepStrictEqual(executions, scenarioCase.expected.executions);
  }

  static async 'mutations-in-one-scope-not-others'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'mutations-in-one-scope-not-others'>): Promise<void> {
    const context = Context.create(scenarioCase.input.context);
    const scope1 = context.initialize(scenarioCase.input.scope.initial);
    const scope2 = context.initialize(scenarioCase.input.scope.initial);
    await Promise.all([
      scope1.execute(async () => {
        context.set('value', scenarioCase.expected.scope1);
        await setTimeout(20);
        assert.strictEqual(context.get('value'), scenarioCase.expected.scope1);
      }),
      scope2.execute(async () => {
        await setTimeout(10);
        assert.strictEqual(context.get('value'), scenarioCase.input.scope.initial.value);
        context.set('value', scenarioCase.expected.scope2);
      })
    ]);
    assert.strictEqual(scope1.terminate().get('value'), scenarioCase.expected.scope1);
    assert.strictEqual(scope2.terminate().get('value'), scenarioCase.expected.scope2);
  }

  static async 'mutations-visible-after-await'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'mutations-visible-after-await'>): Promise<void> {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize();
    const before = scenarioCase.input.scope.before;
    const after = scenarioCase.input.scope.after;
    await scope.execute(async () => {
      context.set('before', before);
      await setTimeout(10);
      assert.strictEqual(context.get('before'), before);
      context.set('after', after);
    });
    assert.deepStrictEqual(scope.terminate(), new Map(Object.entries(scenarioCase.expected.terminate)));
  }

  static async 'nested-async-functions'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'nested-async-functions'>): Promise<void> {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    await scope.execute(async () => {
      await ContextScopeRunners.descendFromLevelOne(context, scenarioCase.expected.finalDepth);
      assert.strictEqual(context.get('depth'), scenarioCase.expected.finalDepth);
    });
  }

  static 'null-values'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'null-values'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.execute(() => {
      assert.strictEqual(context.get('nul'), null);
    });
    assert.deepStrictEqual(scope.terminate(), new Map(Object.entries(scenarioCase.expected.terminate)));
  }

  static 'overwrite-later-values'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'overwrite-later-values'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.execute(() => {
      context.set('counter', 1);
    });
    scope.execute(() => {
      context.set('counter', 2);
    });
    scope.execute(() => {
      context.set('counter', scenarioCase.expected.counter);
    });
    assert.strictEqual(scope.terminate().get('counter'), scenarioCase.expected.counter);
  }

  static async 'parallel-operations-pattern'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'parallel-operations-pattern'>): Promise<void> {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    const delays = scenarioCase.input.scope.delays;
    const expectedResults = scenarioCase.expected.results;
    await scope.execute(async () => {
      const operations: Promise<string>[] = [];
      for (let index = 0; index < expectedResults.length; index += 1) {
        operations.push(ContextScopeRunners.resolveAfter(ScenarioValues.requireDefined(delays[index], 'input.scope.delays[index]'), String(expectedResults[index])));
      }
      const operationResults = await Promise.all(operations);
      context.set('results', operationResults);
      context.set('completedAt', Date.now());
    });
    const final = scope.terminate();
    assert.deepStrictEqual(final.get('results'), expectedResults);
    assert.ok(typeof final.get('completedAt') === 'number');
  }

  static 'persist-values-across-executes'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'persist-values-across-executes'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize();
    const fromFirst = scenarioCase.input.scope.fromFirst;
    const fromSecond = scenarioCase.input.scope.fromSecond;
    scope.execute(() => {
      context.set('fromFirst', fromFirst);
    });
    scope.execute(() => {
      assert.strictEqual(context.get('fromFirst'), fromFirst);
      context.set('fromSecond', fromSecond);
    });
    assert.deepStrictEqual(scope.terminate(), new Map(Object.entries(scenarioCase.expected.terminate)));
  }

  static 'prevent-execute-after-terminate'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'prevent-execute-after-terminate'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize();
    scope.terminate();
    assert.strictEqual(scenarioCase.input.scope.message, scenarioCase.expected.message);
    assert.throws(() => {
      scope.execute(() => {});
    }, { 'message': scenarioCase.input.scope.message });
  }

  static async 'promise-all-propagation'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'promise-all-propagation'>): Promise<void> {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    await scope.execute(async () => {
      const results = await Promise.all([
        Promise.resolve().then(() => {
          const identifier = context.get('id');
          return identifier;
        }),
        setTimeout(5).then(() => {
          const identifier = context.get('id');
          return identifier;
        }),
        setTimeout(10).then(() => {
          const identifier = context.get('id');
          return identifier;
        })
      ]);
      assert.deepStrictEqual(results, scenarioCase.expected.results);
    });
  }

  static async 'promise-resolve-propagation'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'promise-resolve-propagation'>): Promise<void> {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    await scope.execute(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      assert.strictEqual(context.get('id'), scenarioCase.expected.id);
    });
  }

  static async 'request-handling-pattern'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'request-handling-pattern'>): Promise<void> {
    const context = Context.create(scenarioCase.input.context);
    const expectedResponse = scenarioCase.expected.response;
    const expectedFinalState = scenarioCase.expected.finalState;
    const scope = context.initialize({ 'requestId': scenarioCase.input.scope.requestId, 'startTime': Date.now() });
    const response = await scope.execute(async () => {
      await setTimeout(5);
      context.set('userId', expectedFinalState.userId);
      await setTimeout(5);
      context.set('result', { 'data': 'processed' });
      const body = ContextScopeRunners.stringify(context.get('result'));
      return { 'body': body, 'status': expectedResponse.status };
    });
    const finalState = scope.terminate();
    assert.strictEqual(response.status, expectedResponse.status);
    assert.strictEqual(finalState.get('requestId'), expectedFinalState.requestId);
    assert.strictEqual(finalState.get('userId'), expectedFinalState.userId);
    assert.ok(typeof finalState.get('startTime') === 'number');
  }

  static 'scope-reusable-after-error'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'scope-reusable-after-error'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    try {
      scope.execute(() => {
        context.set('beforeError', true);
        throw RuntimeError.create('oops');
      });
    } catch {
      // ignore
    }
    scope.execute(() => {
      assert.strictEqual(context.get('beforeError'), true);
      context.set('afterError', scenarioCase.expected.afterError);
    });
    assert.strictEqual(scope.terminate().get('afterError'), scenarioCase.expected.afterError);
  }

  static async 'separate-scopes-isolated'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'separate-scopes-isolated'>): Promise<void> {
    const context = Context.create(scenarioCase.input.context);
    const initial = scenarioCase.input.scope.initial;
    const scope1 = context.initialize(initial[0]);
    const scope2 = context.initialize(initial[1]);
    const scope3 = context.initialize(initial[2]);
    const results: string[] = [];
    await Promise.all([
      scope1.execute(async () => {
        await setTimeout(15);
        results.push(`1:${String(context.get('id'))}`);
      }),
      scope2.execute(async () => {
        await setTimeout(10);
        results.push(`2:${String(context.get('id'))}`);
      }),
      scope3.execute(async () => {
        await setTimeout(5);
        results.push(`3:${String(context.get('id'))}`);
      })
    ]);
    const expectedContains = scenarioCase.expected.contains;
    const resultSet = new Set(results);
    for (let index = 0; index < expectedContains.length; index += 1) {
      assert.ok(resultSet.has(String(expectedContains[index])));
    }
  }

  static 'snapshot-clears-store'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'snapshot-clears-store'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    assert.strictEqual(scope.terminate().get('key'), scenarioCase.expected.first);
    assert.throws(() => {
      scope.terminate();
    }, { 'message': `${context.name} scope has already been terminated` });
  }

  static 'snapshot-complete'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'snapshot-complete'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    const expectedSnapshot = scenarioCase.expected.snapshot;
    scope.execute(() => {
      context.set('added1', expectedSnapshot.added1);
      context.set('added2', expectedSnapshot.added2);
    });
    assert.deepStrictEqual(scope.terminate(), new Map(Object.entries(expectedSnapshot)));
  }

  static 'snapshot-independent-copy'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'snapshot-independent-copy'>): void {
    const context = Context.create(scenarioCase.input.context);
    const copy = { ...scenarioCase.input.scope.initial.payload };
    const scope = context.initialize({ 'payload': copy });
    const final = scope.terminate();
    copy.nested = scenarioCase.expected.nested;
    assert.strictEqual(ScenarioValues.requireRecord(final.get('payload'), 'final.payload').nested, scenarioCase.expected.nested);
  }

  static 'symbol-key-string'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'symbol-key-string'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.execute(() => {
      assert.strictEqual(context.get('Symbol(test)'), scenarioCase.expected.value);
    });
    scope.terminate();
  }

  static 'terminate-after-error'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'terminate-after-error'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    try {
      scope.execute(() => {
        throw RuntimeError.create('error');
      });
    } catch {
      // ignore
    }
    assert.deepStrictEqual(scope.terminate(), new Map(Object.entries(scenarioCase.expected.terminate)));
  }

  static 'terminate-once'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'terminate-once'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize();
    scope.terminate();
    assert.strictEqual(scenarioCase.input.scope.message, scenarioCase.expected.message);
    assert.throws(() => {
      scope.terminate();
    }, { 'message': scenarioCase.input.scope.message });
  }

  static 'terminated-scope-throws'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'terminated-scope-throws'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize();
    scope.terminate();
    assert.strictEqual(scenarioCase.input.scope.message, scenarioCase.expected.message);
    assert.throws(() => {
      scope.execute(() => {});
    }, { 'message': scenarioCase.expected.message });
  }

  static async 'timeout-propagation'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'timeout-propagation'>): Promise<void> {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    await scope.execute(async () => {
      await setTimeout(10);
      assert.strictEqual(context.get('id'), scenarioCase.expected.id);
      await setTimeout(10);
      assert.strictEqual(context.get('id'), scenarioCase.expected.id);
    });
  }

  static 'undefined-values'(scenarioCase: ScenarioCaseOfType<ContextScopeScenarioCaseEntity.Type, 'undefined-values'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize({ 'undef': undefined });
    scope.execute(() => {
      assert.strictEqual(context.get('undef'), undefined);
      assert.strictEqual(context.has('undef'), scenarioCase.expected.has);
    });
    const final = scope.terminate();
    assert.strictEqual(final.get('undef'), undefined);
    assert.strictEqual(final.has('undef'), scenarioCase.expected.finalHas);
  }

  private static async descendFromLevelOne(context: Context, finalDepth: number): Promise<void> {
    context.set('depth', 1);
    await setTimeout(5);
    await ContextScopeRunners.descendFromLevelTwo(context, finalDepth);
  }

  private static async descendFromLevelTwo(context: Context, finalDepth: number): Promise<void> {
    assert.strictEqual(context.get('depth'), 1);
    context.set('depth', 2);
    await setTimeout(5);
    await ContextScopeRunners.descendFromLevelThree(context, finalDepth);
  }

  private static descendFromLevelThree(context: Context, finalDepth: number): Promise<void> {
    assert.strictEqual(context.get('depth'), 2);
    context.set('depth', finalDepth);
    const completed = Promise.resolve();
    return completed;
  }

  private static parseRecord(text: string): ReturnType<typeof ScenarioValues.requireRecord> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (cause) {
      throw new ContextScopeTestError('Fixture record text is not valid JSON', cause);
    }
    const record = ScenarioValues.requireRecord(parsed, 'fixture record');
    return record;
  }

  private static repeatLetter(letter: string, count: number): string {
    let repeated = '';
    try {
      repeated = letter.repeat(count);
    } catch (cause) {
      throw new ContextScopeTestError('Fixture key length is not repeatable', cause);
    }
    return repeated;
  }

  private static async resolveAfter(delay: number, result: string): Promise<string> {
    await setTimeout(delay);
    return result;
  }

  private static stringify(value: unknown): string {
    let text = '';
    try {
      text = JSON.stringify(value);
    } catch (cause) {
      throw new ContextScopeTestError('Fixture value is not serializable', cause);
    }
    return text;
  }
}

ScenarioSuite.register({
  'entity': ContextScopeScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Context.initialize() scope lifecycle',
  'runners': ContextScopeRunners
});
