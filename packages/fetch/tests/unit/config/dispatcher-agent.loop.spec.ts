import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import { JsonObject } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { it } from 'node:test';

import { DispatcherAgent } from '../../../src/config/DispatcherAgent.js';
import { TestDispatcher } from '../../../src/testing/TestDispatcher.js';
import { TestTransportFlag } from '../../helpers/TestTransportFlag.js';
import scenarioGroups from './dispatcher-agent.scenarios.json' with { 'type': 'json' };
import { DispatcherAgentScenarioCaseEntity } from './entities/DispatcherAgentScenarioCaseEntity.js';

class DispatcherAgentRunners {
  private static readonly optionsSymbolLabel = 'Symbol(options)';

  static 'builds-agent'(scenarioCase: ScenarioCaseOfType<DispatcherAgentScenarioCaseEntity.Type, 'builds-agent'>): void {
    const agent = DispatcherAgent.create(scenarioCase.input.dispatcherAgent);
    assert.ok(typeof agent === 'object');
    assert.ok(!(agent instanceof TestDispatcher), 'normal dispatcher configuration must create an undici Agent');
    assert.strictEqual(typeof agent.dispatch, 'function');

    const actualOptions = DispatcherAgentRunners.readAgentOptions(agent);
    const expectedEntries = new Map<string, unknown>();
    const pairs = Object.entries(scenarioCase.expected.options);
    for (let index = 0; index < pairs.length; index += 1) {
      const pair = pairs[index] ?? ['', null];
      expectedEntries.set(pair[0], DispatcherAgentRunners.materializeSentinel(pair[1]));
    }
    const expectedOptions = JsonObject.fromEntries(expectedEntries);

    assert.deepStrictEqual(actualOptions, expectedOptions);
  }

  static declaresTestTransport(): void {
    void it('test transport creates a TestDispatcher', () => {
      using _ = TestTransportFlag.enable();
      const agent = DispatcherAgent.create({});
      assert.ok(agent instanceof TestDispatcher);
      assert.strictEqual(typeof agent.fetch, 'function');
    });
  }

  /** Materializes the `__UNDEFINED__`/`__INFINITY__` JSON sentinels into their real runtime values. */
  private static materializeSentinel(value: boolean | number | string | unknown[] | object | null): unknown {
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
  private static readAgentOptions(agent: object): unknown {
    const symbols = Object.getOwnPropertySymbols(agent);
    let optionsSymbol: symbol | undefined;
    for (let index = 0; index < symbols.length; index += 1) {
      const candidate = symbols[index];
      if (candidate?.toString() === DispatcherAgentRunners.optionsSymbolLabel) {
        optionsSymbol = candidate;
      }
    }
    assert.ok(optionsSymbol !== undefined, 'undici Agent must expose its Symbol(options) slot');
    const options: unknown = Reflect.get(agent, optionsSymbol);
    assert.ok(typeof options === 'object' && options !== null && !Array.isArray(options), 'undici Agent options must be an object');

    const entries = new Map<string, unknown>();
    const keys = Object.keys(options);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index] ?? '';
      const value: unknown = Reflect.get(options, key);
      entries.set(key, value);
    }
    const result = JsonObject.fromEntries(entries);
    return result;
  }
}

ScenarioSuite.register({
  'entity': DispatcherAgentScenarioCaseEntity,
  'extraTests': DispatcherAgentRunners.declaresTestTransport,
  'file': scenarioGroups,
  'name': 'dispatcher agent configuration',
  'runners': DispatcherAgentRunners
});
