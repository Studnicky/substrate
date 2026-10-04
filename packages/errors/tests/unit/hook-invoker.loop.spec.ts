import type { JSONSchema7Type } from 'json-schema';

import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { mock } from 'node:test';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite, ScenarioValues } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { HookInvokerOptionsEntity } from '../../src/entities/HookInvokerOptionsEntity.js';
import { HookInvocationError } from '../../src/errors/HookInvocationError.js';
import { HookInvoker } from '../../src/errors/HookInvoker.js';
import { HookTimeoutError } from '../../src/errors/HookTimeoutError.js';
import { ReentrantHookInvocationError } from '../../src/errors/ReentrantHookInvocationError.js';
import { RuntimeError } from '../../src/errors/RuntimeError.js';
import { HookInvokerScenarioCaseEntity } from './entities/HookInvokerScenarioCaseEntity.js';
import scenarioGroups from './hook-invoker.scenarios.json' with { 'type': 'json' };

class SwallowingInvoker extends HookInvoker {
  protected override onHookError(_hookName: string, _cause: Error): void {}
}

class RecordingInvoker extends HookInvoker {
  readonly causes: Error[] = [];
  readonly erroredHookNames: string[] = [];

  protected override onHookError(hookName: string, cause: Error): void {
    this.causes.push(cause);
    this.erroredHookNames.push(hookName);
  }
}

class AsyncRejectingOnHookErrorInvoker extends HookInvoker {
  readonly terminalCause = RuntimeError.create('onHookError itself failed');

  protected override async onHookError(_hookName: string, _cause: Error): Promise<void> {
    await Promise.resolve();
    throw this.terminalCause;
  }
}

class AsyncSwallowingInvoker extends HookInvoker {
  readonly erroredHookNames: string[] = [];

  protected override async onHookError(hookName: string, _cause: Error): Promise<void> {
    await Promise.resolve();
    this.erroredHookNames.push(hookName);
  }
}

class LoopingOnHookErrorInvoker extends HookInvoker {
  static callCount = 0;

  protected override async onHookError(_hookName: string, _cause: Error): Promise<void> {
    LoopingOnHookErrorInvoker.callCount += 1;
    await Promise.resolve();
    throw RuntimeError.create('onHookError rejects every time');
  }
}

class DiagnosticMarker {
  public readonly label = 'marker';
}

class CloneableMarker {
  public readonly label = 'cloneable';
  public readonly nested = { 'count': 2 };
}

