import type { OperationFunctionInterface, OperationInterceptorInterface, OperationPipelineInterface } from '@studnicky/pipeline/interfaces';

import { VirtualTimeCounter } from '@studnicky/clock/node';
import { Semaphore, SemaphoreQueueFullError } from '@studnicky/concurrency/node';
import { RuntimeError } from '@studnicky/errors/node';
import { EventBus } from '@studnicky/event-bus/node';
import { OperationPipeline } from '@studnicky/pipeline/node';
import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import { VirtualScheduler } from '@studnicky/scheduler/node';
import { CallerFault } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { BoundedDispatcherConfigInterface } from '../../../src/interfaces/BoundedDispatcherConfigInterface.js';
import type { BoundedDispatcherOperationContextInterface } from '../../../src/interfaces/BoundedDispatcherOperationContextInterface.js';
import type { BoundedDispatcherTopicMapInterface } from '../../../src/interfaces/BoundedDispatcherTopicMapInterface.js';

import { BoundedDispatcher } from '../../../src/index.js';
import { BoundedDispatcherScenarioCaseEntity } from '../entities/BoundedDispatcherScenarioCaseEntity.js';
import { BoundedDispatcherTestConstants } from '../fixtures/BoundedDispatcherTestConstants.js';
import scenarioGroups from './bounded-dispatcher.scenarios.json' with { 'type': 'json' };

interface PublicationCauseDetailsInterface {
  readonly 'details': { readonly 'value': number; };
}

class PublicationCauseError extends RuntimeError {
  public readonly details: PublicationCauseDetailsInterface['details'];

  public constructor(details: PublicationCauseDetailsInterface['details']) {
    super({ 'message': 'Publication failure fixture' });
    this.details = details;
  }
}

interface MaterializedDispatcherInterface {
  'dispatcher': BoundedDispatcher;
  'scheduler'?: VirtualScheduler;
}

interface MaterializedSchedulerInterface {
  'provider'?: BoundedDispatcherConfigInterface['scheduler'];
  'virtual'?: VirtualScheduler;
}

interface MutableDispatcherConfigInterface {
  'bus'?: NonNullable<BoundedDispatcherConfigInterface['bus']>;
  'scheduler'?: NonNullable<BoundedDispatcherConfigInterface['scheduler']>;
  'semaphore'?: NonNullable<BoundedDispatcherConfigInterface['semaphore']>;
}



class RejectingEventBus extends EventBus<BoundedDispatcherTopicMapInterface> {
  readonly #cause: RuntimeError;
  readonly #failureOrdinal: number;
  #publicationCount = 0;

  constructor(failureOrdinal: number, cause: RuntimeError) {
    super();
    this.#cause = cause;
    this.#failureOrdinal = failureOrdinal;
  }

  override publish<K extends keyof BoundedDispatcherTopicMapInterface>(
    topic: K,
    payload: BoundedDispatcherTopicMapInterface[K]
  ): Promise<void> {
    this.#publicationCount += 1;
    if (this.#publicationCount === this.#failureOrdinal) {
      const rejection = Promise.reject(this.#cause);
      return rejection;
    }
    const publication = super.publish(topic, payload);
    return publication;
  }
}

class BoundedDispatcherRunners {
  static flushMicrotasks(): Promise<void> {
    const flush = new Promise<void>((resolve) => { setImmediate(resolve); });
    return flush;
  }

  static requireBusOptionsDescriptor(
    descriptor: BoundedDispatcherScenarioCaseEntity.Type['input']['dispatcher']['bus']
  ): Extract<BoundedDispatcherScenarioCaseEntity.Type['input']['dispatcher']['bus'], { 'shape': 'options'; }> {
    if (descriptor.shape !== 'options') {
      throw RuntimeError.create(`Expected options bus descriptor, received ${descriptor.shape}`);
    }
    return descriptor;
  }

