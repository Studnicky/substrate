import { RuntimeError } from '@studnicky/errors/node';
import { FrozenMutationError } from '@studnicky/json/node';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';



import type { PipelineFunctionInterface } from '../../../src/interfaces/PipelineFunctionInterface.js';

import { Pipeline } from '../../../src/pipeline/Pipeline.js';
import scenarioGroups from './Pipeline.scenarios.json' with { type: 'json' };

type NumberStageSpec = { shape: 'add'; value: number };


type NumberPipelineInput = {
  stages: NumberStageSpec[];
  value: number;
};

type ScenarioCase =
  | {
      description: string;
      expected: { value: string };
      input: { value: string };
      shape: 'empty-pipeline-returns-input';
      name: string;
    }
  | {
      description: string;
      expected: { value: string };
      input: { value: string };
      shape: 'single-async-stage-applies';
      name: string;
    }
  | {
      description: string;
      expected: { value: number };
      input: { value: number };
      shape: 'single-stage-applies';
      name: string;
    }
  | {
      description: string;
      expected: { value: number };
      input: { value: number };
      shape: 'multiple-stages-apply-all';
      name: string;
    }
  | {
      description: string;
      expected: { value: number };
      input: { value: number };
      shape: 'stages-is-defensive-snapshot';
      name: string;
    }
  | {
      description: string;
      expected: { value: number };
      input: NumberPipelineInput;
      shape: 'async-observer-has-no-effect';
      name: string;
    }
  | {
      description: string;
      expected: { value: string };
      input: { value: string };
      shape: 'mixed-sync-async-stages';
      name: string;
    }
  | {
      description: string;
      expected: { value: { count: number; label: string } };
      input: { value: { count: number; label: string } };
      shape: 'object-context-pass-through';
      name: string;
    }
  | {
      description: string;
      expected: { original: number[]; value: number[] };
      input: { value: number[] };
      shape: 'does-not-mutate-original-input';
      name: string;
    }
  | {
      description: string;
      expected: { value: number };
      input: { value: number };
      shape: 'throwing-lifecycle-observer-has-no-effect';
      name: string;
    }
  | {
      description: string;
      expected: { value: number };
      input: NumberPipelineInput;
      shape: 'hanging-observer-has-no-effect';
      name: string;
    };

type ScenarioShape = ScenarioCase['shape'];

type ScenarioRunner<K extends ScenarioShape> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => Promise<void>;

type RunnerMap = { [K in ScenarioShape]: ScenarioRunner<K> };

const numberStageBuilderMap: Record<NumberStageSpec['shape'], (spec: NumberStageSpec) => (ctx: number) => number> = {
  add: (spec) => (ctx) => ctx + spec.value
};

function buildNumberStages(specs: NumberStageSpec[]): Array<(ctx: number) => number> {
  return specs.map((spec) => numberStageBuilderMap[spec.shape](spec));
}

