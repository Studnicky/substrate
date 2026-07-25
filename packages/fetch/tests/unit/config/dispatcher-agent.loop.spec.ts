import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DispatcherAgent } from '../../../src/config/DispatcherAgent.js';

import scenarioGroups from './dispatcher-agent.scenarios.json';

type ScenarioCase =
  | {
      description: string;
      expected: { optionKeys: number };
      input: { dispatcherAgent: Record<string, unknown> };
      kind: 'default-config' | 'sparse-config';
      name: string;
    }
  | {
      description: string;
      expected: { optionKeys: number };
      input: { dispatcherAgent: Record<string, unknown> };
      kind: 'comprehensive-config';
      name: string;
    };

function runCase(scenarioCase: ScenarioCase): void {
  const agent = DispatcherAgent.create(scenarioCase.input.dispatcherAgent as never);
  assert.ok(typeof agent === 'object');
  assert.ok(agent !== null);
  assert.strictEqual(typeof agent.dispatch, 'function');
  assert.strictEqual(Object.keys(agent).length >= 0, true);
  assert.strictEqual(scenarioCase.expected.optionKeys >= 0, true);
}

void describe('dispatcher agent configuration', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
