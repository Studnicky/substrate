import type { HookInvocationError } from '@studnicky/errors/node';

import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { DeadLetterQueueOptionsInterface } from '../../../src/index.js';

import { ScenarioSuite, ScenarioValues } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { DeadLetterQueueEntryMetadataEntity } from '../../../src/entities/index.js';
import {
  DeadLetterQueue,
  DeadLetterQueueAbortedError,
  DeadLetterQueueClosedError,
  DeadLetterQueueFullError,
  ResilienceConfigError
} from '../../../src/index.js';
import { DeadLetterQueueScenarioCaseEntity } from '../entities/DeadLetterQueueScenarioCaseEntity.js';
import scenarioGroups from './dead-letter-queue.scenarios.json' with { 'type': 'json' };

class ObservedDeadLetterQueue<T> extends DeadLetterQueue<T> {
  readonly events: { 'item'?: T; 'type': string; }[] = [];
  constructor(options?: DeadLetterQueueOptionsInterface) { super(options); }
  protected override onEnqueue(item: T): void { this.events.push({ 'item': item, 'type': 'enqueue' }); }
  protected override onDequeue(item: T): void { this.events.push({ 'item': item, 'type': 'dequeue' }); }
  protected override onOverflow(): void { this.events.push({ 'type': 'overflow' }); }
  protected override onClose(): void { this.events.push({ 'type': 'close' }); }
  protected override onAbort(): void { this.events.push({ 'type': 'abort' }); }
}

class ThrowingEnqueueDeadLetterQueue<T> extends DeadLetterQueue<T> { protected override onEnqueue(): void { throw RuntimeError.create('onEnqueue boom'); } }

class ThrowingDequeueDeadLetterQueue<T> extends DeadLetterQueue<T> { protected override onDequeue(): void { throw RuntimeError.create('onDequeue boom'); } }

class ThrowingOverflowDeadLetterQueue<T> extends DeadLetterQueue<T> { protected override onOverflow(): void { throw RuntimeError.create('onOverflow boom'); } }

class ThrowingCloseDeadLetterQueue<T> extends DeadLetterQueue<T> { protected override onClose(): void { throw RuntimeError.create('onClose boom'); } }

class ThrowingAbortDeadLetterQueue<T> extends DeadLetterQueue<T> { protected override onAbort(): void { throw RuntimeError.create('onAbort boom'); } }

class RecordingDeadLetterQueue<T> extends DeadLetterQueue<T> {
  constructor() { super(); }
  get recordedHookErrors(): readonly HookInvocationError[] {
    const result = this.hooks.getHookErrors();
    return result;
  }
}

class FanOutDeadLetterQueue<T> extends DeadLetterQueue<T> {
  readonly #waiters: (() => void)[] = [];
  protected override registerDrainWaiter(notify: () => void): void { this.#waiters.push(notify); }
  protected override wakeDrainWaiters(): void {
    const waiters = this.#waiters.splice(0, this.#waiters.length);
    for (let index = 0; index < waiters.length; index += 1) {
      waiters[index]?.();
    }
  }
}

class DeadLetterQueueRunners {
  static 'dlq-aborted-signal'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueScenarioCaseEntity.Type, 'dlq-aborted-signal'>): void {
    const input = scenarioCase.input.resilience;
    const controller = new AbortController();
    controller.abort(RuntimeError.create('aborted'));
    const deadLetterQueue = DeadLetterQueue.create<string>({ 'signal': controller.signal });
    assert.throws(() => { deadLetterQueue.enqueue(input.item, input.reason); }, DeadLetterQueueAbortedError);
  }

