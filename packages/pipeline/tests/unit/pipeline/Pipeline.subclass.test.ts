/**
 * Subclass extension tests for Pipeline
 *
 * Verifies that the protected seams (hooks) are reachable and overridable
 * by a consumer subclass.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Pipeline } from '../../../src/pipeline/Pipeline.js';
import { PipelineError } from '../../../src/errors/PipelineError.js';

// ── Test subclasses ──────────────────────────────────────────────────────────

/**
 * Records the order in which beforeStage/afterStage fire, and which
 * stage indices were observed.
 */
class TracingPipeline<T> extends Pipeline<T> {
  readonly trace: Array<{ hook: string; index: number }> = [];

  override beforeStage(ctx: T, index: number): T {
    this.trace.push({ hook: 'before', index });
    return ctx;
  }

  override afterStage(ctx: T, index: number): T {
    this.trace.push({ hook: 'after', index });
    return ctx;
  }
}

/**
 * Wraps ctx at run start and unwraps at run complete — verifying the
 * onRunStart / onRunComplete seams are called and can transform value.
 */
class BracketPipeline extends Pipeline<number> {
  runStartCalled = false;
  runCompleteCalled = false;
  runStartCtx = -1;
  runCompleteCtx = -1;

  override onRunStart(ctx: number): number {
    this.runStartCalled = true;
    this.runStartCtx = ctx;
    return ctx + 1000; // shift up
  }

