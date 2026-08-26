import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { HookInvocationError } from '@studnicky/errors';

import type { VisibleRangeConfigInterface } from '../../src/interfaces/index.js';

import {
  VisibleRangeConfigDataEntity,
  VisibleRangeEntity,
  VisibleRangeResolvedConfigEntity
} from '../../src/entities/index.js';
import { VisibleRange } from '../../src/index.js';
import scenarioGroups from './visible-range.scenarios.json' with { type: 'json' };

type EntityContractShape =
  | 'config-data-valid'
  | 'constructor-both-sizes'
  | 'constructor-invalid-item-size'
  | 'constructor-missing-size'
  | 'resolved-config-valid';

type FixedModeShape = 'range' | 'range-end' | 'range-start';

type OnRangeChangeShape =
  | 'async-rejecting-hook'
  | 'first-call'
  | 'no-state-change'
  | 'retained-state-isolated'
  | 'scroll-moves-range'
  | 'throwing-hook';

type VariableModeShape =
  | 'initial-range'
  | 'interleaved-measure-corrections'
  | 'measure-corrects-range'
  | 'measure-noop-fixed-mode'
  | 'measure-same-size-noop'
  | 'overscan-applied'
  | 'variable-boundary-offsets'
  | 'variable-count-zero';

type SerializableVisibleRangeConfig = {
  readonly count: number;
  readonly estimateSizeMode?: 'fractional-boundary';
  readonly estimateSizeValue?: number;
  readonly itemSize?: number;
  readonly overscan?: number;
};

type EntityValidationInput = {
  readonly invalid: unknown;
  readonly valid: unknown;
};

type EntityContractInput = {
  readonly configData?: EntityValidationInput;
  readonly resolvedConfig?: EntityValidationInput;
  readonly visibleRange?: SerializableVisibleRangeConfig;
};

type EntityContractScenario = {
  readonly description: string;
  readonly input?: EntityContractInput;
  readonly shape: EntityContractShape;
  readonly name: string;
};

type RangeInput = {
  readonly scrollOffset?: number;
  readonly viewportSize?: number;
  readonly visibleRange: SerializableVisibleRangeConfig;
};

type RangeValueExpectation = {
  readonly shape: 'corrected-range' | 'range';
  readonly range: VisibleRangeEntity.Type;
};

type RangeBoundaryExpectation = {
  readonly shape: 'range-end' | 'range-start';
  readonly value: number;
};

type RangeExpectation = RangeBoundaryExpectation | RangeValueExpectation;

type FixedModeScenario = {
  readonly description: string;
  readonly expect: RangeExpectation;
  readonly input: RangeInput;
  readonly shape: FixedModeShape;
  readonly name: string;
};

type OnRangeChangeInput = RangeInput & {
  readonly nextScrollOffset?: number;
};

type OnRangeChangeScenario = {
  readonly description: string;
  readonly input: OnRangeChangeInput;
  readonly shape: OnRangeChangeShape;
  readonly name: string;
};

type Measurement = {
  readonly index: number;
  readonly readAfter?: boolean;
  readonly size: number;
};

type MeasurementBatch = {
  readonly endExclusive: number;
  readonly size: number;
  readonly start: number;
};

type VariableExpectation = RangeValueExpectation | {
  readonly shape: 'unchanged-range';
};

type VariableModeInput = RangeInput & {
  readonly finalScrollOffset?: number;
  readonly finalViewportSize?: number;
  readonly measurementBatch?: MeasurementBatch;
  readonly measurements?: readonly Measurement[];
};

type VariableModeScenario = {
  readonly description: string;
  readonly expect: VariableExpectation;
  readonly input: VariableModeInput;
  readonly shape: VariableModeShape;
  readonly name: string;
};

const entityContractScenarios = scenarioGroups.entityContracts as readonly EntityContractScenario[];
const fixedModeScenarios = scenarioGroups.fixedMode as readonly FixedModeScenario[];
const onRangeChangeScenarios = scenarioGroups.onRangeChange as readonly OnRangeChangeScenario[];
const variableModeScenarios = scenarioGroups.variableMode as readonly VariableModeScenario[];

function buildVisibleRangeConfig(config: SerializableVisibleRangeConfig): VisibleRangeConfigInterface {
  const baseConfig = {
    'count': config.count,
    ...(config.itemSize === undefined ? {} : { 'itemSize': config.itemSize }),
    ...(config.overscan === undefined ? {} : { 'overscan': config.overscan })
  };

  if (config.estimateSizeMode === 'fractional-boundary') {
    return {
      ...baseConfig,
      'estimateSize': (index: number) => (index === 1 ? 0.5 : 1)
    };
  }

  const estimateSizeValue = config.estimateSizeValue;
  if (estimateSizeValue !== undefined) {
    return {
      ...baseConfig,
      'estimateSize': () => estimateSizeValue
    };
  }

  return baseConfig;
}

