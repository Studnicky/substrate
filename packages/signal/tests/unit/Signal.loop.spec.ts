import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { HookInvocationError, HookInvoker, RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { describe, it } from 'node:test';
import timersPromises from 'node:timers/promises';

import type { DeadlineTimerHandleInterface } from '../../src/interfaces/DeadlineTimerHandleInterface.js';
import type { DeadlineTimerInterface } from '../../src/interfaces/DeadlineTimerInterface.js';
import type { SignalComposeOptionsInterface } from '../../src/interfaces/SignalComposeOptionsInterface.js';

import { Signal, SignalError, SignalTimeoutError } from '../../src/index.js';
import { RaceTimeout } from '../../src/RaceTimeout.js';
import { SignalScenarioCaseEntity } from './entities/SignalScenarioCaseEntity.js';
import scenarioGroups from './Signal.scenarios.json' with { 'type': 'json' };

/** Abort reason carried by every controller the tests abort. */
class SignalTestAbortError extends BaseError {
  public override readonly name: string = 'SignalTestAbortError';

  public constructor(message: string) {
    super({
      'code': 'signal.testAbort',
      'message': message,
      'retryable': false
    });
  }
}

/** One scheduled callback of a `VirtualDeadlineTimer`. */
class VirtualTimerTask implements DeadlineTimerHandleInterface {
  public active = true;
  public readonly atMs: number;
  public readonly fire: () => void;

  public constructor(atMs: number, fire: () => void) {
    this.atMs = atMs;
    this.fire = fire;
  }

  public cancel(): void {
    this.active = false;
  }
}

/**
 * `DeadlineTimerInterface` driven by `advance(ms)`, so deadlines fire deterministically
 * instead of racing real timers.
 */
class VirtualDeadlineTimer implements DeadlineTimerInterface {
  #currentMs = 0;
  readonly #tasks: VirtualTimerTask[] = [];

  public advance(elapsedMs: number): void {
    const targetMs = this.#currentMs + elapsedMs;
    let next = this.#nextDue(targetMs);
    while (next !== undefined) {
      next.active = false;
      this.#currentMs = Math.max(this.#currentMs, next.atMs);
      next.fire();
      next = this.#nextDue(targetMs);
    }
    this.#currentMs = targetMs;
  }

  public now(): number {
    const currentMs = this.#currentMs;
    return currentMs;
  }

  public pendingCount(): number {
    let pending = 0;
    for (let index = 0; index < this.#tasks.length; index += 1) {
      if (this.#tasks[index]?.active === true) {
        pending += 1;
      }
    }
    return pending;
  }

  public scheduleAt(atMs: number, fire: () => void): DeadlineTimerHandleInterface {
    const task = new VirtualTimerTask(atMs, fire);
    this.#tasks.push(task);
    return task;
  }

  #nextDue(targetMs: number): VirtualTimerTask | undefined {
    let next: VirtualTimerTask | undefined;
    for (let index = 0; index < this.#tasks.length; index += 1) {
      const task = this.#tasks[index];
      if (task?.active === true && task.atMs <= targetMs && (next === undefined || task.atMs < next.atMs)) {
        next = task;
      }
    }
    return next;
  }
}

/** The two controllers a scenario's `signalId` selects between. */
class ComposeRuntime {
  public readonly abortController = new AbortController();
  public readonly providedController = new AbortController();

  public controllerFor(signalId: 'abort-controller' | 'provided'): AbortController {
    const controller = signalId === 'provided' ? this.providedController : this.abortController;
    return controller;
  }
}

/** Mutable builder shape for `SignalComposeOptionsInterface`. */
interface MutableComposeOptionsInterface {
  'deadlineMs'?: number;
  'signal'?: AbortSignal;
}

interface ComposeCallInterface {
  readonly 'options': SignalComposeOptionsInterface;
  readonly 'result': AbortSignal;
}

class ComposeOptionsFactory {
  public static materialize(input: { readonly 'deadlineMs'?: number; readonly 'signalId'?: 'abort-controller' | 'provided' }, runtime: ComposeRuntime = new ComposeRuntime()): SignalComposeOptionsInterface {
    const options: MutableComposeOptionsInterface = {};

    if (input.deadlineMs !== undefined) {
      options.deadlineMs = input.deadlineMs;
    }

    if (input.signalId !== undefined) {
      options.signal = runtime.controllerFor(input.signalId).signal;
    }

    return options;
  }
}

