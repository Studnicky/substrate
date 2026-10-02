import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { RuntimeError } from '@studnicky/errors/node';
import { FrozenMutationError } from '@studnicky/json/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PipelineFunctionInterface } from '../../../src/interfaces/PipelineFunctionInterface.js';

import { Pipeline } from '../../../src/pipeline/Pipeline.js';
import { ValueContextObjectEntity } from './entities/common/ValueContextObjectEntity.js';
import { PipelineScenarioCaseEntity } from './entities/PipelineScenarioCaseEntity.js';
import scenarioGroups from './Pipeline.scenarios.json' with { 'type': 'json' };

class ObserverDeadline {
  static async settleWithin<T>(completion: Promise<T>): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => { reject(RuntimeError.create('Pipeline observer delayed the run')); }, 100);
    });

    try {
      const result = await Promise.race([completion, deadline]);
      return result;
    } finally {
      clearTimeout(timeout);
    }
  }
}

class NonCloneableFixture {
  static callback(): void {}
}

class PipelineRunners {
  static async 'async-observer-has-no-effect'(scenarioCase: ScenarioCaseOfType<PipelineScenarioCaseEntity.Type, 'async-observer-has-no-effect'>): Promise<void> {
    class ResolvingHookPipeline extends Pipeline<number> {
      protected override onStageSuccess(): Promise<void> {
        const result = Promise.resolve();
        return result;
      }
    }

    const pipeline = ResolvingHookPipeline.create(PipelineRunners.buildNumberStages(scenarioCase.input.stages));
    const result = await pipeline.run(scenarioCase.input.value);
    assert.strictEqual(result, scenarioCase.expected.value);
  }

  static async 'does-not-mutate-original-input'(scenarioCase: ScenarioCaseOfType<PipelineScenarioCaseEntity.Type, 'does-not-mutate-original-input'>): Promise<void> {
    const pipeline = Pipeline.create<number[]>([(values) => {
      const result = [...values, 99];
      return result;
    }]);
    const original = [...scenarioCase.expected.original];
    const result = await pipeline.run(original);
    assert.deepStrictEqual(original, scenarioCase.expected.original);
    assert.deepStrictEqual(result, scenarioCase.expected.value);
  }

  static async 'empty-pipeline-returns-input'(scenarioCase: ScenarioCaseOfType<PipelineScenarioCaseEntity.Type, 'empty-pipeline-returns-input'>): Promise<void> {
    const pipeline = Pipeline.create<string>([]);
    const result = await pipeline.run(scenarioCase.input.value);
    assert.strictEqual(result, scenarioCase.expected.value);
  }

  static async 'hanging-observer-has-no-effect'(scenarioCase: ScenarioCaseOfType<PipelineScenarioCaseEntity.Type, 'hanging-observer-has-no-effect'>): Promise<void> {
    class HangingHookPipeline extends Pipeline<number> {
      protected override onStageStart(): Promise<void> {
        return new Promise<void>(() => {});
      }
    }

    const pipeline = HangingHookPipeline.create(PipelineRunners.buildNumberStages(scenarioCase.input.stages));
    const result = await ObserverDeadline.settleWithin(pipeline.run(scenarioCase.input.value));
    assert.strictEqual(result, scenarioCase.expected.value);
  }

  static async 'mixed-sync-async-stages'(scenarioCase: ScenarioCaseOfType<PipelineScenarioCaseEntity.Type, 'mixed-sync-async-stages'>): Promise<void> {
    const pipeline = Pipeline.create<string>([
      async (value) => {
        await Promise.resolve();
        const result = `${value} async`;
        return result;
      },
      (value) => {
        const result = `${value} sync`;
        return result;
      }
    ]);
    const result = await pipeline.run(scenarioCase.input.value);
    assert.strictEqual(result, scenarioCase.expected.value);
  }

  static async 'multiple-stages-apply-all'(scenarioCase: ScenarioCaseOfType<PipelineScenarioCaseEntity.Type, 'multiple-stages-apply-all'>): Promise<void> {
    const pipeline = Pipeline.create<number>([(value) => {
      const result = value + 1;
      return result;
    }, (value) => {
      const result = value * 2;
      return result;
    }]);
    const result = await pipeline.run(scenarioCase.input.value);
    assert.strictEqual(result, scenarioCase.expected.value);
  }

