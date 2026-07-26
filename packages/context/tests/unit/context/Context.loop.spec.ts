import assert from 'node:assert/strict';
import {
  describe, it, beforeEach
} from 'node:test';
import { setTimeout } from 'node:timers/promises';

import { HookInvocationError } from '@studnicky/errors';

import { Context } from '../../../src/context/index.js';
import type { ContextConfigEntity } from '../../../src/entities/ContextConfigEntity.js';
import type { ContextScopeInterface } from '../../../src/interfaces/index.js';
import scenarioGroups from './Context.scenarios.json' with { type: 'json' };

type ScenarioShape =
  | 'async-on-set-safe'
  | 'async-propagation'
  | 'concurrent-isolation'
  | 'concurrent-key-sets'
  | 'concurrent-mutation-isolation'
  | 'config-validation'
  | 'create-static'
  | 'delete-missing'
  | 'delete-removes'
  | 'execute-after-terminated'
  | 'execute-async'
  | 'execute-callback'
  | 'execute-multiple'
  | 'execute-return-result'
  | 'full-lifecycle'
  | 'get-throws'
  | 'has-check'
  | 'initialize-scope'
  | 'inner-context-no-inherit'
  | 'invalid-name'
  | 'is-active-inside'
  | 'is-active-outside'
  | 'keys-returns'
  | 'lenient-delete-no-corruption'
  | 'lenient-read-accessors'
  | 'lenient-set-no-leak'
  | 'multiple-contexts'
  | 'mutations-persist-async-chain'
  | 'nested-scope-isolation'
  | 'outside-get-throws'
  | 'outside-set-throws'
  | 'outside-tryget'
  | 'set-get'
  | 'snapshot-copy'
  | 'snapshot-independent'
  | 'subclass-on-delete'
  | 'subclass-on-get'
  | 'subclass-on-get-tryget'
  | 'subclass-on-initialize'
  | 'subclass-on-initialize-with-caller'
  | 'subclass-on-set'
  | 'terminate-clears'
  | 'terminate-snapshot'
  | 'terminate-twice'
  | 'throwing-on-delete'
  | 'throwing-on-get'
  | 'throwing-on-initialize'
  | 'throwing-on-set'
  | 'tryget-missing'
  | 'tryget-present'
  | 'tryget-undefined';

type ScenarioData = {
  description: string;
  expected: Record<string, unknown>;
  input: ScenarioInput;
  shape: string;
  name: string;
};

type ScenarioInput = {
  context?: unknown;
  contexts?: Record<string, unknown>;
  scope?: Record<string, unknown>;
};

type ScenarioCase = ScenarioData;
type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TypeError(`${label} must be an object`);
  }

  return value;
}

function contextConfig(scenarioCase: ScenarioCase): ContextConfigEntity.Type {
  const context = requireRecord(scenarioCase.input.context, 'input.context');
  const name = context.name;
  if (typeof name !== 'string') {
    throw new TypeError('input.context.name must be a string');
  }

  return { name };
}

function scopeInput(scenarioCase: ScenarioCase): Record<string, unknown> {
  return scenarioCase.input.scope === undefined
    ? {}
    : requireRecord(scenarioCase.input.scope, 'input.scope');
}

function scopeInitial(scenarioCase: ScenarioCase, key = 'initial'): Record<string, unknown> | undefined {
  const initial = scopeInput(scenarioCase)[key];
  return initial === undefined
    ? undefined
    : requireRecord(initial, `input.scope.${key}`);
}

function scopeString(scenarioCase: ScenarioCase, key: string): string {
  const value = scopeInput(scenarioCase)[key];
  if (typeof value !== 'string') {
    throw new TypeError(`input.scope.${key} must be a string`);
  }

  return value;
}

function expectedStringArray(scenarioCase: ScenarioCase, key: string): string[] {
  const value = scenarioCase.expected[key];
  if (!Array.isArray(value)) {
    throw new TypeError(`expected.${key} must be an array`);
  }

  const strings: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      throw new TypeError(`expected.${key} must contain only strings`);
    }
    strings.push(item);
  }

  return strings;
}

function createContext(scenarioCase: ScenarioCase): Context {
  return Context.create(contextConfig(scenarioCase));
}

