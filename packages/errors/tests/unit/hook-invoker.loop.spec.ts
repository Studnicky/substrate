import assert from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { HookInvocationError } from '../../src/errors/HookInvocationError.js';
import { HookInvoker } from '../../src/errors/HookInvoker.js';
import { HookTimeoutError } from '../../src/errors/HookTimeoutError.js';
import { ReentrantHookInvocationError } from '../../src/errors/ReentrantHookInvocationError.js';
import { ValidationError } from '../../src/errors/ValidationError.js';
import scenarioGroups from './hook-invoker.scenarios.json';

const errorConstructorsByShape: Record<string, new (...args: never[]) => Error> = {
  'HookInvocationError': HookInvocationError,
  'HookTimeoutError': HookTimeoutError
};

function errorConstructorForShape(shape: unknown): new (...args: never[]) => Error {
  const constructor = errorConstructorsByShape[String(shape)];
  assert.ok(constructor, `Unknown error shape: ${String(shape)}`);
  return constructor;
}

class SwallowingInvoker extends HookInvoker {
  protected override onHookError(_hookName: string, _cause: unknown): void {}
}

class RecordingInvoker extends HookInvoker {
  readonly causes: unknown[] = [];
  readonly erroredHookNames: string[] = [];

  protected override onHookError(hookName: string, cause: unknown): void {
    this.causes.push(cause);
    this.erroredHookNames.push(hookName);
  }
}

class AsyncRejectingOnHookErrorInvoker extends HookInvoker {
  readonly terminalCause = new Error('onHookError itself failed');

  protected override async onHookError(_hookName: string, _cause: unknown): Promise<void> {
    await Promise.resolve();
    throw this.terminalCause;
  }
}

class AsyncSwallowingInvoker extends HookInvoker {
  readonly erroredHookNames: string[] = [];

  protected override async onHookError(hookName: string, _cause: unknown): Promise<void> {
    await Promise.resolve();
    this.erroredHookNames.push(hookName);
  }
}

let callCount = 0;
class LoopingOnHookErrorInvoker extends HookInvoker {
  protected override async onHookError(_hookName: string, _cause: unknown): Promise<void> {
    callCount += 1;
    await Promise.resolve();
    throw new Error('onHookError rejects every time');
  }
}

class DiagnosticMarker {
  public readonly label = 'marker';
}

class CloneableMarker {
  public readonly label = 'cloneable';
  public readonly nested = { count: 2 };
}

interface HookInvokerOptionsInputInterface {
  detectReentrancy?: boolean;
  timeoutMs?: number;
}

interface HookDiagnosticsInputInterface {
  details?: Record<string, unknown>;
  items?: unknown[];
  plain?: Record<string, unknown>;
}

interface HookInvokerInputInterface {
  callEvent?: string;
  causeMessage?: string;
  delayMicrotask?: boolean;
  delayMs?: number;
  diagnostics?: HookDiagnosticsInputInterface;
  hookName?: string;
  innerHookName?: string;
  message?: string;
  observationDelayMs?: number;
  options?: HookInvokerOptionsInputInterface;
  outerHookName?: string;
  returnValue?: unknown;
  thenEvent?: string;
}

interface ScenarioInputInterface {
  invoker: HookInvokerInputInterface;
}

type ScenarioShape = 'detectreentrancy-disabled' | 'detectreentrancy-direct' | 'detectreentrancy-no-throw' | 'detectreentrancy-wrapped' | 'diagnostics-async' | 'diagnostics-fallback' | 'diagnostics-null-prototype' | 'diagnostics-rich' | 'diagnostics-structured-clone' | 'diagnostics-sync' | 'invoke-async-reject' | 'invoke-async-success' | 'invoke-fire-and-forget' | 'invoke-swallow-async' | 'invoke-swallow-sync' | 'invoke-sync-success' | 'invoke-sync-throw' | 'invoke-unexpected-async' | 'invokeasync-async-success' | 'invokeasync-async-throw' | 'invokeasync-function-thenable' | 'invokeasync-sync-success' | 'invokeasync-sync-throw' | 'invokeasync-thenable' | 'invokeasync-timeout' | 'onhookerror-async-reject-invoke' | 'onhookerror-async-reject-invokeasync' | 'onhookerror-loop-guard' | 'onhookerror-sync-throw' | 'options-malformed' | 'options-no-options' | 'options-non-positive' | 'timeout-invoke-fire-and-forget' | 'timeout-invokeasync-fast' | 'timeout-no-dangling-timer' | 'timeout-sync-never-applies';