async function settleWithin<T>(completion: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => { reject(RuntimeError.create("Pipeline observer delayed the run")); }, 100);
  });

  try {
    const result = await Promise.race([completion, deadline]);
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

function nonCloneableCallback(): void {}

const runnerMap: RunnerMap = {
  'does-not-mutate-original-input': async (scenarioCase) => {
    const pipeline = Pipeline.create<number[]>([(arr) => [...arr, 99]]);
    const original = [...scenarioCase.expected.original];
    const result = await pipeline.run(original);
    assert.deepStrictEqual(original, scenarioCase.expected.original);
    assert.deepStrictEqual(result, scenarioCase.expected.value);
  },
  'empty-pipeline-returns-input': async (scenarioCase) => {
    const pipeline = Pipeline.create<string>([]);
    const result = await pipeline.run(scenarioCase.input.value);
    assert.strictEqual(result, scenarioCase.expected.value);
  },
  'hanging-observer-has-no-effect': async (scenarioCase) => {
    class HangingHookPipeline extends Pipeline<number> {
      protected override onStageStart(): Promise<void> {
        return new Promise<void>(() => {});
      }
    }

    const pipeline = HangingHookPipeline.create(buildNumberStages(scenarioCase.input.stages));
    const result = await settleWithin(pipeline.run(scenarioCase.input.value));
    assert.strictEqual(result, scenarioCase.expected.value);
  },
  'async-observer-has-no-effect': async (scenarioCase) => {
    class ResolvingHookPipeline extends Pipeline<number> {
      protected override onStageSuccess(): Promise<void> {
        return Promise.resolve();
      }
    }

    const pipeline = ResolvingHookPipeline.create(buildNumberStages(scenarioCase.input.stages));
    const result = await pipeline.run(scenarioCase.input.value);
    assert.strictEqual(result, scenarioCase.expected.value);
  },
  'multiple-stages-apply-all': async (scenarioCase) => {
    const pipeline = Pipeline.create<number>([(value) => value + 1, (value) => value * 2]);
    const result = await pipeline.run(scenarioCase.input.value);
    assert.strictEqual(result, scenarioCase.expected.value);
  },
  'mixed-sync-async-stages': async (scenarioCase) => {
    const pipeline = Pipeline.create<string>([
      async (value) => value + ' async',
      (value) => value + ' sync'
    ]);
    const result = await pipeline.run(scenarioCase.input.value);
    assert.strictEqual(result, scenarioCase.expected.value);
  },
  'object-context-pass-through': async (scenarioCase) => {
    interface Ctx { count: number; label: string }
    const pipeline = Pipeline.create<Ctx>([
      (ctx) => ({ ...ctx, count: ctx.count + 1 }),
      (ctx) => ({ ...ctx, label: ctx.label + '!' }),
    ]);
    const result = await pipeline.run(scenarioCase.input.value);
    assert.strictEqual(result.count, scenarioCase.expected.value.count);
    assert.strictEqual(result.label, scenarioCase.expected.value.label);
  },
  'single-async-stage-applies': async (scenarioCase) => {
    const pipeline = Pipeline.create<string>([async (s) => s + ' world']);
    const result = await pipeline.run(scenarioCase.input.value);
    assert.strictEqual(result, scenarioCase.expected.value);
  },
  'single-stage-applies': async (scenarioCase) => {
    const pipeline = Pipeline.create<number>([(n) => n + 1]);
    const result = await pipeline.run(scenarioCase.input.value);
    assert.strictEqual(result, scenarioCase.expected.value);
  },
  'stages-is-defensive-snapshot': async (scenarioCase) => {
    const pipeline = Pipeline.create<number>([(n) => n + 1]);
    const snapshot = pipeline.stages;
    Reflect.set(snapshot, 0, (n: number) => n + 100);
    const result = await pipeline.run(scenarioCase.input.value);
    assert.strictEqual(result, scenarioCase.expected.value);
  },
  'throwing-lifecycle-observer-has-no-effect': async (scenarioCase) => {
    class ThrowingHookPipeline extends Pipeline<number> {
      protected override onStageStart(): void {
        throw RuntimeError.create('onStageStart boom');
      }
    }

    const pipeline = ThrowingHookPipeline.create<number>([(value) => value + 1]);
    const result = await pipeline.run(scenarioCase.input.value);
    assert.strictEqual(result, scenarioCase.input.value + 1);
  }
};

async function runCase<K extends ScenarioShape>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Pipeline', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});

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

    const successful = HangingObservers.create<number>([(value) => value + 1]);
    assert.strictEqual(await settleWithin(successful.run(1)), 2);

    const failure = RuntimeError.create('stage failed');
    const failing = HangingObservers.create<number>([() => { throw failure; }]);
    await assert.rejects(() => settleWithin(failing.run(1)), (error: unknown): boolean => {
      assert.strictEqual(error, failure);
      return true;
    });
  });

  void it('settles success and failure with rejecting observers', async () => {
    class RejectingObservers extends Pipeline<number> {
      protected override onRunStart(): Promise<void> { return Promise.reject(RuntimeError.create('run start observer')); }
      protected override onStageStart(): Promise<void> { return Promise.reject(RuntimeError.create('stage start observer')); }
      protected override onStageSuccess(): Promise<void> { return Promise.reject(RuntimeError.create('stage success observer')); }
      protected override onStageError(): Promise<void> { return Promise.reject(RuntimeError.create('stage error observer')); }
      protected override onRunError(): Promise<void> { return Promise.reject(RuntimeError.create('run error observer')); }
      protected override onRunComplete(): Promise<void> { return Promise.reject(RuntimeError.create('run complete observer')); }
    }

    const successful = RejectingObservers.create<number>([(value) => value + 1]);
    assert.strictEqual(await settleWithin(successful.run(1)), 2);

    const failure = RuntimeError.create('stage failed');
    const failing = RejectingObservers.create<number>([() => { throw failure; }]);
    await assert.rejects(() => settleWithin(failing.run(1)), (error: unknown): boolean => {
      assert.strictEqual(error, failure);
      return true;
    });
  });
});

