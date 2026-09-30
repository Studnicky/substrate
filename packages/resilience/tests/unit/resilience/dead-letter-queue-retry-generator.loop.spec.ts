import type { HookInvocationError } from '@studnicky/errors/node';
import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { DeadLetterQueue, DeadLetterQueueRetryGenerator, ResilienceConfigError } from '../../../src/index.js';
import { DeadLetterQueueRetryGeneratorScenarioCaseEntity } from '../entities/DeadLetterQueueRetryGeneratorScenarioCaseEntity.js';
import scenarioGroups from './dead-letter-queue-retry-generator.scenarios.json' with { 'type': 'json' };

class ObservedRetryGenerator<T> extends DeadLetterQueueRetryGenerator<T> {
  readonly events: string[] = [];
  static build<T>(deadLetterQueue: DeadLetterQueue<T>, intervalMs: number): ObservedRetryGenerator<T> { return new ObservedRetryGenerator<T>({ 'deadLetterQueue': deadLetterQueue, 'intervalMs': intervalMs }); }
  protected override onDone(): void { this.events.push('done'); }
  protected override onWait(intervalMs: number): void { this.events.push(`wait:${intervalMs}`); }
  protected override onYield(): void { this.events.push('yield'); }
}

class ThrowingYieldGenerator<T> extends DeadLetterQueueRetryGenerator<T> {
  static build<T>(deadLetterQueue: DeadLetterQueue<T>, intervalMs: number): ThrowingYieldGenerator<T> { return new ThrowingYieldGenerator<T>({ 'deadLetterQueue': deadLetterQueue, 'intervalMs': intervalMs }); }
  protected override onYield(): void { throw RuntimeError.create('onYield boom'); }
}

class ThrowingWaitGenerator<T> extends DeadLetterQueueRetryGenerator<T> {
  static build<T>(deadLetterQueue: DeadLetterQueue<T>, intervalMs: number): ThrowingWaitGenerator<T> { return new ThrowingWaitGenerator<T>({ 'deadLetterQueue': deadLetterQueue, 'intervalMs': intervalMs }); }
  protected override onWait(): void { throw RuntimeError.create('onWait boom'); }
}

class ThrowingDoneGenerator<T> extends DeadLetterQueueRetryGenerator<T> {
  static build<T>(deadLetterQueue: DeadLetterQueue<T>, intervalMs: number): ThrowingDoneGenerator<T> { return new ThrowingDoneGenerator<T>({ 'deadLetterQueue': deadLetterQueue, 'intervalMs': intervalMs }); }
  protected override onDone(): void { throw RuntimeError.create('onDone boom'); }
}

class RecordingRetryGenerator<T> extends DeadLetterQueueRetryGenerator<T> {
  constructor(deadLetterQueue: DeadLetterQueue<T>, intervalMs: number) { super({ 'deadLetterQueue': deadLetterQueue, 'intervalMs': intervalMs }); }
  get recordedHookErrors(): readonly HookInvocationError[] {
    const result = this.hooks.getHookErrors();
    return result;
  }
}

