import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ValidateRequestIdGenerator } from '../../../src/config/schemas/validateRequestIdGenerator.js';

import scenarioGroups from './request-id-generator.scenarios.json';

type RuntimeTag =
  | { __shape: 'undefined' }
  | { __shape: 'null' }
  | { __shape: 'function-return-string'; value: string }
  | { __shape: 'function-return-value'; value: unknown }
  | { __shape: 'function-throws'; message: string };

type RuntimeValue =
  | boolean
  | null
  | number
  | string
  | RuntimeTag
  | RuntimeValue[]
  | { [key: string]: RuntimeValue };

type ScenarioCase = {
  description: string;
  expected: { shape: 'ok'; messageIncludes?: readonly string[] } | { shape: 'throws'; messageIncludes: readonly string[] };
  input: {
    requestIdGenerator: RuntimeValue;
  };
  name: string;
};

type ExpectedOutcomeRunner = (config: unknown, expected: ScenarioCase['expected']) => void;
type RuntimeTagMaterializer = (value: RuntimeTag) => unknown;

const runtimeTagMap: Record<RuntimeTag['__shape'], RuntimeTagMaterializer> = {
  'function-return-string': (value) => {
    if ('value' in value) {
      return () => value.value;
    }

    throw new Error('requestIdGenerator return tag must include a value');
  },
  'function-return-value': (value) => {
    if ('value' in value) {
      return () => value.value;
    }

    throw new Error('requestIdGenerator return tag must include a value');
  },
  'function-throws': (value) => {
    if ('message' in value) {
      return () => { throw new Error(value.message); };
    }

    throw new Error('requestIdGenerator throw tag must include a message');
  },
  null: () => null,
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

const expectedOutcomeMap: Record<ScenarioCase['expected']['shape'], ExpectedOutcomeRunner> = {
  ok: (config) => {
    assert.doesNotThrow(() => {
      ValidateRequestIdGenerator.validate(config);
    });
  },
  throws: (config, expected) => {
    assert.ok(expected.messageIncludes !== undefined);
    assert.throws(() => {
      ValidateRequestIdGenerator.validate(config);
    }, (error: Error) => {
      for (const expectedMessagePart of expected.messageIncludes) {
        assert.ok(error.message.includes(expectedMessagePart));
      }
      return true;
    });
  }
};

function runCase(scenarioCase: ScenarioCase): void {
  const config = materializeRuntimeValue(scenarioCase.input.requestIdGenerator);
  expectedOutcomeMap[scenarioCase.expected.shape](config, scenarioCase.expected);
}

void describe('fetch requestIdGenerator validation', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
