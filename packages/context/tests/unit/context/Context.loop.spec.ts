import { HookInvocationError, RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { ContextScopeInterface, ContextStorageInterface } from '../../../src/interfaces/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { ContextConfigEntity } from '../../../src/entities/ContextConfigEntity.js';
import { Context } from '../../../src/node/index.js';
import { NodeContextStorage } from '../../../src/node/NodeContextStorage.js';
import scenarioGroups from './Context.scenarios.json' with { 'type': 'json' };
import { ContextScenarioCaseEntity } from './entities/ContextScenarioCaseEntity.js';

class LenientContext extends Context {
  static override create(options: ContextConfigEntity.InputType, storage: ContextStorageInterface = new NodeContextStorage()): LenientContext {
    const context = new LenientContext(ContextConfigEntity.create(options), storage);
    return context;
  }

  protected override onMissingContext(): boolean {
    return true;
  }
}

class TracedDeleteContext extends Context {
  readonly events: { 'existed': boolean; 'key': string }[] = [];

  static override create(config: ContextConfigEntity.InputType, storage: ContextStorageInterface = new NodeContextStorage()): TracedDeleteContext {
    const context = new TracedDeleteContext(ContextConfigEntity.create(config), storage);
    return context;
  }

  protected override onDelete(key: string, existed: boolean): void {
    this.events.push({ 'existed': existed, 'key': key });
  }
}

class TracedGetContext extends Context {
  readonly events: { 'key': string; 'value': unknown }[] = [];

  static override create(config: ContextConfigEntity.InputType, storage: ContextStorageInterface = new NodeContextStorage()): TracedGetContext {
    const context = new TracedGetContext(ContextConfigEntity.create(config), storage);
    return context;
  }

  protected override onGet(key: string, value: unknown): void {
    this.events.push({ 'key': key, 'value': value });
  }
}

class TracedTryGetContext extends Context {
  readonly events: string[] = [];

  static override create(config: ContextConfigEntity.InputType, storage: ContextStorageInterface = new NodeContextStorage()): TracedTryGetContext {
    const context = new TracedTryGetContext(ContextConfigEntity.create(config), storage);
    return context;
  }

  protected override onGet(key: string): void {
    this.events.push(key);
  }
}

class TracedSetContext extends Context {
  readonly events: { 'key': string; 'value': unknown }[] = [];

  static override create(config: ContextConfigEntity.InputType, storage: ContextStorageInterface = new NodeContextStorage()): TracedSetContext {
    const context = new TracedSetContext(ContextConfigEntity.create(config), storage);
    return context;
  }

  protected override onSet(key: string, value: unknown): void {
    this.events.push({ 'key': key, 'value': value });
  }
}

class SeededContext extends Context {
  readonly #seeded: unknown;

  constructor(config: ContextConfigEntity.Type, storage: ContextStorageInterface, seeded: unknown) {
    super(config, storage);
    this.#seeded = seeded;
  }

  static createSeeded(config: ContextConfigEntity.InputType, seeded: unknown): SeededContext {
    const context = new SeededContext(ContextConfigEntity.create(config), new NodeContextStorage(), seeded);
    return context;
  }

  protected override onInitialize(_initial: Record<string, unknown> | undefined, scope: ContextScopeInterface): void {
    scope.execute(() => {
      this.set('seeded', this.#seeded);
    });
  }
}

class ThrowingContext extends Context {
  readonly #failureMessage: string;
  readonly #hookName: string;

  constructor(config: ContextConfigEntity.Type, storage: ContextStorageInterface, hookName: string, failureMessage: string) {
    super(config, storage);
    this.#hookName = hookName;
    this.#failureMessage = failureMessage;
  }

  static createThrowing(config: ContextConfigEntity.InputType, hookName: string, failureMessage: string): ThrowingContext {
    const context = new ThrowingContext(ContextConfigEntity.create(config), new NodeContextStorage(), hookName, failureMessage);
    return context;
  }

  protected override onDelete(): void {
    this.failWhen('onDelete');
  }

  protected override onGet(): void {
    this.failWhen('onGet');
  }

  protected override onInitialize(): void {
    this.failWhen('onInitialize');
  }

  protected override onSet(): void {
    this.failWhen('onSet');
  }

  private failWhen(hookName: string): void {
    if (this.#hookName === hookName) {
      throw RuntimeError.create(this.#failureMessage);
    }
  }
}

class ContextRunners {
  static async 'async-on-set-safe'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'async-on-set-safe'>): Promise<void> {
    const unhandled: unknown[] = [];
    const listener = (reason: unknown): void => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', listener);
    try {
      const context = Context.create(scenarioCase.input.context);
      Object.assign(context, {
        'onSet': () => {
          const pending = ContextRunners.rejectAfterDelay('onSet boom');
          return pending;
        }
      });
      const scope = context.initialize(scenarioCase.input.scope.initial);
      scope.execute(() => {
        context.set(scenarioCase.input.scope.key, scenarioCase.input.scope.value);
      });
      await setTimeout(20);
      assert.strictEqual(unhandled.length, scenarioCase.expected.unhandledRejections);
    } finally {
      process.off('unhandledRejection', listener);
    }
  }

  static async 'async-propagation'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'async-propagation'>): Promise<void> {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    await scope.execute(async () => {
      await Promise.resolve();
      assert.strictEqual(context.get('requestId'), scenarioCase.expected.requestId);
      await setTimeout(10);
      assert.strictEqual(context.get('requestId'), scenarioCase.expected.requestId);
    });
  }

  static async 'concurrent-isolation'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'concurrent-isolation'>): Promise<void> {
    const context = Context.create(scenarioCase.input.context);
    const results: string[] = [];
    const scope1 = context.initialize(scenarioCase.input.scope.initial1);
    const scope2 = context.initialize(scenarioCase.input.scope.initial2);
    const task1 = scope1.execute(async () => {
      await setTimeout(20);
      results.push(`task1: ${String(context.get('taskId'))}`);
    });
    const task2 = scope2.execute(async () => {
      await setTimeout(10);
      results.push(`task2: ${String(context.get('taskId'))}`);
    });
    await Promise.all([task1, task2]);
    const expectedResults = scenarioCase.expected.results;
    const resultSet = new Set(results);
    for (let index = 0; index < expectedResults.length; index += 1) {
      assert.ok(resultSet.has(String(expectedResults[index])));
    }
  }

  static async 'concurrent-key-sets'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'concurrent-key-sets'>): Promise<void> {
    const context = Context.create(scenarioCase.input.context);
    const scope1 = context.initialize(scenarioCase.input.scope.initial1);
    const scope2 = context.initialize(scenarioCase.input.scope.initial2);
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

  static async 'concurrent-mutation-isolation'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'concurrent-mutation-isolation'>): Promise<void> {
    const context = Context.create(scenarioCase.input.context);
    const scope1 = context.initialize(scenarioCase.input.scope.initial1);
    const scope2 = context.initialize(scenarioCase.input.scope.initial2);
    await Promise.all([
      scope1.execute(async () => {
        await setTimeout(10);
        context.set('value', scenarioCase.expected.scope1);
        await setTimeout(20);
        assert.strictEqual(context.get('value'), scenarioCase.expected.scope1);
      }),
      scope2.execute(async () => {
        await setTimeout(20);
        assert.strictEqual(context.get('value'), scenarioCase.input.scope.initial2.value);
      })
    ]);
    assert.strictEqual(scope1.terminate().get('value'), scenarioCase.expected.scope1);
    assert.strictEqual(scope2.terminate().get('value'), scenarioCase.expected.scope2);
  }

  static 'config-validation'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'config-validation'>): void {
    assert.throws(
      () => {
        Context.assertValidConfig(scenarioCase.input.context);
      },
      { 'message': scenarioCase.expected.message }
    );
  }

  static 'create-static'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'create-static'>): void {
    const context = Context.create(scenarioCase.input.context);
    assert.strictEqual(context.name, scenarioCase.expected.name);
  }

  static 'delete-missing'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'delete-missing'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    const key = scenarioCase.input.scope.key;
    scope.execute(() => {
      assert.strictEqual(context.delete(key), scenarioCase.expected.removed);
    });
  }

  static 'delete-removes'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'delete-removes'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    const key = scenarioCase.input.scope.key;
    scope.execute(() => {
      assert.strictEqual(context.has(key), true);
      assert.strictEqual(context.delete(key), scenarioCase.expected.removed);
      assert.strictEqual(context.has(key), false);
    });
  }

  static 'execute-after-terminated'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'execute-after-terminated'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.terminate();
    assert.throws(() => {
      scope.execute(() => {});
    }, { 'message': scenarioCase.expected.message });
  }

  static async 'execute-async'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'execute-async'>): Promise<void> {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    await scope.execute(async () => {
      await Promise.resolve();
      const value = context.get('value');
      assert.strictEqual(typeof value, 'number', 'Expected numeric context value');
      assert.strictEqual(Number(value) * 3, scenarioCase.expected.result);
    });
  }

  static 'execute-callback'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'execute-callback'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.execute(() => {
      assert.strictEqual(context.get('key'), scenarioCase.expected.value);
    });
  }

  static 'execute-multiple'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'execute-multiple'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.execute(() => {
      ContextRunners.incrementCount(context);
    });
    scope.execute(() => {
      ContextRunners.incrementCount(context);
    });
    assert.strictEqual(scope.terminate().get('count'), scenarioCase.expected.count);
  }

  static 'execute-return-result'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'execute-return-result'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    const result = scope.execute(() => {
      const value = context.get('value');
      assert.strictEqual(typeof value, 'number', 'Expected numeric context value');
      const doubled = Number(value) * 2;
      return doubled;
    });
    assert.strictEqual(result, scenarioCase.expected.result);
  }

  static async 'full-lifecycle'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'full-lifecycle'>): Promise<void> {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    const result = await scope.execute(async () => {
      context.set('statusCode', 200);
      context.set('result', 'success');
      await setTimeout(10);
      return scenarioCase.expected.result;
    });
    assert.strictEqual(result, scenarioCase.expected.result);
    assert.deepStrictEqual(scope.terminate(), new Map(Object.entries(scenarioCase.expected.finalState)));
    assert.throws(() => {
      scope.execute(() => {});
    }, {
      'message': `${context.name} scope has been terminated`
    });
  }

  static 'get-throws'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'get-throws'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    const key = scenarioCase.input.scope.key;
    scope.execute(() => {
      assert.throws(() => {
        context.get(key);
      }, { 'message': scenarioCase.expected.message });
    });
  }

  static 'has-check'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'has-check'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    const key = scenarioCase.input.scope.key;
    scope.execute(() => {
      assert.strictEqual(context.has(key), scenarioCase.expected.result);
    });
  }

  static 'initialize-scope'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'initialize-scope'>): void {
    const context = Context.create(scenarioCase.input.context);
    const initial = scenarioCase.input.scope.initial;
    const scope = context.initialize(initial);
    assert.strictEqual(typeof scope.execute, 'function');
    assert.strictEqual(typeof scope.terminate, 'function');
    scope.execute(() => {
      assert.deepStrictEqual(context.keys().toSorted(), scenarioCase.expected.keys.toSorted());
      if (initial !== undefined) {
        const entries = Object.entries(initial);
        for (let index = 0; index < entries.length; index += 1) {
          const entry = entries[index];
          assert.ok(entry !== undefined);
          assert.deepStrictEqual(context.get(entry[0]), entry[1]);
        }
      }
    });
  }

  static 'inner-context-no-inherit'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'inner-context-no-inherit'>): void {
    const context = Context.create(scenarioCase.input.context);
    const outerScope = context.initialize(scenarioCase.input.scope.outer);
    outerScope.execute(() => {
      const innerScope = context.initialize();
      innerScope.execute(() => {
        assert.strictEqual(context.has('outerOnly'), scenarioCase.expected.hasOuterOnly);
      });
    });
  }

  static 'invalid-name'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'invalid-name'>): void {
    assert.throws(
      () => {
        Context.assertValidConfig(scenarioCase.input.context);
      },
      { 'message': scenarioCase.expected.message }
    );
  }

  static 'is-active-inside'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'is-active-inside'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize();
    let active = false;
    scope.execute(() => {
      active = context.isActive();
    });
    assert.strictEqual(active, scenarioCase.expected.active);
  }

  static 'is-active-outside'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'is-active-outside'>): void {
    const context = Context.create(scenarioCase.input.context);
    assert.strictEqual(context.isActive(), scenarioCase.expected.active);
  }

  static 'keys-returns'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'keys-returns'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.execute(() => {
      const keys = context.keys();
      assert.deepStrictEqual(keys.toSorted(), ['a', 'b', 'c']);
    });
  }

  static 'lenient-delete-no-corruption'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'lenient-delete-no-corruption'>): void {
    const context = LenientContext.create(scenarioCase.input.context);
    const key = scenarioCase.input.scope.key;
    assert.strictEqual(context.delete(key), scenarioCase.expected.removed);
    assert.strictEqual(context.has(key), scenarioCase.expected.has);
    assert.deepStrictEqual(context.keys(), scenarioCase.expected.keys);
  }

  static 'lenient-read-accessors'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'lenient-read-accessors'>): void {
    const context = LenientContext.create(scenarioCase.input.context);
    assert.strictEqual('getStore' in context, false);
    assert.strictEqual(context.has('key'), scenarioCase.expected.has);
    assert.deepStrictEqual(context.keys(), scenarioCase.expected.keys);
    assert.deepStrictEqual(context.snapshot(), new Map(Object.entries(scenarioCase.expected.snapshot)));
  }

  static 'lenient-set-no-leak'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'lenient-set-no-leak'>): void {
    const context = LenientContext.create(scenarioCase.input.context);
    const key = scenarioCase.input.scope.key;
    context.set(key, scenarioCase.input.scope.value);
    assert.strictEqual(context.has(key), scenarioCase.expected.has);
  }

  static 'multiple-contexts'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'multiple-contexts'>): void {
    const first = scenarioCase.input.contexts.first;
    const second = scenarioCase.input.contexts.second;
    const context1 = Context.create(first.context);
    const context2 = Context.create(second.context);
    const scope1 = context1.initialize(first.scope.initial);
    const scope2 = context2.initialize(second.scope.initial);
    scope1.execute(() => {
      scope2.execute(() => {
        assert.strictEqual(context1.get('id'), scenarioCase.expected.context1);
        assert.strictEqual(context2.get('count'), scenarioCase.expected.context2);
      });
    });
  }

  static async 'mutations-persist-async-chain'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'mutations-persist-async-chain'>): Promise<void> {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    await scope.execute(async () => {
      context.set('step', 1);
      await Promise.resolve();
      assert.strictEqual(context.get('step'), 1);
      context.set('step', scenarioCase.expected.step);
      await Promise.resolve();
      assert.strictEqual(context.get('step'), scenarioCase.expected.step);
    });
  }

  static 'nested-scope-isolation'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'nested-scope-isolation'>): void {
    const context = Context.create(scenarioCase.input.context);
    const outerScope = context.initialize(scenarioCase.input.scope.outer);
    outerScope.execute(() => {
      assert.strictEqual(context.get('level'), scenarioCase.expected.outer);
      const innerScope = context.initialize(scenarioCase.input.scope.inner);
      innerScope.execute(() => {
        assert.strictEqual(context.get('level'), scenarioCase.expected.inner);
      });
      assert.strictEqual(context.get('level'), scenarioCase.expected.outer);
    });
  }

  static 'outside-get-throws'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'outside-get-throws'>): void {
    const context = Context.create(scenarioCase.input.context);
    assert.throws(() => {
      context.get(scenarioCase.input.scope.key);
    }, { 'message': scenarioCase.expected.message });
  }

  static 'outside-set-throws'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'outside-set-throws'>): void {
    const context = Context.create(scenarioCase.input.context);
    assert.throws(
      () => {
        context.set(scenarioCase.input.scope.key, scenarioCase.input.scope.value);
      },
      { 'message': scenarioCase.expected.message }
    );
  }

  static 'outside-tryget'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'outside-tryget'>): void {
    const context = Context.create(scenarioCase.input.context);
    assert.deepStrictEqual(context.tryGet(scenarioCase.input.scope.key), {
      'found': scenarioCase.expected.found,
      'value': undefined
    });
  }

  static 'set-get'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'set-get'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.execute(() => {
      context.set('key', scenarioCase.expected.value);
      assert.strictEqual(context.get('key'), scenarioCase.expected.value);
    });
  }

  static 'snapshot-copy'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'snapshot-copy'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.execute(() => {
      assert.deepStrictEqual(context.snapshot(), new Map(Object.entries(scenarioCase.expected.snapshot)));
    });
  }

  static 'snapshot-independent'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'snapshot-independent'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.execute(() => {
      const snapshot = context.snapshot();
      context.set('key', scenarioCase.expected.current);
      assert.strictEqual(snapshot.get('key'), scenarioCase.expected.snapshot);
      assert.strictEqual(context.get('key'), scenarioCase.expected.current);
    });
  }

  static 'subclass-on-delete'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'subclass-on-delete'>): void {
    const context = TracedDeleteContext.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.execute(() => {
      context.delete('toRemove');
      context.delete('missing');
    });
    scope.terminate();
    assert.deepStrictEqual(context.events, scenarioCase.expected.events);
  }

  static 'subclass-on-get'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'subclass-on-get'>): void {
    const context = TracedGetContext.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.execute(() => {
      context.get('x');
      context.get('x');
    });
    scope.terminate();
    assert.deepStrictEqual(context.events, scenarioCase.expected.events);
  }

  static 'subclass-on-get-tryget'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'subclass-on-get-tryget'>): void {
    const context = TracedTryGetContext.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.execute(() => {
      context.tryGet('k');
      context.tryGet('missing');
    });
    scope.terminate();
    assert.deepStrictEqual(context.events, scenarioCase.expected.events);
  }

  static 'subclass-on-initialize'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'subclass-on-initialize'>): void {
    const context = SeededContext.createSeeded(scenarioCase.input.context, scenarioCase.expected.seeded);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.execute(() => {
      assert.strictEqual(context.get('seeded'), scenarioCase.expected.seeded);
    });
  }

  static 'subclass-on-initialize-with-caller'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'subclass-on-initialize-with-caller'>): void {
    const context = SeededContext.createSeeded(scenarioCase.input.context, scenarioCase.expected.seeded);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.execute(() => {
      assert.strictEqual(context.get('seeded'), scenarioCase.expected.seeded);
      assert.strictEqual(context.get('caller'), scenarioCase.expected.caller);
    });
  }

  static 'subclass-on-set'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'subclass-on-set'>): void {
    const context = TracedSetContext.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.execute(() => {
      context.set('a', 1);
      context.set('b', 'hello');
    });
    scope.terminate();
    assert.deepStrictEqual(context.events, scenarioCase.expected.events);
  }

  static 'terminate-clears'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'terminate-clears'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    assert.strictEqual(scope.terminate().get('key'), scenarioCase.expected.firstValue);
    assert.throws(() => {
      scope.terminate();
    }, { 'message': 'test scope has already been terminated' });
  }

  static 'terminate-snapshot'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'terminate-snapshot'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.execute(() => {
      context.set('statusCode', 200);
      context.set('result', 'success');
    });
    assert.deepStrictEqual(scope.terminate(), new Map(Object.entries(scenarioCase.expected.snapshot)));
  }

  static 'terminate-twice'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'terminate-twice'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.terminate();
    assert.throws(() => {
      scope.terminate();
    }, { 'message': scenarioCase.expected.message });
  }

  static 'throwing-on-delete'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'throwing-on-delete'>): void {
    const context = ThrowingContext.createThrowing(scenarioCase.input.context, 'onDelete', scenarioCase.expected.message);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    const key = scenarioCase.input.scope.key;
    scope.execute(() => {
      assert.throws(
        () => {
          context.delete(key);
        },
        (thrown) => {
          const error: unknown = thrown;
          const matches = error instanceof HookInvocationError && error.hookName === scenarioCase.expected.hookName;
          return matches;
        }
      );
      assert.strictEqual(context.has(key), false);
    });
  }

  static 'throwing-on-get'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'throwing-on-get'>): void {
    const context = ThrowingContext.createThrowing(scenarioCase.input.context, 'onGet', scenarioCase.expected.message);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    const key = scenarioCase.input.scope.key;
    scope.execute(() => {
      assert.throws(
        () => {
          context.get(key);
        },
        (thrown) => {
          const error: unknown = thrown;
          const matches = error instanceof HookInvocationError && error.hookName === scenarioCase.expected.hookName;
          return matches;
        }
      );
    });
  }

  static 'throwing-on-initialize'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'throwing-on-initialize'>): void {
    const context = ThrowingContext.createThrowing(scenarioCase.input.context, 'onInitialize', scenarioCase.expected.message);
    assert.throws(
      () => {
        context.initialize(scenarioCase.input.scope.initial);
      },
      (thrown) => {
        const error: unknown = thrown;
        const matches = error instanceof HookInvocationError && error.hookName === scenarioCase.expected.hookName;
        return matches;
      }
    );
  }

  static 'throwing-on-set'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'throwing-on-set'>): void {
    const context = ThrowingContext.createThrowing(scenarioCase.input.context, 'onSet', scenarioCase.expected.message);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    const key = scenarioCase.input.scope.key;
    const value = scenarioCase.input.scope.value;
    scope.execute(() => {
      assert.throws(
        () => {
          context.set(key, value);
        },
        (thrown) => {
          const error: unknown = thrown;
          const matches = error instanceof HookInvocationError && error.hookName === scenarioCase.expected.hookName;
          return matches;
        }
      );
      assert.strictEqual(context.get(key), value);
    });
  }

  static 'tryget-missing'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'tryget-missing'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    const key = scenarioCase.input.scope.key;
    scope.execute(() => {
      assert.deepStrictEqual(context.tryGet(key), { 'found': false, 'value': undefined });
    });
  }

  static 'tryget-present'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'tryget-present'>): void {
    const context = Context.create(scenarioCase.input.context);
    const scope = context.initialize(scenarioCase.input.scope.initial);
    scope.execute(() => {
      assert.deepStrictEqual(context.tryGet('key'), {
        'found': scenarioCase.expected.found,
        'value': scenarioCase.expected.value
      });
    });
  }

  static 'tryget-undefined'(scenarioCase: ScenarioCaseOfType<ContextScenarioCaseEntity.Type, 'tryget-undefined'>): void {
    const context = Context.create(scenarioCase.input.context);
    const key = scenarioCase.input.scope.key;
    const scope = context.initialize({ 'key': undefined });
    scope.execute(() => {
      assert.deepStrictEqual(context.tryGet(key), { 'found': true, 'value': undefined });
    });
  }

  private static incrementCount(context: Context): void {
    const count = context.get('count');
    assert.strictEqual(typeof count, 'number', 'Expected numeric context count');
    context.set('count', Number(count) + 1);
  }

  private static async rejectAfterDelay(message: string): Promise<void> {
    await setTimeout(5);
    throw RuntimeError.create(message);
  }
}

ScenarioSuite.register({
  'entity': ContextScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Context',
  'runners': ContextRunners
});