  static async 'object-context-pass-through'(scenarioCase: ScenarioCaseOfType<PipelineScenarioCaseEntity.Type, 'object-context-pass-through'>): Promise<void> {
    const pipeline = Pipeline.create<typeof scenarioCase.input.value>([
      (context) => {
        const result = { ...context, 'count': context.count + 1 };
        return result;
      },
      (context) => {
        const result = ValueContextObjectEntity.intake({ 'count': context.count, 'label': `${context.label}!` });
        return result;
      }
    ]);
    const result = await pipeline.run(scenarioCase.input.value);
    assert.strictEqual(result.count, scenarioCase.expected.value.count);
    assert.strictEqual(result.label, scenarioCase.expected.value.label);
  }

  static async 'single-async-stage-applies'(scenarioCase: ScenarioCaseOfType<PipelineScenarioCaseEntity.Type, 'single-async-stage-applies'>): Promise<void> {
    const pipeline = Pipeline.create<string>([async (value) => {
      await Promise.resolve();
      const result = `${value} world`;
      return result;
    }]);
    const result = await pipeline.run(scenarioCase.input.value);
    assert.strictEqual(result, scenarioCase.expected.value);
  }

  static async 'single-stage-applies'(scenarioCase: ScenarioCaseOfType<PipelineScenarioCaseEntity.Type, 'single-stage-applies'>): Promise<void> {
    const pipeline = Pipeline.create<number>([(n) => {
      const result = n + 1;
      return result;
    }]);
    const result = await pipeline.run(scenarioCase.input.value);
    assert.strictEqual(result, scenarioCase.expected.value);
  }

  static async 'stages-is-defensive-snapshot'(scenarioCase: ScenarioCaseOfType<PipelineScenarioCaseEntity.Type, 'stages-is-defensive-snapshot'>): Promise<void> {
    const pipeline = Pipeline.create<number>([(n) => {
      const result = n + 1;
      return result;
    }]);
    const snapshot = pipeline.stages;
    Reflect.set(snapshot, 0, (n: number) => {
      const result = n + 100;
      return result;
    });
    const result = await pipeline.run(scenarioCase.input.value);
    assert.strictEqual(result, scenarioCase.expected.value);
  }

  static async 'throwing-lifecycle-observer-has-no-effect'(scenarioCase: ScenarioCaseOfType<PipelineScenarioCaseEntity.Type, 'throwing-lifecycle-observer-has-no-effect'>): Promise<void> {
    class ThrowingHookPipeline extends Pipeline<number> {
      protected override onStageStart(): void {
        throw RuntimeError.create('onStageStart boom');
      }
    }

    const pipeline = ThrowingHookPipeline.create<number>([(value) => {
      const result = value + 1;
      return result;
    }]);
    const result = await pipeline.run(scenarioCase.input.value);
    assert.strictEqual(result, scenarioCase.input.value + 1);
  }

  private static buildNumberStages(specs: ScenarioCaseOfType<PipelineScenarioCaseEntity.Type, 'async-observer-has-no-effect'>['input']['stages']): ((value: number) => number)[] {
    const stages = specs.map((spec) => {
      const stage = (value: number): number => {
        const result = value + spec.value;
        return result;
      };
      return stage;
    });
    return stages;
  }

}

