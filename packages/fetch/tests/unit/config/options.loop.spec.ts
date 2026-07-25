import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ValidateOptions } from '../../../src/config/schemas/validateOptions.js';

type RuntimeTag =
  | { __kind: 'abort-signal' }
  | { __kind: 'undefined' };

type RuntimeValue =
  | null
  | boolean
  | number
  | string
  | RuntimeTag
  | RuntimeValue[]
  | { [key: string]: RuntimeValue };

type ScenarioCase = {
  description: string;
  expected: { kind: 'ok'; messageIncludes?: readonly string[] } | { kind: 'throws'; messageIncludes: readonly string[] };
  input: {
    options: RuntimeValue;
  };
  name: string;
};

import scenarioGroups from './options.scenarios.json';

type ExpectedOutcomeRunner = (config: unknown, expected: ScenarioCase['expected']) => void;
type RuntimeTagMaterializer = (value: RuntimeTag) => unknown;

const runtimeTagMap: Record<RuntimeTag['__kind'], RuntimeTagMaterializer> = {
  'abort-signal': () => new AbortController().signal,
  undefined: () => undefined
};

function isRuntimeTag(value: RuntimeValue): value is RuntimeTag {
  return value !== null && typeof value === 'object' && '__kind' in value;
}

function materializeRuntimeValue(value: RuntimeValue): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => { return materializeRuntimeValue(item); });
  }

  if (isRuntimeTag(value)) {
    return runtimeTagMap[value.__kind](value);
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

const expectedOutcomeMap: Record<ScenarioCase['expected']['kind'], ExpectedOutcomeRunner> = {
  ok: (config) => {
    assert.doesNotThrow(() => {
      ValidateOptions.validate(config);
    });
  },
  throws: (config, expected) => {
    assert.ok(expected.messageIncludes !== undefined);
    assert.throws(() => {
      ValidateOptions.validate(config);
    }, (error: Error) => {
      for (const expectedMessagePart of expected.messageIncludes) {
        assert.ok(error.message.includes(expectedMessagePart));
      }
      return true;
    });
  }
};

function runCase(scenarioCase: ScenarioCase): void {
  const config = materializeRuntimeValue(scenarioCase.input.options);
  expectedOutcomeMap[scenarioCase.expected.kind](config, scenarioCase.expected);
}

void describe('fetch options validation', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
