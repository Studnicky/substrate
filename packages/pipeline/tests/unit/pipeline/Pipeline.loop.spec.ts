import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { HookInvocationError, HookTimeoutError } from '@studnicky/errors';

import { Pipeline } from '../../../src/pipeline/Pipeline.js';
import scenarioGroups from './Pipeline.scenarios.json';

type NumberStageSpec = { shape: 'add'; value: number };

type PipelineOptionsInput = { hookTimeoutMs: number };

type NumberPipelineInput = {
  options?: PipelineOptionsInput;
  stages: NumberStageSpec[];
  value: number;
};

type ScenarioCase =
  | {
      description: string;
      expected: { value: string };
      input: { value: string };
      shape: 'empty-pipeline-returns-input' | 'single-async-stage-applies';
      name: string;
    }
  | {
      description: string;
      expected: { value: number };
      input: { value: number };
      shape: 'single-stage-applies' | 'multiple-stages-apply-all' | 'stages-is-defensive-snapshot';
      name: string;
    }
  | {
      description: string;
      expected: { value: number };
      input: NumberPipelineInput;
      shape: 'hook-timeout-resolving-has-no-effect' | 'hook-timeout-unset-resolving-has-no-effect';
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
      expected: { hookName: 'onStageStart' };
      input: { value: number };
      shape: 'throwing-lifecycle-hook-rejects-run';
      name: string;
    }
  | {
      description: string;
      expected: { causeName: 'HookTimeoutError'; hookName: 'onStageStart' };
      input: NumberPipelineInput & { options: PipelineOptionsInput };
      shape: 'hook-timeout-hanging-rejects';
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

function buildPipelineOptions(input: NumberPipelineInput): PipelineOptionsInput | undefined {
  return input.options === undefined
    ? undefined
    : { hookTimeoutMs: input.options.hookTimeoutMs };
}

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
  'hook-timeout-hanging-rejects': async (scenarioCase) => {
    class HangingHookPipeline extends Pipeline<number> {
      protected override onStageStart(): Promise<void> {
        return new Promise<void>(() => { /* never settles */ });
      }
    }

    const pipeline = HangingHookPipeline.create(
      buildNumberStages(scenarioCase.input.stages),
      buildPipelineOptions(scenarioCase.input)
    );
    await assert.rejects(
      () => pipeline.run(scenarioCase.input.value),
      (err: unknown) => {
        assert.ok(err instanceof HookInvocationError);
        assert.strictEqual(err.hookName, scenarioCase.expected.hookName);
        assert.ok(err.cause instanceof HookTimeoutError);
        assert.strictEqual(err.cause.name, scenarioCase.expected.causeName);
        return true;
      }
    );
  },
  'hook-timeout-resolving-has-no-effect': async (scenarioCase) => {
    class ResolvingHookPipeline extends Pipeline<number> {
      protected override onStageSuccess(): Promise<void> {
        return Promise.resolve();
      }
    }

    const pipeline = ResolvingHookPipeline.create(
      buildNumberStages(scenarioCase.input.stages),
      buildPipelineOptions(scenarioCase.input)
    );
    const result = await pipeline.run(scenarioCase.input.value);
    assert.strictEqual(result, scenarioCase.expected.value);
  },
  'hook-timeout-unset-resolving-has-no-effect': async (scenarioCase) => {
    class ResolvingHookPipeline extends Pipeline<number> {
      protected override onStageSuccess(): Promise<void> {
        return Promise.resolve();
      }
    }

    const pipeline = ResolvingHookPipeline.create(
      buildNumberStages(scenarioCase.input.stages),
      buildPipelineOptions(scenarioCase.input)
    );
    const result = await pipeline.run(scenarioCase.input.value);
    assert.strictEqual(result, scenarioCase.expected.value);
  },
  'multiple-stages-apply-all': async (scenarioCase) => {
    const pipeline = Pipeline.create<number>([(n) => n + 1, (n) => n * 2]);
    const result = await pipeline.run(scenarioCase.input.value);
    assert.strictEqual(result, scenarioCase.expected.value);
  },
  'mixed-sync-async-stages': async (scenarioCase) => {
    const pipeline = Pipeline.create<string>([
      async (s) => s + ' async',
      (s) => s + ' sync',
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
  'throwing-lifecycle-hook-rejects-run': async (scenarioCase) => {
    class ThrowingHookPipeline extends Pipeline<number> {
      protected override onStageStart(): void {
        throw new Error('onStageStart boom');
      }
    }

    const pipeline = ThrowingHookPipeline.create([(n) => n + 1]);
    await assert.rejects(
      () => pipeline.run(scenarioCase.input.value),
      (err: unknown) => {
        assert.ok(err instanceof HookInvocationError);
        assert.strictEqual(err.hookName, scenarioCase.expected.hookName);
        return true;
      }
    );
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