  static requireRejectingBusDescriptor(
    descriptor: BoundedDispatcherScenarioCaseEntity.Type['input']['dispatcher']['bus']
  ): Extract<BoundedDispatcherScenarioCaseEntity.Type['input']['dispatcher']['bus'], { 'shape': 'rejecting'; }> {
    if (descriptor.shape !== 'rejecting') {
      throw RuntimeError.create(`Expected rejecting bus descriptor, received ${descriptor.shape}`);
    }
    return descriptor;
  }

  static requireVirtualSchedulerDescriptor(
    descriptor: BoundedDispatcherScenarioCaseEntity.Type['input']['dispatcher']['scheduler']
  ): Extract<BoundedDispatcherScenarioCaseEntity.Type['input']['dispatcher']['scheduler'], { 'shape': 'virtual'; }> {
    if (descriptor.shape !== 'virtual') {
      throw RuntimeError.create(`Expected virtual scheduler descriptor, received ${descriptor.shape}`);
    }
    return descriptor;
  }

  static materializeBus(
    descriptor: BoundedDispatcherScenarioCaseEntity.Type['input']['dispatcher']['bus'],
    cause: RuntimeError | undefined
  ): BoundedDispatcherConfigInterface['bus'] {
    if (descriptor.shape === 'default') {
      return undefined;
    }
    if (descriptor.shape === 'options') {
      const optionsRecord = ScenarioValues.requireRecord(descriptor.options, 'input.dispatcher.bus.options');
      const highWaterMark = optionsRecord.highWaterMark;
      if (highWaterMark === undefined) {
        return {};
      }
      const options = { 'highWaterMark': ScenarioValues.requireInteger(highWaterMark, 'input.dispatcher.bus.options.highWaterMark') };
      return options;
    }
    if (cause === undefined) {
      throw RuntimeError.create('Rejecting bus descriptor requires a publication cause');
    }
    const bus = new RejectingEventBus(descriptor.failureOrdinal, cause);
    return bus;
  }

  static materializeScheduler(
    descriptor: BoundedDispatcherScenarioCaseEntity.Type['input']['dispatcher']['scheduler']
  ): MaterializedSchedulerInterface {
    if (descriptor.shape === 'default') {
      return {};
    }
    const counterRecord = ScenarioValues.requireRecord(descriptor.counter, 'input.dispatcher.scheduler.counter');
    const startMs = counterRecord.startMs;
    const counterOptions = startMs === undefined
      ? {}
      : { 'startMs': ScenarioValues.requireNumber(startMs, 'input.dispatcher.scheduler.counter.startMs') };
    const counter = VirtualTimeCounter.create(counterOptions);
    const schedulerOptions: { 'counter': VirtualTimeCounter; } = { 'counter': counter };
    const scheduler = VirtualScheduler.create(schedulerOptions);
    return { 'provider': scheduler, 'virtual': scheduler };
  }

  static materializeDispatcher(
    config: BoundedDispatcherScenarioCaseEntity.Type['input']['dispatcher'],
    cause?: RuntimeError
  ): MaterializedDispatcherInterface {
    const dispatcherConfig: MutableDispatcherConfigInterface = {};
    if (config.options.semaphore !== undefined) {
      dispatcherConfig.semaphore = config.options.semaphore;
    }
    const bus = BoundedDispatcherRunners.materializeBus(config.bus, cause);
    if (bus !== undefined) {
      dispatcherConfig.bus = bus;
    }
    const scheduler = BoundedDispatcherRunners.materializeScheduler(config.scheduler);
    if (scheduler.provider !== undefined) {
      dispatcherConfig.scheduler = scheduler.provider;
    }
    const materialized: MaterializedDispatcherInterface = { 'dispatcher': BoundedDispatcher.create(dispatcherConfig) };
    if (scheduler.virtual !== undefined) {
      materialized.scheduler = scheduler.virtual;
    }
    return materialized;
  }

  static createDispatcher(config: BoundedDispatcherScenarioCaseEntity.Type['input']['dispatcher']): BoundedDispatcher {
    const materialized = BoundedDispatcherRunners.materializeDispatcher(config);
    return materialized.dispatcher;
  }

