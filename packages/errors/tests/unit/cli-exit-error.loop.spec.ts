import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import { BaseError } from '@studnicky/types/browser';
import assert from 'node:assert/strict';

import { CliExitError } from '../../src/errors/CliExitError.js';
import scenarioGroups from './cli-exit-error.scenarios.json' with { 'type': 'json' };
import { CliExitErrorScenarioCaseEntity } from './entities/CliExitErrorScenarioCaseEntity.js';

class CliExitErrorRunners {
  static 'code-value'(scenarioCase: ScenarioCaseOfType<CliExitErrorScenarioCaseEntity.Type, 'code-value'>): void {
    const error = new CliExitError();
    assert.strictEqual(error.code, scenarioCase.expected.code);
  }

  static 'empty-message'(scenarioCase: ScenarioCaseOfType<CliExitErrorScenarioCaseEntity.Type, 'empty-message'>): void {
    const error = new CliExitError();
    assert.strictEqual(error.message, scenarioCase.expected.message);
  }

  static 'exit-code'(scenarioCase: ScenarioCaseOfType<CliExitErrorScenarioCaseEntity.Type, 'exit-code'>): void {
    const rawExitCode = scenarioCase.input.error?.exitCode;
    const error = typeof rawExitCode === 'number' ? new CliExitError(rawExitCode) : new CliExitError();
    assert.strictEqual(error.exitCode, scenarioCase.expected.exitCode);
  }

  static 'instance-check'(): void {
    const error = new CliExitError();
    assert.ok(error instanceof Error);
    assert.ok(error instanceof BaseError);
    assert.ok(error instanceof CliExitError);
  }

  static 'json-code'(scenarioCase: ScenarioCaseOfType<CliExitErrorScenarioCaseEntity.Type, 'json-code'>): void {
    const exitCode = scenarioCase.input.error?.exitCode;
    const error = typeof exitCode === 'number' ? new CliExitError(exitCode) : new CliExitError();
    const json = error.toJSON();
    assert.strictEqual(json.code, scenarioCase.expected.code);
  }

  static 'name-value'(scenarioCase: ScenarioCaseOfType<CliExitErrorScenarioCaseEntity.Type, 'name-value'>): void {
    const error = new CliExitError();
    assert.strictEqual(error.name, scenarioCase.expected.name);
  }

  static 'not-retryable'(scenarioCase: ScenarioCaseOfType<CliExitErrorScenarioCaseEntity.Type, 'not-retryable'>): void {
    const error = new CliExitError();
    assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
  }
}

ScenarioSuite.register({
  'entity': CliExitErrorScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'CliExitError',
  'runners': CliExitErrorRunners
});