void describe('Pipeline readonly observer contexts', () => {
  interface Context {
    count: number;
    label: string;
  }

  class ReadonlyObserverPipeline extends Pipeline<Context> {
    public constructor(stages: readonly PipelineFunctionInterface<Context>[]) {
      super(stages);
    }

    readonly runStartContexts: Readonly<Context>[] = [];
    readonly stageSuccessContexts: Readonly<Context>[] = [];

    public assertBaseObserverAcceptsReadonlyContext(context: Readonly<Context>): void {
      super.onRunStart(context);
    }

    protected override onRunStart(context: Readonly<Context>): void {
      this.runStartContexts.push(context);
    }

    protected override onStageSuccess(_index: number, context: Readonly<Context>): void {
      this.stageSuccessContexts.push(context);
    }
  }

  void it('provides readonly observer views while transform hooks retain context transformation', async () => {
    const pipeline = new ReadonlyObserverPipeline([
      (context) => ({ ...context, count: context.count + 1 }),
      (context) => ({ ...context, label: context.label + '!' })
    ]);
    const readonlyContext: Readonly<Context> = { count: 0, label: 'input' };
    pipeline.assertBaseObserverAcceptsReadonlyContext(readonlyContext);

    const result = await pipeline.run(readonlyContext);

    assert.deepStrictEqual(result, { count: 1, label: 'input!' });
    assert.deepStrictEqual(pipeline.runStartContexts, [{ count: 0, label: 'input' }]);
    assert.deepStrictEqual(pipeline.stageSuccessContexts, [
      { count: 1, label: 'input' },
      { count: 1, label: 'input!' }
    ]);
  });
});


