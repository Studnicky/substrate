/**
 * Looping scenario runner for public-API function tests.
 * Registers individual `it` cases from a typed scenario list.
 *
 * @module
 */
import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { Scenario } from './Scenario.js';

import { CodeGuard } from './hasCode.js';

/**
 * Registers `it` test cases from a scenario list.
 * For throw scenarios, asserts that the error's `code` property matches `expected.throws`.
 */
export class ScenarioRunner {
  /**
   * Registers `it` test cases from a scenario list.
   */
  public static run<TInput, TOutput>(
    label: string,
    scenarios: readonly Scenario<TInput, TOutput>[],
    exec: (input: TInput) => TOutput
  ): void {
    const count = scenarios.length;

    for (let index = 0; index < count; index++) {
      const scenario = scenarios[index];

      if (scenario === undefined) {
        continue;
      }

      void it(`${label} :: ${scenario.name}`, () => {
        if (
          typeof scenario.expected === 'object'
          && scenario.expected !== null
          && 'throws' in scenario.expected
        ) {
          const expectedThrow = scenario.expected;
          const expectedCode = expectedThrow.throws;

          try {
            exec(scenario.input);
            assert.fail(`expected throw with code ${expectedCode}`);
          } catch (thrownError) {
            if (CodeGuard.has(thrownError)) {
              assert.equal(thrownError.code, expectedCode);
            } else {
              assert.fail(`expected thrown value to have a code property, got: ${typeof thrownError}`);
            }
          }
        } else {
          assert.deepStrictEqual(exec(scenario.input), scenario.expected);
        }
      });
    }
  }
}
