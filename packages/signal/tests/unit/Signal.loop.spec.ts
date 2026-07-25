import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { describe, it } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { HookInvocationError, HookInvoker } from '@studnicky/errors';

import { RaceTimeout } from '../../src/RaceTimeout.js';
import { Signal, SignalError } from '../../src/index.js';
import scenarioGroups from './Signal.scenarios.json';

type ComposeOptions = { deadlineMs?: number; signal?: AbortSignal };
type ComposeSignalId = 'abort-controller' | 'provided';
type SerializableComposeOptions = { deadlineMs?: number; signalId?: ComposeSignalId };
type ComposeRuntime = { controllers: Record<ComposeSignalId, AbortController> };

type ScenarioCase =
  | {
      description: string;
      expected: { aborted: false };
      input: Record<string, never>;
      kind: 'never-aborts';
      name: string;
    }
  | {
      description: string;
      expected: { sameInstance: true };
      input: Record<string, never>;
      kind: 'never-same-instance';
      name: string;
    }
  | {
      description: string;
      expected: { aborted: false };
      input: { aborted: false; composeOptions: SerializableComposeOptions };
      kind: 'compose-empty-options';
      name: string;
    }
  | {
      description: string;
      expected: { sameSignal: true };
      input: { composeOptions: { signalId: 'provided' } };
      kind: 'compose-provided-signal';
      name: string;
    }
  | {
      description: string;
      expected: { abortedAfterAbort: true; initialAborted: false };
      input: { composeOptions: { deadlineMs: number; signalId: 'abort-controller' } };
      kind: 'compose-signal-deadline-abort';
      name: string;
    }
  | {
      description: string;
      expected: { abortedAfterWait: true; initialAborted: false };
      input: { composeOptions: { deadlineMs: number }; waitMs: number };
      kind: 'compose-deadline-fires';
      name: string;
    }
  | {
      description: string;
      expected: { errorMessageIncludes: string };
      input: { composeOptions: { deadlineMs: number } };
      kind: 'compose-invalid-deadline';
      name: string;
    }
  | {
      description: string;
      expected: { sameAsNever: true };
      input: { composeOptions: SerializableComposeOptions; sameAsNever: true };
      kind: 'instance-empty-options';
      name: string;
    }
  | {
      description: string;
      expected: { sameSignal: true };
      input: { composeOptions: { signalId: 'provided' } };
      kind: 'instance-provided-signal';
      name: string;
    }
  | {
      description: string;
      expected: { callCount: 1; resultMatches: true };
      input: { composeOptions: SerializableComposeOptions };
      kind: 'on-compose-signal-only' | 'on-compose-deadline-only' | 'on-compose-empty-options';
      name: string;
    }
  | {
      description: string;
      expected: { causeMessage: string; hookName: 'onCompose' };
      input: { composeOptions: SerializableComposeOptions; message: string };
      kind: 'throwing-on-compose-surfaces';
      name: string;
    }
  | {
      description: string;
      expected: { causeMessage: string; hookName: 'onCompose' };
      input: { composeOptions: SerializableComposeOptions; message: string };
      kind: 'async-on-compose-rejection-surfaces';
      name: string;
    }
  | {
      description: string;
      expected: { aborted: false };
      input: { composeOptions: SerializableComposeOptions; message: string };
      kind: 'swallowing-hook-invoker';
      name: string;
    }
  | {
      description: string;
      expected: { outcome: 'timeout' };
      input: { waitMs: number };
      kind: 'race-timeout-no-signal';
      name: string;
    }
  | {
      description: string;
      expected: { abortListenerCountAfter: 0; abortListenerCountBefore: 1; outcome: 'timeout' };
      input: { waitMs: number };
      kind: 'race-timeout-removes-listener';
      name: string;
    }
  | {
      description: string;
      expected: { outcome: 'aborted' };
      input: Record<string, never>;
      kind: 'race-timeout-already-aborted';
      name: string;
    }
  | {
      description: string;
      expected: { code: 'signal.invalidConfig' };
      input: { message: string };
      kind: 'signal-error-construction';
      name: string;
    };