class RecordingSignal extends Signal {
  static override create(): RecordingSignal {
    const recording = new RecordingSignal();
    return recording;
  }
  public calls: ComposeCallInterface[] = [];

  protected override onCompose(options: SignalComposeOptionsInterface, result: AbortSignal): void {
    this.calls.push({ 'options': options, 'result': result });
  }
}

class SignalRunners {
  static async 'async-on-compose-rejection-surfaces'(scenarioCase: ScenarioCaseOfType<SignalScenarioCaseEntity.Type, 'async-on-compose-rejection-surfaces'>): Promise<void> {
    const originalError = RuntimeError.create(scenarioCase.input.message);

    class AsyncThrowingSignal extends Signal {
      static override create(): AsyncThrowingSignal {
        const instance = new AsyncThrowingSignal();
        return instance;
      }
      protected override async onCompose(): Promise<void> {
        await timersPromises.setTimeout(1);
        throw originalError;
      }
    }

    await assert.rejects(
      AsyncThrowingSignal.create().compose(ComposeOptionsFactory.materialize(scenarioCase.input.composeOptions)),
      (caught): boolean => {
        const thrown: unknown = caught;
        assert.ok(thrown instanceof HookInvocationError);
        SignalRunners.assertHookFailure(thrown, scenarioCase.expected.hookName, originalError, scenarioCase.expected.causeMessage);
        return true;
      }
    );
  }

  static async 'compose-deadline-fires'(scenarioCase: ScenarioCaseOfType<SignalScenarioCaseEntity.Type, 'compose-deadline-fires'>): Promise<void> {
    const timer = new VirtualDeadlineTimer();
    const options = { ...ComposeOptionsFactory.materialize(scenarioCase.input.composeOptions), 'timer': timer };
    using composed = await Signal.create().compose(options);
    const composedSignal = composed.signal;
    assert.ok(composedSignal instanceof AbortSignal);
    assert.equal(composedSignal.aborted, scenarioCase.expected.initialAborted);
    timer.advance(scenarioCase.input.waitMs);
    assert.equal(composedSignal.aborted, scenarioCase.expected.abortedAfterWait);
    if (scenarioCase.expected.abortedAfterWait) {
      const reason: unknown = composedSignal.reason;
      assert.ok(reason instanceof SignalTimeoutError);
      assert.equal(reason.code, 'signal.timeout');
      assert.equal(reason.deadlineMs, scenarioCase.input.composeOptions.deadlineMs);
    }
  }

  static async 'compose-empty-options'(scenarioCase: ScenarioCaseOfType<SignalScenarioCaseEntity.Type, 'compose-empty-options'>): Promise<void> {
    using composed = await Signal.create().compose(ComposeOptionsFactory.materialize(scenarioCase.input.composeOptions));
    const composedSignal = composed.signal;
    assert.ok(composedSignal instanceof AbortSignal);
    assert.equal(composedSignal.aborted, scenarioCase.expected.aborted);
  }

  static async 'compose-invalid-deadline'(scenarioCase: ScenarioCaseOfType<SignalScenarioCaseEntity.Type, 'compose-invalid-deadline'>): Promise<void> {
    await assert.rejects(
      Signal.create().compose(ComposeOptionsFactory.materialize(scenarioCase.input.composeOptions)),
      (caught): boolean => {
        const thrown: unknown = caught;
        assert.ok(thrown instanceof SignalError);
        assert.ok(thrown.message.includes(scenarioCase.expected.errorMessageIncludes));
        return true;
      }
    );
  }

  static async 'compose-provided-signal'(scenarioCase: ScenarioCaseOfType<SignalScenarioCaseEntity.Type, 'compose-provided-signal'>): Promise<void> {
    const runtime = new ComposeRuntime();
    using composed = await Signal.create().compose(ComposeOptionsFactory.materialize(scenarioCase.input.composeOptions, runtime));
    const composedSignal = composed.signal;
    const expectedSignal = runtime.controllerFor(scenarioCase.input.composeOptions.signalId).signal;
    assert.ok(composedSignal === expectedSignal);
    assert.equal(composedSignal === expectedSignal, scenarioCase.expected.sameSignal);
  }