void describe('Pipeline lifecycle observer isolation', () => {
  void it('settles success and failure with never-settling observers', async () => {
    class HangingObservers extends Pipeline<number> {
      protected override onRunStart(): Promise<void> { return new Promise<void>(() => {}); }
      protected override onStageStart(): Promise<void> { return new Promise<void>(() => {}); }
      protected override onStageSuccess(): Promise<void> { return new Promise<void>(() => {}); }
      protected override onStageError(): Promise<void> { return new Promise<void>(() => {}); }
      protected override onRunError(): Promise<void> { return new Promise<void>(() => {}); }
      protected override onRunComplete(): Promise<void> { return new Promise<void>(() => {}); }
    }

    const successful = HangingObservers.create<number>([(value) => {
      const result = value + 1;
      return result;
    }]);
    assert.strictEqual(await ObserverDeadline.settleWithin(successful.run(1)), 2);

    const failure = RuntimeError.create('stage failed');
    const failing = HangingObservers.create<number>([() => { throw failure; }]);
    await assert.rejects(() => {
      const result = ObserverDeadline.settleWithin(failing.run(1));
      return result;
    }, (error: unknown): boolean => {
      assert.strictEqual(error, failure);
      return true;
    });
  });

  void it('settles success and failure with rejecting observers', async () => {
    class RejectingObservers extends Pipeline<number> {
      protected override onRunStart(): Promise<void> {
        const result = Promise.reject(RuntimeError.create('run start observer'));
        return result;
      }
      protected override onStageStart(): Promise<void> {
        const result = Promise.reject(RuntimeError.create('stage start observer'));
        return result;
      }
      protected override onStageSuccess(): Promise<void> {
        const result = Promise.reject(RuntimeError.create('stage success observer'));
        return result;
      }
      protected override onStageError(): Promise<void> {
        const result = Promise.reject(RuntimeError.create('stage error observer'));
        return result;
      }
      protected override onRunError(): Promise<void> {
        const result = Promise.reject(RuntimeError.create('run error observer'));
        return result;
      }
      protected override onRunComplete(): Promise<void> {
        const result = Promise.reject(RuntimeError.create('run complete observer'));
        return result;
      }
    }

    const successful = RejectingObservers.create<number>([(value) => {
      const result = value + 1;
      return result;
    }]);
    assert.strictEqual(await ObserverDeadline.settleWithin(successful.run(1)), 2);

    const failure = RuntimeError.create('stage failed');
    const failing = RejectingObservers.create<number>([() => { throw failure; }]);
    await assert.rejects(() => {
      const result = ObserverDeadline.settleWithin(failing.run(1));
      return result;
    }, (error: unknown): boolean => {
      assert.strictEqual(error, failure);
      return true;
    });
  });
});

void describe('Pipeline readonly observer contexts', () => {
  const readonlyContext = { 'count': 0, 'label': 'input' };

  class ReadonlyObserverPipeline extends Pipeline<typeof readonlyContext> {
    public constructor(stages: readonly PipelineFunctionInterface<typeof readonlyContext>[]) {
      super(stages);
    }

    readonly runStartContexts: Readonly<typeof readonlyContext>[] = [];
    readonly stageSuccessContexts: Readonly<typeof readonlyContext>[] = [];

    public async assertBaseObserverAcceptsReadonlyContext(context: Readonly<typeof readonlyContext>): Promise<void> {
      await super.onRunStart(context);
    }

    protected override onRunStart(context: Readonly<typeof readonlyContext>): void {
      this.runStartContexts.push(context);
    }

    protected override onStageSuccess(_index: number, context: Readonly<typeof readonlyContext>): void {
      this.stageSuccessContexts.push(context);
    }
  }

  void it('provides readonly observer views while transform hooks retain context transformation', async () => {
    const pipeline = new ReadonlyObserverPipeline([
      (context) => {
        const result = { ...context, 'count': context.count + 1 };
        return result;
      },
      (context) => {
        const result = { ...context, 'label': `${context.label}!` };
        return result;
      }
    ]);
    await pipeline.assertBaseObserverAcceptsReadonlyContext(readonlyContext);

    const result = await pipeline.run(readonlyContext);

    assert.deepStrictEqual(result, { 'count': 1, 'label': 'input!' });
    assert.deepStrictEqual(pipeline.runStartContexts, [{ 'count': 0, 'label': 'input' }]);
    assert.deepStrictEqual(pipeline.stageSuccessContexts, [
      { 'count': 1, 'label': 'input' },
      { 'count': 1, 'label': 'input!' }
    ]);
  });
});