void describe("Pipeline observer snapshot ownership", () => {
  interface ObserverContext {
    nested: { count: number };
    records: Map<string, Set<{ count: number }>>;
  }

  class SnapshotMutationPipeline extends Pipeline<ObserverContext> {
    public constructor(stages: readonly PipelineFunctionInterface<ObserverContext>[]) { super(stages); }

    readonly observations: string[] = [];

    protected override onRunStart(context: Readonly<ObserverContext>): void {
      assert.strictEqual(Reflect.set(context.nested, "count", 99), false);
      assert.throws(() => { context.records.set("other", new Set()); }, FrozenMutationError);
      this.observations.push("run-start");
    }

    protected override onStageStart(_index: number, context: Readonly<ObserverContext>): void {
      const members = context.records.get("team");
      assert.ok(members !== undefined);
      assert.throws(() => { members.add({ count: 99 }); }, FrozenMutationError);
      this.observations.push("stage-start");
    }

    protected override onStageSuccess(_index: number, context: Readonly<ObserverContext>): void {
      assert.strictEqual(Reflect.set(context.nested, "count", 99), false);
      this.observations.push("stage-success");
    }

    protected override onRunComplete(context: Readonly<ObserverContext>): void {
      const members = context.records.get("team");
      assert.ok(members !== undefined);
      assert.throws(() => { members.add({ count: 100 }); }, FrozenMutationError);
      this.observations.push("run-complete");
    }
  }

  void it("isolates nested object, Map, and Set observer mutation attempts", async () => {
    const input: ObserverContext = {
      nested: { count: 1 },
      records: new Map([["team", new Set([{ count: 1 }])]])
    };
    const pipeline = new SnapshotMutationPipeline([
      (context) => ({ nested: { count: context.nested.count + 1 }, records: context.records })
    ]);

    const result = await pipeline.run(input);
    const inputMembers = input.records.get("team");
    const resultMembers = result.records.get("team");

    assert.deepStrictEqual(pipeline.observations, ["run-start", "stage-start", "stage-success", "run-complete"]);
    assert.strictEqual(input.nested.count, 1);
    assert.strictEqual(input.records.has("other"), false);
    assert.strictEqual(inputMembers?.size, 1);
    assert.strictEqual(result.nested.count, 2);
    assert.strictEqual(result.records.has("other"), false);
    assert.strictEqual(resultMembers?.size, 1);
  });

  void it("skips context observers when their data cannot be snapshotted", async () => {
    interface NonCloneableContext {
      callback: () => void;
      value: number;
    }

    class NonCloneableObserverPipeline extends Pipeline<NonCloneableContext> {
      public constructor(stages: readonly PipelineFunctionInterface<NonCloneableContext>[]) { super(stages); }

      readonly contextObserverCalls: string[] = [];

      protected override onRunStart(): void { this.contextObserverCalls.push("run-start"); }
      protected override onStageStart(): void { this.contextObserverCalls.push("stage-start"); }
      protected override onStageSuccess(): void { this.contextObserverCalls.push("stage-success"); }
      protected override onRunComplete(): void { this.contextObserverCalls.push("run-complete"); }
    }

    const pipeline = new NonCloneableObserverPipeline([
      (context) => ({ callback: context.callback, value: context.value + 1 })
    ]);
    const result = await pipeline.run({ callback: nonCloneableCallback, value: 1 });

    assert.strictEqual(result.value, 2);
    assert.strictEqual(result.callback, nonCloneableCallback);
    assert.deepStrictEqual(pipeline.contextObserverCalls, []);
  });

  void it("preserves exact stage errors when context snapshots cannot be created", async () => {
    interface NonCloneableContext {
      callback: () => void;
      value: number;
    }

    class ErrorObserverPipeline extends Pipeline<NonCloneableContext> {
      public constructor(stages: readonly PipelineFunctionInterface<NonCloneableContext>[]) { super(stages); }

      readonly errors: unknown[] = [];

      protected override onStageError(_index: number, error: unknown): void { this.errors.push(error); }
      protected override onRunError(error: unknown): void { this.errors.push(error); }
    }

    const expected = RuntimeError.create("stage failure");
    const pipeline = new ErrorObserverPipeline([
      () => { throw expected; }
    ]);

    await assert.rejects(() => pipeline.run({ callback: (): void => {}, value: 1 }), (error: unknown): boolean => {
      assert.strictEqual(error, expected);
      return true;
    });
    assert.deepStrictEqual(pipeline.errors, [expected, expected]);
  });

  void it("owns the stage list supplied at construction", async () => {
    const callerStages: Array<PipelineFunctionInterface<number>> = [(value) => value + 1];
    const pipeline = Pipeline.create(callerStages);

    callerStages[0] = (value) => value + 100;
    callerStages.push((value) => value * 100);

    assert.strictEqual(await pipeline.run(1), 2);
    assert.strictEqual(pipeline.stages.length, 1);
  });
});
