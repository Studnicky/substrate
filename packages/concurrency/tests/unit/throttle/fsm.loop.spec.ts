import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite, ScenarioValues } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { ThrottleStateEntity } from '../../../src/throttle/entities/ThrottleStateEntity.js';
import { Throttle } from '../../../src/throttle/throttle/index.js';
import { FsmScenarioCaseEntity } from './entities/FsmScenarioCaseEntity.js';
import scenarioGroups from './fsm.scenarios.json' with { 'type': 'json' };

interface TransitionRecordInterface {
  readonly 'from': ThrottleStateEntity.Type;
  readonly 'to': ThrottleStateEntity.Type;
}

class TrackingThrottle extends Throttle {
  readonly transitions: TransitionRecordInterface[] = [];

  constructor(config?: Parameters<typeof Throttle.create>[0]) {
    super(config);
  }

  override guard(from: ThrottleStateEntity.Type, to: ThrottleStateEntity.Type): boolean {
    const allowed = super.guard(from, to);
    return allowed;
  }

  override onEnter(to: ThrottleStateEntity.Type, from: ThrottleStateEntity.Type): void {
    this.transitions.push({ 'from': from, 'to': to });
  }

  get currentState(): ThrottleStateEntity.Type {
    return this.state;
  }

  forceTransition(to: ThrottleStateEntity.Type): void {
    this.transition(to);
  }
}

class BlockingThrottle extends TrackingThrottle {
  static withConfig(config: Parameters<typeof Throttle.create>[0]): BlockingThrottle {
    const throttle = new BlockingThrottle(config);
    return throttle;
  }
}

class FsmRunners {
  static async 'abort-transitions-to-aborted'(scenarioCase: ScenarioCaseOfType<FsmScenarioCaseEntity.Type, 'abort-transitions-to-aborted'>): Promise<void> {
    const throttle = new TrackingThrottle(scenarioCase.input.throttle);
    await throttle.abort();
    assert.strictEqual(throttle.currentState, scenarioCase.expected.currentState);
    assert.strictEqual(FsmRunners.countTransitions(throttle, undefined, scenarioCase.expected.to) > 0, true);
  }

  static async 'active-to-idle'(scenarioCase: ScenarioCaseOfType<FsmScenarioCaseEntity.Type, 'active-to-idle'>): Promise<void> {
    const throttle = BlockingThrottle.withConfig(scenarioCase.input.throttle);
    const blocker = Promise.withResolvers<void>();
    const executePromise = throttle.execute(async () => {
      await blocker.promise;
      return 42;
    });
    await Promise.resolve();
    blocker.resolve();
    await executePromise;
    assert.strictEqual(throttle.currentState, scenarioCase.expected.currentState);
    assert.strictEqual(FsmRunners.countTransitions(throttle, scenarioCase.expected.from, scenarioCase.expected.to) > 0, true);
  }

  static async 'double-abort-no-second-transition'(scenarioCase: ScenarioCaseOfType<FsmScenarioCaseEntity.Type, 'double-abort-no-second-transition'>): Promise<void> {
    const throttle = new TrackingThrottle(scenarioCase.input.throttle);
    await throttle.abort();
    const countAfterFirst = FsmRunners.countTransitions(throttle, undefined, 'aborted');
    await throttle.abort();
    const countAfterSecond = FsmRunners.countTransitions(throttle, undefined, 'aborted');
    assert.strictEqual(countAfterFirst, scenarioCase.expected.abortedTransitionCount);
    assert.strictEqual(countAfterSecond, scenarioCase.expected.abortedTransitionCount);
  }

  static async 'idle-to-active'(scenarioCase: ScenarioCaseOfType<FsmScenarioCaseEntity.Type, 'idle-to-active'>): Promise<void> {
    const throttle = BlockingThrottle.withConfig(scenarioCase.input.throttle);
    const blocker = Promise.withResolvers<void>();
    const executePromise = throttle.execute(async () => {
      await blocker.promise;
      return 'done';
    });
    await Promise.resolve();
    assert.strictEqual(FsmRunners.countTransitions(throttle, scenarioCase.expected.from, scenarioCase.expected.to) > 0, true);
    blocker.resolve();
    await executePromise;
  }

  static async 'idle-to-draining'(scenarioCase: ScenarioCaseOfType<FsmScenarioCaseEntity.Type, 'idle-to-draining'>): Promise<void> {
    const throttle = new TrackingThrottle(scenarioCase.input.throttle);
    assert.strictEqual(throttle.currentState, 'idle');
    await throttle.drain();
    assert.strictEqual(FsmRunners.countTransitions(throttle, scenarioCase.expected.from, scenarioCase.expected.to) > 0, true);
    assert.strictEqual(throttle.currentState, scenarioCase.expected.currentState);
  }

  static 'illegal-transition-throws'(scenarioCase: ScenarioCaseOfType<FsmScenarioCaseEntity.Type, 'illegal-transition-throws'>): void {
    class GuardBlockingThrottle extends TrackingThrottle {
      override guard(from: ThrottleStateEntity.Type, to: ThrottleStateEntity.Type): boolean {
        const blocked = from === scenarioCase.input.illegalFrom && to === scenarioCase.input.illegalTo;
        const allowed = blocked === false && super.guard(from, to);
        return allowed;
      }
    }
    const throttle = new GuardBlockingThrottle(scenarioCase.input.throttle);
    assert.throws(() => { throttle.forceTransition(scenarioCase.input.illegalTo); }, (error) => {
      const caught: unknown = error;
      const includesMessage = caught instanceof Error && caught.message.includes(scenarioCase.expected.errorMessage);
      return includesMessage;
    });
  }

  static 'starts-idle'(scenarioCase: ScenarioCaseOfType<FsmScenarioCaseEntity.Type, 'starts-idle'>): void {
    const throttle = new TrackingThrottle(scenarioCase.input.throttle);
    assert.strictEqual(throttle.currentState, scenarioCase.expected.currentState);
    assert.strictEqual(throttle.transitions.length, scenarioCase.expected.transitionCount);
  }

  static 'validate-states'(scenarioCase: ScenarioCaseOfType<FsmScenarioCaseEntity.Type, 'validate-states'>): void {
    for (let index = 0; index < scenarioCase.input.states.length; index += 1) {
      assert.strictEqual(ThrottleStateEntity.validate(ScenarioValues.requireDefined(scenarioCase.input.states[index], 'states[index]')), scenarioCase.expected.validStates);
    }
    assert.strictEqual(ThrottleStateEntity.validate(scenarioCase.input.invalidState), scenarioCase.expected.invalidState);
  }

  private static countTransitions(throttle: TrackingThrottle, from: ThrottleStateEntity.Type | undefined, to: ThrottleStateEntity.Type): number {
    let count = 0;
    for (let index = 0; index < throttle.transitions.length; index += 1) {
      const transition = ScenarioValues.requireDefined(throttle.transitions[index], 'transitions[index]');
      if (transition.to === to && (from === undefined || transition.from === from)) {
        count += 1;
      }
    }
    return count;
  }
}

ScenarioSuite.register({
  'entity': FsmScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Throttle FSM',
  'runners': FsmRunners
});