  static async 'compose-signal-deadline-abort'(scenarioCase: ScenarioCaseOfType<SignalScenarioCaseEntity.Type, 'compose-signal-deadline-abort'>): Promise<void> {
    const runtime = new ComposeRuntime();
    using composed = await Signal.create().compose(ComposeOptionsFactory.materialize(scenarioCase.input.composeOptions, runtime));
    const composedSignal = composed.signal;
    assert.ok(composedSignal instanceof AbortSignal);
    assert.equal(composedSignal.aborted, scenarioCase.expected.initialAborted);
    runtime.controllerFor(scenarioCase.input.composeOptions.signalId).abort(new SignalTestAbortError('scenario abort'));
    assert.equal(composedSignal.aborted, scenarioCase.expected.abortedAfterAbort);
  }

  static async 'instance-empty-options'(scenarioCase: ScenarioCaseOfType<SignalScenarioCaseEntity.Type, 'instance-empty-options'>): Promise<void> {
    const instance = Signal.create();
    using composed = await instance.compose(ComposeOptionsFactory.materialize(scenarioCase.input.composeOptions));
    const composedSignal = composed.signal;
    assert.ok(composedSignal instanceof AbortSignal);
    assert.equal(composedSignal.aborted, scenarioCase.expected.aborted);
  }

  static async 'instance-provided-signal'(scenarioCase: ScenarioCaseOfType<SignalScenarioCaseEntity.Type, 'instance-provided-signal'>): Promise<void> {
    const instance = Signal.create();
    const runtime = new ComposeRuntime();
    using composed = await instance.compose(ComposeOptionsFactory.materialize(scenarioCase.input.composeOptions, runtime));
    const composedSignal = composed.signal;
    const expectedSignal = runtime.controllerFor(scenarioCase.input.composeOptions.signalId).signal;
    assert.ok(composedSignal === expectedSignal);
    assert.equal(composedSignal === expectedSignal, scenarioCase.expected.sameSignal);
  }

  static 'never-aborts'(scenarioCase: ScenarioCaseOfType<SignalScenarioCaseEntity.Type, 'never-aborts'>): void {
    const neverSignal = Signal.never();
    assert.ok(neverSignal instanceof AbortSignal);
    assert.equal(neverSignal.aborted, scenarioCase.expected.aborted);
  }

  static 'never-distinct-instances'(scenarioCase: ScenarioCaseOfType<SignalScenarioCaseEntity.Type, 'never-distinct-instances'>): void {
    const first = Signal.never();
    const second = Signal.never();
    assert.equal(first !== second, scenarioCase.expected.distinctInstances);
    assert.equal(first.aborted, scenarioCase.expected.firstAborted);
    assert.equal(second.aborted, scenarioCase.expected.secondAborted);
  }

  static async 'on-compose-deadline-only'(scenarioCase: ScenarioCaseOfType<SignalScenarioCaseEntity.Type, 'on-compose-deadline-only'>): Promise<void> {
    await SignalRunners.runOnComposeRecording(scenarioCase);
  }

  static async 'on-compose-empty-options'(scenarioCase: ScenarioCaseOfType<SignalScenarioCaseEntity.Type, 'on-compose-empty-options'>): Promise<void> {
    await SignalRunners.runOnComposeRecording(scenarioCase);
  }

  static async 'on-compose-signal-only'(scenarioCase: ScenarioCaseOfType<SignalScenarioCaseEntity.Type, 'on-compose-signal-only'>): Promise<void> {
    await SignalRunners.runOnComposeRecording(scenarioCase);
  }

  static async 'race-timeout-already-aborted'(scenarioCase: ScenarioCaseOfType<SignalScenarioCaseEntity.Type, 'race-timeout-already-aborted'>): Promise<void> {
    const controller = new AbortController();
    controller.abort(new SignalTestAbortError('aborted before waiting'));
    const outcome = await RaceTimeout.wait(20, controller.signal);
    assert.equal(outcome, scenarioCase.expected.outcome);
  }