function multiContextInput(scenarioCase: ScenarioCase, key: string): {
  context: ContextConfigEntity.Type;
  initial: Record<string, unknown> | undefined;
} {
  const contexts = requireRecord(scenarioCase.input.contexts, 'input.contexts');
  const entry = requireRecord(contexts[key], `input.contexts.${key}`);
  const context = requireRecord(entry.context, `input.contexts.${key}.context`);
  const scope = requireRecord(entry.scope, `input.contexts.${key}.scope`);
  const name = context.name;
  if (typeof name !== 'string') {
    throw new TypeError(`input.contexts.${key}.context.name must be a string`);
  }

  return {
    context: { name },
    initial: scope.initial === undefined
      ? undefined
      : requireRecord(scope.initial, `input.contexts.${key}.scope.initial`)
  };
}

function makeLenientContext(config: ContextConfigEntity.Type): Context {
  class LenientContext extends Context {
    protected override onMissingContext(): boolean {
      return true;
    }
  }

  return LenientContext.create(config);
}

const runnerMap = {
  'create-static': (scenarioCase) => {
    const context = createContext(scenarioCase);
    assert.strictEqual(context.name, scenarioCase.expected.name);
    return;
  },

  'invalid-name': (scenarioCase) => {
    assert.throws(
      () => Reflect.apply(Context.create, Context, [scenarioCase.input.context]),
      { message: scenarioCase.expected.message }
    );
    return;
  },

  'initialize-scope': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const initial = scopeInitial(scenarioCase);
    const scope = context.initialize(initial);
    assert.strictEqual(typeof scope.execute, 'function');
    assert.strictEqual(typeof scope.terminate, 'function');
    scope.execute(() => {
      assert.deepStrictEqual(context.keys().sort(), expectedStringArray(scenarioCase, 'keys').sort());
      if (initial !== undefined) {
        for (const [key, value] of Object.entries(initial)) {
          assert.deepStrictEqual(context.get(key), value);
        }
      }
    });
    return;
  },

  'execute-callback': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.execute(() => {
      assert.strictEqual(context.get('key'), scenarioCase.expected.value);
    });
    return;
  },

  'execute-return-result': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    const result = scope.execute(() => {
      const value = context.get('value');
      if (typeof value !== 'number') {
        throw new TypeError('Expected numeric context value');
      }
      return value * 2;
    });
    assert.strictEqual(result, scenarioCase.expected.result);
    return;
  },

  'execute-async': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    return scope.execute(async () => {
      await Promise.resolve();
      const value = context.get('value');
      if (typeof value !== 'number') {
        throw new TypeError('Expected numeric context value');
      }
      assert.strictEqual(value * 3, scenarioCase.expected.result);
    });
  },

  'execute-multiple': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.execute(() => {
      const count = context.get('count');
      if (typeof count !== 'number') {
        throw new TypeError('Expected numeric context count');
      }
      context.set('count', count + 1);
    });
    scope.execute(() => {
      const count = context.get('count');
      if (typeof count !== 'number') {
        throw new TypeError('Expected numeric context count');
      }
      context.set('count', count + 1);
    });
    assert.strictEqual(scope.terminate().count, scenarioCase.expected.count);
    return;
  },

  'execute-after-terminated': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.terminate();
    assert.throws(() => scope.execute(() => {}), { message: scenarioCase.expected.message });
    return;
  },

  'terminate-snapshot': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.execute(() => {
      context.set('statusCode', 200);
      context.set('result', 'success');
    });
    assert.deepStrictEqual(scope.terminate(), scenarioCase.expected.snapshot);
    return;
  },

  'terminate-clears': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    assert.strictEqual(scope.terminate().key, scenarioCase.expected.firstValue);
    assert.throws(() => scope.terminate(), { message: 'test scope has already been terminated' });
    return;
  },

  'terminate-twice': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.terminate();
    assert.throws(() => scope.terminate(), { message: scenarioCase.expected.message });
    return;
  },

  'set-get': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.execute(() => {
      context.set('key', scenarioCase.expected.value);
      assert.strictEqual(context.get('key'), scenarioCase.expected.value);
    });
    return;
  },

  'tryget-missing': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    const key = scopeString(scenarioCase, 'key');
    scope.execute(() => {
      assert.deepStrictEqual(context.tryGet(key), { found: false, value: undefined });
    });
    return;
  },

  'tryget-present': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.execute(() => {
      assert.deepStrictEqual(context.tryGet('key'), {
        found: scenarioCase.expected.found,
        value: scenarioCase.expected.value
      });
    });
    return;
  },

  'tryget-undefined': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const key = scopeString(scenarioCase, 'key');
    const scope = context.initialize({ [key]: undefined });
    scope.execute(() => {
      assert.deepStrictEqual(context.tryGet(key), { found: true, value: undefined });
    });
    return;
  },

  'get-throws': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    const key = scopeString(scenarioCase, 'key');
    scope.execute(() => {
      assert.throws(() => context.get(key), { message: scenarioCase.expected.message });
    });
    return;
  },

  'has-check': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    const key = scopeString(scenarioCase, 'key');
    scope.execute(() => {
      assert.strictEqual(context.has(key), scenarioCase.expected.result);
    });
    return;
  },

  'delete-removes': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    const key = scopeString(scenarioCase, 'key');
    scope.execute(() => {
      assert.strictEqual(context.has(key), true);
      assert.strictEqual(context.delete(key), scenarioCase.expected.removed);
      assert.strictEqual(context.has(key), false);
    });
    return;
  },

  'delete-missing': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    const key = scopeString(scenarioCase, 'key');
    scope.execute(() => {
      assert.strictEqual(context.delete(key), scenarioCase.expected.removed);
    });
    return;
  },

  'keys-returns': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.execute(() => {
      const keys = context.keys();
      assert.deepStrictEqual(keys.sort(), ['a', 'b', 'c']);
    });
    return;
  },

  'snapshot-copy': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.execute(() => {
      assert.deepStrictEqual(context.snapshot(), scenarioCase.expected.snapshot);
    });
    return;
  },

  'snapshot-independent': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.execute(() => {
      const snap = context.snapshot();
      context.set('key', scenarioCase.expected.current);
      assert.strictEqual(snap.key, scenarioCase.expected.snapshot);
      assert.strictEqual(context.get('key'), scenarioCase.expected.current);
    });
    return;
  },

  'is-active-outside': (scenarioCase) => {
    const context = createContext(scenarioCase);
    assert.strictEqual(context.isActive(), scenarioCase.expected.active);
    return;
  },

  'is-active-inside': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    let active = false;
    scope.execute(() => {
      active = context.isActive();
    });
    assert.strictEqual(active, scenarioCase.expected.active);
    return;
  },

  'outside-get-throws': (scenarioCase) => {
    const context = createContext(scenarioCase);
    assert.throws(() => context.get(scopeString(scenarioCase, 'key')), { message: scenarioCase.expected.message });
    return;
  },

  'outside-set-throws': (scenarioCase) => {
    const context = createContext(scenarioCase);
    assert.throws(
      () => context.set(scopeString(scenarioCase, 'key'), scopeInput(scenarioCase).value),
      { message: scenarioCase.expected.message }
    );
    return;
  },

  'outside-tryget': (scenarioCase) => {
    const context = createContext(scenarioCase);
    assert.deepStrictEqual(context.tryGet(scopeString(scenarioCase, 'key')), {
      found: scenarioCase.expected.found,
      value: undefined
    });
    return;
  },

  'lenient-read-accessors': (scenarioCase) => {
    const context = makeLenientContext(contextConfig(scenarioCase));
    assert.strictEqual('getStore' in context, false);
    assert.strictEqual(context.has('key'), scenarioCase.expected.has);
    assert.deepStrictEqual(context.keys(), scenarioCase.expected.keys);
    assert.deepStrictEqual(context.snapshot(), scenarioCase.expected.snapshot);
    return;
  },

  'lenient-set-no-leak': (scenarioCase) => {
    const context = makeLenientContext(contextConfig(scenarioCase));
    const key = scopeString(scenarioCase, 'key');
    context.set(key, scopeInput(scenarioCase).value);
    assert.strictEqual(context.has(key), scenarioCase.expected.has);
    return;
  },

  'lenient-delete-no-corruption': (scenarioCase) => {
    const context = makeLenientContext(contextConfig(scenarioCase));
    const key = scopeString(scenarioCase, 'key');
    assert.strictEqual(context.delete(key), scenarioCase.expected.removed);
    assert.strictEqual(context.has(key), scenarioCase.expected.has);
    assert.deepStrictEqual(context.keys(), scenarioCase.expected.keys);
    return;
  },

  'async-propagation': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    return scope.execute(async () => {
      await Promise.resolve();
      assert.strictEqual(context.get('requestId'), scenarioCase.expected.requestId);
      await setTimeout(10);
      assert.strictEqual(context.get('requestId'), scenarioCase.expected.requestId);
    });
  },

  'mutations-persist-async-chain': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    return scope.execute(async () => {
      context.set('step', 1);
      await Promise.resolve();
      assert.strictEqual(context.get('step'), 1);
      context.set('step', scenarioCase.expected.step);
      await Promise.resolve();
      assert.strictEqual(context.get('step'), scenarioCase.expected.step);
    });
  },

  'concurrent-isolation': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const results: string[] = [];
    const scope1 = context.initialize(scopeInitial(scenarioCase, 'initial1'));
    const scope2 = context.initialize(scopeInitial(scenarioCase, 'initial2'));
    const task1 = scope1.execute(async () => {
      await setTimeout(20);
      results.push(`task1: ${context.get('taskId')}`);
    });
    const task2 = scope2.execute(async () => {
      await setTimeout(10);
      results.push(`task2: ${context.get('taskId')}`);
    });
    return Promise.all([task1, task2]).then(() => {
      for (const result of expectedStringArray(scenarioCase, 'results')) {
        assert.ok(results.includes(result));
      }
    });
  },

  'concurrent-mutation-isolation': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope1 = context.initialize(scopeInitial(scenarioCase, 'initial1'));
    const scope2 = context.initialize(scopeInitial(scenarioCase, 'initial2'));
    return Promise.all([
      scope1.execute(async () => {
        await setTimeout(10);
        context.set('value', scenarioCase.expected.scope1);
        await setTimeout(20);
        assert.strictEqual(context.get('value'), scenarioCase.expected.scope1);
      }),
      scope2.execute(async () => {
        await setTimeout(20);
        assert.strictEqual(context.get('value'), scopeInitial(scenarioCase, 'initial2')?.value);
      })
    ]).then(() => {
      assert.strictEqual(scope1.terminate().value, scenarioCase.expected.scope1);
      assert.strictEqual(scope2.terminate().value, scenarioCase.expected.scope2);
    });
  },

  'concurrent-key-sets': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope1 = context.initialize(scopeInitial(scenarioCase, 'initial1'));
    const scope2 = context.initialize(scopeInitial(scenarioCase, 'initial2'));
    return Promise.all([
      scope1.execute(async () => {
        context.set('only1', 'value1');
        await setTimeout(10);
      }),
      scope2.execute(async () => {
        context.set('only2', 'value2');
        await setTimeout(10);
      })
    ]).then(() => {
      const final1 = scope1.terminate();
      const final2 = scope2.terminate();
      assert.ok('only1' in final1);
      assert.ok(!('only2' in final1));
      assert.ok('only2' in final2);
      assert.ok(!('only1' in final2));
    });
  },

  'nested-scope-isolation': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const outerScope = context.initialize(scopeInitial(scenarioCase, 'outer'));
    outerScope.execute(() => {
      assert.strictEqual(context.get('level'), scenarioCase.expected.outer);
      const innerScope = context.initialize(scopeInitial(scenarioCase, 'inner'));
      innerScope.execute(() => {
        assert.strictEqual(context.get('level'), scenarioCase.expected.inner);
      });
      assert.strictEqual(context.get('level'), scenarioCase.expected.outer);
    });
    return;
  },

  'inner-context-no-inherit': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const outerScope = context.initialize(scopeInitial(scenarioCase, 'outer'));
    outerScope.execute(() => {
      const innerScope = context.initialize();
      innerScope.execute(() => {
        assert.strictEqual(context.has('outerOnly'), scenarioCase.expected.hasOuterOnly);
      });
    });
    return;
  },

  'multiple-contexts': (scenarioCase) => {
    const first = multiContextInput(scenarioCase, 'first');
    const second = multiContextInput(scenarioCase, 'second');
    const context1 = Context.create(first.context);
    const context2 = Context.create(second.context);
    const scope1 = context1.initialize(first.initial);
    const scope2 = context2.initialize(second.initial);
    scope1.execute(() => {
      scope2.execute(() => {
        assert.strictEqual(context1.get('id'), scenarioCase.expected.context1);
        assert.strictEqual(context2.get('count'), scenarioCase.expected.context2);
      });
    });
    return;
  },

  'full-lifecycle': (scenarioCase) => {
    const context = createContext(scenarioCase);
    const scope = context.initialize(scopeInitial(scenarioCase));
    return scope.execute(async () => {
      context.set('statusCode', 200);
      context.set('result', 'success');
      await setTimeout(10);
      return scenarioCase.expected.result;
    }).then((result) => {
      assert.strictEqual(result, scenarioCase.expected.result);
      assert.deepStrictEqual(scope.terminate(), scenarioCase.expected.finalState);
      assert.throws(() => scope.execute(() => {}), {
        message: `${context.name} scope has been terminated`
      });
    });
  },

  'subclass-on-initialize': (scenarioCase) => {
    class SeededContext extends Context {
      protected override onInitialize(_initial: Record<string, unknown> | undefined, scope: ContextScopeInterface): void {
        scope.execute(() => {
          this.set('seeded', scenarioCase.expected.seeded);
        });
      }
    }
    const context = SeededContext.create(contextConfig(scenarioCase));
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.execute(() => {
      assert.strictEqual(context.get('seeded'), scenarioCase.expected.seeded);
    });
    return;
  },

  'subclass-on-initialize-with-caller': (scenarioCase) => {
    class SeededContext extends Context {
      protected override onInitialize(_initial: Record<string, unknown> | undefined, scope: ContextScopeInterface): void {
        scope.execute(() => {
          this.set('seeded', scenarioCase.expected.seeded);
        });
      }
    }
    const context = SeededContext.create(contextConfig(scenarioCase));
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.execute(() => {
      assert.strictEqual(context.get('seeded'), scenarioCase.expected.seeded);
      assert.strictEqual(context.get('caller'), scenarioCase.expected.caller);
    });
    return;
  },

  'subclass-on-set': (scenarioCase) => {
    const events: Array<{ key: string; value: unknown }> = [];
    class TracedContext extends Context {
      protected override onSet(key: string, value: unknown): void {
        events.push({ key, value });
      }
    }
    const context = TracedContext.create(contextConfig(scenarioCase));
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.execute(() => {
      context.set('a', 1);
      context.set('b', 'hello');
    });
    scope.terminate();
    assert.deepStrictEqual(events, scenarioCase.expected.events);
    return;
  },

  'subclass-on-get': (scenarioCase) => {
    const events: Array<{ key: string; value: unknown }> = [];
    class TracedContext extends Context {
      protected override onGet(key: string, value: unknown): void {
        events.push({ key, value });
      }
    }
    const context = TracedContext.create(contextConfig(scenarioCase));
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.execute(() => {
      context.get('x');
      context.get('x');
    });
    scope.terminate();
    assert.deepStrictEqual(events, scenarioCase.expected.events);
    return;
  },

  'subclass-on-delete': (scenarioCase) => {
    const events: Array<{ existed: boolean; key: string }> = [];
    class TracedContext extends Context {
      protected override onDelete(key: string, existed: boolean): void {
        events.push({ existed, key });
      }
    }
    const context = TracedContext.create(contextConfig(scenarioCase));
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.execute(() => {
      context.delete('toRemove');
      context.delete('missing');
    });
    scope.terminate();
    assert.deepStrictEqual(events, scenarioCase.expected.events);
    return;
  },

  'subclass-on-get-tryget': (scenarioCase) => {
    const events: string[] = [];
    class TracedContext extends Context {
      protected override onGet(key: string): void {
        events.push(key);
      }
    }
    const context = TracedContext.create(contextConfig(scenarioCase));
    const scope = context.initialize(scopeInitial(scenarioCase));
    scope.execute(() => {
      context.tryGet('k');
      context.tryGet('missing');
    });
    scope.terminate();
    assert.deepStrictEqual(events, scenarioCase.expected.events);
    return;
  },

  'throwing-on-initialize': (scenarioCase) => {
    class ThrowingInitializeContext extends Context {
      protected override onInitialize(): void {
        throw new Error(String(scenarioCase.expected.message));
      }
    }
    const context = ThrowingInitializeContext.create(contextConfig(scenarioCase));
    assert.throws(
      () => context.initialize(scopeInitial(scenarioCase)),
      (error: unknown) => error instanceof HookInvocationError && error.hookName === scenarioCase.expected.hookName
    );
    return;
  },

  'throwing-on-set': (scenarioCase) => {
    class ThrowingSetContext extends Context {
      protected override onSet(): void {
        throw new Error(String(scenarioCase.expected.message));
      }
    }
    const context = ThrowingSetContext.create(contextConfig(scenarioCase));
    const scope = context.initialize(scopeInitial(scenarioCase));
    const key = scopeString(scenarioCase, 'key');
    const value = scopeInput(scenarioCase).value;
    scope.execute(() => {
      assert.throws(
        () => context.set(key, value),
        (error: unknown) => error instanceof HookInvocationError && error.hookName === scenarioCase.expected.hookName
      );
      assert.strictEqual(context.get(key), value);
    });
    return;
  },

  'throwing-on-get': (scenarioCase) => {
    class ThrowingGetContext extends Context {
      protected override onGet(): void {
        throw new Error(String(scenarioCase.expected.message));
      }
    }
    const context = ThrowingGetContext.create(contextConfig(scenarioCase));
    const scope = context.initialize(scopeInitial(scenarioCase));
    const key = scopeString(scenarioCase, 'key');
    scope.execute(() => {
      assert.throws(
        () => context.get(key),
        (error: unknown) => error instanceof HookInvocationError && error.hookName === scenarioCase.expected.hookName
      );
    });
    return;
  },

  'throwing-on-delete': (scenarioCase) => {
    class ThrowingDeleteContext extends Context {
      protected override onDelete(): void {
        throw new Error(String(scenarioCase.expected.message));
      }
    }
    const context = ThrowingDeleteContext.create(contextConfig(scenarioCase));
    const scope = context.initialize(scopeInitial(scenarioCase));
    const key = scopeString(scenarioCase, 'key');
    scope.execute(() => {
      assert.throws(
        () => context.delete(key),
        (error: unknown) => error instanceof HookInvocationError && error.hookName === scenarioCase.expected.hookName
      );
      assert.strictEqual(context.has(key), false);
    });
    return;
  },

  'async-on-set-safe': (scenarioCase) => {
    class AsyncRejectingContext extends Context {
      protected override async onSet(): Promise<void> {
        await setTimeout(5);
        throw new Error('onSet boom');
      }
    }
    const unhandled: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { unhandled.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);
    return (async () => {
      try {
        const context = AsyncRejectingContext.create(contextConfig(scenarioCase));
        const scope = context.initialize(scopeInitial(scenarioCase));
        scope.execute(() => {
          context.set(scopeString(scenarioCase, 'key'), scopeInput(scenarioCase).value);
        });
        await setTimeout(20);
        assert.strictEqual(unhandled.length, scenarioCase.expected.unhandledRejections);
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
      }
    })();
  },

  'config-validation': (scenarioCase) => {
    assert.throws(
      () => Reflect.apply(Context.create, Context, [scenarioCase.input.context]),
      { message: scenarioCase.expected.message }
    );
    return;
  },
} satisfies Record<ScenarioShape, ScenarioRunner>;

function isScenarioShape(shape: string): shape is ScenarioShape {
  return Object.hasOwn(runnerMap, shape);
}

function runCase(scenarioCase: ScenarioCase): Promise<void> | void {
  const { shape } = scenarioCase;
  if (!isScenarioShape(shape)) {
    throw new TypeError(`Unsupported scenario shape: ${shape}`);
  }

  return runnerMap[shape](scenarioCase);
}

void describe('Context', () => {
  void beforeEach(() => {});
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
