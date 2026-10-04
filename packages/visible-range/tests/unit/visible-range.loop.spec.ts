import { HookInvocationError, RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import timersPromises from 'node:timers/promises';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { VisibleRangeEntity } from '../../src/entities/index.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import {
  VisibleRangeConfigDataEntity,
  VisibleRangeResolvedConfigEntity
} from '../../src/entities/index.js';
import { VisibleRange } from '../../src/index.js';
import { EntityContractScenarioCaseEntity } from './entities/EntityContractScenarioCaseEntity.js';
import { FixedModeScenarioCaseEntity } from './entities/FixedModeScenarioCaseEntity.js';
import { OnRangeChangeScenarioCaseEntity } from './entities/OnRangeChangeScenarioCaseEntity.js';
import { VariableModeScenarioCaseEntity } from './entities/VariableModeScenarioCaseEntity.js';
import scenarioGroups from './visible-range.scenarios.json' with { 'type': 'json' };
import { VisibleRangeScenarioFactory } from './VisibleRangeScenarioFactory.js';

class EntityContractRunners {
  static 'config-data-valid'(scenarioCase: ScenarioCaseOfType<EntityContractScenarioCaseEntity.Type, 'config-data-valid'>): void {
    const { invalid, valid } = scenarioCase.input.configData;
    assert.strictEqual(VisibleRangeConfigDataEntity.validate(valid), true);
    assert.strictEqual(VisibleRangeConfigDataEntity.validate(invalid), false);
  }

  static 'constructor-both-sizes'(scenarioCase: ScenarioCaseOfType<EntityContractScenarioCaseEntity.Type, 'constructor-both-sizes'>): void {
    assert.throws(() => {
      VisibleRangeScenarioFactory.createRange({ 'visibleRange': scenarioCase.input.visibleRange });
    });
  }

  static 'constructor-invalid-item-size'(scenarioCase: ScenarioCaseOfType<EntityContractScenarioCaseEntity.Type, 'constructor-invalid-item-size'>): void {
    assert.throws(() => {
      VisibleRangeScenarioFactory.createRange({ 'visibleRange': scenarioCase.input.visibleRange });
    });
  }

  static 'constructor-missing-size'(scenarioCase: ScenarioCaseOfType<EntityContractScenarioCaseEntity.Type, 'constructor-missing-size'>): void {
    assert.throws(() => {
      VisibleRangeScenarioFactory.createRange({ 'visibleRange': scenarioCase.input.visibleRange });
    });
  }

  static 'resolved-config-valid'(scenarioCase: ScenarioCaseOfType<EntityContractScenarioCaseEntity.Type, 'resolved-config-valid'>): void {
    const { invalid, valid } = scenarioCase.input.resolvedConfig;
    assert.strictEqual(VisibleRangeResolvedConfigEntity.validate(valid), true);
    assert.strictEqual(VisibleRangeResolvedConfigEntity.validate(invalid), false);
  }
}

class FixedModeRunners {
  static 'range'(scenarioCase: ScenarioCaseOfType<FixedModeScenarioCaseEntity.Type, 'range'>): void {
    const range = VisibleRangeScenarioFactory.createRange(scenarioCase.input);
    assert.deepStrictEqual(range.getRange(), scenarioCase.expect.range);
  }

  static 'range-end'(scenarioCase: ScenarioCaseOfType<FixedModeScenarioCaseEntity.Type, 'range-end'>): void {
    const range = VisibleRangeScenarioFactory.createRange(scenarioCase.input);
    assert.strictEqual(range.getRange().end, scenarioCase.expect.value);
  }

  static 'range-start'(scenarioCase: ScenarioCaseOfType<FixedModeScenarioCaseEntity.Type, 'range-start'>): void {
    const range = VisibleRangeScenarioFactory.createRange(scenarioCase.input);
    assert.strictEqual(range.getRange().start, scenarioCase.expect.value);
  }
}

