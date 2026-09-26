import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import { RuntimeError, HookInvocationError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';


import { Throttle } from '../../../src/throttle/index.js';
import { ExecuteSyncThrowScenarioCaseEntity } from './entities/ExecuteSyncThrowScenarioCaseEntity.js';
import scenarioGroups from './execute-sync-throw.scenarios.json' with { type: 'json' };

type ScenarioCase = ExecuteSyncThrowScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(ExecuteSyncThrowScenarioCaseEntity.Schema, ExecuteSyncThrowScenarioCaseEntity.Node);

function assertErrorMessageIncludes(error: Error, expectedMessage: string): void {
  assert.equal(error.message.includes(expectedMessage), true);
}

type ScenarioRunner<K extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => Promise<void>;
type RunnerMap = { [K in ScenarioCase['shape']]: ScenarioRunner<K> };

const runnerMap: RunnerMap = {
  'sync-throw-releases-slot': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const throttle = Throttle.create(input.throttle);
    const throwingFn = (): Promise<never> => {
      throw RuntimeError.create(String(input.errorMessage));
    };

    for (let i = 0; i < input.throttle.concurrencyLimit; i += 1) {
      await assert.rejects(
        throttle.execute(throwingFn),
        (error) => {
          if (!(error instanceof Error)) { return false; }
          assertErrorMessageIncludes(error, String(input.errorMessage));
          return true;
        }
      );
    }

    assert.strictEqual(throttle.getStats().activeCount, Number(expected.activeCount));
    const result = await throttle.execute(async () => String(input.result));
    assert.strictEqual(result, String(expected.recoveredResult));
  },
  'sync-throw-reject-hook': async (scenarioCase) => {
    const { input } = scenarioCase;
    const original = RuntimeError.create(String(input.errorMessage));

    class RejectHookThrottle extends Throttle {
      protected override onReject(): void {
        throw original;
      }
    }

    const throttle = RejectHookThrottle.create(input.throttle);
    const throwingFn = (): Promise<never> => {
      throw RuntimeError.create(String(input.failureMessage));
    };

    await assert.rejects(throttle.execute(throwingFn), (error) => {
      assert.ok(error instanceof HookInvocationError);
      assert.strictEqual(error.cause, original);
      return true;
    });
  }
};

async function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Throttle synchronous throw regression', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