function requireEntityInput(scenario: EntityContractScenario): EntityContractInput {
  if (scenario.input === undefined) {
    throw new Error(`Missing input for visible-range entity scenario: ${scenario.shape}`);
  }
  return scenario.input;
}

function requireValidationInput(scenario: EntityContractScenario, key: 'configData' | 'resolvedConfig'): EntityValidationInput {
  const input = requireEntityInput(scenario)[key];
  if (input === undefined) {
    throw new Error(`Missing ${key} fixture for visible-range entity scenario: ${scenario.shape}`);
  }
  return input;
}

function requireVisibleRangeConfig(scenario: EntityContractScenario): SerializableVisibleRangeConfig {
  const config = requireEntityInput(scenario).visibleRange;
  if (config === undefined) {
    throw new Error(`Missing visible-range config for entity scenario: ${scenario.shape}`);
  }
  return config;
}

function requireNumber(value: number | undefined, label: string): number {
  if (value === undefined) {
    throw new Error(`Missing ${label}`);
  }
  return value;
}

function applyRangeInput(range: VisibleRange, input: Pick<RangeInput, 'scrollOffset' | 'viewportSize'>): void {
  if (input.scrollOffset !== undefined) {
    range.setScrollOffset(input.scrollOffset);
  }
  if (input.viewportSize !== undefined) {
    range.setViewportSize(input.viewportSize);
  }
}

function createConfiguredRange(input: RangeInput, rangeType: typeof VisibleRange = VisibleRange): VisibleRange {
  const range = rangeType.create(buildVisibleRangeConfig(input.visibleRange));
  applyRangeInput(range, input);
  return range;
}

function requireRangeValue(expectation: RangeExpectation | VariableExpectation): VisibleRangeEntity.Type {
  if (!('range' in expectation)) {
    throw new Error(`Expected range fixture, received ${expectation.shape}`);
  }
  return expectation.range;
}

function requireBoundaryValue(expectation: RangeExpectation, shape: RangeBoundaryExpectation['shape']): number {
  if (expectation.shape !== shape || !('value' in expectation)) {
    throw new Error(`Expected ${shape} fixture, received ${expectation.shape}`);
  }
  return expectation.value;
}

const rangeExpectationAssertions: Record<RangeExpectation['shape'], (actual: VisibleRangeEntity.Type, expectation: RangeExpectation) => void> = {
  'corrected-range': (actual, expectation) => {
    assert.deepStrictEqual(actual, requireRangeValue(expectation));
  },
  range: (actual, expectation) => {
    assert.deepStrictEqual(actual, requireRangeValue(expectation));
  },
  'range-end': (actual, expectation) => {
    assert.strictEqual(actual.end, requireBoundaryValue(expectation, 'range-end'));
  },
  'range-start': (actual, expectation) => {
    assert.strictEqual(actual.start, requireBoundaryValue(expectation, 'range-start'));
  }
};

function assertRangeExpectation(actual: VisibleRangeEntity.Type, expectation: RangeExpectation): void {
  rangeExpectationAssertions[expectation.shape](actual, expectation);
}

const variableRangeAssertions: Record<VariableExpectation['shape'], (actual: VisibleRangeEntity.Type, expectation: VariableExpectation) => void> = {
  'corrected-range': (actual, expectation) => {
    assert.deepStrictEqual(actual, requireRangeValue(expectation));
  },
  range: (actual, expectation) => {
    assert.deepStrictEqual(actual, requireRangeValue(expectation));
  },
  'unchanged-range': () => {
    throw new Error('unchanged-range expectations require a before/after comparison');
  }
};

function assertVariableRange(actual: VisibleRangeEntity.Type, expectation: VariableExpectation): void {
  variableRangeAssertions[expectation.shape](actual, expectation);
}

const unchangedRangeAssertions: Record<VariableExpectation['shape'], (before: VisibleRangeEntity.Type, after: VisibleRangeEntity.Type, expectation: VariableExpectation) => void> = {
  'corrected-range': (_before, _after, expectation) => {
    throw new Error(`Expected unchanged-range fixture, received ${expectation.shape}`);
  },
  range: (_before, _after, expectation) => {
    throw new Error(`Expected unchanged-range fixture, received ${expectation.shape}`);
  },
  'unchanged-range': (before, after) => {
    assert.deepStrictEqual(after, before);
  }
};

