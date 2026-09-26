import { RuntimeError } from '@studnicky/errors/node';
import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FetchClient } from '../../../src/node/index.js';

import { createRuntimeValueGuard } from '../../helpers/RuntimeValueGuard.js';
import scenarioGroups from './metadata.scenarios.json' with { type: 'json' };

type RuntimeTag =
  | { shape: 'undefined' };

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
    metadata: RuntimeValue;
  };
  name: string;
};

type ExpectedOutcomeRunner = (config: unknown, expected: ScenarioCase['expected']) => void;
type RuntimeTagMaterializer = (value: RuntimeTag) => unknown;

const runtimeTagMap: Record<RuntimeTag['shape'], RuntimeTagMaterializer> = {
  undefined: () => undefined
};

const runtimeValueGuard = createRuntimeValueGuard(['undefined'] as const);

function isRuntimeTag(value: RuntimeValue): value is RuntimeTag {
  return value !== null && typeof value === 'object' && 'shape' in value;
}

function isScenarioCase(value: unknown): value is ScenarioCase {
  return Predicates.isObject(value)
    && typeof value.description === 'string'
    && typeof value.name === 'string'
    && Predicates.isObject(value.expected)
    && (value.expected.shape === 'ok' || value.expected.shape === 'throws')
    && Predicates.isObject(value.input)
    && runtimeValueGuard.isRuntimeValue(value.input.metadata);
}

function isScenarioFile(value: unknown): value is { cases: ScenarioCase[] } {
  return Predicates.isObject(value) && Array.isArray(value.cases) && value.cases.every(isScenarioCase);
}

function requireScenarioFile(value: unknown): { cases: ScenarioCase[] } {
  if (!isScenarioFile(value)) {
    throw RuntimeError.create('metadata.scenarios.json does not match the expected scenario case shape');
  }
  return value;
}

function materializeRuntimeValue(value: RuntimeValue): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => { return materializeRuntimeValue(item); });
  }

  if (isRuntimeTag(value)) {
    return runtimeTagMap[value.shape](value);
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
      Reflect.apply(FetchClient.create, FetchClient, [{ 'metadata': config }]);
    });
  },
  throws: (config, expected) => {
    const { messageIncludes } = expected;
    assert.ok(messageIncludes !== undefined);
    assert.throws(() => {
      Reflect.apply(FetchClient.create, FetchClient, [{ 'metadata': config }]);
    }, (error: Error) => {
      assert.ok(error.message.length > 0);
      return true;
    });
  }
};

function runCase(scenarioCase: ScenarioCase): void {
  const config = materializeRuntimeValue(scenarioCase.input.metadata);
  expectedOutcomeMap[scenarioCase.expected.shape](config, scenarioCase.expected);
}

void describe('fetch metadata validation', () => {
  for (const scenario of requireScenarioFile(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