class DeadLetterQueueRetryGeneratorRunners {
  static async 'dlqr-async-hook-isolation'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueRetryGeneratorScenarioCaseEntity.Type, 'dlqr-async-hook-isolation'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (): void => { rejectionEvents.push(undefined); };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const firstQueue = DeadLetterQueue.create<string>();
      const yielded = expected.yielded;
      firstQueue.enqueue(ScenarioValues.requireDefined(yielded[0], 'Scenario yielded[0]'), 'reason');
      firstQueue.close();
      const secondQueue = DeadLetterQueue.create<string>();
      secondQueue.enqueue(ScenarioValues.requireDefined(yielded[1], 'Scenario yielded[1]'), 'reason');
      secondQueue.close();
      const firstCause = RuntimeError.create(input.first);
      const secondCause = RuntimeError.create(input.second);
      const intervalMs = input.intervalMs;
      const first = new RecordingRetryGenerator(firstQueue, intervalMs);
      Object.assign(first, {
        'onYield': async (): Promise<void> => {
          await Promise.resolve();
          throw firstCause;
        }
      });
      const second = new RecordingRetryGenerator(secondQueue, intervalMs);
      Object.assign(second, {
        'onYield': async (): Promise<void> => {
          await Promise.resolve();
          throw secondCause;
        }
      });
      const firstYielded: string[] = [];
      const secondYielded: string[] = [];
      for await (const entry of first.generate()) { firstYielded.push(entry.item); }
      for await (const entry of second.generate()) { secondYielded.push(entry.item); }
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.deepEqual([...firstYielded, ...secondYielded], yielded);
      assert.equal(rejectionEvents.length, expected.rejectionEvents);
      const firstErrors = first.recordedHookErrors;
      const secondErrors = second.recordedHookErrors;
      assert.equal(firstErrors.length, 1);
      assert.equal(firstErrors[0]?.hookName, expected.hookName);
      assert.ok(firstErrors[0]?.cause instanceof Error);
      assert.equal(firstErrors[0].cause.message, firstCause.message);
      assert.equal(secondErrors.length, 1);
      assert.equal(secondErrors[0]?.hookName, expected.hookName);
      assert.ok(secondErrors[0]?.cause instanceof Error);
      assert.equal(secondErrors[0].cause.message, secondCause.message);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static async 'dlqr-hook-swallows'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueRetryGeneratorScenarioCaseEntity.Type, 'dlqr-hook-swallows'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const intervalMs = input.intervalMs;
    const items = input.items;
    const deadLetterQueue = DeadLetterQueue.create<string>();
    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      const item = ScenarioValues.requireDefined(items[itemIndex], 'Scenario items[itemIndex]');
      deadLetterQueue.enqueue(item, 'reason');
    }
    deadLetterQueue.close();
    const generator = ThrowingYieldGenerator.build(deadLetterQueue, intervalMs);
    const yielded: string[] = [];
    for await (const entry of generator.generate()) { yielded.push(entry.item); }
    assert.deepEqual(yielded, expected.yielded);
    const waitDeadLetterQueue = DeadLetterQueue.create<string>();
    for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
      const item = ScenarioValues.requireDefined(items[itemIndex], 'Scenario items[itemIndex]');
      waitDeadLetterQueue.enqueue(item, 'reason');
    }
    waitDeadLetterQueue.close();
    const waitGenerator = ThrowingWaitGenerator.build(waitDeadLetterQueue, intervalMs);
    const waited: string[] = [];
    for await (const entry of waitGenerator.generate()) { waited.push(entry.item); }
    assert.deepEqual(waited, expected.yielded);
    const doneDeadLetterQueue = DeadLetterQueue.create<string>();
    doneDeadLetterQueue.close();
    const doneGenerator = ThrowingDoneGenerator.build(doneDeadLetterQueue, intervalMs);
    const count = (await Array.fromAsync(doneGenerator.generate())).length;
    assert.equal(count, 0);
    assert.equal(yielded.length > 0 && waited.length > 0 && count === 0, expected.waitYieldDone);
  }

  static 'dlqr-invalid-interval'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueRetryGeneratorScenarioCaseEntity.Type, 'dlqr-invalid-interval'>): void {
    const input = scenarioCase.input.resilience;
    const deadLetterQueue = DeadLetterQueue.create<string>();
    for (let intervalMsIndex = 0; intervalMsIndex < input.intervalMs.length; intervalMsIndex += 1) {
      const intervalMs = ScenarioValues.requireDefined(input.intervalMs[intervalMsIndex], 'Scenario input.intervalMs[intervalMsIndex]');
      assert.throws(() => { DeadLetterQueueRetryGenerator.create({ 'deadLetterQueue': deadLetterQueue, 'intervalMs': intervalMs }); }, ResilienceConfigError);
    }
  }

  static async 'dlqr-lifecycle'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueRetryGeneratorScenarioCaseEntity.Type, 'dlqr-lifecycle'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const deadLetterQueue = DeadLetterQueue.create<string>();
    for (let itemIndex = 0; itemIndex < input.items.length; itemIndex += 1) {
      const item = ScenarioValues.requireDefined(input.items[itemIndex], 'Scenario input.items[itemIndex]');
      deadLetterQueue.enqueue(item, 'reason');
    }
    deadLetterQueue.close();
    const generator = ObservedRetryGenerator.build(deadLetterQueue, input.intervalMs);
    const yielded: string[] = [];
    for await (const entry of generator.generate()) { yielded.push(entry.item); }
    assert.deepEqual(yielded, expected.yielded);
    assert.deepEqual(generator.events, expected.events);
  }

  static 'dlqr-missing-dlq'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueRetryGeneratorScenarioCaseEntity.Type, 'dlqr-missing-dlq'>): void {
    const input = scenarioCase.input.resilience;
    assert.throws(() => {
      DeadLetterQueueRetryGenerator.create({ 'deadLetterQueue': null, 'intervalMs': input.intervalMs });
    }, ResilienceConfigError);
  }
}

ScenarioSuite.register({
  'entity': DeadLetterQueueRetryGeneratorScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'DeadLetterQueueRetryGenerator',
  'runners': DeadLetterQueueRetryGeneratorRunners
});
