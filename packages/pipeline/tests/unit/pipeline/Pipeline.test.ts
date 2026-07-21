import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HookInvocationError, HookTimeoutError } from '@studnicky/errors';

import { Pipeline } from '../../../src/pipeline/Pipeline.js';

void describe('Pipeline', () => {
  void describe('construction', () => {
    void it('starts with no registered transforms (run returns input unchanged)', async () => {
      const pipeline = Pipeline.create<string>();
      const result = await pipeline.run('hello');
      assert.strictEqual(result, 'hello');
    });

    void it('clear() on a new pipeline does not throw', () => {
      const pipeline = Pipeline.create<number>();
      assert.doesNotThrow(() => pipeline.clear());
    });
  });

  void describe('add()', () => {
    void it('adds a transform function (run applies it)', async () => {
      const pipeline = Pipeline.create<number>();
      pipeline.add((n) => n + 1);
      const result = await pipeline.run(0);
      assert.strictEqual(result, 1);
    });

    void it('adds multiple transform functions (run applies all)', async () => {
      const pipeline = Pipeline.create<number>();
      pipeline.add((n) => n + 1);
      pipeline.add((n) => n * 2);
      // (0 + 1) * 2 = 2
      const result = await pipeline.run(0);
      assert.strictEqual(result, 2);
    });

    void it('returns a remove function', () => {
      const pipeline = Pipeline.create<number>();
      const remove = pipeline.add((n) => n + 1);
      assert.strictEqual(typeof remove, 'function');
    });

    void it('returned remove function removes only that transform', async () => {
      const pipeline = Pipeline.create<number>();
      const fn1 = (n: number) => n + 100;
      const fn2 = (n: number) => n * 2;
      const remove1 = pipeline.add(fn1);
      pipeline.add(fn2);

      remove1();

      // Only fn2 (n * 2) should remain
      const result = await pipeline.run(5);
      assert.strictEqual(result, 10);
    });

    void it('calling remove twice is idempotent', async () => {
      const pipeline = Pipeline.create<number>();
      const remove = pipeline.add((n) => n + 1);
      remove();
      assert.doesNotThrow(() => remove());
      // No transforms remain — input passes through
      const result = await pipeline.run(5);
      assert.strictEqual(result, 5);
    });
  });

  void describe('clear()', () => {
    const clearScenarios: Array<{
      description: string;
      setupFns: Array<(s: string) => string>;
      expected: string;
    }> = [
      {
        description: 'removes all transform functions',
        setupFns: [(s) => s + '!', (s) => s.toUpperCase()],
        expected: 'hello',
      },
      {
        description: 'can be called multiple times',
        setupFns: [(s) => s],
        expected: 'test',
      },
    ];

    for (const { description, setupFns, expected } of clearScenarios) {
      void it(description, async () => {
        const pipeline = Pipeline.create<string>();
        for (const fn of setupFns) {
          pipeline.add(fn);
        }
        pipeline.clear();
        pipeline.clear();
        const result = await pipeline.run(expected);
        assert.strictEqual(result, expected);
      });
    }

    void it('can be called on an empty pipeline', () => {
      const pipeline = Pipeline.create<string>();
      assert.doesNotThrow(() => pipeline.clear());
    });
  });

  void describe('run()', () => {
    const runScenarios: Array<{
      description: string;
      fns: Array<(n: number) => number>;
      input: number;
      expected: number;
    }> = [
      {
        description: 'returns the input unchanged when pipeline is empty',
        fns: [],
        input: 42,
        expected: 42,
      },
      {
        description: 'applies a single synchronous transform',
        fns: [(n) => n + 10],
        input: 5,
        expected: 15,
      },
      {
        description: 'chains multiple transforms in order',
        // (5 + 1) * 2 - 3 = 9
        fns: [(n) => n + 1, (n) => n * 2, (n) => n - 3],
        input: 5,
        expected: 9,
      },
    ];

    for (const { description, fns, input, expected } of runScenarios) {
      void it(description, async () => {
        const pipeline = Pipeline.create<number>();
        for (const fn of fns) {
          pipeline.add(fn);
        }
        const result = await pipeline.run(input);
        assert.strictEqual(result, expected);
      });
    }

    void it('applies a single async transform', async () => {
      const pipeline = Pipeline.create<string>();
      pipeline.add(async (s) => s + ' world');
      const result = await pipeline.run('hello');
      assert.strictEqual(result, 'hello world');
    });

    void it('chains async and sync transforms', async () => {
      const pipeline = Pipeline.create<string>();
      pipeline.add(async (s) => s + ' async');
      pipeline.add((s) => s + ' sync');
      const result = await pipeline.run('start');
      assert.strictEqual(result, 'start async sync');
    });

    void it('passes object context through transforms', async () => {
      interface Ctx { count: number; label: string }
      const pipeline = Pipeline.create<Ctx>();
      pipeline.add((ctx) => ({ ...ctx, count: ctx.count + 1 }));
      pipeline.add((ctx) => ({ ...ctx, label: ctx.label + '!' }));
      const result = await pipeline.run({ count: 0, label: 'test' });
      assert.strictEqual(result.count, 1);
      assert.strictEqual(result.label, 'test!');
    });

    void it('does not mutate the original input', async () => {
      const pipeline = Pipeline.create<number[]>();
      pipeline.add((arr) => [...arr, 99]);
      const original = [1, 2, 3];
      const result = await pipeline.run(original);
      assert.deepStrictEqual(original, [1, 2, 3]);
      assert.deepStrictEqual(result, [1, 2, 3, 99]);
    });

    void it('run after add/remove reflects current fns only', async () => {
      const pipeline = Pipeline.create<number>();
      const remove = pipeline.add((n) => n + 100);
      pipeline.add((n) => n * 2);
      remove();
      // Only n * 2 remains
      const result = await pipeline.run(5);
      assert.strictEqual(result, 10);
    });

    void it('a throwing lifecycle hook rejects run() with a HookInvocationError instead of being swallowed', async () => {
      class ThrowingHookPipeline extends Pipeline<number> {
        protected override onStageStart(): void {
          throw new Error('onStageStart boom');
        }
      }

      const pipeline = ThrowingHookPipeline.create();
      pipeline.add((n) => n + 1);

      await assert.rejects(
        () => { return pipeline.run(0); },
        (err: unknown) => {
          assert.ok(err instanceof HookInvocationError);
          assert.strictEqual(err.hookName, 'onStageStart');
          return true;
        }
      );
    });

    void it('removing the second of two stages added with the same fn reference leaves the first running', async () => {
      const pipeline = Pipeline.create<number>();
      const inc = (n: number) => n + 1;
      const removeA = pipeline.add(inc);
      const removeB = pipeline.add(inc);

      assert.strictEqual(pipeline.stages.length, 2);

      removeB();

      assert.strictEqual(pipeline.stages.length, 1);
      // The first `inc` stage still runs.
      const result = await pipeline.run(0);
      assert.strictEqual(result, 1);

      void removeA;
    });

    void it('removing the first of two stages added with the same fn reference leaves the second running', async () => {
      const pipeline = Pipeline.create<number>();
      const inc = (n: number) => n + 1;
      const removeA = pipeline.add(inc);
      const removeB = pipeline.add(inc);

      removeA();

      assert.strictEqual(pipeline.stages.length, 1);
      const result = await pipeline.run(0);
      assert.strictEqual(result, 1);

      void removeB;
    });

    void it('stages returns a defensive snapshot', async () => {
      const pipeline = Pipeline.create<number>();
      pipeline.add((n) => n + 1);
      const snapshot = pipeline.stages;

      Reflect.set(snapshot, 0, (n: number) => n + 100);

      assert.strictEqual(await pipeline.run(0), 1);
    });

    void it('a stage that removes itself mid-run does not skip the following stage', async () => {
      const pipeline = Pipeline.create<number>();
      const calls: string[] = [];
      const removeSelf: () => void = pipeline.add((n) => {
        calls.push('self');
        removeSelf();
        return n + 1;
      });
      pipeline.add((n) => {
        calls.push('next');
        return n + 10;
      });

      const result = await pipeline.run(0);

      // Both stages ran exactly once, in order, and the self-removing
      // stage is gone from the pipeline afterward.
      assert.deepStrictEqual(calls, ['self', 'next']);
      assert.strictEqual(result, 11);
      assert.strictEqual(pipeline.stages.length, 1);
    });

    void it('a stage that removes itself mid-run is not re-executed on the next run() call', async () => {
      const pipeline = Pipeline.create<number>();
      let selfRunCount = 0;
      const removeSelf: () => void = pipeline.add((n) => {
        selfRunCount++;
        removeSelf();
        return n;
      });
      pipeline.add((n) => n + 1);

      await pipeline.run(0);
      const secondResult = await pipeline.run(0);

      assert.strictEqual(selfRunCount, 1);
      assert.strictEqual(secondResult, 1);
    });

    void it('with hookTimeoutMs set, a hook that resolves before the timeout behaves identically to today', async () => {
      class ResolvingHookPipeline extends Pipeline<number> {
        protected override onStageSuccess(): Promise<void> {
          return Promise.resolve();
        }
      }

      const pipeline = ResolvingHookPipeline.create({ 'hookTimeoutMs': 200 });
      pipeline.add((n) => n + 1);

      const result = await pipeline.run(0);
      assert.strictEqual(result, 1);
    });

    void it('with hookTimeoutMs set, a hook that never settles rejects run() with a HookInvocationError whose cause is a HookTimeoutError', async () => {
      class HangingHookPipeline extends Pipeline<number> {
        protected override onStageStart(): Promise<void> {
          return new Promise<void>(() => { /* never settles */ });
        }
      }

      const pipeline = HangingHookPipeline.create({ 'hookTimeoutMs': 25 });
      pipeline.add((n) => n + 1);

      await assert.rejects(
        () => { return pipeline.run(0); },
        (err: unknown) => {
          assert.ok(err instanceof HookInvocationError);
          assert.strictEqual(err.hookName, 'onStageStart');
          assert.ok(err.cause instanceof HookTimeoutError);
          return true;
        }
      );
    });

    void it('with hookTimeoutMs unset, a hook that resolves normally succeeds exactly as before', async () => {
      class ResolvingHookPipeline extends Pipeline<number> {
        protected override onStageSuccess(): Promise<void> {
          return Promise.resolve();
        }
      }

      const pipeline = ResolvingHookPipeline.create();
      pipeline.add((n) => n + 1);

      const result = await pipeline.run(0);
      assert.strictEqual(result, 1);
    });
  });
});
