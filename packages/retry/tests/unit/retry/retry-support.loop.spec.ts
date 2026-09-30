import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ConfigurationError } from '@studnicky/config/node';
import { SchemaIntakeError } from '@studnicky/entity/node';
import { DefaultHttpErrorClassifier } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { it } from 'node:test';

import type {
  RetryConfigInterface,
  RetryContextInterface
} from '../../../src/interfaces/index.js';

import { BackoffConfigEntity, RetryCallStateEntity, RetryCallTransitionEventEntity, RetryConfigEntity, RetryContextDataEntity } from '../../../src/entities/index.js';
import {
  BackoffStrategy,
  Retry
} from '../../../src/index.js';
import { RetryBackoffStrategyGuard } from '../../../src/retry/RetryBackoffStrategyGuard.js';
import { RetrySupportScenarioCaseEntity } from '../entities/RetrySupportScenarioCaseEntity.js';
import { FlakyOperation } from './fixtures/FlakyOperation.js';
import scenarioGroups from './retry-support.scenarios.json' with { 'type': 'json' };

class RecordingRetry extends Retry {
  readonly recordedDelays: number[] = [];

  constructor(config?: RetryConfigInterface) {
    super(config ?? {});
  }

  protected override async onRetryScheduled(context: RetryContextInterface): Promise<void> {
    await super.onRetryScheduled(context);
    this.recordedDelays.push(context.delayMs);
    context.delayMs = 0;
  }
}

class OverridingRetry extends Retry {
  readonly overrideDelays: number[] = [];

  constructor(config?: RetryConfigInterface) {
    super(config ?? {});
  }

  protected override onRetryScheduled(context: RetryContextInterface): void {
    context.delayMs = 0;
    this.overrideDelays.push(context.delayMs);
  }
}

class RetrySupportRunners {
  /** Reads a property off a deliberately-untrusted `retry`/`value` fixture field without asserting its shape. */
  private static readUnknownProperty(source: unknown, key: string): unknown {
    const value: unknown = typeof source === 'object' && source !== null ? Reflect.get(source, key) : undefined;
    return value;
  }

  private static createBackoffConfig(config: unknown): { 'baseDelayMs': number; 'strategy': typeof BackoffStrategy.exponential } {
    const baseDelayMs = this.readUnknownProperty(config, 'baseDelayMs');
    const backoffConfig = {
      'baseDelayMs': typeof baseDelayMs === 'number' ? baseDelayMs : 100,
      'strategy': BackoffStrategy.exponential
    };
    return backoffConfig;
  }

  private static readBatchSampleCount(input: RetrySupportScenarioCaseEntity.Type['input']): number {
    const sampleCount = Number(input.batch?.sampleCount);
    return sampleCount;
  }

  private static async executeUntilConfiguredSuccess(retry: Retry, input: RetrySupportScenarioCaseEntity.Type['input']): Promise<void> {
    await FlakyOperation.execute(retry, Number(input.batch?.failureCountBeforeSuccess ?? 0), String(input.errorMessage), String(input.result));
  }

  private static assertConfigGuard(scenarioCase: RetrySupportScenarioCaseEntity.Type): void {
    const { expected, input } = scenarioCase;

    if (expected.result === true) {
      assert.doesNotThrow(() => {
        RetryConfigEntity.intake(input.retry ?? {});
      });
    } else {
      assert.throws(() => {
        RetryConfigEntity.intake(input.retry ?? {});
      }, SchemaIntakeError);
    }
  }

  private static assertBackoffStrategyRejected(scenarioCase: RetrySupportScenarioCaseEntity.Type): void {
    const { input } = scenarioCase;

    assert.throws(() => {
      RetryBackoffStrategyGuard.validate({ 'backoffStrategy': this.readUnknownProperty(input.retry, 'backoffStrategy') });
    }, ConfigurationError);
  }

  static async 'backoff-config-default'(scenarioCase: ScenarioCaseOfType<RetrySupportScenarioCaseEntity.Type, 'backoff-config-default'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const retry = new RecordingRetry({
      'errorClassifier': DefaultHttpErrorClassifier.create(),
      'maximumRetries': Number(this.readUnknownProperty(input.retry, 'maximumRetries'))
    });

    await this.executeUntilConfiguredSuccess(retry, input);

    assert.deepEqual(retry.recordedDelays, expected.recordedDelays);
  }

