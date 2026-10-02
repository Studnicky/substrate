import type { ClockProviderInterface } from '@studnicky/clock/browser';
import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock/node';
import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { inspect } from 'node:util';

import type { ScheduledTaskInterface } from '../../src/interfaces/ScheduledTaskInterface.js';
import type { SchedulerProviderInterface } from '../../src/interfaces/SchedulerProviderInterface.js';

import { Delay } from '../../src/delay/Delay.js';
import { RealTimeScheduler } from '../../src/scheduler/RealTimeScheduler.js';
import { VirtualScheduler } from '../../src/scheduler/VirtualScheduler.js';
import scenarioGroups from './Delay.scenarios.json' with { 'type': 'json' };
import { DelayScenarioCaseEntity } from './entities/DelayScenarioCaseEntity.js';

const TRACE_DELAY_TESTS = process.env.SUBSTRATE_TEST_TRACE === '1';

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

class AbortingClock implements ClockProviderInterface {
  readonly #controller: AbortController;
  readonly #counter: Readonly<VirtualTimeCounter>;
  readonly #reason: RuntimeError;

  public constructor(counter: Readonly<VirtualTimeCounter>, controller: AbortController, reason: RuntimeError) {
    this.#counter = counter;
    this.#controller = controller;
    this.#reason = reason;
  }

  public hrtime(): bigint { return 0n; }

  public now(): number {
    this.#controller.abort(this.#reason);
    const result = this.#counter.nowMs();
    return result;
  }
}

class ThrowingScheduler implements SchedulerProviderInterface {
  readonly #error: RuntimeError;
  public constructor(error: RuntimeError) { this.#error = error; }
  public cancelAll(): void {}
  public scheduleAt(_atMs: number, _fire: () => Promise<void> | void): ScheduledTaskInterface {
    throw this.#error;
  }
  public scheduleEvery(_intervalMs: number, _fire: () => Promise<void> | void): ScheduledTaskInterface {
    throw this.#error;
  }
}

class DelayRunners {
  static async 'abort-during-clock'(scenarioCase: ScenarioCaseOfType<DelayScenarioCaseEntity.Type, 'abort-during-clock'>): Promise<void> {
    const counter = DelayRunners.createVirtualTimeCounter(scenarioCase.input);
    const scheduler = new AuditVirtualScheduler(counter);
    const controller = new AbortController();
    const reason = DelayRunners.createReason(scenarioCase.input);
    const clock = new AbortingClock(counter, controller, reason);
    const promise = Delay.sleep(scenarioCase.input.sleepMs, { 'clock': clock, 'scheduler': scheduler, 'signal': controller.signal });
    await assert.rejects(promise, (error: Error) => {
      const result = error === reason;
      return result;
    });
    scheduler.advance(scenarioCase.input.sleepMs);
    assert.strictEqual(scheduler.scheduleCount, scenarioCase.expected.scheduleCount);
    assert.strictEqual(scheduler.cancelCount, scenarioCase.expected.cancelCount);
    assert.strictEqual(scheduler.fireCount, scenarioCase.expected.fireCount);
    assert.strictEqual(getEventListeners(controller.signal, 'abort').length, 0);
  }

  static async 'abort-during-schedule'(scenarioCase: ScenarioCaseOfType<DelayScenarioCaseEntity.Type, 'abort-during-schedule'>): Promise<void> {
    const counter = DelayRunners.createVirtualTimeCounter(scenarioCase.input);
    const clock = VirtualClockProvider.create(counter);
    const controller = new AbortController();
    const reason = DelayRunners.createReason(scenarioCase.input);
    class AbortOnScheduleScheduler extends AuditVirtualScheduler {
      public constructor() { super(counter); }
      protected override onSchedule(id: string, atMs: number, variant: 'interval' | 'timeout'): void {
        super.onSchedule(id, atMs, variant);
        controller.abort(reason);
      }
    }
    const scheduler = new AbortOnScheduleScheduler();
    const promise = Delay.sleep(scenarioCase.input.sleepMs, { 'clock': clock, 'scheduler': scheduler, 'signal': controller.signal });
    await assert.rejects(promise, (error: Error) => {
      const result = error === reason;
      return result;
    });
    scheduler.advance(scenarioCase.input.sleepMs);
    assert.strictEqual(scheduler.scheduleCount, scenarioCase.expected.scheduleCount);
    assert.strictEqual(scheduler.cancelCount, scenarioCase.expected.cancelCount);
    assert.strictEqual(scheduler.fireCount, scenarioCase.expected.fireCount);
    assert.strictEqual(getEventListeners(controller.signal, 'abort').length, 0);
  }

