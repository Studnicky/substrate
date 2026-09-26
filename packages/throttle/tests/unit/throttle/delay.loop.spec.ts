import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Delay } from '../../../src/throttle/Delay.js';
import { ThrottleAbortedError } from '../../../src/errors/ThrottleAbortedError.js';
import { DelayScenarioCaseEntity } from './entities/DelayScenarioCaseEntity.js';
import scenarioGroups from './delay.scenarios.json' with { type: 'json' };

type ScenarioCase = DelayScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(DelayScenarioCaseEntity.Schema, DelayScenarioCaseEntity.Node);

type ScenarioRunner<K extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => Promise<void> | void;
type RunnerMap = { [K in ScenarioCase['shape']]: ScenarioRunner<K> };

function isThrottleAbort(error: unknown, expected: { errorCode: string; errorMessage: string; timeoutMs: number }): boolean {
  assert.ok(error instanceof ThrottleAbortedError);
  assert.strictEqual(error.code, expected.errorCode);
  assert.strictEqual(error.message, expected.errorMessage);
  assert.strictEqual(error.timeoutMs, expected.timeoutMs);
  return true;
}

const runnerMap: RunnerMap = {
    'delay-rejects-already-aborted': async (scenarioCase) => {
      const controller = new AbortController();
      controller.abort();
      await assert.rejects(
        Delay.for(scenarioCase.input.timeoutMs, controller.signal),
        (error) => isThrottleAbort(error, scenarioCase.expected)
      );
    },
    'delay-rejects-before-timeout': async (scenarioCase) => {
      const controller = new AbortController();
      const promise = Delay.for(scenarioCase.input.timeoutMs, controller.signal);
      controller.abort();
      await assert.rejects(
        promise,
        (error) => isThrottleAbort(error, scenarioCase.expected)
      );
    },
    'delay-removes-abort-listener': async (scenarioCase) => {
      const controller = new AbortController();
      let addCount = 0;
      let removeCount = 0;
      const originalAdd = controller.signal.addEventListener.bind(controller.signal);
      const originalRemove = controller.signal.removeEventListener.bind(controller.signal);
      const countingAdd = (type: Parameters<typeof originalAdd>[0], listener: Parameters<typeof originalAdd>[1], options: Parameters<typeof originalAdd>[2]): void => {
        addCount += 1;
        originalAdd(type, listener, options);
      };
      const countingRemove = (type: Parameters<typeof originalRemove>[0], listener: Parameters<typeof originalRemove>[1], options: Parameters<typeof originalRemove>[2]): void => {
        removeCount += 1;
        originalRemove(type, listener, options);
      };
      controller.signal.addEventListener = countingAdd;
      controller.signal.removeEventListener = countingRemove;
      await Delay.for(scenarioCase.input.timeoutMs, controller.signal);
      assert.strictEqual(addCount, scenarioCase.expected.abortListenerAddCount);
      assert.strictEqual(removeCount, scenarioCase.expected.abortListenerRemoveCount);
    },
    'delay-resolves-with-never-aborted-signal': async (scenarioCase) => {
      const controller = new AbortController();
      await Delay.for(scenarioCase.input.timeoutMs, controller.signal);
      assert.equal(scenarioCase.expected.resolved, true);
    },
    'delay-resolves-without-signal': async (scenarioCase) => {
      await Delay.for(scenarioCase.input.timeoutMs);
      assert.equal(scenarioCase.expected.resolved, true);
    }
};

async function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Throttle delay', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