  static async 'race-timeout-no-signal'(scenarioCase: ScenarioCaseOfType<SignalScenarioCaseEntity.Type, 'race-timeout-no-signal'>): Promise<void> {
    const timer = new VirtualDeadlineTimer();
    const raceTimeout = RaceTimeout.create({ 'timer': timer });
    const pending = raceTimeout.wait(scenarioCase.input.waitMs, undefined);
    timer.advance(scenarioCase.input.waitMs);
    const outcome = await pending;
    assert.equal(outcome, scenarioCase.expected.outcome);
  }

  static async 'race-timeout-removes-listener'(scenarioCase: ScenarioCaseOfType<SignalScenarioCaseEntity.Type, 'race-timeout-removes-listener'>): Promise<void> {
    const timer = new VirtualDeadlineTimer();
    const raceTimeout = RaceTimeout.create({ 'timer': timer });
    const controller = new AbortController();
    const pending = raceTimeout.wait(scenarioCase.input.waitMs, controller.signal);
    assert.equal(getEventListeners(controller.signal, 'abort').length, scenarioCase.expected.abortListenerCountBefore);
    timer.advance(scenarioCase.input.waitMs);
    const outcome = await pending;
    assert.equal(outcome, scenarioCase.expected.outcome);
    assert.equal(getEventListeners(controller.signal, 'abort').length, scenarioCase.expected.abortListenerCountAfter);
  }

  static async 'race-timeout-removes-listener-on-abort'(scenarioCase: ScenarioCaseOfType<SignalScenarioCaseEntity.Type, 'race-timeout-removes-listener-on-abort'>): Promise<void> {
    const timer = new VirtualDeadlineTimer();
    const raceTimeout = RaceTimeout.create({ 'timer': timer });
    const controller = new AbortController();
    const pending = raceTimeout.wait(scenarioCase.input.waitMs, controller.signal);
    assert.equal(getEventListeners(controller.signal, 'abort').length, scenarioCase.expected.abortListenerCountBefore);
    controller.abort(new SignalTestAbortError('aborted while waiting'));
    const outcome = await pending;
    assert.equal(outcome, scenarioCase.expected.outcome);
    assert.equal(getEventListeners(controller.signal, 'abort').length, scenarioCase.expected.abortListenerCountAfter);
  }

  static 'signal-error-construction'(scenarioCase: ScenarioCaseOfType<SignalScenarioCaseEntity.Type, 'signal-error-construction'>): void {
    const error = new SignalError(scenarioCase.input.message, RuntimeError.create('cause'));
    assert.equal(error.code, scenarioCase.expected.code);
  }

  static async 'swallowing-hook-invoker'(scenarioCase: ScenarioCaseOfType<SignalScenarioCaseEntity.Type, 'swallowing-hook-invoker'>): Promise<void> {
    class SwallowingHookInvoker extends HookInvoker {
      protected override onHookError(_hookName: string): void {}
    }

    class SwallowingSignal extends Signal {
      constructor() {
        super(new SwallowingHookInvoker());
      }

      protected override onCompose(): void {
        throw RuntimeError.create(scenarioCase.input.message);
      }
    }

    const instance = new SwallowingSignal();
    using composed = await instance.compose(ComposeOptionsFactory.materialize(scenarioCase.input.composeOptions));
    const composedSignal = composed.signal;
    assert.ok(composedSignal instanceof AbortSignal);
    assert.equal(composedSignal.aborted, scenarioCase.expected.aborted);
  }

  static async 'throwing-on-compose-surfaces'(scenarioCase: ScenarioCaseOfType<SignalScenarioCaseEntity.Type, 'throwing-on-compose-surfaces'>): Promise<void> {
    const originalError = RuntimeError.create(scenarioCase.input.message);

    class ThrowingSignal extends Signal {
      static build(): ThrowingSignal {
        const instance = new ThrowingSignal();
        return instance;
      }

      protected override onCompose(): void {
        throw originalError;
      }
    }

    await assert.rejects(
      ThrowingSignal.build().compose(ComposeOptionsFactory.materialize(scenarioCase.input.composeOptions)),
      (caught): boolean => {
        const thrown: unknown = caught;
        assert.ok(thrown instanceof HookInvocationError);
        SignalRunners.assertHookFailure(thrown, scenarioCase.expected.hookName, originalError, scenarioCase.expected.causeMessage);
        return true;
      }
    );
  }

