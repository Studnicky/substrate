import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { VirtualTimeCounter } from '@studnicky/clock';
import { EventBus } from '@studnicky/event-bus';
import { VirtualScheduler } from '@studnicky/scheduler';

import type { BoundedDispatcherConfigInterface, BoundedDispatcherTopicMapInterface } from '../../../src/interfaces/index.js';
import { BoundedDispatcher } from '../../../src/index.js';

type DispatcherBusDescriptor =
  | { shape: 'default' }
  | { shape: 'options'; options: { highWaterMark?: number } }
  | { failureOrdinal: number; shape: 'rejecting' };

type DispatcherOptionsDescriptor = {
  permits?: number;
};

type DispatcherScenarioConfig = {
  atMs?: number;
  bus: DispatcherBusDescriptor;
  options: DispatcherOptionsDescriptor;
  scheduler: DispatcherSchedulerDescriptor;
};

type DispatcherSchedulerDescriptor =
  | { shape: 'default' }
  | { counter: { startMs?: number }; shape: 'virtual' };

type BatchInput = {
  labels?: string[];
  taskCount?: number;
};

type ScenarioShape =
  | 'backpressure-isolation'
  | 'dispatch-concurrency-bound'
  | 'dispatch-error'
  | 'dispatch-serializes'
  | 'dispatch-success'
  | 'reject-error-publication'
  | 'reject-start-publication'
  | 'reject-success-publication'
  | 'schedule-cancel'
  | 'schedule-fires'
  | 'schedule-uses-dispatch'
  | 'snapshot-hook-failures';

type ScenarioCase = {
  description: string;
  expected: Record<string, unknown>;
  input: {
    batch?: BatchInput;
    dispatcher: DispatcherScenarioConfig;
    errorMessage?: string;
    fireResult?: string;
    mutatedValue?: number;
    publicationCauseMessage?: string;
    publicationCauseValue?: number;
    result?: string;
    workErrorMessage?: string;
  };
  shape: ScenarioShape;
  name: string;
};

import scenarioGroups from './bounded-dispatcher.scenarios.json' with { type: 'json' };

type PublicationCause = Error | { details: { value: number } };

class RejectingEventBus extends EventBus<BoundedDispatcherTopicMapInterface> {
  readonly #cause: PublicationCause;
  readonly #failureOrdinal: number;
  #publicationCount = 0;

