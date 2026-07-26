import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ConfigurationError } from '@studnicky/config';

import {
  TimeUnitEntity,
  Timing,
  TimingOptionsEntity,
  TimingPrecisionEntity,
  TimingStatusEntity
} from '../../src/index.js';
import { TimingEvent } from '../../src/modules/TimingEvent.js';
import { TimingValidator } from '../../src/validation/TimingValidator.js';
import scenarioGroups from './validation.scenarios.json' with { type: 'json' };

type EntityValidator = (value: unknown) => boolean;

const unknownEntityValidator = (entity: string): EntityValidator => {
  return () => {
    throw new Error(`Unknown entity: ${entity}`);
  };
};

const entityValidatorMap: Readonly<Record<string, EntityValidator | undefined>> = {
  TimeUnitEntity: (value) => TimeUnitEntity.validate(value),
  TimingOptionsEntity: (value) => TimingOptionsEntity.validate(value),
  TimingPrecisionEntity: (value) => TimingPrecisionEntity.validate(value),
  TimingStatusEntity: (value) => TimingStatusEntity.validate(value)
};

function createTimingEvent(input: Parameters<typeof TimingEvent.create>[0]): ReturnType<typeof TimingEvent.create> {
  return TimingEvent.create(input);
}

type ScenarioCase =
  | {
      description: string;
      expected: { accepted: true };
      input: { values: number[] };
      shape: 'accepts-valid-max-events';
      name: string;
    }
  | {
      description: string;
      expected: { errorNames: string[] };
      input: { values: unknown[] };
      shape: 'rejects-invalid-max-events';
      name: string;
    }
  | {
      description: string;
      expected: { accepted: true };
      input: { values: Array<Record<string, number>> };
      shape: 'accepts-valid-precision';
      name: string;
    }
  | {
      description: string;
      expected: { errorName: 'ConfigurationError' };
      input: { value: unknown };
      shape: 'rejects-non-object-precision';
      name: string;
    }
  | {
      description: string;
      expected: { errorName: 'ConfigurationError' };
      input: { value: unknown };
      shape: 'rejects-array-precision';
      name: string;
    }
  | {
      description: string;
      expected: { accepted: true };
      input: Record<string, never>;
      shape: 'accepts-empty-precision';
      name: string;
    }
  | {
      description: string;
      expected: { accepted: true };
      input: Record<string, never>;
      shape: 'accepts-null-max-events';
      name: string;
    }
  | {
      description: string;
      expected: { accepted: true };
      input: Record<string, never>;
      shape: 'accepts-undefined-max-events';
      name: string;
    }
  | {
      description: string;
      expected: { errorNames: string[] };
      input: { values: Array<Record<string, unknown>> };
      shape: 'rejects-invalid-precision';
      name: string;
    }
  | {
      description: string;
      expected: { errorName: 'ConfigurationError' };
      input: { value: Record<string, number> };
      shape: 'rejects-invalid-time-units';
      name: string;
    }
  | {
      description: string;
      expected: { results: boolean[] };
      input: { cases: Array<{ entity: string; value: unknown }> };
      shape: 'validates-entities';
      name: string;
    }
  | {
      description: string;
      expected: { maxDecimalPlaces: number; hasInitialize: true };
      input: { event: Parameters<typeof TimingEvent.create>[0]; timing: { precision: { ms: number } } };
      shape: 'applies-precision';
      name: string;
    }
  | {
      description: string;
      expected: { accepted: true };
      input: { timing: { maxEvents: number; precision: { ms: number } } };
      shape: 'accepts-all-options';
      name: string;
    }
  | {
      description: string;
      expected: { hasInitialize: true };
      input: Record<string, never>;
      shape: 'applies-defaults';
      name: string;
    };

type ScenarioRunner<K extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => void;
type RunnerMap = {
  [K in ScenarioCase['shape']]: ScenarioRunner<K>;
};