function assertUnchangedRange(before: VisibleRangeEntity.Type, after: VisibleRangeEntity.Type, expectation: VariableExpectation): void {
  unchangedRangeAssertions[expectation.shape](before, after, expectation);
}

function applyMeasurementBatch(range: VisibleRange, batch: MeasurementBatch | undefined): void {
  if (batch === undefined) {
    return;
  }

  for (let index = batch.start; index < batch.endExclusive; index++) {
    range.measureItem(index, batch.size);
  }
}

function applyMeasurements(range: VisibleRange, measurements: readonly Measurement[] | undefined): void {
  for (const measurement of measurements ?? []) {
    range.measureItem(measurement.index, measurement.size);
    if (measurement.readAfter === true) {
      range.getRange();
    }
  }
}

const entityContractRunners = {
  'config-data-valid': (scenario: EntityContractScenario): void => {
    const input = requireValidationInput(scenario, 'configData');
    assert.strictEqual(VisibleRangeConfigDataEntity.validate(input.valid), true);
    assert.strictEqual(VisibleRangeConfigDataEntity.validate(input.invalid), false);
  },
  'constructor-both-sizes': (scenario: EntityContractScenario): void => {
    assert.throws(() => {
      VisibleRange.create(buildVisibleRangeConfig(requireVisibleRangeConfig(scenario)));
    });
  },
  'constructor-invalid-item-size': (scenario: EntityContractScenario): void => {
    assert.throws(() => {
      VisibleRange.create(buildVisibleRangeConfig(requireVisibleRangeConfig(scenario)));
    });
  },
  'constructor-missing-size': (scenario: EntityContractScenario): void => {
    assert.throws(() => {
      VisibleRange.create(buildVisibleRangeConfig(requireVisibleRangeConfig(scenario)));
    });
  },
  'resolved-config-valid': (scenario: EntityContractScenario): void => {
    const input = requireValidationInput(scenario, 'resolvedConfig');
    assert.strictEqual(VisibleRangeResolvedConfigEntity.validate(input.valid), true);
    assert.strictEqual(VisibleRangeResolvedConfigEntity.validate(input.invalid), false);
  }
} satisfies Record<EntityContractShape, (scenario: EntityContractScenario) => void>;

function runEntityContracts(): void {
  for (const scenario of entityContractScenarios) {
    entityContractRunners[scenario.shape](scenario);
  }
}

function runFixedMode(): void {
  for (const scenario of fixedModeScenarios) {
    const range = createConfiguredRange(scenario.input);
    assertRangeExpectation(range.getRange(), scenario.expect);
  }
}

const onRangeChangeRunners = {
  'async-rejecting-hook': async (scenario: OnRangeChangeScenario): Promise<void> => {
    const original = new Error('async onRangeChange boom');

    class AsyncRejectingVisibleRange extends VisibleRange {
      protected override async onRangeChange(): Promise<void> {
        await Promise.resolve();
        throw original;
      }
    }

    const range = createConfiguredRange(scenario.input, AsyncRejectingVisibleRange);

    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: Error): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      range.getRange();

      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });

      assert.strictEqual(rejectionEvents.length, 0);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  },
  'first-call': (scenario: OnRangeChangeScenario): void => {
    const changes: VisibleRangeEntity.Type[] = [];

    class TrackingVisibleRange extends VisibleRange {
      protected override onRangeChange(range: VisibleRangeEntity.Type): void {
        changes.push(range);
      }
    }

    const range = createConfiguredRange(scenario.input, TrackingVisibleRange);
    range.getRange();

    assert.strictEqual(changes.length, 1);
  },
  'no-state-change': (scenario: OnRangeChangeScenario): void => {
    const changes: VisibleRangeEntity.Type[] = [];

    class TrackingVisibleRange extends VisibleRange {
      protected override onRangeChange(range: VisibleRangeEntity.Type): void {
        changes.push(range);
      }
    }

    const range = createConfiguredRange(scenario.input, TrackingVisibleRange);
    range.getRange();
    range.getRange();

    assert.strictEqual(changes.length, 1);
  },
  'retained-state-isolated': (scenario: OnRangeChangeScenario): void => {
    const changes: VisibleRangeEntity.Type[] = [];

    class MutatingVisibleRange extends VisibleRange {
      protected override onRangeChange(range: VisibleRangeEntity.Type): void {
        changes.push({ 'end': range.end, 'start': range.start });
        range.start = 999;
      }
    }

    const range = createConfiguredRange(scenario.input, MutatingVisibleRange);

    const first = range.getRange();
    first.end = 999;
    const second = range.getRange();

    assert.deepStrictEqual(second, { 'end': 2, 'start': 0 });
    assert.deepStrictEqual(changes, [{ 'end': 2, 'start': 0 }]);
  },
  'scroll-moves-range': (scenario: OnRangeChangeScenario): void => {
    const changes: VisibleRangeEntity.Type[] = [];

    class TrackingVisibleRange extends VisibleRange {
      protected override onRangeChange(range: VisibleRangeEntity.Type): void {
        changes.push(range);
      }
    }

    const range = createConfiguredRange(scenario.input, TrackingVisibleRange);
    range.getRange();

    range.setScrollOffset(requireNumber(scenario.input.nextScrollOffset, 'nextScrollOffset'));
    const second = range.getRange();

    assert.strictEqual(changes.length, 2);
    assert.deepStrictEqual(changes[1], second);
  },
  'throwing-hook': (scenario: OnRangeChangeScenario): void => {
    class ThrowingVisibleRange extends VisibleRange {
      protected override onRangeChange(): void {
        throw new Error('onRangeChange boom');
      }
    }

    const range = createConfiguredRange(scenario.input, ThrowingVisibleRange);

    assert.throws(() => {
      range.getRange();
    }, HookInvocationError);
  }
} satisfies Record<OnRangeChangeShape, (scenario: OnRangeChangeScenario) => Promise<void> | void>;

