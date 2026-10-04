import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import {
  TimeUnitEntity,
  TimingOptionsEntity,
  TimingPrecisionEntity,
  TimingStatusEntity
} from '../../../src/timing/entities/index.js';
import { Timing } from '../../../src/timing/index.js';
import { TimingEvent } from '../../../src/timing/modules/TimingEvent.js';
import { ValidationScenarioCaseEntity } from './entities/ValidationScenarioCaseEntity.js';
import scenarioGroups from './validation.scenarios.json' with { 'type': 'json' };

class ValidationScenarioRunners {
  static 'accepts-all-options'(
    scenarioCase: ScenarioCaseOfType<ValidationScenarioCaseEntity.Type, 'accepts-all-options'>
  ): void {
    assert.doesNotThrow(() => {
      const maximumEvents = scenarioCase.input.timing.maximumEvents;
      Timing.create(
        TimingOptionsEntity.create({
          ...(maximumEvents === undefined ? {} : { 'maximumEvents': maximumEvents }),
          'precision': TimingPrecisionEntity.create(scenarioCase.input.timing.precision)
        })
      );
    });
    assert.equal(scenarioCase.expected.accepted, true);
  }

  static 'accepts-empty-precision'(
    scenarioCase: ScenarioCaseOfType<ValidationScenarioCaseEntity.Type, 'accepts-empty-precision'>
  ): void {
    assert.doesNotThrow(() => {
      TimingOptionsEntity.create();
    });
    assert.equal(scenarioCase.expected.accepted, true);
  }

  static 'accepts-null-max-events'(
    scenarioCase: ScenarioCaseOfType<ValidationScenarioCaseEntity.Type, 'accepts-null-max-events'>
  ): void {
    assert.doesNotThrow(() => {
      TimingOptionsEntity.create({ 'maximumEvents': null });
    });
    assert.equal(scenarioCase.expected.accepted, true);
  }

  static 'accepts-undefined-max-events'(
    scenarioCase: ScenarioCaseOfType<
      ValidationScenarioCaseEntity.Type,
      'accepts-undefined-max-events'
    >
  ): void {
    assert.doesNotThrow(() => {
      TimingOptionsEntity.create();
    });
    assert.equal(scenarioCase.expected.accepted, true);
  }

  static 'accepts-valid-max-events'(
    scenarioCase: ScenarioCaseOfType<ValidationScenarioCaseEntity.Type, 'accepts-valid-max-events'>
  ): void {
    for (let index = 0; index < scenarioCase.input.values.length; index += 1) {
      const value = scenarioCase.input.values[index];
      assert.ok(value !== undefined);
      assert.doesNotThrow(() => {
        Timing.create({ 'maximumEvents': value });
      });
    }
    assert.doesNotThrow(() => {
      Timing.create();
    });
    assert.equal(scenarioCase.expected.accepted, true);
  }

  static 'accepts-valid-precision'(
    scenarioCase: ScenarioCaseOfType<ValidationScenarioCaseEntity.Type, 'accepts-valid-precision'>
  ): void {
    for (let index = 0; index < scenarioCase.input.values.length; index += 1) {
      const precision = scenarioCase.input.values[index];
      assert.doesNotThrow(() => {
        Timing.create(
          TimingOptionsEntity.create({ 'precision': TimingPrecisionEntity.intake(precision) })
        );
      });
    }
    assert.doesNotThrow(() => {
      Timing.create();
    });
    assert.equal(scenarioCase.expected.accepted, true);
  }

  static 'applies-defaults'(
    scenarioCase: ScenarioCaseOfType<ValidationScenarioCaseEntity.Type, 'applies-defaults'>
  ): void {
    assert.equal(scenarioCase.input.hasInitialize, scenarioCase.expected.hasInitialize);
    const timer = Timing.create();
    const events = timer.getEvents();
    assert.ok(events.get('initialize') !== undefined);
    assert.equal(events.get('initialize') !== undefined, scenarioCase.expected.hasInitialize);
  }

