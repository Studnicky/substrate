import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DispatcherConfigEntity } from '../../../src/entities/DispatcherConfigEntity.js';

import { DispatcherAgent } from '../../../src/config/DispatcherAgent.js';
import { TestDispatcher } from '../../../src/testing/TestDispatcher.js';

import scenarioGroups from './dispatcher-agent.scenarios.json' with { type: 'json' };

type ScenarioCase = {
  description: string;
  expected: { options: Record<string, unknown> };
  input: { dispatcherAgent: DispatcherConfigEntity.Type };
  name: string;
};

const OPTIONS_SYMBOL_LABEL = 'Symbol(options)';

/** Materializes the `__UNDEFINED__`/`__INFINITY__` JSON sentinels into their real runtime values. */
function materializeSentinel(value: ScenarioCase['expected']['options'][string]): ScenarioCase['expected']['options'][string] {
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
  const options: unknown = Reflect.get(agent, optionsSymbol);
  assert.ok(typeof options === 'object' && options !== null && !Array.isArray(options), 'undici Agent options must be an object');

  const result: Record<string, unknown> = {};
  const keys = Object.keys(options);
  const keyLength = keys.length;
  for (let index = 0; index < keyLength; index += 1) {
    const key = keys[index];
    if (key === undefined) {
      continue;
    }
    const value: unknown = Reflect.get(options, key);
    Reflect.set(result, key, value);
  }
  return result;
}

function runCase(scenarioCase: ScenarioCase): void {
  const agent = DispatcherAgent.create(scenarioCase.input.dispatcherAgent);
  assert.ok(typeof agent === 'object');
  assert.ok(agent !== null);
  assert.ok(!(agent instanceof TestDispatcher), 'normal dispatcher configuration must create an undici Agent');
  assert.strictEqual(typeof agent.dispatch, 'function');

  const actualOptions = readAgentOptions(agent);
  const expectedOptions: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(scenarioCase.expected.options)) {
    expectedOptions[key] = materializeSentinel(value);
  }

  assert.deepStrictEqual(actualOptions, expectedOptions);
}

void describe('dispatcher agent configuration', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }

  void it('test transport creates a TestDispatcher', () => {
    const previous = process.env.SUBSTRATE_FETCH_TEST_TRANSPORT;
    process.env.SUBSTRATE_FETCH_TEST_TRANSPORT = '1';

    try {
      const agent = DispatcherAgent.create({});
      assert.ok(agent instanceof TestDispatcher);
      assert.strictEqual(typeof agent.fetch, 'function');
    } finally {
      if (previous === undefined) {
        delete process.env.SUBSTRATE_FETCH_TEST_TRANSPORT;
      } else {
        process.env.SUBSTRATE_FETCH_TEST_TRANSPORT = previous;
      }
    }
  });
});
