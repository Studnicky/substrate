import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validateDispatcher } from '../../src/config/schemas/validateDispatcher.js';

type RuntimeValue =
  | null
  | boolean
  | number
  | string
  | RuntimeTag
  | RuntimeValue[]
  | { [key: string]: RuntimeValue };

type RuntimeTag =
  | { __shape: 'infinity' }
  | { __shape: 'undefined' };

type ExpectedOutcome =
  | { shape: 'ok'; messageIncludes?: readonly string[] }
  | { shape: 'throws'; messageIncludes: readonly string[] };

type ScenarioCase = {
  description: string;
  expected: ExpectedOutcome;
  input: {
    dispatcher: RuntimeValue;
  };
  name: string;
};

import scenarioGroups from './undici-config-validation.scenarios.json';

type ExpectedOutcomeRunner = (config: unknown, expected: ExpectedOutcome) => void;
type RuntimeTagMaterializer = (value: RuntimeTag) => unknown;

const runtimeTagMap: Record<RuntimeTag['__shape'], RuntimeTagMaterializer> = {
  infinity: () => Number.POSITIVE_INFINITY,
  undefined: () => undefined
};

function isRuntimeTag(value: RuntimeValue): value is RuntimeTag {
  return value !== null && typeof value === 'object' && '__shape' in value;
}

function materializeRuntimeValue(value: RuntimeValue): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => { return materializeRuntimeValue(item); });
  }

  if (isRuntimeTag(value)) {
    return runtimeTagMap[value.__shape](value);
  }

  if (value !== null && typeof value === 'object') {
    const materialized: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      materialized[key] = materializeRuntimeValue(entry);
    }

    return materialized;
  }

  return value;
}

const expectedOutcomeMap: Record<ExpectedOutcome['shape'], ExpectedOutcomeRunner> = {
  ok: (config) => {
    assert.doesNotThrow(() => {
      validateDispatcher(config);
    });
  },
  throws: (config, expected) => {
    assert.ok(expected.messageIncludes !== undefined);
    assert.throws(() => {
      validateDispatcher(config);
    }, (error: Error) => {
      for (const expectedMessagePart of expected.messageIncludes) {
        assert.ok(error.message.includes(expectedMessagePart));
      }
      return true;
    });
  }
};

function runCase(scenarioCase: ScenarioCase): void {
  const config = materializeRuntimeValue(scenarioCase.input.dispatcher);
  expectedOutcomeMap[scenarioCase.expected.shape](config, scenarioCase.expected);
}

void describe('pool configuration validation', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