  static createVirtualDispatcher(config: BoundedDispatcherScenarioCaseEntity.Type['input']['dispatcher']): {
    'dispatcher': BoundedDispatcher;
    'scheduler': VirtualScheduler;
  } {
    const materialized = BoundedDispatcherRunners.materializeDispatcher(config);
    if (materialized.scheduler === undefined) {
      throw RuntimeError.create('Virtual scheduler descriptor is required');
    }
    return { 'dispatcher': materialized.dispatcher, 'scheduler': materialized.scheduler };
  }

  static createRejectingDispatcher(
    config: BoundedDispatcherScenarioCaseEntity.Type['input']['dispatcher'],
    cause: RuntimeError
  ): BoundedDispatcher {
    const materialized = BoundedDispatcherRunners.materializeDispatcher(config, cause);
    return materialized.dispatcher;
  }

  static assertPublicationFailure(
    dispatcher: BoundedDispatcher,
    publicationCause: Error | PublicationCauseDetailsInterface,
    expected: BoundedDispatcherScenarioCaseEntity.Type['expected']
  ): void {
    const errors = dispatcher.getHookErrors();
    assert.equal(dispatcher.hookErrorCount, 1);
    assert.equal(errors[0]?.hookName, String(expected.hookName));
    assert.notStrictEqual(errors[0]?.cause, publicationCause);
    assert.equal(errors[0]?.cause instanceof Error ? errors[0].cause.message : undefined, String(expected.causeMessage));
    assert.equal(dispatcher.hookErrorCount, Number(expected.hookErrorCount));
  }

  static dispatchErrorMessage(payload: BoundedDispatcherTopicMapInterface['dispatch'] | undefined): string | undefined {
    if (payload === undefined || !('error' in payload)) {
      return undefined;
    }
    const message = payload.error instanceof Error ? payload.error.message : undefined;
    return message;
  }

  static requireObjectCause(error: { readonly 'cause'?: unknown; }, label: string): object {
    const cause = error.cause;
    if (typeof cause !== 'object' || cause === null) {
      throw RuntimeError.create(`${label} must be an object`);
    }
    return cause;
  }

  static requireBatch(
    input: BoundedDispatcherScenarioCaseEntity.Type['input']
  ): NonNullable<BoundedDispatcherScenarioCaseEntity.Type['input']['batch']> {
    if (input.batch === undefined) {
      throw RuntimeError.create('Scenario batch input is required');
    }
    return input.batch;
  }

  static createTaskBatch(
    batch: NonNullable<BoundedDispatcherScenarioCaseEntity.Type['input']['batch']>,
    task: () => Promise<void>
  ): Promise<void>[] {
    if (batch.taskCount === undefined) {
      throw RuntimeError.create('Scenario batch.taskCount is required');
    }
    const tasks: Promise<void>[] = [];
    for (let index = 0; index < batch.taskCount; index += 1) {
      tasks.push(task());
    }
    return tasks;
  }
  static async 'backpressure-isolation'(scenarioCase: BoundedDispatcherScenarioCaseEntity.Type): Promise<void> {
    const { expected, input } = scenarioCase;
    const dispatcher = BoundedDispatcherRunners.createDispatcher(input.dispatcher);
    const gate = new Promise<void>(() => { /* never resolves during this test */ });

    dispatcher.getBus().subscribe('dispatch', async () => { await gate; });

    let concurrentCount = 0;
    let highestConcurrentObserved = 0;
    const releasers: (() => void)[] = [];

    const trackedTask = (): Promise<void> => {
      const dispatched = dispatcher.dispatch(async () => {
        concurrentCount += 1;
        highestConcurrentObserved = Math.max(highestConcurrentObserved, concurrentCount);
        await new Promise<void>((resolve) => { releasers.push(resolve); });
        concurrentCount -= 1;
      });
      return dispatched;
    };

    const pending = BoundedDispatcherRunners.createTaskBatch(BoundedDispatcherRunners.requireBatch(input), trackedTask);

    for (let attempt = 0; attempt < 25 && releasers.length < 3; attempt += 1) {
      await BoundedDispatcherRunners.flushMicrotasks();
    }

    assert.equal(releasers.length, Number(expected.releaserCount));
    assert.equal(highestConcurrentObserved, Number(expected.maxConcurrentObserved));

    releasers.forEach((release) => { release(); });
    await Promise.all(pending);
  }

