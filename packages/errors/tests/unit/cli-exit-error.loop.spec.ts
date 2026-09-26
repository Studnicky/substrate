import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';

import { BaseError } from '../../src/errors/BaseError.js';
import { CliExitError } from '../../src/errors/CliExitError.js';
import { CliExitErrorScenarioCaseEntity } from './entities/CliExitErrorScenarioCaseEntity.js';
import scenarioGroups from './cli-exit-error.scenarios.json' with { type: 'json' };

const fileIntake = ScenarioFileCompiler.compileIntake(CliExitErrorScenarioCaseEntity.Schema, CliExitErrorScenarioCaseEntity.Node);

type ScenarioCase = CliExitErrorScenarioCaseEntity.Type;
type ExitCodeInput = NonNullable<NonNullable<ScenarioCase['input']['error']>['exitCode']>;

type ScenarioRunner = (scenarioCase: ScenarioCase) => void;

function isOmittedTag(value: ExitCodeInput): value is { '__shape': 'undefined' } {
  return typeof value === 'object';
}

const runnerMap = {
  'code-value': (scenarioCase) => {
    const err = new CliExitError();
    assert.strictEqual(err.code, scenarioCase.expected.code);
  },

  'empty-message': (scenarioCase) => {
    const err = new CliExitError();
    assert.strictEqual(err.message, scenarioCase.expected.message);
  },

  'exit-code': (scenarioCase) => {
    const rawExitCode = scenarioCase.input.error?.exitCode;
    const err = rawExitCode === undefined || isOmittedTag(rawExitCode) ? new CliExitError() : new CliExitError(rawExitCode);
    assert.strictEqual(err.exitCode, scenarioCase.expected.exitCode);
  },

  'instance-check': (_scenarioCase) => {
    const err = new CliExitError();
    assert.ok(err instanceof Error);
    assert.ok(err instanceof BaseError);
    assert.ok(err instanceof CliExitError);
  },

  'json-code': (scenarioCase) => {
    const exitCode = scenarioCase.input.error?.exitCode;
    const err = exitCode === undefined || isOmittedTag(exitCode) ? new CliExitError() : new CliExitError(exitCode);
    const json = err.toJSON();
    assert.strictEqual(json.code, scenarioCase.expected.code);
  },

  'name-value': (scenarioCase) => {
    const err = new CliExitError();
    assert.strictEqual(err.name, scenarioCase.expected.name);
  },

  'not-retryable': (scenarioCase) => {
    const err = new CliExitError();
    assert.strictEqual(err.retryable, scenarioCase.expected.retryable);
  }
} satisfies Record<ScenarioCase['shape'], ScenarioRunner>;

function runCase(scenarioCase: ScenarioCase): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('CliExitError', () => {
  const fileData = fileIntake(scenarioGroups);
  for (const scenario of fileData.cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