class RecordingSignal extends Signal {
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

const runnerMap: Record<ScenarioCase['kind'], (scenarioCase: ScenarioCase) => Promise<void>> = {
  'never-aborts': async (scenarioCase) => {
    const sig = Signal.never();
    assert.equal(scenarioCase.input.aborted, scenarioCase.expected.aborted);
    assert.ok(sig instanceof AbortSignal);
    assert.equal(sig.aborted, scenarioCase.expected.aborted);
  },

  'never-same-instance': async (scenarioCase) => {
    const first = Signal.never();
    const second = Signal.never();
    assert.equal(scenarioCase.input.sameInstance, scenarioCase.expected.sameInstance);
    assert.equal(first, second);
    assert.equal(first === second, scenarioCase.expected.sameInstance);
  },

  'compose-empty-options': async (scenarioCase) => {
    const sig = await Signal.create().compose(materializeComposeOptions(scenarioCase.input.composeOptions));
    assert.equal(scenarioCase.input.aborted, scenarioCase.expected.aborted);
    assert.ok(sig instanceof AbortSignal);
    assert.equal(sig.aborted, scenarioCase.expected.aborted);
  },

  'compose-provided-signal': async (scenarioCase) => {
    const runtime = createComposeRuntime();
    const sig = await Signal.create().compose(materializeComposeOptions(scenarioCase.input.composeOptions, runtime));
    const expectedSignal = composeSignalMap[scenarioCase.input.composeOptions.signalId](runtime);
    assert.equal(sig, expectedSignal);
    assert.equal(sig === expectedSignal, scenarioCase.expected.sameSignal);
  },

  'compose-signal-deadline-abort': async (scenarioCase) => {
    const runtime = createComposeRuntime();
    const sig = await Signal.create().compose(materializeComposeOptions(scenarioCase.input.composeOptions, runtime));
    assert.ok(sig instanceof AbortSignal);
    assert.equal(sig.aborted, scenarioCase.expected.initialAborted);
    runtime.controllers[scenarioCase.input.composeOptions.signalId].abort();
    assert.equal(sig.aborted, scenarioCase.expected.abortedAfterAbort);
  },

  'compose-deadline-fires': async (scenarioCase) => {
    const sig = await Signal.create().compose(materializeComposeOptions(scenarioCase.input.composeOptions));
    assert.ok(sig instanceof AbortSignal);
    assert.equal(sig.aborted, scenarioCase.expected.initialAborted);
    await delay(scenarioCase.input.waitMs);
    assert.equal(sig.aborted, scenarioCase.expected.abortedAfterWait);
  },

  'compose-invalid-deadline': async (scenarioCase) => {
    await assert.rejects(
      Signal.create().compose(materializeComposeOptions(scenarioCase.input.composeOptions)),
      (err: unknown) => {
        assert.ok(err instanceof SignalError);
        assert.ok(err.message.includes(scenarioCase.expected.errorMessageIncludes));
        return true;
      }
    );
  },

  'instance-empty-options': async (scenarioCase) => {
    const s = Signal.create();
    const sig = await s.compose(materializeComposeOptions(scenarioCase.input.composeOptions));
    assert.equal(scenarioCase.input.sameAsNever, scenarioCase.expected.sameAsNever);
    assert.ok(sig instanceof AbortSignal);
    assert.equal(sig, Signal.never());
    assert.equal(sig === Signal.never(), scenarioCase.expected.sameAsNever);
  },

  'instance-provided-signal': async (scenarioCase) => {
    const s = Signal.create();
    const runtime = createComposeRuntime();
    const sig = await s.compose(materializeComposeOptions(scenarioCase.input.composeOptions, runtime));
    const expectedSignal = composeSignalMap[scenarioCase.input.composeOptions.signalId](runtime);
    assert.equal(sig, expectedSignal);
    assert.equal(sig === expectedSignal, scenarioCase.expected.sameSignal);
  },

  'on-compose-signal-only': async (scenarioCase) => {
    const s = new RecordingSignal();
    const options = materializeComposeOptions(scenarioCase.input.composeOptions);
    const result = await s.compose(options);
    assert.equal(s.calls.length, scenarioCase.expected.callCount);
    assert.equal(s.calls[0]?.options, options);
    assert.equal(s.calls[0]?.result, result);
    assert.ok(s.calls[0]?.result instanceof AbortSignal);
    assert.equal(result.aborted, false);
    assert.equal(result === s.calls[0]?.result, scenarioCase.expected.resultMatches);
  },

  'on-compose-deadline-only': async (scenarioCase) => {
    await runnerMap['on-compose-signal-only'](scenarioCase);
  },

  'on-compose-empty-options': async (scenarioCase) => {
    await runnerMap['on-compose-signal-only'](scenarioCase);
  },

  'throwing-on-compose-surfaces': async (scenarioCase) => {
    const originalError = new Error(scenarioCase.input.message);

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
      (err: unknown) => {
        assert.ok(err instanceof HookInvocationError);
        assert.equal(err.hookName, scenarioCase.expected.hookName);
        assert.equal(err.cause, originalError);
        return true;
      }
    );
  },

  'async-on-compose-rejection-surfaces': async (scenarioCase) => {
    const originalError = new Error(scenarioCase.input.message);

    class AsyncThrowingSignal extends Signal {
      protected override async onCompose(): Promise<void> {
        await delay(1);
        throw originalError;
      }
    }

    await assert.rejects(
      new AsyncThrowingSignal().compose(materializeComposeOptions(scenarioCase.input.composeOptions)),
      (err: unknown) => {
        assert.ok(err instanceof HookInvocationError);
        assert.equal(err.hookName, scenarioCase.expected.hookName);
        assert.equal(err.cause, originalError);
        return true;
      }
    );
  },

  'swallowing-hook-invoker': async (scenarioCase) => {
    class SwallowingHookInvoker extends HookInvoker {
      protected override onHookError(_hookName: string, _cause: unknown): void {}
    }

    class SwallowingSignal extends Signal {
      constructor() {
        super(new SwallowingHookInvoker());
      }

      protected override onCompose(): void {
        throw new Error(scenarioCase.input.message);
      }
    }

    const s = new SwallowingSignal();
    const sig = await s.compose(materializeComposeOptions(scenarioCase.input.composeOptions));
    assert.ok(sig instanceof AbortSignal);
    assert.equal(sig.aborted, scenarioCase.expected.aborted);
  },

  'race-timeout-no-signal': async (scenarioCase) => {
    const outcome = await RaceTimeout.wait(scenarioCase.input.waitMs, undefined);
    assert.equal(outcome, scenarioCase.expected.outcome);
  },

  'race-timeout-removes-listener': async (scenarioCase) => {
    const controller = new AbortController();
    const pending = RaceTimeout.wait(scenarioCase.input.waitMs, controller.signal);
    assert.equal(getEventListeners(controller.signal, 'abort').length, scenarioCase.expected.abortListenerCountBefore);
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
    const error = new SignalError(scenarioCase.input.message, new Error('cause'));
    assert.equal(error.code, scenarioCase.expected.code);
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.kind](scenarioCase);
}

void describe('Signal', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