  static async 'dispatch-concurrency-bound'(scenarioCase: BoundedDispatcherScenarioCaseEntity.Type): Promise<void> {
    const { expected, input } = scenarioCase;
    const dispatcher = BoundedDispatcherRunners.createDispatcher(input.dispatcher);

    let concurrentCount = 0;
    let highestConcurrentObserved = 0;

    const trackedTask = (label: string): Promise<string> => {
      const dispatched = dispatcher.dispatch(async () => {
        concurrentCount += 1;
        highestConcurrentObserved = Math.max(highestConcurrentObserved, concurrentCount);
        await new Promise<void>((resolve) => { setTimeout(resolve, 20); });
        concurrentCount -= 1;
        return `done-${label}`;
      });
      return dispatched;
    };

    const batch = BoundedDispatcherRunners.requireBatch(input);
    const results = await Promise.all((batch.labels ?? []).map((label) => {
      const dispatched = trackedTask(label);
      return dispatched;
    }));

    assert.deepEqual(results, ScenarioValues.requireStringArray(expected.results, 'expected.results'));
    assert.equal(highestConcurrentObserved, Number(expected.maxConcurrentObserved));
  }

  static async 'dispatch-error'(scenarioCase: BoundedDispatcherScenarioCaseEntity.Type): Promise<void> {
    const { expected, input } = scenarioCase;
    const dispatcher = BoundedDispatcherRunners.createDispatcher(input.dispatcher);
    const received: BoundedDispatcherTopicMapInterface['dispatch'][] = [];
    const boom = RuntimeError.create(String(input.errorMessage));

    dispatcher.getBus().subscribe('dispatch', (payload) => { received.push(payload); });

    await assert.rejects(
      dispatcher.dispatch(() => { throw boom; }),
      boom
    );
    await dispatcher.getBus().drain();

    assert.deepEqual(received.map((entry) => { return entry.phase; }), ScenarioValues.requireStringArray(expected.receivedPhases, 'expected.receivedPhases'));
    assert.equal(BoundedDispatcherRunners.dispatchErrorMessage(received[1]), String(expected.errorMessage));
  }

  static async 'dispatch-serializes'(scenarioCase: BoundedDispatcherScenarioCaseEntity.Type): Promise<void> {
    const { expected, input } = scenarioCase;
    const dispatcher = BoundedDispatcherRunners.createDispatcher(input.dispatcher);

    let concurrentCount = 0;
    let highestConcurrentObserved = 0;

    const trackedTask = (): Promise<void> => {
      const dispatched = dispatcher.dispatch(async () => {
        concurrentCount += 1;
        highestConcurrentObserved = Math.max(highestConcurrentObserved, concurrentCount);
        await new Promise<void>((resolve) => { setTimeout(resolve, 10); });
        concurrentCount -= 1;
      });
      return dispatched;
    };

    await Promise.all(BoundedDispatcherRunners.createTaskBatch(BoundedDispatcherRunners.requireBatch(input), trackedTask));

    assert.equal(highestConcurrentObserved, Number(expected.maxConcurrentObserved));
  }

