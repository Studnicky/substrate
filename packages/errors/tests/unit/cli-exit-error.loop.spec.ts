import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BaseError } from '../../src/errors/BaseError.js';
import { CliExitError } from '../../src/errors/CliExitError.js';
import scenarioGroups from './cli-exit-error.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'instance-check'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'exit-code'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'code-value'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'not-retryable'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'empty-message'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'name-value'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'json-code'; name: string };

type ScenarioRunner<K extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => void;

type RunnerMap = {
  [K in ScenarioCase['shape']]: ScenarioRunner<K>;
};

function isOmittedTag(value: number | object): value is { __shape: 'undefined' } {
  return typeof value === 'object' && value !== null && Reflect.get(value, '__shape') === 'undefined';
}

const runnerMap: RunnerMap = {
  'code-value': (scenarioCase) => {
    const err = new CliExitError();
    const expected = scenarioCase.expected as { code: string };
    assert.strictEqual(err.code, String(expected.code));
  },

  'empty-message': (scenarioCase) => {
    const err = new CliExitError();
    const expected = scenarioCase.expected as { message: string };
    assert.strictEqual(err.message, String(expected.message));
  },

  'exit-code': (scenarioCase) => {
    const cliExitInput = scenarioCase.input as { error: { exitCode: number | { __shape: 'undefined' } } };
    const rawExitCode = cliExitInput.error.exitCode;
    const err = isOmittedTag(rawExitCode) ? new CliExitError() : new CliExitError(Number(rawExitCode));
    assert.strictEqual(err.exitCode, Number(scenarioCase.expected.exitCode));
  },

  'instance-check': (_scenarioCase) => {
    const err = new CliExitError();
    assert.ok(err instanceof Error);
    assert.ok(err instanceof BaseError);
    assert.ok(err instanceof CliExitError);
  },

  'json-code': (scenarioCase) => {
    const cliExitInput = scenarioCase.input as { code: string; error: { exitCode: number } };
    const err = new CliExitError(Number(cliExitInput.error.exitCode));
    const expected = scenarioCase.expected as { code: string };
    const json = err.toJSON() as Record<string, unknown>;
    assert.strictEqual(json.code, String(expected.code));
  },

  'name-value': (scenarioCase) => {
    const err = new CliExitError();
    const expected = scenarioCase.expected as { name: string };
    assert.strictEqual(err.name, String(expected.name));
  },

  'not-retryable': (scenarioCase) => {
    const err = new CliExitError();
    const expected = scenarioCase.expected as { retryable: boolean };
    assert.strictEqual(err.retryable, Boolean(expected.retryable));
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
