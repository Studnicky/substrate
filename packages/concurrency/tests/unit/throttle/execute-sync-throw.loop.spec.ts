import { HookInvocationError, RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { Throttle } from '../../../src/throttle/throttle/index.js';
import { ExecuteSyncThrowScenarioCaseEntity } from './entities/ExecuteSyncThrowScenarioCaseEntity.js';
import scenarioGroups from './execute-sync-throw.scenarios.json' with { 'type': 'json' };

class ExecuteSyncThrowRunners {
  static async 'sync-throw-reject-hook'(scenarioCase: ScenarioCaseOfType<ExecuteSyncThrowScenarioCaseEntity.Type, 'sync-throw-reject-hook'>): Promise<void> {
    const { input } = scenarioCase;
    const original = RuntimeError.create(String(input.errorMessage));

    class RejectHookThrottle extends Throttle {
      protected override onReject(): void {
        throw original;
      }
    }

    const throttle = RejectHookThrottle.create(input.throttle);
    const throwingOperation = (): Promise<never> => {
      throw RuntimeError.create(String(input.failureMessage));
    };

    await assert.rejects(throttle.execute(throwingOperation), (error) => {
      assert.ok(error instanceof HookInvocationError);
      assert.strictEqual(error.cause, original);
      return true;
    });
  }

  static async 'sync-throw-releases-slot'(scenarioCase: ScenarioCaseOfType<ExecuteSyncThrowScenarioCaseEntity.Type, 'sync-throw-releases-slot'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const throttle = Throttle.create(input.throttle);
    const throwingOperation = (): Promise<never> => {
      throw RuntimeError.create(String(input.errorMessage));
    };

    for (let index = 0; index < input.throttle.concurrencyLimit; index += 1) {
      await ExecuteSyncThrowRunners.assertRejectsContaining(throttle, throwingOperation, String(input.errorMessage));
    }

    assert.strictEqual(throttle.getStats().activeCount, Number(expected.activeCount));
    const result = await throttle.execute(() => {
      const settled = Promise.resolve(String(input.result));
      return settled;
    });
    assert.strictEqual(result, String(expected.recoveredResult));
  }

  private static async assertRejectsContaining(throttle: Throttle, operation: () => Promise<never>, message: string): Promise<void> {
    await assert.rejects(throttle.execute(operation), (error) => {
      const caught: unknown = error;
      const includesMessage = caught instanceof Error && caught.message.includes(message);
      return includesMessage;
    });
  }
}

ScenarioSuite.register({
  'entity': ExecuteSyncThrowScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Throttle synchronous throw regression',
  'runners': ExecuteSyncThrowRunners
});
