import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import { VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock/node';
import { RuntimeError, HookInvocationError, HookInvoker } from '@studnicky/errors/node';
import { VirtualScheduler } from '@studnicky/scheduler/node';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { describe, it } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';



import type { DeadlineTimerInterface } from '../../src/interfaces/DeadlineTimerInterface.js';

import { RaceTimeout } from '../../src/RaceTimeout.js';
import { Signal, SignalError } from '../../src/index.js';
import { SignalScenarioCaseEntity } from './entities/SignalScenarioCaseEntity.js';
import scenarioGroups from './Signal.scenarios.json' with { type: 'json' };

const fileIntake = ScenarioFileCompiler.compileIntake(SignalScenarioCaseEntity.Schema, SignalScenarioCaseEntity.Node);

/**
 * `DeadlineTimerInterface` backed by a `VirtualScheduler` + paired `VirtualClockProvider`
 * sharing one `VirtualTimeCounter`. `scheduler.advance(ms)` drives it deterministically
 * instead of racing real timers.
 */
function createVirtualTimers(): { scheduler: VirtualScheduler; timer: DeadlineTimerInterface; scheduledCount: () => number } {
  const counter = VirtualTimeCounter.create({ 'startMs': 0 });
  const clock = VirtualClockProvider.create(counter);
  const scheduler = VirtualScheduler.create({ 'counter': counter });
  let scheduledCount = 0;
  const timer: DeadlineTimerInterface = {
    'now': () => clock.now(),
    'scheduleAt': (atMs, fire) => {
      scheduledCount += 1;
      const handle = scheduler.scheduleAt(atMs, () => {
        scheduledCount -= 1;
        fire();
      });
      return {
        'cancel': (): void => {
          if (scheduledCount > 0) {
            scheduledCount -= 1;
          }
          handle.cancel();
        }
      };
    }
  };
  return { scheduler, timer, 'scheduledCount': () => scheduledCount };
}

type ComposeOptions = { deadlineMs?: number; signal?: AbortSignal };
type ComposeSignalId = 'abort-controller' | 'provided';
type SerializableComposeOptions = { deadlineMs?: number; signalId?: ComposeSignalId };
type ComposeRuntime = { controllers: Record<ComposeSignalId, AbortController> };

type ScenarioCase = SignalScenarioCaseEntity.Type;

class RecordingSignal extends Signal {
  static override create(): RecordingSignal {
    return new RecordingSignal();
  }
  public calls: Array<{ options: ComposeOptions; result: AbortSignal }> = [];

  protected override onCompose(options: ComposeOptions, result: AbortSignal): void {
    this.calls.push({ options, result });
  }
}

function createComposeRuntime(): ComposeRuntime {
  return {
    controllers: {
      'abort-controller': new AbortController(),
      provided: new AbortController()
    }
  };
}

const composeSignalMap: Record<ComposeSignalId, (runtime: ComposeRuntime) => AbortSignal> = {
  'abort-controller': (runtime) => runtime.controllers['abort-controller'].signal,
  provided: (runtime) => runtime.controllers.provided.signal
};

function materializeComposeOptions(input: SerializableComposeOptions, runtime?: ComposeRuntime): ComposeOptions {
  const options: ComposeOptions = {};

  if (input.deadlineMs !== undefined) {
    options.deadlineMs = input.deadlineMs;
  }

  if (input.signalId !== undefined) {
    options.signal = composeSignalMap[input.signalId](runtime ?? createComposeRuntime());
  }

  return options;
}

async function runOnComposeRecording(
  input: { composeOptions: SerializableComposeOptions },
  expected: { callCount: 1; resultMatches: true }
): Promise<void> {
  const s = RecordingSignal.create();
  const options = materializeComposeOptions(input.composeOptions);
  using result = await s.compose(options);
  assert.equal(s.calls.length, expected.callCount);
  assert.equal(s.calls[0]?.options, options);
  assert.equal(s.calls[0]?.result, result.signal);
  assert.ok(s.calls[0]?.result instanceof AbortSignal);
  assert.equal(result.signal.aborted, false);
  assert.equal(result.signal === s.calls[0]?.result, expected.resultMatches);
}

type ScenarioRunner<K extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => Promise<void>;
type RunnerMap = {
  [K in ScenarioCase['shape']]: ScenarioRunner<K>;
};

const runnerMap: RunnerMap = {
  'never-aborts': async (scenarioCase) => {
    const sig = Signal.never();
    assert.ok(sig instanceof AbortSignal);
    assert.equal(sig.aborted, scenarioCase.expected.aborted);
  },

  'never-distinct-instances': async (scenarioCase) => {
    const first = Signal.never();
    const second = Signal.never();
    assert.equal(first !== second, scenarioCase.expected.distinctInstances);
    assert.equal(first.aborted, scenarioCase.expected.firstAborted);
    assert.equal(second.aborted, scenarioCase.expected.secondAborted);
  },

  'compose-empty-options': async (scenarioCase) => {
    using composed = await Signal.create().compose(materializeComposeOptions(scenarioCase.input.composeOptions));
    const sig = composed.signal;
    assert.ok(sig instanceof AbortSignal);
    assert.equal(sig.aborted, scenarioCase.expected.aborted);
  },

  'compose-provided-signal': async (scenarioCase) => {
    const runtime = createComposeRuntime();
    using composed = await Signal.create().compose(materializeComposeOptions(scenarioCase.input.composeOptions, runtime));
    const sig = composed.signal;
    const expectedSignal = composeSignalMap[scenarioCase.input.composeOptions.signalId](runtime);
    assert.equal(sig, expectedSignal);
    assert.equal(sig === expectedSignal, scenarioCase.expected.sameSignal);
  },

  'compose-signal-deadline-abort': async (scenarioCase) => {
    const runtime = createComposeRuntime();
    using composed = await Signal.create().compose(materializeComposeOptions(scenarioCase.input.composeOptions, runtime));
    const sig = composed.signal;
    assert.ok(sig instanceof AbortSignal);
    assert.equal(sig.aborted, scenarioCase.expected.initialAborted);
    runtime.controllers[scenarioCase.input.composeOptions.signalId].abort();
    assert.equal(sig.aborted, scenarioCase.expected.abortedAfterAbort);
  },

  'compose-deadline-fires': async (scenarioCase) => {
    const { scheduler, timer } = createVirtualTimers();
    const options = { ...materializeComposeOptions(scenarioCase.input.composeOptions), timer };
    using composed = await Signal.create().compose(options);
    const sig = composed.signal;
    assert.ok(sig instanceof AbortSignal);
    assert.equal(sig.aborted, scenarioCase.expected.initialAborted);
    scheduler.advance(scenarioCase.input.waitMs);
    assert.equal(sig.aborted, scenarioCase.expected.abortedAfterWait);
  },

  'compose-invalid-deadline': async (scenarioCase) => {
    await assert.rejects(
      Signal.create().compose(materializeComposeOptions(scenarioCase.input.composeOptions)),
      (err) => {
        assert.ok(err instanceof SignalError);
        assert.ok(err.message.includes(scenarioCase.expected.errorMessageIncludes));
        return true;
      }
    );
  },

  'instance-empty-options': async (scenarioCase) => {
    const s = Signal.create();
    using composed = await s.compose(materializeComposeOptions(scenarioCase.input.composeOptions));
    const sig = composed.signal;
    assert.ok(sig instanceof AbortSignal);
    assert.equal(sig.aborted, scenarioCase.expected.aborted);
  },

  'instance-provided-signal': async (scenarioCase) => {
    const s = Signal.create();
    const runtime = createComposeRuntime();
    using composed = await s.compose(materializeComposeOptions(scenarioCase.input.composeOptions, runtime));
    const sig = composed.signal;
    const expectedSignal = composeSignalMap[scenarioCase.input.composeOptions.signalId](runtime);
    assert.equal(sig, expectedSignal);
    assert.equal(sig === expectedSignal, scenarioCase.expected.sameSignal);
  },

  'on-compose-signal-only': async (scenarioCase) => {
    await runOnComposeRecording(scenarioCase.input, scenarioCase.expected);
  },

  'on-compose-deadline-only': async (scenarioCase) => {
    await runOnComposeRecording(scenarioCase.input, scenarioCase.expected);
  },

  'on-compose-empty-options': async (scenarioCase) => {
    await runOnComposeRecording(scenarioCase.input, scenarioCase.expected);
  },

  'throwing-on-compose-surfaces': async (scenarioCase) => {
    const originalError = RuntimeError.create(scenarioCase.input.message);

    class ThrowingSignal extends Signal {
      static build(): ThrowingSignal {
        return new ThrowingSignal();
      }

      protected override onCompose(): void {
        throw originalError;
      }
    }

    await assert.rejects(
      ThrowingSignal.build().compose(materializeComposeOptions(scenarioCase.input.composeOptions)),
      (err) => {
        assert.ok(err instanceof HookInvocationError);
        assert.equal(err.hookName, scenarioCase.expected.hookName);
        assert.equal(err.cause, originalError);
        assert.equal(originalError.message, scenarioCase.expected.causeMessage);
        return true;
      }
    );
  },

  'async-on-compose-rejection-surfaces': async (scenarioCase) => {
    const originalError = RuntimeError.create(scenarioCase.input.message);

    class AsyncThrowingSignal extends Signal {
      static override create(): AsyncThrowingSignal {
        return new AsyncThrowingSignal();
      }
      protected override async onCompose(): Promise<void> {
        await delay(1);
        throw originalError;
      }
    }

    await assert.rejects(
      AsyncThrowingSignal.create().compose(materializeComposeOptions(scenarioCase.input.composeOptions)),
      (err) => {
        assert.ok(err instanceof HookInvocationError);
        assert.equal(err.hookName, scenarioCase.expected.hookName);
        assert.equal(err.cause, originalError);
        assert.equal(originalError.message, scenarioCase.expected.causeMessage);
        return true;
      }
    );
  },

  'swallowing-hook-invoker': async (scenarioCase) => {
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

    const s = new SwallowingSignal();
    using composed = await s.compose(materializeComposeOptions(scenarioCase.input.composeOptions));
    const sig = composed.signal;
    assert.ok(sig instanceof AbortSignal);
    assert.equal(sig.aborted, scenarioCase.expected.aborted);
  },

  'race-timeout-no-signal': async (scenarioCase) => {
    const { scheduler, timer } = createVirtualTimers();
    const raceTimeout = RaceTimeout.create({ timer });
    const pending = raceTimeout.wait(scenarioCase.input.waitMs, undefined);
    scheduler.advance(scenarioCase.input.waitMs);
    const outcome = await pending;
    assert.equal(outcome, scenarioCase.expected.outcome);
  },

  'race-timeout-removes-listener': async (scenarioCase) => {
    const { scheduler, timer } = createVirtualTimers();
    const raceTimeout = RaceTimeout.create({ timer });
    const controller = new AbortController();
    const pending = raceTimeout.wait(scenarioCase.input.waitMs, controller.signal);
    assert.equal(getEventListeners(controller.signal, 'abort').length, scenarioCase.expected.abortListenerCountBefore);
    scheduler.advance(scenarioCase.input.waitMs);
    const outcome = await pending;
    assert.equal(outcome, scenarioCase.expected.outcome);
    assert.equal(getEventListeners(controller.signal, 'abort').length, scenarioCase.expected.abortListenerCountAfter);
  },

  'race-timeout-removes-listener-on-abort': async (scenarioCase) => {
    const { timer } = createVirtualTimers();
    const raceTimeout = RaceTimeout.create({ timer });
    const controller = new AbortController();
    const pending = raceTimeout.wait(scenarioCase.input.waitMs, controller.signal);
    assert.equal(getEventListeners(controller.signal, 'abort').length, scenarioCase.expected.abortListenerCountBefore);
    controller.abort();
    const outcome = await pending;
    assert.equal(outcome, scenarioCase.expected.outcome);
    assert.equal(getEventListeners(controller.signal, 'abort').length, scenarioCase.expected.abortListenerCountAfter);
  },

  'race-timeout-already-aborted': async (scenarioCase) => {
    const controller = new AbortController();
    controller.abort();
    const outcome = await RaceTimeout.wait(20, controller.signal);
    assert.equal(outcome, scenarioCase.expected.outcome);
  },

  'signal-error-construction': async (scenarioCase) => {
    const error = new SignalError(scenarioCase.input.message, RuntimeError.create('cause'));
    assert.equal(error.code, scenarioCase.expected.code);
  }
};

async function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Signal', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});


void describe('Signal composed resource', () => {
  void it('dispose cancels the deadline timer', async () => {
    const { timer, scheduledCount } = createVirtualTimers();
    const composed = await Signal.create().compose({ 'deadlineMs': 100, timer });
    assert.equal(scheduledCount(), 1);
    composed.dispose();
    assert.equal(scheduledCount(), 0);
  });

  void it('dispose is idempotent', async () => {
    const { timer, scheduledCount } = createVirtualTimers();
    const composed = await Signal.create().compose({ 'deadlineMs': 100, timer });
    composed.dispose();
    composed.dispose();
    assert.equal(scheduledCount(), 0);
  });

  void it('abort automatically disposes the deadline timer', async () => {
    const { timer, scheduledCount } = createVirtualTimers();
    const controller = new AbortController();
    const composed = await Signal.create().compose({ 'deadlineMs': 100, 'signal': controller.signal, timer });
    assert.equal(scheduledCount(), 1);
    controller.abort();
    composed.dispose();
    assert.equal(scheduledCount(), 0);
  });

  void it('hook failure disposes the deadline timer', async () => {
    const { timer, scheduledCount } = createVirtualTimers();
    class FailingSignal extends Signal {
      static override create(): FailingSignal {
        return new FailingSignal();
      }
      protected override onCompose(): void {
        throw RuntimeError.create('compose hook failed');
      }
    }
    await assert.rejects(FailingSignal.create().compose({ 'deadlineMs': 100, timer }));
    assert.equal(scheduledCount(), 0);
  });
});

void describe('Signal deadline boundaries', () => {
  const invalidDeadlines = [Number.POSITIVE_INFINITY, 2_147_483_648, 0.5] as const;

  for (const deadlineMs of invalidDeadlines) {
    void it(`rejects deadline ${deadlineMs} before creating a platform timeout`, async () => {
      await assert.rejects(
        Signal.create().compose({ deadlineMs }),
        SignalError
      );
    });
  }
});
