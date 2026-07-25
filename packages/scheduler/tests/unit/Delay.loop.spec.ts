import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import {
  describe, it
} from 'node:test';

import { VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock';

import type { ScheduledTaskInterface } from '../../src/interfaces/ScheduledTaskInterface.js';
import type { SchedulerProviderInterface } from '../../src/interfaces/SchedulerProviderInterface.js';
import { Delay } from '../../src/delay/Delay.js';
import { RealTimeScheduler } from '../../src/scheduler/RealTimeScheduler.js';
import { VirtualScheduler } from '../../src/scheduler/VirtualScheduler.js';
import scenarioGroups from './Delay.scenarios.json';

interface VirtualSchedulerInputInterface {
  counter: {
    startMs: number;
  };
}

interface DelayInputInterface {
  abortMs?: number;
  reasonMessage?: string;
  scheduler?: VirtualSchedulerInputInterface;
  schedulerErrorMessage?: string;
  sleepMs: number;
}

type ScenarioCase =
  | {
      description: string;
      expected: { elapsedMsAtLeast: number };
      input: DelayInputInterface;
      kind: 'real-time-sleep';
      name: string;
    }
  | {
      description: string;
      expected: { resolved: true; virtualSleepMs: number };
      input: DelayInputInterface;
      kind: 'virtual-sleep';
      name: string;
    }
  | {
      description: string;
      expected: { cancelCount: 1; reasonMessage: string };
      input: DelayInputInterface;
      kind: 'real-time-abort';
      name: string;
    }
  | {
      description: string;
      expected: { resolved: true; sleepMs: 0 };
      input: DelayInputInterface;
      kind: 'virtual-zero';
      name: string;
    }
  | {
      description: string;
      expected: { resolved: true; sleepMs: 0 };
      input: DelayInputInterface;
      kind: 'default-scheduler';
      name: string;
    }
  | {
      description: string;
      expected: { scheduleCount: 0 };
      input: DelayInputInterface;
      kind: 'pre-aborted';
      name: string;
    }
  | {
      description: string;
      expected: { cancelCount: 0; fireCount: 0; scheduleCount: 0 };
      input: DelayInputInterface;
      kind: 'abort-during-clock';
      name: string;
    }
  | {
      description: string;
      expected: { cancelCount: 1; fireCount: 0; scheduleCount: 1 };
      input: DelayInputInterface;
      kind: 'abort-during-schedule';
      name: string;
    }
  | {
      description: string;
      expected: { cancelCount: 1; fireCount: 0 };
      input: DelayInputInterface;
      kind: 'pending-abort';
      name: string;
    }
  | {
      description: string;
      expected: { cancelCount: 0; fireCount: 1 };
      input: DelayInputInterface;
      kind: 'late-abort';
      name: string;
    }
  | {
      description: string;
      expected: { errorMessage: string; listenerCountUnchanged: true };
      input: DelayInputInterface;
      kind: 'schedule-failure';
      name: string;
    };

const TRACE_DELAY_TESTS = process.env.SUBSTRATE_TEST_TRACE === '1';

function traceDelayTest(message: string, payload?: unknown): void {
  if (!TRACE_DELAY_TESTS) {
    return;
  }
  if (payload === undefined) {
    console.error(`[Delay.loop] ${message}`);
    return;
  }
  console.error(`[Delay.loop] ${message}`, payload);
}

class AuditRealTimeScheduler extends RealTimeScheduler {
  public cancelCount = 0;
  public constructor() { super(); }
  protected override onCancel(_id: string): void { this.cancelCount = this.cancelCount + 1; }
}

class AuditVirtualScheduler extends VirtualScheduler {
  public cancelCount = 0;
  public fireCount = 0;
  public scheduleCount = 0;
  public constructor(counter: Readonly<VirtualTimeCounter>) { super(counter); }
  protected override onCancel(_id: string): void { this.cancelCount = this.cancelCount + 1; }
  protected override onFire(_id: string): void { this.fireCount = this.fireCount + 1; }
  protected override onSchedule(_id: string, _atMs: number, _variant: 'interval' | 'timeout'): void { this.scheduleCount = this.scheduleCount + 1; }
}

class ThrowingScheduler implements SchedulerProviderInterface {
  readonly #error: Error;
  public constructor(error: Error) { this.#error = error; }
  public cancelAll(): void {}
  public scheduleAt(_atMs: number, _fire: () => Promise<void> | void): ScheduledTaskInterface {
    throw this.#error;
  }
  public scheduleEvery(_intervalMs: number, _fire: () => Promise<void> | void): ScheduledTaskInterface {
    throw this.#error;
  }
}

function virtualSchedulerInput(input: DelayInputInterface): VirtualSchedulerInputInterface {
  assert.ok(input.scheduler !== undefined);
  return input.scheduler;
}

function createVirtualTimeCounter(input: DelayInputInterface): VirtualTimeCounter {
  return VirtualTimeCounter.create({ 'startMs': virtualSchedulerInput(input).counter.startMs });
}

function createReason(input: DelayInputInterface): Error {
  assert.ok(input.reasonMessage !== undefined);
  return new Error(input.reasonMessage);
}

function createSchedulerError(input: DelayInputInterface): Error {
  assert.ok(input.schedulerErrorMessage !== undefined);
  return new Error(input.schedulerErrorMessage);
}

const runnerMap: Record<ScenarioCase['kind'], (scenarioCase: ScenarioCase) => Promise<void>> = {
  'abort-during-clock': async (scenarioCase) => {
    const counter = createVirtualTimeCounter(scenarioCase.input);
    const scheduler = new AuditVirtualScheduler(counter);
    const controller = new AbortController();
    const reason = createReason(scenarioCase.input);
    const clock = {
      hrtime(): bigint { return 0n; },
      now(): number {
        controller.abort(reason);
        return counter.nowMs();
      }
    };
    const promise = Delay.sleep(scenarioCase.input.sleepMs, { 'clock': clock, 'scheduler': scheduler, 'signal': controller.signal });
    await assert.rejects(promise, (error: unknown) => error === reason);
    scheduler.advance(scenarioCase.input.sleepMs);
    assert.strictEqual(scheduler.scheduleCount, scenarioCase.expected.scheduleCount);
    assert.strictEqual(scheduler.cancelCount, scenarioCase.expected.cancelCount);
    assert.strictEqual(scheduler.fireCount, scenarioCase.expected.fireCount);
    assert.strictEqual(getEventListeners(controller.signal, 'abort').length, 0);
  },
  'abort-during-schedule': async (scenarioCase) => {
    const counter = createVirtualTimeCounter(scenarioCase.input);
    const clock = VirtualClockProvider.create(counter);
    const controller = new AbortController();
    const reason = createReason(scenarioCase.input);
    class AbortOnScheduleScheduler extends AuditVirtualScheduler {
      public constructor() { super(counter); }
      protected override onSchedule(id: string, atMs: number, variant: 'interval' | 'timeout'): void {
        super.onSchedule(id, atMs, variant);
        controller.abort(reason);
      }
    }
    const scheduler = new AbortOnScheduleScheduler();
    const promise = Delay.sleep(scenarioCase.input.sleepMs, { 'clock': clock, 'scheduler': scheduler, 'signal': controller.signal });
    await assert.rejects(promise, (error: unknown) => error === reason);
    scheduler.advance(scenarioCase.input.sleepMs);
    assert.strictEqual(scheduler.scheduleCount, scenarioCase.expected.scheduleCount);
    assert.strictEqual(scheduler.cancelCount, scenarioCase.expected.cancelCount);
    assert.strictEqual(scheduler.fireCount, scenarioCase.expected.fireCount);
    assert.strictEqual(getEventListeners(controller.signal, 'abort').length, 0);
  },
  'default-scheduler': async (scenarioCase) => {
    await Delay.sleep(scenarioCase.input.sleepMs);
    assert.equal(scenarioCase.expected.resolved, true);
  },
  'late-abort': async (scenarioCase) => {
    const counter = createVirtualTimeCounter(scenarioCase.input);
    const scheduler = new AuditVirtualScheduler(counter);
    const clock = VirtualClockProvider.create(counter);
    const controller = new AbortController();
    const promise = Delay.sleep(scenarioCase.input.sleepMs, { 'clock': clock, 'scheduler': scheduler, 'signal': controller.signal });
    scheduler.advance(scenarioCase.input.sleepMs);
    await promise;
    controller.abort(createReason(scenarioCase.input));
    assert.strictEqual(scheduler.fireCount, scenarioCase.expected.fireCount);
    assert.strictEqual(scheduler.cancelCount, scenarioCase.expected.cancelCount);
  },
  'pending-abort': async (scenarioCase) => {
    const counter = createVirtualTimeCounter(scenarioCase.input);
    const scheduler = new AuditVirtualScheduler(counter);
    const clock = VirtualClockProvider.create(counter);
    const controller = new AbortController();
    const reason = createReason(scenarioCase.input);
    const promise = Delay.sleep(scenarioCase.input.sleepMs, { 'clock': clock, 'scheduler': scheduler, 'signal': controller.signal });
    controller.abort(reason);
    await assert.rejects(promise, (error: unknown) => error === reason);
    scheduler.advance(scenarioCase.input.sleepMs);
    assert.strictEqual(scheduler.cancelCount, scenarioCase.expected.cancelCount);
    assert.strictEqual(scheduler.fireCount, scenarioCase.expected.fireCount);
  },
  'pre-aborted': async (scenarioCase) => {
    const counter = createVirtualTimeCounter(scenarioCase.input);
    const scheduler = new AuditVirtualScheduler(counter);
    const clock = VirtualClockProvider.create(counter);
    const controller = new AbortController();
    const reason = createReason(scenarioCase.input);
    controller.abort(reason);
    await assert.rejects(
      Delay.sleep(scenarioCase.input.sleepMs, { 'clock': clock, 'scheduler': scheduler, 'signal': controller.signal }),
      (error: unknown) => error === reason
    );
    assert.strictEqual(scheduler.scheduleCount, scenarioCase.expected.scheduleCount);
  },
  'real-time-abort': async (scenarioCase) => {
    const scheduler = new AuditRealTimeScheduler();
    const controller = new AbortController();
    const reason = createReason(scenarioCase.input);
    const promise = Delay.sleep(scenarioCase.input.sleepMs, { 'scheduler': scheduler, 'signal': controller.signal });
    controller.abort(reason);
    await assert.rejects(promise, (error: unknown) => error === reason);
    assert.strictEqual(scheduler.cancelCount, scenarioCase.expected.cancelCount);
    assert.strictEqual(reason.message, scenarioCase.expected.reasonMessage);
  },
  'real-time-sleep': async (scenarioCase) => {
    const start = Date.now();
    await Delay.sleep(scenarioCase.input.sleepMs);
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= scenarioCase.expected.elapsedMsAtLeast);
  },
  'schedule-failure': async (scenarioCase) => {
    const controller = new AbortController();
    const schedulerError = createSchedulerError(scenarioCase.input);
    const listenersBefore = getEventListeners(controller.signal, 'abort').length;
    const promise = Delay.sleep(scenarioCase.input.sleepMs, { 'scheduler': new ThrowingScheduler(schedulerError), 'signal': controller.signal });
    assert.strictEqual(getEventListeners(controller.signal, 'abort').length, listenersBefore);
    await assert.rejects(promise, (error: unknown) => error === schedulerError);
    assert.equal(scenarioCase.expected.errorMessage, schedulerError.message);
    assert.equal(scenarioCase.expected.listenerCountUnchanged, true);
  },
  'virtual-sleep': async (scenarioCase) => {
    const counter = createVirtualTimeCounter(scenarioCase.input);
    const scheduler = VirtualScheduler.create({ 'counter': counter });
    const clock = VirtualClockProvider.create(counter);
    let resolved = false;
    traceDelayTest('virtual-sleep before schedule', scenarioCase.input);
    const promise = Delay.sleep(scenarioCase.input.sleepMs, { 'clock': clock, 'scheduler': scheduler }).then(() => { resolved = true; });
    assert.strictEqual(resolved, false);
    traceDelayTest('virtual-sleep before advance', { 'sleepMs': scenarioCase.input.sleepMs });
    scheduler.advance(scenarioCase.input.sleepMs);
    await promise;
    traceDelayTest('virtual-sleep after resolve', { 'resolved': resolved, 'sleepMs': scenarioCase.input.sleepMs });
    assert.strictEqual(resolved, scenarioCase.expected.resolved);
    assert.equal(scenarioCase.expected.virtualSleepMs, scenarioCase.input.sleepMs);
  },
  'virtual-zero': async (scenarioCase) => {
    const counter = createVirtualTimeCounter(scenarioCase.input);
    const scheduler = VirtualScheduler.create({ 'counter': counter });
    const clock = VirtualClockProvider.create(counter);
    traceDelayTest('virtual-zero before schedule', scenarioCase.input);
    const promise = Delay.sleep(scenarioCase.input.sleepMs, { 'clock': clock, 'scheduler': scheduler });
    traceDelayTest('virtual-zero before advance', { 'sleepMs': scenarioCase.input.sleepMs });
    scheduler.advance(scenarioCase.input.sleepMs);
    await promise;
    traceDelayTest('virtual-zero after resolve', { 'sleepMs': scenarioCase.input.sleepMs });
    assert.equal(scenarioCase.expected.resolved, true);
    assert.equal(scenarioCase.expected.sleepMs, scenarioCase.input.sleepMs);
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  traceDelayTest('case start', { 'kind': scenarioCase.kind, 'name': scenarioCase.name });
  try {
    await runnerMap[scenarioCase.kind](scenarioCase);
    traceDelayTest('case end', { 'kind': scenarioCase.kind, 'name': scenarioCase.name });
  } catch (error: unknown) {
    traceDelayTest('case fail', { 'error': error instanceof Error ? error.message : String(error), 'kind': scenarioCase.kind, 'name': scenarioCase.name });
    throw error;
  }
}

void describe('Delay', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
