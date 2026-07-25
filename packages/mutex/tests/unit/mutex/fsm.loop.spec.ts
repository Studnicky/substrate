import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { MutexKeyStateEntity } from '../../../src/entities/MutexKeyStateEntity.js';
import { Mutex } from '../../../src/mutex/index.js';

type ScenarioCase =
  | {
      description: string;
      expected: {
        invalidState: false;
        validStates: true;
      };
      input: {
        invalidState: string;
        states: MutexKeyStateEntity.Type[];
      };
      kind: 'validate-states';
      name: string;
    }
  | {
      description: string;
      expected: {
        from: 'unlocked';
        key: string;
        to: 'locked';
      };
      input: {
        key: string;
      };
      kind: 'unlocked-to-locked';
      name: string;
    }
  | {
      description: string;
      expected: {
        from: 'locked';
        key: string;
        to: 'queued';
      };
      input: {
        key: string;
      };
      kind: 'locked-to-queued';
      name: string;
    }
  | {
      description: string;
      expected: {
        from: 'queued';
        key: string;
        to: 'locked';
      };
      input: {
        key: string;
      };
      kind: 'queued-to-locked';
      name: string;
    }
  | {
      description: string;
      expected: {
        from: 'locked';
        key: string;
        to: 'unlocked';
      };
      input: {
        key: string;
      };
      kind: 'locked-to-unlocked';
      name: string;
    }
  | {
      description: string;
      expected: {
        errorPattern: string;
      };
      input: {
        key: string;
      };
      kind: 'illegal-transition-throws';
      name: string;
    };

import scenarioGroups from './fsm.scenarios.json';

interface TransitionRecord {
  from: MutexKeyStateEntity.Type;
  key: string;
  to: MutexKeyStateEntity.Type;
}

class TrackingMutex extends Mutex<string> {
  readonly transitions: TransitionRecord[] = [];

  static tracked(): TrackingMutex {
    return new TrackingMutex();
  }

  protected override guardKey(from: MutexKeyStateEntity.Type, to: MutexKeyStateEntity.Type): boolean {
    return super.guardKey(from, to);
  }

  protected override onEnterKey(key: string, to: MutexKeyStateEntity.Type, from: MutexKeyStateEntity.Type): void {
    this.transitions.push({ from, key, to });
  }
}

class ForcingMutex extends Mutex<string> {
  protected override guardKey(_from: MutexKeyStateEntity.Type, to: MutexKeyStateEntity.Type): boolean {
    if (to === 'unlocked') return false;
    return super.guardKey(_from, to);
  }

  forceKeyTransition(key: string, to: MutexKeyStateEntity.Type): void {
    this.transitionKey(key, to);
  }
}

const runnerMap: Record<ScenarioCase['kind'], (scenarioCase: ScenarioCase) => Promise<void> | void> = {
  'illegal-transition-throws': (scenarioCase) => {
    const mutex = new ForcingMutex();
    assert.throws(() => { mutex.forceKeyTransition(scenarioCase.input.key, 'unlocked'); }, /Illegal state transition/);
    assert.equal(scenarioCase.expected.errorPattern, 'Illegal state transition');
  },
  'locked-to-queued': async (scenarioCase) => {
    const mutex = TrackingMutex.tracked();
    const firstRelease = await mutex.acquire(scenarioCase.input.key);
    const pendingAcquire = mutex.acquire(scenarioCase.input.key);
    await delay(0);
    const queuedTransition = mutex.transitions.find((t) => t.key === scenarioCase.input.key && t.from === scenarioCase.expected.from && t.to === scenarioCase.expected.to);
    assert.ok(queuedTransition !== undefined);
    firstRelease();
    const secondRelease = await pendingAcquire;
    secondRelease();
    assert.equal(queuedTransition?.key, scenarioCase.expected.key);
  },
  'locked-to-unlocked': async (scenarioCase) => {
    const mutex = TrackingMutex.tracked();
    const release = await mutex.acquire(scenarioCase.input.key);
    release();
    await delay(0);
    const unlockedTransition = mutex.transitions.find((t) => t.key === scenarioCase.input.key && t.from === scenarioCase.expected.from && t.to === scenarioCase.expected.to);
    assert.ok(unlockedTransition !== undefined);
    assert.equal(unlockedTransition?.key, scenarioCase.expected.key);
  },
  'queued-to-locked': async (scenarioCase) => {
    const mutex = TrackingMutex.tracked();
    const firstRelease = await mutex.acquire(scenarioCase.input.key);
    const pendingAcquire = mutex.acquire(scenarioCase.input.key);
    await delay(0);
    firstRelease();
    const secondRelease = await pendingAcquire;
    const handoffTransition = mutex.transitions.find((t) => t.key === scenarioCase.input.key && t.from === scenarioCase.expected.from && t.to === scenarioCase.expected.to);
    assert.ok(handoffTransition !== undefined);
    secondRelease();
    assert.equal(handoffTransition?.key, scenarioCase.expected.key);
  },
  'unlocked-to-locked': async (scenarioCase) => {
    const mutex = TrackingMutex.tracked();
    const release = await mutex.acquire(scenarioCase.input.key);
    const first = mutex.transitions[0];
    assert.ok(first !== undefined);
    assert.deepStrictEqual(first.key, scenarioCase.expected.key);
    assert.deepStrictEqual(first.from, scenarioCase.expected.from);
    assert.deepStrictEqual(first.to, scenarioCase.expected.to);
    release();
  },
  'validate-states': (scenarioCase) => {
    for (const state of scenarioCase.input.states) {
      assert.deepStrictEqual(MutexKeyStateEntity.validate(state), scenarioCase.expected.validStates);
    }
    assert.deepStrictEqual(MutexKeyStateEntity.validate(scenarioCase.input.invalidState), scenarioCase.expected.invalidState);
  }
};

void describe('Mutex FSM', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runnerMap[scenarioCase.kind](scenarioCase);
    });
  }
});
