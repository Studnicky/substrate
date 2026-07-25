import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BaseError } from '../../src/errors/BaseError.js';
import { CliExitError } from '../../src/errors/CliExitError.js';
import scenarioGroups from './cli-exit-error.scenarios.json';

type ScenarioCase =
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'instance-check' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'exit-code' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'code-value' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'not-retryable' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'empty-message' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'name-value' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'json-code' };

type ScenarioRunner<K extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => void;

type RunnerMap = {
  [K in ScenarioCase['shape']]: ScenarioRunner<K>;
};

const runnerMap: RunnerMap = {
  'code-value': (scenarioCase) => {
    const err = new CliExitError();
    const expected = scenarioCase.expected as { code: string };
    const input = scenarioCase.input as { code: string };
    assert.strictEqual(err.code, String(expected.code));
    assert.strictEqual(input.code, expected.code);
  },

  'empty-message': (scenarioCase) => {
    const err = new CliExitError();
    const expected = scenarioCase.expected as { message: string };
    const input = scenarioCase.input as { message: string };
    assert.strictEqual(err.message, String(expected.message));
    assert.strictEqual(input.message, expected.message);
  },

  'exit-code': (scenarioCase) => {
    const cliExitInput = scenarioCase.input as { error: { exitCode: number } };
    const err = new CliExitError(Number(cliExitInput.error.exitCode));
    assert.strictEqual(err.exitCode, Number(scenarioCase.expected.exitCode));
  },

  'instance-check': (scenarioCase) => {
    const err = new CliExitError();
    const expected = scenarioCase.expected as { instanceOf: string[] };
    const input = scenarioCase.input as { instanceOf: string[] };
    assert.ok(err instanceof Error);
    assert.ok(err instanceof BaseError);
    assert.ok(err instanceof CliExitError);
    assert.deepStrictEqual(input.instanceOf, expected.instanceOf);
  },

  'json-code': (scenarioCase) => {
    const cliExitInput = scenarioCase.input as { code: string; error: { exitCode: number } };
    const err = new CliExitError(Number(cliExitInput.error.exitCode));
    const expected = scenarioCase.expected as { code: string };
    const json = err.toJSON() as Record<string, unknown>;
    assert.strictEqual(json.code, String(expected.code));
    assert.strictEqual(cliExitInput.code, expected.code);
  },

  'name-value': (scenarioCase) => {
    const err = new CliExitError();
    const expected = scenarioCase.expected as { name: string };
    const input = scenarioCase.input as { name: string };
    assert.strictEqual(err.name, String(expected.name));
    assert.strictEqual(input.name, expected.name);
  },

  'not-retryable': (scenarioCase) => {
    const err = new CliExitError();
    const expected = scenarioCase.expected as { retryable: boolean };
    const input = scenarioCase.input as { retryable: boolean };
    assert.strictEqual(err.retryable, Boolean(expected.retryable));
    assert.strictEqual(input.retryable, expected.retryable);
  }
};

function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('CliExitError', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
