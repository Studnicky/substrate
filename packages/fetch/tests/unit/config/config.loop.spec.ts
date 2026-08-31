import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FetchClient } from '../../../src/node/index.js';
import scenarioGroups from './config.scenarios.json' with { type: 'json' };

type RuntimeTag =
  | { shape: 'infinity' }
  | { shape: 'undefined' };

type RuntimeValue =
  | RuntimeTag
  | RuntimeValue[]
  | boolean
  | null
  | number
  | string
  | { [key: string]: RuntimeValue };

type MaterializedRuntimeValue =
  | MaterializedRuntimeValue[]
  | boolean
  | null
  | number
  | string
  | undefined
  | { [key: string]: MaterializedRuntimeValue };

type ExpectedOutcome =
  | { shape: 'ok'; messageIncludes?: readonly string[] }
  | { shape: 'throws'; messageIncludes: readonly string[] };

type ScenarioCase = {
  description: string;
  expected: ExpectedOutcome;
  input: {
    fetchClient: RuntimeValue;
  };
  shape: string;
  name: string;
};

type ExpectedOutcomeRunner = (config: MaterializedRuntimeValue, expected: ExpectedOutcome) => void;
type RuntimeTagMaterializer = (value: RuntimeTag) => MaterializedRuntimeValue;

const runtimeTagMap: Record<RuntimeTag['shape'], RuntimeTagMaterializer> = {
  infinity: () => Number.POSITIVE_INFINITY,
  undefined: () => undefined
};

function isRuntimeTag(value: RuntimeValue): value is RuntimeTag {
  return value !== null && typeof value === 'object' && 'shape' in value;
}

function materializeRuntimeValue(value: RuntimeValue): MaterializedRuntimeValue {
  if (Array.isArray(value)) {
    return value.map((item) => {
      return materializeRuntimeValue(item);
    });
  }

  if (isRuntimeTag(value)) {
    return runtimeTagMap[value.shape](value);
  }

  if (value !== null && typeof value === 'object') {
    const materialized: Record<string, MaterializedRuntimeValue> = {};

    for (const [key, entry] of Object.entries(value)) {
      materialized[key] = materializeRuntimeValue(entry);
    }

    return materialized;
  }

  return value;
}

function createFetchClient(config: MaterializedRuntimeValue): unknown {
  return Reflect.apply(FetchClient.create, FetchClient, [config]);
}

const expectedOutcomeMap: Record<ExpectedOutcome['shape'], ExpectedOutcomeRunner> = {
  ok: (config) => {
    assert.doesNotThrow(() => {
      createFetchClient(config);
    });
  },
  throws: (config, expected) => {
    const { messageIncludes } = expected;
    assert.ok(messageIncludes !== undefined);
    assert.throws(() => {
      createFetchClient(config);
    }, (error: Error) => {
      assert.ok(error.message.length > 0);

      return true;
    });
  }
};

function runCase(scenarioCase: ScenarioCase): void {
  const config = materializeRuntimeValue(scenarioCase.input.fetchClient);
  expectedOutcomeMap[scenarioCase.expected.shape](config, scenarioCase.expected);
}

void describe('fetch config', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
