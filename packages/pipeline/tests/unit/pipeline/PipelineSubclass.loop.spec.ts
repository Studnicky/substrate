import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { HookInvocationError } from '@studnicky/errors';

import type { PipelineFunctionInterface } from '../../../src/interfaces/PipelineFunctionInterface.js';
import type { PipelineOptionsEntity } from '../../../src/entities/PipelineOptionsEntity.js';

import { Pipeline } from '../../../src/pipeline/Pipeline.js';
import { PipelineError } from '../../../src/errors/PipelineError.js';
import scenarioGroups from './PipelineSubclass.scenarios.json' with { type: 'json' };

type StageSpec =
  | { shape: 'add'; value: number }
  | { shape: 'identity' }
  | { shape: 'mul'; value: number }
  | { shape: 'sub'; value: number }
  | { shape: 'throw'; message: string };

type ScenarioShape =
  | 'after-stage-gets-stage-output'
  | 'after-stage-throw-does-not-trigger-run-error'
  | 'before-after-order'
  | 'before-stage-gets-prior-output'
  | 'before-stage-throw-does-not-trigger-run-error'
  | 'hooks-called-with-no-stages'
  | 'no-hooks-no-stages'
  | 'no-stage-hooks-with-empty-pipeline'
  | 'on-run-complete-throw-does-not-trigger-run-error'
  | 'on-run-start-throw-does-not-trigger-run-error'
  | 'protected-fns-length'
  | 'run-complete-after-stages'
  | 'run-complete-return-value'
  | 'run-error-contains-pipeline-error'
  | 'run-error-on-throw'
  | 'run-start-before-stages'
  | 'run-start-original-value'
  | 'run-start-return-passed-to-first-stage'
  | 'single-stage-before-after'
  | 'stage-error-before-run-error'
  | 'stage-error-not-on-success'
  | 'stage-error-on-throw'
  | 'stage-start-after-before-stage'
  | 'stage-start-order'
  | 'stage-success-before-after-stage'
  | 'stage-success-output'
  | 'throwing-on-run-error'
  | 'throwing-on-stage-error'
  | 'throwing-on-stage-start'
  | 'throwing-on-stage-success'
  | 'tracing-pipeline-result';

type ScenarioCase = {
  description: string;
  expected: Record<string, unknown>;
  input: Record<string, unknown>;
  shape: ScenarioShape;
  name: string;
};

type StageBuilder = (spec: StageSpec) => (ctx: number) => number;
type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void>;

const stageBuilderMap: Record<StageSpec['shape'], StageBuilder> = {
  add: (spec) => {
    if (!('value' in spec)) {
      throw new Error('Add stage spec requires a value');
    }
    return (ctx: number) => ctx + spec.value;
  },
  identity: () => (ctx: number) => ctx,
  mul: (spec) => {
    if (!('value' in spec)) {
      throw new Error('Mul stage spec requires a value');
    }
    return (ctx: number) => ctx * spec.value;
  },
  sub: (spec) => {
    if (!('value' in spec)) {
      throw new Error('Sub stage spec requires a value');
    }
    return (ctx: number) => ctx - spec.value;
  },
  throw: (spec) => {
    if (!('message' in spec)) {
      throw new Error('Throw stage spec requires a message');
    }
    return () => { throw new Error(spec.message); };
  }
};

function buildStage(spec: StageSpec): (ctx: number) => number {
  return stageBuilderMap[spec.shape](spec);
}

function buildStages(specs: StageSpec[]): Array<(ctx: number) => number> {
  return specs.map((spec) => buildStage(spec));
}

class TracingPipeline<T> extends Pipeline<T> {
  public constructor(
    stages: readonly PipelineFunctionInterface<T>[],
    options?: Readonly<PipelineOptionsEntity.Type>
  ) {
    super(stages, options);
  }

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

class BracketPipeline extends Pipeline<number> {
  public constructor(
    stages: readonly PipelineFunctionInterface<number>[],
    options?: Readonly<PipelineOptionsEntity.Type>
  ) {
    super(stages, options);
  }

  runCompleteCalled = false;
  runCompleteCtx = -1;
  runStartCalled = false;
  runStartCtx = -1;

  override onRunStart(ctx: number): number {
    this.runStartCalled = true;
    this.runStartCtx = ctx;
    return ctx + 1000;
  }

  override onRunComplete(ctx: number): number {
    this.runCompleteCalled = true;
    this.runCompleteCtx = ctx;
    return ctx - 1000;
  }
}

class ObservingPipeline<T> extends Pipeline<T> {
  public constructor(
    stages: readonly PipelineFunctionInterface<T>[],
    options?: Readonly<PipelineOptionsEntity.Type>
  ) {
    super(stages, options);
  }