  static async 'dispatch-success'(scenarioCase: BoundedDispatcherScenarioCaseEntity.Type): Promise<void> {
    const { expected, input } = scenarioCase;
    const dispatcher = BoundedDispatcherRunners.createDispatcher(input.dispatcher);
    const received: BoundedDispatcherTopicMapInterface['dispatch'][] = [];

    dispatcher.getBus().subscribe('dispatch', (payload) => { received.push(payload); });

    const result = await dispatcher.dispatch(() => {
      const dispatched = String(input.result);
      return dispatched;
    });
    await dispatcher.getBus().drain();

    assert.equal(result, String(expected.result));
    assert.deepEqual(received, ScenarioValues.requireArray(expected.received, 'expected.received'));
  }

  static async 'injected-semaphore-abort'(scenarioCase: BoundedDispatcherScenarioCaseEntity.Type): Promise<void> {
    const { expected } = scenarioCase;
    const semaphore = Semaphore.create({ 'permits': 1 });
    const dispatcher = BoundedDispatcher.create({ 'semaphore': semaphore });
    const gate = Promise.withResolvers<void>();
    const first = dispatcher.dispatch(async () => {
      await gate.promise;
    });
    await BoundedDispatcherRunners.flushMicrotasks();

    const controller = new AbortController();
    let callbackInvoked = false;
    const aborted = dispatcher.dispatch(() => {
      callbackInvoked = true;
    }, { 'signal': controller.signal });
    await BoundedDispatcherRunners.flushMicrotasks();
    assert.equal(semaphore.queuedCount, Number(expected.queuedCount));

    controller.abort(RuntimeError.create('Abort injected semaphore acquisition'));
    await assert.rejects(aborted, BoundedDispatcherTestConstants.semaphoreAcquisitionAbortedPattern);
    assert.equal(callbackInvoked, Boolean(expected.callbackInvoked));
    assert.equal(semaphore.activeCount, Number(expected.activeCount));
    assert.equal(semaphore.queuedCount, 0);

    gate.resolve();
    await first;
    await semaphore.waitForIdle();
  }

  static async 'injected-semaphore-queue-cap'(scenarioCase: BoundedDispatcherScenarioCaseEntity.Type): Promise<void> {
    const { expected } = scenarioCase;
    const semaphore = Semaphore.create({ 'maximumQueueSize': 1, 'permits': 1 });
    const dispatcher = BoundedDispatcher.create({ 'semaphore': semaphore });
    const gate = Promise.withResolvers<void>();
    const first = dispatcher.dispatch(async () => {
      await gate.promise;
      return 'first';
    });
    await BoundedDispatcherRunners.flushMicrotasks();
    const second = dispatcher.dispatch(() => { return 'second'; });
    await BoundedDispatcherRunners.flushMicrotasks();

    assert.equal(semaphore.activeCount, Number(expected.activeCount));
    assert.equal(semaphore.queuedCount, Number(expected.queuedCount));
    await assert.rejects(dispatcher.dispatch(() => { return 'third'; }), SemaphoreQueueFullError);
    assert.equal(semaphore.activeCount, Number(expected.activeCount));
    assert.equal(semaphore.queuedCount, Number(expected.queuedCount));

    gate.resolve();
    assert.deepEqual(await Promise.all([first, second]), ScenarioValues.requireStringArray(expected.results, 'expected.results'));
    await semaphore.waitForIdle();
    assert.equal(semaphore.activeCount, 0);
    assert.equal(semaphore.queuedCount, 0);
  }

  static async 'reject-error-publication'(scenarioCase: BoundedDispatcherScenarioCaseEntity.Type): Promise<void> {
    const { expected, input } = scenarioCase;
    const publicationCause = RuntimeError.create(String(input.publicationCauseMessage));
    const dispatcher = BoundedDispatcherRunners.createRejectingDispatcher(input.dispatcher, publicationCause);
    const workError = RuntimeError.create(String(input.workErrorMessage));
    await assert.rejects(
      dispatcher.dispatch(() => { throw workError; }),
      workError
    );
    await BoundedDispatcherRunners.flushMicrotasks();

    BoundedDispatcherRunners.assertPublicationFailure(dispatcher, publicationCause, expected);
  }

