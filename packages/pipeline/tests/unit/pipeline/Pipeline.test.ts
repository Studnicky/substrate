import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HookInvocationError, HookTimeoutError } from '@studnicky/errors';

import { Pipeline } from '../../../src/pipeline/Pipeline.js';

void describe('Pipeline', () => {
  void describe('construction', () => {
    void it('starts with no stages (run returns input unchanged)', async () => {
      const pipeline = Pipeline.create<string>([]);
      const result = await pipeline.run('hello');
      assert.strictEqual(result, 'hello');
    });

    void it('constructs with a single stage (run applies it)', async () => {
      const pipeline = Pipeline.create<number>([(n) => n + 1]);
      const result = await pipeline.run(0);
      assert.strictEqual(result, 1);
    });

    void it('constructs with multiple stages (run applies all)', async () => {
      const pipeline = Pipeline.create<number>([(n) => n + 1, (n) => n * 2]);
      // (0 + 1) * 2 = 2
      const result = await pipeline.run(0);
      assert.strictEqual(result, 2);
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
        const pipeline = Pipeline.create<number>(fns);
        const result = await pipeline.run(input);
        assert.strictEqual(result, expected);
      });
    }

    void it('applies a single async transform', async () => {
      const pipeline = Pipeline.create<string>([async (s) => s + ' world']);
      const result = await pipeline.run('hello');
      assert.strictEqual(result, 'hello world');
    });

    void it('chains async and sync transforms', async () => {
      const pipeline = Pipeline.create<string>([
        async (s) => s + ' async',
        (s) => s + ' sync',
      ]);
      const result = await pipeline.run('start');
      assert.strictEqual(result, 'start async sync');
    });

    void it('passes object context through transforms', async () => {
      interface Ctx { count: number; label: string }
      const pipeline = Pipeline.create<Ctx>([
        (ctx) => ({ ...ctx, count: ctx.count + 1 }),
        (ctx) => ({ ...ctx, label: ctx.label + '!' }),
      ]);
      const result = await pipeline.run({ count: 0, label: 'test' });
      assert.strictEqual(result.count, 1);
      assert.strictEqual(result.label, 'test!');
    });

    void it('does not mutate the original input', async () => {
      const pipeline = Pipeline.create<number[]>([(arr) => [...arr, 99]]);
      const original = [1, 2, 3];
      const result = await pipeline.run(original);
      assert.deepStrictEqual(original, [1, 2, 3]);
      assert.deepStrictEqual(result, [1, 2, 3, 99]);
    });

    void it('a throwing lifecycle hook rejects run() with a HookInvocationError instead of being swallowed', async () => {
      class ThrowingHookPipeline extends Pipeline<number> {
        protected override onStageStart(): void {
          throw new Error('onStageStart boom');
        }
      }

      const pipeline = ThrowingHookPipeline.create([(n) => n + 1]);

      await assert.rejects(
        () => { return pipeline.run(0); },
        (err: unknown) => {
          assert.ok(err instanceof HookInvocationError);
          assert.strictEqual(err.hookName, 'onStageStart');
          return true;
        }
      );
    });

    void it('stages returns a defensive snapshot', async () => {
      const pipeline = Pipeline.create<number>([(n) => n + 1]);
      const snapshot = pipeline.stages;

      Reflect.set(snapshot, 0, (n: number) => n + 100);

      assert.strictEqual(await pipeline.run(0), 1);
    });

    void it('with hookTimeoutMs set, a hook that resolves before the timeout behaves identically to today', async () => {
      class ResolvingHookPipeline extends Pipeline<number> {
        protected override onStageSuccess(): Promise<void> {
          return Promise.resolve();
        }
      }

      const pipeline = ResolvingHookPipeline.create([(n) => n + 1], { 'hookTimeoutMs': 200 });

      const result = await pipeline.run(0);
      assert.strictEqual(result, 1);
    });

    void it('with hookTimeoutMs set, a hook that never settles rejects run() with a HookInvocationError whose cause is a HookTimeoutError', async () => {
      class HangingHookPipeline extends Pipeline<number> {
        protected override onStageStart(): Promise<void> {
          return new Promise<void>(() => { /* never settles */ });
        }
      }

      const pipeline = HangingHookPipeline.create([(n) => n + 1], { 'hookTimeoutMs': 25 });

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

      const pipeline = ResolvingHookPipeline.create([(n) => n + 1]);

      const result = await pipeline.run(0);
      assert.strictEqual(result, 1);
    });
  });
});