  static async 'backoff-config-exponential'(scenarioCase: ScenarioCaseOfType<RetrySupportScenarioCaseEntity.Type, 'backoff-config-exponential'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const retry = new RecordingRetry({
      'backoffStrategy': this.createBackoffConfig(this.readUnknownProperty(input.retry, 'backoffStrategy')),
      'errorClassifier': DefaultHttpErrorClassifier.create(),
      'maximumRetries': Number(this.readUnknownProperty(input.retry, 'maximumRetries'))
    });

    await this.executeUntilConfiguredSuccess(retry, input);

    assert.deepEqual(retry.recordedDelays, expected.recordedDelays);
  }

  static async 'backoff-config-override'(scenarioCase: ScenarioCaseOfType<RetrySupportScenarioCaseEntity.Type, 'backoff-config-override'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const retry = new OverridingRetry({
      'backoffStrategy': this.createBackoffConfig(this.readUnknownProperty(input.retry, 'backoffStrategy')),
      'errorClassifier': DefaultHttpErrorClassifier.create(),
      'maximumRetries': Number(this.readUnknownProperty(input.retry, 'maximumRetries'))
    });

    await this.executeUntilConfiguredSuccess(retry, input);

    assert.deepEqual(retry.overrideDelays, expected.overrideDelays);
    const allZero = retry.overrideDelays.every((delay) => {
      const isZero = delay === 0;
      return isZero;
    });
    assert.equal(allZero, true);
  }

  static 'backoff-strategy-bad-delay'(scenarioCase: ScenarioCaseOfType<RetrySupportScenarioCaseEntity.Type, 'backoff-strategy-bad-delay'>): void {
    this.assertBackoffStrategyRejected(scenarioCase);
  }

  static 'backoff-strategy-missing-fn'(scenarioCase: ScenarioCaseOfType<RetrySupportScenarioCaseEntity.Type, 'backoff-strategy-missing-fn'>): void {
    this.assertBackoffStrategyRejected(scenarioCase);
  }

  static 'backoff-strategy-non-object'(scenarioCase: ScenarioCaseOfType<RetrySupportScenarioCaseEntity.Type, 'backoff-strategy-non-object'>): void {
    this.assertBackoffStrategyRejected(scenarioCase);
  }

  static 'config-guard-bad-type'(scenarioCase: ScenarioCaseOfType<RetrySupportScenarioCaseEntity.Type, 'config-guard-bad-type'>): void {
    this.assertConfigGuard(scenarioCase);
  }

  static 'config-guard-unknown-key'(scenarioCase: ScenarioCaseOfType<RetrySupportScenarioCaseEntity.Type, 'config-guard-unknown-key'>): void {
    this.assertConfigGuard(scenarioCase);
  }

  static 'config-guard-valid'(scenarioCase: ScenarioCaseOfType<RetrySupportScenarioCaseEntity.Type, 'config-guard-valid'>): void {
    this.assertConfigGuard(scenarioCase);
  }

  static 'decorrelated-jitter-0'(scenarioCase: ScenarioCaseOfType<RetrySupportScenarioCaseEntity.Type, 'decorrelated-jitter-0'>): void {
    const { expected, input } = scenarioCase;
    const baseDelay = Number(input.baseDelay);
    assert.equal(BackoffStrategy.decorrelatedJitter(0, baseDelay), Number(expected.delay));
  }

  static 'decorrelated-jitter-lower-bound'(scenarioCase: ScenarioCaseOfType<RetrySupportScenarioCaseEntity.Type, 'decorrelated-jitter-lower-bound'>): void {
    const { expected, input } = scenarioCase;
    const baseDelay = Number(input.baseDelay);

    for (let attempt = 1; attempt <= this.readBatchSampleCount(input) / 20; attempt += 1) {
      for (let sample = 0; sample < 20; sample += 1) {
        const delay = BackoffStrategy.decorrelatedJitter(attempt, baseDelay);
        assert.ok(delay >= Number(expected.minimumDelay), `Attempt ${attempt}: delay ${delay} should be >= baseDelay ${baseDelay}`);
      }
    }
  }