async function runOnRangeChange(): Promise<void> {
  for (const scenario of onRangeChangeScenarios) {
    await onRangeChangeRunners[scenario.shape](scenario);
  }
}

function runVariableRangeScenario(scenario: VariableModeScenario): void {
  const range = createConfiguredRange(scenario.input);
  assertVariableRange(range.getRange(), scenario.expect);
}

function runVariableCorrectedRangeScenario(scenario: VariableModeScenario): void {
  const range = createConfiguredRange(scenario.input);
  const before = range.getRange();

  applyMeasurementBatch(range, scenario.input.measurementBatch);

  const after = range.getRange();
  assert.notDeepStrictEqual(after, before);
  assertVariableRange(after, scenario.expect);
}

function runVariableUnchangedRangeScenario(scenario: VariableModeScenario): void {
  const range = createConfiguredRange(scenario.input);
  const before = range.getRange();

  applyMeasurements(range, scenario.input.measurements);

  assertUnchangedRange(before, range.getRange(), scenario.expect);
}

function runVariableInterleavedCorrectionsScenario(scenario: VariableModeScenario): void {
  const range = createConfiguredRange(scenario.input);
  range.getRange();

  applyMeasurements(range, scenario.input.measurements);

  range.setScrollOffset(requireNumber(scenario.input.finalScrollOffset, 'finalScrollOffset'));
  range.setViewportSize(requireNumber(scenario.input.finalViewportSize, 'finalViewportSize'));

  assertVariableRange(range.getRange(), scenario.expect);
}

const variableModeRunners = {
  'initial-range': runVariableRangeScenario,
  'interleaved-measure-corrections': runVariableInterleavedCorrectionsScenario,
  'measure-corrects-range': runVariableCorrectedRangeScenario,
  'measure-noop-fixed-mode': runVariableUnchangedRangeScenario,
  'measure-same-size-noop': runVariableUnchangedRangeScenario,
  'overscan-applied': runVariableRangeScenario,
  'variable-boundary-offsets': runVariableRangeScenario,
  'variable-count-zero': runVariableRangeScenario
} satisfies Record<VariableModeShape, (scenario: VariableModeScenario) => void>;

function runVariableMode(): void {
  for (const scenario of variableModeScenarios) {
    variableModeRunners[scenario.shape](scenario);
  }
}

void describe('visible-range entity contracts', () => {
  void it('validates serializable input fields and resolved configuration state', () => {
    runEntityContracts();
  });
});

void describe('visible-range fixed mode', () => {
  void it('computes and clamps fixed-size ranges', () => {
    runFixedMode();
  });
});

void describe('visible-range onRangeChange', () => {
  void it('fires, isolates, and wraps range-change hooks', async () => {
    await runOnRangeChange();
  });
});

void describe('visible-range variable mode', () => {
  void it('computes and repairs estimate-size ranges', () => {
    runVariableMode();
  });
});