void describe('Pipeline observer snapshot ownership', () => {
  const snapshotInput = {
    'nested': { 'count': 1 },
    'records': new Map([['team', new Set([{ 'count': 1 }])]])
  };

  class SnapshotMutationPipeline extends Pipeline<typeof snapshotInput> {
    public constructor(stages: readonly PipelineFunctionInterface<typeof snapshotInput>[]) { super(stages); }

    readonly observations: string[] = [];

    protected override onRunStart(context: Readonly<typeof snapshotInput>): void {
      assert.strictEqual(Reflect.set(context.nested, 'count', 99), false);
      assert.throws(() => { context.records.set('other', new Set()); }, FrozenMutationError);
      this.observations.push('run-start');
    }

    protected override onStageStart(_index: number, context: Readonly<typeof snapshotInput>): void {
      const members = context.records.get('team');
      assert.ok(members !== undefined);
      assert.throws(() => { members.add({ 'count': 99 }); }, FrozenMutationError);
      this.observations.push('stage-start');
    }

    protected override onStageSuccess(_index: number, context: Readonly<typeof snapshotInput>): void {
      assert.strictEqual(Reflect.set(context.nested, 'count', 99), false);
      this.observations.push('stage-success');
    }

    protected override onRunComplete(context: Readonly<typeof snapshotInput>): void {
      const members = context.records.get('team');
      assert.ok(members !== undefined);
      assert.throws(() => { members.add({ 'count': 100 }); }, FrozenMutationError);
      this.observations.push('run-complete');
    }
  }

  void it('isolates nested object, Map, and Set observer mutation attempts', async () => {
    const input = snapshotInput;
    const pipeline = new SnapshotMutationPipeline([
      (context) => {return { 'nested': { 'count': context.nested.count + 1 }, 'records': context.records };}
    ]);

    const result = await pipeline.run(input);
    const inputMembers = input.records.get('team');
    const resultMembers = result.records.get('team');

    assert.deepStrictEqual(pipeline.observations, ['run-start', 'stage-start', 'stage-success', 'run-complete']);
    assert.strictEqual(input.nested.count, 1);
    assert.strictEqual(input.records.has('other'), false);
    assert.strictEqual(inputMembers?.size, 1);
    assert.strictEqual(result.nested.count, 2);
    assert.strictEqual(result.records.has('other'), false);
    assert.strictEqual(resultMembers?.size, 1);
  });

  void it('skips context observers when their data cannot be snapshotted', async () => {
    const nonCloneableInput = { 'callback': NonCloneableFixture.callback, 'value': 1 };

    class NonCloneableObserverPipeline extends Pipeline<typeof nonCloneableInput> {
      public constructor(stages: readonly PipelineFunctionInterface<typeof nonCloneableInput>[]) { super(stages); }

      readonly contextObserverCalls: string[] = [];

      protected override onRunStart(): void { this.contextObserverCalls.push('run-start'); }
      protected override onStageStart(): void { this.contextObserverCalls.push('stage-start'); }
      protected override onStageSuccess(): void { this.contextObserverCalls.push('stage-success'); }
      protected override onRunComplete(): void { this.contextObserverCalls.push('run-complete'); }
    }

    const pipeline = new NonCloneableObserverPipeline([
      (context) => {return { 'callback': context.callback, 'value': context.value + 1 };}
    ]);
    const result = await pipeline.run(nonCloneableInput);

    assert.strictEqual(result.value, 2);
    assert.strictEqual(result.callback, NonCloneableFixture.callback);
    assert.deepStrictEqual(pipeline.contextObserverCalls, []);
  });

  void it('preserves exact stage errors when context snapshots cannot be created', async () => {
    const nonCloneableInput = { 'callback': NonCloneableFixture.callback, 'value': 1 };

    class ErrorObserverPipeline extends Pipeline<typeof nonCloneableInput> {
      public constructor(stages: readonly PipelineFunctionInterface<typeof nonCloneableInput>[]) { super(stages); }

      readonly errors: unknown[] = [];

      protected override onStageError(_index: number, error: unknown): void { this.errors.push(error); }
      protected override onRunError(error: unknown): void { this.errors.push(error); }
    }

    const expected = RuntimeError.create('stage failure');
    const pipeline = new ErrorObserverPipeline([
      () => { throw expected; }
    ]);

    await assert.rejects(() => {
      const result = pipeline.run(nonCloneableInput);
      return result;
    }, (error: unknown): boolean => {
      assert.strictEqual(error, expected);
      return true;
    });
    assert.deepStrictEqual(pipeline.errors, [expected, expected]);
  });

  void it('owns the stage list supplied at construction', async () => {
    const callerStages: PipelineFunctionInterface<number>[] = [(value) => {
      const result = value + 1;
      return result;
    }];
    const pipeline = Pipeline.create(callerStages);

    callerStages[0] = (value) => {
      const result = value + 100;
      return result;
    };
    callerStages.push((value) => {
      const result = value * 100;
      return result;
    });

    assert.strictEqual(await pipeline.run(1), 2);
    assert.strictEqual(pipeline.stages.length, 1);
  });
});

ScenarioSuite.register({
  'entity': PipelineScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Pipeline',
  'runners': PipelineRunners
});