type ScenarioCase = {
  description: string;
  expected: Record<string, unknown>;
  input: ScenarioInputInterface;
  shape: ScenarioShape;
  name: string;
};

function materializeInput(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => materializeInput(entry));
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (record.shape === 'undefined') {
      return undefined;
    }
    if ('returnValue' in record || 'hookName' in record || 'outerHookName' in record || 'innerHookName' in record || 'timeoutMs' in record) {
      return record;
    }
    const materialized: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(record)) {
      materialized[key] = materializeInput(entry);
    }
    return materialized;
  }
  return value;
}

function createDiagnosticsError(message: string): Error {
  const details: { labels: string[]; self?: unknown } = { labels: ['initial'] };
  details.self = details;
  const error = new Error(message, { cause: details });
  Reflect.set(error, 'details', details);
  return error;
}

function requireScenarioData(scenario: ScenarioCase): { expected: Record<string, unknown>; input: HookInvokerInputInterface } {
  assert.ok(scenario.input.invoker, `Scenario ${scenario.name} is missing invoker input`);
  assert.ok(scenario.expected, `Scenario ${scenario.name} is missing expected`);
  return { expected: scenario.expected, input: scenario.input.invoker };
}

async function flushTurn(): Promise<void> {
  await new Promise<void>((resolve) => { setImmediate(resolve); });
}