  constructor(failureOrdinal: number, cause: PublicationCause) {
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

type MaterializedDispatcher = {
  dispatcher: BoundedDispatcher;
  scheduler?: VirtualScheduler;
};

type MaterializedScheduler = {
  provider?: BoundedDispatcherConfigInterface['scheduler'];
  virtual?: VirtualScheduler;
};

type MutableDispatcherConfig = {
  bus?: NonNullable<BoundedDispatcherConfigInterface['bus']>;
  permits?: NonNullable<BoundedDispatcherConfigInterface['permits']>;
  scheduler?: NonNullable<BoundedDispatcherConfigInterface['scheduler']>;
};

type BusMaterializer = (
  descriptor: DispatcherBusDescriptor,
  cause: PublicationCause | undefined
) => BoundedDispatcherConfigInterface['bus'] | undefined;

type SchedulerMaterializer = (descriptor: DispatcherSchedulerDescriptor) => MaterializedScheduler;

function requireBusOptionsDescriptor(descriptor: DispatcherBusDescriptor): Extract<DispatcherBusDescriptor, { shape: 'options' }> {
  if (descriptor.shape !== 'options') {
    throw new Error(`Expected options bus descriptor, received ${descriptor.shape}`);
  }
  return descriptor;
}

function requireRejectingBusDescriptor(descriptor: DispatcherBusDescriptor): Extract<DispatcherBusDescriptor, { shape: 'rejecting' }> {
  if (descriptor.shape !== 'rejecting') {
    throw new Error(`Expected rejecting bus descriptor, received ${descriptor.shape}`);
  }
  return descriptor;
}

function requireVirtualSchedulerDescriptor(
  descriptor: DispatcherSchedulerDescriptor
): Extract<DispatcherSchedulerDescriptor, { shape: 'virtual' }> {
  if (descriptor.shape !== 'virtual') {
    throw new Error(`Expected virtual scheduler descriptor, received ${descriptor.shape}`);
  }
  return descriptor;
}

function materializeDefaultBus(
  _descriptor: DispatcherBusDescriptor,
  _cause: PublicationCause | undefined
): BoundedDispatcherConfigInterface['bus'] | undefined {
  return undefined;
}

function materializeOptionsBus(
  descriptor: DispatcherBusDescriptor,
  _cause: PublicationCause | undefined
): BoundedDispatcherConfigInterface['bus'] | undefined {
  return requireBusOptionsDescriptor(descriptor).options;
}

function materializeRejectingBus(
  descriptor: DispatcherBusDescriptor,
  cause: PublicationCause | undefined
): BoundedDispatcherConfigInterface['bus'] | undefined {
  const rejectingDescriptor = requireRejectingBusDescriptor(descriptor);
  if (cause === undefined) {
    throw new Error('Rejecting bus descriptor requires a publication cause');
  }
  return new RejectingEventBus(rejectingDescriptor.failureOrdinal, cause);
}

const busMaterializerMap: Record<DispatcherBusDescriptor['shape'], BusMaterializer> = {
  'default': materializeDefaultBus,
  'options': materializeOptionsBus,
  'rejecting': materializeRejectingBus
};

function materializeDefaultScheduler(_descriptor: DispatcherSchedulerDescriptor): MaterializedScheduler {
  return {};
}

function materializeVirtualScheduler(descriptor: DispatcherSchedulerDescriptor): MaterializedScheduler {
  const virtualDescriptor = requireVirtualSchedulerDescriptor(descriptor);
  const counter = VirtualTimeCounter.create(virtualDescriptor.counter);
  const schedulerOptions: { counter: VirtualTimeCounter } = Object.create(null);
  schedulerOptions.counter = counter;
  const scheduler = VirtualScheduler.create(schedulerOptions);
  return { 'provider': scheduler, 'virtual': scheduler };
}

const schedulerMaterializerMap: Record<DispatcherSchedulerDescriptor['shape'], SchedulerMaterializer> = {
  'default': materializeDefaultScheduler,
  'virtual': materializeVirtualScheduler
};

function materializeDispatcher(config: DispatcherScenarioConfig, cause?: PublicationCause): MaterializedDispatcher {
  const dispatcherConfig: MutableDispatcherConfig = Object.create(null);
  if (config.options.permits !== undefined) {
    dispatcherConfig.permits = config.options.permits;
  }
  const bus = busMaterializerMap[config.bus.shape](config.bus, cause);
  if (bus !== undefined) {
    dispatcherConfig.bus = bus;
  }
  const scheduler = schedulerMaterializerMap[config.scheduler.shape](config.scheduler);
  if (scheduler.provider !== undefined) {
    dispatcherConfig.scheduler = scheduler.provider;
  }
  const materialized: MaterializedDispatcher = {
    'dispatcher': BoundedDispatcher.create(dispatcherConfig),
  };
  if (scheduler.virtual !== undefined) {
    materialized.scheduler = scheduler.virtual;
  }
  return materialized;
}

function createDispatcher(config: DispatcherScenarioConfig): BoundedDispatcher {
  return materializeDispatcher(config).dispatcher;
}

function createVirtualDispatcher(config: DispatcherScenarioConfig): {
  dispatcher: BoundedDispatcher;
  scheduler: VirtualScheduler;
} {
  const materialized = materializeDispatcher(config);
  if (materialized.scheduler === undefined) {
    throw new Error('Virtual scheduler descriptor is required');
  }
  return {
    'dispatcher': materialized.dispatcher,
    'scheduler': materialized.scheduler
  };
}

function createRejectingDispatcher(config: DispatcherScenarioConfig, cause: PublicationCause): BoundedDispatcher {
  return materializeDispatcher(config, cause).dispatcher;
}

function assertPublicationFailure(
  dispatcher: BoundedDispatcher,
  publicationCause: PublicationCause,
  expected: ScenarioCase['expected']
): void {
  const errors = dispatcher.getHookErrors();
  assert.equal(dispatcher.hookErrorCount, 1);
  assert.equal(errors[0]?.hookName, String(expected.hookName));
  assert.notStrictEqual(errors[0]?.cause, publicationCause);
  assert.equal(errors[0]?.cause instanceof Error ? errors[0].cause.message : undefined, String(expected.causeMessage));
  assert.equal(dispatcher.hookErrorCount, Number(expected.hookErrorCount));
}

function dispatchErrorMessage(payload: BoundedDispatcherTopicMapInterface['dispatch'] | undefined): string | undefined {
  if (payload === undefined || !('error' in payload)) {
    return undefined;
  }
  return payload.error instanceof Error ? payload.error.message : undefined;
}

function requireBatch(input: ScenarioCase['input']): BatchInput {
  if (input.batch === undefined) {
    throw new Error('Scenario batch input is required');
  }
  return input.batch;
}

function createTaskBatch(batch: BatchInput, task: () => Promise<void>): Promise<void>[] {
  if (batch.taskCount === undefined) {
    throw new Error('Scenario batch.taskCount is required');
  }
  return Array.from({ length: batch.taskCount }, () => task());
}

const runnerMap: Record<ScenarioShape, (scenarioCase: ScenarioCase) => Promise<void>> = {
  'dispatch-success': async ({ expected, input }) => {
    const dispatcher = createDispatcher(input.dispatcher);
    const received: BoundedDispatcherTopicMapInterface['dispatch'][] = [];

    dispatcher.getBus().subscribe('dispatch', (payload) => { received.push(payload); });

    const result = await dispatcher.dispatch(async () => String(input.result));
    await dispatcher.getBus().drain();

    assert.equal(result, String(expected.result));
    assert.deepEqual(received, expected.received);
  },

  'dispatch-error': async ({ expected, input }) => {
    const dispatcher = createDispatcher(input.dispatcher);
    const received: BoundedDispatcherTopicMapInterface['dispatch'][] = [];
    const boom = new Error(String(input.errorMessage));

    dispatcher.getBus().subscribe('dispatch', (payload) => { received.push(payload); });

    await assert.rejects(
      dispatcher.dispatch(async () => { throw boom; }),
      boom
    );
    await dispatcher.getBus().drain();

    assert.deepEqual(received.map((entry) => entry.phase), expected.receivedPhases);
    assert.equal(dispatchErrorMessage(received[1]), String(expected.errorMessage));
  },

  'dispatch-concurrency-bound': async ({ expected, input }) => {
    const dispatcher = createDispatcher(input.dispatcher);

    let concurrentCount = 0;
    let maxConcurrentObserved = 0;

    const trackedTask = (label: string): Promise<string> => {
      return dispatcher.dispatch(async () => {
        concurrentCount += 1;
        maxConcurrentObserved = Math.max(maxConcurrentObserved, concurrentCount);
        await new Promise<void>((resolve) => { setTimeout(resolve, 20); });
        concurrentCount -= 1;
        return `done-${label}`;
      });
    };

    const batch = requireBatch(input);
    const results = await Promise.all((batch.labels ?? []).map((label) => trackedTask(label)));

    assert.deepEqual(results, expected.results);
    assert.equal(maxConcurrentObserved, Number(expected.maxConcurrentObserved));
  },

  'dispatch-serializes': async ({ expected, input }) => {
    const dispatcher = createDispatcher(input.dispatcher);

    let concurrentCount = 0;
    let maxConcurrentObserved = 0;

    const trackedTask = (): Promise<void> => {
      return dispatcher.dispatch(async () => {
        concurrentCount += 1;
        maxConcurrentObserved = Math.max(maxConcurrentObserved, concurrentCount);
        await new Promise<void>((resolve) => { setTimeout(resolve, 10); });
        concurrentCount -= 1;
      });
    };

    await Promise.all(createTaskBatch(requireBatch(input), trackedTask));

    assert.equal(maxConcurrentObserved, Number(expected.maxConcurrentObserved));
  },

  'backpressure-isolation': async ({ expected, input }) => {
    const dispatcher = createDispatcher(input.dispatcher);
    const gate = new Promise<void>(() => { /* never resolves during this test */ });

    dispatcher.getBus().subscribe('dispatch', async () => { await gate; });

    let concurrentCount = 0;
    let maxConcurrentObserved = 0;
    const releasers: Array<() => void> = [];

    const trackedTask = (): Promise<void> => {
      return dispatcher.dispatch(async () => {
        concurrentCount += 1;
        maxConcurrentObserved = Math.max(maxConcurrentObserved, concurrentCount);
        await new Promise<void>((resolve) => { releasers.push(resolve); });
        concurrentCount -= 1;
      });
    };

    const pending = createTaskBatch(requireBatch(input), trackedTask);

    for (let attempt = 0; attempt < 25 && releasers.length < 3; attempt += 1) {
      await flushMicrotasks();
    }

    assert.equal(releasers.length, Number(expected.releaserCount));
    assert.equal(maxConcurrentObserved, Number(expected.maxConcurrentObserved));

    releasers.forEach((release) => { release(); });
    await Promise.all(pending);
  },

  'reject-start-publication': async ({ expected, input }) => {
    const publicationCause = new Error(String(input.publicationCauseMessage));
    const dispatcher = createRejectingDispatcher(input.dispatcher, publicationCause);
    const result = await dispatcher.dispatch(() => String(input.result));
    await flushMicrotasks();

    assert.equal(result, String(input.result));
    assertPublicationFailure(dispatcher, publicationCause, expected);
  },

  'reject-success-publication': async ({ expected, input }) => {
    const publicationCause = new Error(String(input.publicationCauseMessage));
    const dispatcher = createRejectingDispatcher(input.dispatcher, publicationCause);
    const result = await dispatcher.dispatch(async () => String(input.result));
    await flushMicrotasks();

    assert.equal(result, String(input.result));
    assertPublicationFailure(dispatcher, publicationCause, expected);
  },

  'reject-error-publication': async ({ expected, input }) => {
    const publicationCause = new Error(String(input.publicationCauseMessage));
    const dispatcher = createRejectingDispatcher(input.dispatcher, publicationCause);
    const workError = new Error(String(input.workErrorMessage));
    await assert.rejects(
      dispatcher.dispatch(async () => { throw workError; }),
      workError
    );
    await flushMicrotasks();

    assertPublicationFailure(dispatcher, publicationCause, expected);
  },

  'snapshot-hook-failures': async ({ expected, input }) => {
    const publicationCause = { 'details': { 'value': Number(input.publicationCauseValue) } };
    const dispatcher = createRejectingDispatcher(input.dispatcher, publicationCause);
    const result = await dispatcher.dispatch(() => String(input.result));
    await flushMicrotasks();

    publicationCause.details.value = Number(input.mutatedValue);
    const first = dispatcher.getHookErrors();
    assert.equal(dispatcher.hookErrorCount, Number(expected.hookErrorCount));
    assert.equal(first.length, Number(expected.hookErrorCount));
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
    assert.equal(Reflect.get(firstDetails, 'value'), Number(expected.snapshotValue));
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

    assert.equal(result, String(input.result));
    assert.notEqual(secondError.message, 'mutated snapshot');
    assert.equal(typeof secondDetails === 'object' && secondDetails !== null
      ? Reflect.get(secondDetails, 'value')
      : undefined, Number(expected.snapshotValue));
  },

  'schedule-fires': async ({ expected, input }) => {
    const { dispatcher, scheduler } = createVirtualDispatcher(input.dispatcher);

    let fired = false;
    let firedResult: string | undefined;

    dispatcher.scheduleDispatch(Number(input.dispatcher.atMs), async () => {
      fired = true;
      firedResult = String(input.fireResult);
      return firedResult;
    });

    scheduler.advance(Number(input.dispatcher.atMs) / 2);
    await flushMicrotasks();
    assert.equal(fired, Boolean(expected.beforeAdvanceFired));

    scheduler.advance(Number(input.dispatcher.atMs) / 2);
    await flushMicrotasks();
    assert.equal(fired, Boolean(expected.afterAdvanceFired));
    assert.equal(firedResult, String(expected.firedResult));
  },

  'schedule-cancel': async ({ expected, input }) => {
    const { dispatcher, scheduler } = createVirtualDispatcher(input.dispatcher);

    let fired = false;

    const task = dispatcher.scheduleDispatch(Number(input.dispatcher.atMs), () => { fired = true; });

    assert.equal(task.atMs, Number(expected.atMs));
    assert.equal(typeof task.cancel, expected.cancelType);

    task.cancel();
    scheduler.advance(Number(input.dispatcher.atMs) * 2);
    await flushMicrotasks();

    assert.equal(fired, Boolean(expected.fired));
  },

  'schedule-uses-dispatch': async ({ expected, input }) => {
    const { dispatcher, scheduler } = createVirtualDispatcher(input.dispatcher);

    const order: string[] = [];
    let settled = false;

    dispatcher.scheduleDispatch(Number(input.dispatcher.atMs), async () => {
      order.push('scheduled-start');
      await new Promise<void>((resolve) => { setTimeout(resolve, 0); });
      order.push('scheduled-end');
      settled = true;
    });

    scheduler.advance(Number(input.dispatcher.atMs));
    await flushMicrotasks();

    while (!settled) {
      await flushMicrotasks();
    }
    assert.deepEqual(order, expected.order);
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('BoundedDispatcher', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