class OnRangeChangeRunners {
  static async 'async-rejecting-hook'(scenarioCase: ScenarioCaseOfType<OnRangeChangeScenarioCaseEntity.Type, 'async-rejecting-hook'>): Promise<void> {
    const original = RuntimeError.create('async onRangeChange boom');
    const range = VisibleRangeScenarioFactory.createRange(scenarioCase.input);
    Object.defineProperty(range, 'onRangeChange', {
      'value': (): Promise<void> => {
        const rejection = Promise.resolve().then((): void => {
          throw original;
        });
        return rejection;
      }
    });

    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      range.getRange();

      await timersPromises.setImmediate();
      await timersPromises.setImmediate();

      assert.strictEqual(rejectionEvents.length, 0);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static 'first-call'(scenarioCase: ScenarioCaseOfType<OnRangeChangeScenarioCaseEntity.Type, 'first-call'>): void {
    const changes: VisibleRangeEntity.Type[] = [];

    class TrackingVisibleRange extends VisibleRange {
      protected override onRangeChange(range: VisibleRangeEntity.Type): void {
        changes.push(range);
      }
    }

    const range = VisibleRangeScenarioFactory.createRange(scenarioCase.input, TrackingVisibleRange);
    range.getRange();

    assert.strictEqual(changes.length, 1);
  }

  static 'no-state-change'(scenarioCase: ScenarioCaseOfType<OnRangeChangeScenarioCaseEntity.Type, 'no-state-change'>): void {
    const changes: VisibleRangeEntity.Type[] = [];

    class TrackingVisibleRange extends VisibleRange {
      protected override onRangeChange(range: VisibleRangeEntity.Type): void {
        changes.push(range);
      }
    }

    const range = VisibleRangeScenarioFactory.createRange(scenarioCase.input, TrackingVisibleRange);
    range.getRange();
    range.getRange();

    assert.strictEqual(changes.length, 1);
  }

  static 'retained-state-isolated'(scenarioCase: ScenarioCaseOfType<OnRangeChangeScenarioCaseEntity.Type, 'retained-state-isolated'>): void {
    const changes: VisibleRangeEntity.Type[] = [];

    class MutatingVisibleRange extends VisibleRange {
      protected override onRangeChange(range: VisibleRangeEntity.Type): void {
        changes.push({ 'end': range.end, 'start': range.start });
        range.start = 999;
      }
    }

    const range = VisibleRangeScenarioFactory.createRange(scenarioCase.input, MutatingVisibleRange);

    const first = range.getRange();
    first.end = 999;
    const second = range.getRange();

    assert.deepStrictEqual(second, { 'end': 2, 'start': 0 });
    assert.deepStrictEqual(changes, [{ 'end': 2, 'start': 0 }]);
  }

  static 'scroll-moves-range'(scenarioCase: ScenarioCaseOfType<OnRangeChangeScenarioCaseEntity.Type, 'scroll-moves-range'>): void {
    const changes: VisibleRangeEntity.Type[] = [];

    class TrackingVisibleRange extends VisibleRange {
      protected override onRangeChange(range: VisibleRangeEntity.Type): void {
        changes.push(range);
      }
    }

    const range = VisibleRangeScenarioFactory.createRange(scenarioCase.input, TrackingVisibleRange);
    range.getRange();

    range.setScrollOffset(scenarioCase.input.nextScrollOffset);
    const second = range.getRange();

    assert.strictEqual(changes.length, 2);
    assert.deepStrictEqual(changes[1], second);
  }

  static 'throwing-hook'(scenarioCase: ScenarioCaseOfType<OnRangeChangeScenarioCaseEntity.Type, 'throwing-hook'>): void {
    class ThrowingVisibleRange extends VisibleRange {
      protected override onRangeChange(): void {
        throw RuntimeError.create('onRangeChange boom');
      }
    }

    const range = VisibleRangeScenarioFactory.createRange(scenarioCase.input, ThrowingVisibleRange);

    assert.throws(() => {
      range.getRange();
    }, HookInvocationError);
  }
}

class VariableModeRunners {
  static 'initial-range'(scenarioCase: ScenarioCaseOfType<VariableModeScenarioCaseEntity.Type, 'initial-range'>): void {
    VariableModeRunners.assertComputedRange(scenarioCase);
  }

  static 'interleaved-measure-corrections'(scenarioCase: ScenarioCaseOfType<VariableModeScenarioCaseEntity.Type, 'interleaved-measure-corrections'>): void {
    const range = VisibleRangeScenarioFactory.createRange(scenarioCase.input);
    range.getRange();

    VariableModeRunners.applyMeasurements(range, scenarioCase.input.measurements);

    range.setScrollOffset(scenarioCase.input.finalScrollOffset);
    range.setViewportSize(scenarioCase.input.finalViewportSize);

    assert.deepStrictEqual(range.getRange(), scenarioCase.expect.range);
  }