  static async 'default-scheduler'(scenarioCase: ScenarioCaseOfType<DelayScenarioCaseEntity.Type, 'default-scheduler'>): Promise<void> {
    await Delay.sleep(scenarioCase.input.sleepMs);
    assert.equal(scenarioCase.expected.resolved, true);
  }

  static async 'late-abort'(scenarioCase: ScenarioCaseOfType<DelayScenarioCaseEntity.Type, 'late-abort'>): Promise<void> {
    const counter = DelayRunners.createVirtualTimeCounter(scenarioCase.input);
    const scheduler = new AuditVirtualScheduler(counter);
    const clock = VirtualClockProvider.create(counter);
    const controller = new AbortController();
    const promise = Delay.sleep(scenarioCase.input.sleepMs, { 'clock': clock, 'scheduler': scheduler, 'signal': controller.signal });
    scheduler.advance(scenarioCase.input.sleepMs);
    await promise;
    controller.abort(DelayRunners.createReason(scenarioCase.input));
    assert.strictEqual(scheduler.fireCount, scenarioCase.expected.fireCount);
    assert.strictEqual(scheduler.cancelCount, scenarioCase.expected.cancelCount);
  }

  static async 'pending-abort'(scenarioCase: ScenarioCaseOfType<DelayScenarioCaseEntity.Type, 'pending-abort'>): Promise<void> {
    const counter = DelayRunners.createVirtualTimeCounter(scenarioCase.input);
    const scheduler = new AuditVirtualScheduler(counter);
    const clock = VirtualClockProvider.create(counter);
    const controller = new AbortController();
    const reason = DelayRunners.createReason(scenarioCase.input);
    const promise = Delay.sleep(scenarioCase.input.sleepMs, { 'clock': clock, 'scheduler': scheduler, 'signal': controller.signal });
    controller.abort(reason);
    await assert.rejects(promise, (error: Error) => {
      const result = error === reason;
      return result;
    });
    scheduler.advance(scenarioCase.input.sleepMs);
    assert.strictEqual(scheduler.cancelCount, scenarioCase.expected.cancelCount);
    assert.strictEqual(scheduler.fireCount, scenarioCase.expected.fireCount);
  }

  static async 'pre-aborted'(scenarioCase: ScenarioCaseOfType<DelayScenarioCaseEntity.Type, 'pre-aborted'>): Promise<void> {
    const counter = DelayRunners.createVirtualTimeCounter(scenarioCase.input);
    const scheduler = new AuditVirtualScheduler(counter);
    const clock = VirtualClockProvider.create(counter);
    const controller = new AbortController();
    const reason = DelayRunners.createReason(scenarioCase.input);
    controller.abort(reason);
    await assert.rejects(
      Delay.sleep(scenarioCase.input.sleepMs, { 'clock': clock, 'scheduler': scheduler, 'signal': controller.signal }),
      (error: Error) => {
        const result = error === reason;
        return result;
      }
    );
    assert.strictEqual(scheduler.scheduleCount, scenarioCase.expected.scheduleCount);
  }

  static async 'real-time-abort'(scenarioCase: ScenarioCaseOfType<DelayScenarioCaseEntity.Type, 'real-time-abort'>): Promise<void> {
    const scheduler = new AuditRealTimeScheduler();
    const controller = new AbortController();
    const reason = DelayRunners.createReason(scenarioCase.input);
    const promise = Delay.sleep(scenarioCase.input.sleepMs, { 'scheduler': scheduler, 'signal': controller.signal });
    controller.abort(reason);
    await assert.rejects(promise, (error: Error) => {
      const result = error === reason;
      return result;
    });
    assert.strictEqual(scheduler.cancelCount, scenarioCase.expected.cancelCount);
    assert.strictEqual(reason.message, scenarioCase.expected.reasonMessage);
  }

  static async 'real-time-sleep'(scenarioCase: ScenarioCaseOfType<DelayScenarioCaseEntity.Type, 'real-time-sleep'>): Promise<void> {
    const start = Date.now();
    await Delay.sleep(scenarioCase.input.sleepMs);
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= scenarioCase.expected.elapsedMsAtLeast);
  }