  readonly runErrorEvents: Array<{ error: Error }> = [];
  readonly stageErrorEvents: Array<{ error: Error; index: number }> = [];
  readonly stageStartEvents: Array<{ ctx: T; index: number }> = [];
  readonly stageSuccessEvents: Array<{ ctx: T; index: number }> = [];

  protected override onStageStart(index: number, ctx: T): void {
    this.stageStartEvents.push({ ctx, index });
  }

  protected override onStageSuccess(index: number, ctx: T): void {
    this.stageSuccessEvents.push({ ctx, index });
  }

  protected override onStageError(index: number, error: Error): void {
    this.stageErrorEvents.push({ error, index });
  }

  protected override onRunError(error: Error): void {
    this.runErrorEvents.push({ error });
  }
}

const runnerMap: Record<ScenarioShape, ScenarioRunner> = {
  'before-after-order': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { trace: Array<{ hook: string; index: number }> };
      const pipeline = new TracingPipeline<number>(buildStages(input.stages));
      await pipeline.run(input.ctx);
      assert.deepStrictEqual(pipeline.trace, expected.trace);
    },
  'no-hooks-no-stages': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: string; stages: StageSpec[] };
      const expected = scenarioCase.expected as { traceLength: number };
      const stages: Array<(ctx: string) => string> = input.stages.map((spec) => {
        throw new Error(`no-hooks-no-stages scenario must have zero stages, got: ${spec.shape}`);
      });
      const pipeline = new TracingPipeline<string>(stages);
      await pipeline.run(input.ctx);
      assert.strictEqual(pipeline.trace.length, expected.traceLength);
    },
  'single-stage-before-after': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { trace: Array<{ hook: string; index: number }> };
      const pipeline = new TracingPipeline<number>(buildStages(input.stages));
      await pipeline.run(input.ctx);
      assert.deepStrictEqual(pipeline.trace, expected.trace);
    },
  'tracing-pipeline-result': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { result: number };
      const pipeline = new TracingPipeline<number>(buildStages(input.stages));
      const result = await pipeline.run(input.ctx);
      assert.strictEqual(result, expected.result);
    },
  'before-stage-gets-prior-output': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { receivedCtxAtBefore: number[] };
      const receivedCtxAtBefore: number[] = [];
      class CaptureBefore extends Pipeline<number> {
        override beforeStage(ctx: number, index: number): number {
          receivedCtxAtBefore[index] = ctx;
          return ctx;
        }
      }
      const pipeline = CaptureBefore.create(buildStages(input.stages));
      await pipeline.run(input.ctx);
      assert.deepStrictEqual(receivedCtxAtBefore, expected.receivedCtxAtBefore);
    },
  'after-stage-gets-stage-output': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { receivedCtxAtAfter: number[] };
      const receivedCtxAtAfter: number[] = [];
      class CaptureAfter extends Pipeline<number> {
        override afterStage(ctx: number, index: number): number {
          receivedCtxAtAfter[index] = ctx;
          return ctx;
        }
      }
      const pipeline = CaptureAfter.create(buildStages(input.stages));
      await pipeline.run(input.ctx);
      assert.deepStrictEqual(receivedCtxAtAfter, expected.receivedCtxAtAfter);
    },
  'run-start-before-stages': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { runStartCalled: boolean };
      const pipeline = new BracketPipeline(buildStages(input.stages));
      await pipeline.run(input.ctx);
      assert.strictEqual(pipeline.runStartCalled, expected.runStartCalled);
    },
  'run-complete-after-stages': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { runCompleteCalled: boolean };
      const pipeline = new BracketPipeline(buildStages(input.stages));
      await pipeline.run(input.ctx);
      assert.strictEqual(pipeline.runCompleteCalled, expected.runCompleteCalled);
    },
  'run-start-original-value': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { runStartCtx: number };
      const pipeline = new BracketPipeline(buildStages(input.stages));
      await pipeline.run(input.ctx);
      assert.strictEqual(pipeline.runStartCtx, expected.runStartCtx);
    },
  'run-start-return-passed-to-first-stage': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { stageInput: number };
      let stageInput = -1;
      const pipeline = new BracketPipeline([
        (ctx: number) => {
          stageInput = ctx;
          return ctx;
        }
      ]);
      await pipeline.run(input.ctx);
      assert.strictEqual(stageInput, expected.stageInput);
    },
  'run-complete-return-value': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { result: number };
      const pipeline = new BracketPipeline(buildStages(input.stages));
      const result = await pipeline.run(input.ctx);
      assert.strictEqual(result, expected.result);
    },
  'hooks-called-with-no-stages': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { runCompleteCalled: boolean; runStartCalled: boolean };
      const pipeline = new BracketPipeline(buildStages(input.stages));
      await pipeline.run(input.ctx);
      assert.strictEqual(pipeline.runStartCalled, expected.runStartCalled);
      assert.strictEqual(pipeline.runCompleteCalled, expected.runCompleteCalled);
    },
  'protected-fns-length': async (scenarioCase) => {
      const input = scenarioCase.input as { stages: StageSpec[] };
      const expected = scenarioCase.expected as { stageCount: number };
      class InspectPipeline<T> extends Pipeline<T> {
        public constructor(stages: readonly PipelineFunctionInterface<T>[]) {
          super(stages);
        }

        fnCount(): number {
          return this.fns.length;
        }
      }
      const pipeline = new InspectPipeline<number>(buildStages(input.stages));
      assert.strictEqual(pipeline.fnCount(), expected.stageCount);
    },
  'stage-start-order': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { stageStartIndexes: number[] };
      const pipeline = new ObservingPipeline<number>(buildStages(input.stages));
      await pipeline.run(input.ctx);
      assert.deepStrictEqual(pipeline.stageStartEvents.map((entry) => entry.index), expected.stageStartIndexes);
    },
  'stage-success-output': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { stageSuccessValues: number[] };
      const pipeline = new ObservingPipeline<number>(buildStages(input.stages));
      await pipeline.run(input.ctx);
      assert.deepStrictEqual(pipeline.stageSuccessEvents.map((entry) => entry.ctx), expected.stageSuccessValues);
    },
  'stage-start-after-before-stage': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { stageStartCtx: number };
      class ShiftingPipeline extends ObservingPipeline<number> {
        override beforeStage(ctx: number): number {
          return ctx + 100;
        }
      }
      const pipeline = new ShiftingPipeline(buildStages(input.stages));
      await pipeline.run(input.ctx);
      assert.strictEqual(pipeline.stageStartEvents[0]?.ctx, expected.stageStartCtx);
    },
  'stage-success-before-after-stage': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { order: string[] };
      const order: string[] = [];
      class OrderPipeline extends Pipeline<number> {
        protected override onStageSuccess(_index: number, _ctx: number): void {
          order.push('onStageSuccess');
        }

        protected override afterStage(ctx: number, _index: number): number {
          order.push('afterStage');
          return ctx;
        }
      }
      const pipeline = OrderPipeline.create(buildStages(input.stages));
      await pipeline.run(input.ctx);
      assert.deepStrictEqual(order, expected.order);
    },
  'stage-error-on-throw': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { stageErrorIndex: number; stageErrorMessage: string };
      const pipeline = new ObservingPipeline<number>(buildStages(input.stages));
      await assert.rejects(() => pipeline.run(input.ctx));
      assert.strictEqual(pipeline.stageErrorEvents.length, 1);
      assert.strictEqual(pipeline.stageErrorEvents[0]?.index, expected.stageErrorIndex);
      assert.strictEqual((pipeline.stageErrorEvents[0]!.error as Error).message, expected.stageErrorMessage);
    },
  'stage-error-not-on-success': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { stageErrorCount: number };
      const pipeline = new ObservingPipeline<number>(buildStages(input.stages));
      await pipeline.run(input.ctx);
      assert.strictEqual(pipeline.stageErrorEvents.length, expected.stageErrorCount);
    },
  'run-error-on-throw': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { runErrorCount: number };
      const pipeline = new ObservingPipeline<number>(buildStages(input.stages));
      await assert.rejects(() => pipeline.run(input.ctx));
      assert.strictEqual(pipeline.runErrorEvents.length, expected.runErrorCount);
    },
  'run-error-contains-pipeline-error': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { errorInstanceOf: string };
      const pipeline = new ObservingPipeline<number>(buildStages(input.stages));
      await assert.rejects(() => pipeline.run(input.ctx));
      assert.ok(pipeline.runErrorEvents[0]?.error instanceof PipelineError);
      assert.strictEqual(expected.errorInstanceOf, 'PipelineError');
    },
  'stage-error-before-run-error': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { order: string[] };
      const order: string[] = [];
      class OrderedErrorPipeline extends Pipeline<number> {
        protected override onStageError(_index: number, _error: Error): void {
          order.push('onStageError');
        }

        protected override onRunError(_error: Error): void {
          order.push('onRunError');
        }
      }
      const pipeline = OrderedErrorPipeline.create(buildStages(input.stages));
      await assert.rejects(() => pipeline.run(input.ctx));
      assert.deepStrictEqual(order, expected.order);
    },
  'no-stage-hooks-with-empty-pipeline': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { stageStartCount: number; stageSuccessCount: number };
      const pipeline = new ObservingPipeline<number>(buildStages(input.stages));
      await pipeline.run(input.ctx);
      assert.strictEqual(pipeline.stageStartEvents.length, expected.stageStartCount);
      assert.strictEqual(pipeline.stageSuccessEvents.length, expected.stageSuccessCount);
    },
  'throwing-on-stage-start': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { errorName: string };
      class ThrowingStartPipeline extends Pipeline<number> {
        protected override onStageStart(): void {
          throw new Error('onStageStart boom');
        }
      }
      const pipeline = ThrowingStartPipeline.create(buildStages(input.stages));
      await assert.rejects(() => pipeline.run(input.ctx), HookInvocationError);
      assert.strictEqual(expected.errorName, 'HookInvocationError');
    },
  'throwing-on-stage-success': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { errorName: string };
      class ThrowingSuccessPipeline extends Pipeline<number> {
        protected override onStageSuccess(): void {
          throw new Error('onStageSuccess boom');
        }
      }
      const pipeline = ThrowingSuccessPipeline.create(buildStages(input.stages));
      await assert.rejects(() => pipeline.run(input.ctx), HookInvocationError);
      assert.strictEqual(expected.errorName, 'HookInvocationError');
    },
  'throwing-on-stage-error': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { errorName: string };
      class ThrowingStageErrorPipeline extends Pipeline<number> {
        protected override onStageError(): void {
          throw new Error('onStageError boom');
        }
      }
      const pipeline = ThrowingStageErrorPipeline.create(buildStages(input.stages));
      await assert.rejects(() => pipeline.run(input.ctx), HookInvocationError);
      assert.strictEqual(expected.errorName, 'HookInvocationError');
    },
  'throwing-on-run-error': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { errorName: string };
      class ThrowingRunErrorPipeline extends Pipeline<number> {
        protected override onRunError(): void {
          throw new Error('onRunError boom');
        }
      }
      const pipeline = ThrowingRunErrorPipeline.create(buildStages(input.stages));
      await assert.rejects(() => pipeline.run(input.ctx), HookInvocationError);
      assert.strictEqual(expected.errorName, 'HookInvocationError');
    },
  'before-stage-throw-does-not-trigger-run-error': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { runErrorCount: number; rawMessage: string };
      const rawError = new Error(expected.rawMessage);
      class ThrowingBeforeStagePipeline extends ObservingPipeline<number> {
        protected override beforeStage(): number {
          throw rawError;
        }
      }
      const pipeline = new ThrowingBeforeStagePipeline(buildStages(input.stages));
      await assert.rejects(async () => {
        try {
          await pipeline.run(input.ctx);
        } catch (error) {
          assert.strictEqual(error, rawError);
          throw error;
        }
      });
      assert.strictEqual(pipeline.runErrorEvents.length, expected.runErrorCount);
    },
  'after-stage-throw-does-not-trigger-run-error': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { runErrorCount: number; rawMessage: string };
      const rawError = new Error(expected.rawMessage);
      class ThrowingAfterStagePipeline extends ObservingPipeline<number> {
        protected override afterStage(): number {
          throw rawError;
        }
      }
      const pipeline = new ThrowingAfterStagePipeline(buildStages(input.stages));
      await assert.rejects(async () => {
        try {
          await pipeline.run(input.ctx);
        } catch (error) {
          assert.strictEqual(error, rawError);
          throw error;
        }
      });
      assert.strictEqual(pipeline.runErrorEvents.length, expected.runErrorCount);
    },
  'on-run-start-throw-does-not-trigger-run-error': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { runErrorCount: number; rawMessage: string };
      const rawError = new Error(expected.rawMessage);
      class ThrowingRunStartPipeline extends ObservingPipeline<number> {
        protected override onRunStart(): number {
          throw rawError;
        }
      }
      const pipeline = new ThrowingRunStartPipeline(buildStages(input.stages));
      await assert.rejects(async () => {
        try {
          await pipeline.run(input.ctx);
        } catch (error) {
          assert.strictEqual(error, rawError);
          throw error;
        }
      });
      assert.strictEqual(pipeline.runErrorEvents.length, expected.runErrorCount);
    },
  'on-run-complete-throw-does-not-trigger-run-error': async (scenarioCase) => {
      const input = scenarioCase.input as { ctx: number; stages: StageSpec[] };
      const expected = scenarioCase.expected as { runErrorCount: number; rawMessage: string };
      const rawError = new Error(expected.rawMessage);
      class ThrowingRunCompletePipeline extends ObservingPipeline<number> {
        protected override onRunComplete(): number {
          throw rawError;
        }
      }
      const pipeline = new ThrowingRunCompletePipeline(buildStages(input.stages));
      await assert.rejects(async () => {
        try {
          await pipeline.run(input.ctx);
        } catch (error) {
          assert.strictEqual(error, rawError);
          throw error;
        }
      });
      assert.strictEqual(pipeline.runErrorEvents.length, expected.runErrorCount);
    }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Pipeline subclass extension', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
