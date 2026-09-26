import { RuntimeError } from '../../src/errors/RuntimeError.js';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ErrorCode,
  ErrorDefaults,
  HttpStatus
} from '../../src/constants/index.js';
import { ModuleError } from '../../src/errors/ModuleError.js';
import { ConstantsScenarioCaseEntity } from './entities/ConstantsScenarioCaseEntity.js';
import scenarioGroups from './constants.scenarios.json' with { type: 'json' };

type ScenarioCase = ConstantsScenarioCaseEntity.Type;
type ScenarioRunner = (scenarioCase: ScenarioCase) => void;
type RunnerMap = Record<ScenarioCase['shape'], ScenarioRunner>;

const fileIntake = ScenarioFileCompiler.compileIntake(ConstantsScenarioCaseEntity.Schema, ConstantsScenarioCaseEntity.Node);

function requireErrorInput(scenarioCase: ScenarioCase): NonNullable<ScenarioCase['input']['error']> {
  const { error } = scenarioCase.input;
  if (error === undefined) {
    throw RuntimeError.create('Scenario input.error is required');
  }
  return error;
}

function requireDefaultsScenario(scenarioCase: ScenarioCase): keyof typeof ErrorDefaults {
  const { scenario } = scenarioCase.input;
  if (scenario === undefined || !Object.hasOwn(ErrorDefaults, scenario)) {
    throw RuntimeError.create('Scenario input.scenario must name a known ErrorDefaults entry');
  }
  return scenario;
}

function createScenarioModuleError(scenarioCase: ScenarioCase): ModuleError {
  const { causeMessage, message, options } = requireErrorInput(scenarioCase);
  return ModuleError.create(message, {
    ...options,
    ...(causeMessage === undefined ? {} : { cause: RuntimeError.create(causeMessage) })
  });
}

const runModuleErrorAuthentication: ScenarioRunner = (scenarioCase) => {
  const error = createScenarioModuleError(scenarioCase);
  assert.strictEqual(error.code, scenarioCase.expected.code);
  assert.strictEqual(error.status, scenarioCase.expected.status);
  assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
  assert.deepStrictEqual(error.context, scenarioCase.expected.context);
};

const runRetryable: ScenarioRunner = (scenarioCase) => {
  const error = createScenarioModuleError(scenarioCase);
  assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
  assert.strictEqual(error.code, scenarioCase.expected.code);
};

const runIntegrationContextOverride: ScenarioRunner = (scenarioCase) => {
  const error = createScenarioModuleError(scenarioCase);
  assert.strictEqual(error.code, scenarioCase.expected.code);
  assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
  assert.deepStrictEqual(error.context, scenarioCase.expected.context);
};

const runIntegrationCauseOverride: ScenarioRunner = (scenarioCase) => {
  const error = createScenarioModuleError(scenarioCase);
  const causeMessage = error.cause instanceof Error ? error.cause.message : undefined;
  assert.strictEqual(causeMessage, scenarioCase.expected.causeMessage);
  assert.strictEqual(error.code, scenarioCase.expected.code);
};

const runIntegrationRetryableOverride: ScenarioRunner = (scenarioCase) => {
  const error = createScenarioModuleError(scenarioCase);
  assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
  assert.strictEqual(error.code, scenarioCase.expected.code);
};

const runIntegrationStatusCodeOverride: ScenarioRunner = (scenarioCase) => {
  const error = createScenarioModuleError(scenarioCase);
  assert.strictEqual(error.status, scenarioCase.expected.status);
  assert.strictEqual(error.code, scenarioCase.expected.code);
};

const runnerMap: RunnerMap = {
  'defaults': (scenarioCase) => {
    assert.deepStrictEqual(ErrorDefaults[requireDefaultsScenario(scenarioCase)], scenarioCase.expected);
  },
  'error-code-values': (scenarioCase) => {
    assert.deepStrictEqual(scenarioCase.input, scenarioCase.expected);
    assert.deepStrictEqual(scenarioCase.expected, {
      'AUTHENTICATION_ERROR': ErrorCode.AUTHENTICATION_ERROR,
      'AUTHORIZATION_ERROR': ErrorCode.AUTHORIZATION_ERROR,
      'CONFIGURATION_ERROR': ErrorCode.CONFIGURATION_ERROR,
      'CONNECTION_ERROR': ErrorCode.CONNECTION_ERROR,
      'DATABASE_ERROR': ErrorCode.DATABASE_ERROR,
      'EXTERNAL_SERVICE_ERROR': ErrorCode.EXTERNAL_SERVICE_ERROR,
      'INTERNAL_ERROR': ErrorCode.INTERNAL_ERROR,
      'NOT_FOUND': ErrorCode.NOT_FOUND,
      'RATE_LIMIT_ERROR': ErrorCode.RATE_LIMIT_ERROR,
      'TIMEOUT_ERROR': ErrorCode.TIMEOUT_ERROR,
      'VALIDATION_ERROR': ErrorCode.VALIDATION_ERROR
    });
  },
  'http-status-client': (scenarioCase) => {
    assert.deepStrictEqual(scenarioCase.input, scenarioCase.expected);
    assert.deepStrictEqual(scenarioCase.expected, {
      'BAD_REQUEST': HttpStatus.BAD_REQUEST,
      'CONFLICT': HttpStatus.CONFLICT,
      'FORBIDDEN': HttpStatus.FORBIDDEN,
      'METHOD_NOT_ALLOWED': HttpStatus.METHOD_NOT_ALLOWED,
      'NOT_FOUND': HttpStatus.NOT_FOUND,
      'TOO_MANY_REQUESTS': HttpStatus.TOO_MANY_REQUESTS,
      'UNAUTHORIZED': HttpStatus.UNAUTHORIZED,
      'UNPROCESSABLE_ENTITY': HttpStatus.UNPROCESSABLE_ENTITY
    });
  },
  'http-status-server': (scenarioCase) => {
    assert.deepStrictEqual(scenarioCase.input, scenarioCase.expected);
    assert.deepStrictEqual(scenarioCase.expected, {
      'BAD_GATEWAY': HttpStatus.BAD_GATEWAY,
      'GATEWAY_TIMEOUT': HttpStatus.GATEWAY_TIMEOUT,
      'INTERNAL_SERVER_ERROR': HttpStatus.INTERNAL_SERVER_ERROR,
      'NOT_IMPLEMENTED': HttpStatus.NOT_IMPLEMENTED,
      'SERVICE_UNAVAILABLE': HttpStatus.SERVICE_UNAVAILABLE
    });
  },
  'integration-cause-override': runIntegrationCauseOverride,
  'integration-context-override': runIntegrationContextOverride,
  'integration-retryable-override': runIntegrationRetryableOverride,
  'integration-status-code-override': runIntegrationStatusCodeOverride,
  'module-error-authentication': runModuleErrorAuthentication,
  'retryable': runRetryable
};

function runCase(scenarioCase: ScenarioCase): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Error constants', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