  static async 'dlq-async-hook-isolation'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueScenarioCaseEntity.Type, 'dlq-async-hook-isolation'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (): void => { rejectionEvents.push(undefined); };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const firstCause = RuntimeError.create(input.first);
      const secondCause = RuntimeError.create(input.second);
      const first = new RecordingDeadLetterQueue<string>();
      Object.assign(first, {
        'onEnqueue': async (): Promise<void> => {
          await Promise.resolve();
          throw firstCause;
        }
      });
      const second = new RecordingDeadLetterQueue<string>();
      Object.assign(second, {
        'onEnqueue': async (): Promise<void> => {
          await Promise.resolve();
          throw secondCause;
        }
      });
      first.enqueue('first', 'reason');
      second.enqueue('second', 'reason');
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.equal(rejectionEvents.length, expected.rejectionEvents);
      assert.equal(first.size, 1);
      const firstErrors = first.recordedHookErrors;
      const secondErrors = second.recordedHookErrors;
      assert.equal(firstErrors.length, expected.hookErrorCount);
      assert.equal(firstErrors[0]?.hookName, expected.hookName);
      assert.ok(firstErrors[0]?.cause instanceof Error);
      assert.equal(firstErrors[0].cause.message, firstCause.message);
      assert.equal(second.size, 1);
      assert.equal(secondErrors.length, expected.hookErrorCount);
      assert.equal(secondErrors[0]?.hookName, expected.hookName);
      assert.ok(secondErrors[0]?.cause instanceof Error);
      assert.equal(secondErrors[0].cause.message, secondCause.message);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static async 'dlq-drain-abort'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueScenarioCaseEntity.Type, 'dlq-drain-abort'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const deadLetterQueue = DeadLetterQueue.create<number>();
    for (let itemIndex = 0; itemIndex < input.items.length; itemIndex += 1) {
      const item = ScenarioValues.requireDefined(input.items[itemIndex], 'Scenario input.items[itemIndex]');
      deadLetterQueue.enqueue(item, input.reason);
    }
    const entries: number[] = [];
    const drainPromise = (async () => { for await (const error of deadLetterQueue.drain()) { entries.push(error.item); } })();
    setImmediate(() => { deadLetterQueue.abort(); });
    await drainPromise;
    assert.equal(entries.length, expected.drainedCount);
  }

  static async 'dlq-drain-abort-signal'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueScenarioCaseEntity.Type, 'dlq-drain-abort-signal'>): Promise<void> {
    const expected = scenarioCase.expected;
    const controller = new AbortController();
    const deadLetterQueue = DeadLetterQueue.create<string>({ 'signal': controller.signal });
    const collected: string[] = [];
    const drainPromise = (async () => { for await (const error of deadLetterQueue.drain()) { collected.push(error.item); } })();
    setImmediate(() => { controller.abort(RuntimeError.create('aborted')); });
    await drainPromise;
    assert.equal(collected.length, expected.collected);
  }

  static async 'dlq-drain-close'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueScenarioCaseEntity.Type, 'dlq-drain-close'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const deadLetterQueue = DeadLetterQueue.create<string>();
    for (let itemIndex = 0; itemIndex < input.items.length; itemIndex += 1) {
      const item = ScenarioValues.requireDefined(input.items[itemIndex], 'Scenario input.items[itemIndex]');
      deadLetterQueue.enqueue(item, input.reason);
    }
    deadLetterQueue.close();
    const drained = await Array.fromAsync(deadLetterQueue.drain());
    assert.equal(drained.length, expected.drainedCount);
  }

  static async 'dlq-drain-fifo'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueScenarioCaseEntity.Type, 'dlq-drain-fifo'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const deadLetterQueue = DeadLetterQueue.create<string>();
    for (let itemIndex = 0; itemIndex < input.items.length; itemIndex += 1) {
      const item = ScenarioValues.requireDefined(input.items[itemIndex], 'Scenario input.items[itemIndex]');
      deadLetterQueue.enqueue(item, input.reason);
    }
    deadLetterQueue.close();
    const items: string[] = [];
    for await (const entry of deadLetterQueue.drain()) { items.push(entry.item); }
    assert.deepEqual(items, expected.drained);
  }

  static async 'dlq-drain-wake'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueScenarioCaseEntity.Type, 'dlq-drain-wake'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const deadLetterQueue = DeadLetterQueue.create<string>();
    const collected: string[] = [];
    const drainPromise = (async () => {
      for await (const error of deadLetterQueue.drain()) {
        collected.push(error.item);
        if (collected.length === input.items.length) { deadLetterQueue.close(); }
      }
    })();
    setImmediate(() => {
      for (let itemIndex = 0; itemIndex < input.items.length; itemIndex += 1) {
        const item = ScenarioValues.requireDefined(input.items[itemIndex], 'Scenario input.items[itemIndex]');
        deadLetterQueue.enqueue(item, input.reason);
      }
    });
    await drainPromise;
    assert.deepEqual(collected, expected.drained);
  }

  static 'dlq-enqueue'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueScenarioCaseEntity.Type, 'dlq-enqueue'>): void {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const deadLetterQueue = DeadLetterQueue.create<string>();
    deadLetterQueue.enqueue(input.defaultItem, input.defaultReason);
    assert.equal(deadLetterQueue.size, expected.size);
    const deadLetterQueueWithError = DeadLetterQueue.create<string>({ 'clock': () => {return input.withClockMs;} });
    const error = RuntimeError.create(input.secondErrorMessage);
    deadLetterQueueWithError.enqueue(input.secondItem, input.secondReason, error);
    assert.equal(deadLetterQueueWithError.size, expected.sizeWithError);
  }

  static 'dlq-enqueue-errors'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueScenarioCaseEntity.Type, 'dlq-enqueue-errors'>): void {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const scenarios = input.scenarios;
    const errors = expected.errors;
    for (let index = 0; index < scenarios.length; index += 1) {
      const deadLetterQueue = DeadLetterQueue.create<string>({ 'capacity': input.capacity });
      DeadLetterQueueRunners.setUpEnqueueError(deadLetterQueue, ScenarioValues.requireDefined(scenarios[index], 'Scenario scenarios[index]'));
      const errorTypeName = ScenarioValues.requireDefined(errors[index], 'Scenario errors[index]');
      assert.throws(() => { deadLetterQueue.enqueue('c', 'r3'); }, (error: unknown) => {
        const result = DeadLetterQueueRunners.isDeadLetterQueueErrorType(error, errorTypeName);
        return result;
      });
    }
  }

  static async 'dlq-entry-fields'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueScenarioCaseEntity.Type, 'dlq-entry-fields'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const deadLetterQueue = DeadLetterQueue.create<string>({ 'clock': () => {return input.clockMs;} });
    const error = RuntimeError.create(input.errorMessage);
    deadLetterQueue.enqueue(input.item, input.reason, error);
    deadLetterQueue.close();
    const gen = deadLetterQueue.drain();
    const step = await gen.next();
    if (step.done === true) {
      throw RuntimeError.create('Expected a drained entry');
    }
    const entry = step.value;
    assert.equal(entry.item, expected.item);
    assert.equal(entry.reason, expected.reason);
    assert.equal(entry.error, error);
    assert.equal(entry.enqueuedAtMs, expected.enqueuedAtMs);
    assert.equal(typeof entry.id === 'string' && entry.id.length > 0, expected.hasId);
  }

  static async 'dlq-fanout'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueScenarioCaseEntity.Type, 'dlq-fanout'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const deadLetterQueue = FanOutDeadLetterQueue.create<string>();
    const collectedA: string[] = [];
    const collectedB: string[] = [];
    const drainA = (async () => { for await (const error of deadLetterQueue.drain()) { collectedA.push(error.item); } })();
    const drainB = (async () => { for await (const error of deadLetterQueue.drain()) { collectedB.push(error.item); } })();
    await DeadLetterQueueRunners.tick();
    for (let itemIndex = 0; itemIndex < input.items.length; itemIndex += 1) {
      const item = ScenarioValues.requireDefined(input.items[itemIndex], 'Scenario input.items[itemIndex]');
      deadLetterQueue.enqueue(item, input.reason);
    }
    deadLetterQueue.close();
    await Promise.all([drainA, drainB]);
    const combined = [...collectedA, ...collectedB].toSorted();
    assert.deepEqual(combined, expected.combined);
  }

  static async 'dlq-hook-swallows'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueScenarioCaseEntity.Type, 'dlq-hook-swallows'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const [item] = input.items;
    if (item === undefined) {
      throw RuntimeError.create('Expected DLQ hook item fixture');
    }
    const reason = input.reason;
    const enqueueDeadLetterQueue = ThrowingEnqueueDeadLetterQueue.create<string>();
    enqueueDeadLetterQueue.enqueue(item, reason);
    assert.equal(enqueueDeadLetterQueue.size, expected.size);
    const dequeueDeadLetterQueue = ThrowingDequeueDeadLetterQueue.create<string>();
    dequeueDeadLetterQueue.enqueue(item, reason);
    dequeueDeadLetterQueue.close();
    const entries: string[] = [];
    for await (const entry of dequeueDeadLetterQueue.drain()) { entries.push(entry.item); }
    assert.deepEqual(entries, [item]);
    assert.equal(dequeueDeadLetterQueue.size, 0);
    const overflowDeadLetterQueue = ThrowingOverflowDeadLetterQueue.create<string>({ 'capacity': input.overflowCapacity });
    overflowDeadLetterQueue.enqueue('first', reason);
    assert.throws(() => { overflowDeadLetterQueue.enqueue('second', reason); }, DeadLetterQueueFullError);
    const closeDeadLetterQueue = ThrowingCloseDeadLetterQueue.create<string>();
    closeDeadLetterQueue.close();
    assert.equal(closeDeadLetterQueue.closed, expected.closed);
    const abortDeadLetterQueue = ThrowingAbortDeadLetterQueue.create<string>();
    abortDeadLetterQueue.abort();
    if (expected.abortedRejects) {
      assert.throws(() => { abortDeadLetterQueue.enqueue(item, reason); }, DeadLetterQueueAbortedError);
    } else {
      assert.doesNotThrow(() => { abortDeadLetterQueue.enqueue(item, reason); });
    }
  }

  static 'dlq-invalid-capacity'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueScenarioCaseEntity.Type, 'dlq-invalid-capacity'>): void {
    const input = scenarioCase.input.resilience;
    assert.throws(() => { DeadLetterQueue.create<string>({ 'capacity': input.capacity }); }, ResilienceConfigError);
  }

  static 'dlq-observed-abort'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueScenarioCaseEntity.Type, 'dlq-observed-abort'>): void {
    const expected = scenarioCase.expected;
    const deadLetterQueue = new ObservedDeadLetterQueue<string>();
    deadLetterQueue.abort();
    assert.ok(deadLetterQueue.events.some((error) => {
      const result = error.type === expected.eventsContain;
      return result;
    }));
  }

  static 'dlq-observed-close'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueScenarioCaseEntity.Type, 'dlq-observed-close'>): void {
    const expected = scenarioCase.expected;
    const deadLetterQueue = new ObservedDeadLetterQueue<string>();
    deadLetterQueue.close();
    assert.ok(deadLetterQueue.events.some((error) => {
      const result = error.type === expected.eventsContain;
      return result;
    }));
  }

  static async 'dlq-observed-dequeue'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueScenarioCaseEntity.Type, 'dlq-observed-dequeue'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected.eventsContain;
    const deadLetterQueue = new ObservedDeadLetterQueue<string>();
    deadLetterQueue.enqueue(input.item, input.reason);
    deadLetterQueue.close();
    const drainedItems: string[] = [];
    for await (const entry of deadLetterQueue.drain()) { drainedItems.push(entry.item); }
    assert.ok(
      deadLetterQueue.events.some((error) => {
        const result = error.type === expected.type && error.item === expected.item;
        return result;
      })
    );
  }

  static 'dlq-observed-enqueue'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueScenarioCaseEntity.Type, 'dlq-observed-enqueue'>): void {
    const input = scenarioCase.input.resilience;
    const [event] = scenarioCase.expected.events;
    if (event === undefined) {
      throw RuntimeError.create('Expected DLQ enqueue event fixture');
    }
    const deadLetterQueue = new ObservedDeadLetterQueue<string>();
    deadLetterQueue.enqueue(input.item, input.reason);
    assert.equal(deadLetterQueue.events[0]?.type, event.type);
    assert.equal(deadLetterQueue.events[0]?.item, event.item);
  }

  static 'dlq-observed-overflow'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueScenarioCaseEntity.Type, 'dlq-observed-overflow'>): void {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const items = input.items;
    const deadLetterQueue = new ObservedDeadLetterQueue<string>({ 'capacity': input.capacity });
    deadLetterQueue.enqueue(ScenarioValues.requireDefined(items[0], 'Scenario items[0]'), 'r');
    assert.throws(() => { deadLetterQueue.enqueue(ScenarioValues.requireDefined(items[1], 'Scenario items[1]'), 'r'); }, DeadLetterQueueFullError);
    assert.ok(deadLetterQueue.events.some((error) => {
      const result = error.type === expected.eventsContain;
      return result;
    }));
  }

  static async 'dlq-single-consumer'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueScenarioCaseEntity.Type, 'dlq-single-consumer'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const deadLetterQueue = DeadLetterQueue.create<string>();
    const collectedA: string[] = [];
    const collectedB: string[] = [];
    void (async () => { for await (const error of deadLetterQueue.drain()) { collectedA.push(error.item); } })();
    await DeadLetterQueueRunners.tick();
    const drainB = (async () => { for await (const error of deadLetterQueue.drain()) { collectedB.push(error.item); } })();
    await DeadLetterQueueRunners.tick();
    for (let itemIndex = 0; itemIndex < input.items.length; itemIndex += 1) {
      const item = ScenarioValues.requireDefined(input.items[itemIndex], 'Scenario input.items[itemIndex]');
      deadLetterQueue.enqueue(item, input.reason);
    }
    deadLetterQueue.close();
    await drainB;
    assert.deepEqual(collectedA, expected.firstCollector);
    assert.deepEqual(collectedB, expected.secondCollector);
  }

  static async 'dlq-size'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueScenarioCaseEntity.Type, 'dlq-size'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const deadLetterQueue = DeadLetterQueue.create<string>();
    assert.equal(deadLetterQueue.size, expected.sizeBefore);
    const withEntry = DeadLetterQueue.create<string>();
    withEntry.enqueue(input.enqueue, input.reason);
    const gen = withEntry.drain();
    await gen.next();
    assert.equal(withEntry.size, expected.sizeAfterDrain);
  }

  static 'entity-dlq-entry'(scenarioCase: ScenarioCaseOfType<DeadLetterQueueScenarioCaseEntity.Type, 'entity-dlq-entry'>): void {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    assert.equal(DeadLetterQueueEntryMetadataEntity.validate(input.valid), expected.valid);
    assert.equal(DeadLetterQueueEntryMetadataEntity.validate(input.invalid), expected.invalid);
  }

  private static async tick(): Promise<void> {
    await new Promise<void>((resolve) => { setImmediate(resolve); });
  }

  private static isDeadLetterQueueErrorType(error: unknown, name: string): boolean {
    if (name === 'DeadLetterQueueAbortedError') {
      const result = error instanceof DeadLetterQueueAbortedError;
      return result;
    }
    if (name === 'DeadLetterQueueClosedError') {
      const result = error instanceof DeadLetterQueueClosedError;
      return result;
    }
    if (name === 'DeadLetterQueueFullError') {
      const result = error instanceof DeadLetterQueueFullError;
      return result;
    }
    throw RuntimeError.create(`Unknown DLQ error type name: ${name}`);
  }

  private static setUpEnqueueError(deadLetterQueue: DeadLetterQueue<string>, scenario: string): void {
    if (scenario === 'aborted') {
      deadLetterQueue.abort();
    } else if (scenario === 'closed') {
      deadLetterQueue.close();
    } else if (scenario === 'full') {
      deadLetterQueue.enqueue('a', 'r1');
      deadLetterQueue.enqueue('b', 'r2');
    } else {
      throw RuntimeError.create(`Unknown DLQ enqueue-error scenario: ${scenario}`);
    }
  }
}

ScenarioSuite.register({
  'entity': DeadLetterQueueScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'DeadLetterQueue',
  'runners': DeadLetterQueueRunners
});
