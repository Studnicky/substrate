import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FetchClient } from '../../../src/index.js';
import scenarioGroups from './config.scenarios.json';

type RuntimeTag =
  | { kind: 'infinity' }
  | { kind: 'undefined' };

type RuntimeValue =
  | RuntimeTag
  | RuntimeValue[]
  | boolean
  | null
  | number
  | string
  | { [key: string]: RuntimeValue };

type ExpectedOutcome =
  | { kind: 'ok'; messageIncludes?: readonly string[] }
  | { kind: 'throws'; messageIncludes: readonly string[] };

type ScenarioCase = {
  description: string;
  expected: ExpectedOutcome;
  input: {
    fetchClient: RuntimeValue;
  };
  kind: string;
  name: string;
};

type ExpectedOutcomeRunner = (config: unknown, expected: ExpectedOutcome) => void;
type RuntimeTagMaterializer = (value: RuntimeTag) => unknown;

const runtimeTagMap: Record<RuntimeTag['kind'], RuntimeTagMaterializer> = {
  infinity: () => Number.POSITIVE_INFINITY,
  undefined: () => undefined
};

function isRuntimeTag(value: RuntimeValue): value is RuntimeTag {
  return value !== null && typeof value === 'object' && 'kind' in value;
}

function materializeRuntimeValue(value: RuntimeValue): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => {
      return materializeRuntimeValue(item);
    });
  }

  if (isRuntimeTag(value)) {
    return runtimeTagMap[value.kind](value);
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

function createFetchClient(config: unknown): unknown {
  return Reflect.apply(FetchClient.create, FetchClient, [config]);
}

const expectedOutcomeMap: Record<ExpectedOutcome['kind'], ExpectedOutcomeRunner> = {
  ok: (config) => {
    assert.doesNotThrow(() => {
      createFetchClient(config);
    });
  },
  throws: (config, expected) => {
    assert.ok(expected.messageIncludes !== undefined);
    assert.throws(() => {
      createFetchClient(config);
    }, (error: Error) => {
      for (const expectedMessagePart of expected.messageIncludes) {
        assert.ok(error.message.includes(expectedMessagePart));
      }

      return true;
    });
  }
};

function runCase(scenarioCase: ScenarioCase): void {
  const config = materializeRuntimeValue(scenarioCase.input.fetchClient);
  expectedOutcomeMap[scenarioCase.expected.kind](config, scenarioCase.expected);
}

void describe('fetch config', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