class HookInvokerRunners {
  static 'detectreentrancy-direct'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'detectreentrancy-direct'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new HookInvoker(HookInvokerRunners.toHookInvokerOptions(input.options));
    let caughtInsideOuter: unknown;
    invoker.invoke(String(input.outerHookName), () => {
      try {
        invoker.invoke(String(input.innerHookName), () => {return 'never reached';});
      } catch (error: unknown) {
        caughtInsideOuter = error;
      }
    });
    assert.ok(caughtInsideOuter instanceof ReentrantHookInvocationError);
    assert.strictEqual(caughtInsideOuter.hookName, String(expected.innerHookName));
  }

  static 'detectreentrancy-disabled'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'detectreentrancy-disabled'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new HookInvoker();
    let innerRan = false;
    let outerRan = false;
    invoker.invoke(String(input.outerHookName), () => {
      invoker.invoke(String(input.innerHookName), () => { innerRan = true; });
      outerRan = true;
    });
    assert.strictEqual(outerRan, Boolean(expected.outerRan));
    assert.strictEqual(innerRan, Boolean(expected.innerRan));
  }

  static 'detectreentrancy-no-throw'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'detectreentrancy-no-throw'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new HookInvoker(HookInvokerRunners.toHookInvokerOptions(input.options));
    let callCountLocal = 0;
    invoker.invoke(String(input.outerHookName), () => { callCountLocal += 1; });
    invoker.invoke(String(input.innerHookName), () => { callCountLocal += 1; });
    assert.strictEqual(callCountLocal, Number(expected.callCount));
  }

  static 'detectreentrancy-wrapped'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'detectreentrancy-wrapped'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new HookInvoker(HookInvokerRunners.toHookInvokerOptions(input.options));
    assert.throws(() => {
      invoker.invoke(String(input.outerHookName), () => {
        invoker.invoke(String(input.innerHookName), () => {return 'never reached';});
      });
    }, (error) => {
      assert.ok(error instanceof HookInvocationError);
      assert.strictEqual(error.hookName, String(expected.outerHookName));
      assert.ok(error.cause instanceof ReentrantHookInvocationError);
      assert.strictEqual(error.cause.hookName, String(expected.innerHookName));
      return true;
    });
  }

  static 'diagnostics-async'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'diagnostics-async'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new SwallowingInvoker();
    const original = HookInvokerRunners.createDiagnosticsError(String(input.message));

    const result = invoker.invokeAsync(String(input.hookName), async () => {
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
    return result;
  }

  static 'diagnostics-fallback'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'diagnostics-fallback'>): Promise<void> {
    const input = scenarioCase.input.invoker;
    const invoker = new SwallowingInvoker();
    const marker = new DiagnosticMarker();
    const original = HookInvokerRunners.createDiagnosticsError(String(input.message));
    Reflect.set(original, 'marker', marker);
    Reflect.set(original, 'fn', () => {return 'marker';});
    Reflect.set(original, 'items', input.diagnostics?.items);

    const result = invoker.invokeAsync(String(input.hookName), async () => {
      await Promise.resolve();
      throw original;
    }).then(() => {
      const diagnostic = invoker.getHookErrors()[0];
      assert.ok(diagnostic instanceof HookInvocationError);
      assert.ok(Predicates.isRecord(diagnostic.cause));
      const cause = diagnostic.cause;
      assert.deepStrictEqual(cause.marker, { 'label': 'marker' });
      assert.ok('fn' in cause);
      assert.deepStrictEqual(cause.items, input.diagnostics?.items);
    });
    return result;
  }

  static 'diagnostics-null-prototype'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'diagnostics-null-prototype'>): Promise<void> {
    const input = scenarioCase.input.invoker;
    const invoker = new SwallowingInvoker();
    const original = HookInvokerRunners.createDiagnosticsError(String(input.message));
    const details = HookInvokerRunners.createNullPrototypeRecord();
    Object.assign(details, input.diagnostics?.details);
    Reflect.set(original, 'details', details);

    const result = invoker.invokeAsync(String(input.hookName), async () => {
      await Promise.resolve();
      throw original;
    }).then(() => {
      const diagnostic = invoker.getHookErrors()[0];
      assert.ok(diagnostic instanceof HookInvocationError);
      assert.ok(Predicates.isRecord(diagnostic.cause));
      assert.deepStrictEqual(diagnostic.cause.details, input.diagnostics?.details);
    });
    return result;
  }

  static 'diagnostics-rich'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'diagnostics-rich'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new SwallowingInvoker();
    const original = HookInvokerRunners.createDiagnosticsError(String(input.message));
    Reflect.set(original, 'plain', input.diagnostics?.plain);
    Reflect.set(original, 'items', input.diagnostics?.items);
    Reflect.set(original, 'broken', () => {});

    const result = invoker.invokeAsync(String(input.hookName), async () => {
      await Promise.resolve();
      throw original;
    }).then(() => {
      const diagnostic = invoker.getHookErrors()[0];
      assert.ok(diagnostic instanceof HookInvocationError);
      const cause = diagnostic.cause;
      assert.ok(cause instanceof Error);
      assert.ok('broken' in cause && 'items' in cause && 'plain' in cause);
      assert.strictEqual(diagnostic.hookName, String(expected.firstHookName));
      assert.strictEqual(cause.message, String(expected.firstCauseMessage));
      const plain: unknown = Reflect.get(cause, 'plain');
      const items: unknown = Reflect.get(cause, 'items');
      assert.deepStrictEqual(plain, input.diagnostics?.plain);
      assert.deepStrictEqual(items, input.diagnostics?.items);
      assert.strictEqual(invoker.hookErrorCount, Number(expected.hookErrorCount));
    });
    return result;
  }

  static 'diagnostics-structured-clone'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'diagnostics-structured-clone'>): Promise<void> {
    const input = scenarioCase.input.invoker;
    const invoker = new SwallowingInvoker();
    const marker = new CloneableMarker();
    const original = HookInvokerRunners.createDiagnosticsError(String(input.message));
    Reflect.set(original, 'marker', marker);
    Reflect.set(original, 'items', input.diagnostics?.items);

    const result = invoker.invokeAsync(String(input.hookName), async () => {
      await Promise.resolve();
      throw original;
    }).then(() => {
      const diagnostic = invoker.getHookErrors()[0];
      assert.ok(diagnostic instanceof HookInvocationError);
      assert.ok(Predicates.isRecord(diagnostic.cause));
      const cause = diagnostic.cause;
      assert.deepStrictEqual(cause.marker, { 'label': 'cloneable', 'nested': { 'count': 2 } });
      assert.deepStrictEqual(cause.items, input.diagnostics?.items);
    });
    return result;
  }

  static 'diagnostics-sync'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'diagnostics-sync'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new SwallowingInvoker();
    const originalDetails: { 'labels': string[]; 'self'?: unknown } = { 'labels': ['initial'] };
    originalDetails.self = originalDetails;
    const original = RuntimeError.create(String(input.message), { 'cause': originalDetails });
    Reflect.set(original, 'details', originalDetails);

    invoker.invoke(String(input.hookName), () => {
      throw original;
    });

    const first = invoker.getHookErrors();
    assert.strictEqual(invoker.hookErrorCount, Number(expected.hookErrorCount));
    assert.strictEqual(first.length, Number(expected.hookErrorCount));
    assert.ok(first[0] instanceof HookInvocationError);
    assert.strictEqual(first[0]?.hookName, String(expected.firstHookName));
    const cause = first[0]?.cause;
    assert.ok(cause instanceof Error);
    assert.strictEqual(cause.message, String(expected.firstCauseMessage));
  }

  static 'invoke-async-reject'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'invoke-async-reject'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new RecordingInvoker();
    const original = RuntimeError.create(String(input.message));
    const returned = HookInvokerRunners.captureUnhandledRejections(async () => {
      const completion: void = invoker.invoke(String(input.hookName), async () => {
        await Promise.resolve();
        throw original;
      });
      assert.strictEqual(completion, undefined);
      await HookInvokerRunners.flushTurn();
      assert.deepStrictEqual(invoker.erroredHookNames, expected.erroredHookNames);
      assert.deepStrictEqual(invoker.causes, [original]);
      assert.deepStrictEqual(invoker.causes.map((entry) => {
        const result = (entry instanceof Error ? entry.message : String(entry));
        return result;
      }), expected.causeMessages);
    }).then((rejectionEvents) => {
      assert.strictEqual(rejectionEvents.length, Number(expected.unhandledRejections));
    });
    return returned;
  }

  static 'invoke-async-success'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'invoke-async-success'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new HookInvoker();
    let hookCompleted = false;
    const completion: void = invoker.invoke(String(input.hookName), async () => {
      if (input.delayMicrotask === true) {
        await Promise.resolve();
      }
      hookCompleted = true;
      return input.returnValue;
    });
    assert.strictEqual(completion, HookInvokerRunners.completionValue(expected.completion));
    const result = HookInvokerRunners.flushTurn().then(() => {
      assert.strictEqual(hookCompleted, Boolean(expected.hookCompleted));
    });
    return result;
  }

  static 'invoke-swallow-async'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'invoke-swallow-async'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new AsyncSwallowingInvoker();
    const result = HookInvokerRunners.captureUnhandledRejections(async () => {
      const completion: void = invoker.invoke(String(input.hookName), async () => {
        await Promise.resolve();
        throw RuntimeError.create(String(input.message));
      });
      assert.strictEqual(completion, HookInvokerRunners.completionValue(expected.completion));
      await HookInvokerRunners.flushTurn();
      assert.deepStrictEqual(invoker.erroredHookNames, expected.erroredHookNames);
    }).then((rejectionEvents) => {
      assert.strictEqual(rejectionEvents.length, Number(expected.unhandledRejections));
    });
    return result;
  }

  static 'invoke-swallow-sync'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'invoke-swallow-sync'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new SwallowingInvoker();
    const completion = invoker.invoke(String(input.hookName), () => {
      throw RuntimeError.create(String(input.message));
    });
    assert.strictEqual(completion, HookInvokerRunners.completionValue(expected.completion));
  }

  static 'invoke-sync-success'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'invoke-sync-success'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new HookInvoker();
    let hookRan = false;
    const completion: void = invoker.invoke(String(input.hookName), () => {
      hookRan = true;
      return input.returnValue;
    });
    assert.strictEqual(hookRan, true);
    assert.strictEqual(completion, HookInvokerRunners.completionValue(expected.completion));
  }

  static 'invoke-sync-throw'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'invoke-sync-throw'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new HookInvoker();
    const original = RuntimeError.create(String(input.message));
    assert.throws(() => {
      invoker.invoke(String(input.hookName), () => {
        throw original;
      });
    }, (error) => {
      HookInvokerRunners.assertErrorShape(error, String(expected.errorShape));
      assert.ok(error instanceof HookInvocationError);
      assert.strictEqual(error.hookName, String(expected.hookName));
      assert.strictEqual(error.cause, original);
      return true;
    });
  }

  static 'invoke-unexpected-async'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'invoke-unexpected-async'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new RecordingInvoker();
    const result = HookInvokerRunners.captureUnhandledRejections(async () => {
      const completion = invoker.invoke(String(input.hookName), async () => {
        await Promise.resolve();
        throw RuntimeError.create(String(input.message));
      });
      assert.strictEqual(completion, undefined);
      await HookInvokerRunners.flushTurn();
      assert.deepStrictEqual(invoker.erroredHookNames, expected.erroredHookNames);
    }).then((rejectionEvents) => {
      assert.strictEqual(rejectionEvents.length, Number(expected.unhandledRejections));
    });
    return result;
  }

  static 'invokeasync-async-success'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'invokeasync-async-success'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new HookInvoker();
    let hookCompleted = false;
    const completion = invoker.invokeAsync(String(input.hookName), async () => {
      if (input.delayMicrotask === true) {
        await Promise.resolve();
      }
      hookCompleted = true;
    });
    assert.strictEqual(hookCompleted, false);
    const returned = completion.then((result) => {
      assert.strictEqual(result, HookInvokerRunners.completionValue(expected.completion));
      assert.strictEqual(hookCompleted, Boolean(expected.hookCompleted));
    });
    return returned;
  }

  static 'invokeasync-async-throw'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'invokeasync-async-throw'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new HookInvoker();
    const original = RuntimeError.create(String(input.message));
    const result = assert.rejects(
      invoker.invokeAsync(String(input.hookName), async () => { await Promise.resolve(); throw original; }),
      (error) => {
        assert.ok(error instanceof HookInvocationError);
        assert.strictEqual(error.hookName, String(expected.hookName));
        assert.strictEqual(error.cause, original);
        return true;
      }
    );
    return result;
  }

  static 'invokeasync-function-thenable'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'invokeasync-function-thenable'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
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
    const completion: Promise<void> = invoker.invokeAsync(String(input.hookName), () => {return thenable;});
    assert.deepStrictEqual(events, expected.beforeCompletionEvents);
    const result = completion.then(() => {
      assert.deepStrictEqual(events, expected.afterCompletionEvents);
    });
    return result;
  }

  static 'invokeasync-sync-success'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'invokeasync-sync-success'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new HookInvoker();
    let hookRan = false;
    const completion: Promise<void> = invoker.invokeAsync(String(input.hookName), () => {
      hookRan = true;
      return input.returnValue;
    });
    assert.strictEqual(hookRan, Boolean(expected.hookRan));
    const returned = completion.then((result) => {
      assert.strictEqual(result, HookInvokerRunners.completionValue(expected.completion));
    });
    return returned;
  }

  static 'invokeasync-sync-throw'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'invokeasync-sync-throw'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new HookInvoker();
    const original = RuntimeError.create(String(input.message));
    const result = assert.rejects(
      invoker.invokeAsync(String(input.hookName), () => { throw original; }),
      (error) => {
        assert.ok(error instanceof HookInvocationError);
        assert.strictEqual(error.hookName, String(expected.hookName));
        assert.strictEqual(error.cause, original);
        return true;
      }
    );
    return result;
  }

  static 'invokeasync-thenable'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'invokeasync-thenable'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new HookInvoker();
    const events: string[] = [];
    const unexpectedlyAsyncHook = async (): Promise<void> => {
      events.push('started');
      await Promise.resolve();
      events.push('completed');
    };
    const completion: Promise<void> = invoker.invokeAsync(String(input.hookName), unexpectedlyAsyncHook);
    assert.deepStrictEqual(events, [String(expected.events?.[0])]);
    const result = completion.then(() => {
      assert.deepStrictEqual(events, expected.events);
    });
    return result;
  }

  static 'invokeasync-timeout'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'invokeasync-timeout'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new HookInvoker(HookInvokerRunners.toHookInvokerOptions(input.options));
    const result = assert.rejects(
      invoker.invokeAsync(String(input.hookName), () => {return new Promise(() => { /* never settles */ });}),
      (error) => {
        HookInvokerRunners.assertErrorShape(error, String(expected.errorShape));
        assert.ok(error instanceof HookInvocationError);
        HookInvokerRunners.assertErrorShape(error.cause, String(expected.causeShape));
        assert.ok(error.cause instanceof HookTimeoutError);
        assert.strictEqual(error.hookName, String(expected.hookName));
        assert.strictEqual(error.cause.hookName, String(expected.hookName));
        assert.strictEqual(error.cause.timeoutMs, Number(expected.causeTimeoutMs));
        const recorded = invoker.getHookErrors()[0];
        assert.ok(recorded instanceof HookInvocationError);
        assert.ok(recorded.cause instanceof HookTimeoutError);
        return true;
      }
    );
    return result;
  }

  static 'onhookerror-async-reject-invoke'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'onhookerror-async-reject-invoke'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new AsyncRejectingOnHookErrorInvoker();
    const result = HookInvokerRunners.captureUnhandledRejections(async () => {
      const completion: void = invoker.invoke(String(input.hookName), () => {
        throw RuntimeError.create(String(input.causeMessage));
      });
      assert.strictEqual(completion, undefined);
      await HookInvokerRunners.flushTurn();
    }).then((rejectionEvents) => {
      assert.strictEqual(rejectionEvents.length, Number(expected.unhandledRejections));
    });
    return result;
  }

  static 'onhookerror-async-reject-invokeasync'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'onhookerror-async-reject-invokeasync'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new AsyncRejectingOnHookErrorInvoker();
    const result = assert.rejects(
      invoker.invokeAsync(String(input.hookName), async () => {
        await Promise.resolve();
        throw RuntimeError.create(String(input.causeMessage));
      }),
      (error) => {
        assert.ok(error instanceof Error);
        assert.strictEqual(error.message, String(expected.terminalCauseMessage));
        return true;
      }
    );
    return result;
  }

  static 'onhookerror-loop-guard'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'onhookerror-loop-guard'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    LoopingOnHookErrorInvoker.callCount = 0;
    const invoker = new LoopingOnHookErrorInvoker();
    const completion: void = invoker.invoke(String(input.hookName), () => {
      throw RuntimeError.create(String(input.causeMessage));
    });
    assert.strictEqual(completion, undefined);
    const result = HookInvokerRunners.flushTurn().then(() => {
      assert.strictEqual(LoopingOnHookErrorInvoker.callCount, Number(expected.callCount));
      assert.strictEqual(invoker.getHookErrors().length, 1);
    });
    return result;
  }

  static 'onhookerror-sync-throw'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'onhookerror-sync-throw'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    class ThrowingOnHookErrorInvoker extends HookInvoker {
      protected override onHookError(hookName: string, cause: Error): void {
        throw RuntimeError.create(`custom failure for ${hookName}: ${String(cause)}`);
      }
    }

    const invoker = new ThrowingOnHookErrorInvoker();
    assert.throws(() => {
      invoker.invoke(String(input.hookName), () => {
        throw RuntimeError.create(String(input.causeMessage));
      });
    }, (error) => {
      assert.ok(error instanceof Error);
      for (const fragment of expected.messageIncludes ?? []) {
        assert.ok(error.message.includes(fragment));
      }
      assert.strictEqual(error instanceof HookInvocationError, expected.notHookInvocationError !== true);
      return true;
    });
  }

  static 'options-malformed'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'options-malformed'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    assert.strictEqual(HookInvokerOptionsEntity.validate(input.options), Boolean(expected.valid));
  }

  static 'options-no-options'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'options-no-options'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new HookInvoker();
    let hookRan = false;
    const completion = invoker.invoke(String(input.hookName), () => { hookRan = true; return input.returnValue; });
    assert.strictEqual(hookRan, Boolean(expected.hookRan));
    assert.strictEqual(completion, HookInvokerRunners.completionValue(expected.completion));
  }

  static 'options-non-positive'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'options-non-positive'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    assert.strictEqual(HookInvokerOptionsEntity.validate(input.options), Boolean(expected.valid));
  }

  static 'timeout-invoke-fire-and-forget'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'timeout-invoke-fire-and-forget'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new RecordingInvoker(HookInvokerRunners.toHookInvokerOptions(input.options));
    const result = HookInvokerRunners.captureUnhandledRejections(async () => {
      const completion: void = invoker.invoke(String(input.hookName), () => {return new Promise(() => {});});
      assert.strictEqual(completion, undefined);
      await new Promise((resolve) => { setTimeout(resolve, Number(input.observationDelayMs)); });
      assert.deepStrictEqual(invoker.erroredHookNames, expected.erroredHookNames);
      const cause = invoker.causes[0];
      HookInvokerRunners.assertErrorShape(cause, String(expected.causeShape));
      assert.ok(cause instanceof HookTimeoutError);
      assert.strictEqual(cause.hookName, String(expected.erroredHookNames?.[0]));
      assert.strictEqual(cause.timeoutMs, Number(expected.causeTimeoutMs));
    }).then((rejectionEvents) => {
      assert.strictEqual(rejectionEvents.length, Number(expected.unhandledRejections));
    });
    return result;
  }

  static 'timeout-invokeasync-fast'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'timeout-invokeasync-fast'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new HookInvoker(HookInvokerRunners.toHookInvokerOptions(input.options));
    let hookCompleted = false;
    const completion = invoker.invokeAsync(String(input.hookName), async () => {
      await new Promise((resolve) => { setTimeout(resolve, Number(input.delayMs)); });
      hookCompleted = true;
    });
    const returned = completion.then((result) => {
      assert.strictEqual(result, HookInvokerRunners.completionValue(expected.completion));
      assert.strictEqual(hookCompleted, Boolean(expected.hookCompleted));
    });
    return returned;
  }

  static 'timeout-no-dangling-timer'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'timeout-no-dangling-timer'>): Promise<void> {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new HookInvoker(HookInvokerRunners.toHookInvokerOptions(input.options));
    const clearTimeoutSpy = mock.method(globalThis, 'clearTimeout');
    const result = HookInvokerRunners.captureUnhandledRejections(async () => {
      const completion = invoker.invokeAsync(String(input.hookName), async () => { await Promise.resolve(); return 'discarded'; });
      await completion;
      await new Promise((resolve) => { setTimeout(resolve, Number(input.observationDelayMs)); });
    }).then((rejectionEvents) => {
      assert.strictEqual(rejectionEvents.length, Number(expected.unhandledRejections));
      // The timeout race's timer must be cleared once the hook settles, not left
      // dangling until it eventually fires on its own.
      assert.strictEqual(clearTimeoutSpy.mock.callCount(), 1);
    }).finally(() => {
      clearTimeoutSpy.mock.restore();
    });
    return result;
  }

  static 'timeout-sync-never-applies'(scenarioCase: ScenarioCaseOfType<HookInvokerScenarioCaseEntity.Type, 'timeout-sync-never-applies'>): void {
    const expected = scenarioCase.expected;
    const input = scenarioCase.input.invoker;
    const invoker = new HookInvoker(HookInvokerRunners.toHookInvokerOptions(input.options));
    let hookRan = false;
    const completion = invoker.invoke(String(input.hookName), () => {
      hookRan = true;
      return input.returnValue;
    });
    assert.strictEqual(hookRan, Boolean(expected.hookRan));
    assert.strictEqual(completion, HookInvokerRunners.completionValue(expected.completion));
  }

  private static toHookInvokerOptions(rawOptions: unknown): HookInvokerOptionsEntity.InputType | undefined {
    const result = rawOptions === undefined ? undefined : HookInvokerOptionsEntity.intake(rawOptions);
    return result;
  }

  private static createNullPrototypeRecord(): Record<string, unknown> {
    const result = ScenarioValues.requireRecord(Object.create(null), 'null-prototype record');
    return result;
  }

  private static createDiagnosticsError(message: string): RuntimeError {
    const details: { 'labels': string[]; 'self'?: unknown } = { 'labels': ['initial'] };
    details.self = details;
    const error = RuntimeError.create(message, { 'cause': details });
    Reflect.set(error, 'details', details);
    return error;
  }

  private static async flushTurn(): Promise<void> {
    await new Promise<void>((resolve) => { setImmediate(resolve); });
  }

  private static async captureUnhandledRejections(action: () => Promise<void> | void): Promise<Error[]> {
    const rejectionEvents: Error[] = [];
    const onUnhandledRejection = (reason: Error): void => {
      rejectionEvents.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      await action();
      await HookInvokerRunners.flushTurn();
      return rejectionEvents;
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }


  private static assertErrorShape(value: unknown, shape: string): void {
    if (shape === 'HookInvocationError') {
      assert.ok(value instanceof HookInvocationError);
    } else if (shape === 'HookTimeoutError') {
      assert.ok(value instanceof HookTimeoutError);
    } else {
      assert.fail(`Unknown error shape: ${shape}`);
    }
  }

  private static completionValue(completion: JSONSchema7Type | undefined): unknown {
    const result = Predicates.isRecord(completion) && completion.shape === 'undefined' ? undefined : completion;
    return result;
  }
}

ScenarioSuite.register({
  'entity': HookInvokerScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'HookInvoker',
  'runners': HookInvokerRunners
});
