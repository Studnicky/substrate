import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ErrorClassificationEntity, HookInvocationError } from '@studnicky/errors';

import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  CircuitStateEntity,
  DeadLetterQueue,
  DeadLetterQueueRetryGenerator,
  DeadLetterQueueAbortedError,
  DeadLetterQueueClosedError,
  DeadLetterQueueEntryMetadataEntity,
  DeadLetterQueueFullError,
  ResilienceConfigError,
  TokenBucket,
  TokenBucketExhaustedError
} from '../../../src/index.js';
import type {
  CircuitBreakerOptionsInterface,
  DeadLetterQueueOptionsInterface,
  TokenBucketOptionsInterface
} from '../../../src/index.js';

import scenarioGroups from './resilience.scenarios.json' with { type: 'json' };

type ScenarioCase = (typeof scenarioGroups.cases)[number];

const succeed = async (): Promise<string> => 'ok';
const fail = async (): Promise<never> => { throw new Error('failure'); };

class ObservedBreaker extends CircuitBreaker {
  readonly events: string[] = [];
  constructor(options: CircuitBreakerOptionsInterface) { super(options); }
  protected override onSuccess(): void { this.events.push('success'); }
  protected override onFailure(_error: unknown): void { this.events.push('failure'); }
  protected override onTrip(): void { this.events.push('trip'); }
  protected override onOpen(): void { this.events.push('open'); }
  protected override onHalfOpen(): void { this.events.push('halfOpen'); }
  protected override onClose(): void { this.events.push('close'); }
  protected override onReject(): void { this.events.push('reject'); }
}

class TransientError extends Error {}
class RealError extends Error {}

type AnyErrorConstructor = new (...args: never[]) => Error;

const resilienceErrorTypes = {
  'RealError': RealError,
  'TransientError': TransientError
} satisfies Record<string, AnyErrorConstructor>;

function isResilienceErrorTypeName(value: string): value is keyof typeof resilienceErrorTypes {
  return Object.hasOwn(resilienceErrorTypes, value);
}

function resilienceErrorTypeInput(value: string): (typeof resilienceErrorTypes)[keyof typeof resilienceErrorTypes] {
  if (!isResilienceErrorTypeName(value)) {
    throw new TypeError(`Unknown resilience error type name: ${value}`);
  }
  return resilienceErrorTypes[value];
}

class ClassifyingBreaker extends CircuitBreaker {
  protected override classifyError(error: unknown): ErrorClassificationEntity.Type {
    return { 'retryable': error instanceof TransientError };
  }
}

class ThrowingSuccessBreaker extends CircuitBreaker {
  protected override onSuccess(): void { throw new Error('onSuccess boom'); }
}

class ThrowingRejectBreaker extends CircuitBreaker {
  protected override onReject(): void { throw new Error('onReject boom'); }
}

class ThrowingTripBreaker extends CircuitBreaker {
  protected override onTrip(): void { throw new Error('onTrip boom'); }
}

