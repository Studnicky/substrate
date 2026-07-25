import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BaseError } from '@studnicky/errors';

import { ConfigurationError } from '../../../src/errors/ConfigurationError.js';

import scenarioGroups from './ConfigurationError.scenarios.json';

type ConstructionOutcome =
  | 'ConfigurationError'
  | 'base-error'
  | 'config.invalid'
  | 'error'
  | 'retryable-false'
  | 'stack';

type ConstructionScenario = {
  readonly description: string;
  readonly outcome: ConstructionOutcome;
};

type DirectKind = 'cause' | 'json' | 'message';

type DirectOutcome = {
  readonly causeMessage?: string;
  readonly code?: string;
  readonly message?: string;
};

type DirectScenario = {
  readonly causeMessage?: string;
  readonly description: string;
  readonly kind: DirectKind;
  readonly message: string;
  readonly outcome: DirectOutcome;
};

const typedScenarioGroups: {
  readonly construction: readonly ConstructionScenario[];
  readonly direct: readonly DirectScenario[];
} = scenarioGroups;

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
    throw new Error(`${label} is required`);
  }
  return value;
}

const directAssertions: Record<DirectKind, (scenario: DirectScenario) => void> = {
  'cause': (scenario): void => {
    const cause = new Error(expectedString(scenario.causeMessage, 'causeMessage'));
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
    assert.strictEqual(json['message'], expectedString(scenario.outcome.message, 'outcome.message'));
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
        directAssertions[scenario.kind](scenario);
      });
    }
  });
});
