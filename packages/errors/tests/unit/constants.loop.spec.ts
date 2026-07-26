import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ErrorCode,
  ErrorDefaults,
  HttpStatus
} from '../../src/constants/index.js';
import { ModuleError } from '../../src/errors/ModuleError.js';
import scenarioGroups from './constants.scenarios.json' with { type: 'json' };

type ModuleErrorScenarioShape = 'module-error-authentication' | 'retryable' | 'integration-context-override' | 'integration-cause-override' | 'integration-retryable-override' | 'integration-status-code-override';

type ModuleErrorScenarioCase<S extends ModuleErrorScenarioShape> = {
  description: string;
  expected: {
    code: keyof typeof ErrorCode;
    context?: Record<string, unknown>;
    causeMessage?: string;
    retryable?: boolean;
    statusCode?: number;
  };
  input: {
    error: {
      causeMessage?: string;
      message: string;
      options: {
        context?: Record<string, unknown>;
        retryable?: boolean;
        scenario: keyof typeof ErrorDefaults;
        statusCode?: number;
      };
    };
  };
  shape: S;
  name: string;
};

type ScenarioCase =
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'error-code-values'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'http-status-client'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'http-status-server'; name: string }
  | {
      description: string;
      expected: {
        code: keyof typeof ErrorCode;
        retryable: boolean;
        statusCode: number;
      };
      input: { scenario: keyof typeof ErrorDefaults };
      shape: 'defaults';
      name: string;
    }
  | ModuleErrorScenarioCase<'module-error-authentication'>
  | ModuleErrorScenarioCase<'retryable'>
  | ModuleErrorScenarioCase<'integration-context-override'>
  | ModuleErrorScenarioCase<'integration-cause-override'>
  | ModuleErrorScenarioCase<'integration-retryable-override'>
  | ModuleErrorScenarioCase<'integration-status-code-override'>;

type ScenarioRunner<K extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => void;

type RunnerMap = {
  [K in ScenarioCase['shape']]: ScenarioRunner<K>;
};

function createScenarioModuleError(scenarioCase: Extract<ScenarioCase, { shape: ModuleErrorScenarioShape }>): ModuleError {
  const { causeMessage, message, options } = scenarioCase.input.error;
  return ModuleError.create(message, {
    ...options,
    ...(causeMessage === undefined ? {} : { cause: new Error(causeMessage) })
  });
}

const runModuleErrorAuthentication: ScenarioRunner<'module-error-authentication'> = (scenarioCase) => {
  const error = createScenarioModuleError(scenarioCase);
  assert.strictEqual(error.code, scenarioCase.expected.code);
  assert.strictEqual(error.statusCode, scenarioCase.expected.statusCode);
  assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
  assert.deepStrictEqual(error.context, scenarioCase.expected.context);
};

const runRetryable: ScenarioRunner<'retryable'> = (scenarioCase) => {
  const error = createScenarioModuleError(scenarioCase);
  assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
  assert.strictEqual(error.code, scenarioCase.expected.code);
};

const runIntegrationContextOverride: ScenarioRunner<'integration-context-override'> = (scenarioCase) => {
  const error = createScenarioModuleError(scenarioCase);
  assert.strictEqual(error.code, scenarioCase.expected.code);
  assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
  assert.deepStrictEqual(error.context, scenarioCase.expected.context);
};

const runIntegrationCauseOverride: ScenarioRunner<'integration-cause-override'> = (scenarioCase) => {
  const error = createScenarioModuleError(scenarioCase);
  assert.strictEqual((error.cause as Error | undefined)?.message, scenarioCase.expected.causeMessage);
  assert.strictEqual(error.code, scenarioCase.expected.code);
};

const runIntegrationRetryableOverride: ScenarioRunner<'integration-retryable-override'> = (scenarioCase) => {
  const error = createScenarioModuleError(scenarioCase);
  assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
  assert.strictEqual(error.code, scenarioCase.expected.code);
};

const runIntegrationStatusCodeOverride: ScenarioRunner<'integration-status-code-override'> = (scenarioCase) => {
  const error = createScenarioModuleError(scenarioCase);
  assert.strictEqual(error.statusCode, scenarioCase.expected.statusCode);
  assert.strictEqual(error.code, scenarioCase.expected.code);
};

const runnerMap: RunnerMap = {
  'defaults': (scenarioCase) => {
    assert.deepStrictEqual(ErrorDefaults[scenarioCase.input.scenario], scenarioCase.expected);
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

function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Error constants', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
