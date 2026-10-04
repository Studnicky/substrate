import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { describe } from 'node:test';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { PipelineFunctionInterface } from '../../../src/interfaces/PipelineFunctionInterface.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { Pipeline } from '../../../src/pipeline/Pipeline.js';
import { PipelineSubclassScenarioCaseEntity } from './entities/PipelineSubclassScenarioCaseEntity.js';
import scenarioGroups from './PipelineSubclass.scenarios.json' with { 'type': 'json' };

class TracingPipeline<T> extends Pipeline<T> {
  public constructor(stages: readonly PipelineFunctionInterface<T>[]) {
    super(stages);
  }

  readonly trace: { 'hook': string; 'index': number }[] = [];

  override beforeStage(context: T, index: number): T {
    this.trace.push({ 'hook': 'before', 'index': index });
    return context;
  }

  override afterStage(context: T, index: number): T {
    this.trace.push({ 'hook': 'after', 'index': index });
    return context;
  }
}

class BracketPipeline extends Pipeline<number> {
  public constructor(stages: readonly PipelineFunctionInterface<number>[]) {
    super(stages);
  }

  runCompleteCalled = false;
  runCompleteContext = -1;
  runStartCalled = false;
  runStartContext = -1;

  override onRunStart(context: number): void {
    this.runStartCalled = true;
    this.runStartContext = context;
  }

  override onRunComplete(context: number): void {
    this.runCompleteCalled = true;
    this.runCompleteContext = context;
  }
}

class ObservingPipeline<T> extends Pipeline<T> {
  public constructor(stages: readonly PipelineFunctionInterface<T>[]) {
    super(stages);
  }

  readonly runErrorEvents: { 'error': unknown }[] = [];
  readonly stageErrorEvents: { 'error': unknown; 'index': number }[] = [];
  readonly stageStartEvents: { 'context': Readonly<T>; 'index': number }[] = [];
  readonly stageSuccessEvents: { 'context': Readonly<T>; 'index': number }[] = [];

  protected override onStageStart(index: number, context: Readonly<T>): void {
    this.stageStartEvents.push({ 'context': context, 'index': index });
  }

  protected override onStageSuccess(index: number, context: Readonly<T>): void {
    this.stageSuccessEvents.push({ 'context': context, 'index': index });
  }

  protected override onStageError(index: number, error: unknown): void {
    this.stageErrorEvents.push({ 'error': error, 'index': index });
  }

  protected override onRunError(error: unknown): void {
    this.runErrorEvents.push({ 'error': error });
  }
}

