import type { ErrorClassificationEntity } from '@studnicky/errors/entities';
import type { HookInvocationError } from '@studnicky/errors/node';
import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';

import type { CircuitBreakerOptionsEntity } from '../../../src/entities/index.js';
import type { CircuitBreakerCollaboratorsInterface } from '../../../src/index.js';

import { CircuitStateEntity } from '../../../src/entities/index.js';
import { CircuitBreaker, CircuitBreakerOpenError, ResilienceConfigError } from '../../../src/index.js';
import { CircuitBreakerScenarioCaseEntity } from '../entities/CircuitBreakerScenarioCaseEntity.js';
import scenarioGroups from './circuit-breaker.scenarios.json' with { 'type': 'json' };

class ObservedBreaker extends CircuitBreaker {
  readonly events: string[] = [];
  constructor(config: unknown, collaborators: CircuitBreakerCollaboratorsInterface = {}) { super(config, collaborators); }
  protected override onSuccess(): void { this.events.push('success'); }
  protected override onFailure(_error: Error): void { this.events.push('failure'); }
  protected override onTrip(): void { this.events.push('trip'); }
  protected override onOpen(): void { this.events.push('open'); }
  protected override onHalfOpen(): void { this.events.push('halfOpen'); }
  protected override onClose(): void { this.events.push('close'); }
  protected override onReject(): void { this.events.push('reject'); }
}

class TransientError extends BaseError {
  public override readonly name: string = 'TransientError';

  public constructor(message: string) {
    super({
      'code': 'resilience.transient',
      'message': message,
      'retryable': true
    });
  }
}

class RealError extends BaseError {
  public override readonly name: string = 'RealError';

  public constructor(message: string) {
    super({
      'code': 'resilience.real',
      'message': message
    });
  }
}

class ClassifyingBreaker extends CircuitBreaker {
  protected override classifyError(error: Error): ErrorClassificationEntity.Type {
    return { 'retryable': error instanceof TransientError };
  }
}

class ThrowingSuccessBreaker extends CircuitBreaker {
  protected override onSuccess(): void { throw RuntimeError.create('onSuccess boom'); }
}

class ThrowingRejectBreaker extends CircuitBreaker {
  protected override onReject(): void { throw RuntimeError.create('onReject boom'); }
}

class ThrowingTripBreaker extends CircuitBreaker {
  protected override onTrip(): void { throw RuntimeError.create('onTrip boom'); }
}

class RecordingBreaker extends CircuitBreaker {
  constructor(config: unknown, collaborators: CircuitBreakerCollaboratorsInterface) { super(config, collaborators); }
  get recordedHookErrors(): readonly HookInvocationError[] {
    const result = this.hooks.getHookErrors();
    return result;
  }
}

