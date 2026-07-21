/**
 * Proves non-blocking lifecycle publication failures remain observable without
 * replacing the dispatched work's result or error.
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { EventBus } from '@studnicky/event-bus';

import type { BoundedDispatcherTopicMapInterface } from '../../../src/index.js';

import { BoundedDispatcher } from '../../../src/index.js';

class RejectingEventBus extends EventBus<BoundedDispatcherTopicMapInterface> {
  readonly #cause: unknown;
  readonly #failureOrdinal: number;
  #publicationCount = 0;

  constructor(failureOrdinal: number, cause: unknown) {
    super();
    this.#failureOrdinal = failureOrdinal;
    this.#cause = cause;
  }

  override publish<K extends keyof BoundedDispatcherTopicMapInterface>(
    topic: K,
    payload: BoundedDispatcherTopicMapInterface[K]
  ): Promise<void> {
    this.#publicationCount += 1;
    if (this.#publicationCount === this.#failureOrdinal) {
      return Promise.reject(this.#cause);
    }
    return super.publish(topic, payload);
  }
}

const flushMicrotasks = (): Promise<void> => new Promise((resolve) => { setImmediate(resolve); });

void describe('BoundedDispatcher lifecycle publication failures', () => {
  const unhandledRejections: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { unhandledRejections.push(reason); };

  beforeEach(() => {
    unhandledRejections.length = 0;
    process.on('unhandledRejection', onUnhandledRejection);
  });

  afterEach(() => {
    process.off('unhandledRejection', onUnhandledRejection);
    assert.deepEqual(unhandledRejections, []);
  });

  void it('records a rejected start publication and retains the work result', async () => {
    const publicationCause = new Error('start publication failed');
    const dispatcher = BoundedDispatcher.create({
      'bus': new RejectingEventBus(1, publicationCause)
    });

    const result = await dispatcher.dispatch(() => 'work result');
    await flushMicrotasks();

    const errors = dispatcher.getHookErrors();
    assert.equal(result, 'work result');
    assert.equal(dispatcher.hookErrorCount, 1);
    assert.equal(errors[0]?.hookName, 'publishDispatchStart');
    assert.notStrictEqual(errors[0]?.cause, publicationCause);
    assert.equal(errors[0]?.cause instanceof Error ? errors[0].cause.message : undefined, publicationCause.message);
  });

  void it('records a rejected success publication and retains the work result', async () => {
    const publicationCause = new Error('success publication failed');
    const dispatcher = BoundedDispatcher.create({
      'bus': new RejectingEventBus(2, publicationCause)
    });

    const result = await dispatcher.dispatch(async () => 'work result');
    await flushMicrotasks();

    const errors = dispatcher.getHookErrors();
    assert.equal(result, 'work result');
    assert.equal(dispatcher.hookErrorCount, 1);
    assert.equal(errors[0]?.hookName, 'publishDispatchSuccess');
    assert.notStrictEqual(errors[0]?.cause, publicationCause);
    assert.equal(errors[0]?.cause instanceof Error ? errors[0].cause.message : undefined, publicationCause.message);
  });

  void it('records a rejected error publication and retains the work error', async () => {
    const workError = new Error('work failed');
    const publicationCause = new Error('error publication failed');
    const dispatcher = BoundedDispatcher.create({
      'bus': new RejectingEventBus(2, publicationCause)
    });

    await assert.rejects(
      dispatcher.dispatch(async () => { throw workError; }),
      workError
    );
    await flushMicrotasks();

    const errors = dispatcher.getHookErrors();
    assert.equal(dispatcher.hookErrorCount, 1);
    assert.equal(errors[0]?.hookName, 'publishDispatchError');
    assert.notStrictEqual(errors[0]?.cause, publicationCause);
    assert.equal(errors[0]?.cause instanceof Error ? errors[0].cause.message : undefined, publicationCause.message);
  });

  void it('returns nested snapshots that cannot mutate retained hook failures', async () => {
    const publicationCause = { 'details': { 'value': 1 } };
    const dispatcher = BoundedDispatcher.create({
      'bus': new RejectingEventBus(1, publicationCause)
    });

    await dispatcher.dispatch(() => 'work result');
    await flushMicrotasks();

    publicationCause.details.value = 50;
    const first = dispatcher.getHookErrors();
    assert.equal(dispatcher.hookErrorCount, 1);
    assert.equal(first.length, 1);
    const firstError = first[0];
    if (firstError === undefined) {
      throw new Error('Expected a hook failure snapshot');
    }
    firstError.message = 'mutated snapshot';
    const firstCause = firstError.cause;
    if (typeof firstCause !== 'object' || firstCause === null) {
      throw new Error('Expected an object cause snapshot');
    }
    const firstDetails = Reflect.get(firstCause, 'details');
    if (typeof firstDetails !== 'object' || firstDetails === null) {
      throw new Error('Expected nested cause details');
    }
    assert.equal(Reflect.get(firstDetails, 'value'), 1);
    Reflect.set(firstDetails, 'value', 99);

    const secondError = dispatcher.getHookErrors()[0];
    if (secondError === undefined) {
      throw new Error('Expected the retained hook failure');
    }
    const secondCause = secondError.cause;
    if (typeof secondCause !== 'object' || secondCause === null) {
      throw new Error('Expected a second object cause snapshot');
    }
    const secondDetails = Reflect.get(secondCause, 'details');

    assert.notEqual(secondError.message, 'mutated snapshot');
    assert.equal(typeof secondDetails === 'object' && secondDetails !== null
      ? Reflect.get(secondDetails, 'value')
      : undefined, 1);
  });
});