  static declaresComposedResource(): void {
    void describe('Signal composed resource', () => {
      void it('dispose cancels the deadline timer', async () => {
        const timer = new VirtualDeadlineTimer();
        const composed = await Signal.create().compose({ 'deadlineMs': 100, 'timer': timer });
        assert.equal(timer.pendingCount(), 1);
        composed.dispose();
        assert.equal(timer.pendingCount(), 0);
      });

      void it('dispose is idempotent', async () => {
        const timer = new VirtualDeadlineTimer();
        const composed = await Signal.create().compose({ 'deadlineMs': 100, 'timer': timer });
        composed.dispose();
        composed.dispose();
        assert.equal(timer.pendingCount(), 0);
      });

      void it('abort automatically disposes the deadline timer', async () => {
        const timer = new VirtualDeadlineTimer();
        const controller = new AbortController();
        const composed = await Signal.create().compose({ 'deadlineMs': 100, 'signal': controller.signal, 'timer': timer });
        assert.equal(timer.pendingCount(), 1);
        controller.abort(new SignalTestAbortError('aborted by test'));
        composed.dispose();
        assert.equal(timer.pendingCount(), 0);
      });

      void it('hook failure disposes the deadline timer', async () => {
        const timer = new VirtualDeadlineTimer();
        class FailingSignal extends Signal {
          static override create(): FailingSignal {
            const instance = new FailingSignal();
            return instance;
          }
          protected override onCompose(): void {
            throw RuntimeError.create('compose hook failed');
          }
        }
        await assert.rejects(FailingSignal.create().compose({ 'deadlineMs': 100, 'timer': timer }));
        assert.equal(timer.pendingCount(), 0);
      });
    });
  }

  static declaresDeadlineBoundaries(): void {
    void describe('Signal deadline boundaries', () => {
      const invalidDeadlines = [Number.POSITIVE_INFINITY, 2_147_483_648, 0.5] as const;

      for (let index = 0; index < invalidDeadlines.length; index += 1) {
        const deadlineMs = invalidDeadlines[index];
        if (typeof deadlineMs === 'number') {
          void it(`rejects deadline ${deadlineMs} before creating a platform timeout`, async () => {
            await assert.rejects(
              Signal.create().compose({ 'deadlineMs': deadlineMs }),
              SignalError
            );
          });
        }
      }
    });
  }

  private static assertHookFailure(thrown: HookInvocationError, hookName: string, originalError: RuntimeError, causeMessage: string): void {
    assert.equal(thrown.hookName, hookName);
    assert.equal(thrown.cause, originalError);
    assert.equal(originalError.message, causeMessage);
  }

  private static async runOnComposeRecording(
    scenarioCase: ScenarioCaseOfType<SignalScenarioCaseEntity.Type, 'on-compose-deadline-only' | 'on-compose-empty-options' | 'on-compose-signal-only'>
  ): Promise<void> {
    const recording = RecordingSignal.create();
    const options = ComposeOptionsFactory.materialize(scenarioCase.input.composeOptions);
    using result = await recording.compose(options);
    assert.equal(recording.calls.length, scenarioCase.expected.callCount);
    assert.ok(recording.calls[0]?.options === options);
    assert.ok(recording.calls[0]?.result === result.signal);
    assert.ok(recording.calls[0]?.result instanceof AbortSignal);
    assert.equal(result.signal.aborted, false);
    assert.equal(result.signal === recording.calls[0]?.result, scenarioCase.expected.resultMatches);
  }
}

ScenarioSuite.register({
  'entity': SignalScenarioCaseEntity,
  'extraTests': SignalRunners.declaresComposedResource,
  'file': scenarioGroups,
  'name': 'Signal',
  'runners': SignalRunners
});

SignalRunners.declaresDeadlineBoundaries();