  static async 'reject-start-publication'(scenarioCase: BoundedDispatcherScenarioCaseEntity.Type): Promise<void> {
    const { expected, input } = scenarioCase;
    const publicationCause = RuntimeError.create(String(input.publicationCauseMessage));
    const dispatcher = BoundedDispatcherRunners.createRejectingDispatcher(input.dispatcher, publicationCause);
    const result = await dispatcher.dispatch(() => {
      const dispatched = String(input.result);
      return dispatched;
    });
    await BoundedDispatcherRunners.flushMicrotasks();

    assert.equal(result, String(input.result));
    BoundedDispatcherRunners.assertPublicationFailure(dispatcher, publicationCause, expected);
  }

  static async 'reject-success-publication'(scenarioCase: BoundedDispatcherScenarioCaseEntity.Type): Promise<void> {
    const { expected, input } = scenarioCase;
    const publicationCause = RuntimeError.create(String(input.publicationCauseMessage));
    const dispatcher = BoundedDispatcherRunners.createRejectingDispatcher(input.dispatcher, publicationCause);
    const result = await dispatcher.dispatch(() => {
      const dispatched = String(input.result);
      return dispatched;
    });
    await BoundedDispatcherRunners.flushMicrotasks();

    assert.equal(result, String(input.result));
    BoundedDispatcherRunners.assertPublicationFailure(dispatcher, publicationCause, expected);
  }

  static async 'schedule-cancel'(scenarioCase: BoundedDispatcherScenarioCaseEntity.Type): Promise<void> {
    const { expected, input } = scenarioCase;
    const { dispatcher, scheduler } = BoundedDispatcherRunners.createVirtualDispatcher(input.dispatcher);

    let fired = false;

    const task = dispatcher.scheduleDispatch(Number(input.dispatcher.atMs), () => { fired = true; });

    assert.equal(task.atMs, Number(expected.atMs));
    assert.equal(typeof task.cancel, ScenarioValues.requireString(expected.cancelType, 'expected.cancelType'));

    task.cancel();
    scheduler.advance(Number(input.dispatcher.atMs) * 2);
    await BoundedDispatcherRunners.flushMicrotasks();

    assert.equal(fired, Boolean(expected.fired));
  }

  static async 'schedule-fires'(scenarioCase: BoundedDispatcherScenarioCaseEntity.Type): Promise<void> {
    const { expected, input } = scenarioCase;
    const { dispatcher, scheduler } = BoundedDispatcherRunners.createVirtualDispatcher(input.dispatcher);

    let fired = false;
    let firedResult: string | undefined;

    dispatcher.scheduleDispatch(Number(input.dispatcher.atMs), () => {
      fired = true;
      firedResult = String(input.fireResult);
      return firedResult;
    });

    scheduler.advance(Number(input.dispatcher.atMs) / 2);
    await BoundedDispatcherRunners.flushMicrotasks();
    assert.equal(fired, Boolean(expected.beforeAdvanceFired));

    scheduler.advance(Number(input.dispatcher.atMs) / 2);
    await BoundedDispatcherRunners.flushMicrotasks();
    assert.equal(fired, Boolean(expected.afterAdvanceFired));
    assert.equal(firedResult, String(expected.firedResult));
  }

  static async 'schedule-uses-dispatch'(scenarioCase: BoundedDispatcherScenarioCaseEntity.Type): Promise<void> {
    const { expected, input } = scenarioCase;
    const { dispatcher, scheduler } = BoundedDispatcherRunners.createVirtualDispatcher(input.dispatcher);

    const order: string[] = [];
    let settled = false;

    dispatcher.scheduleDispatch(Number(input.dispatcher.atMs), async () => {
      order.push('scheduled-start');
      await new Promise<void>((resolve) => { setTimeout(resolve, 0); });
      order.push('scheduled-end');
      settled = true;
    });

    scheduler.advance(Number(input.dispatcher.atMs));
    await BoundedDispatcherRunners.flushMicrotasks();

    while(!settled) {
      await BoundedDispatcherRunners.flushMicrotasks();
    }
    assert.deepEqual(order, ScenarioValues.requireStringArray(expected.order, 'expected.order'));
  }

