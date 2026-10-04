import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import {
  ErrorCode,
  ErrorDefaults,
  HttpStatus
} from '../../src/constants/index.js';
import { ModuleError } from '../../src/errors/ModuleError.js';
import { RuntimeError } from '../../src/errors/RuntimeError.js';
import scenarioGroups from './constants.scenarios.json' with { 'type': 'json' };
import { ConstantsScenarioCaseEntity } from './entities/ConstantsScenarioCaseEntity.js';

class ConstantsRunners {
  static 'defaults'(scenarioCase: ScenarioCaseOfType<ConstantsScenarioCaseEntity.Type, 'defaults'>): void {
    assert.deepStrictEqual(ErrorDefaults[ConstantsRunners.requireDefaultsScenario(scenarioCase)], scenarioCase.expected);
  }

  static 'error-code-values'(scenarioCase: ScenarioCaseOfType<ConstantsScenarioCaseEntity.Type, 'error-code-values'>): void {
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
  }

  static 'http-status-client'(scenarioCase: ScenarioCaseOfType<ConstantsScenarioCaseEntity.Type, 'http-status-client'>): void {
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
  }

  static 'http-status-server'(scenarioCase: ScenarioCaseOfType<ConstantsScenarioCaseEntity.Type, 'http-status-server'>): void {
    assert.deepStrictEqual(scenarioCase.input, scenarioCase.expected);
    assert.deepStrictEqual(scenarioCase.expected, {
      'BAD_GATEWAY': HttpStatus.BAD_GATEWAY,
      'GATEWAY_TIMEOUT': HttpStatus.GATEWAY_TIMEOUT,
      'INTERNAL_SERVER_ERROR': HttpStatus.INTERNAL_SERVER_ERROR,
      'NOT_IMPLEMENTED': HttpStatus.NOT_IMPLEMENTED,
      'SERVICE_UNAVAILABLE': HttpStatus.SERVICE_UNAVAILABLE
    });
  }

  static 'integration-cause-override'(scenarioCase: ScenarioCaseOfType<ConstantsScenarioCaseEntity.Type, 'integration-cause-override'>): void {
    const error = ConstantsRunners.createScenarioModuleError(scenarioCase);
    const causeMessage = error.cause instanceof Error ? error.cause.message : undefined;
    assert.strictEqual(causeMessage, scenarioCase.expected.causeMessage);
    assert.strictEqual(error.code, scenarioCase.expected.code);
  }

  static 'integration-context-override'(scenarioCase: ScenarioCaseOfType<ConstantsScenarioCaseEntity.Type, 'integration-context-override'>): void {
    const error = ConstantsRunners.createScenarioModuleError(scenarioCase);
    assert.strictEqual(error.code, scenarioCase.expected.code);
    assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
    assert.deepStrictEqual(error.context, scenarioCase.expected.context);
  }

  static 'integration-retryable-override'(scenarioCase: ScenarioCaseOfType<ConstantsScenarioCaseEntity.Type, 'integration-retryable-override'>): void {
    const error = ConstantsRunners.createScenarioModuleError(scenarioCase);
    assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
    assert.strictEqual(error.code, scenarioCase.expected.code);
  }

  static 'integration-status-code-override'(scenarioCase: ScenarioCaseOfType<ConstantsScenarioCaseEntity.Type, 'integration-status-code-override'>): void {
    const error = ConstantsRunners.createScenarioModuleError(scenarioCase);
    assert.strictEqual(error.status, scenarioCase.expected.status);
    assert.strictEqual(error.code, scenarioCase.expected.code);
  }

  static 'module-error-authentication'(scenarioCase: ScenarioCaseOfType<ConstantsScenarioCaseEntity.Type, 'module-error-authentication'>): void {
    const error = ConstantsRunners.createScenarioModuleError(scenarioCase);
    assert.strictEqual(error.code, scenarioCase.expected.code);
    assert.strictEqual(error.status, scenarioCase.expected.status);
    assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
    assert.deepStrictEqual(error.context, scenarioCase.expected.context);
  }

  static 'retryable'(scenarioCase: ScenarioCaseOfType<ConstantsScenarioCaseEntity.Type, 'retryable'>): void {
    const error = ConstantsRunners.createScenarioModuleError(scenarioCase);
    assert.strictEqual(error.retryable, scenarioCase.expected.retryable);
    assert.strictEqual(error.code, scenarioCase.expected.code);
  }

  private static requireErrorInput(scenarioCase: ConstantsScenarioCaseEntity.Type): NonNullable<ConstantsScenarioCaseEntity.Type['input']['error']> {
    const { error } = scenarioCase.input;
    if (error === undefined) {
      throw RuntimeError.create('Scenario input.error is required');
    }
    return error;
  }

  private static requireDefaultsScenario(scenarioCase: ConstantsScenarioCaseEntity.Type): keyof typeof ErrorDefaults {
    const { scenario } = scenarioCase.input;
    if (scenario === undefined || !Object.hasOwn(ErrorDefaults, scenario)) {
      throw RuntimeError.create('Scenario input.scenario must name a known ErrorDefaults entry');
    }
    return scenario;
  }

  private static createScenarioModuleError(scenarioCase: ConstantsScenarioCaseEntity.Type): ModuleError {
    const { causeMessage, message, options } = ConstantsRunners.requireErrorInput(scenarioCase);
    const result = ModuleError.create(message, {
      ...options,
      ...(causeMessage === undefined ? {} : { 'cause': RuntimeError.create(causeMessage) })
    });
    return result;
  }
}

ScenarioSuite.register({
  'entity': ConstantsScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Error constants',
  'runners': ConstantsRunners
});