class CircuitBreakerRunners {
  static async 'cb-async-hook-isolation'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-async-hook-isolation'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (): void => { rejectionEvents.push(undefined); };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const firstCause = RuntimeError.create(input.first);
      const secondCause = RuntimeError.create(input.second);
      const first = new RecordingBreaker(...CircuitBreakerRunners.circuitBreakerOptions(input));
      Object.assign(first, {
        'onSuccess': async (): Promise<void> => {
          await Promise.resolve();
          throw firstCause;
        }
      });
      const second = new RecordingBreaker(...CircuitBreakerRunners.circuitBreakerOptions(input));
      Object.assign(second, {
        'onSuccess': async (): Promise<void> => {
          await Promise.resolve();
          throw secondCause;
        }
      });
      const results = await Promise.all([first.execute(CircuitBreakerRunners.succeed), second.execute(CircuitBreakerRunners.succeed)]);
      assert.deepEqual(results, expected.results);
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.equal(rejectionEvents.length, expected.rejections);
      const firstErrors = first.recordedHookErrors;
      const secondErrors = second.recordedHookErrors;
      assert.equal(firstErrors.length, expected.recordedErrors);
      assert.equal(firstErrors[0]?.hookName, 'onSuccess');
      assert.ok(firstErrors[0]?.cause instanceof Error);
      assert.equal(firstErrors[0].cause.message, firstCause.message);
      assert.equal(secondErrors.length, expected.recordedErrors);
      assert.equal(secondErrors[0]?.hookName, 'onSuccess');
      assert.ok(secondErrors[0]?.cause instanceof Error);
      assert.equal(secondErrors[0].cause.message, secondCause.message);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static async 'cb-close-on-success-threshold'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-close-on-success-threshold'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const clock = input.clock;
    let time = clock[0] ?? 0;
    const circuitBreaker = CircuitBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input, { 'clock': () => {return time;} }));
    await assert.rejects(() => {
      const result = circuitBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    time = clock[1] ?? time;
    await circuitBreaker.execute(CircuitBreakerRunners.succeed);
    assert.equal(circuitBreaker.state, 'halfOpen');
    await circuitBreaker.execute(CircuitBreakerRunners.succeed);
    assert.equal(circuitBreaker.state, 'closed');
  }

  static async 'cb-config-classifier-failing'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-config-classifier-failing'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const classifier = CircuitBreakerRunners.classifyTransientError;
    const circuitBreaker = CircuitBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input, { 'errorClassifier': classifier }));
    await assert.rejects(() => {
      const result = circuitBreaker.execute(async () => { await Promise.resolve(); throw new RealError('real'); });
      return result;
    });
    assert.equal(circuitBreaker.state, 'closed');
    await assert.rejects(() => {
      const result = circuitBreaker.execute(async () => { await Promise.resolve(); throw new RealError('real'); });
      return result;
    });
    assert.equal(circuitBreaker.state, 'open');
  }

  static async 'cb-config-classifier-retryable'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-config-classifier-retryable'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const classifier = CircuitBreakerRunners.classifyTransientError;
    const circuitBreaker = CircuitBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input, { 'errorClassifier': classifier }));
    for (let count = 0; count < expected.retryableFailures; count += 1) {
      await assert.rejects(() => {
        const result = circuitBreaker.execute(async () => { await Promise.resolve(); throw new TransientError('transient'); });
        return result;
      });
    }
    assert.equal(circuitBreaker.state, 'closed');
  }

  static async 'cb-config-classifier-throws-original'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-config-classifier-throws-original'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const classifier = CircuitBreakerRunners.createErrorClassifier(true);
    const circuitBreaker = CircuitBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input, { 'errorClassifier': classifier }));
    await assert.rejects(() => {
      const result = circuitBreaker.execute(async () => { await Promise.resolve(); throw new TransientError('transient'); });
      return result;
    }, (error: unknown) => {
      const result = CircuitBreakerRunners.isResilienceErrorType(error, expected.thrown);
      return result;
    });
    assert.equal(circuitBreaker.state, 'closed');
  }

  static async 'cb-config-overrides-subclass'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-config-overrides-subclass'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const classifier = CircuitBreakerRunners.createErrorClassifier(false);
    const circuitBreaker = ClassifyingBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input, { 'errorClassifier': classifier }));
    await assert.rejects(() => {
      const result = circuitBreaker.execute(async () => { await Promise.resolve(); throw new TransientError('transient'); });
      return result;
    });
    assert.equal(circuitBreaker.state, 'open');
  }

  static async 'cb-default-classification'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-default-classification'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const circuitBreaker = CircuitBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input));
    await assert.rejects(() => {
      const result = circuitBreaker.execute(async () => { await Promise.resolve(); throw new TransientError('transient'); });
      return result;
    });
    assert.equal(circuitBreaker.state, 'closed');
    await assert.rejects(() => {
      const result = circuitBreaker.execute(async () => { await Promise.resolve(); throw new TransientError('transient'); });
      return result;
    });
    assert.equal(circuitBreaker.state, 'open');
  }

  static 'cb-force-open'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-force-open'>): void {
    const input = scenarioCase.input.resilience;
    const circuitBreaker = CircuitBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input));
    circuitBreaker.forceOpen();
    assert.equal(circuitBreaker.state, 'open');
  }

  static async 'cb-halfopen-reopen'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-halfopen-reopen'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const clock = input.clock;
    let time = clock[0] ?? 0;
    const circuitBreaker = CircuitBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input, { 'clock': () => {return time;} }));
    await assert.rejects(() => {
      const result = circuitBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    time = clock[1] ?? time;
    await assert.rejects(() => {
      const result = circuitBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    assert.equal(circuitBreaker.state, 'open');
  }

  static async 'cb-halfopen-transition'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-halfopen-transition'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const clock = input.clock;
    let time = clock[0] ?? 0;
    const circuitBreaker = CircuitBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input, { 'clock': () => {return time;} }));
    await assert.rejects(() => {
      const result = circuitBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    assert.equal(circuitBreaker.state, 'open');
    time = clock[1] ?? time;
    await circuitBreaker.execute(CircuitBreakerRunners.succeed);
    assert.equal(circuitBreaker.state, 'closed');
  }

  static async 'cb-hook-fires-exactly-once'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-hook-fires-exactly-once'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const clock = input.clock;

    // Reopen path: closed → open (trip) → halfOpen → open (reopen, no trip).
    let reopenTime = clock[0] ?? 0;
    const reopenBreaker = new ObservedBreaker(...CircuitBreakerRunners.circuitBreakerOptions(input, { 'clock': () => {return reopenTime;} }));
    await assert.rejects(() => {
      const result = reopenBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    await assert.rejects(() => {
      const result = reopenBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    assert.equal(reopenBreaker.state, 'open');
    reopenTime = clock[1] ?? reopenTime;
    await assert.rejects(() => {
      const result = reopenBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    assert.equal(reopenBreaker.state, 'open');
    const reopenCounts = CircuitBreakerRunners.countEvents(reopenBreaker.events);
    assert.equal(reopenCounts.get('trip'), 1);
    assert.equal(reopenCounts.get('open'), 2);
    assert.equal(reopenCounts.get('halfOpen'), 1);
    assert.equal(reopenCounts.get('failure'), 3);
    assert.equal(reopenCounts.get('close') ?? 0, 0);
    assert.equal(reopenCounts.get('success') ?? 0, 0);

    // Close path: closed → open (trip) → halfOpen → closed (trial successes).
    let closeTime = clock[0] ?? 0;
    const closeBreaker = new ObservedBreaker(...CircuitBreakerRunners.circuitBreakerOptions(input, { 'clock': () => {return closeTime;} }));
    await assert.rejects(() => {
      const result = closeBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    await assert.rejects(() => {
      const result = closeBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    closeTime = clock[1] ?? closeTime;
    await closeBreaker.execute(CircuitBreakerRunners.succeed);
    await closeBreaker.execute(CircuitBreakerRunners.succeed);
    assert.equal(closeBreaker.state, 'closed');
    const closeCounts = CircuitBreakerRunners.countEvents(closeBreaker.events);
    assert.equal(closeCounts.get('trip'), 1);
    assert.equal(closeCounts.get('open'), 1);
    assert.equal(closeCounts.get('halfOpen'), 1);
    assert.equal(closeCounts.get('success'), 2);
    assert.equal(closeCounts.get('close'), 1);
    assert.equal(closeCounts.get('failure'), 2);
  }

  static async 'cb-hook-swallows'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-hook-swallows'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const successBreaker = ThrowingSuccessBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input));
    assert.equal(await successBreaker.execute(CircuitBreakerRunners.succeed), 'ok');
    assert.equal(successBreaker.state, 'closed');
    const rejectBreaker = ThrowingRejectBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input, {
      'failureThreshold': input.rejectFailureThreshold,
      'resetTimeoutMs': input.rejectResetTimeoutMs
    }));
    await assert.rejects(() => {
      const result = rejectBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    await assert.rejects(() => {
      const result = rejectBreaker.execute(CircuitBreakerRunners.succeed);
      return result;
    }, (error) => {
      const result = error instanceof CircuitBreakerOpenError;
      return result;
    });
    const tripBreaker = ThrowingTripBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input, {
      'failureThreshold': input.tripFailureThreshold
    }));
    await assert.rejects(() => {
      const result = tripBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    }, (error) => {
      const result = error instanceof Error && error.message === 'failure';
      return result;
    });
    assert.equal(tripBreaker.state, expected.openState);
  }

  static 'cb-invalid-failure-threshold'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-invalid-failure-threshold'>): void {
    const input = scenarioCase.input.resilience;
    assert.throws(() => { CircuitBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input)); }, ResilienceConfigError);
  }

  static 'cb-invalid-reset-timeout'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-invalid-reset-timeout'>): void {
    const input = scenarioCase.input.resilience;
    assert.throws(() => { CircuitBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input)); }, ResilienceConfigError);
  }

  static async 'cb-observed-close'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-observed-close'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const clock = input.clock;
    let time = clock[0] ?? 0;
    const circuitBreaker = new ObservedBreaker(...CircuitBreakerRunners.circuitBreakerOptions(input, { 'clock': () => {return time;} }));
    await assert.rejects(() => {
      const result = circuitBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    time = clock[1] ?? time;
    await circuitBreaker.execute(CircuitBreakerRunners.succeed);
    assert.ok(circuitBreaker.events.includes('close'));
    const resetBreaker = new ObservedBreaker(...CircuitBreakerRunners.circuitBreakerOptions(input));
    await assert.rejects(() => {
      const result = resetBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    resetBreaker.events.length = 0;
    resetBreaker.reset();
    assert.ok(resetBreaker.events.includes('close'));
  }

  static async 'cb-observed-failure'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-observed-failure'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const circuitBreaker = new ObservedBreaker(...CircuitBreakerRunners.circuitBreakerOptions(input));
    await assert.rejects(() => {
      const result = circuitBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    assert.ok(circuitBreaker.events.includes('failure'));
  }

  static async 'cb-observed-halfopen'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-observed-halfopen'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const clock = input.clock;
    let time = clock[0] ?? 0;
    const circuitBreaker = new ObservedBreaker(...CircuitBreakerRunners.circuitBreakerOptions(input, { 'clock': () => {return time;} }));
    await assert.rejects(() => {
      const result = circuitBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    time = clock[1] ?? time;
    await circuitBreaker.execute(CircuitBreakerRunners.succeed);
    assert.ok(circuitBreaker.events.includes('halfOpen'));
  }

  static async 'cb-observed-open'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-observed-open'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const forceBreaker = new ObservedBreaker(...CircuitBreakerRunners.circuitBreakerOptions(input));
    forceBreaker.forceOpen();
    assert.ok(forceBreaker.events.includes('open'));
    const clock = input.clock;
    let time = clock[0] ?? 0;
    const circuitBreaker = new ObservedBreaker(...CircuitBreakerRunners.circuitBreakerOptions(input, {
      'clock': () => {return time;},
      'failureThreshold': input.reopenFailureThreshold
    }));
    await assert.rejects(() => {
      const result = circuitBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    circuitBreaker.events.length = 0;
    time = clock[1] ?? time;
    await assert.rejects(() => {
      const result = circuitBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    assert.ok(circuitBreaker.events.includes('open'));
    assert.ok(!circuitBreaker.events.includes('trip'));
  }

  static async 'cb-observed-reject'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-observed-reject'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const circuitBreaker = new ObservedBreaker(...CircuitBreakerRunners.circuitBreakerOptions(input));
    await assert.rejects(() => {
      const result = circuitBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    circuitBreaker.events.length = 0;
    await assert.rejects(() => {
      const result = circuitBreaker.execute(CircuitBreakerRunners.succeed);
      return result;
    }, (error) => {
      const result = error instanceof CircuitBreakerOpenError;
      return result;
    });
    assert.ok(circuitBreaker.events.includes('reject'));
  }

  static async 'cb-observed-success'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-observed-success'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const circuitBreaker = new ObservedBreaker(...CircuitBreakerRunners.circuitBreakerOptions(input));
    await circuitBreaker.execute(CircuitBreakerRunners.succeed);
    assert.deepEqual(circuitBreaker.events, ['success']);
  }

  static async 'cb-observed-trip-open'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-observed-trip-open'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const circuitBreaker = new ObservedBreaker(...CircuitBreakerRunners.circuitBreakerOptions(input));
    await assert.rejects(() => {
      const result = circuitBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    await assert.rejects(() => {
      const result = circuitBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    const tripIndex = circuitBreaker.events.indexOf('trip');
    const openIndex = circuitBreaker.events.indexOf('open');
    assert.ok(tripIndex !== -1);
    assert.ok(openIndex !== -1);
    assert.ok(tripIndex < openIndex);
  }

  static async 'cb-open-error'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-open-error'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const circuitBreaker = CircuitBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input));
    await assert.rejects(() => {
      const result = circuitBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    assert.equal(circuitBreaker.state, 'open');
    if (expected.openError) {
      await assert.rejects(() => {
        const result = circuitBreaker.execute(CircuitBreakerRunners.succeed);
        return result;
      }, (error) => {
        const result = error instanceof CircuitBreakerOpenError;
        return result;
      });
    } else {
      await circuitBreaker.execute(CircuitBreakerRunners.succeed);
    }
  }

  static async 'cb-open-error-name'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-open-error-name'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const circuitBreaker = CircuitBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input));
    await assert.rejects(() => {
      const result = circuitBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    if (expected.openError) {
      await assert.rejects(
        () => {
          const result = circuitBreaker.execute(CircuitBreakerRunners.succeed);
          return result;
        },
        (error) => {
          const result = error instanceof CircuitBreakerOpenError && error.message.includes(expected.messageIncludes);
          return result;
        }
      );
    } else {
      await circuitBreaker.execute(CircuitBreakerRunners.succeed);
    }
  }

  static async 'cb-reset-control'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-reset-control'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const circuitBreaker = CircuitBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input));
    await assert.rejects(() => {
      const result = circuitBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    circuitBreaker.reset();
    assert.equal(circuitBreaker.state, expected.stateAfterReset);
  }

  static async 'cb-reset-success'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-reset-success'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const circuitBreaker = CircuitBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input));
    await assert.rejects(() => {
      const returned = circuitBreaker.execute(CircuitBreakerRunners.fail);
      return returned;
    });
    circuitBreaker.reset();
    assert.equal(await circuitBreaker.execute(CircuitBreakerRunners.succeed), expected.result);
  }

  static 'cb-starts-closed'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-starts-closed'>): void {
    const input = scenarioCase.input.resilience;
    assert.equal(CircuitBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input)).state, 'closed');
  }

  static 'cb-state-entity'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-state-entity'>): void {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const validStates = new Set(expected.validStates);
    for (let stateIndex = 0; stateIndex < input.states.length; stateIndex += 1) {
      const state = ScenarioValues.requireDefined(input.states[stateIndex], 'Scenario input.states[stateIndex]');
      assert.equal(CircuitStateEntity.validate(state), validStates.has(state));
    }
    assert.equal(CircuitStateEntity.validate(expected.invalidState), false);
  }

  static async 'cb-stays-open'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-stays-open'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const clock = input.clock;
    let time = clock[0] ?? 0;
    const circuitBreaker = CircuitBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input, { 'clock': () => {return time;} }));
    await assert.rejects(() => {
      const result = circuitBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    assert.equal(circuitBreaker.state, 'open');
    time = clock[1] ?? time;
    await assert.rejects(() => {
      const result = circuitBreaker.execute(CircuitBreakerRunners.succeed);
      return result;
    }, (error) => {
      const result = error instanceof CircuitBreakerOpenError;
      return result;
    });
    assert.equal(circuitBreaker.state, 'open');
  }

  static async 'cb-subclass-classifier'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-subclass-classifier'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const circuitBreaker = ClassifyingBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input));
    await assert.rejects(() => {
      const result = circuitBreaker.execute(async () => { await Promise.resolve(); throw new TransientError('transient'); });
      return result;
    });
    await assert.rejects(() => {
      const result = circuitBreaker.execute(async () => { await Promise.resolve(); throw new TransientError('transient'); });
      return result;
    });
    assert.equal(circuitBreaker.state, 'closed');
    await assert.rejects(() => {
      const result = circuitBreaker.execute(async () => { await Promise.resolve(); throw new RealError('real'); });
      return result;
    });
    assert.equal(circuitBreaker.state, 'closed');
    await assert.rejects(() => {
      const result = circuitBreaker.execute(async () => { await Promise.resolve(); throw new RealError('real'); });
      return result;
    });
    assert.equal(circuitBreaker.state, 'open');
  }

  static async 'cb-success-resets'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-success-resets'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const expected = scenarioCase.expected;
    const circuitBreaker = CircuitBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input));
    const sequence = input.sequence;
    const finalAction = sequence[sequence.length - 1];
    if (finalAction === undefined) {
      throw RuntimeError.create('Expected non-empty CircuitBreaker scenario action sequence');
    }
    for (let index = 0; index < sequence.length - 1; index += 1) {
      await CircuitBreakerRunners.performAction(circuitBreaker, ScenarioValues.requireDefined(sequence[index], 'Scenario sequence[index]'));
    }
    assert.equal(circuitBreaker.state, expected.stateBeforeFinalFailure);
    await CircuitBreakerRunners.performAction(circuitBreaker, finalAction);
    assert.equal(circuitBreaker.state, expected.finalState);
  }

  static async 'cb-trips-open'(scenarioCase: ScenarioCaseOfType<CircuitBreakerScenarioCaseEntity.Type, 'cb-trips-open'>): Promise<void> {
    const input = scenarioCase.input.resilience;
    const circuitBreaker = CircuitBreaker.create(...CircuitBreakerRunners.circuitBreakerOptions(input));
    await assert.rejects(() => {
      const result = circuitBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    assert.equal(circuitBreaker.state, 'closed');
    await assert.rejects(() => {
      const result = circuitBreaker.execute(CircuitBreakerRunners.fail);
      return result;
    });
    assert.equal(circuitBreaker.state, 'open');
  }

  private static classifyTransientError(error: Error): ErrorClassificationEntity.Type {
    return { 'retryable': error instanceof TransientError };
  }

  private static createErrorClassifier(retryable: boolean): () => ErrorClassificationEntity.Type {
    return () => {return { 'retryable': retryable };};
  }

  static async succeed(): Promise<string> {
    await Promise.resolve();
    return 'ok';
  }

  static async fail(): Promise<never> {
    await Promise.resolve();
    throw RuntimeError.create('failure');
  }

  private static countEvents(events: readonly string[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (let index = 0; index < events.length; index += 1) {
      const event = ScenarioValues.requireDefined(events[index], 'events[index]');
      counts.set(event, (counts.get(event) ?? 0) + 1);
    }
    return counts;
  }

  private static circuitBreakerOptions(input: CircuitBreakerOptionsEntity.InputType, extra: CircuitBreakerCollaboratorsInterface & { 'failureThreshold'?: number; 'resetTimeoutMs'?: number } = {}): readonly [unknown, CircuitBreakerCollaboratorsInterface] {
    const { clock, errorClassifier, ...schemaExtra } = extra;
    const options: CircuitBreakerOptionsEntity.InputType = {
      'failureThreshold': input.failureThreshold,
      'resetTimeoutMs': input.resetTimeoutMs,
      ...schemaExtra
    };
    const name = input.name;
    if (typeof name === 'string') {
      options.name = name;
    }
    const successThreshold = input.successThreshold;
    if (successThreshold !== undefined) {
      options.successThreshold = successThreshold;
    }
    return [
      options,
      {
        ...(clock === undefined ? {} : { 'clock': clock }),
        ...(errorClassifier === undefined ? {} : { 'errorClassifier': errorClassifier })
      }
    ];
  }

  private static isResilienceErrorType(error: unknown, name: string): boolean {
    if (name === 'RealError') {
      const result = error instanceof RealError;
      return result;
    }
    if (name === 'TransientError') {
      const result = error instanceof TransientError;
      return result;
    }
    throw RuntimeError.create(`Unknown resilience error type name: ${name}`);
  }

  private static async performAction(circuitBreaker: CircuitBreaker, action: string): Promise<void> {
    if (action === 'fail') {
      await assert.rejects(() => {
        const result = circuitBreaker.execute(CircuitBreakerRunners.fail);
        return result;
      });
    } else if (action === 'success') {
      await circuitBreaker.execute(CircuitBreakerRunners.succeed);
    } else {
      throw RuntimeError.create(`Unknown CircuitBreaker scenario action: ${action}`);
    }
  }
}

ScenarioSuite.register({
  'entity': CircuitBreakerScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'CircuitBreaker',
  'runners': CircuitBreakerRunners
});