  static 'measure-corrects-range'(scenarioCase: ScenarioCaseOfType<VariableModeScenarioCaseEntity.Type, 'measure-corrects-range'>): void {
    const range = VisibleRangeScenarioFactory.createRange(scenarioCase.input);
    const before = range.getRange();

    const batch = scenarioCase.input.measurementBatch;
    for (let index = batch.start; index < batch.endExclusive; index += 1) {
      range.measureItem(index, batch.size);
    }

    const after = range.getRange();
    assert.notDeepStrictEqual(after, before);
    assert.deepStrictEqual(after, scenarioCase.expect.range);
  }

  static 'measure-noop-fixed-mode'(scenarioCase: ScenarioCaseOfType<VariableModeScenarioCaseEntity.Type, 'measure-noop-fixed-mode'>): void {
    VariableModeRunners.assertMeasurementsLeaveRangeUnchanged(scenarioCase);
  }

  static 'measure-same-size-noop'(scenarioCase: ScenarioCaseOfType<VariableModeScenarioCaseEntity.Type, 'measure-same-size-noop'>): void {
    VariableModeRunners.assertMeasurementsLeaveRangeUnchanged(scenarioCase);
  }

  static 'overscan-applied'(scenarioCase: ScenarioCaseOfType<VariableModeScenarioCaseEntity.Type, 'overscan-applied'>): void {
    VariableModeRunners.assertComputedRange(scenarioCase);
  }

  static 'variable-boundary-offsets'(scenarioCase: ScenarioCaseOfType<VariableModeScenarioCaseEntity.Type, 'variable-boundary-offsets'>): void {
    VariableModeRunners.assertComputedRange(scenarioCase);
  }

  static 'variable-count-zero'(scenarioCase: ScenarioCaseOfType<VariableModeScenarioCaseEntity.Type, 'variable-count-zero'>): void {
    VariableModeRunners.assertComputedRange(scenarioCase);
  }

  private static applyMeasurements(
    range: VisibleRange,
    measurements: readonly { readonly 'index': number; readonly 'readAfter'?: boolean; readonly 'size': number }[]
  ): void {
    for (let position = 0; position < measurements.length; position += 1) {
      const measurement = measurements[position];
      if (measurement !== undefined) {
        range.measureItem(measurement.index, measurement.size);
        if (measurement.readAfter === true) {
          range.getRange();
        }
      }
    }
  }

  private static assertComputedRange(
    scenarioCase: ScenarioCaseOfType<VariableModeScenarioCaseEntity.Type, 'initial-range' | 'overscan-applied' | 'variable-boundary-offsets' | 'variable-count-zero'>
  ): void {
    const range = VisibleRangeScenarioFactory.createRange(scenarioCase.input);
    assert.deepStrictEqual(range.getRange(), scenarioCase.expect.range);
  }

  private static assertMeasurementsLeaveRangeUnchanged(
    scenarioCase: ScenarioCaseOfType<VariableModeScenarioCaseEntity.Type, 'measure-noop-fixed-mode' | 'measure-same-size-noop'>
  ): void {
    const range = VisibleRangeScenarioFactory.createRange(scenarioCase.input);
    const before = range.getRange();

    VariableModeRunners.applyMeasurements(range, scenarioCase.input.measurements);

    assert.deepStrictEqual(range.getRange(), before);
  }
}

ScenarioSuite.register({
  'entity': EntityContractScenarioCaseEntity,
  'file': { 'cases': scenarioGroups.entityContracts },
  'name': 'visible-range entity contracts',
  'runners': EntityContractRunners
});

ScenarioSuite.register({
  'entity': FixedModeScenarioCaseEntity,
  'file': { 'cases': scenarioGroups.fixedMode },
  'name': 'visible-range fixed mode',
  'runners': FixedModeRunners
});

ScenarioSuite.register({
  'entity': OnRangeChangeScenarioCaseEntity,
  'file': { 'cases': scenarioGroups.onRangeChange },
  'name': 'visible-range onRangeChange',
  'runners': OnRangeChangeRunners
});

ScenarioSuite.register({
  'entity': VariableModeScenarioCaseEntity,
  'file': { 'cases': scenarioGroups.variableMode },
  'name': 'visible-range variable mode',
  'runners': VariableModeRunners
});