  override onRunComplete(ctx: number): number {
    this.runCompleteCalled = true;
    this.runCompleteCtx = ctx;
    return ctx - 1000; // shift back down
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

void describe('Pipeline subclass extension', () => {
  void describe('beforeStage / afterStage hooks', () => {
    void it('fires before and after each registered stage in order', async () => {
      const pipeline = TracingPipeline.create<number>();
      pipeline.add((n) => n + 1);
      pipeline.add((n) => n * 2);
      pipeline.add((n) => n - 3);

      await pipeline.run(5);

      assert.deepStrictEqual(pipeline.trace, [
        { hook: 'before', index: 0 },
        { hook: 'after',  index: 0 },
        { hook: 'before', index: 1 },
        { hook: 'after',  index: 1 },
        { hook: 'before', index: 2 },
        { hook: 'after',  index: 2 },
      ]);
    });

    void it('does not fire when pipeline has no stages', async () => {
      const pipeline = TracingPipeline.create<string>();
      await pipeline.run('hello');

      assert.strictEqual(pipeline.trace.length, 0);
    });

    void it('fires once before and once after for a single stage', async () => {
      const pipeline = TracingPipeline.create<number>();
      pipeline.add((n) => n + 1);
      await pipeline.run(0);

      assert.strictEqual(pipeline.trace.length, 2);
      assert.strictEqual(pipeline.trace[0]?.hook, 'before');
      assert.strictEqual(pipeline.trace[0]?.index, 0);
      assert.strictEqual(pipeline.trace[1]?.hook, 'after');
      assert.strictEqual(pipeline.trace[1]?.index, 0);
    });

    void it('base pipeline produces correct result with tracing hooks active', async () => {
      const pipeline = TracingPipeline.create<number>();
      pipeline.add((n) => n + 1);  // 5 → 6
      pipeline.add((n) => n * 2);  // 6 → 12
      pipeline.add((n) => n - 3);  // 12 → 9

      const result = await pipeline.run(5);
      assert.strictEqual(result, 9);
    });

    void it('beforeStage receives ctx from prior stage output', async () => {
      const receivedCtxAtBefore: number[] = [];

      class CaptureBefore extends Pipeline<number> {
        override beforeStage(ctx: number, index: number): number {
          receivedCtxAtBefore[index] = ctx;
          return ctx;
        }
      }

      const pipeline = CaptureBefore.create();
      pipeline.add((n) => n + 10); // 0 → 10
      pipeline.add((n) => n + 10); // 10 → 20

      await pipeline.run(0);

      assert.strictEqual(receivedCtxAtBefore[0], 0);
      assert.strictEqual(receivedCtxAtBefore[1], 10);
    });

    void it('afterStage receives ctx from stage fn output', async () => {
      const receivedCtxAtAfter: number[] = [];

      class CaptureAfter extends Pipeline<number> {
        override afterStage(ctx: number, index: number): number {
          receivedCtxAtAfter[index] = ctx;
          return ctx;
        }
      }

      const pipeline = CaptureAfter.create();
      pipeline.add((n) => n + 5);   // 0 → 5
      pipeline.add((n) => n * 3);   // 5 → 15

      await pipeline.run(0);

      assert.strictEqual(receivedCtxAtAfter[0], 5);
      assert.strictEqual(receivedCtxAtAfter[1], 15);
    });
  });

  void describe('onRunStart / onRunComplete hooks', () => {
    const bracketHookCalledScenarios: Array<{
      description: string;
      check: (pipeline: BracketPipeline) => boolean;
    }> = [
      {
        description: 'onRunStart is called before any stage',
        check: (p) => p.runStartCalled,
      },
      {
        description: 'onRunComplete is called after all stages',
        check: (p) => p.runCompleteCalled,
      },
    ];

    for (const { description, check } of bracketHookCalledScenarios) {
      void it(description, async () => {
        const pipeline = BracketPipeline.create();
        pipeline.add((n) => n);
        await pipeline.run(5);
        assert.strictEqual(check(pipeline), true);
      });
    }

    void it('onRunStart receives the original ctx value', async () => {
      const pipeline = BracketPipeline.create();
      pipeline.add((n) => n); // identity

      await pipeline.run(5);
      assert.strictEqual(pipeline.runStartCtx, 5);
    });

    void it('onRunStart return value is passed to first stage', async () => {
      // BracketPipeline adds 1000 in onRunStart
      const pipeline = BracketPipeline.create();
      let stageInput = -1;
      pipeline.add((n) => {
        stageInput = n;
        return n;
      });

      await pipeline.run(0);
      assert.strictEqual(stageInput, 1000);
    });

    void it('onRunComplete return value is the resolved value of run()', async () => {
      // BracketPipeline adds 1000 in onRunStart, subtracts 1000 in onRunComplete
      // so the net effect is zero
      const pipeline = BracketPipeline.create();
      pipeline.add((n) => n + 5);

      const result = await pipeline.run(10);
      // onRunStart: 10 → 1010; stage: 1010 → 1015; onRunComplete: 1015 → 15
      assert.strictEqual(result, 15);
    });

    void it('both hooks are called even when pipeline has no stages', async () => {
      const pipeline = BracketPipeline.create();
      await pipeline.run(7);

      assert.strictEqual(pipeline.runStartCalled, true);
      assert.strictEqual(pipeline.runCompleteCalled, true);
    });
  });

  void describe('protected fns access from subclass', () => {
    void it('subclass can read fns array length via protected field', () => {
      class InspectPipeline<T> extends Pipeline<T> {
        fnCount(): number {
          return this.fns.length;
        }
      }

      const pipeline = InspectPipeline.create<number>();
      pipeline.add((n) => n + 1);
      pipeline.add((n) => n * 2);

      assert.strictEqual(pipeline.fnCount(), 2);

      pipeline.clear();
      assert.strictEqual(pipeline.fnCount(), 0);
    });
  });
});

// ── ObservingPipeline subclass ────────────────────────────────────────────────

class ObservingPipeline<T> extends Pipeline<T> {
  readonly stageStartEvents: Array<{ 'index': number; 'ctx': T }> = [];
  readonly stageSuccessEvents: Array<{ 'index': number; 'ctx': T }> = [];
  readonly stageErrorEvents: Array<{ 'index': number; 'error': unknown }> = [];
  readonly runErrorEvents: Array<{ 'error': unknown }> = [];

  protected override onStageStart(index: number, ctx: T): void {
    this.stageStartEvents.push({ 'index': index, 'ctx': ctx });
  }

  protected override onStageSuccess(index: number, ctx: T): void {
    this.stageSuccessEvents.push({ 'index': index, 'ctx': ctx });
  }

  protected override onStageError(index: number, error: unknown): void {
    this.stageErrorEvents.push({ 'index': index, 'error': error });
  }

  protected override onRunError(error: unknown): void {
    this.runErrorEvents.push({ 'error': error });
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

void describe('onStageStart / onStageSuccess / onStageError / onRunError hooks', () => {
  void it('onStageStart fires for each stage in index order', async () => {
    const pipeline = ObservingPipeline.create<number>();
    pipeline.add((n) => n + 1);
    pipeline.add((n) => n + 2);
    pipeline.add((n) => n + 3);

    await pipeline.run(0);

    assert.strictEqual(pipeline.stageStartEvents.length, 3);
    assert.strictEqual(pipeline.stageStartEvents[0]?.index, 0);
    assert.strictEqual(pipeline.stageStartEvents[1]?.index, 1);
    assert.strictEqual(pipeline.stageStartEvents[2]?.index, 2);
  });

  void it('onStageSuccess fires after each successful stage with the output ctx', async () => {
    const pipeline = ObservingPipeline.create<number>();
    pipeline.add((n) => n + 10); // 0 → 10
    pipeline.add((n) => n * 3); // 10 → 30

    await pipeline.run(0);

    assert.strictEqual(pipeline.stageSuccessEvents.length, 2);
    assert.strictEqual(pipeline.stageSuccessEvents[0]?.ctx, 10);
    assert.strictEqual(pipeline.stageSuccessEvents[1]?.ctx, 30);
  });

  void it('onStageStart fires with ctx AFTER beforeStage returns', async () => {
    class ShiftingPipeline extends ObservingPipeline<number> {
      protected override beforeStage(ctx: number, index: number): number {
        return ctx + 100;
      }
    }

    const pipeline = ShiftingPipeline.create();
    pipeline.add((n) => n);

    await pipeline.run(5);

    // onStageStart should see 5 + 100 = 105 (the value after beforeStage)
    assert.strictEqual(pipeline.stageStartEvents[0]?.ctx, 105);
  });

  void it('onStageSuccess fires BEFORE afterStage', async () => {
    const order: string[] = [];

    class OrderPipeline extends Pipeline<number> {
      protected override onStageSuccess(_index: number, _ctx: number): void {
        order.push('onStageSuccess');
      }

      protected override afterStage(ctx: number, index: number): number {
        order.push('afterStage');
        return ctx;
      }
    }

    const pipeline = OrderPipeline.create();
    pipeline.add((n) => n);

    await pipeline.run(1);

    assert.deepStrictEqual(order, ['onStageSuccess', 'afterStage']);
  });

  void it('onStageError fires when a stage throws, with correct index and error', async () => {
    const pipeline = ObservingPipeline.create<number>();
    const thrownError = new Error('stage 1 fails');

    pipeline.add((n) => n + 1);
    pipeline.add((_n) => { throw thrownError; });
    pipeline.add((n) => n + 3);

    await assert.rejects(() => { return pipeline.run(0); });

    assert.strictEqual(pipeline.stageErrorEvents.length, 1);
    assert.strictEqual(pipeline.stageErrorEvents[0]?.index, 1);
    assert.strictEqual(pipeline.stageErrorEvents[0]?.error, thrownError);
  });

  void it('onStageError does not fire for successful stages', async () => {
    const pipeline = ObservingPipeline.create<number>();
    pipeline.add((n) => n + 1);
    pipeline.add((n) => n + 2);

    await pipeline.run(0);

    assert.strictEqual(pipeline.stageErrorEvents.length, 0);
  });

  void it('onRunError fires when any stage throws', async () => {
    const pipeline = ObservingPipeline.create<number>();
    pipeline.add((_n) => { throw new Error('fail'); });

    await assert.rejects(() => { return pipeline.run(0); });

    assert.strictEqual(pipeline.runErrorEvents.length, 1);
  });

  void it('onRunError receives the PipelineError (wrapped)', async () => {
    const pipeline = ObservingPipeline.create<number>();
    pipeline.add((_n) => { throw new Error('original'); });

    await assert.rejects(() => { return pipeline.run(0); });

    assert.ok(pipeline.runErrorEvents[0]?.error instanceof PipelineError);
  });

  void it('onStageError fires before onRunError', async () => {
    const order: string[] = [];

    class OrderedErrorPipeline extends Pipeline<number> {
      protected override onStageError(_index: number, _error: unknown): void {
        order.push('onStageError');
      }

      protected override onRunError(_error: unknown): void {
        order.push('onRunError');
      }
    }

    const pipeline = OrderedErrorPipeline.create();
    pipeline.add((_n) => { throw new Error('fail'); });

    await assert.rejects(() => { return pipeline.run(0); });

    assert.deepStrictEqual(order, ['onStageError', 'onRunError']);
  });

  void it('onStageStart fires for erroring stage but onStageSuccess does not, for successful stages onStageSuccess fires', async () => {
    const pipeline = ObservingPipeline.create<number>();
    pipeline.add((n) => n + 1); // stage 0 — succeeds
    pipeline.add((_n) => { throw new Error('fail at stage 1'); }); // stage 1 — fails

    await assert.rejects(() => { return pipeline.run(0); });

    // onStageStart fired for indices 0 and 1
    assert.strictEqual(pipeline.stageStartEvents.length, 2);
    assert.strictEqual(pipeline.stageStartEvents[0]?.index, 0);
    assert.strictEqual(pipeline.stageStartEvents[1]?.index, 1);

    // onStageSuccess only fired for index 0 (not index 1)
    assert.strictEqual(pipeline.stageSuccessEvents.length, 1);
    assert.strictEqual(pipeline.stageSuccessEvents[0]?.index, 0);
  });

  void it('onStageStart and onStageSuccess do not fire when pipeline has no stages', async () => {
    const pipeline = ObservingPipeline.create<number>();

    await pipeline.run(0);

    assert.strictEqual(pipeline.stageStartEvents.length, 0);
    assert.strictEqual(pipeline.stageSuccessEvents.length, 0);
  });
});
