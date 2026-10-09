import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import timersPromises from 'node:timers/promises';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { ClampEventEntity } from '../../../src/entities/ClampEventEntity.js';
import type { ClampRuleEntity } from '../../../src/entities/ClampRuleEntity.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { ClampedConfig } from '../../../src/validation/clampedConfig.js';
import { ClampedConfigScenarioCaseEntity } from '../entities/ClampedConfigScenarioCaseEntity.js';
import scenarioGroups from './clampedConfig.scenarios.json' with { 'type': 'json' };

class ClampedConfigRunners {
  static 'absent-field-untouched'(scenarioCase: ScenarioCaseOfType<ClampedConfigScenarioCaseEntity.Type, 'absent-field-untouched'>): void {
    ClampedConfigRunners.assertClampedResult(scenarioCase);
  }

  static async 'async-throwing-hook-is-contained'(scenarioCase: ScenarioCaseOfType<ClampedConfigScenarioCaseEntity.Type, 'async-throwing-hook-is-contained'>): Promise<void> {
    let hookInvoked = false;
    class AsyncOverrideClampedConfig extends ClampedConfig {
      protected static override onClamp(): Promise<void> {
        hookInvoked = true;
        const rejection = Promise.reject(RuntimeError.create('async onClamp boom'));
        return rejection;
      }
    }

    let rejectionCount = 0;
    const onUnhandledRejection = (): void => {
      rejectionCount += 1;
    };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const result = AsyncOverrideClampedConfig.apply(scenarioCase.input.config, scenarioCase.input.rules);
      assert.deepStrictEqual(result, scenarioCase.expected.result);
      await timersPromises.setImmediate();
      await timersPromises.setImmediate();
      assert.strictEqual(hookInvoked, scenarioCase.expected.hookInvoked);
      assert.strictEqual(rejectionCount, scenarioCase.expected.rejectionCount);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static 'clamp-above-max'(scenarioCase: ScenarioCaseOfType<ClampedConfigScenarioCaseEntity.Type, 'clamp-above-max'>): void {
    ClampedConfigRunners.assertClampedResult(scenarioCase);
  }

  static 'clamp-below-min'(scenarioCase: ScenarioCaseOfType<ClampedConfigScenarioCaseEntity.Type, 'clamp-below-min'>): void {
    ClampedConfigRunners.assertClampedResult(scenarioCase);
  }

  static 'default-hook-noop'(scenarioCase: ScenarioCaseOfType<ClampedConfigScenarioCaseEntity.Type, 'default-hook-noop'>): void {
    assert.doesNotThrow(() => {
      assert.deepStrictEqual(ClampedConfig.apply(scenarioCase.input.config, scenarioCase.input.rules), scenarioCase.expected.result);
    });
  }

  static 'in-range-untouched'(scenarioCase: ScenarioCaseOfType<ClampedConfigScenarioCaseEntity.Type, 'in-range-untouched'>): void {
    ClampedConfigRunners.assertClampedResult(scenarioCase);
  }

  static 'nan-field-untouched-no-hook'(scenarioCase: ScenarioCaseOfType<ClampedConfigScenarioCaseEntity.Type, 'nan-field-untouched-no-hook'>): void {
    const [events, result] = ClampedConfigRunners.captureClampEvents({ 'timeoutMs': Number.NaN }, scenarioCase.input.rules);

    assert.strictEqual(events.length, scenarioCase.expected.eventCount);
    assert.ok(Number.isNaN(result.timeoutMs), 'NaN field is left untouched, not clamped');
  }

  static 'non-numeric-field-untouched'(scenarioCase: ScenarioCaseOfType<ClampedConfigScenarioCaseEntity.Type, 'non-numeric-field-untouched'>): void {
    ClampedConfigRunners.assertClampedResult(scenarioCase);
  }

  static 'on-clamp-fires'(scenarioCase: ScenarioCaseOfType<ClampedConfigScenarioCaseEntity.Type, 'on-clamp-fires'>): void {
    const [events, result] = ClampedConfigRunners.captureClampEvents(scenarioCase.input.config, scenarioCase.input.rules);

    assert.deepStrictEqual(events, [scenarioCase.expected.event]);
    assert.deepStrictEqual(result, scenarioCase.expected.result);
  }

  static 'on-clamp-multi-field'(scenarioCase: ScenarioCaseOfType<ClampedConfigScenarioCaseEntity.Type, 'on-clamp-multi-field'>): void {
    const [events, result] = ClampedConfigRunners.captureClampEvents(scenarioCase.input.config, scenarioCase.input.rules);

    const fields: string[] = [];
    for (let index = 0; index < events.length; index += 1) {
      fields.push(events[index]?.field ?? '');
    }
    assert.deepStrictEqual(result, scenarioCase.expected.result);
    assert.deepStrictEqual(fields.toSorted(), [...scenarioCase.expected.eventFields].toSorted());
  }

  static 'on-clamp-skipped-in-range'(scenarioCase: ScenarioCaseOfType<ClampedConfigScenarioCaseEntity.Type, 'on-clamp-skipped-in-range'>): void {
    const [events, result] = ClampedConfigRunners.captureClampEvents(scenarioCase.input.config, scenarioCase.input.rules);

    assert.strictEqual(events.length, scenarioCase.expected.eventCount);
    assert.deepStrictEqual(result, scenarioCase.expected.result);
  }

  static 'returns-new-object'(scenarioCase: ScenarioCaseOfType<ClampedConfigScenarioCaseEntity.Type, 'returns-new-object'>): void {
    const result = ClampedConfig.apply(scenarioCase.input.config, scenarioCase.input.rules);

    assert.strictEqual(result === scenarioCase.input.config, scenarioCase.expected.sameReference);
    assert.deepStrictEqual(scenarioCase.input.config, scenarioCase.expected.input);
    assert.deepStrictEqual(result, scenarioCase.expected.result);
  }

  static 'throwing-hook-preserves-input'(scenarioCase: ScenarioCaseOfType<ClampedConfigScenarioCaseEntity.Type, 'throwing-hook-preserves-input'>): void {
    const result = ClampedConfigRunners.applyWithThrowingHook(scenarioCase.input.config, scenarioCase.input.rules);

    assert.deepStrictEqual(result, scenarioCase.expected.result);
    assert.deepStrictEqual(scenarioCase.input.config, scenarioCase.expected.input);
  }

  static 'throwing-hook-preserves-result'(scenarioCase: ScenarioCaseOfType<ClampedConfigScenarioCaseEntity.Type, 'throwing-hook-preserves-result'>): void {
    assert.deepStrictEqual(ClampedConfigRunners.applyWithThrowingHook(scenarioCase.input.config, scenarioCase.input.rules), scenarioCase.expected.result);
  }

  static 'unruled-field-untouched'(scenarioCase: ScenarioCaseOfType<ClampedConfigScenarioCaseEntity.Type, 'unruled-field-untouched'>): void {
    ClampedConfigRunners.assertClampedResult(scenarioCase);
  }

  private static applyWithThrowingHook(
    config: Readonly<Record<string, unknown>>,
    rules: Readonly<Record<string, ClampRuleEntity.Type>>
  ): Record<string, unknown> {
    class ThrowingClampedConfig extends ClampedConfig {
      protected static override onClamp(): void {
        throw RuntimeError.create('onClamp boom');
      }
    }

    const result = ThrowingClampedConfig.apply(config, rules);
    return result;
  }

  private static assertClampedResult(
    scenarioCase: ScenarioCaseOfType<ClampedConfigScenarioCaseEntity.Type,
      'absent-field-untouched' | 'clamp-above-max' | 'clamp-below-min' | 'in-range-untouched' | 'non-numeric-field-untouched' | 'unruled-field-untouched'>
  ): void {
    assert.deepStrictEqual(ClampedConfig.apply(scenarioCase.input.config, scenarioCase.input.rules), scenarioCase.expected.result);
  }

  private static captureClampEvents(
    config: Readonly<Record<string, unknown>>,
    rules: Readonly<Record<string, ClampRuleEntity.Type>>
  ): readonly [ClampEventEntity.Type[], Record<string, unknown>] {
    const events: ClampEventEntity.Type[] = [];
    class ObservingClampedConfig extends ClampedConfig {
      protected static override onClamp(event: ClampEventEntity.Type): void {
        events.push(event);
      }
    }

    const result = ObservingClampedConfig.apply(config, rules);
    return [events, result];
  }
}

ScenarioSuite.register({
  'entity': ClampedConfigScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'ClampedConfig',
  'runners': ClampedConfigRunners
});