  static 'decorrelated-jitter-upper-bound'(scenarioCase: ScenarioCaseOfType<RetrySupportScenarioCaseEntity.Type, 'decorrelated-jitter-upper-bound'>): void {
    const { expected, input } = scenarioCase;
    const baseDelay = Number(input.baseDelay);
    const maximumDelay = Number(expected.maximumDelay);

    for (let attempt = 0; attempt <= this.readBatchSampleCount(input) / 20 - 1; attempt += 1) {
      for (let sample = 0; sample < 20; sample += 1) {
        const delay = BackoffStrategy.decorrelatedJitter(attempt, baseDelay);
        assert.ok(delay <= maximumDelay, `Attempt ${attempt}: delay ${delay} should be <= maximumDelay ${maximumDelay}`);
      }
    }
  }

  static 'decorrelated-jitter-varying'(scenarioCase: ScenarioCaseOfType<RetrySupportScenarioCaseEntity.Type, 'decorrelated-jitter-varying'>): void {
    const { expected, input } = scenarioCase;
    const attempt = Number(input.attempt);
    const baseDelay = Number(input.baseDelay);
    const results = new Set<number>();

    for (let sample = 0; sample < this.readBatchSampleCount(input); sample += 1) {
      results.add(BackoffStrategy.decorrelatedJitter(attempt, baseDelay));
    }

    assert.ok(results.size > Number(expected.distinctResultsGreaterThan), 'Decorrelated jitter should produce varying results across calls');
  }

  static 'entity-backoff-config'(scenarioCase: ScenarioCaseOfType<RetrySupportScenarioCaseEntity.Type, 'entity-backoff-config'>): void {
    const { expected, input } = scenarioCase;
    assert.equal(BackoffConfigEntity.validate(input.value ?? { 'baseDelayMs': 25 }), Boolean(expected.valid));
    assert.equal(BackoffConfigEntity.validate({ 'baseDelayMs': -1 }), Boolean(expected.invalid));
  }

  static 'entity-retry-context'(scenarioCase: ScenarioCaseOfType<RetrySupportScenarioCaseEntity.Type, 'entity-retry-context'>): void {
    const { expected, input } = scenarioCase;
    assert.equal(RetryContextDataEntity.validate(input.value ?? {
      'abort': false,
      'attemptNumber': 1,
      'delayMs': 25,
      'elapsedMs': 100
    }), Boolean(expected.valid));
    assert.equal(RetryContextDataEntity.validate({
      'attemptNumber': -1,
      'delayMs': 25,
      'elapsedMs': 100
    }), Boolean(expected.invalid));
  }

  static declareExtraTests(): void {
    RetrySupportRunners.declareIntakesRetryConfiguration();
    RetrySupportRunners.declareValidatesCallState();
  }

  private static declareIntakesRetryConfiguration(): void {
    void it('intakes only the serializable retry configuration', () => {
      const parsed = RetryConfigEntity.intake({
        'hookTimeoutMs': 50,
        'maximumElapsedMs': 500,
        'maximumRetries': 3
      });

      assert.deepEqual(parsed, {
        'hookTimeoutMs': 50,
        'maximumElapsedMs': 500,
        'maximumRetries': 3
      });
      assert.throws(() => { RetryConfigEntity.intake({ 'unknown': true }); });
    });
  }

  private static declareValidatesCallState(): void {
    void it('validates complete retry call state and transition objects', () => {
      assert.equal(RetryCallStateEntity.validate({ 'variant': 'attempting' }), true);
      assert.equal(RetryCallStateEntity.validate('attempting'), false);
      assert.equal(RetryCallTransitionEventEntity.validate({ 'to': 'succeeded', 'type': 'transitionTo' }), true);
      assert.equal(RetryCallTransitionEventEntity.validate({ 'type': 'transitionTo' }), false);
    });
  }
}

ScenarioSuite.register({
  'entity': RetrySupportScenarioCaseEntity,
  'extraTests': RetrySupportRunners.declareExtraTests,
  'file': scenarioGroups,
  'name': 'Retry support',
  'runners': RetrySupportRunners
});