class PipelineSubclassRunners {
  static async 'after-stage-gets-stage-output'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'after-stage-gets-stage-output'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const receivedContextAtAfter: number[] = [];
    class CaptureAfter extends Pipeline<number> {
      override afterStage(context: number, index: number): number {
        receivedContextAtAfter[index] = context;
        return context;
      }
    }
    const pipeline = CaptureAfter.create(this.buildNumberStages(input.stages));
    await pipeline.run(input.context);
    assert.deepStrictEqual(receivedContextAtAfter, expected.receivedContextAtAfter);
  }

  static async 'after-stage-throw-does-not-trigger-run-error'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'after-stage-throw-does-not-trigger-run-error'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const rawError = RuntimeError.create(expected.rawMessage);
    class ThrowingAfterStagePipeline extends ObservingPipeline<number> {
      protected override afterStage(): number { throw rawError; }
    }
    const pipeline = new ThrowingAfterStagePipeline(this.buildNumberStages(input.stages));
    await assert.rejects(() => {
      const result = pipeline.run(input.context);
      return result;
    }, rawError);
    assert.strictEqual(pipeline.runErrorEvents.length, expected.runErrorCount);
  }

  static async 'before-after-order'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'before-after-order'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const pipeline = new TracingPipeline<number>(this.buildNumberStages(input.stages));
    await pipeline.run(input.context);
    assert.deepStrictEqual(pipeline.trace, expected.trace);
  }

  static async 'before-stage-gets-prior-output'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'before-stage-gets-prior-output'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const receivedContextAtBefore: number[] = [];
    class CaptureBefore extends Pipeline<number> {
      override beforeStage(context: number, index: number): number {
        receivedContextAtBefore[index] = context;
        return context;
      }
    }
    const pipeline = CaptureBefore.create(this.buildNumberStages(input.stages));
    await pipeline.run(input.context);
    assert.deepStrictEqual(receivedContextAtBefore, expected.receivedContextAtBefore);
  }

  static async 'before-stage-throw-does-not-trigger-run-error'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'before-stage-throw-does-not-trigger-run-error'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const rawError = RuntimeError.create(expected.rawMessage);
    class ThrowingBeforeStagePipeline extends ObservingPipeline<number> {
      protected override beforeStage(): number { throw rawError; }
    }
    const pipeline = new ThrowingBeforeStagePipeline(this.buildNumberStages(input.stages));
    await assert.rejects(() => {
      const result = pipeline.run(input.context);
      return result;
    }, rawError);
    assert.strictEqual(pipeline.runErrorEvents.length, expected.runErrorCount);
  }

  static async 'hooks-called-with-no-stages'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'hooks-called-with-no-stages'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const pipeline = new BracketPipeline(this.buildNumberStages(input.stages));
    await pipeline.run(input.context);
    assert.strictEqual(pipeline.runStartCalled, expected.runStartCalled);
    assert.strictEqual(pipeline.runCompleteCalled, expected.runCompleteCalled);
  }

  static async 'no-hooks-no-stages'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'no-hooks-no-stages'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const pipeline = new TracingPipeline<string>([]);
    await pipeline.run(input.context);
    assert.strictEqual(pipeline.trace.length, expected.traceLength);
  }

  static async 'no-stage-hooks-with-empty-pipeline'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'no-stage-hooks-with-empty-pipeline'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const pipeline = new ObservingPipeline<number>(this.buildNumberStages(input.stages));
    await pipeline.run(input.context);
    assert.strictEqual(pipeline.stageStartEvents.length, expected.stageStartCount);
    assert.strictEqual(pipeline.stageSuccessEvents.length, expected.stageSuccessCount);
  }

  static async 'on-run-complete-throw-does-not-trigger-run-error'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'on-run-complete-throw-does-not-trigger-run-error'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const rawError = RuntimeError.create(expected.rawMessage);
    class ThrowingRunCompletePipeline extends ObservingPipeline<number> {
      protected override onRunComplete(): void { throw rawError; }
    }
    const pipeline = new ThrowingRunCompletePipeline(this.buildNumberStages(input.stages));
    assert.strictEqual(await pipeline.run(input.context), input.context + 1);
    assert.strictEqual(pipeline.runErrorEvents.length, expected.runErrorCount);
  }

  static async 'on-run-start-throw-does-not-trigger-run-error'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'on-run-start-throw-does-not-trigger-run-error'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const rawError = RuntimeError.create(expected.rawMessage);
    class ThrowingRunStartPipeline extends ObservingPipeline<number> {
      protected override onRunStart(): void { throw rawError; }
    }
    const pipeline = new ThrowingRunStartPipeline(this.buildNumberStages(input.stages));
    assert.strictEqual(await pipeline.run(input.context), input.context + 1);
    assert.strictEqual(pipeline.runErrorEvents.length, expected.runErrorCount);
  }

  static 'protected-fns-length'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'protected-fns-length'>): void {
    class InspectPipeline<T> extends Pipeline<T> {
      public constructor(stages: readonly PipelineFunctionInterface<T>[]) {
        super(stages);
      }

      stageCount(): number {
        return this.fns.length;
      }
    }
    const pipeline = new InspectPipeline<number>(this.buildNumberStages(scenarioCase.input.stages));
    assert.strictEqual(pipeline.stageCount(), scenarioCase.expected.stageCount);
  }

  static async 'run-complete-after-stages'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'run-complete-after-stages'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const pipeline = new BracketPipeline(this.buildNumberStages(input.stages));
    await pipeline.run(input.context);
    assert.strictEqual(pipeline.runCompleteCalled, expected.runCompleteCalled);
  }

  static async 'run-complete-observer-leaves-result-intact'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'run-complete-observer-leaves-result-intact'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const pipeline = new BracketPipeline(this.buildNumberStages(input.stages));
    const result = await pipeline.run(input.context);
    assert.strictEqual(result, expected.result);
  }

  static async 'run-error-on-throw'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'run-error-on-throw'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const pipeline = new ObservingPipeline<number>(this.buildNumberStages(input.stages));
    await assert.rejects(() => {
      const result = pipeline.run(input.context);
      return result;
    });
    assert.strictEqual(pipeline.runErrorEvents.length, expected.runErrorCount);
  }

  static async 'run-error-receives-original-stage-error'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'run-error-receives-original-stage-error'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const pipeline = new ObservingPipeline<number>(this.buildNumberStages(input.stages));
    await assert.rejects(() => {
      const result = pipeline.run(input.context);
      return result;
    });
    assert.ok(pipeline.runErrorEvents[0]?.error instanceof RuntimeError);
    assert.strictEqual(expected.errorInstanceOf, 'RuntimeError');
  }

  static async 'run-start-before-stages'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'run-start-before-stages'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const pipeline = new BracketPipeline(this.buildNumberStages(input.stages));
    await pipeline.run(input.context);
    assert.strictEqual(pipeline.runStartCalled, expected.runStartCalled);
  }

  static async 'run-start-observer-leaves-first-stage-input'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'run-start-observer-leaves-first-stage-input'>): Promise<void> {
    const { expected, input } = scenarioCase;
    let stageInput = -1;
    const pipeline = new BracketPipeline([(context: number) => {
      stageInput = context;
      return context;
    }]);
    await pipeline.run(input.context);
    assert.strictEqual(stageInput, expected.stageInput);
  }

  static async 'run-start-original-value'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'run-start-original-value'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const pipeline = new BracketPipeline(this.buildNumberStages(input.stages));
    await pipeline.run(input.context);
    assert.strictEqual(pipeline.runStartContext, expected.runStartContext);
  }

  static async 'single-stage-before-after'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'single-stage-before-after'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const pipeline = new TracingPipeline<number>(this.buildNumberStages(input.stages));
    await pipeline.run(input.context);
    assert.deepStrictEqual(pipeline.trace, expected.trace);
  }

  static async 'stage-error-before-run-error'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'stage-error-before-run-error'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const order: string[] = [];
    class OrderedErrorPipeline extends Pipeline<number> {
      protected override onStageError(_index: number, _error: Error): void {
        order.push('onStageError');
      }

      protected override onRunError(_error: Error): void {
        order.push('onRunError');
      }
    }
    const pipeline = OrderedErrorPipeline.create(this.buildNumberStages(input.stages));
    await assert.rejects(() => {
      const result = pipeline.run(input.context);
      return result;
    });
    assert.deepStrictEqual(order, expected.order);
  }

  static async 'stage-error-not-on-success'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'stage-error-not-on-success'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const pipeline = new ObservingPipeline<number>(this.buildNumberStages(input.stages));
    await pipeline.run(input.context);
    assert.strictEqual(pipeline.stageErrorEvents.length, expected.stageErrorCount);
  }

  static async 'stage-error-on-throw'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'stage-error-on-throw'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const pipeline = new ObservingPipeline<number>(this.buildNumberStages(input.stages));
    await assert.rejects(() => {
      const result = pipeline.run(input.context);
      return result;
    });
    assert.strictEqual(pipeline.stageErrorEvents.length, 1);
    assert.strictEqual(pipeline.stageErrorEvents[0]?.index, expected.stageErrorIndex);
    const stageError = pipeline.stageErrorEvents[0]?.error;
    assert.ok(stageError instanceof Error);
    assert.strictEqual(stageError.message, expected.stageErrorMessage);
  }

  static async 'stage-start-after-before-stage'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'stage-start-after-before-stage'>): Promise<void> {
    const { expected, input } = scenarioCase;
    class ShiftingPipeline extends ObservingPipeline<number> {
      override beforeStage(context: number): number {
        const result = context + 100;
        return result;
      }
    }
    const pipeline = new ShiftingPipeline(this.buildNumberStages(input.stages));
    await pipeline.run(input.context);
    assert.strictEqual(pipeline.stageStartEvents[0]?.context, expected.stageStartContext);
  }

  static async 'stage-start-order'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'stage-start-order'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const pipeline = new ObservingPipeline<number>(this.buildNumberStages(input.stages));
    await pipeline.run(input.context);
    const stageStartIndexes = pipeline.stageStartEvents.map((entry) => { return entry.index; });
    assert.deepStrictEqual(stageStartIndexes, expected.stageStartIndexes);
  }

  static async 'stage-success-before-after-stage'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'stage-success-before-after-stage'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const order: string[] = [];
    class OrderPipeline extends Pipeline<number> {
      protected override onStageSuccess(_index: number, _context: number): void {
        order.push('onStageSuccess');
      }

      protected override afterStage(context: number, _index: number): number {
        order.push('afterStage');
        return context;
      }
    }
    const pipeline = OrderPipeline.create(this.buildNumberStages(input.stages));
    await pipeline.run(input.context);
    assert.deepStrictEqual(order, expected.order);
  }

  static async 'stage-success-output'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'stage-success-output'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const pipeline = new ObservingPipeline<number>(this.buildNumberStages(input.stages));
    await pipeline.run(input.context);
    const stageSuccessValues = pipeline.stageSuccessEvents.map((entry) => { return entry.context; });
    assert.deepStrictEqual(stageSuccessValues, expected.stageSuccessValues);
  }

  static async 'throwing-on-run-error'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'throwing-on-run-error'>): Promise<void> {
    class ThrowingRunErrorPipeline extends Pipeline<number> {
      protected override onRunError(): void { throw RuntimeError.create('onRunError boom'); }
    }
    const pipeline = ThrowingRunErrorPipeline.create(this.buildNumberStages(scenarioCase.input.stages));
    await assert.rejects(() => {
      const result = pipeline.run(scenarioCase.input.context);
      return result;
    });
  }

  static async 'throwing-on-stage-error'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'throwing-on-stage-error'>): Promise<void> {
    class ThrowingStageErrorPipeline extends Pipeline<number> {
      protected override onStageError(): void { throw RuntimeError.create('onStageError boom'); }
    }
    const pipeline = ThrowingStageErrorPipeline.create(this.buildNumberStages(scenarioCase.input.stages));
    await assert.rejects(() => {
      const result = pipeline.run(scenarioCase.input.context);
      return result;
    });
  }

  static async 'throwing-on-stage-start'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'throwing-on-stage-start'>): Promise<void> {
    const { expected, input } = scenarioCase;
    class ThrowingStartPipeline extends Pipeline<number> {
      protected override onStageStart(): void { throw RuntimeError.create('onStageStart boom'); }
    }
    const pipeline = ThrowingStartPipeline.create(this.buildNumberStages(input.stages));
    assert.strictEqual(await pipeline.run(input.context), expected.result);
  }

  static async 'throwing-on-stage-success'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'throwing-on-stage-success'>): Promise<void> {
    const { expected, input } = scenarioCase;
    class ThrowingSuccessPipeline extends Pipeline<number> {
      protected override onStageSuccess(): void { throw RuntimeError.create('onStageSuccess boom'); }
    }
    const pipeline = ThrowingSuccessPipeline.create(this.buildNumberStages(input.stages));
    assert.strictEqual(await pipeline.run(input.context), expected.result);
  }

  static async 'tracing-pipeline-result'(scenarioCase: ScenarioCaseOfType<PipelineSubclassScenarioCaseEntity.Type, 'tracing-pipeline-result'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const pipeline = new TracingPipeline<number>(this.buildNumberStages(input.stages));
    const result = await pipeline.run(input.context);
    assert.strictEqual(result, expected.result);
  }

  private static buildNumberStages(specs: PipelineSubclassScenarioCaseEntity.Type['input']['stages']): ((context: number) => number)[] {
    const stages = specs.map((spec) => {
      if (spec.shape === 'identity') {
        return Number;
      }
      if (spec.shape === 'throw') {
        return (): number => { throw RuntimeError.create(spec.message); };
      }
      if (spec.shape === 'add') {
        return (context: number): number => {
          const result = context + spec.value;
          return result;
        };
      }
      if (spec.shape === 'mul') {
        return (context: number): number => {
          const result = context * spec.value;
          return result;
        };
      }
      return (context: number): number => {
        const result = context - spec.value;
        return result;
      };
    });
    return stages;
  }
}

void describe('Pipeline subclass extension', () => {
  ScenarioSuite.register({
    'entity': PipelineSubclassScenarioCaseEntity,
    'file': scenarioGroups,
    'name': 'Pipeline subclass extension',
    'runners': PipelineSubclassRunners
  });
});
