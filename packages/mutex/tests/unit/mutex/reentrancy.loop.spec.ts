import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HookInvocationError, ReentrantHookInvocationError } from '@studnicky/errors';

import { Mutex } from '../../../src/mutex/index.js';
import scenarioGroups from './reentrancy.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | {
      description: string;
      expected: { complete: boolean; hookErrorCount: number; hookName: 'beforeAcquire'; lockedAfterOuterRelease: boolean };
      input: { key: string };
      shape: 'beforeAcquire-reentrant-same-key';
      name: string;
    }
  | {
      description: string;
      expected: { complete: boolean; hookErrorCount: number; hookName: 'onRelease'; lockedAfterFirstRelease: boolean; lockedAfterSecondRelease: boolean; lockedAfterThirdRelease: boolean };
      input: { batch: { pendingCount: number }; key: string };
      shape: 'onRelease-reentrant-same-key';
      name: string;
    }
  | {
      description: string;
      expected: { complete: boolean; hookErrorCount: number; keys: string[] };
      input: { keys: string[] };
      shape: 'different-keys-unaffected';
      name: string;
    };

type ScenarioShape = ScenarioCase['shape'];
type ScenarioCaseOf<Shape extends ScenarioShape> = Extract<ScenarioCase, { shape: Shape }>;

function readArrayItem<T>(items: readonly T[], index: number, label: string): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`${label} is missing item ${index}`);
  }
  return item;
}

class ReentrantBeforeAcquireMutex extends Mutex<string> {
  #reentered = false;

  protected override beforeAcquire(key: string): void {
    if (!this.#reentered) {
      this.#reentered = true;
      void this.acquire(key).then((release) => { release(); });
    }
  }

  getHookErrors(): readonly HookInvocationError[] {
    return this.hooks.getHookErrors();
  }
}

class ReentrantOnReleaseMutex extends Mutex<string> {
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
    return this.hooks.getHookErrors();
  }
}

class DifferentKeysMutex extends Mutex<string> {
  readonly beforeAcquireKeys: string[] = [];
  readonly onReleaseKeys: string[] = [];

  protected override beforeAcquire(key: string): void {
    this.beforeAcquireKeys.push(key);
  }

  protected override onRelease(key: string): void {
    this.onReleaseKeys.push(key);
  }

  getHookErrors(): readonly HookInvocationError[] {
    return this.hooks.getHookErrors();
  }
}

const runnerMap: { [K in ScenarioShape]: (scenarioCase: ScenarioCaseOf<K>) => Promise<void> } = {
  'beforeAcquire-reentrant-same-key': async (scenarioCase) => {
      const mutex = ReentrantBeforeAcquireMutex.create();
      const outerRelease = await mutex.acquire(scenarioCase.input.key);
      assert.strictEqual(mutex.getHookErrors().length, scenarioCase.expected.hookErrorCount);
      const err = mutex.getHookErrors()[0];
      assert.ok(err !== undefined, 'Expected a recorded hook error');
      assert.ok(err instanceof HookInvocationError);
      assert.strictEqual(err.hookName, scenarioCase.expected.hookName);
      assert.ok(err.cause instanceof ReentrantHookInvocationError);
      assert.ok(mutex.isLocked(scenarioCase.input.key));
      outerRelease();
      assert.strictEqual(mutex.isLocked(scenarioCase.input.key), scenarioCase.expected.lockedAfterOuterRelease);
      const release = await mutex.acquire(scenarioCase.input.key);
      release();
      assert.ok(!mutex.isLocked(scenarioCase.input.key));
      assert.ok(mutex.isComplete() === scenarioCase.expected.complete);
  },
  'different-keys-unaffected': async (scenarioCase) => {
      const mutex = DifferentKeysMutex.create();
      const [releaseA, releaseB] = await Promise.all([
        mutex.acquire(scenarioCase.input.keys[0]!),
        mutex.acquire(scenarioCase.input.keys[1]!)
      ]);
      assert.strictEqual(mutex.beforeAcquireKeys.length, scenarioCase.expected.keys.length);
      for (const key of scenarioCase.expected.keys) {
        assert.ok(mutex.beforeAcquireKeys.includes(key));
      }
      releaseA();
      releaseB();
      assert.strictEqual(mutex.onReleaseKeys.length, scenarioCase.expected.keys.length);
      for (const key of scenarioCase.expected.keys) {
        assert.ok(mutex.onReleaseKeys.includes(key));
      }
      assert.ok(mutex.isComplete() === scenarioCase.expected.complete);
      assert.strictEqual(mutex.getHookErrors().length, scenarioCase.expected.hookErrorCount);
  },
  'onRelease-reentrant-same-key': async (scenarioCase) => {
      const mutex = ReentrantOnReleaseMutex.create();
      const release1 = await mutex.acquire(scenarioCase.input.key);
      const pendings = Array.from({ length: scenarioCase.input.batch.pendingCount }, () => mutex.acquire(scenarioCase.input.key));
      mutex.setRelease1(release1);
      release1();
      assert.strictEqual(mutex.getHookErrors().length, scenarioCase.expected.hookErrorCount);
      const err = mutex.getHookErrors()[0];
      assert.ok(err !== undefined, 'Expected a recorded hook error');
      assert.ok(err instanceof HookInvocationError);
      assert.strictEqual(err.hookName, scenarioCase.expected.hookName);
      assert.ok(err.cause instanceof ReentrantHookInvocationError);
      assert.strictEqual(mutex.isLocked(scenarioCase.input.key), scenarioCase.expected.lockedAfterFirstRelease);
      const release2 = await readArrayItem(pendings, 0, 'pendings');
      release2();
      assert.strictEqual(mutex.isLocked(scenarioCase.input.key), scenarioCase.expected.lockedAfterSecondRelease);
      const release3 = await readArrayItem(pendings, 1, 'pendings');
      release3();
      assert.strictEqual(mutex.isLocked(scenarioCase.input.key), scenarioCase.expected.lockedAfterThirdRelease);
      assert.ok(mutex.isComplete() === scenarioCase.expected.complete);
  }
};

async function runCase<Shape extends ScenarioShape>(scenarioCase: ScenarioCaseOf<Shape>): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Mutex reentrancy', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
