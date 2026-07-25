import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HookInvocationError } from '@studnicky/errors';
import { Throttle } from '../../../src/throttle/index.js';
import scenarioGroups from './execute-sync-throw.scenarios.json';

type ScenarioCase =
  | { name: string; description: string; expected: Record<string, unknown>; input: { errorMessage: string; failureMessage?: string; result?: string; throttle: { concurrencyLimit: number } }; shape: 'sync-throw-releases-slot' | 'sync-throw-reject-hook' };

function assertErrorMessageIncludes(error: unknown, expectedMessage: string): void {
  assert.ok(error instanceof Error);
  assert.equal(error.message.includes(expectedMessage), true);
}

const runnerMap: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => Promise<void>> = {
  'sync-throw-releases-slot': async (scenarioCase) => {
    const { expected, input } = scenarioCase;
    const throttle = Throttle.create(input.throttle);
    const throwingFn = (): Promise<never> => {
      throw new Error(String(input.errorMessage));
    };

    for (let i = 0; i < input.throttle.concurrencyLimit; i += 1) {
      await assert.rejects(
        throttle.execute(throwingFn),
        (error: unknown) => {
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
    const original = new Error(String(input.errorMessage));

    class RejectHookThrottle extends Throttle {
      protected override onReject(): void {
        throw original;
      }
    }

    const throttle = RejectHookThrottle.create(input.throttle);
    const throwingFn = (): Promise<never> => {
      throw new Error(String(input.failureMessage));
    };

    await assert.rejects(throttle.execute(throwingFn), (error: unknown) => {
      assert.ok(error instanceof HookInvocationError);
      assert.strictEqual(error.cause, original);
      return true;
    });
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Throttle synchronous throw regression', () => {
  for (const scenarioCase of scenarioGroups.cases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
