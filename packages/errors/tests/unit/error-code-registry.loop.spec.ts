import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ErrorCodeRegistry } from '../../src/errors/ErrorCodeRegistry.js';
import scenarioGroups from './error-code-registry.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | {
      description: string;
      expected: Record<string, unknown>;
      input: {
        descriptor?: {
          code: string;
          description: string;
          retryable: boolean;
        };
      };
      shape: 'constructor-throws' | 'register-duplicate' | 'register-unique';
      name: string;
    };

type ScenarioRunner = (scenario: ScenarioCase) => void;

const runnerMap: Record<ScenarioCase['shape'], ScenarioRunner> = {
  'constructor-throws': (scenario) => {
    assert.throws(() => {
      Reflect.construct(ErrorCodeRegistry, []);
    }, (error) => {
      assert.ok(error instanceof Error);
      assert.strictEqual((error as Error).message, String(scenario.expected.message));
      return true;
    });
  },
  'register-duplicate': (scenario) => {
    const descriptor = scenario.input.descriptor;
    assert.ok(descriptor);
    assert.doesNotThrow(() => {
      ErrorCodeRegistry.register(descriptor);
    });
    assert.throws(() => {
      ErrorCodeRegistry.register(descriptor);
    }, (error) => {
      assert.ok(error instanceof Error);
      assert.ok(error.message.includes(String(scenario.expected.messageIncludes)));
      return true;
    });
  },
  'register-unique': (scenario) => {
    const descriptor = scenario.input.descriptor;
    assert.ok(descriptor);
    if (scenario.expected.registered) {
      assert.doesNotThrow(() => {
        ErrorCodeRegistry.register(descriptor);
      });
    } else {
      assert.throws(() => {
        ErrorCodeRegistry.register(descriptor);
      });
    }
  }
};

function runCase(scenario: ScenarioCase): void {
  runnerMap[scenario.shape](scenario);
}

void describe('ErrorCodeRegistry', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
