import { HookInvocationError, ReentrantHookInvocationError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite, ScenarioValues } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { Mutex } from '../../../src/mutex/index.js';
import { ReentrancyScenarioCaseEntity } from './entities/ReentrancyScenarioCaseEntity.js';
import scenarioGroups from './reentrancy.scenarios.json' with { 'type': 'json' };

class ReentrantBeforeAcquireMutex extends Mutex<string> {
  static build(): ReentrantBeforeAcquireMutex {
    const built = new ReentrantBeforeAcquireMutex();
    return built;
  }
  #reentered = false;

  protected override beforeAcquire(key: string): void {
    if (!this.#reentered) {
      this.#reentered = true;
      void this.acquire(key).then((release) => {
        release();
      });
    }
  }

  getHookErrors(): readonly HookInvocationError[] {
    const hookErrors = this.hooks.getHookErrors();
    return hookErrors;
  }
}

class ReentrantOnReleaseMutex extends Mutex<string> {
  static build(): ReentrantOnReleaseMutex {
    const built = new ReentrantOnReleaseMutex();
    return built;
  }
  #reentered = false;
  #release1: (() => void) | undefined;

  setRelease1(release1: () => void): void {
    this.#release1 = release1;
  }

  protected override onRelease(_key: string): void {
    if (!this.#reentered && this.#release1 !== undefined) {
      this.#reentered = true;
      this.#release1();
    }
  }

  getHookErrors(): readonly HookInvocationError[] {
    const hookErrors = this.hooks.getHookErrors();
    return hookErrors;
  }
}

class DifferentKeysMutex extends Mutex<string> {
  static build(): DifferentKeysMutex {
    const built = new DifferentKeysMutex();
    return built;
  }
  readonly beforeAcquireKeys: string[] = [];
  readonly onReleaseKeys: string[] = [];

  protected override beforeAcquire(key: string): void {
    this.beforeAcquireKeys.push(key);
  }

  protected override onRelease(key: string): void {
    this.onReleaseKeys.push(key);
  }

  getHookErrors(): readonly HookInvocationError[] {
    const hookErrors = this.hooks.getHookErrors();
    return hookErrors;
  }
}

class ReentrancyRunners {
  static async 'beforeAcquire-reentrant-same-key'(
    scenarioCase: ScenarioCaseOfType<
      ReentrancyScenarioCaseEntity.Type,
      'beforeAcquire-reentrant-same-key'
    >
  ): Promise<void> {
    const mutex = ReentrantBeforeAcquireMutex.build();
    const outerRelease = await mutex.acquire(scenarioCase.input.key);
    assert.strictEqual(mutex.getHookErrors().length, scenarioCase.expected.hookErrorCount);
    const hookError = mutex.getHookErrors()[0];
    assert.ok(hookError !== undefined, 'Expected a recorded hook error');
    assert.ok(hookError instanceof HookInvocationError);
    assert.strictEqual(hookError.hookName, scenarioCase.expected.hookName);
    const hookCause: unknown = hookError.cause;
    assert.ok(hookCause instanceof ReentrantHookInvocationError);
    assert.ok(mutex.isLocked(scenarioCase.input.key));
    outerRelease();
    assert.strictEqual(
      mutex.isLocked(scenarioCase.input.key),
      scenarioCase.expected.lockedAfterOuterRelease
    );
    const release = await mutex.acquire(scenarioCase.input.key);
    release();
    assert.ok(mutex.isLocked(scenarioCase.input.key) === false);
    assert.ok(mutex.isComplete() === scenarioCase.expected.complete);
  }

  static async 'different-keys-unaffected'(
    scenarioCase: ScenarioCaseOfType<
      ReentrancyScenarioCaseEntity.Type,
      'different-keys-unaffected'
    >
  ): Promise<void> {
    const mutex = DifferentKeysMutex.build();
    const firstKey = ScenarioValues.requireDefined(scenarioCase.input.keys[0], 'input.keys[0]');
    const secondKey = ScenarioValues.requireDefined(scenarioCase.input.keys[1], 'input.keys[1]');
    const [releaseA, releaseB] = await Promise.all([
      mutex.acquire(firstKey),
      mutex.acquire(secondKey)
    ]);
    assert.strictEqual(mutex.beforeAcquireKeys.length, scenarioCase.expected.keys.length);
    const acquiredKeys = new Set(mutex.beforeAcquireKeys);
    for (let index = 0; index < scenarioCase.expected.keys.length; index += 1) {
      assert.ok(
        acquiredKeys.has(
          ScenarioValues.requireDefined(scenarioCase.expected.keys[index], 'expected.keys[index]')
        )
      );
    }
    releaseA();
    releaseB();
    assert.strictEqual(mutex.onReleaseKeys.length, scenarioCase.expected.keys.length);
    const releasedKeys = new Set(mutex.onReleaseKeys);
    for (let index = 0; index < scenarioCase.expected.keys.length; index += 1) {
      assert.ok(
        releasedKeys.has(
          ScenarioValues.requireDefined(scenarioCase.expected.keys[index], 'expected.keys[index]')
        )
      );
    }
    assert.ok(mutex.isComplete() === scenarioCase.expected.complete);
    assert.strictEqual(mutex.getHookErrors().length, scenarioCase.expected.hookErrorCount);
  }

  static async 'onRelease-reentrant-same-key'(
    scenarioCase: ScenarioCaseOfType<
      ReentrancyScenarioCaseEntity.Type,
      'onRelease-reentrant-same-key'
    >
  ): Promise<void> {
    const mutex = ReentrantOnReleaseMutex.build();
    const release1 = await mutex.acquire(scenarioCase.input.key);
    const pendings: Promise<() => void>[] = [];
    for (let index = 0; index < scenarioCase.input.batch.pendingCount; index += 1) {
      pendings.push(mutex.acquire(scenarioCase.input.key));
    }
    mutex.setRelease1(release1);
    release1();
    assert.strictEqual(mutex.getHookErrors().length, scenarioCase.expected.hookErrorCount);
    assert.strictEqual(
      mutex.isLocked(scenarioCase.input.key),
      scenarioCase.expected.lockedAfterFirstRelease
    );
    const release2 = await ScenarioValues.requireDefined(pendings[0], 'pendings[0]');
    release2();
    assert.strictEqual(
      mutex.isLocked(scenarioCase.input.key),
      scenarioCase.expected.lockedAfterSecondRelease
    );
    const release3 = await ScenarioValues.requireDefined(pendings[1], 'pendings[1]');
    release3();
    assert.strictEqual(
      mutex.isLocked(scenarioCase.input.key),
      scenarioCase.expected.lockedAfterThirdRelease
    );
    assert.ok(mutex.isComplete() === scenarioCase.expected.complete);
  }
}

ScenarioSuite.register({
  'entity': ReentrancyScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Mutex reentrancy',
  'runners': ReentrancyRunners
});