class AsyncRejectingSuccessBreaker extends CircuitBreaker {
  readonly #cause: Error;
  constructor(options: CircuitBreakerOptionsInterface, cause: Error) { super(options); this.#cause = cause; }
  get recordedHookErrors(): readonly HookInvocationError[] { return this.hooks.getHookErrors(); }
  protected override async onSuccess(): Promise<void> { await Promise.resolve(); throw this.#cause; }
}

class ObservedBucket extends TokenBucket {
  readonly events: Array<{ type: string; value?: number }> = [];
  constructor(options: TokenBucketOptionsInterface) { super(options); }
  protected override onTokenAcquired(count: number): void { this.events.push({ 'type': 'acquired', 'value': count }); }
  protected override onTokenDepleted(): void { this.events.push({ 'type': 'depleted' }); }
  protected override onRefill(added: number): void { this.events.push({ 'type': 'refill', 'value': added }); }
}

class ThrowingAcquiredBucket extends TokenBucket {
  protected override onTokenAcquired(): void { throw new Error('onTokenAcquired boom'); }
  get hookErrorCount(): number { return this.hooks.hookErrorCount; }
}

class ThrowingDepletedBucket extends TokenBucket {
  protected override onTokenDepleted(): void { throw new Error('onTokenDepleted boom'); }
  get hookErrorCount(): number { return this.hooks.hookErrorCount; }
}

class ThrowingRefillBucket extends TokenBucket {
  protected override onRefill(): void { throw new Error('onRefill boom'); }
  get hookErrorCount(): number { return this.hooks.hookErrorCount; }
}

class AsyncRejectingAcquiredBucket extends TokenBucket {
  readonly #cause: Error;
  constructor(options: TokenBucketOptionsInterface, cause: Error) { super(options); this.#cause = cause; }
  get recordedHookErrors(): readonly HookInvocationError[] { return this.hooks.getHookErrors(); }
  protected override async onTokenAcquired(_count: number): Promise<void> { await Promise.resolve(); throw this.#cause; }
}

class ObservedDlq<T> extends DeadLetterQueue<T> {
  readonly events: Array<{ type: string; item?: T }> = [];
  constructor(options?: DeadLetterQueueOptionsInterface) { super(options); }
  protected override onEnqueue(item: T): void { this.events.push({ 'type': 'enqueue', 'item': item }); }
  protected override onDequeue(item: T): void { this.events.push({ 'type': 'dequeue', 'item': item }); }
  protected override onOverflow(): void { this.events.push({ 'type': 'overflow' }); }
  protected override onClose(): void { this.events.push({ 'type': 'close' }); }
  protected override onAbort(): void { this.events.push({ 'type': 'abort' }); }
}

class ThrowingEnqueueDlq<T> extends DeadLetterQueue<T> { protected override onEnqueue(): void { throw new Error('onEnqueue boom'); } }
class ThrowingDequeueDlq<T> extends DeadLetterQueue<T> { protected override onDequeue(): void { throw new Error('onDequeue boom'); } }
class ThrowingOverflowDlq<T> extends DeadLetterQueue<T> { protected override onOverflow(): void { throw new Error('onOverflow boom'); } }
class ThrowingCloseDlq<T> extends DeadLetterQueue<T> { protected override onClose(): void { throw new Error('onClose boom'); } }
class ThrowingAbortDlq<T> extends DeadLetterQueue<T> { protected override onAbort(): void { throw new Error('onAbort boom'); } }

class AsyncRejectingEnqueueDlq<T> extends DeadLetterQueue<T> {
  readonly #cause: Error;
  constructor(cause: Error) { super(); this.#cause = cause; }
  get recordedHookErrors(): readonly HookInvocationError[] { return this.hooks.getHookErrors(); }
  protected override async onEnqueue(_item: T): Promise<void> { await Promise.resolve(); throw this.#cause; }
}

class FanOutDeadLetterQueue<T> extends DeadLetterQueue<T> {
  readonly #waiters: (() => void)[] = [];
  protected override registerDrainWaiter(notify: () => void): void { this.#waiters.push(notify); }
  protected override wakeDrainWaiters(): void { const waiters = this.#waiters.splice(0, this.#waiters.length); for (const wake of waiters) { wake(); } }
}

class ObservedRetryGenerator<T> extends DeadLetterQueueRetryGenerator<T> {
  readonly events: string[] = [];
  static build<T>(dlq: DeadLetterQueue<T>, intervalMs: number): ObservedRetryGenerator<T> { return new ObservedRetryGenerator<T>({ 'deadLetterQueue': dlq, 'intervalMs': intervalMs }); }
  protected override onDone(): void { this.events.push('done'); }
  protected override onWait(intervalMs: number): void { this.events.push(`wait:${intervalMs}`); }
  protected override onYield(): void { this.events.push('yield'); }
}

class ThrowingYieldGenerator<T> extends DeadLetterQueueRetryGenerator<T> {
  static build<T>(dlq: DeadLetterQueue<T>, intervalMs: number): ThrowingYieldGenerator<T> { return new ThrowingYieldGenerator<T>({ 'deadLetterQueue': dlq, 'intervalMs': intervalMs }); }
  protected override onYield(): void { throw new Error('onYield boom'); }
}

class ThrowingWaitGenerator<T> extends DeadLetterQueueRetryGenerator<T> {
  static build<T>(dlq: DeadLetterQueue<T>, intervalMs: number): ThrowingWaitGenerator<T> { return new ThrowingWaitGenerator<T>({ 'deadLetterQueue': dlq, 'intervalMs': intervalMs }); }
  protected override onWait(): void { throw new Error('onWait boom'); }
}

class ThrowingDoneGenerator<T> extends DeadLetterQueueRetryGenerator<T> {
  static build<T>(dlq: DeadLetterQueue<T>, intervalMs: number): ThrowingDoneGenerator<T> { return new ThrowingDoneGenerator<T>({ 'deadLetterQueue': dlq, 'intervalMs': intervalMs }); }
  protected override onDone(): void { throw new Error('onDone boom'); }
}

class AsyncRejectingYieldGenerator<T> extends DeadLetterQueueRetryGenerator<T> {
  readonly #cause: Error;
  constructor(dlq: DeadLetterQueue<T>, intervalMs: number, cause: Error) { super({ 'deadLetterQueue': dlq, 'intervalMs': intervalMs }); this.#cause = cause; }
  get recordedHookErrors(): readonly HookInvocationError[] { return this.hooks.getHookErrors(); }
  protected override async onYield(): Promise<void> { await Promise.resolve(); throw this.#cause; }
}

async function tick(): Promise<void> {
  await new Promise<void>((resolve) => { setImmediate(resolve); });
}

function countEvents(events: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of events) {
    counts[event] = (counts[event] ?? 0) + 1;
  }
  return counts;
}

type ScenarioInput = Record<string, unknown>;

function numberInput(input: ScenarioInput, key: string): number {
  const value = input[key];
  if (typeof value !== 'number') {
    throw new TypeError(`Expected numeric resilience scenario input: ${key}`);
  }
  return value;
}

function optionalNumberInput(input: ScenarioInput, key: string): number | undefined {
  const value = input[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'number') {
    throw new TypeError(`Expected numeric resilience scenario input: ${key}`);
  }
  return value;
}

function stringInput(input: ScenarioInput, key: string): string {
  const value = input[key];
  if (typeof value !== 'string') {
    throw new TypeError(`Expected string resilience scenario input: ${key}`);
  }
  return value;
}

function booleanInput(input: ScenarioInput, key: string): boolean {
  const value = input[key];
  if (typeof value !== 'boolean') {
    throw new TypeError(`Expected boolean resilience scenario input: ${key}`);
  }
  return value;
}

function stringArrayInput(input: ScenarioInput, key: string): string[] {
  const value = input[key];
  if (!Array.isArray(value)) {
    throw new TypeError(`Expected string array resilience scenario input: ${key}`);
  }
  const values: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') {
      throw new TypeError(`Expected string array resilience scenario input: ${key}`);
    }
    values.push(item);
  }
  return values;
}

function numberArrayInput(input: ScenarioInput, key: string): number[] {
  const value = input[key];
  if (!Array.isArray(value)) {
    throw new TypeError(`Expected numeric array resilience scenario input: ${key}`);
  }
  const values: number[] = [];
  for (const item of value) {
    if (typeof item !== 'number') {
      throw new TypeError(`Expected numeric array resilience scenario input: ${key}`);
    }
    values.push(item);
  }
  return values;
}

function stringArrayItem(values: readonly string[], key: string, index: number): string {
  const value = values[index];
  if (value === undefined) {
    throw new TypeError(`Expected string array item for resilience scenario input: ${key}[${index}]`);
  }
  return value;
}

function recordInput(input: ScenarioInput, key: string): ScenarioInput {
  const value = input[key];
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`Expected object resilience scenario input: ${key}`);
  }
  const record: ScenarioInput = {};
  Object.assign(record, value);
  return record;
}

function recordArrayInput(input: ScenarioInput, key: string): ScenarioInput[] {
  const value = input[key];
  if (!Array.isArray(value)) {
    throw new TypeError(`Expected object array resilience scenario input: ${key}`);
  }
  const records: ScenarioInput[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new TypeError(`Expected object array resilience scenario input: ${key}`);
    }
    const record: ScenarioInput = {};
    Object.assign(record, item);
    records.push(record);
  }
  return records;
}

function circuitBreakerOptions(
  input: ScenarioInput,
  extra: Partial<CircuitBreakerOptionsInterface> = {}
): CircuitBreakerOptionsInterface {
  const options: CircuitBreakerOptionsInterface = {
    failureThreshold: numberInput(input, 'failureThreshold'),
    resetTimeoutMs: numberInput(input, 'resetTimeoutMs'),
    ...extra
  };
  const name = input.name;
  if (typeof name === 'string') {
    options.name = name;
  }
  const successThreshold = optionalNumberInput(input, 'successThreshold');
  if (successThreshold !== undefined) {
    options.successThreshold = successThreshold;
  }
  return options;
}

function tokenBucketOptions(
  input: ScenarioInput,
  extra: Partial<TokenBucketOptionsInterface> = {}
): TokenBucketOptionsInterface {
  const clock = input.clock;
  return {
    burstSize: numberInput(input, 'burstSize'),
    requestsPerSecond: numberInput(input, 'requestsPerSecond'),
    ...(typeof clock === 'number' ? { 'clock': (): number => clock } : {}),
    ...extra
  };
}

type DlqEnqueueErrorScenario = 'full' | 'closed' | 'aborted';

type DlqEnqueueErrorCase = {
  readonly setup: (dlq: DeadLetterQueue<string>) => void;
};

const dlqEnqueueErrorCases = {
  'aborted': {
    setup: (dlq: DeadLetterQueue<string>): void => { dlq.abort(); }
  },
  'closed': {
    setup: (dlq: DeadLetterQueue<string>): void => { dlq.close(); }
  },
  'full': {
    setup: (dlq: DeadLetterQueue<string>): void => {
      dlq.enqueue('a', 'r1');
      dlq.enqueue('b', 'r2');
    }
  }
} satisfies Record<DlqEnqueueErrorScenario, DlqEnqueueErrorCase>;

function isDlqEnqueueErrorScenario(value: string): value is DlqEnqueueErrorScenario {
  return Object.hasOwn(dlqEnqueueErrorCases, value);
}

function dlqEnqueueErrorScenarioInput(value: string): DlqEnqueueErrorScenario {
  if (!isDlqEnqueueErrorScenario(value)) {
    throw new TypeError(`Unknown DLQ enqueue-error scenario: ${value}`);
  }
  return value;
}

const dlqErrorTypes = {
  'DeadLetterQueueAbortedError': DeadLetterQueueAbortedError,
  'DeadLetterQueueClosedError': DeadLetterQueueClosedError,
  'DeadLetterQueueFullError': DeadLetterQueueFullError
} satisfies Record<string, AnyErrorConstructor>;

function isDlqErrorTypeName(value: string): value is keyof typeof dlqErrorTypes {
  return Object.hasOwn(dlqErrorTypes, value);
}

function dlqErrorTypeInput(value: string): (typeof dlqErrorTypes)[keyof typeof dlqErrorTypes] {
  if (!isDlqErrorTypeName(value)) {
    throw new TypeError(`Unknown DLQ error type name: ${value}`);
  }
  return dlqErrorTypes[value];
}

type CircuitBreakerAction = 'fail' | 'success';

const circuitBreakerActions = {
  'fail': async (cb: CircuitBreaker): Promise<void> => {
    await assert.rejects(() => cb.execute(fail));
  },
  'success': async (cb: CircuitBreaker): Promise<void> => {
    await cb.execute(succeed);
  }
} satisfies Record<CircuitBreakerAction, (cb: CircuitBreaker) => Promise<void>>;

function isCircuitBreakerAction(value: string): value is CircuitBreakerAction {
  return Object.hasOwn(circuitBreakerActions, value);
}

function circuitBreakerActionInput(value: string): CircuitBreakerAction {
  if (!isCircuitBreakerAction(value)) {
    throw new TypeError(`Unknown CircuitBreaker scenario action: ${value}`);
  }
  return value;
}

type ScenarioShape =
  | 'cb-invalid-failure-threshold'
  | 'cb-invalid-reset-timeout'
  | 'cb-starts-closed'
  | 'cb-state-entity'
  | 'cb-trips-open'
  | 'cb-success-resets'
  | 'cb-open-error'
  | 'cb-open-error-name'
  | 'cb-halfopen-transition'
  | 'cb-stays-open'
  | 'cb-close-on-success-threshold'
  | 'cb-halfopen-reopen'
  | 'cb-reset-control'
  | 'cb-force-open'
  | 'cb-reset-success'
  | 'cb-observed-success'
  | 'cb-observed-failure'
  | 'cb-observed-trip-open'
  | 'cb-observed-reject'
  | 'cb-observed-halfopen'
  | 'cb-observed-close'
  | 'cb-observed-open'
  | 'cb-default-classification'
  | 'cb-config-classifier-retryable'
  | 'cb-config-classifier-failing'
  | 'cb-config-classifier-throws-original'
  | 'cb-subclass-classifier'
  | 'cb-config-overrides-subclass'
  | 'cb-hook-swallows'
  | 'cb-async-hook-isolation'
  | 'cb-hook-fires-exactly-once'
  | 'tb-invalid-rps'
  | 'tb-invalid-burst'
  | 'tb-consume-ok'
  | 'tb-consume-exhausted'
  | 'tb-consume-multi'
  | 'tb-available'
  | 'tb-refill'
  | 'tb-cap'
  | 'tb-wait-immediate'
  | 'tb-wait-refill'
  | 'tb-wait-abort'
  | 'tb-wait-too-many'
  | 'tb-listener-leak'
  | 'tb-observed-acquired'
  | 'tb-observed-depleted'
  | 'tb-observed-refill'
  | 'tb-observed-wait'
  | 'tb-hook-swallows'
  | 'tb-async-hook-isolation'
  | 'dlq-invalid-capacity'
  | 'dlq-enqueue'
  | 'dlq-enqueue-errors'
  | 'dlq-aborted-signal'
  | 'dlq-size'
  | 'dlq-drain-fifo'
  | 'dlq-drain-close'
  | 'dlq-drain-abort'
  | 'dlq-drain-wake'
  | 'dlq-entry-fields'
  | 'dlq-single-consumer'
  | 'dlq-fanout'
  | 'dlq-drain-abort-signal'
  | 'dlq-observed-enqueue'
  | 'dlq-observed-dequeue'
  | 'dlq-observed-overflow'
  | 'dlq-observed-close'
  | 'dlq-observed-abort'
  | 'dlq-hook-swallows'
  | 'dlq-async-hook-isolation'
  | 'dlqr-invalid-interval'
  | 'dlqr-missing-dlq'
  | 'dlqr-lifecycle'
  | 'dlqr-hook-swallows'
  | 'dlqr-async-hook-isolation'
  | 'entity-dlq-entry';

type ScenarioHandler = (scenarioCase: ScenarioCase, input: ScenarioInput) => Promise<void> | void;

const scenarioHandlers = {
  'cb-invalid-failure-threshold': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    assert.throws(() => { CircuitBreaker.create(circuitBreakerOptions(input)); }, ResilienceConfigError);
  },
  'cb-invalid-reset-timeout': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    assert.throws(() => { CircuitBreaker.create(circuitBreakerOptions(input)); }, ResilienceConfigError);
  },
  'cb-starts-closed': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    assert.equal(CircuitBreaker.create(circuitBreakerOptions(input)).state, 'closed');
  },
  'cb-state-entity': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const validStates = stringArrayInput(expected, 'validStates');
    for (const state of stringArrayInput(input, 'states')) {
      assert.equal(CircuitStateEntity.validate(state), validStates.includes(state));
    }
    assert.equal(CircuitStateEntity.validate(stringInput(expected, 'invalidState')), false);
  },
  'cb-trips-open': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const cb = CircuitBreaker.create(circuitBreakerOptions(input));
    await assert.rejects(() => cb.execute(fail));
    assert.equal(cb.state, 'closed');
    await assert.rejects(() => cb.execute(fail));
    assert.equal(cb.state, 'open');
  },
  'cb-success-resets': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const cb = CircuitBreaker.create(circuitBreakerOptions(input));
    const sequence = stringArrayInput(input, 'sequence');
    const finalAction = sequence[sequence.length - 1];
    if (finalAction === undefined) {
      throw new TypeError('Expected non-empty CircuitBreaker scenario action sequence');
    }
    for (const action of sequence.slice(0, -1)) {
      await circuitBreakerActions[circuitBreakerActionInput(action)](cb);
    }
    assert.equal(cb.state, stringInput(expected, 'stateBeforeFinalFailure'));
    await circuitBreakerActions[circuitBreakerActionInput(finalAction)](cb);
    assert.equal(cb.state, stringInput(expected, 'finalState'));
  },
  'cb-open-error': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const cb = CircuitBreaker.create(circuitBreakerOptions(input));
    await assert.rejects(() => cb.execute(fail));
    assert.equal(cb.state, 'open');
    if (booleanInput(expected, 'openError')) {
      await assert.rejects(() => cb.execute(succeed), (err: unknown) => err instanceof CircuitBreakerOpenError);
    } else {
      await cb.execute(succeed);
    }
  },
  'cb-open-error-name': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const cb = CircuitBreaker.create(circuitBreakerOptions(input));
    await assert.rejects(() => cb.execute(fail));
    if (booleanInput(expected, 'openError')) {
      await assert.rejects(
        () => cb.execute(succeed),
        (err: unknown) => err instanceof CircuitBreakerOpenError && err.message.includes(stringInput(expected, 'messageIncludes'))
      );
    } else {
      await cb.execute(succeed);
    }
  },
  'cb-halfopen-transition': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const clock = numberArrayInput(input, 'clock');
    let time = clock[0] ?? 0;
    const cb = CircuitBreaker.create(circuitBreakerOptions(input, { clock: () => time }));
    await assert.rejects(() => cb.execute(fail));
    assert.equal(cb.state, 'open');
    time = clock[1] ?? time;
    await cb.execute(succeed);
    assert.equal(cb.state, 'closed');
  },
  'cb-stays-open': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const clock = numberArrayInput(input, 'clock');
    let time = clock[0] ?? 0;
    const cb = CircuitBreaker.create(circuitBreakerOptions(input, { clock: () => time }));
    await assert.rejects(() => cb.execute(fail));
    assert.equal(cb.state, 'open');
    time = clock[1] ?? time;
    await assert.rejects(() => cb.execute(succeed), (err: unknown) => err instanceof CircuitBreakerOpenError);
    assert.equal(cb.state, 'open');
  },
  'cb-close-on-success-threshold': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const clock = numberArrayInput(input, 'clock');
    let time = clock[0] ?? 0;
    const cb = CircuitBreaker.create(circuitBreakerOptions(input, { clock: () => time }));
    await assert.rejects(() => cb.execute(fail));
    time = clock[1] ?? time;
    await cb.execute(succeed);
    assert.equal(cb.state, 'halfOpen');
    await cb.execute(succeed);
    assert.equal(cb.state, 'closed');
  },
  'cb-halfopen-reopen': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const clock = numberArrayInput(input, 'clock');
    let time = clock[0] ?? 0;
    const cb = CircuitBreaker.create(circuitBreakerOptions(input, { clock: () => time }));
    await assert.rejects(() => cb.execute(fail));
    time = clock[1] ?? time;
    await assert.rejects(() => cb.execute(fail));
    assert.equal(cb.state, 'open');
  },
  'cb-reset-control': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const cb = CircuitBreaker.create(circuitBreakerOptions(input));
    await assert.rejects(() => cb.execute(fail));
    cb.reset();
    assert.equal(cb.state, stringInput(expected, 'stateAfterReset'));
  },
  'cb-force-open': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const cb = CircuitBreaker.create(circuitBreakerOptions(input));
    cb.forceOpen();
    assert.equal(cb.state, 'open');
  },
  'cb-reset-success': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const cb = CircuitBreaker.create(circuitBreakerOptions(input));
    await assert.rejects(() => cb.execute(fail));
    cb.reset();
    assert.equal(await cb.execute(succeed), stringInput(expected, 'result'));
  },
  'cb-observed-success': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const cb = new ObservedBreaker(circuitBreakerOptions(input));
    await cb.execute(succeed);
    assert.deepEqual(cb.events, ['success']);
  },
  'cb-observed-failure': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const cb = new ObservedBreaker(circuitBreakerOptions(input));
    await assert.rejects(() => cb.execute(fail));
    assert.ok(cb.events.includes('failure'));
  },
  'cb-observed-trip-open': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const cb = new ObservedBreaker(circuitBreakerOptions(input));
    await assert.rejects(() => cb.execute(fail));
    await assert.rejects(() => cb.execute(fail));
    const tripIdx = cb.events.indexOf('trip');
    const openIdx = cb.events.indexOf('open');
    assert.ok(tripIdx !== -1);
    assert.ok(openIdx !== -1);
    assert.ok(tripIdx < openIdx);
  },
  'cb-observed-reject': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const cb = new ObservedBreaker(circuitBreakerOptions(input));
    await assert.rejects(() => cb.execute(fail));
    cb.events.length = 0;
    await assert.rejects(() => cb.execute(succeed), (e: unknown) => e instanceof CircuitBreakerOpenError);
    assert.ok(cb.events.includes('reject'));
  },
  'cb-observed-halfopen': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const clock = numberArrayInput(input, 'clock');
    let time = clock[0] ?? 0;
    const cb = new ObservedBreaker(circuitBreakerOptions(input, { clock: () => time }));
    await assert.rejects(() => cb.execute(fail));
    time = clock[1] ?? time;
    await cb.execute(succeed);
    assert.ok(cb.events.includes('halfOpen'));
  },
  'cb-observed-close': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const clock = numberArrayInput(input, 'clock');
    let time = clock[0] ?? 0;
    const cb = new ObservedBreaker(circuitBreakerOptions(input, { clock: () => time }));
    await assert.rejects(() => cb.execute(fail));
    time = clock[1] ?? time;
    await cb.execute(succeed);
    assert.ok(cb.events.includes('close'));
    const resetBreaker = new ObservedBreaker(circuitBreakerOptions(input));
    await assert.rejects(() => resetBreaker.execute(fail));
    resetBreaker.events.length = 0;
    resetBreaker.reset();
    assert.ok(resetBreaker.events.includes('close'));
  },
  'cb-observed-open': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const forceBreaker = new ObservedBreaker(circuitBreakerOptions(input));
    forceBreaker.forceOpen();
    assert.ok(forceBreaker.events.includes('open'));
    const clock = numberArrayInput(input, 'clock');
    let time = clock[0] ?? 0;
    const cb = new ObservedBreaker(circuitBreakerOptions(input, {
      clock: () => time,
      failureThreshold: numberInput(input, 'reopenFailureThreshold')
    }));
    await assert.rejects(() => cb.execute(fail));
    cb.events.length = 0;
    time = clock[1] ?? time;
    await assert.rejects(() => cb.execute(fail));
    assert.ok(cb.events.includes('open'));
    assert.ok(!cb.events.includes('trip'));
  },
  'cb-default-classification': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const cb = CircuitBreaker.create(circuitBreakerOptions(input));
    await assert.rejects(() => cb.execute(async () => { throw new TransientError('transient'); }));
    assert.equal(cb.state, 'closed');
    await assert.rejects(() => cb.execute(async () => { throw new TransientError('transient'); }));
    assert.equal(cb.state, 'open');
  },
  'cb-config-classifier-retryable': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const classifier = (error: Error): ErrorClassificationEntity.Type => ({ 'retryable': error instanceof TransientError });
    const cb = CircuitBreaker.create(circuitBreakerOptions(input, { errorClassifier: classifier }));
    for (let count = 0; count < numberInput(expected, 'retryableFailures'); count += 1) {
      await assert.rejects(() => cb.execute(async () => { throw new TransientError('transient'); }));
    }
    assert.equal(cb.state, 'closed');
  },
  'cb-config-classifier-failing': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const classifier = (error: Error): ErrorClassificationEntity.Type => ({ 'retryable': error instanceof TransientError });
    const cb = CircuitBreaker.create(circuitBreakerOptions(input, { errorClassifier: classifier }));
    await assert.rejects(() => cb.execute(async () => { throw new RealError('real'); }));
    assert.equal(cb.state, 'closed');
    await assert.rejects(() => cb.execute(async () => { throw new RealError('real'); }));
    assert.equal(cb.state, 'open');
  },
  'cb-config-classifier-throws-original': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const classifier = (): ErrorClassificationEntity.Type => ({ 'retryable': true });
    const cb = CircuitBreaker.create(circuitBreakerOptions(input, { errorClassifier: classifier }));
    const thrownType = resilienceErrorTypeInput(stringInput(expected, 'thrown'));
    await assert.rejects(() => cb.execute(async () => { throw new TransientError('transient'); }), (err: unknown) => err instanceof thrownType);
    assert.equal(cb.state, 'closed');
  },
  'cb-subclass-classifier': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const cb = ClassifyingBreaker.create(circuitBreakerOptions(input));
    await assert.rejects(() => cb.execute(async () => { throw new TransientError('transient'); }));
    await assert.rejects(() => cb.execute(async () => { throw new TransientError('transient'); }));
    assert.equal(cb.state, 'closed');
    await assert.rejects(() => cb.execute(async () => { throw new RealError('real'); }));
    assert.equal(cb.state, 'closed');
    await assert.rejects(() => cb.execute(async () => { throw new RealError('real'); }));
    assert.equal(cb.state, 'open');
  },
  'cb-config-overrides-subclass': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const classifier = (): ErrorClassificationEntity.Type => ({ 'retryable': false });
    const cb = ClassifyingBreaker.create(circuitBreakerOptions(input, { errorClassifier: classifier }));
    await assert.rejects(() => cb.execute(async () => { throw new TransientError('transient'); }));
    assert.equal(cb.state, 'open');
  },
  'cb-hook-swallows': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const successBreaker = ThrowingSuccessBreaker.create(circuitBreakerOptions(input));
    assert.equal(await successBreaker.execute(succeed), 'ok');
    assert.equal(successBreaker.state, 'closed');
    const rejectBreaker = ThrowingRejectBreaker.create(circuitBreakerOptions(input, {
      failureThreshold: numberInput(input, 'rejectFailureThreshold'),
      resetTimeoutMs: numberInput(input, 'rejectResetTimeoutMs')
    }));
    await assert.rejects(() => rejectBreaker.execute(fail));
    await assert.rejects(() => rejectBreaker.execute(succeed), (error: unknown) => error instanceof CircuitBreakerOpenError);
    const tripBreaker = ThrowingTripBreaker.create(circuitBreakerOptions(input, {
      failureThreshold: numberInput(input, 'tripFailureThreshold')
    }));
    await assert.rejects(() => tripBreaker.execute(fail), (error: unknown) => error instanceof Error && (error as Error).message === 'failure');
    assert.equal(tripBreaker.state, stringInput(expected, 'openState'));
  },
  'cb-async-hook-isolation': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const firstCause = new Error(stringInput(input, 'first'));
      const secondCause = new Error(stringInput(input, 'second'));
      const first = new AsyncRejectingSuccessBreaker(circuitBreakerOptions(input), firstCause);
      const second = new AsyncRejectingSuccessBreaker(circuitBreakerOptions(input), secondCause);
      const results = await Promise.all([first.execute(succeed), second.execute(succeed)]);
      assert.deepEqual(results, stringArrayInput(expected, 'results'));
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.equal(rejectionEvents.length, numberInput(expected, 'rejections'));
      const firstErrors = first.recordedHookErrors;
      const secondErrors = second.recordedHookErrors;
      assert.equal(firstErrors.length, numberInput(expected, 'recordedErrors'));
      assert.equal(firstErrors[0]?.hookName, 'onSuccess');
      assert.ok(firstErrors[0]?.cause instanceof Error);
      assert.equal(firstErrors[0].cause.message, firstCause.message);
      assert.equal(secondErrors.length, numberInput(expected, 'recordedErrors'));
      assert.equal(secondErrors[0]?.hookName, 'onSuccess');
      assert.ok(secondErrors[0]?.cause instanceof Error);
      assert.equal(secondErrors[0].cause.message, secondCause.message);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  },
  /**
   * Proves hook-firing correctness is structurally guaranteed by the FSM
   * reducer rather than incidentally true of the current wiring: each of
   * `onOpen`/`onTrip`/`onHalfOpen`/`onClose` fires exactly once per relevant
   * transition, with `onTrip` firing only on the closed→open path and
   * `onOpen` firing on both closed→open and halfOpen→open. The reducer emits
   * an `effects` array once per event and `CircuitBreaker` plays it back
   * exactly once — the class of bug this guards against (a hook invoked
   * twice, or from two different call sites that can drift out of sync) is
   * the "Throttle-style double/missed-fire" this refactor was set out to
   * make structurally impossible.
   */
  'cb-hook-fires-exactly-once': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const clock = numberArrayInput(input, 'clock');

    // Reopen path: closed → open (trip) → halfOpen → open (reopen, no trip).
    let reopenTime = clock[0] ?? 0;
    const reopenBreaker = new ObservedBreaker(circuitBreakerOptions(input, { clock: () => reopenTime }));
    await assert.rejects(() => reopenBreaker.execute(fail));
    await assert.rejects(() => reopenBreaker.execute(fail));
    assert.equal(reopenBreaker.state, 'open');
    reopenTime = clock[1] ?? reopenTime;
    await assert.rejects(() => reopenBreaker.execute(fail));
    assert.equal(reopenBreaker.state, 'open');
    const reopenCounts = countEvents(reopenBreaker.events);
    assert.equal(reopenCounts.trip, 1);
    assert.equal(reopenCounts.open, 2);
    assert.equal(reopenCounts.halfOpen, 1);
    assert.equal(reopenCounts.failure, 3);
    assert.equal(reopenCounts.close ?? 0, 0);
    assert.equal(reopenCounts.success ?? 0, 0);

    // Close path: closed → open (trip) → halfOpen → closed (trial successes).
    let closeTime = clock[0] ?? 0;
    const closeBreaker = new ObservedBreaker(circuitBreakerOptions(input, { clock: () => closeTime }));
    await assert.rejects(() => closeBreaker.execute(fail));
    await assert.rejects(() => closeBreaker.execute(fail));
    closeTime = clock[1] ?? closeTime;
    await closeBreaker.execute(succeed);
    await closeBreaker.execute(succeed);
    assert.equal(closeBreaker.state, 'closed');
    const closeCounts = countEvents(closeBreaker.events);
    assert.equal(closeCounts.trip, 1);
    assert.equal(closeCounts.open, 1);
    assert.equal(closeCounts.halfOpen, 1);
    assert.equal(closeCounts.success, 2);
    assert.equal(closeCounts.close, 1);
    assert.equal(closeCounts.failure, 2);
  },
  'tb-invalid-rps': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    assert.throws(() => { TokenBucket.create(tokenBucketOptions(input)); }, ResilienceConfigError);
  },
  'tb-invalid-burst': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    assert.throws(() => { TokenBucket.create(tokenBucketOptions(input)); }, ResilienceConfigError);
  },
  'tb-consume-ok': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const bucket = TokenBucket.create(tokenBucketOptions(input));
    for (const tokens of numberArrayInput(input, 'consume')) {
      bucket.consume(tokens);
    }
    assert.equal(bucket.available, numberInput(expected, 'available'));
    assert.equal(bucket.available < 1, booleanInput(expected, 'exhausted'));
  },
  'tb-consume-exhausted': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const bucket = TokenBucket.create(tokenBucketOptions(input));
    bucket.consume();
    bucket.consume();
    assert.throws(() => { bucket.consume(); }, TokenBucketExhaustedError);
    assert.equal(bucket.available < 1, booleanInput(expected, 'exhausted'));
  },
  'tb-consume-multi': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const bucket = TokenBucket.create(tokenBucketOptions(input));
    const consume = numberArrayInput(input, 'consume');
    bucket.consume(consume[0]);
    if (booleanInput(expected, 'exhaustedOnSecondConsume')) {
      assert.throws(() => { bucket.consume(consume[1]); }, TokenBucketExhaustedError);
    } else {
      assert.doesNotThrow(() => { bucket.consume(consume[1]); });
    }
  },
  'tb-available': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const clock = (): number => numberInput(input, 'clock');
    const bucket1 = TokenBucket.create(tokenBucketOptions(input, { clock }));
    assert.equal(bucket1.available, 5);
    const bucket2 = TokenBucket.create(tokenBucketOptions(input, { clock }));
    bucket2.consume(numberArrayInput(input, 'consume')[0]);
    assert.equal(bucket2.available, 3);
  },
  'tb-refill': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const clock = numberArrayInput(input, 'clock');
    let time = clock[0] ?? 0;
    const bucket = TokenBucket.create(tokenBucketOptions(input, { clock: () => time }));
    bucket.consume(numberArrayInput(input, 'consume')[0]);
    assert.equal(bucket.available, numberInput(expected, 'availableAfterConsume'));
    time = clock[1] ?? time;
    assert.ok(bucket.available >= numberInput(expected, 'availableAfterRefillAt500Ms'));
  },
  'tb-cap': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const clock = numberArrayInput(input, 'clock');
    let time = clock[0] ?? 0;
    const bucket = TokenBucket.create(tokenBucketOptions(input, { clock: () => time }));
    time = clock[1] ?? time;
    assert.equal(bucket.available, numberInput(expected, 'availableAtCap'));
  },
  'tb-wait-immediate': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const bucket = TokenBucket.create(tokenBucketOptions(input, { clock: () => numberInput(input, 'clock') }));
    await bucket.waitForToken();
    assert.equal(bucket.available, numberInput(expected, 'availableAfterWait'));
  },
  'tb-wait-refill': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const clock = numberArrayInput(input, 'clock');
    let time = clock[0] ?? 0;
    const bucket = TokenBucket.create(tokenBucketOptions(input, { clock: () => time }));
    bucket.consume();
    let completed = false;
    const wait = bucket.waitForToken().then(() => { completed = true; });

    // First tick nudges the clock forward, but not far enough to refill a full
    // token — the wait must still be pending, proving it is genuinely gated on
    // refill rather than resolving as soon as any time passes.
    await new Promise<void>((resolve) => { setImmediate(() => { time = clock[1] ?? time; resolve(); }); });
    assert.equal(completed, false);

    // Second tick crosses the refill threshold; the pending wait now resolves.
    await new Promise<void>((resolve) => { setImmediate(() => { time = clock[2] ?? time; resolve(); }); });
    await wait;

    assert.equal(completed, booleanInput(expected, 'completed'));
    assert.equal(bucket.available, numberInput(expected, 'availableAfterWait'));
  },
  'tb-wait-abort': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const controller = new AbortController();
    const bucket = TokenBucket.create(tokenBucketOptions(input));
    bucket.consume();
    setImmediate(() => { controller.abort(new Error('cancelled')); });
    await assert.rejects(() => bucket.waitForToken({ 'tokens': numberInput(input, 'tokens'), 'signal': controller.signal }));
  },
  'tb-wait-too-many': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const bucket = TokenBucket.create(tokenBucketOptions(input));
    await assert.rejects(() => bucket.waitForToken({ 'tokens': numberInput(input, 'tokens') }), TokenBucketExhaustedError);
  },
  'tb-listener-leak': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const controller = new AbortController();
    const signal = controller.signal as AbortSignal & {
      addEventListener: typeof controller.signal.addEventListener;
      removeEventListener: typeof controller.signal.removeEventListener;
    };
    let addCount = 0;
    let removeCount = 0;
    const originalAdd = signal.addEventListener.bind(signal);
    const originalRemove = signal.removeEventListener.bind(signal);
    signal.addEventListener = ((...args: Parameters<typeof originalAdd>) => { addCount += 1; return originalAdd(...args); }) as typeof signal.addEventListener;
    signal.removeEventListener = ((...args: Parameters<typeof originalRemove>) => { removeCount += 1; return originalRemove(...args); }) as typeof signal.removeEventListener;
    let time = 0;
    const bucket = TokenBucket.create(tokenBucketOptions(input, { clock: () => time }));
    bucket.consume();
    for (let i = 0; i < numberInput(input, 'iterations'); i += 1) {
      const wait = bucket.waitForToken({ 'signal': signal });
      time += 2;
      await wait;
    }
    assert.equal(addCount, numberInput(expected, 'addCount'));
    assert.equal(removeCount, numberInput(expected, 'removeCount'));
  },
  'tb-observed-acquired': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const [event] = recordArrayInput(scenarioCase.expected, 'events');
    if (event === undefined) {
      throw new TypeError('Expected token bucket acquired event fixture');
    }
    const bucket = new ObservedBucket(tokenBucketOptions(input, { clock: () => numberInput(input, 'clock') }));
    bucket.consume(numberInput(input, 'consume'));
    assert.equal(bucket.events[0]?.type, stringInput(event, 'type'));
    assert.equal(bucket.events[0]?.value, numberInput(event, 'value'));
  },
  'tb-observed-depleted': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const bucket = new ObservedBucket(tokenBucketOptions(input, { clock: () => numberInput(input, 'clock') }));
    const consume = numberArrayInput(input, 'consume');
    bucket.consume(consume[0]);
    assert.throws(() => { bucket.consume(consume[1]); }, TokenBucketExhaustedError);
    assert.ok(bucket.events.some((e) => e.type === 'depleted'));
  },
  'tb-observed-refill': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const clock = numberArrayInput(input, 'clock');
    let time = clock[0] ?? 0;
    const bucket = new ObservedBucket(tokenBucketOptions(input, { clock: () => time }));
    bucket.consume(numberInput(input, 'consume'));
    bucket.events.length = 0;
    time = clock[1] ?? time;
    void bucket.available;
    assert.ok(bucket.events.some((e) => e.type === 'refill' && (e.value ?? 0) > 0));
  },
  'tb-observed-wait': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const bucket = new ObservedBucket(tokenBucketOptions(input, { clock: () => numberInput(input, 'clock') }));
    await bucket.waitForToken();
    assert.ok(bucket.events.some((e) => e.type === 'acquired'));
  },
  'tb-hook-swallows': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const available = numberArrayInput(expected, 'available');
    const acquired = ThrowingAcquiredBucket.create(tokenBucketOptions(input, { clock: () => numberInput(input, 'clock') }));
    acquired.consume(numberInput(input, 'consume'));
    assert.equal(acquired.available, available[0]);
    const waitBucket = ThrowingAcquiredBucket.create(tokenBucketOptions(input, {
      burstSize: numberInput(input, 'waitBurstSize'),
      clock: () => numberInput(input, 'clock')
    }));
    await waitBucket.waitForToken({ 'tokens': numberInput(input, 'waitTokens') });
    assert.equal(waitBucket.available, available[1]);
    const depleted = ThrowingDepletedBucket.create(tokenBucketOptions(input, {
      burstSize: numberInput(input, 'depletedBurstSize'),
      clock: () => numberInput(input, 'clock')
    }));
    depleted.consume();
    assert.throws(() => { depleted.consume(); }, TokenBucketExhaustedError);
    const refillClock = numberArrayInput(input, 'refillClock');
    let time = refillClock[0] ?? 0;
    const refill = ThrowingRefillBucket.create(tokenBucketOptions(input, {
      burstSize: numberInput(input, 'refillBurstSize'),
      clock: () => time
    }));
    refill.consume(numberInput(input, 'refillBurstSize'));
    time = refillClock[1] ?? time;
    assert.equal(refill.available, available[2]);
    assert.equal(
      acquired.hookErrorCount > 0 && waitBucket.hookErrorCount > 0 && depleted.hookErrorCount > 0 && refill.hookErrorCount > 0,
      booleanInput(expected, 'errorsSwallowed')
    );
  },
  'tb-async-hook-isolation': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const firstCause = new Error(stringInput(input, 'first'));
      const secondCause = new Error(stringInput(input, 'second'));
      const first = new AsyncRejectingAcquiredBucket(tokenBucketOptions(input, { clock: () => numberInput(input, 'clock') }), firstCause);
      const second = new AsyncRejectingAcquiredBucket(tokenBucketOptions(input, { clock: () => numberInput(input, 'clock') }), secondCause);
      first.consume();
      second.consume();
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.equal(rejectionEvents.length, numberInput(expected, 'rejectionEvents'));
      assert.equal(first.available, 4);
      const firstErrors = first.recordedHookErrors;
      const secondErrors = second.recordedHookErrors;
      assert.equal(firstErrors.length, numberInput(expected, 'hookErrorCount'));
      assert.equal(firstErrors[0]?.hookName, stringInput(expected, 'hookName'));
      assert.ok(firstErrors[0]?.cause instanceof Error);
      assert.equal(firstErrors[0].cause.message, firstCause.message);
      assert.equal(second.available, 4);
      assert.equal(secondErrors.length, numberInput(expected, 'hookErrorCount'));
      assert.equal(secondErrors[0]?.hookName, stringInput(expected, 'hookName'));
      assert.ok(secondErrors[0]?.cause instanceof Error);
      assert.equal(secondErrors[0].cause.message, secondCause.message);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  },
  'dlq-invalid-capacity': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    assert.throws(() => { DeadLetterQueue.create<string>({ capacity: numberInput(input, 'capacity') }); }, ResilienceConfigError);
  },
  'dlq-enqueue': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const dlq = DeadLetterQueue.create<string>();
    dlq.enqueue(stringInput(input, 'defaultItem'), stringInput(input, 'defaultReason'));
    assert.equal(dlq.size, numberInput(expected, 'size'));
    const clock = (): number => numberInput(input, 'withClockMs');
    const dlq2 = DeadLetterQueue.create<string>({ clock });
    const err = new Error(stringInput(input, 'secondErrorMessage'));
    dlq2.enqueue(stringInput(input, 'secondItem'), stringInput(input, 'secondReason'), err);
    assert.equal(dlq2.size, numberInput(expected, 'sizeWithError'));
  },
  'dlq-enqueue-errors': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const scenarios = stringArrayInput(input, 'scenarios');
    const errors = stringArrayInput(expected, 'errors');
    for (const [index, scenario] of scenarios.entries()) {
      const { setup } = dlqEnqueueErrorCases[dlqEnqueueErrorScenarioInput(scenario)];
      const dlq = DeadLetterQueue.create<string>({ capacity: numberInput(input, 'capacity') });
      setup(dlq);
      const errorType = dlqErrorTypeInput(stringArrayItem(errors, 'errors', index));
      assert.throws(() => { dlq.enqueue('c', 'r3'); }, errorType);
    }
  },
  'dlq-aborted-signal': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const controller = new AbortController();
    controller.abort();
    const dlq = DeadLetterQueue.create<string>({ signal: controller.signal });
    assert.throws(() => { dlq.enqueue(stringInput(input, 'item'), stringInput(input, 'reason')); }, DeadLetterQueueAbortedError);
  },
  'dlq-size': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const dlq = DeadLetterQueue.create<string>();
    assert.equal(dlq.size, numberInput(expected, 'sizeBefore'));
    const withEntry = DeadLetterQueue.create<string>();
    withEntry.enqueue(stringInput(input, 'enqueue'), stringInput(input, 'reason'));
    const gen = withEntry.drain();
    await gen.next();
    assert.equal(withEntry.size, numberInput(expected, 'sizeAfterDrain'));
  },
  'dlq-drain-fifo': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const dlq = DeadLetterQueue.create<string>();
    for (const item of stringArrayInput(input, 'items')) {
      dlq.enqueue(item, stringInput(input, 'reason'));
    }
    dlq.close();
    const items: string[] = [];
    for await (const entry of dlq.drain()) { items.push(entry.item); }
    assert.deepEqual(items, stringArrayInput(expected, 'drained'));
  },
  'dlq-drain-close': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const dlq = DeadLetterQueue.create<string>();
    for (const item of stringArrayInput(input, 'items')) {
      dlq.enqueue(item, stringInput(input, 'reason'));
    }
    dlq.close();
    let count = 0;
    for await (const _entry of dlq.drain()) { count += 1; }
    assert.equal(count, numberInput(expected, 'drainedCount'));
  },
  'dlq-drain-abort': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const dlq = DeadLetterQueue.create<number>();
    for (const item of numberArrayInput(input, 'items')) {
      dlq.enqueue(item, stringInput(input, 'reason'));
    }
    const entries: number[] = [];
    const drainPromise = (async () => { for await (const e of dlq.drain()) { entries.push(e.item); } })();
    setImmediate(() => { dlq.abort(); });
    await drainPromise;
    assert.equal(entries.length, numberInput(expected, 'drainedCount'));
  },
  'dlq-drain-wake': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const dlq = DeadLetterQueue.create<string>();
    const collected: string[] = [];
    const drainPromise = (async () => {
      for await (const e of dlq.drain()) {
        collected.push(e.item);
        if (collected.length === stringArrayInput(input, 'items').length) { dlq.close(); }
      }
    })();
    setImmediate(() => {
      for (const item of stringArrayInput(input, 'items')) {
        dlq.enqueue(item, stringInput(input, 'reason'));
      }
    });
    await drainPromise;
    assert.deepEqual(collected, stringArrayInput(expected, 'drained'));
  },
  'dlq-entry-fields': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const clock = (): number => numberInput(input, 'clockMs');
    const dlq = DeadLetterQueue.create<string>({ clock });
    const err = new Error(stringInput(input, 'errorMessage'));
    dlq.enqueue(stringInput(input, 'item'), stringInput(input, 'reason'), err);
    dlq.close();
    const gen = dlq.drain();
    const { value: entry } = await gen.next();
    assert.ok(entry !== undefined);
    assert.equal(entry.item, stringInput(expected, 'item'));
    assert.equal(entry.reason, stringInput(expected, 'reason'));
    assert.equal(entry.error, err);
    assert.equal(entry.enqueuedAtMs, numberInput(expected, 'enqueuedAtMs'));
    assert.equal(typeof entry.id === 'string' && entry.id.length > 0, booleanInput(expected, 'hasId'));
  },
  'dlq-single-consumer': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const dlq = DeadLetterQueue.create<string>();
    const collectedA: string[] = [];
    const collectedB: string[] = [];
    void (async () => { for await (const e of dlq.drain()) { collectedA.push(e.item); } })();
    await tick();
    const drainB = (async () => { for await (const e of dlq.drain()) { collectedB.push(e.item); } })();
    await tick();
    for (const item of stringArrayInput(input, 'items')) {
      dlq.enqueue(item, stringInput(input, 'reason'));
    }
    dlq.close();
    await drainB;
    assert.deepEqual(collectedA, stringArrayInput(expected, 'firstCollector'));
    assert.deepEqual(collectedB, stringArrayInput(expected, 'secondCollector'));
  },
  'dlq-fanout': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const dlq = FanOutDeadLetterQueue.create<string>();
    const collectedA: string[] = [];
    const collectedB: string[] = [];
    const drainA = (async () => { for await (const e of dlq.drain()) { collectedA.push(e.item); } })();
    const drainB = (async () => { for await (const e of dlq.drain()) { collectedB.push(e.item); } })();
    await tick();
    for (const item of stringArrayInput(input, 'items')) {
      dlq.enqueue(item, stringInput(input, 'reason'));
    }
    dlq.close();
    await Promise.all([drainA, drainB]);
    const combined = [...collectedA, ...collectedB].sort();
    assert.deepEqual(combined, stringArrayInput(expected, 'combined'));
  },
  'dlq-drain-abort-signal': async (scenarioCase: ScenarioCase, _input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const controller = new AbortController();
    const dlq = DeadLetterQueue.create<string>({ signal: controller.signal });
    const collected: string[] = [];
    const drainPromise = (async () => { for await (const e of dlq.drain()) { collected.push(e.item); } })();
    setImmediate(() => { controller.abort(); });
    await drainPromise;
    assert.equal(collected.length, numberInput(expected, 'collected'));
  },
  'dlq-observed-enqueue': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const [event] = recordArrayInput(scenarioCase.expected, 'events');
    if (event === undefined) {
      throw new TypeError('Expected DLQ enqueue event fixture');
    }
    const dlq = new ObservedDlq<string>();
    dlq.enqueue(stringInput(input, 'item'), stringInput(input, 'reason'));
    assert.equal(dlq.events[0]?.type, stringInput(event, 'type'));
    assert.equal(dlq.events[0]?.item, stringInput(event, 'item'));
  },
  'dlq-observed-dequeue': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected = recordInput(scenarioCase.expected, 'eventsContain');
    const dlq = new ObservedDlq<string>();
    dlq.enqueue(stringInput(input, 'item'), stringInput(input, 'reason'));
    dlq.close();
    for await (const _entry of dlq.drain()) {}
    assert.ok(
      dlq.events.some((e) => e.type === stringInput(expected, 'type') && e.item === stringInput(expected, 'item'))
    );
  },
  'dlq-observed-overflow': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const items = stringArrayInput(input, 'items');
    const dlq = new ObservedDlq<string>({ capacity: numberInput(input, 'capacity') });
    dlq.enqueue(stringArrayItem(items, 'items', 0), 'r');
    assert.throws(() => { dlq.enqueue(stringArrayItem(items, 'items', 1), 'r'); }, DeadLetterQueueFullError);
    assert.ok(dlq.events.some((e) => e.type === stringInput(expected, 'eventsContain')));
  },
  'dlq-observed-close': async (scenarioCase: ScenarioCase, _input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const dlq = new ObservedDlq<string>();
    dlq.close();
    assert.ok(dlq.events.some((e) => e.type === stringInput(expected, 'eventsContain')));
  },
  'dlq-observed-abort': async (scenarioCase: ScenarioCase, _input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const dlq = new ObservedDlq<string>();
    dlq.abort();
    assert.ok(dlq.events.some((e) => e.type === stringInput(expected, 'eventsContain')));
  },
  'dlq-hook-swallows': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const [item] = stringArrayInput(input, 'items');
    if (item === undefined) {
      throw new TypeError('Expected DLQ hook item fixture');
    }
    const reason = stringInput(input, 'reason');
    const enqueueDlq = ThrowingEnqueueDlq.create<string>();
    enqueueDlq.enqueue(item, reason);
    assert.equal(enqueueDlq.size, numberInput(expected, 'size'));
    const dequeueDlq = ThrowingDequeueDlq.create<string>();
    dequeueDlq.enqueue(item, reason);
    dequeueDlq.close();
    const entries: string[] = [];
    for await (const entry of dequeueDlq.drain()) { entries.push(entry.item); }
    assert.deepEqual(entries, [item]);
    assert.equal(dequeueDlq.size, 0);
    const overflowDlq = ThrowingOverflowDlq.create<string>({ capacity: numberInput(input, 'overflowCapacity') });
    overflowDlq.enqueue('first', reason);
    assert.throws(() => { overflowDlq.enqueue('second', reason); }, DeadLetterQueueFullError);
    const closeDlq = ThrowingCloseDlq.create<string>();
    closeDlq.close();
    assert.equal(closeDlq.closed, booleanInput(expected, 'closed'));
    const abortDlq = ThrowingAbortDlq.create<string>();
    abortDlq.abort();
    if (booleanInput(expected, 'abortedRejects')) {
      assert.throws(() => { abortDlq.enqueue(item, reason); }, DeadLetterQueueAbortedError);
    } else {
      assert.doesNotThrow(() => { abortDlq.enqueue(item, reason); });
    }
  },
  'dlq-async-hook-isolation': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const firstCause = new Error(stringInput(input, 'first'));
      const secondCause = new Error(stringInput(input, 'second'));
      const first = new AsyncRejectingEnqueueDlq<string>(firstCause);
      const second = new AsyncRejectingEnqueueDlq<string>(secondCause);
      first.enqueue('first', 'reason');
      second.enqueue('second', 'reason');
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.equal(rejectionEvents.length, numberInput(expected, 'rejectionEvents'));
      assert.equal(first.size, 1);
      const firstErrors = first.recordedHookErrors;
      const secondErrors = second.recordedHookErrors;
      assert.equal(firstErrors.length, numberInput(expected, 'hookErrorCount'));
      assert.equal(firstErrors[0]?.hookName, stringInput(expected, 'hookName'));
      assert.ok(firstErrors[0]?.cause instanceof Error);
      assert.equal(firstErrors[0].cause.message, firstCause.message);
      assert.equal(second.size, 1);
      assert.equal(secondErrors.length, numberInput(expected, 'hookErrorCount'));
      assert.equal(secondErrors[0]?.hookName, stringInput(expected, 'hookName'));
      assert.ok(secondErrors[0]?.cause instanceof Error);
      assert.equal(secondErrors[0].cause.message, secondCause.message);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  },
  'dlqr-invalid-interval': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const dlq = DeadLetterQueue.create<string>();
    for (const intervalMs of numberArrayInput(input, 'intervalMs')) {
      assert.throws(() => { DeadLetterQueueRetryGenerator.create({ deadLetterQueue: dlq, intervalMs }); }, ResilienceConfigError);
    }
  },
  'dlqr-missing-dlq': async (_scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    assert.throws(() => {
      DeadLetterQueueRetryGenerator.create({ deadLetterQueue: null as never, intervalMs: numberInput(input, 'intervalMs') });
    }, ResilienceConfigError);
  },
  'dlqr-lifecycle': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const dlq = DeadLetterQueue.create<string>();
    for (const item of stringArrayInput(input, 'items')) {
      dlq.enqueue(item, 'reason');
    }
    dlq.close();
    const generator = ObservedRetryGenerator.build(dlq, numberInput(input, 'intervalMs'));
    const yielded: string[] = [];
    for await (const entry of generator.generate()) { yielded.push(entry.item); }
    assert.deepEqual(yielded, stringArrayInput(expected, 'yielded'));
    assert.deepEqual(generator.events, stringArrayInput(expected, 'events'));
  },
  'dlqr-hook-swallows': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const intervalMs = numberInput(input, 'intervalMs');
    const items = stringArrayInput(input, 'items');
    const dlq = DeadLetterQueue.create<string>();
    for (const item of items) {
      dlq.enqueue(item, 'reason');
    }
    dlq.close();
    const generator = ThrowingYieldGenerator.build(dlq, intervalMs);
    const yielded: string[] = [];
    for await (const entry of generator.generate()) { yielded.push(entry.item); }
    assert.deepEqual(yielded, stringArrayInput(expected, 'yielded'));
    const waitDlq = DeadLetterQueue.create<string>();
    for (const item of items) {
      waitDlq.enqueue(item, 'reason');
    }
    waitDlq.close();
    const waitGenerator = ThrowingWaitGenerator.build(waitDlq, intervalMs);
    const waited: string[] = [];
    for await (const entry of waitGenerator.generate()) { waited.push(entry.item); }
    assert.deepEqual(waited, stringArrayInput(expected, 'yielded'));
    const doneDlq = DeadLetterQueue.create<string>();
    doneDlq.close();
    const doneGenerator = ThrowingDoneGenerator.build(doneDlq, intervalMs);
    let count = 0;
    for await (const _entry of doneGenerator.generate()) { count += 1; }
    assert.equal(count, 0);
    assert.equal(yielded.length > 0 && waited.length > 0 && count === 0, booleanInput(expected, 'waitYieldDone'));
  },
  'dlqr-async-hook-isolation': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const firstQueue = DeadLetterQueue.create<string>();
      const yielded = stringArrayInput(expected, 'yielded');
      firstQueue.enqueue(stringArrayItem(yielded, 'yielded', 0), 'reason');
      firstQueue.close();
      const secondQueue = DeadLetterQueue.create<string>();
      secondQueue.enqueue(stringArrayItem(yielded, 'yielded', 1), 'reason');
      secondQueue.close();
      const firstCause = new Error(stringInput(input, 'first'));
      const secondCause = new Error(stringInput(input, 'second'));
      const intervalMs = numberInput(input, 'intervalMs');
      const first = new AsyncRejectingYieldGenerator(firstQueue, intervalMs, firstCause);
      const second = new AsyncRejectingYieldGenerator(secondQueue, intervalMs, secondCause);
      const firstYielded: string[] = [];
      const secondYielded: string[] = [];
      for await (const entry of first.generate()) { firstYielded.push(entry.item); }
      for await (const entry of second.generate()) { secondYielded.push(entry.item); }
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.deepEqual([...firstYielded, ...secondYielded], yielded);
      assert.equal(rejectionEvents.length, numberInput(expected, 'rejectionEvents'));
      const firstErrors = first.recordedHookErrors;
      const secondErrors = second.recordedHookErrors;
      assert.equal(firstErrors.length, 1);
      assert.equal(firstErrors[0]?.hookName, stringInput(expected, 'hookName'));
      assert.ok(firstErrors[0]?.cause instanceof Error);
      assert.equal(firstErrors[0].cause.message, firstCause.message);
      assert.equal(secondErrors.length, 1);
      assert.equal(secondErrors[0]?.hookName, stringInput(expected, 'hookName'));
      assert.ok(secondErrors[0]?.cause instanceof Error);
      assert.equal(secondErrors[0].cause.message, secondCause.message);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  },
  'entity-dlq-entry': async (scenarioCase: ScenarioCase, input: ScenarioInput): Promise<void> => {
    const expected: ScenarioInput = scenarioCase.expected;
    assert.equal(DeadLetterQueueEntryMetadataEntity.validate(recordInput(input, 'valid')), booleanInput(expected, 'valid'));
    assert.equal(DeadLetterQueueEntryMetadataEntity.validate(recordInput(input, 'invalid')), booleanInput(expected, 'invalid'));
  }
} satisfies Record<ScenarioShape, ScenarioHandler>;

function isScenarioShape(shape: string): shape is ScenarioShape {
  return Object.hasOwn(scenarioHandlers, shape);
}

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  const { shape } = scenarioCase;
  if (!isScenarioShape(shape)) {
    throw new Error(`Unhandled resilience scenario shape: ${shape}`);
  }
  await scenarioHandlers[shape](scenarioCase, scenarioCase.input.resilience);
}
void describe('Resilience', () => {
  for (const scenarioCase of scenarioGroups.cases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
