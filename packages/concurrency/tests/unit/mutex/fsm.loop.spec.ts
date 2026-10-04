import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { MutexKeyStateEntity } from '../../../src/entities/MutexKeyStateEntity.js';
import { Mutex } from '../../../src/mutex/index.js';
import { FsmScenarioCaseEntity } from './entities/FsmScenarioCaseEntity.js';
import scenarioGroups from './fsm.scenarios.json' with { 'type': 'json' };

interface TransitionRecordInterface {
  readonly 'from': MutexKeyStateEntity.Type;
  readonly 'key': string;
  readonly 'to': MutexKeyStateEntity.Type;
}

class TrackingMutex extends Mutex<string> {
  readonly transitions: TransitionRecordInterface[] = [];

  static tracked(): TrackingMutex {
    const tracked = new TrackingMutex();
    return tracked;
  }

  protected override guardKey(
    from: MutexKeyStateEntity.Type,
    to: MutexKeyStateEntity.Type
  ): boolean {
    const allowed = super.guardKey(from, to);
    return allowed;
  }

  protected override onEnterKey(
    key: string,
    to: MutexKeyStateEntity.Type,
    from: MutexKeyStateEntity.Type
  ): void {
    this.transitions.push({ 'from': from, 'key': key, 'to': to });
  }
}

class ForcingMutex extends Mutex<string> {
  static build(): ForcingMutex {
    const forcing = new ForcingMutex();
    return forcing;
  }
  protected override guardKey(
    _from: MutexKeyStateEntity.Type,
    to: MutexKeyStateEntity.Type
  ): boolean {
    let allowed = false;
    if (to !== 'unlocked') {
      allowed = super.guardKey(_from, to);
    }
    return allowed;
  }

  forceKeyTransition(key: string, to: MutexKeyStateEntity.Type): void {
    this.transitionKey(key, to);
  }
}

class FsmRunners {
  static 'illegal-transition-throws'(
    scenarioCase: ScenarioCaseOfType<FsmScenarioCaseEntity.Type, 'illegal-transition-throws'>
  ): void {
    const mutex = ForcingMutex.build();
    assert.throws(
      () => {
        mutex.forceKeyTransition(scenarioCase.input.key, 'unlocked');
      },
      (error): boolean => {
        const caught: unknown = error;
        const isIllegalTransition =
          caught instanceof Error && caught.message.includes('Illegal state transition');
        return isIllegalTransition;
      }
    );
    assert.equal(scenarioCase.expected.errorPattern, 'Illegal state transition');
  }

  static async 'locked-to-queued'(
    scenarioCase: ScenarioCaseOfType<FsmScenarioCaseEntity.Type, 'locked-to-queued'>
  ): Promise<void> {
    const mutex = TrackingMutex.tracked();
    const firstRelease = await mutex.acquire(scenarioCase.input.key);
    const pendingAcquire = mutex.acquire(scenarioCase.input.key);
    await setTimeout(0);
    const queuedTransition = FsmRunners.findTransition(
      mutex,
      scenarioCase.input.key,
      scenarioCase.expected.from,
      scenarioCase.expected.to
    );
    assert.ok(queuedTransition !== undefined);
    firstRelease();
    const secondRelease = await pendingAcquire;
    secondRelease();
    assert.equal(queuedTransition.key, scenarioCase.expected.key);
  }

  static async 'locked-to-unlocked'(
    scenarioCase: ScenarioCaseOfType<FsmScenarioCaseEntity.Type, 'locked-to-unlocked'>
  ): Promise<void> {
    const mutex = TrackingMutex.tracked();
    const release = await mutex.acquire(scenarioCase.input.key);
    release();
    await setTimeout(0);
    const unlockedTransition = FsmRunners.findTransition(
      mutex,
      scenarioCase.input.key,
      scenarioCase.expected.from,
      scenarioCase.expected.to
    );
    assert.ok(unlockedTransition !== undefined);
    assert.equal(unlockedTransition.key, scenarioCase.expected.key);
  }

  static async 'queued-to-locked'(
    scenarioCase: ScenarioCaseOfType<FsmScenarioCaseEntity.Type, 'queued-to-locked'>
  ): Promise<void> {
    const mutex = TrackingMutex.tracked();
    const firstRelease = await mutex.acquire(scenarioCase.input.key);
    const pendingAcquire = mutex.acquire(scenarioCase.input.key);
    await setTimeout(0);
    firstRelease();
    const secondRelease = await pendingAcquire;
    const handoffTransition = FsmRunners.findTransition(
      mutex,
      scenarioCase.input.key,
      scenarioCase.expected.from,
      scenarioCase.expected.to
    );
    assert.ok(handoffTransition !== undefined);
    secondRelease();
    assert.equal(handoffTransition.key, scenarioCase.expected.key);
  }

  static async 'unlocked-to-locked'(
    scenarioCase: ScenarioCaseOfType<FsmScenarioCaseEntity.Type, 'unlocked-to-locked'>
  ): Promise<void> {
    const mutex = TrackingMutex.tracked();
    const release = await mutex.acquire(scenarioCase.input.key);
    const first = mutex.transitions[0];
    assert.ok(first !== undefined);
    assert.deepStrictEqual(first.key, scenarioCase.expected.key);
    assert.deepStrictEqual(first.from, scenarioCase.expected.from);
    assert.deepStrictEqual(first.to, scenarioCase.expected.to);
    release();
  }

  static 'validate-states'(
    scenarioCase: ScenarioCaseOfType<FsmScenarioCaseEntity.Type, 'validate-states'>
  ): void {
    for (let index = 0; index < scenarioCase.input.states.length; index += 1) {
      assert.deepStrictEqual(
        MutexKeyStateEntity.validate(scenarioCase.input.states[index]),
        scenarioCase.expected.validStates
      );
    }
    assert.deepStrictEqual(
      MutexKeyStateEntity.validate(scenarioCase.input.invalidState),
      scenarioCase.expected.invalidState
    );
  }

  private static findTransition(
    mutex: TrackingMutex,
    key: string,
    from: MutexKeyStateEntity.Type,
    to: MutexKeyStateEntity.Type
  ): TransitionRecordInterface | undefined {
    const transition = mutex.transitions.find((candidate) => {
      const matches = candidate.key === key && candidate.from === from && candidate.to === to;
      return matches;
    });
    return transition;
  }
}

ScenarioSuite.register({
  'entity': FsmScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Mutex FSM',
  'runners': FsmRunners
});
