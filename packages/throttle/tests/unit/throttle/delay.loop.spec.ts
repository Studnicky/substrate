import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Delay } from '../../../src/throttle/Delay.js';
import scenarioGroups from './delay.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | {
      description: string;
      expected: { resolved: true };
      input: { timeoutMs: number };
      shape: 'delay-resolves-without-signal';
      name: string;
    }
  | {
      description: string;
      expected: { resolved: true };
      input: { timeoutMs: number };
      shape: 'delay-resolves-with-never-aborted-signal';
      name: string;
    }
  | {
      description: string;
      expected: { abortErrorName: 'AbortError' };
      input: { timeoutMs: number };
      shape: 'delay-rejects-already-aborted';
      name: string;
    }
  | {
      description: string;
      expected: { abortErrorName: 'AbortError' };
      input: { timeoutMs: number };
      shape: 'delay-rejects-before-timeout';
      name: string;
    }
  | {
      description: string;
      expected: { abortListenerAddCount: 1; abortListenerRemoveCount: 1 };
      input: { timeoutMs: number };
      shape: 'delay-removes-abort-listener';
      name: string;
    };

type ScenarioRunner<K extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => Promise<void> | void;
type RunnerMap = { [K in ScenarioCase['shape']]: ScenarioRunner<K> };

const runnerMap: RunnerMap = {
    'delay-rejects-already-aborted': async (scenarioCase) => {
      const controller = new AbortController();
      controller.abort();
      await assert.rejects(
        Delay.for(scenarioCase.input.timeoutMs, controller.signal),
        (error: unknown) => error instanceof DOMException && error.name === scenarioCase.expected.abortErrorName
      );
    },
    'delay-rejects-before-timeout': async (scenarioCase) => {
      const controller = new AbortController();
      const promise = Delay.for(scenarioCase.input.timeoutMs, controller.signal);
      controller.abort();
      await assert.rejects(
        promise,
        (error: unknown) => error instanceof DOMException && error.name === scenarioCase.expected.abortErrorName
      );
    },
    'delay-removes-abort-listener': async (scenarioCase) => {
      const controller = new AbortController();
      let addCount = 0;
      let removeCount = 0;
      const originalAdd = controller.signal.addEventListener.bind(controller.signal);
      const originalRemove = controller.signal.removeEventListener.bind(controller.signal);
      controller.signal.addEventListener = ((...args: Parameters<typeof originalAdd>): void => {
        addCount += 1;
        originalAdd(...args);
      }) as typeof originalAdd;
      controller.signal.removeEventListener = ((...args: Parameters<typeof originalRemove>): void => {
        removeCount += 1;
        originalRemove(...args);
      }) as typeof originalRemove;
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
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
