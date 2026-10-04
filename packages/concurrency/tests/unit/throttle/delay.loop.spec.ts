import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { ThrottleAbortedError } from '../../../src/throttle/errors/ThrottleAbortedError.js';
import { Delay } from '../../../src/throttle/throttle/Delay.js';
import scenarioGroups from './delay.scenarios.json' with { 'type': 'json' };
import { DelayScenarioCaseEntity } from './entities/DelayScenarioCaseEntity.js';

class DelayRunners {
  static async 'delay-rejects-already-aborted'(scenarioCase: ScenarioCaseOfType<DelayScenarioCaseEntity.Type, 'delay-rejects-already-aborted'>): Promise<void> {
    const controller = new AbortController();
    controller.abort(new ThrottleAbortedError('caller aborted', 0));
    await assert.rejects(
      Delay.for(scenarioCase.input.timeoutMs, controller.signal),
      (error) => {
        const caught: unknown = error;
        assert.ok(caught instanceof ThrottleAbortedError);
        const matches = DelayRunners.matchesExpected(caught, scenarioCase.expected);
        return matches;
      }
    );
  }

  static async 'delay-rejects-before-timeout'(scenarioCase: ScenarioCaseOfType<DelayScenarioCaseEntity.Type, 'delay-rejects-before-timeout'>): Promise<void> {
    const controller = new AbortController();
    const promise = Delay.for(scenarioCase.input.timeoutMs, controller.signal);
    controller.abort(new ThrottleAbortedError('caller aborted', 0));
    await assert.rejects(
      promise,
      (error) => {
        const caught: unknown = error;
        assert.ok(caught instanceof ThrottleAbortedError);
        const matches = DelayRunners.matchesExpected(caught, scenarioCase.expected);
        return matches;
      }
    );
  }

  static async 'delay-removes-abort-listener'(scenarioCase: ScenarioCaseOfType<DelayScenarioCaseEntity.Type, 'delay-removes-abort-listener'>): Promise<void> {
    const controller = new AbortController();
    const pending = Delay.for(scenarioCase.input.timeoutMs, controller.signal);
    const listenersWhileWaiting = getEventListeners(controller.signal, 'abort').length;
    await pending;
    const listenersAfterSettling = getEventListeners(controller.signal, 'abort').length;
    assert.strictEqual(listenersWhileWaiting, scenarioCase.expected.abortListenerAddCount);
    assert.strictEqual(listenersWhileWaiting - listenersAfterSettling, scenarioCase.expected.abortListenerRemoveCount);
  }

  static async 'delay-resolves-with-never-aborted-signal'(scenarioCase: ScenarioCaseOfType<DelayScenarioCaseEntity.Type, 'delay-resolves-with-never-aborted-signal'>): Promise<void> {
    const controller = new AbortController();
    await Delay.for(scenarioCase.input.timeoutMs, controller.signal);
    assert.equal(scenarioCase.expected.resolved, true);
  }

  static async 'delay-resolves-without-signal'(scenarioCase: ScenarioCaseOfType<DelayScenarioCaseEntity.Type, 'delay-resolves-without-signal'>): Promise<void> {
    await Delay.for(scenarioCase.input.timeoutMs);
    assert.equal(scenarioCase.expected.resolved, true);
  }

  private static matchesExpected(error: ThrottleAbortedError, expected: { readonly 'errorCode': string; readonly 'errorMessage': string; readonly 'timeoutMs': number }): boolean {
    assert.strictEqual(error.code, expected.errorCode);
    assert.strictEqual(error.message, expected.errorMessage);
    assert.strictEqual(error.timeoutMs, expected.timeoutMs);
    const matches = true;
    return matches;
  }
}

ScenarioSuite.register({
  'entity': DelayScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Throttle delay',
  'runners': DelayRunners
});
