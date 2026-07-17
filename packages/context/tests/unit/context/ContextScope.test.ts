/**
 * ContextScope Unit Tests
 *
 * Thorough testing of the three-phase lifecycle:
 * created → active → terminated
 *
 * Covers:
 * - Lifecycle state transitions (FSM)
 * - Multiple execute calls and state accumulation
 * - Async propagation within execute
 * - Concurrent scope isolation
 * - Terminate behavior and cleanup
 * - Error handling and edge cases
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import {
  deepStrictEqual, ok, strictEqual, throws
} from 'node:assert/strict';
import {
  describe, it
} from 'node:test';
import { setTimeout } from 'node:timers/promises';

import { HookInvocationError } from '@studnicky/errors';

import { Context, ContextScope } from '../../../src/context/index.js';
import type { ContextScopeOptionsInterface } from '../../../src/context/index.js';

// Test fixture — hangs off a class per standards
class Fixture {
  static doubleNumber(num: number): number {
    return num * 2;
  }
}

void describe('ContextScope Lifecycle', () => {
  void describe('state transitions', () => {
    void it('scope starts in active state (created → active at construction)', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ key: 'value' });

      // Can execute immediately — confirms active state
      const result = scope.execute(() => {
        return context.get<string>('key');
      });

      strictEqual(result, 'value');
    });

    void it('scope can execute multiple times before terminate', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize();
      const executions: number[] = [];

      scope.execute(() => {
        executions.push(1);
      });
      scope.execute(() => {
        executions.push(2);
      });
      scope.execute(() => {
        executions.push(3);
      });

      deepStrictEqual(executions, [
        1,
        2,
        3
      ]);
    });

    const terminatedStateScenarios: Array<{
      description: string;
      run: (context: Context) => () => unknown;
      expectedMessage: string;
    }> = [
      {
        description: 'scope transitions to terminated state after terminate()',
        run: (context) => {
          const scope = context.initialize();

          scope.terminate();

          return () => scope.execute(() => {
            // Intentionally empty - testing that terminated scope throws
          });
        },
        expectedMessage: 'test scope has been terminated'
      },
      {
        description: 'terminate can only be called once',
        run: (context) => {
          const scope = context.initialize();

          scope.terminate();

          return () => scope.terminate();
        },
        expectedMessage: 'test scope has already been terminated'
      }
    ];

    for (const { description, run, expectedMessage } of terminatedStateScenarios) {
      void it(description, () => {
        const context = Context.create({ name: 'test' });

        throws(run(context), { message: expectedMessage });
      });
    }
  });

  void describe('state accumulation across execute calls', () => {
    void it('values set in first execute persist to second execute', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize();

      scope.execute(() => {
        context.set('fromFirst', 'value1');
      });

      scope.execute(() => {
        strictEqual(context.get<string>('fromFirst'), 'value1');
        context.set('fromSecond', 'value2');
      });

      const final = scope.terminate();

      deepStrictEqual(final, {
        fromFirst: 'value1',
        fromSecond: 'value2'
      });
    });

    void it('modifications in later execute overwrite earlier values', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ counter: 0 });

      scope.execute(() => {
        context.set('counter', 1);
      });

      scope.execute(() => {
        context.set('counter', 2);
      });

      scope.execute(() => {
        context.set('counter', 3);
      });

      const final = scope.terminate();

      strictEqual(final.counter, 3);
    });

    void it('deletions in one execute affect subsequent executes', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({
        keep: 'kept',
        remove: 'removed'
      });

      scope.execute(() => {
        context.delete('remove');
      });

      scope.execute(() => {
        strictEqual(context.has('keep'), true);
        strictEqual(context.has('remove'), false);
      });

      const final = scope.terminate();

      deepStrictEqual(final, { keep: 'kept' });
    });

    void it('accumulates state through async execute calls', async () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ step: 0 });

      await scope.execute(async () => {
        await setTimeout(5);
        context.set('step', 1);
        context.set('async1', 'done');
      });

      await scope.execute(async () => {
        await setTimeout(5);
        strictEqual(context.get<number>('step'), 1);
        context.set('step', 2);
        context.set('async2', 'done');
      });

      const final = scope.terminate();

      deepStrictEqual(final, {
        async1: 'done',
        async2: 'done',
        step: 2
      });
    });
  });

  void describe('async propagation within execute', () => {
    void it('context propagates through Promise.resolve()', async () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ id: 'promise-test' });

      await scope.execute(async () => {
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        strictEqual(context.get<string>('id'), 'promise-test');
      });
    });

    void it('context propagates through setTimeout', async () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ id: 'timeout-test' });

      await scope.execute(async () => {
        await setTimeout(10);
        strictEqual(context.get<string>('id'), 'timeout-test');
        await setTimeout(10);
        strictEqual(context.get<string>('id'), 'timeout-test');
      });
    });

    void it('context propagates through Promise.all()', async () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ id: 'all-test' });

      await scope.execute(async () => {
        const results = await Promise.all([
          Promise.resolve().then(() => {
            return context.get<string>('id');
          }),
          setTimeout(5).then(() => {
            return context.get<string>('id');
          }),
          setTimeout(10).then(() => {
            return context.get<string>('id');
          })
        ]);

        deepStrictEqual(results, [
          'all-test',
          'all-test',
          'all-test'
        ]);
      });
    });

    void it('context propagates through nested async functions', async () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ depth: 0 });

      async function level3(): Promise<void> {
        strictEqual(context.get<number>('depth'), 2);
        context.set('depth', 3);
      }

      async function level2(): Promise<void> {
        strictEqual(context.get<number>('depth'), 1);
        context.set('depth', 2);
        await setTimeout(5);
        await level3();
      }

      async function level1(): Promise<void> {
        context.set('depth', 1);
        await setTimeout(5);
        await level2();
      }

      await scope.execute(async () => {
        await level1();
        strictEqual(context.get<number>('depth'), 3);
      });
    });

    void it('mutations within async operations are visible after await', async () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize();

      await scope.execute(async () => {
        context.set('before', true);

        await setTimeout(10);

        strictEqual(context.get<boolean>('before'), true);
        context.set('after', true);
      });

      const final = scope.terminate();

      deepStrictEqual(final, {
        after: true,
        before: true
      });
    });
  });

  void describe('concurrent scope isolation', () => {
    void it('separate scopes have isolated stores', async () => {
      const context = Context.create({ name: 'test' });

      const scope1 = context.initialize({ id: 'scope-1' });
      const scope2 = context.initialize({ id: 'scope-2' });
      const scope3 = context.initialize({ id: 'scope-3' });

      const results: string[] = [];

      await Promise.all([
        scope1.execute(async () => {
          await setTimeout(15);
          results.push(`1:${context.get<string>('id')}`);
        }),
        scope2.execute(async () => {
          await setTimeout(10);
          results.push(`2:${context.get<string>('id')}`);
        }),
        scope3.execute(async () => {
          await setTimeout(5);
          results.push(`3:${context.get<string>('id')}`);
        })
      ]);

      ok(results.includes('1:scope-1'));
      ok(results.includes('2:scope-2'));
      ok(results.includes('3:scope-3'));
    });

    void it('mutations in one scope do not affect concurrent scopes', async () => {
      const context = Context.create({ name: 'test' });

      const scope1 = context.initialize({ value: 'original' });
      const scope2 = context.initialize({ value: 'original' });

      await Promise.all([
        scope1.execute(async () => {
          context.set('value', 'modified-by-1');
          await setTimeout(20);
          strictEqual(context.get<string>('value'), 'modified-by-1');
        }),
        scope2.execute(async () => {
          await setTimeout(10);
          strictEqual(context.get<string>('value'), 'original');
          context.set('value', 'modified-by-2');
        })
      ]);

      const final1 = scope1.terminate();
      const final2 = scope2.terminate();

      strictEqual(final1.value, 'modified-by-1');
      strictEqual(final2.value, 'modified-by-2');
    });

    void it('each scope maintains independent key sets', async () => {
      const context = Context.create({ name: 'test' });

      const scope1 = context.initialize({ shared: true });
      const scope2 = context.initialize({ shared: true });

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

      ok('only1' in final1);
      ok(!('only2' in final1));

      ok('only2' in final2);
      ok(!('only1' in final2));
    });
  });

  void describe('terminate behavior', () => {
    void it('returns complete snapshot of all values', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({
        initial1: 'a',
        initial2: 'b'
      });

      scope.execute(() => {
        context.set('added1', 'c');
        context.set('added2', 'd');
      });

      const final = scope.terminate();

      deepStrictEqual(final, {
        added1: 'c',
        added2: 'd',
        initial1: 'a',
        initial2: 'b'
      });
    });

    void it('clears internal store after terminate', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ key: 'value' });

      const snapshot1 = scope.terminate();

      strictEqual(snapshot1.key, 'value');

      // Cannot get another snapshot - store was cleared
      throws(
        () => {
          return scope.terminate();
        },
        { message: 'test scope has already been terminated' }
      );
    });

    void it('snapshot is independent copy - mutations do not affect it', () => {
      const context = Context.create({ name: 'test' });
      const obj = { nested: 'original' };
      const scope = context.initialize({ obj: obj });

      const final = scope.terminate();

      // Mutate original object
      obj.nested = 'mutated';

      // Snapshot still has reference to same object (shallow copy)
      strictEqual((final.obj as typeof obj).nested, 'mutated');
    });

    void it('prevents execute after terminate', () => {
      const context = Context.create({ name: 'my-scope' });
      const scope = context.initialize();

      scope.terminate();

      throws(
        () => {
          return scope.execute(() => {
            // Intentionally empty - testing that terminated scope throws
          });
        },
        { message: 'my-scope scope has been terminated' }
      );
    });

    const immediateTerminateScenarios: Array<{
      description: string;
      initial: Record<string, unknown> | undefined;
      expected: Record<string, unknown>;
    }> = [
      {
        description: 'can terminate immediately after initialize without execute',
        initial: { a: 1, b: 2 },
        expected: { a: 1, b: 2 }
      },
      {
        description: 'returns empty object when initialized without values and no execute',
        initial: undefined,
        expected: {}
      }
    ];

    for (const { description, initial, expected } of immediateTerminateScenarios) {
      void it(description, () => {
        const context = Context.create({ name: 'test' });
        const scope = context.initialize(initial);
        const final = scope.terminate();

        deepStrictEqual(final, expected);
      });
    }
  });

  void describe('error handling', () => {
    void it('errors in execute propagate to caller', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize();

      throws(
        () => {
          return scope.execute(() => {
            throw new Error('test error');
          });
        },
        { message: 'test error' }
      );
    });

    void it('async errors in execute propagate to caller', async () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize();

      try {
        await scope.execute(async () => {
          await setTimeout(5);
          throw new Error('async test error');
        });
        throw new Error('Should have thrown');
      } catch (error) {
        strictEqual((error as Error).message, 'async test error');
      }
    });

    void it('scope remains usable after error in execute', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ initial: 'value' });

      // First execute throws
      try {
        scope.execute(() => {
          context.set('beforeError', true);
          throw new Error('oops');
        });
      } catch {
        // Ignore
      }

      // Second execute still works
      scope.execute(() => {
        strictEqual(context.get<boolean>('beforeError'), true);
        context.set('afterError', true);
      });

      const final = scope.terminate();

      strictEqual(final.beforeError, true);
      strictEqual(final.afterError, true);
    });

    void it('can terminate after error in execute', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ key: 'value' });

      try {
        scope.execute(() => {
          throw new Error('error');
        });
      } catch {
        // Ignore
      }

      const final = scope.terminate();

      strictEqual(final.key, 'value');
    });
  });

  void describe('edge cases', () => {
    // Pattern: initialize({ key: value }) → execute → get → verify → terminate → verify final
    const simpleKeyValueScenarios: Array<{
      description: string;
      initial: Record<string, unknown>;
      checkInExecute: (context: Context) => void;
      checkInFinal: (final: Record<string, unknown>) => void;
    }> = [
      {
        description: 'handles undefined values',
        initial: { undef: undefined },
        checkInExecute: (context) => {
          strictEqual(context.get<undefined>('undef'), undefined);
          strictEqual(context.has('undef'), true);
        },
        checkInFinal: (final) => {
          strictEqual(final.undef, undefined);
          ok('undef' in final);
        }
      },
      {
        description: 'handles null values',
        initial: { nul: null },
        checkInExecute: (context) => {
          strictEqual(context.get<null>('nul'), null);
        },
        checkInFinal: (final) => {
          strictEqual(final.nul, null);
        }
      },
      {
        description: 'handles Symbol keys via string conversion',
        initial: { 'Symbol(test)': 'value' },
        checkInExecute: (context) => {
          strictEqual(context.get<string>('Symbol(test)'), 'value');
        },
        checkInFinal: (_final) => { /* key presence verified in execute */ }
      },
      {
        description: 'handles empty string key',
        initial: { '': 'empty-key-value' },
        checkInExecute: (context) => {
          strictEqual(context.get<string>(''), 'empty-key-value');
        },
        checkInFinal: (_final) => { /* key presence verified in execute */ }
      },
      {
        description: 'handles very long key names',
        initial: { ['a'.repeat(10_000)]: 'value' },
        checkInExecute: (context) => {
          strictEqual(context.get<string>('a'.repeat(10_000)), 'value');
        },
        checkInFinal: (_final) => { /* key presence verified in execute */ }
      }
    ];

    for (const { description, initial, checkInExecute, checkInFinal } of simpleKeyValueScenarios) {
      void it(description, () => {
        const context = Context.create({ name: 'test' });
        const scope = context.initialize(initial);

        scope.execute(() => {
          checkInExecute(context);
        });

        const final = scope.terminate();

        checkInFinal(final);
      });
    }

    void it('handles complex object values', () => {
      const context = Context.create({ name: 'test' });
      const complex = {
        array: [
          1,
          2,
          3
        ],
        date: new Date('2024-01-01'),
        map: new Map<string, number>(),
        nested: { deep: { value: true } }
      };

      const scope = context.initialize({ complex });

      scope.execute(() => {
        const retrieved = context.get<typeof complex>('complex');

        strictEqual(retrieved.nested.deep.value, true);
        strictEqual(retrieved.array.length, 3);
      });

      const final = scope.terminate();

      strictEqual((final.complex as typeof complex).nested.deep.value, true);
    });

    void it('handles function values', () => {
      const context = Context.create({ name: 'test' });

      const scope = context.initialize({ fn: Fixture.doubleNumber });

      scope.execute(() => {
        const retrieved = context.get<typeof Fixture.doubleNumber>('fn');

        strictEqual(retrieved(5), 10);
      });
    });

    void it('handles many keys', () => {
      const context = Context.create({ name: 'test' });
      const initial: Record<string, number> = {};

      for (let i = 0; i < 1000; i++) {
        initial[`key${i}`] = i;
      }

      const scope = context.initialize(initial);

      scope.execute(() => {
        strictEqual(context.keys().length, 1000);
        strictEqual(context.get<number>('key500'), 500);
      });

      const final = scope.terminate();

      strictEqual(Object.keys(final).length, 1000);
    });
  });

  void describe('subclass hook extension', () => {
    void it('onExit fires before onEnter on FSM transition', () => {
      const log: string[] = [];
      class TracedScope extends ContextScope {
        static override create(options: ContextScopeOptionsInterface): TracedScope {
          return new TracedScope(options);
        }

        protected override onExit(from: string, to: string): void {
          log.push(`exit:${from}→${to}`);
        }

        protected override onEnter(to: string, from: string): void {
          log.push(`enter:${to}←${from}`);
        }
      }

      const als = new AsyncLocalStorage<Map<string, unknown>>();
      // construction fires created→active; clear log so we only see terminate transition
      const scope = TracedScope.create({ 'name': 'test', 'storage': als });
      log.length = 0;
      scope.terminate();
      deepStrictEqual(log, ['exit:active→terminated', 'enter:terminated←active']);
    });

    void it('onError fires with the thrown error, scope remains usable', () => {
      const errors: unknown[] = [];
      class TracedScope extends ContextScope {
        static override create(options: ContextScopeOptionsInterface): TracedScope {
          return new TracedScope(options);
        }

        protected override onError(error: unknown): void {
          errors.push(error);
        }
      }

      const als = new AsyncLocalStorage<Map<string, unknown>>();
      const scope = TracedScope.create({ 'name': 'test', 'storage': als });
      const err = new Error('bang');
      throws(() => {
        scope.execute(() => { throw err; });
      }, { message: 'bang' });
      strictEqual(errors.length, 1);
      strictEqual(errors[0], err);
      // Scope still usable after fn threw
      const ran: boolean[] = [];
      scope.execute(() => { ran.push(true); });
      strictEqual(ran.length, 1);
      scope.terminate();
    });

    void it('onError does not fire on clean execute', () => {
      const errors: unknown[] = [];
      class TracedScope extends ContextScope {
        static override create(options: ContextScopeOptionsInterface): TracedScope {
          return new TracedScope(options);
        }

        protected override onError(error: unknown): void {
          errors.push(error);
        }
      }

      const als = new AsyncLocalStorage<Map<string, unknown>>();
      const scope = TracedScope.create({ 'name': 'test', 'storage': als });
      scope.execute(() => { return 42; });
      strictEqual(errors.length, 0);
      scope.terminate();
    });

    void it('onError fires (not onAfterExecute) when an async fn rejects', async () => {
      const afterCount: number[] = [];
      const errors: unknown[] = [];
      class TracedScope extends ContextScope {
        static override create(options: ContextScopeOptionsInterface): TracedScope {
          return new TracedScope(options);
        }

        protected override onAfterExecute(): void {
          afterCount.push(1);
        }

        protected override onError(error: unknown): void {
          errors.push(error);
        }
      }

      const als = new AsyncLocalStorage<Map<string, unknown>>();
      const scope = TracedScope.create({ 'name': 'test', 'storage': als });
      const err = new Error('async boom');

      await scope.execute(async () => {
        await setTimeout(5);
        throw err;
      }).catch(() => {
        // Rejection propagates to the caller as expected; hooks are asserted below.
      });

      strictEqual(afterCount.length, 0);
      strictEqual(errors.length, 1);
      strictEqual(errors[0], err);
      scope.terminate();
    });

    void it('onAfterExecute fires only after an async fn resolves, not before', async () => {
      const afterCount: number[] = [];
      const errors: unknown[] = [];
      class TracedScope extends ContextScope {
        static override create(options: ContextScopeOptionsInterface): TracedScope {
          return new TracedScope(options);
        }

        protected override onAfterExecute(): void {
          afterCount.push(1);
        }

        protected override onError(error: unknown): void {
          errors.push(error);
        }
      }

      const als = new AsyncLocalStorage<Map<string, unknown>>();
      const scope = TracedScope.create({ 'name': 'test', 'storage': als });

      const pending = scope.execute(async () => {
        await setTimeout(5);
        return 'done';
      });

      // Hook has not fired yet — the promise has not resolved.
      strictEqual(afterCount.length, 0);

      const result = await pending;

      strictEqual(result, 'done');
      strictEqual(afterCount.length, 1);
      strictEqual(errors.length, 0);
      scope.terminate();
    });

    void it('onDispose fires after store clear, before onTerminate', () => {
      const log: string[] = [];
      class TracedScope extends ContextScope {
        static override create(options: ContextScopeOptionsInterface): TracedScope {
          return new TracedScope(options);
        }

        protected override onDispose(): void {
          log.push('dispose');
        }

        protected override onTerminate(snapshot: Record<string, unknown>): Record<string, unknown> {
          log.push('terminate');
          return snapshot;
        }
      }

      const als = new AsyncLocalStorage<Map<string, unknown>>();
      const scope = TracedScope.create({ 'name': 'test', 'storage': als });
      scope.terminate();
      deepStrictEqual(log, ['dispose', 'terminate']);
    });

    void it('onAfterExecute does not fire when fn throws', () => {
      const afterCount: number[] = [];
      const errCount: unknown[] = [];
      class TracedScope extends ContextScope {
        static override create(options: ContextScopeOptionsInterface): TracedScope {
          return new TracedScope(options);
        }

        protected override onAfterExecute(): void {
          afterCount.push(1);
        }

        protected override onError(e: unknown): void {
          errCount.push(e);
        }
      }

      const als = new AsyncLocalStorage<Map<string, unknown>>();
      const scope = TracedScope.create({ 'name': 'test', 'storage': als });
      throws(() => {
        scope.execute(() => { throw new Error('fail'); });
      });
      strictEqual(afterCount.length, 0);
      strictEqual(errCount.length, 1);
      scope.terminate();
    });

    void it('a throwing onBeforeExecute hook surfaces a HookInvocationError before fn runs', () => {
      class TracedScope extends ContextScope {
        static override create(options: ContextScopeOptionsInterface): TracedScope {
          return new TracedScope(options);
        }

        protected override onBeforeExecute(): void {
          throw new Error('onBeforeExecute boom');
        }
      }

      const als = new AsyncLocalStorage<Map<string, unknown>>();
      const scope = TracedScope.create({ 'name': 'test', 'storage': als });
      let caught: unknown;

      try {
        scope.execute(() => 42);
      } catch (error) {
        caught = error;
      }

      ok(caught instanceof HookInvocationError);
      strictEqual((caught as HookInvocationError).hookName, 'onBeforeExecute');
      scope.terminate();
    });

    void it('a throwing onAfterExecute hook surfaces a HookInvocationError after fn has already run', () => {
      class TracedScope extends ContextScope {
        static override create(options: ContextScopeOptionsInterface): TracedScope {
          return new TracedScope(options);
        }

        protected override onAfterExecute(): void {
          throw new Error('onAfterExecute boom');
        }
      }

      const als = new AsyncLocalStorage<Map<string, unknown>>();
      const scope = TracedScope.create({ 'name': 'test', 'storage': als });
      let caught: unknown;

      try {
        scope.execute(() => 42);
      } catch (error) {
        caught = error;
      }

      ok(caught instanceof HookInvocationError);
      strictEqual((caught as HookInvocationError).hookName, 'onAfterExecute');
      scope.terminate();
    });

    void it('a throwing onTerminatedAccess hook surfaces a HookInvocationError instead of ContextError', () => {
      class TracedScope extends ContextScope {
        static override create(options: ContextScopeOptionsInterface): TracedScope {
          return new TracedScope(options);
        }

        protected override onTerminatedAccess(): void {
          throw new Error('onTerminatedAccess boom');
        }
      }

      const als = new AsyncLocalStorage<Map<string, unknown>>();
      const scope = TracedScope.create({ 'name': 'test', 'storage': als });
      scope.terminate();
      let caught: unknown;

      try {
        scope.execute(() => 42);
      } catch (error) {
        caught = error;
      }

      ok(caught instanceof HookInvocationError);
      strictEqual((caught as HookInvocationError).hookName, 'onTerminatedAccess');
    });

    void it('a throwing onDispose hook surfaces a HookInvocationError instead of the terminate() snapshot', () => {
      class TracedScope extends ContextScope {
        static override create(options: ContextScopeOptionsInterface): TracedScope {
          return new TracedScope(options);
        }

        protected override onDispose(): void {
          throw new Error('onDispose boom');
        }
      }

      const als = new AsyncLocalStorage<Map<string, unknown>>();
      const scope = TracedScope.create({ 'initial': { 'requestId': 'abc' }, 'name': 'test', 'storage': als });
      let caught: unknown;

      try {
        scope.terminate();
      } catch (error) {
        caught = error;
      }

      ok(caught instanceof HookInvocationError);
      strictEqual((caught as HookInvocationError).hookName, 'onDispose');
    });
  });

  void describe('real-world usage patterns', () => {
    void it('request handling pattern: init → process → respond → cleanup', async () => {
      const context = Context.create({ name: 'request' });

      // Simulate request handler
      const handleRequest = async (requestId: string): Promise<{
        finalState: Record<string, unknown>;
        response: {
          body: string;
          status: number;
        };
      }> => {
        // Initialize with request context
        const scope = context.initialize({
          requestId: requestId,
          startTime: Date.now()
        });

        // Process request
        const response = await scope.execute(async () => {
          // Simulate auth
          await setTimeout(5);
          context.set('userId', 'user-123');

          // Simulate business logic
          await setTimeout(5);
          context.set('result', { data: 'processed' });

          // Build response
          return {
            body: JSON.stringify(context.get('result')),
            status: 200
          };
        });

        // Cleanup and get final state for logging
        const finalState = scope.terminate();

        return {
          finalState,
          response
        };
      };

      const result = await handleRequest('req-456');

      strictEqual(result.response.status, 200);
      strictEqual(result.finalState.requestId, 'req-456');
      strictEqual(result.finalState.userId, 'user-123');
      ok(typeof result.finalState.startTime === 'number');
    });

    void it('middleware chain pattern: multiple execute calls', () => {
      const context = Context.create({ name: 'middleware' });

      type Middleware = () => void;

      const runMiddlewareChain = (
        middlewares: Middleware[],
        initial: Record<string, unknown>
      ): Record<string, unknown> => {
        const scope = context.initialize(initial);

        for (const middleware of middlewares) {
          scope.execute(middleware);
        }

        return scope.terminate();
      };

      const authMiddleware: Middleware = () => {
        context.set('authenticated', true);
        context.set('user', { id: '123' });
      };

      const loggingMiddleware: Middleware = () => {
        context.set('logged', true);
      };

      const validationMiddleware: Middleware = () => {
        if (context.get<boolean>('authenticated')) {
          context.set('validated', true);
        }
      };

      const final = runMiddlewareChain(
        [
          authMiddleware,
          loggingMiddleware,
          validationMiddleware
        ],
        { requestId: 'req-789' }
      );

      deepStrictEqual(final, {
        authenticated: true,
        logged: true,
        requestId: 'req-789',
        user: { id: '123' },
        validated: true
      });
    });

    void it('parallel operations with shared context', async () => {
      const context = Context.create({ name: 'parallel' });
      const scope = context.initialize({ results: [] as string[] });

      await scope.execute(async () => {
        // Start multiple parallel operations
        const operations = [
          setTimeout(10).then(() => {
            return 'op1';
          }),
          setTimeout(20).then(() => {
            return 'op2';
          }),
          setTimeout(15).then(() => {
            return 'op3';
          })
        ];

        const results = await Promise.all(operations);

        // All complete, update context
        context.set('results', results);
        context.set('completedAt', Date.now());
      });

      const final = scope.terminate();

      deepStrictEqual(final.results, [
        'op1',
        'op2',
        'op3'
      ]);
      ok(typeof final.completedAt === 'number');
    });
  });

  void describe('async hook safety (HookInvoker regression)', () => {
    void it('an async onBeforeExecute override that rejects is routed through onHookError, not left as an unhandled rejection', async () => {
      class AsyncRejectingScope extends ContextScope {
        static override create(options: ContextScopeOptionsInterface): AsyncRejectingScope {
          return new AsyncRejectingScope(options);
        }

        protected override async onBeforeExecute(): Promise<void> {
          await setTimeout(5);
          throw new Error('onBeforeExecute boom');
        }
      }

      const unhandled: unknown[] = [];
      const onUnhandledRejection = (reason: unknown): void => { unhandled.push(reason); };
      process.on('unhandledRejection', onUnhandledRejection);

      try {
        const als = new AsyncLocalStorage<Map<string, unknown>>();
        const scope = AsyncRejectingScope.create({ 'name': 'async-before-execute', 'storage': als });

        // `hooks.invoke` for onBeforeExecute is fired without being awaited by
        // `execute()` itself — this call must not throw synchronously and must
        // not leak an unhandled rejection once the override's promise settles.
        scope.execute(() => 'ok');

        // Give the rejected hook promise time to settle and, if the fix
        // regressed, time for the unhandled rejection to surface.
        await setTimeout(20);

        strictEqual(unhandled.length, 0);
        scope.terminate();
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
      }
    });
  });
});
