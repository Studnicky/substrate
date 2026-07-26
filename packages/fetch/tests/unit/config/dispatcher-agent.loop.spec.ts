import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DispatcherConfigEntity } from '../../../src/entities/DispatcherConfigEntity.js';

import { DispatcherAgent } from '../../../src/config/DispatcherAgent.js';

import scenarioGroups from './dispatcher-agent.scenarios.json' with { type: 'json' };

type ScenarioCase = {
  description: string;
  expected: { options: Record<string, unknown> };
  input: { dispatcherAgent: DispatcherConfigEntity.Type };
  name: string;
};

const OPTIONS_SYMBOL_LABEL = 'Symbol(options)';

/** Materializes the `__UNDEFINED__`/`__INFINITY__` JSON sentinels into their real runtime values. */
function materializeSentinel(value: unknown): unknown {
  if (value === '__UNDEFINED__') {
    return undefined;
  }
  if (value === '__INFINITY__') {
    return Number.POSITIVE_INFINITY;
  }
  return value;
}

/**
 * Reads undici's `Agent` private option record through its own `Symbol(options)` slot.
 * This is the only place the merged dispatcher config surfaces on the instance, so it is
 * the seam that lets a scenario assert what `DispatcherAgent.create` actually built.
 */
function readAgentOptions(agent: object): Record<string, unknown> {
  const optionsSymbol = Object.getOwnPropertySymbols(agent).find((symbol) => { return symbol.toString() === OPTIONS_SYMBOL_LABEL; });
  assert.ok(optionsSymbol !== undefined, 'undici Agent must expose its Symbol(options) slot');
  return Reflect.get(agent, optionsSymbol as symbol) as Record<string, unknown>;
}

function runCase(scenarioCase: ScenarioCase): void {
  const agent = DispatcherAgent.create(scenarioCase.input.dispatcherAgent);
  assert.ok(typeof agent === 'object');
  assert.ok(agent !== null);
  assert.strictEqual(typeof agent.dispatch, 'function');

  const actualOptions = readAgentOptions(agent);
  const expectedOptions: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(scenarioCase.expected.options)) {
    expectedOptions[key] = materializeSentinel(value);
  }

  assert.deepStrictEqual(actualOptions, expectedOptions);
}

void describe('dispatcher agent configuration', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