async function captureUnhandledRejections(scenarioName: string, action: () => Promise<void> | void): Promise<unknown[]> {
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => {
    rejectionEvents.push(reason);
    console.error('[%s] captured unhandledRejection', scenarioName, reason);
  };
  process.on('unhandledRejection', onUnhandledRejection);
  try {
    await action();
    await flushTurn();
    return rejectionEvents;
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
}

type ScenarioRunner = (scenario: ScenarioCase, expected: Record<string, unknown>, input: HookInvokerInputInterface) => Promise<void> | void;

const runFireAndForgetTimeout: ScenarioRunner = (scenario, expected, input) => {
  const invoker = new RecordingInvoker(input.options);
  return captureUnhandledRejections(scenario.name, async () => {
    const completion: void = invoker.invoke(String(input.hookName), () => new Promise(() => {}));
    assert.strictEqual(completion, undefined);
    await new Promise((resolve) => { setTimeout(resolve, Number(input.observationDelayMs)); });
    assert.deepStrictEqual(invoker.erroredHookNames, expected.erroredHookNames);
    const cause = invoker.causes[0];
    assert.ok(cause instanceof errorConstructorForShape(expected.causeShape));
    assert.strictEqual((cause as HookTimeoutError).hookName, String(expected.erroredHookNames[0]));
    assert.strictEqual((cause as HookTimeoutError).timeoutMs, Number(expected.causeTimeoutMs));
  }).then((rejectionEvents) => {
    assert.strictEqual(rejectionEvents.length, Number(expected.unhandledRejections));
  });
};

const runnerMap = {
  'detectreentrancy-disabled': (_scenario, expected, input) => {
    const invoker = new HookInvoker();
    let innerRan = false;
    let outerRan = false;
    invoker.invoke(String(input.outerHookName), () => {
      invoker.invoke(String(input.innerHookName), () => { innerRan = true; });
      outerRan = true;
    });
    assert.strictEqual(outerRan, Boolean(expected.outerRan));
    assert.strictEqual(innerRan, Boolean(expected.innerRan));
  },
  'detectreentrancy-direct': (_scenario, expected, input) => {
    const invoker = new HookInvoker(input.options);
    let caughtInsideOuter: unknown;
    invoker.invoke(String(input.outerHookName), () => {
      try {
        invoker.invoke(String(input.innerHookName), () => 'never reached');
      } catch (error: unknown) {
        caughtInsideOuter = error;
      }
    });
    assert.ok(caughtInsideOuter instanceof ReentrantHookInvocationError);
    assert.strictEqual((caughtInsideOuter as ReentrantHookInvocationError).hookName, String(expected.innerHookName));
  },
  'detectreentrancy-no-throw': (_scenario, expected, input) => {
    const invoker = new HookInvoker(input.options);
    let callCountLocal = 0;
    invoker.invoke(String(input.outerHookName), () => { callCountLocal += 1; });
    invoker.invoke(String(input.innerHookName), () => { callCountLocal += 1; });
    assert.strictEqual(callCountLocal, Number(expected.callCount));
  },
  'detectreentrancy-wrapped': (_scenario, expected, input) => {
    const invoker = new HookInvoker(input.options);
    assert.throws(() => {
      invoker.invoke(String(input.outerHookName), () => {
        invoker.invoke(String(input.innerHookName), () => 'never reached');
      });
    }, (err: unknown) => {
      assert.ok(err instanceof HookInvocationError);
      assert.strictEqual((err as HookInvocationError).hookName, String(expected.outerHookName));
      assert.ok((err as HookInvocationError).cause instanceof ReentrantHookInvocationError);
      assert.strictEqual(((err as HookInvocationError).cause as ReentrantHookInvocationError).hookName, String(expected.innerHookName));
      return true;
    });
  },
  'diagnostics-async': (_scenario, expected, input) => {
    const invoker = new SwallowingInvoker();
    const original = createDiagnosticsError(String(input.message));

    return invoker.invokeAsync(String(input.hookName), async () => {
      await Promise.resolve();
      throw original;
    }).then(() => {
      const firstDiagnostic = invoker.getHookErrors()[0];
      assert.ok(firstDiagnostic instanceof HookInvocationError);
      assert.ok(firstDiagnostic.cause instanceof Error);
      assert.strictEqual(firstDiagnostic.hookName, String(expected.firstHookName));
      assert.strictEqual(firstDiagnostic.cause.message, String(expected.firstCauseMessage));
      assert.strictEqual(invoker.hookErrorCount, Number(expected.hookErrorCount));
    });
  },
  'diagnostics-fallback': (_scenario, _expected, input) => {
    const invoker = new SwallowingInvoker();
    const marker = new DiagnosticMarker();
    const original = createDiagnosticsError(String(input.message));
    Reflect.set(original, 'marker', marker);
    Reflect.set(original, 'fn', () => 'marker');
    Reflect.set(original, 'items', input.diagnostics?.items);

    return invoker.invokeAsync(String(input.hookName), async () => {
      await Promise.resolve();
      throw original;
    }).then(() => {
      const diagnostic = invoker.getHookErrors()[0];
      assert.ok(diagnostic instanceof HookInvocationError);
      const cause = diagnostic.cause as Record<string, unknown>;
      assert.deepStrictEqual(cause.marker, { label: 'marker' });
      assert.ok('fn' in cause);
      assert.deepStrictEqual(cause.items, input.diagnostics?.items);
    });
  },
  'diagnostics-null-prototype': (_scenario, _expected, input) => {
    const invoker = new SwallowingInvoker();
    const original = createDiagnosticsError(String(input.message));
    const details = Object.create(null) as Record<string, unknown>;
    for (const [key, value] of Object.entries(input.diagnostics?.details ?? {})) {
      details[key] = value;
    }
    Reflect.set(original, 'details', details);

    return invoker.invokeAsync(String(input.hookName), async () => {
      await Promise.resolve();
      throw original;
    }).then(() => {
      const diagnostic = invoker.getHookErrors()[0];
      assert.ok(diagnostic instanceof HookInvocationError);
      const cause = diagnostic.cause as Record<string, unknown>;
      assert.deepStrictEqual(cause.details, input.diagnostics?.details);
    });
  },
  'diagnostics-rich': (_scenario, expected, input) => {
    const invoker = new SwallowingInvoker();
    const original = createDiagnosticsError(String(input.message));
    Reflect.set(original, 'plain', input.diagnostics?.plain);
    Reflect.set(original, 'items', input.diagnostics?.items);
    Reflect.set(original, 'broken', () => {});

    return invoker.invokeAsync(String(input.hookName), async () => {
      await Promise.resolve();
      throw original;
    }).then(() => {
      const diagnostic = invoker.getHookErrors()[0];
      assert.ok(diagnostic instanceof HookInvocationError);
      assert.ok(diagnostic.cause instanceof Error);
      assert.strictEqual(diagnostic.hookName, String(expected.firstHookName));
      assert.strictEqual(diagnostic.cause.message, String(expected.firstCauseMessage));
      assert.deepStrictEqual((diagnostic.cause as Record<string, unknown>).plain, input.diagnostics?.plain);
      assert.deepStrictEqual((diagnostic.cause as Record<string, unknown>).items, input.diagnostics?.items);
      assert.ok('broken' in (diagnostic.cause as Record<string, unknown>));
      assert.strictEqual(invoker.hookErrorCount, Number(expected.hookErrorCount));
    });
  },
  'diagnostics-structured-clone': (_scenario, _expected, input) => {
    const invoker = new SwallowingInvoker();
    const marker = new CloneableMarker();
    const original = createDiagnosticsError(String(input.message));
    Reflect.set(original, 'marker', marker);
    Reflect.set(original, 'items', input.diagnostics?.items);

    return invoker.invokeAsync(String(input.hookName), async () => {
      await Promise.resolve();
      throw original;
    }).then(() => {
      const diagnostic = invoker.getHookErrors()[0];
      assert.ok(diagnostic instanceof HookInvocationError);
      const cause = diagnostic.cause as Record<string, unknown>;
      assert.deepStrictEqual(cause.marker, { label: 'cloneable', nested: { count: 2 } });
      assert.deepStrictEqual(cause.items, input.diagnostics?.items);
    });
  },
  'diagnostics-sync': (_scenario, expected, input) => {
    const invoker = new SwallowingInvoker();
    const originalDetails: { labels: string[]; self?: unknown } = { labels: ['initial'] };
    originalDetails.self = originalDetails;
    const original = new Error(String(input.message), { cause: originalDetails });
    Reflect.set(original, 'details', originalDetails);

    invoker.invoke(String(input.hookName), () => {
      throw original;
    });

    const first = invoker.getHookErrors();
    assert.strictEqual(invoker.hookErrorCount, Number(expected.hookErrorCount));
    assert.strictEqual(first.length, Number(expected.hookErrorCount));
    assert.ok(first[0] instanceof HookInvocationError);
    assert.strictEqual(first[0]?.hookName, String(expected.firstHookName));
    assert.strictEqual((first[0]?.cause as Error | undefined)?.message, String(expected.firstCauseMessage));
  },
  'invoke-async-reject': (scenario, expected, input) => {
    const invoker = new RecordingInvoker();
    const original = new Error(String(input.message));
    return captureUnhandledRejections(scenario.name, async () => {
      const completion: void = invoker.invoke(String(input.hookName), async () => {
        throw original;
      });
      assert.strictEqual(completion, undefined);
      await flushTurn();
      assert.deepStrictEqual(invoker.erroredHookNames, expected.erroredHookNames);
      assert.deepStrictEqual(invoker.causes, [original]);
      assert.deepStrictEqual(invoker.causes.map((entry) => (entry instanceof Error ? entry.message : String(entry))), expected.causeMessages);
    }).then((rejectionEvents) => {
      assert.strictEqual(rejectionEvents.length, Number(expected.unhandledRejections));
    });
  },
  'invoke-async-success': (_scenario, expected, input) => {
    const invoker = new HookInvoker();
    let hookCompleted = false;
    const completion: void = invoker.invoke(String(input.hookName), async () => {
      if (input.delayMicrotask) {
        await Promise.resolve();
      }
      hookCompleted = true;
      return input.returnValue;
    });
    assert.strictEqual(completion, materializeInput(expected.completion));
    return flushTurn().then(() => {
      assert.strictEqual(hookCompleted, Boolean(expected.hookCompleted));
    });
  },
  'invoke-fire-and-forget': runFireAndForgetTimeout,
  'invoke-swallow-async': (scenario, expected, input) => {
    const invoker = new AsyncSwallowingInvoker();
    return captureUnhandledRejections(scenario.name, async () => {
      const completion: void = invoker.invoke(String(input.hookName), async () => {
        await Promise.resolve();
        throw new Error(String(input.message));
      });
      assert.strictEqual(completion, materializeInput(expected.completion));
      await flushTurn();
      assert.deepStrictEqual(invoker.erroredHookNames, expected.erroredHookNames);
    }).then((rejectionEvents) => {
      assert.strictEqual(rejectionEvents.length, Number(expected.unhandledRejections));
    });
  },
  'invoke-swallow-sync': (_scenario, expected, input) => {
    const invoker = new SwallowingInvoker();
    const completion = invoker.invoke(String(input.hookName), () => {
      throw new Error(String(input.message));
    });
    assert.strictEqual(completion, materializeInput(expected.completion));
  },
  'invoke-sync-success': (_scenario, expected, input) => {
    const invoker = new HookInvoker();
    let hookRan = false;
    const completion: void = invoker.invoke(String(input.hookName), () => {
      hookRan = true;
      return input.returnValue;
    });
    assert.strictEqual(hookRan, true);
    assert.strictEqual(completion, materializeInput(expected.completion));
  },
  'invoke-sync-throw': (_scenario, expected, input) => {
    const invoker = new HookInvoker();
    const original = new Error(String(input.message));
    assert.throws(() => {
      invoker.invoke(String(input.hookName), () => {
        throw original;
      });
    }, (err: unknown) => {
      assert.ok(err instanceof errorConstructorForShape(expected.errorShape));
      assert.strictEqual((err as HookInvocationError).hookName, String(expected.hookName));
      assert.strictEqual((err as HookInvocationError).cause, original);
      return true;
    });
  },
  'invoke-unexpected-async': (scenario, expected, input) => {
    const invoker = new RecordingInvoker();
    return captureUnhandledRejections(scenario.name, async () => {
      const completion = invoker.invoke(String(input.hookName), async () => {
        throw new Error(String(input.message));
      });
      assert.strictEqual(completion, undefined);
      await flushTurn();
      assert.deepStrictEqual(invoker.erroredHookNames, expected.erroredHookNames);
    }).then((rejectionEvents) => {
      assert.strictEqual(rejectionEvents.length, Number(expected.unhandledRejections));
    });
  },
  'invokeasync-async-success': (_scenario, expected, input) => {
    const invoker = new HookInvoker();
    let hookCompleted = false;
    const completion = invoker.invokeAsync(String(input.hookName), async () => {
      if (input.delayMicrotask) {
        await Promise.resolve();
      }
      hookCompleted = true;
    });
    assert.strictEqual(hookCompleted, false);
    return completion.then((result) => {
      assert.strictEqual(result, materializeInput(expected.completion));
      assert.strictEqual(hookCompleted, Boolean(expected.hookCompleted));
    });
  },
  'invokeasync-async-throw': (_scenario, expected, input) => {
    const invoker = new HookInvoker();
    const original = new Error(String(input.message));
    return assert.rejects(
      invoker.invokeAsync(String(input.hookName), async () => { throw original; }),
      (err: unknown) => {
        assert.ok(err instanceof HookInvocationError);
        assert.strictEqual((err as HookInvocationError).hookName, String(expected.hookName));
        assert.strictEqual((err as HookInvocationError).cause, original);
        return true;
      }
    );
  },
  'invokeasync-function-thenable': (_scenario, expected, input) => {
    const invoker = new HookInvoker();
    const events: string[] = [];
    const thenable = (): void => {
      events.push(String(input.callEvent));
    };
    const thenPropertyName = ['t', 'h', 'e', 'n'].join('');
    Reflect.defineProperty(thenable, thenPropertyName, {
      'configurable': true,
      'value': (resolve: () => void): void => {
        events.push(String(input.thenEvent));
        resolve();
      }
    });
    const completion: Promise<void> = invoker.invokeAsync(String(input.hookName), () => thenable);
    assert.deepStrictEqual(events, expected.beforeCompletionEvents);
    return completion.then(() => {
      assert.deepStrictEqual(events, expected.afterCompletionEvents);
    });
  },
  'invokeasync-sync-success': (_scenario, expected, input) => {
    const invoker = new HookInvoker();
    let hookRan = false;
    const completion: Promise<void> = invoker.invokeAsync(String(input.hookName), () => {
      hookRan = true;
      return input.returnValue;
    });
    assert.strictEqual(hookRan, Boolean(expected.hookRan));
    return completion.then((result) => {
      assert.strictEqual(result, materializeInput(expected.completion));
    });
  },
  'invokeasync-sync-throw': (_scenario, expected, input) => {
    const invoker = new HookInvoker();
    const original = new Error(String(input.message));
    return assert.rejects(
      invoker.invokeAsync(String(input.hookName), () => { throw original; }),
      (err: unknown) => {
        assert.ok(err instanceof HookInvocationError);
        assert.strictEqual((err as HookInvocationError).hookName, String(expected.hookName));
        assert.strictEqual((err as HookInvocationError).cause, original);
        return true;
      }
    );
  },
  'invokeasync-thenable': (_scenario, expected, input) => {
    const invoker = new HookInvoker();
    const events: string[] = [];
    const unexpectedlyAsyncHook: () => void = async () => {
      events.push('started');
      await Promise.resolve();
      events.push('completed');
    };
    const completion: Promise<void> = invoker.invokeAsync(String(input.hookName), unexpectedlyAsyncHook);
    assert.deepStrictEqual(events, [String(expected.events?.[0])]);
    return completion.then(() => {
      assert.deepStrictEqual(events, expected.events);
    });
  },
  'invokeasync-timeout': (_scenario, expected, input) => {
    const invoker = new HookInvoker(input.options);
    return assert.rejects(
      invoker.invokeAsync(String(input.hookName), () => new Promise(() => { /* never settles */ })),
      (err: unknown) => {
        assert.ok(err instanceof errorConstructorForShape(expected.errorShape));
        assert.ok(err.cause instanceof errorConstructorForShape(expected.causeShape));
        assert.strictEqual((err as HookInvocationError).hookName, String(expected.hookName));
        assert.strictEqual((err.cause as HookTimeoutError).hookName, String(expected.hookName));
        assert.strictEqual((err.cause as HookTimeoutError).timeoutMs, Number(expected.causeTimeoutMs));
        const recorded = invoker.getHookErrors()[0];
        assert.ok(recorded instanceof HookInvocationError);
        assert.ok(recorded.cause instanceof HookTimeoutError);
        return true;
      }
    );
  },
  'onhookerror-async-reject-invoke': (scenario, expected, input) => {
    const invoker = new AsyncRejectingOnHookErrorInvoker();
    return captureUnhandledRejections(scenario.name, async () => {
      const completion: void = invoker.invoke(String(input.hookName), () => {
        throw new Error(String(input.causeMessage));
      });
      assert.strictEqual(completion, undefined);
      await flushTurn();
    }).then((rejectionEvents) => {
      assert.strictEqual(rejectionEvents.length, Number(expected.unhandledRejections));
    });
  },
  'onhookerror-async-reject-invokeasync': (_scenario, expected, input) => {
    const invoker = new AsyncRejectingOnHookErrorInvoker();
    return assert.rejects(
      invoker.invokeAsync(String(input.hookName), async () => {
        await Promise.resolve();
        throw new Error(String(input.causeMessage));
      }),
      (error: unknown) => {
        assert.strictEqual((error as Error).message, String(expected.terminalCauseMessage));
        return true;
      }
    );
  },
  'onhookerror-loop-guard': (_scenario, expected, input) => {
    callCount = 0;
    const invoker = new LoopingOnHookErrorInvoker();
    const completion: void = invoker.invoke(String(input.hookName), () => {
      throw new Error(String(input.causeMessage));
    });
    assert.strictEqual(completion, undefined);
    return flushTurn().then(() => {
      assert.strictEqual(callCount, Number(expected.callCount));
      assert.strictEqual(invoker.getHookErrors().length, 1);
    });
  },
  'onhookerror-sync-throw': (_scenario, expected, input) => {
    class ThrowingOnHookErrorInvoker extends HookInvoker {
      protected override onHookError(hookName: string, cause: unknown): void {
        throw new Error(`custom failure for ${hookName}: ${String(cause)}`);
      }
    }

    const invoker = new ThrowingOnHookErrorInvoker();
    assert.throws(() => {
      invoker.invoke(String(input.hookName), () => {
        throw new Error(String(input.causeMessage));
      });
    }, (err: unknown) => {
      assert.ok(err instanceof Error);
      for (const fragment of expected.messageIncludes ?? []) {
        assert.ok(err.message.includes(String(fragment)));
      }
      assert.strictEqual(err instanceof HookInvocationError, !expected.notHookInvocationError);
      return true;
    });
  },
  'options-malformed': (_scenario, _expected, input) => {
    const malformed = materializeInput(input.options) as Record<string, unknown>;
    assert.throws(() => {
      Reflect.construct(HookInvoker, [malformed]);
    }, ValidationError);
  },
  'options-no-options': (_scenario, expected, input) => {
    const invoker = new HookInvoker();
    let hookRan = false;
    const completion = invoker.invoke(String(input.hookName), () => { hookRan = true; return input.returnValue; });
    assert.strictEqual(hookRan, Boolean(expected.hookRan));
    assert.strictEqual(completion, materializeInput(expected.completion));
  },
  'options-non-positive': (_scenario, _expected, input) => {
    assert.throws(() => {
      new HookInvoker(materializeInput(input.options) as { timeoutMs: number });
    }, ValidationError);
  },
  'timeout-invoke-fire-and-forget': runFireAndForgetTimeout,
  'timeout-invokeasync-fast': (_scenario, expected, input) => {
    const invoker = new HookInvoker(input.options);
    let hookCompleted = false;
    const completion = invoker.invokeAsync(String(input.hookName), async () => {
      await new Promise((resolve) => { setTimeout(resolve, Number(input.delayMs)); });
      hookCompleted = true;
    });
    return completion.then((result) => {
      assert.strictEqual(result, materializeInput(expected.completion));
      assert.strictEqual(hookCompleted, Boolean(expected.hookCompleted));
    });
  },
  'timeout-no-dangling-timer': (scenario, expected, input) => {
    const invoker = new HookInvoker(input.options);
    return captureUnhandledRejections(scenario.name, async () => {
      const completion = invoker.invokeAsync(String(input.hookName), async () => 'discarded');
      await completion;
      await new Promise((resolve) => { setTimeout(resolve, Number(input.observationDelayMs)); });
    }).then((rejectionEvents) => {
      assert.strictEqual(rejectionEvents.length, Number(expected.unhandledRejections));
    });
  },
  'timeout-sync-never-applies': (_scenario, expected, input) => {
    const invoker = new HookInvoker(input.options);
    let hookRan = false;
    const completion = invoker.invoke(String(input.hookName), () => {
      hookRan = true;
      return input.returnValue;
    });
    assert.strictEqual(hookRan, Boolean(expected.hookRan));
    assert.strictEqual(completion, materializeInput(expected.completion));
  }
} satisfies Record<ScenarioShape, ScenarioRunner>;

function runCase(scenario: ScenarioCase): Promise<void> | void {
  const { expected, input } = requireScenarioData(scenario);
  return runnerMap[scenario.shape](scenario, expected, input);
}

void describe('HookInvoker', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
