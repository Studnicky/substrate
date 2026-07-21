/**
 * Context Unit Tests
 *
 * Tests Context functionality:
 * - Three-phase lifecycle: initialize → execute → terminate
 * - Dynamic key-value operations
 * - Async propagation
 * - Concurrent isolation
 * - Direct factory construction
 * - Subclass extension via protected hooks
 */

import {
  deepStrictEqual, ok, strictEqual, throws
} from 'node:assert/strict';
import {
  describe, it
} from 'node:test';
import { setTimeout } from 'node:timers/promises';

import { HookInvocationError } from '@studnicky/errors';

import { Context } from '../../../src/context/index.js';
import type { ContextScopeInterface } from '../../../src/interfaces/index.js';

void describe('Context', () => {
  void describe('factory construction', () => {
    void it('creates a context with static create()', () => {
      const context = Context.create({ name: 'test' });

      strictEqual(context.name, 'test');
    });

    const invalidNameScenarios: Array<{ description: string; config: unknown }> = [
      {
        description: 'create() throws when name is empty string',
        config: { name: '' }
      },
      {
        description: 'create() throws when name is not a string',
        config: { name: 0 }
      }
    ];

    for (const { description, config } of invalidNameScenarios) {
      void it(description, () => {
        throws(
          () => {
            return Reflect.apply(Context.create, Context, [config]);
          },
          { message: 'invalid Context config' }
        );
      });
    }
  });

  void describe('initialize', () => {
    void it('returns a ContextScope', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize();

      strictEqual(typeof scope.execute, 'function');
      strictEqual(typeof scope.terminate, 'function');
    });

    void it('initializes with empty store when no initial values', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize();

      scope.execute(() => {
        strictEqual(context.keys().length, 0);
      });
    });

    void it('initializes with provided values', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({
        requestId: '123',
        value: 42
      });

      scope.execute(() => {
        strictEqual(context.get('requestId'), '123');
        strictEqual(context.get('value'), 42);
      });
    });
  });

  void describe('execute', () => {
    void it('runs callback within context', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ key: 'value' });

      scope.execute(() => {
        strictEqual(context.get('key'), 'value');
      });
    });

    void it('returns callback result', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ value: 5 });

      const result = scope.execute(() => {
        const value = context.get('value');
        if (typeof value !== 'number') { throw new TypeError('Expected numeric context value'); }
        return value * 2;
      });

      strictEqual(result, 10);
    });

    void it('returns async callback result', async () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ value: 7 });

      const result = await scope.execute(async () => {
        await Promise.resolve();

        const value = context.get('value');
        if (typeof value !== 'number') { throw new TypeError('Expected numeric context value'); }
        return value * 3;
      });

      strictEqual(result, 21);
    });

    void it('allows multiple execute calls on same scope', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ count: 0 });

      scope.execute(() => {
        const count = context.get('count');
        if (typeof count !== 'number') { throw new TypeError('Expected numeric context count'); }
        context.set('count', count + 1);
      });

      scope.execute(() => {
        const count = context.get('count');
        if (typeof count !== 'number') { throw new TypeError('Expected numeric context count'); }
        context.set('count', count + 1);
      });

      const finalState = scope.terminate();

      strictEqual(finalState.count, 2);
    });

    void it('throws after scope terminated', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize();

      scope.terminate();

      throws(
        () => {
          return scope.execute(() => {
            // Intentionally empty - testing that terminated scope throws
          });
        },
        { message: 'test scope has been terminated' }
      );
    });
  });

  void describe('terminate', () => {
    void it('returns snapshot of all values', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ requestId: '123' });

      scope.execute(() => {
        context.set('statusCode', 200);
        context.set('result', 'success');
      });

      const finalState = scope.terminate();

      deepStrictEqual(finalState, {
        requestId: '123',
        result: 'success',
        statusCode: 200
      });
    });

    void it('clears store after terminate', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ key: 'value' });

      const state1 = scope.terminate();

      strictEqual(state1.key, 'value');

      // Second terminate should throw
      throws(
        () => {
          return scope.terminate();
        },
        { message: 'test scope has already been terminated' }
      );
    });

    void it('throws if called twice', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize();

      scope.terminate();

      throws(
        () => {
          return scope.terminate();
        },
        { message: 'test scope has already been terminated' }
      );
    });
  });

  void describe('get/set operations', () => {
    const setGetScenarios: Array<{
      description: string;
      initial: Record<string, unknown>;
      run: (context: Context) => void;
    }> = [
      {
        description: 'set() adds values to the store',
        initial: {},
        run: (context) => {
          context.set('key', 'value');
          strictEqual(context.get('key'), 'value');
        }
      },
      {
        description: 'set() overwrites existing values',
        initial: { key: 'original' },
        run: (context) => {
          context.set('key', 'updated');
          strictEqual(context.get('key'), 'updated');
        }
      },
      {
        description: 'tryGet() reports a missing key',
        initial: {},
        run: (context) => {
          deepStrictEqual(context.tryGet('nonexistent'), { 'found': false, 'value': undefined });
        }
      },
      {
        description: 'tryGet() reports a present value',
        initial: { key: 'value' },
        run: (context) => {
          deepStrictEqual(context.tryGet('key'), { 'found': true, 'value': 'value' });
        }
      },
      {
        description: 'tryGet() distinguishes a stored undefined value from an absent key',
        initial: { key: undefined },
        run: (context) => {
          deepStrictEqual(context.tryGet('key'), { 'found': true, 'value': undefined });
        }
      }
    ];

    for (const { description, initial, run } of setGetScenarios) {
      void it(description, () => {
        const context = Context.create({ name: 'test' });
        const scope = context.initialize(initial);

        scope.execute(() => {
          run(context);
        });
      });
    }

    void it('get() throws when key not found', () => {
      const context = Context.create({ name: 'my-context' });
      const scope = context.initialize();

      scope.execute(() => {
        throws(
          () => {
            return context.get('nonexistent');
          },
          { message: "Key 'nonexistent' not found in my-context context" }
        );
      });
    });
  });

  void describe('has/delete/keys operations', () => {
    const hasScenarios: Array<{
      description: string;
      initial: Record<string, unknown>;
      key: string;
      expected: boolean;
    }> = [
      {
        description: 'has() returns false for missing keys',
        initial: {},
        key: 'missing',
        expected: false
      },
      {
        description: 'has() returns true for existing keys',
        initial: { exists: true },
        key: 'exists',
        expected: true
      }
    ];

    for (const { description, initial, key, expected } of hasScenarios) {
      void it(description, () => {
        const context = Context.create({ name: 'test' });
        const scope = context.initialize(initial);

        scope.execute(() => {
          strictEqual(context.has(key), expected);
        });
      });
    }

    void it('delete() removes keys', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ key: 'value' });

      scope.execute(() => {
        strictEqual(context.has('key'), true);

        const deleted = context.delete('key');

        strictEqual(deleted, true);
        strictEqual(context.has('key'), false);
      });
    });

    void it('delete() returns false for missing keys', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize();

      scope.execute(() => {
        strictEqual(context.delete('missing'), false);
      });
    });

    void it('keys() returns all keys', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({
        a: 1,
        b: 2,
        c: 3
      });

      scope.execute(() => {
        const allKeys = context.keys();

        strictEqual(allKeys.length, 3);
        ok(allKeys.includes('a'));
        ok(allKeys.includes('b'));
        ok(allKeys.includes('c'));
      });
    });
  });

  void describe('snapshot', () => {
    void it('returns a copy of all data', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({
        requestId: '123',
        value: 42
      });

      scope.execute(() => {
        const snap = context.snapshot();

        deepStrictEqual(snap, {
          requestId: '123',
          value: 42
        });
      });
    });

    void it('snapshot is independent of context', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ key: 'original' });

      scope.execute(() => {
        const snap = context.snapshot();

        context.set('key', 'modified');
        strictEqual(snap.key, 'original');
        strictEqual(context.get('key'), 'modified');
      });
    });
  });

  void describe('isActive', () => {
    const isActiveScenarios: Array<{
      description: string;
      run: () => boolean;
      expected: boolean;
    }> = [
      {
        description: 'returns false outside execute()',
        run: () => {
          const context = Context.create({ name: 'test' });

          return context.isActive();
        },
        expected: false
      },
      {
        description: 'returns true within execute()',
        run: () => {
          const context = Context.create({ name: 'test' });
          const scope = context.initialize();
          let active = false;

          scope.execute(() => {
            active = context.isActive();
          });

          return active;
        },
        expected: true
      }
    ];

    for (const { description, run, expected } of isActiveScenarios) {
      void it(description, () => {
        strictEqual(run(), expected);
      });
    }
  });

  void describe('error handling outside context', () => {
    const outsideContextScenarios: Array<{
      description: string;
      throws: boolean;
      run: (context: Context) => unknown;
      expected?: { message: string };
    }> = [
      {
        description: 'get() throws outside execute()',
        throws: true,
        run: (context) => context.get('key'),
        expected: { message: 'No active my-context context - ensure code runs within execute()' }
      },
      {
        description: 'set() throws outside execute()',
        throws: true,
        run: (context) => context.set('key', 'value'),
        expected: { message: 'No active my-context context - ensure code runs within execute()' }
      },
      {
        description: 'tryGet() reports absence outside execute()',
        throws: false,
        run: (context) => {
          deepStrictEqual(context.tryGet('key'), { 'found': false, 'value': undefined });
        }
      }
    ];

    for (const scenario of outsideContextScenarios) {
      void it(scenario.description, () => {
        const context = Context.create({ name: 'my-context' });

        if (scenario.throws) {
          throws(() => scenario.run(context), scenario.expected);
        } else {
          strictEqual(scenario.run(context), undefined);
        }
      });
    }
  });

  void describe('lenient mode (onMissingContext)', () => {
    class LenientContext extends Context {
      protected override onMissingContext(): boolean {
        return true;
      }
    }

    void it('does not expose the internal store through the subclass surface', () => {
      const context = LenientContext.create({ name: 'lenient' });

      strictEqual('getStore' in context, false);
    });

    void it('read accessors do not throw and reflect an empty store outside an active context', () => {
      const context = LenientContext.create({ name: 'lenient' });

      strictEqual(context.has('key'), false);
      deepStrictEqual(context.keys(), []);
      deepStrictEqual(context.snapshot(), {});
    });

    void it('set() outside an active context does not leak into later reads', () => {
      const context = LenientContext.create({ name: 'lenient' });

      context.set('key', 'value');

      strictEqual(context.has('key'), false);
    });

    void it('delete() outside an active context does not corrupt the shared empty store', () => {
      const context = LenientContext.create({ name: 'lenient' });

      strictEqual(context.delete('key'), false);
      strictEqual(context.has('key'), false);
      deepStrictEqual(context.keys(), []);
    });
  });

  void describe('async propagation', () => {
    void it('propagates context through async operations', async () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ requestId: 'async-test' });

      await scope.execute(async () => {
        await Promise.resolve();
        strictEqual(context.get('requestId'), 'async-test');

        await setTimeout(10);
        strictEqual(context.get('requestId'), 'async-test');
      });
    });

    void it('mutations persist through async chain', async () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize();

      await scope.execute(async () => {
        context.set('step', 1);

        await Promise.resolve();
        strictEqual(context.get('step'), 1);
        context.set('step', 2);

        await Promise.resolve();
        strictEqual(context.get('step'), 2);
      });
    });
  });

  void describe('concurrent isolation', () => {
    void it('isolates concurrent contexts', async () => {
      const context = Context.create({ name: 'test' });
      const results: string[] = [];

      const scope1 = context.initialize({ taskId: 'task-1' });
      const scope2 = context.initialize({ taskId: 'task-2' });

      const task1 = scope1.execute(async () => {
        await setTimeout(20);
        results.push(`task1: ${context.get('taskId')}`);
      });

      const task2 = scope2.execute(async () => {
        await setTimeout(10);
        results.push(`task2: ${context.get('taskId')}`);
      });

      await Promise.all([
        task1,
        task2
      ]);

      ok(results.includes('task1: task-1'));
      ok(results.includes('task2: task-2'));
    });

    void it('mutations in one context do not affect another', async () => {
      const context = Context.create({ name: 'test' });

      const scope1 = context.initialize({ value: 100 });
      const scope2 = context.initialize({ value: 100 });

      const task1 = scope1.execute(async () => {
        await setTimeout(10);
        context.set('value', 200);
        await setTimeout(20);

        return context.get('value');
      });

      const task2 = scope2.execute(async () => {
        await setTimeout(20);

        return context.get('value');
      });

      const [
        result1,
        result2
      ] = await Promise.all([
        task1,
        task2
      ]);

      strictEqual(result1, 200);
      strictEqual(result2, 100);
    });
  });

  void describe('nested contexts', () => {
    void it('nested scopes create isolated inner context', () => {
      const context = Context.create({ name: 'test' });
      const outerScope = context.initialize({ level: 'outer' });

      outerScope.execute(() => {
        strictEqual(context.get('level'), 'outer');

        const innerScope = context.initialize({ level: 'inner' });

        innerScope.execute(() => {
          strictEqual(context.get('level'), 'inner');
        });

        strictEqual(context.get('level'), 'outer');
      });
    });

    void it('inner context does not inherit outer values', () => {
      const context = Context.create({ name: 'test' });
      const outerScope = context.initialize({ outerOnly: true });

      outerScope.execute(() => {
        const innerScope = context.initialize();

        innerScope.execute(() => {
          strictEqual(context.has('outerOnly'), false);
        });
      });
    });
  });

  void describe('multiple contexts', () => {
    void it('supports multiple independent contexts', () => {
      const context1 = Context.create({ name: 'context1' });
      const context2 = Context.create({ name: 'context2' });

      const scope1 = context1.initialize({ id: 'first' });
      const scope2 = context2.initialize({ count: 42 });

      scope1.execute(() => {
        scope2.execute(() => {
          strictEqual(context1.get('id'), 'first');
          strictEqual(context2.get('count'), 42);
        });
      });
    });
  });

  void describe('full lifecycle', () => {
    void it('complete initialize → execute → terminate flow', async () => {
      const context = Context.create({ name: 'request' });

      // Initialize
      const scope = context.initialize({
        logger: { name: 'test-logger' },
        requestId: 'req-123'
      });

      // Execute
      const result = await scope.execute(async () => {
        context.set('statusCode', 200);
        context.set('result', 'success');
        await setTimeout(10);

        return 'done';
      });

      strictEqual(result, 'done');

      // Terminate
      const finalState = scope.terminate();

      deepStrictEqual(finalState, {
        logger: { name: 'test-logger' },
        requestId: 'req-123',
        result: 'success',
        statusCode: 200
      });

      // Verify scope is terminated
      throws(
        () => {
          return scope.execute(() => {
            // Intentionally empty - testing that terminated scope throws
          });
        },
        { message: 'request scope has been terminated' }
      );
    });
  });

  void describe('subclass extension', () => {
    void it('SeededContext.onInitialize seeds a default key', () => {
      class SeededContext extends Context {
        protected override onInitialize(
          _initial: Record<string, unknown> | undefined,
          scope: ContextScopeInterface
        ): void {
          scope.execute(() => {
            this.set('seeded', 'default-value');
          });
        }
      }

      const context = SeededContext.create({ name: 'seeded' });
      const scope = context.initialize();

      scope.execute(() => {
        strictEqual(context.get('seeded'), 'default-value');
      });
    });

    void it('SeededContext seeds key alongside caller-provided initial values', () => {
      class SeededContext extends Context {
        protected override onInitialize(
          _initial: Record<string, unknown> | undefined,
          scope: ContextScopeInterface
        ): void {
          scope.execute(() => {
            this.set('seeded', 'default-value');
          });
        }
      }

      const context = SeededContext.create({ name: 'seeded' });
      const scope = context.initialize({ caller: 'provided' });

      scope.execute(() => {
        strictEqual(context.get('seeded'), 'default-value');
        strictEqual(context.get('caller'), 'provided');
      });
    });

    void it('onSet fires after set() with key and value', () => {
      const events: { 'key': string; 'value': unknown }[] = [];
      class TracedContext extends Context {
        protected override onSet(key: string, value: unknown): void {
          events.push({ 'key': key, 'value': value });
        }
      }
      const context = TracedContext.create({ 'name': 'traced' });
      const scope = context.initialize();
      scope.execute(() => {
        context.set('a', 1);
        context.set('b', 'hello');
      });
      scope.terminate();
      strictEqual(events.length, 2);
      strictEqual(events[0]!.key, 'a');
      strictEqual(events[0]!.value, 1);
      strictEqual(events[1]!.key, 'b');
      strictEqual(events[1]!.value, 'hello');
    });

    void it('onGet fires after get() with key and value', () => {
      const events: { 'key': string; 'value': unknown }[] = [];
      class TracedContext extends Context {
        protected override onGet(key: string, value: unknown): void {
          events.push({ 'key': key, 'value': value });
        }
      }
      const context = TracedContext.create({ 'name': 'traced' });
      const scope = context.initialize({ 'x': 42 });
      scope.execute(() => {
        context.get('x');
        context.get('x');
      });
      scope.terminate();
      strictEqual(events.length, 2);
      strictEqual(events[0]!.key, 'x');
      strictEqual(events[0]!.value, 42);
    });

    void it('onDelete fires after delete() with key and existence flag', () => {
      const events: { 'existed': boolean; 'key': string }[] = [];
      class TracedContext extends Context {
        protected override onDelete(key: string, existed: boolean): void {
          events.push({ 'existed': existed, 'key': key });
        }
      }
      const context = TracedContext.create({ 'name': 'traced' });
      const scope = context.initialize({ 'toRemove': 'yes' });
      scope.execute(() => {
        context.delete('toRemove');
        context.delete('missing');
      });
      scope.terminate();
      strictEqual(events.length, 2);
      strictEqual(events[0]!.key, 'toRemove');
      strictEqual(events[0]!.existed, true);
      strictEqual(events[1]!.key, 'missing');
      strictEqual(events[1]!.existed, false);
    });

    void it('onGet does not fire for tryGet', () => {
      const events: string[] = [];
      class TracedContext extends Context {
        protected override onGet(key: string): void {
          events.push(key);
        }
      }
      const context = TracedContext.create({ 'name': 'traced' });
      const scope = context.initialize({ 'k': 1 });
      scope.execute(() => {
        context.tryGet('k');
        context.tryGet('missing');
      });
      scope.terminate();
      strictEqual(events.length, 0);
    });

    void it('a throwing onInitialize hook surfaces a HookInvocationError', () => {
      class ThrowingInitializeContext extends Context {
        protected override onInitialize(): void {
          throw new Error('onInitialize boom');
        }
      }

      const context = ThrowingInitializeContext.create({ 'name': 'throwing-init' });
      let caught: unknown;

      try {
        context.initialize({ 'seed': 1 });
      } catch (error) {
        caught = error;
      }

      if (!(caught instanceof HookInvocationError)) { throw new TypeError('Expected HookInvocationError'); }
      strictEqual(caught.hookName, 'onInitialize');
    });

    void it('a throwing onSet hook surfaces a HookInvocationError after the value has already been stored', () => {
      class ThrowingSetContext extends Context {
        protected override onSet(): void {
          throw new Error('onSet boom');
        }
      }

      const context = ThrowingSetContext.create({ 'name': 'throwing-set' });
      const scope = context.initialize();

      scope.execute(() => {
        let caught: unknown;

        try {
          context.set('key', 'value');
        } catch (error) {
          caught = error;
        }

        if (!(caught instanceof HookInvocationError)) { throw new TypeError('Expected HookInvocationError'); }
        strictEqual(caught.hookName, 'onSet');
        strictEqual(context.get('key'), 'value');
      });
    });

    void it('a throwing onGet hook surfaces a HookInvocationError', () => {
      class ThrowingGetContext extends Context {
        protected override onGet(): void {
          throw new Error('onGet boom');
        }
      }

      const context = ThrowingGetContext.create({ 'name': 'throwing-get' });
      const scope = context.initialize({ 'key': 'value' });

      scope.execute(() => {
        let caught: unknown;

        try {
          context.get('key');
        } catch (error) {
          caught = error;
        }

        if (!(caught instanceof HookInvocationError)) { throw new TypeError('Expected HookInvocationError'); }
        strictEqual(caught.hookName, 'onGet');
      });
    });

    void it('a throwing onDelete hook surfaces a HookInvocationError after the key has already been removed', () => {
      class ThrowingDeleteContext extends Context {
        protected override onDelete(): void {
          throw new Error('onDelete boom');
        }
      }

      const context = ThrowingDeleteContext.create({ 'name': 'throwing-delete' });
      const scope = context.initialize({ 'key': 'value' });

      scope.execute(() => {
        let caught: unknown;

        try {
          context.delete('key');
        } catch (error) {
          caught = error;
        }

        if (!(caught instanceof HookInvocationError)) { throw new TypeError('Expected HookInvocationError'); }
        strictEqual(caught.hookName, 'onDelete');
        strictEqual(context.has('key'), false);
      });
    });
  });

  void describe('async hook safety (HookInvoker regression)', () => {
    void it('an async onSet override that rejects is routed through onHookError, not left as an unhandled rejection', async () => {
      class AsyncRejectingContext extends Context {
        protected override async onSet(_key: string, _value: unknown): Promise<void> {
          await setTimeout(5);
          throw new Error('onSet boom');
        }
      }

      const unhandled: unknown[] = [];
      const onUnhandledRejection = (reason: unknown): void => { unhandled.push(reason); };
      process.on('unhandledRejection', onUnhandledRejection);

      try {
        const context = AsyncRejectingContext.create({ name: 'async-set' });
        const scope = context.initialize();

        scope.execute(() => {
          // `hooks.invoke` is fired without being awaited by `set()` itself —
          // this call must not throw synchronously and must not leak an
          // unhandled rejection once the override's promise settles.
          context.set('key', 'value');
        });

        // Give the rejected hook promise time to settle and, if the fix
        // regressed, time for the unhandled rejection to surface.
        await setTimeout(20);

        strictEqual(unhandled.length, 0);
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
      }
    });
  });

  void describe('config validation', () => {
    void it('create() throws when config has unknown properties', () => {
      throws(
        () => {
          return Reflect.apply(Context.create, Context, [{ 'extra': 1, 'name': 'x' }]);
        },
        { message: 'invalid Context config' }
      );
    });
  });
});