  static 'applies-precision'(
    scenarioCase: ScenarioCaseOfType<ValidationScenarioCaseEntity.Type, 'applies-precision'>
  ): void {
    const timer = Timing.create(
      TimingOptionsEntity.create({
        'precision': TimingPrecisionEntity.create(scenarioCase.input.timing.precision)
      })
    );
    timer.event(TimingEvent.create(scenarioCase.input.event));
    const events = timer.getEvents();
    assert.ok(events.get('initialize') !== undefined);
    const valueString = (events.get('initialize') ?? 0).toString();
    const decimalPart = valueString.split('.')[1];
    const decimalPlaceCount = decimalPart === undefined ? 0 : decimalPart.length;
    assert.equal(decimalPlaceCount <= scenarioCase.expected.maxDecimalPlaces, true);
    assert.equal(events.get('initialize') !== undefined, scenarioCase.expected.hasInitialize);
  }

  static 'rejects-array-precision'(
    scenarioCase: ScenarioCaseOfType<ValidationScenarioCaseEntity.Type, 'rejects-array-precision'>
  ): void {
    assert.equal(TimingOptionsEntity.validate({ 'precision': scenarioCase.input.value }), false);
    assert.equal(scenarioCase.expected.errorName, 'ConfigurationError');
  }

  static 'rejects-invalid-max-events'(
    scenarioCase: ScenarioCaseOfType<
      ValidationScenarioCaseEntity.Type,
      'rejects-invalid-max-events'
    >
  ): void {
    let rejectedValueCount = 0;
    for (let index = 0; index < scenarioCase.input.values.length; index += 1) {
      const value = scenarioCase.input.values[index];
      assert.equal(TimingOptionsEntity.validate({ 'maximumEvents': value }), false);
      rejectedValueCount += 1;
    }
    assert.equal(rejectedValueCount, scenarioCase.expected.errorNames.length);
  }

  static 'rejects-invalid-precision'(
    scenarioCase: ScenarioCaseOfType<
      ValidationScenarioCaseEntity.Type,
      'rejects-invalid-precision'
    >
  ): void {
    let rejectedValueCount = 0;
    for (let index = 0; index < scenarioCase.input.values.length; index += 1) {
      const value = scenarioCase.input.values[index];
      assert.equal(TimingOptionsEntity.validate({ 'precision': value }), false);
      rejectedValueCount += 1;
    }
    assert.equal(rejectedValueCount, scenarioCase.expected.errorNames.length);
  }

  static 'rejects-invalid-time-units'(
    scenarioCase: ScenarioCaseOfType<
      ValidationScenarioCaseEntity.Type,
      'rejects-invalid-time-units'
    >
  ): void {
    assert.equal(TimingOptionsEntity.validate({ 'precision': scenarioCase.input.value }), false);
    assert.equal(scenarioCase.expected.errorName, 'ConfigurationError');
  }

  static 'rejects-non-object-precision'(
    scenarioCase: ScenarioCaseOfType<
      ValidationScenarioCaseEntity.Type,
      'rejects-non-object-precision'
    >
  ): void {
    assert.equal(TimingOptionsEntity.validate({ 'precision': scenarioCase.input.value }), false);
    assert.equal(scenarioCase.expected.errorName, 'ConfigurationError');
  }

  static 'validates-entities'(
    scenarioCase: ScenarioCaseOfType<ValidationScenarioCaseEntity.Type, 'validates-entities'>
  ): void {
    const results: boolean[] = [];
    for (let index = 0; index < scenarioCase.input.cases.length; index += 1) {
      const scenario = scenarioCase.input.cases[index];
      assert.ok(scenario !== undefined);
      const result = ValidationScenarioRunners.validateEntity(scenario.entity, scenario.value);
      results.push(result);
    }
    assert.deepStrictEqual(results, scenarioCase.expected.results);
  }

  private static validateEntity(entity: string, value: unknown): boolean {
    if (entity === 'TimeUnitEntity') {
      const result = TimeUnitEntity.validate(value);
      return result;
    }
    if (entity === 'TimingOptionsEntity') {
      const result = TimingOptionsEntity.validate(value);
      return result;
    }
    if (entity === 'TimingPrecisionEntity') {
      const result = TimingPrecisionEntity.validate(value);
      return result;
    }
    if (entity === 'TimingStatusEntity') {
      const result = TimingStatusEntity.validate(value);
      return result;
    }
    throw RuntimeError.create(`Unknown entity: ${entity}`);
  }
}

ScenarioSuite.register({
  'entity': ValidationScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Timing validation',
  'runners': ValidationScenarioRunners
});