  static async 'snapshot-hook-failures'(scenarioCase: BoundedDispatcherScenarioCaseEntity.Type): Promise<void> {
    const { expected, input } = scenarioCase;
    const publicationCause = new PublicationCauseError({ 'value': Number(input.publicationCauseValue) });
    const dispatcher = BoundedDispatcherRunners.createRejectingDispatcher(input.dispatcher, publicationCause);
    const result = await dispatcher.dispatch(() => {
      const dispatched = String(input.result);
      return dispatched;
    });
    await BoundedDispatcherRunners.flushMicrotasks();

    Reflect.set(publicationCause.details, 'value', Number(input.mutatedValue));
    const first = dispatcher.getHookErrors();
    assert.equal(dispatcher.hookErrorCount, Number(expected.hookErrorCount));
    assert.equal(first.length, Number(expected.hookErrorCount));
    const firstError = first[0];
    if(firstError === undefined) {
      throw RuntimeError.create('Expected a hook failure snapshot');
    }
    firstError.message = 'mutated snapshot';
    const firstCause = BoundedDispatcherRunners.requireObjectCause(firstError, 'First hook failure cause');
    const firstDetails: unknown = Reflect.get(firstCause, 'details');
    if (typeof firstDetails !== 'object' || firstDetails === null) {
      throw RuntimeError.create('Expected nested cause details');
    }
    assert.equal(Reflect.get(firstDetails, 'value'), Number(expected.snapshotValue));
    Reflect.set(firstDetails, 'value', 99);

    const secondError = dispatcher.getHookErrors()[0];
    if (secondError === undefined) {
      throw RuntimeError.create('Expected the retained hook failure');
    }
    const secondCause = BoundedDispatcherRunners.requireObjectCause(secondError, 'Second hook failure cause');
    const secondDetails: unknown = Reflect.get(secondCause, 'details');

    assert.equal(result, String(input.result));
    assert.notEqual(secondError.message, 'mutated snapshot');
    assert.equal(typeof secondDetails === 'object' && secondDetails !== null
      ? Reflect.get(secondDetails, 'value')
      : undefined, Number(expected.snapshotValue));
  }
  static declaresExtraTests(): void {
    void it('runs ordered policies around the dispatched callback', async () => {
      const events: string[] = [];
      const controller = new AbortController();
      const outer: OperationInterceptorInterface<BoundedDispatcherOperationContextInterface> = async (context, next) => {
        assert.equal(context.semaphoreOptions.signal === controller.signal, true);
        events.push('outer:before');
        const result = await next(context);
        events.push('outer:after');
        return result;
      };
      const inner: OperationInterceptorInterface<BoundedDispatcherOperationContextInterface> = async (context, next) => {
        events.push('inner:before');
        const result = await next(context);
        events.push('inner:after');
        return result;
      };
      const dispatcher = BoundedDispatcher.create({
        'pipeline': OperationPipeline.create([outer, inner]),
        'semaphore': { 'permits': 1 }
      });

      const result = await dispatcher.dispatch(() => {
        events.push('callback');
        return 'completed';
      }, { 'signal': controller.signal });

      assert.equal(result, 'completed');
      assert.deepEqual(events, ['outer:before', 'inner:before', 'callback', 'inner:after', 'outer:after']);
    });

    void it('propagates queued aborts through operation policies without invoking callbacks', async () => {
      const semaphore = Semaphore.create({ 'permits': 1 });
      const controller = new AbortController();
      let policyFailure: unknown;
      let policyInvocations = 0;
      const signals: (AbortSignal | undefined)[] = [];
      const policy: OperationInterceptorInterface<BoundedDispatcherOperationContextInterface> = async (context, next) => {
        policyInvocations += 1;
        signals.push(context.semaphoreOptions.signal);
        try {
          return await next(context);
        } catch (error: unknown) {
          policyFailure = error;
          const propagated = CallerFault.propagate(error);
          return propagated;
        }
      };
      const dispatcher = BoundedDispatcher.create({
        'pipeline': OperationPipeline.create([policy]),
        'semaphore': semaphore
      });
      const gate = Promise.withResolvers<void>();
      const first = dispatcher.dispatch(async () => { await gate.promise; });
      await BoundedDispatcherRunners.flushMicrotasks();

      let callbackInvoked = false;
      const queued = dispatcher.dispatch(() => {
        callbackInvoked = true;
      }, { 'signal': controller.signal });
      await BoundedDispatcherRunners.flushMicrotasks();
      assert.equal(policyInvocations, 2);
      assert.equal(signals[1] === controller.signal, true);
      assert.equal(semaphore.queuedCount, 1);

      controller.abort(RuntimeError.create('Abort queued operation policy'));
      let receivedFailure: unknown;
      try {
        await queued;
      } catch (error: unknown) {
        receivedFailure = error;
      }

      assert.strictEqual(receivedFailure, policyFailure);
      assert.match(receivedFailure instanceof Error ? receivedFailure.message : '', BoundedDispatcherTestConstants.semaphoreAcquisitionAbortedPattern);
      assert.equal(callbackInvoked, false);
      assert.equal(semaphore.activeCount, 1);
      assert.equal(semaphore.queuedCount, 0);

      gate.resolve();
      await first;
      await semaphore.waitForIdle();
    });

    void it('propagates callback failures unchanged through operation policies', async () => {
      const callbackFailure = RuntimeError.create('callback failure');
      let policyFailure: unknown;
      let callbackInvoked = false;
      const policy: OperationInterceptorInterface<BoundedDispatcherOperationContextInterface> = async (context, next) => {
        try {
          return await next(context);
        } catch (error: unknown) {
          policyFailure = error;
          const propagated = CallerFault.propagate(error);
          return propagated;
        }
      };
      const dispatcher = BoundedDispatcher.create({
        'pipeline': OperationPipeline.create([policy]),
        'semaphore': { 'permits': 1 }
      });

      let receivedFailure: unknown;
      try {
        await dispatcher.dispatch(() => {
          callbackInvoked = true;
          throw callbackFailure;
        });
      } catch (error: unknown) {
        receivedFailure = error;
      }

      assert.equal(callbackInvoked, true);
      assert.strictEqual(receivedFailure, callbackFailure);
      assert.strictEqual(policyFailure, callbackFailure);
    });

    BoundedDispatcherRunners.declaresStructuralPipelineTest();
  }