const runnerMap: RunnerMap = {
  'accepts-valid-max-events': (scenarioCase) => {
    for (const value of scenarioCase.input.values) {
      assert.doesNotThrow(() => {
        Timing.create({ maxEvents: value });
      });
    }
    assert.doesNotThrow(() => {
      Timing.create();
    });
    assert.equal(scenarioCase.expected.accepted, true);
  },

  'rejects-invalid-max-events': (scenarioCase) => {
    const errorNames: string[] = [];
    for (const value of scenarioCase.input.values) {
      assert.throws(() => {
        TimingValidator.validateMaxEvents(value);
      }, ConfigurationError);
      errorNames.push('ConfigurationError');
    }
    assert.deepStrictEqual(errorNames, scenarioCase.expected.errorNames);
  },

  'accepts-valid-precision': (scenarioCase) => {
    for (const precision of scenarioCase.input.values) {
      assert.doesNotThrow(() => {
        Timing.create({ precision });
      });
    }
    assert.doesNotThrow(() => {
      Timing.create();
    });
    assert.equal(scenarioCase.expected.accepted, true);
  },

  'accepts-empty-precision': (scenarioCase) => {
    assert.doesNotThrow(() => {
      TimingValidator.validatePrecision({});
    });
    assert.equal(scenarioCase.expected.accepted, true);
  },

  'accepts-null-max-events': (scenarioCase) => {
    assert.doesNotThrow(() => {
      TimingValidator.validateMaxEvents(null);
    });
    assert.equal(scenarioCase.expected.accepted, true);
  },

  'accepts-undefined-max-events': (scenarioCase) => {
    assert.doesNotThrow(() => {
      TimingValidator.validateMaxEvents(undefined);
    });
    assert.equal(scenarioCase.expected.accepted, true);
  },

  'rejects-non-object-precision': (scenarioCase) => {
    assert.throws(() => {
      TimingValidator.validatePrecision(scenarioCase.input.value);
    }, ConfigurationError);
    assert.equal(scenarioCase.expected.errorName, 'ConfigurationError');
  },

  'rejects-array-precision': (scenarioCase) => {
    assert.throws(() => {
      TimingValidator.validatePrecision(scenarioCase.input.value);
    }, ConfigurationError);
    assert.equal(scenarioCase.expected.errorName, 'ConfigurationError');
  },

  'rejects-invalid-precision': (scenarioCase) => {
    const errorNames: string[] = [];
    for (const value of scenarioCase.input.values) {
      assert.throws(() => {
        TimingValidator.validatePrecision(value);
      }, ConfigurationError);
      errorNames.push('ConfigurationError');
    }
    assert.deepStrictEqual(errorNames, scenarioCase.expected.errorNames);
  },

  'rejects-invalid-time-units': (scenarioCase) => {
    assert.throws(() => {
      TimingValidator.validatePrecision(scenarioCase.input.value);
    }, ConfigurationError);
    assert.equal(scenarioCase.expected.errorName, 'ConfigurationError');
  },

  'validates-entities': (scenarioCase) => {
    const results = scenarioCase.input.cases.map(({ entity, value }) => {
      const validator = entityValidatorMap[entity] ?? unknownEntityValidator(entity);
      return validator(value);
    });
    assert.deepStrictEqual(results, scenarioCase.expected.results);
  },

  'applies-precision': (scenarioCase) => {
    const timer = Timing.create(scenarioCase.input.timing);
    timer.event(createTimingEvent(scenarioCase.input.event));
    const events = timer.getEvents();
    assert.ok(events.initialize !== undefined);
    const valueStr = events.initialize.toString();
    const decimalPart = valueStr.split('.')[1];
    const maxDecimalPlaces = decimalPart === undefined ? 0 : decimalPart.length;
    assert.equal(maxDecimalPlaces <= scenarioCase.expected.maxDecimalPlaces, true);
    assert.equal(events.initialize !== undefined, scenarioCase.expected.hasInitialize);
  },

  'accepts-all-options': (scenarioCase) => {
    assert.doesNotThrow(() => {
      Timing.create(scenarioCase.input.timing);
    });
    assert.equal(scenarioCase.expected.accepted, true);
  },

  'applies-defaults': (scenarioCase) => {
    assert.equal(scenarioCase.input.hasInitialize, scenarioCase.expected.hasInitialize);
    const timer = Timing.create();
    const events = timer.getEvents();
    assert.ok(events.initialize !== undefined);
    assert.equal(events.initialize !== undefined, scenarioCase.expected.hasInitialize);
  }
};

function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Timing validation', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