  static async 'schedule-failure'(scenarioCase: ScenarioCaseOfType<DelayScenarioCaseEntity.Type, 'schedule-failure'>): Promise<void> {
    const controller = new AbortController();
    const schedulerError = DelayRunners.createSchedulerError(scenarioCase.input);
    const listenersBefore = getEventListeners(controller.signal, 'abort').length;
    const promise = Delay.sleep(scenarioCase.input.sleepMs, { 'scheduler': new ThrowingScheduler(schedulerError), 'signal': controller.signal });
    assert.strictEqual(getEventListeners(controller.signal, 'abort').length, listenersBefore);
    await assert.rejects(promise, (error: Error) => {
      const result = error === schedulerError;
      return result;
    });
    assert.equal(scenarioCase.expected.errorMessage, schedulerError.message);
    assert.equal(scenarioCase.expected.listenerCountUnchanged, true);
  }

  static async 'virtual-sleep'(scenarioCase: ScenarioCaseOfType<DelayScenarioCaseEntity.Type, 'virtual-sleep'>): Promise<void> {
    const counter = DelayRunners.createVirtualTimeCounter(scenarioCase.input);
    const scheduler = VirtualScheduler.create({ 'counter': counter });
    const clock = VirtualClockProvider.create(counter);
    let resolved = false;
    DelayRunners.traceDelayTest('virtual-sleep before schedule', scenarioCase.input);
    const promise = Delay.sleep(scenarioCase.input.sleepMs, { 'clock': clock, 'scheduler': scheduler }).then(() => { resolved = true; });
    assert.strictEqual(resolved, false);
    DelayRunners.traceDelayTest('virtual-sleep before advance', { 'sleepMs': scenarioCase.input.sleepMs });
    scheduler.advance(scenarioCase.input.sleepMs);
    await promise;
    DelayRunners.traceDelayTest('virtual-sleep after resolve', { 'resolved': resolved, 'sleepMs': scenarioCase.input.sleepMs });
    assert.strictEqual(resolved, scenarioCase.expected.resolved);
    assert.equal(scenarioCase.expected.virtualSleepMs, scenarioCase.input.sleepMs);
  }

  static async 'virtual-zero'(scenarioCase: ScenarioCaseOfType<DelayScenarioCaseEntity.Type, 'virtual-zero'>): Promise<void> {
    const counter = DelayRunners.createVirtualTimeCounter(scenarioCase.input);
    const scheduler = VirtualScheduler.create({ 'counter': counter });
    const clock = VirtualClockProvider.create(counter);
    DelayRunners.traceDelayTest('virtual-zero before schedule', scenarioCase.input);
    const promise = Delay.sleep(scenarioCase.input.sleepMs, { 'clock': clock, 'scheduler': scheduler });
    DelayRunners.traceDelayTest('virtual-zero before advance', { 'sleepMs': scenarioCase.input.sleepMs });
    scheduler.advance(scenarioCase.input.sleepMs);
    await promise;
    DelayRunners.traceDelayTest('virtual-zero after resolve', { 'sleepMs': scenarioCase.input.sleepMs });
    assert.equal(scenarioCase.expected.resolved, true);
    assert.equal(scenarioCase.expected.sleepMs, scenarioCase.input.sleepMs);
  }

  private static traceDelayTest(message: string, payload?: object): void {
    if (TRACE_DELAY_TESTS) {
      const detail = payload === undefined ? '' : ` ${inspect(payload)}`;
      process.stderr.write(`[Delay.loop] ${message}${detail}\n`);
    }
  }

  private static createVirtualTimeCounter(input: { 'scheduler': { 'counter': { 'startMs': number } } }): VirtualTimeCounter {
    const result = VirtualTimeCounter.create({ 'startMs': input.scheduler.counter.startMs });
    return result;
  }

  private static createReason(input: { 'reasonMessage': string }): RuntimeError {
    const result = RuntimeError.create(input.reasonMessage);
    return result;
  }

  private static createSchedulerError(input: { 'schedulerErrorMessage': string }): RuntimeError {
    const result = RuntimeError.create(input.schedulerErrorMessage);
    return result;
  }
}

ScenarioSuite.register({
  'entity': DelayScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Delay',
  'runners': DelayRunners
});
