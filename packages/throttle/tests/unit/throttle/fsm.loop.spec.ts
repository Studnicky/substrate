import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ThrottleStateEntity } from '../../../src/entities/ThrottleStateEntity.js';
import { Throttle } from '../../../src/throttle/index.js';

type ScenarioCase =
  | {
      description: string;
      expected: { invalidState: false; validStates: true };
      input: { invalidState: string; states: readonly string[] };
      shape: 'validate-states';
      name: string;
    }
  | {
      description: string;
      expected: { currentState: 'idle'; transitionCount: 0 };
      input: { throttle: { concurrencyLimit: number } };
      shape: 'starts-idle';
      name: string;
    }
  | {
      description: string;
      expected: { from: 'idle'; to: 'active' };
      input: { throttle: { concurrencyLimit: number } };
      shape: 'idle-to-active';
      name: string;
    }
  | {
      description: string;
      expected: { currentState: 'idle'; from: 'active'; to: 'idle' };
      input: { throttle: { concurrencyLimit: number } };
      shape: 'active-to-idle';
      name: string;
    }
  | {
      description: string;
      expected: { currentState: 'idle'; from: 'idle'; to: 'draining' };
      input: { throttle: { concurrencyLimit: number } };
      shape: 'idle-to-draining';
      name: string;
    }
  | {
      description: string;
      expected: { currentState: 'aborted'; to: 'aborted' };
      input: { throttle: { concurrencyLimit: number } };
      shape: 'abort-transitions-to-aborted';
      name: string;
    }
  | {
      description: string;
      expected: { abortedTransitionCount: 1 };
      input: { throttle: { concurrencyLimit: number } };
      shape: 'double-abort-no-second-transition';
      name: string;
    }
  | {
      description: string;
      expected: { errorMessage: string };
      input: { illegalFrom: 'idle'; illegalTo: 'active'; throttle: { concurrencyLimit: number } };
      shape: 'illegal-transition-throws';
      name: string;
    };

import scenarioGroups from './fsm.scenarios.json' with { type: 'json' };

function assertErrorMessageIncludes(error: Error, expectedMessage: string): void {
  assert.equal(error.message.includes(expectedMessage), true);
}

interface TransitionRecord {
  from: ThrottleStateEntity.Type;
  to: ThrottleStateEntity.Type;
}

class TrackingThrottle extends Throttle {
  readonly transitions: TransitionRecord[] = [];

  constructor(config?: Parameters<typeof Throttle.create>[0]) {
    super(config);
  }

  override guard(from: ThrottleStateEntity.Type, to: ThrottleStateEntity.Type): boolean {
    return super.guard(from, to);
  }

  override onEnter(to: ThrottleStateEntity.Type, from: ThrottleStateEntity.Type): void {
    this.transitions.push({ from, to });
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
    return new BlockingThrottle(config);
  }
}

type ScenarioRunner<K extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => Promise<void>;
type RunnerMap = { [K in ScenarioCase['shape']]: ScenarioRunner<K> };

async function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> {
  const runnerMap: RunnerMap = {
    'abort-transitions-to-aborted': async (caseData) => {
      const throttle = new TrackingThrottle(caseData.input.throttle);
      await throttle.abort();
      assert.strictEqual(throttle.currentState, caseData.expected.currentState);
      assert.strictEqual(throttle.transitions.some((t) => t.to === caseData.expected.to), true);
    },
    'active-to-idle': async (caseData) => {
      const throttle = BlockingThrottle.withConfig(caseData.input.throttle);
      let unblock!: () => void;
      const blocker = new Promise<void>((resolve) => { unblock = resolve; });
      const executePromise = throttle.execute(async () => {
        await blocker;
        return 42;
      });
      await Promise.resolve();
      unblock();
      await executePromise;
      assert.strictEqual(throttle.currentState, caseData.expected.currentState);
      assert.strictEqual(throttle.transitions.some((t) => t.from === caseData.expected.from && t.to === caseData.expected.to), true);
    },
    'double-abort-no-second-transition': async (caseData) => {
      const throttle = new TrackingThrottle(caseData.input.throttle);
      await throttle.abort();
      const countAfterFirst = throttle.transitions.filter((t) => t.to === 'aborted').length;
      await throttle.abort();
      const countAfterSecond = throttle.transitions.filter((t) => t.to === 'aborted').length;
      assert.strictEqual(countAfterFirst, caseData.expected.abortedTransitionCount);
      assert.strictEqual(countAfterSecond, caseData.expected.abortedTransitionCount);
    },
    'idle-to-active': async (caseData) => {
      const throttle = BlockingThrottle.withConfig(caseData.input.throttle);
      let unblock!: () => void;
      const blocker = new Promise<void>((resolve) => { unblock = resolve; });
      const executePromise = throttle.execute(async () => {
        await blocker;
        return 'done';
      });
      await Promise.resolve();
      assert.strictEqual(throttle.transitions.some((t) => t.from === caseData.expected.from && t.to === caseData.expected.to), true);
      unblock();
      await executePromise;
    },
    'illegal-transition-throws': async (caseData) => {
      class GuardBlockingThrottle extends TrackingThrottle {
        override guard(from: ThrottleStateEntity.Type, to: ThrottleStateEntity.Type): boolean {
          if (from === caseData.input.illegalFrom && to === caseData.input.illegalTo) return false;
          return super.guard(from, to);
        }
      }
      const throttle = new GuardBlockingThrottle(caseData.input.throttle);
      assert.throws(() => { throttle.forceTransition(caseData.input.illegalTo); }, (error) => {
        if (!(error instanceof Error)) { return false; }
        assertErrorMessageIncludes(error, caseData.expected.errorMessage);
        return true;
      });
    },
    'idle-to-draining': async (caseData) => {
      const throttle = new TrackingThrottle(caseData.input.throttle);
      assert.strictEqual(throttle.currentState, 'idle');
      await throttle.drain();
      assert.strictEqual(throttle.transitions.some((t) => t.from === caseData.expected.from && t.to === caseData.expected.to), true);
      assert.strictEqual(throttle.currentState, caseData.expected.currentState);
    },
    'starts-idle': async (caseData) => {
      const throttle = new TrackingThrottle(caseData.input.throttle);
      assert.strictEqual(throttle.currentState, caseData.expected.currentState);
      assert.strictEqual(throttle.transitions.length, caseData.expected.transitionCount);
    },
    'validate-states': async (caseData) => {
      for (const state of caseData.input.states) {
        assert.strictEqual(ThrottleStateEntity.validate(state), caseData.expected.validStates);
      }
      assert.strictEqual(ThrottleStateEntity.validate(caseData.input.invalidState), caseData.expected.invalidState);
    }
  };

  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Throttle FSM', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
