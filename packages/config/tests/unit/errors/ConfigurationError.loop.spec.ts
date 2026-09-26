import { RuntimeError, BaseError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';



import { ConfigurationError } from '../../../src/errors/ConfigurationError.js';
import { ConfigurationErrorScenariosEntity } from '../entities/ConfigurationErrorScenariosEntity.js';

import scenarioGroups from './ConfigurationError.scenarios.json' with { type: 'json' };

type ConstructionScenario = ConfigurationErrorScenariosEntity.Type['construction'][number];

type ConstructionOutcome = ConstructionScenario['outcome'];

type DirectScenario = ConfigurationErrorScenariosEntity.Type['direct'][number];

type DirectShape = DirectScenario['shape'];

const typedScenarioGroups = ConfigurationErrorScenariosEntity.intake(scenarioGroups);

const constructionAssertions: Record<ConstructionOutcome, (err: ConfigurationError) => void> = {
  'ConfigurationError': (err): void => {
    assert.strictEqual(err.name, 'ConfigurationError');
  },
  'base-error': (err): void => {
    assert.ok(err instanceof BaseError);
  },
  'config.invalid': (err): void => {
    assert.strictEqual(err.code, 'config.invalid');
  },
  'error': (err): void => {
    assert.ok(err instanceof Error);
    assert.ok(err instanceof ConfigurationError);
  },
  'retryable-false': (err): void => {
    assert.strictEqual(err.retryable, false);
  },
  'stack': (err): void => {
    assert.ok(typeof err.stack === 'string');
    assert.ok(err.stack.length > 0);
  }
};

function expectedString(value: string | undefined, label: string): string {
  if (value === undefined) {
    throw RuntimeError.create(`${label} is required`);
  }
  return value;
}

const directAssertions: Record<DirectShape, (scenario: DirectScenario) => void> = {
  'cause': (scenario): void => {
    const cause = RuntimeError.create(expectedString(scenario.causeMessage, 'causeMessage'));
    const err = ConfigurationError.create(scenario.message, cause);

    assert.strictEqual(err.message, scenario.message);
    assert.strictEqual(err.cause, cause);
    assert.ok(err.cause instanceof Error);
    assert.strictEqual(err.cause.message, expectedString(scenario.outcome.causeMessage, 'outcome.causeMessage'));
  },
  'json': (scenario): void => {
    const err = ConfigurationError.create(scenario.message);
    const json = err.toJSON();

    assert.strictEqual(json['code'], expectedString(scenario.outcome.code, 'outcome.code'));
    // RFC 9457 3.1.4: the occurrence-specific message is `detail`.
    assert.strictEqual(json['detail'], expectedString(scenario.outcome.message, 'outcome.message'));
  },
  'message': (scenario): void => {
    const err = ConfigurationError.create(scenario.message);

    assert.strictEqual(err.message, expectedString(scenario.outcome.message, 'outcome.message'));
  }
};

void describe('ConfigurationError', () => {
  void describe('construction', () => {
    for (const scenario of typedScenarioGroups.construction) {
      void it(scenario.description, () => {
        const err = ConfigurationError.create('test');
        constructionAssertions[scenario.outcome](err);
      });
    }
  });

  void describe('direct', () => {
    for (const scenario of typedScenarioGroups.direct) {
      void it(scenario.description, () => {
        directAssertions[scenario.shape](scenario);
      });
    }
  });
});