  static declaresStructuralPipelineTest(): void {
    void it('accepts a structural operation pipeline contract', async () => {
      class StructuralPipeline implements OperationPipelineInterface<BoundedDispatcherOperationContextInterface> {
        readonly contexts: BoundedDispatcherOperationContextInterface[] = [];

        run<TResult>(
          context: BoundedDispatcherOperationContextInterface,
          operation: OperationFunctionInterface<BoundedDispatcherOperationContextInterface, TResult>
        ): Promise<TResult> {
          this.contexts.push(context);
          const result = Promise.resolve(operation(context));
          return result;
        }
      }

      const pipeline = new StructuralPipeline();
      const dispatcher = BoundedDispatcher.create({
        'pipeline': pipeline,
        'semaphore': { 'permits': 1 }
      });
      const result = await dispatcher.dispatch((): string => { return 'completed'; });

      assert.equal(result, 'completed');
      assert.equal(pipeline.contexts.length, 1);
      assert.deepEqual(pipeline.contexts[0]?.semaphoreOptions, {});
    });
  }

}
ScenarioSuite.register({
  'entity': BoundedDispatcherScenarioCaseEntity,
  'extraTests': BoundedDispatcherRunners.declaresExtraTests,
  'file': scenarioGroups,
  'name': 'BoundedDispatcher scenarios',
  'runners': BoundedDispatcherRunners
});
