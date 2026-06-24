/**
 * Context Unit Tests
 *
 * Tests Context functionality:
 * - Three-phase lifecycle: initialize → execute → terminate
 * - Dynamic key-value operations
 * - Async propagation
 * - Concurrent isolation
 * - Factory and builder patterns
 * - Subclass extension via protected hooks
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import {
  deepStrictEqual, ok, strictEqual, throws
} from 'node:assert/strict';
import {
  describe, it
} from 'node:test';
import { setTimeout } from 'node:timers/promises';

import { Context, ContextScope } from '../../../src/context/index.js';

void describe('Context', () => {
  void describe('factory patterns', () => {
    void it('creates a context with static create()', () => {
      const context = Context.create({ name: 'test' });

      strictEqual(context.name, 'test');
    });

    void it('creates a context with builder pattern', () => {
      const context = Context.builder()
        .name('test-builder')
        .build();

      strictEqual(context.name, 'test-builder');
    });

    void it('builder throws if name not set', () => {
      throws(
        () => {
          return Context.builder().build();
        },
        { message: 'Context name is required' }
      );
    });

    const invalidNameScenarios: Array<{ description: string; config: unknown }> = [
      {
        description: 'create() throws when name is empty string',
        config: { name: '' }
      },
      {
        description: 'create() throws when name is not a string',
        config: { name: 0 as unknown as string }
      }
    ];

    for (const { description, config } of invalidNameScenarios) {
      void it(description, () => {
        throws(
          () => {
            return Context.create(config as { name: string });
          },
          { message: /name must be a non-empty string/ }
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
        strictEqual(context.get<string>('requestId'), '123');
        strictEqual(context.get<number>('value'), 42);
      });
    });
  });

  void describe('execute', () => {
    void it('runs callback within context', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ key: 'value' });

      scope.execute(() => {
        strictEqual(context.get<string>('key'), 'value');
      });
    });

    void it('returns callback result', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ value: 5 });

      const result = scope.execute(() => {
        return context.get<number>('value') * 2;
      });

      strictEqual(result, 10);
    });

    void it('returns async callback result', async () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ value: 7 });

      const result = await scope.execute(async () => {
        await Promise.resolve();

        return context.get<number>('value') * 3;
      });

      strictEqual(result, 21);
    });

    void it('allows multiple execute calls on same scope', () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ count: 0 });

      scope.execute(() => {
        context.set('count', context.get<number>('count') + 1);
      });

      scope.execute(() => {
        context.set('count', context.get<number>('count') + 1);
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
          strictEqual(context.get<string>('key'), 'value');
        }
      },
      {
        description: 'set() overwrites existing values',
        initial: { key: 'original' },
        run: (context) => {
          context.set('key', 'updated');
          strictEqual(context.get<string>('key'), 'updated');
        }
      },
      {
        description: 'tryGet() returns undefined when key not found',
        initial: {},
        run: (context) => {
          strictEqual(context.tryGet('nonexistent'), undefined);
        }
      },
      {
        description: 'tryGet() returns value when key exists',
        initial: { key: 'value' },
        run: (context) => {
          strictEqual(context.tryGet<string>('key'), 'value');
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
        strictEqual(context.get<string>('key'), 'modified');
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
        description: 'tryGet() returns undefined outside execute()',
        throws: false,
        run: (context) => context.tryGet('key')
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

  void describe('async propagation', () => {
    void it('propagates context through async operations', async () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize({ requestId: 'async-test' });

      await scope.execute(async () => {
        await Promise.resolve();
        strictEqual(context.get<string>('requestId'), 'async-test');

        await setTimeout(10);
        strictEqual(context.get<string>('requestId'), 'async-test');
      });
    });

    void it('mutations persist through async chain', async () => {
      const context = Context.create({ name: 'test' });
      const scope = context.initialize();

      await scope.execute(async () => {
        context.set('step', 1);

        await Promise.resolve();
        strictEqual(context.get<number>('step'), 1);
        context.set('step', 2);

        await Promise.resolve();
        strictEqual(context.get<number>('step'), 2);
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
        results.push(`task1: ${context.get<string>('taskId')}`);
      });

      const task2 = scope2.execute(async () => {
        await setTimeout(10);
        results.push(`task2: ${context.get<string>('taskId')}`);
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

        return context.get<number>('value');
      });

      const task2 = scope2.execute(async () => {
        await setTimeout(20);

        return context.get<number>('value');
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
        strictEqual(context.get<string>('level'), 'outer');

        const innerScope = context.initialize({ level: 'inner' });

        innerScope.execute(() => {
          strictEqual(context.get<string>('level'), 'inner');
        });

        strictEqual(context.get<string>('level'), 'outer');
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
          strictEqual(context1.get<string>('id'), 'first');
          strictEqual(context2.get<number>('count'), 42);
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
          scope: ContextScope
        ): void {
          scope.execute(() => {
            this.set('seeded', 'default-value');
          });
        }
      }

      const context = SeededContext.create({ name: 'seeded' });
      const scope = context.initialize();

      scope.execute(() => {
        strictEqual(context.get<string>('seeded'), 'default-value');
      });
    });

    void it('SeededContext seeds key alongside caller-provided initial values', () => {
      class SeededContext extends Context {
        protected override onInitialize(
          _initial: Record<string, unknown> | undefined,
          scope: ContextScope
        ): void {
          scope.execute(() => {
            this.set('seeded', 'default-value');
          });
        }
      }

      const context = SeededContext.create({ name: 'seeded' });
      const scope = context.initialize({ caller: 'provided' });

      scope.execute(() => {
        strictEqual(context.get<string>('seeded'), 'default-value');
        strictEqual(context.get<string>('caller'), 'provided');
      });
    });

    void it('TracedScope.onTerminate augments snapshot', () => {
      class TracedScope extends ContextScope {
        protected override onTerminate(
          snapshot: Record<string, unknown>
        ): Record<string, unknown> {
          return { ...snapshot, traced: true };
        }

        testTransition(to: 'active' | 'created' | 'terminated'): void {
          this.transition(to);
        }
      }

      const storage = new AsyncLocalStorage<Map<string, unknown>>();
      const scope = new TracedScope('test', storage, { key: 'value' });

      const snapshot = scope.terminate();

      strictEqual(snapshot.traced, true);
      strictEqual(snapshot.key, 'value');
    });

    void it('TracedScope.onBeforeExecute increments on each execute call', () => {
      class TracedScope extends ContextScope {
        executionCount = 0;

        protected override onBeforeExecute(): void {
          this.executionCount++;
        }

        testTransition(to: 'active' | 'created' | 'terminated'): void {
          this.transition(to);
        }
      }

      const storage = new AsyncLocalStorage<Map<string, unknown>>();
      const scope = new TracedScope('test', storage);

      scope.execute(() => {});
      scope.execute(() => {});
      scope.execute(() => {});

      strictEqual(scope.executionCount, 3);
    });

    void it('TracedScope execute-after-terminate still throws ContextError', () => {
      class TracedScope extends ContextScope {
        terminatedAccessCount = 0;

        protected override onTerminatedAccess(): void {
          this.terminatedAccessCount++;
        }

        testTransition(to: 'active' | 'created' | 'terminated'): void {
          this.transition(to);
        }
      }

      const storage = new AsyncLocalStorage<Map<string, unknown>>();
      const scope = new TracedScope('test', storage);

      scope.terminate();

      throws(
        () => {
          return scope.execute(() => {});
        },
        { message: 'test scope has been terminated' }
      );

      strictEqual(scope.terminatedAccessCount, 1);
    });

    void it('FSM guard rejects illegal transition terminated → active', () => {
      class TracedScope extends ContextScope {
        testTransition(to: 'active' | 'created' | 'terminated'): void {
          this.transition(to);
        }
      }

      const storage = new AsyncLocalStorage<Map<string, unknown>>();
      const scope = new TracedScope('test', storage);

      scope.terminate();

      throws(
        () => {
          scope.testTransition('active');
        },
        { message: 'Illegal state transition: terminated → active' }
      );
    });
  });
});
