import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import { BaseError, CAUSE_CHAIN_DEPTH_LIMIT, CAUSE_DEPTH_SENTINEL, PROBLEM_TYPE_BASE } from '@studnicky/types/browser';
import assert from 'node:assert/strict';

import type { ModuleErrorOptionsInterface } from '../../src/interfaces/index.js';

import { ErrorDefaults } from '../../src/constants/index.js';
import { ModuleError } from '../../src/errors/ModuleError.js';
import { RuntimeError } from '../../src/errors/RuntimeError.js';
import { ErrorScenarioGuard } from '../../src/validation/ErrorScenarioGuard.js';
import { VALIDATION_FAILED_CODE_PATTERN } from '../fixtures/VALIDATION_FAILED_CODE_PATTERN.js';
import { VALIDATION_FAILED_MESSAGE_PATTERN } from '../fixtures/VALIDATION_FAILED_MESSAGE_PATTERN.js';
import { ModuleErrorScenarioCaseEntity } from './entities/ModuleErrorScenarioCaseEntity.js';
import scenarioGroups from './module-error.scenarios.json' with { 'type': 'json' };

class TestError extends BaseError {
  public override readonly name: string = 'TestError';

  constructor(message: string) {
    super({
      'code': 'test.error',
      'message': message,
      'retryable': false
    });
  }
}

class NetworkError extends ModuleError {
  public override readonly name: string = 'NetworkError';

  static override create(
    message: string,
    options?: Omit<Parameters<typeof ModuleError.create>[1], 'scenario'>
  ): NetworkError {
    const defaults = ErrorDefaults.CONNECTION;
    const mergedOptions: ModuleErrorOptionsInterface = {
      'cause': options?.cause,
      'code': defaults.code,
      'context': options?.context,
      'retryable': options?.retryable ?? defaults.retryable,
      'status': options?.status ?? defaults.status
    };

    return new NetworkError(message, mergedOptions);
  }

  protected constructor(message: string, options: ModuleErrorOptionsInterface) {
    super(message, options);
  }
}

class ContextCollaborator {
  public constructor(public readonly label: string) {}
}

class MinimalOptionsError extends ModuleError {
  public override readonly name: string = 'MinimalOptionsError';

  static build(message: string, code: string): MinimalOptionsError {
    return new MinimalOptionsError(message, {
      'code': code,
      'context': undefined,
      'retryable': undefined,
      'status': undefined
    });
  }

  protected constructor(message: string, options: ModuleErrorOptionsInterface) {
    super(message, options);
  }
}

class ModuleErrorRunners {
  static 'cause-builds-chain'(): void {
    const root = RuntimeError.create('Root cause');
    const middle = ModuleError.create('Middle error', { 'cause': root, 'scenario': 'INTERNAL' });
    const top = ModuleError.create('Top error', { 'cause': middle, 'scenario': 'INTERNAL' });
    assert.strictEqual(top.cause, middle);
    assert.strictEqual(top.cause.cause, root);
  }

  static 'cause-handles-undefined'(): void {
    const error = ModuleError.create('Test', { 'scenario': 'INTERNAL' });
    assert.strictEqual(error.cause, undefined);
  }

  static 'cause-stores-single'(): void {
    const cause = RuntimeError.create('Root cause');
    const error = ModuleError.create('Wrapper', { 'cause': cause, 'scenario': 'INTERNAL' });
    assert.strictEqual(error.cause, cause);
  }

  static 'chain-circular'(): void {
    const a = ModuleError.create('a', { 'scenario': 'INTERNAL' });
    const b = ModuleError.create('b', { 'cause': a, 'scenario': 'INTERNAL' });
    Reflect.set(a, 'cause', b);
    const chain = BaseError.getCauseChain(b);
    assert.ok(chain.length <= CAUSE_CHAIN_DEPTH_LIMIT);
  }

  static 'chain-deep'(): void {
    let current: Error = RuntimeError.create('Root');
    for (let index = 0; index < 9; index += 1) {
      current = ModuleError.create(`Level ${index}`, { 'cause': current, 'scenario': 'INTERNAL' });
    }
    assert.ok(current instanceof BaseError);
    const chain = BaseError.getCauseChain(current);
    assert.strictEqual(chain.length, 10);
    const deepest = chain[9];
    assert.ok(deepest instanceof Error);
    assert.strictEqual(deepest.message, 'Root');
  }

  static 'chain-nested'(): void {
    const root = RuntimeError.create('Root');
    const middle = ModuleError.create('Middle', { 'cause': root, 'scenario': 'INTERNAL' });
    const top = ModuleError.create('Top', { 'cause': middle, 'scenario': 'INTERNAL' });
    const chain = BaseError.getCauseChain(top);
    assert.strictEqual(chain.length, 3);
    assert.strictEqual(chain[0], top);
    assert.strictEqual(chain[1], middle);
    assert.strictEqual(chain[2], root);
  }

  static 'chain-single'(): void {
    const error = ModuleError.create('Test', { 'scenario': 'INTERNAL' });
    const chain = BaseError.getCauseChain(error);
    assert.strictEqual(chain.length, 1);
    assert.strictEqual(chain[0], error);
  }

  static 'constructor-defaults-omitted-options'(scenarioCase: ScenarioCaseOfType<ModuleErrorScenarioCaseEntity.Type, 'constructor-defaults-omitted-options'>): void {
    const message = ScenarioValues.requireString(scenarioCase.input?.message, 'Scenario input.message');
    const code = ScenarioValues.requireString(scenarioCase.input?.code, 'Scenario input.code');
    const expectedResult = ScenarioValues.requireRecord(scenarioCase.expected?.result, 'Scenario expected.result');
    const error = MinimalOptionsError.build(message, code);
    assert.strictEqual(error.retryable, ScenarioValues.requireBoolean(expectedResult.retryable, 'Scenario expected.result.retryable'));
    assert.strictEqual(error.context, undefined);
    assert.strictEqual(error.status, undefined);
  }

  static 'context-detaches-projections'(): void {
    const context = { 'request': { 'attempt': 1 } };
    const error = ModuleError.create('Test', { 'context': context, 'scenario': 'INTERNAL' });
    context.request.attempt = 2;
    assert.deepStrictEqual(error.context, { 'request': { 'attempt': 1 } });
    const projection = error.context;
    if (projection !== undefined && projection.request !== null && typeof projection.request === 'object') {
      Reflect.set(projection.request, 'attempt', 3);
    }
    assert.deepStrictEqual(error.context, { 'request': { 'attempt': 1 } });
    assert.deepStrictEqual(error.toJSON().context, { 'request': { 'attempt': 1 } });
  }

  static 'context-empty-object'(): void {
    const error = ModuleError.create('Test', { 'context': {}, 'scenario': 'INTERNAL' });
    assert.deepStrictEqual(error.context, {});
  }

  static 'context-handles-undefined'(): void {
    const error = ModuleError.create('Test', { 'scenario': 'INTERNAL' });
    assert.strictEqual(error.context, undefined);
  }

  static 'context-null-prototype'(): void {
    const context = ScenarioValues.requireRecord(Object.create(null), 'Null-prototype context');
    context.items = [{ 'nested': { 'count': 1 } }, ['a', 'b']];
    const flags = ScenarioValues.requireRecord(Object.create(null), 'Null-prototype flags');
    context.meta = { 'flags': flags };
    const error = ModuleError.create('Test', { 'context': context, 'scenario': 'INTERNAL' });
    const projection = error.context;
    assert.ok(projection !== undefined);
    assert.deepStrictEqual(projection.items, [{ 'nested': { 'count': 1 } }, ['a', 'b']]);
    assert.deepStrictEqual(projection.meta, { 'flags': {} });
    assert.ok(Object.getPrototypeOf(projection) === Object.prototype);
  }

  static 'context-preserves-collaborator-instance'(scenarioCase: ScenarioCaseOfType<ModuleErrorScenarioCaseEntity.Type, 'context-preserves-collaborator-instance'>): void {
    const inputContext = ScenarioValues.requireRecord(scenarioCase.input?.context, 'Scenario input.context');
    const inputCollaborator = ScenarioValues.requireRecord(inputContext.collaborator, 'Scenario input.context.collaborator');
    const label = ScenarioValues.requireString(inputCollaborator.label, 'Scenario input.context.collaborator.label');
    const expectedResult = ScenarioValues.requireRecord(scenarioCase.expected?.result, 'Scenario expected.result');
    const collaborator = new ContextCollaborator(label);
    const error = ModuleError.create('Test', {
      'context': { 'collaborator': collaborator },
      'scenario': 'INTERNAL'
    });
    const projection = error.context;
    assert.ok(projection !== undefined);
    const projectedCollaborator = projection.collaborator;
    assert.ok(projectedCollaborator instanceof ContextCollaborator);
    assert.strictEqual(projectedCollaborator.label, expectedResult.label);
    assert.strictEqual(projectedCollaborator === collaborator, expectedResult.sameInstance);
  }

  static 'context-stores-arbitrary-data'(scenarioCase: ScenarioCaseOfType<ModuleErrorScenarioCaseEntity.Type, 'context-stores-arbitrary-data'>): void {
    const context = ScenarioValues.requireRecord(scenarioCase.input?.context, 'Scenario input.context');
    const expectedResult = ScenarioValues.requireRecord(scenarioCase.expected?.result, 'Scenario expected.result');
    const error = ModuleError.create('Operation failed', {
      'context': context,
      'scenario': 'INTERNAL'
    });
    assert.deepStrictEqual(error.context, expectedResult.context);
  }

  static 'factory-merge-user-options'(): void {
    const cause = RuntimeError.create('Root cause');
    const context = { 'operation': 'fetch', 'userId': '123' };
    const error = ModuleError.create('Test error', {
      'cause': cause,
      'context': context,
      'retryable': true,
      'scenario': 'DATABASE',
      'status': 503
    });
    assert.strictEqual(error.code, 'DATABASE_ERROR');
    assert.strictEqual(error.cause, cause);
    assert.deepStrictEqual(error.context, context);
    assert.strictEqual(error.status, 503);
    assert.strictEqual(error.retryable, true);
  }

  static 'factory-reject-empty-code'(scenarioCase: ScenarioCaseOfType<ModuleErrorScenarioCaseEntity.Type, 'factory-reject-empty-code'>): void {
    class EmptyCodeError extends ModuleError {
      public override readonly name: string = 'EmptyCodeError';

      static override create(message: string): EmptyCodeError {
        return new EmptyCodeError(message, {
          'code': '',
          'context': undefined,
          'retryable': false,
          'status': undefined
        });
      }
    }
    assert.throws(() => {
      EmptyCodeError.create('Test');
    }, {
      'message': VALIDATION_FAILED_CODE_PATTERN,
      'name': ScenarioValues.requireString(scenarioCase.expected?.errorName, 'Scenario expected.errorName')
    });
  }

  static 'factory-reject-empty-message'(scenarioCase: ScenarioCaseOfType<ModuleErrorScenarioCaseEntity.Type, 'factory-reject-empty-message'>): void {
    assert.throws(() => {
      ModuleError.create('', { 'scenario': 'INTERNAL' });
    }, {
      'message': VALIDATION_FAILED_MESSAGE_PATTERN,
      'name': ScenarioValues.requireString(scenarioCase.expected?.errorName, 'Scenario expected.errorName')
    });
  }

  static 'factory-reject-invalid-scenario'(): void {
    assert.strictEqual(ErrorScenarioGuard.isKnownScenario('INVALID'), false);
  }

  static 'factory-scenario-defaults'(): void {
    const error = ModuleError.create('Test error', { 'scenario': 'INTERNAL' });
    assert.ok(error instanceof Error);
    assert.ok(error instanceof ModuleError);
    assert.strictEqual(error.name, 'ModuleError');
    assert.strictEqual(error.message, 'Test error');
    assert.strictEqual(error.code, 'INTERNAL_ERROR');
    assert.strictEqual(error.retryable, false);
    assert.strictEqual(error.status, 500);
    assert.strictEqual(error.context, undefined);
  }

  static 'find-cause-circular'(): void {
    const a = ModuleError.create('a', { 'scenario': 'INTERNAL' });
    const b = ModuleError.create('b', { 'cause': a, 'scenario': 'INTERNAL' });
    Reflect.set(a, 'cause', b);
    const found = BaseError.findCauseOfType(b, TestError);
    assert.strictEqual(found, undefined);
  }

  static 'find-cause-first-match'(): void {
    const root = new TestError('First');
    const middle = new TestError('Second');
    ModuleError.create('Wrapper1', { 'cause': root, 'scenario': 'INTERNAL' });
    const wrapper2 = ModuleError.create('Wrapper2', { 'cause': middle, 'scenario': 'INTERNAL' });
    const top = ModuleError.create('Top', { 'cause': wrapper2, 'scenario': 'INTERNAL' });
    const found = BaseError.findCauseOfType(top, TestError);
    assert.strictEqual(found, middle);
  }

  static 'find-cause-match'(): void {
    const root = new TestError('Test error');
    const middle = ModuleError.create('Middle', { 'cause': root, 'scenario': 'INTERNAL' });
    const top = ModuleError.create('Top', { 'cause': middle, 'scenario': 'INTERNAL' });
    const found = BaseError.findCauseOfType(top, TestError);
    assert.ok(found instanceof TestError);
    assert.strictEqual(found, root);
  }

  static 'find-cause-missing'(): void {
    const root = RuntimeError.create('Root');
    const top = ModuleError.create('Top', { 'cause': root, 'scenario': 'INTERNAL' });
    const found = BaseError.findCauseOfType(top, TestError);
    assert.strictEqual(found, undefined);
  }

  static 'find-cause-subclass'(): void {
    const root = RuntimeError.create('Root');
    const network = NetworkError.create('Network failed', { 'cause': root });
    const top = ModuleError.create('Top', { 'cause': network, 'scenario': 'INTERNAL' });
    const found = BaseError.getCauseChain(top).find((error) => {
      const result = error instanceof NetworkError;
      return result;
    });
    assert.ok(found instanceof NetworkError);
    assert.strictEqual(found, network);
  }

  static 'has-cause-circular'(): void {
    const a = ModuleError.create('a', { 'scenario': 'INTERNAL' });
    const b = ModuleError.create('b', { 'cause': a, 'scenario': 'INTERNAL' });
    Reflect.set(a, 'cause', b);
    assert.strictEqual(BaseError.hasCauseOfType(b, TestError), false);
  }

  static 'has-cause-deep'(): void {
    const root = new TestError('Root');
    const middle1 = ModuleError.create('Middle1', { 'cause': root, 'scenario': 'INTERNAL' });
    const middle2 = ModuleError.create('Middle2', { 'cause': middle1, 'scenario': 'INTERNAL' });
    const top = ModuleError.create('Top', { 'cause': middle2, 'scenario': 'INTERNAL' });
    assert.ok(BaseError.hasCauseOfType(top, TestError));
  }

  static 'has-cause-empty'(): void {
    const error = ModuleError.create('Test', { 'scenario': 'INTERNAL' });
    assert.strictEqual(BaseError.hasCauseOfType(error, TestError), false);
  }

  static 'has-cause-false'(): void {
    const root = RuntimeError.create('Root');
    const top = ModuleError.create('Top', { 'cause': root, 'scenario': 'INTERNAL' });
    assert.strictEqual(BaseError.hasCauseOfType(top, TestError), false);
  }

  static 'has-cause-true'(): void {
    const root = new TestError('Test');
    const top = ModuleError.create('Top', { 'cause': root, 'scenario': 'INTERNAL' });
    assert.strictEqual(BaseError.hasCauseOfType(top, TestError), true);
  }

  static 'http-allows-status-override'(): void {
    const error = ModuleError.create('Test', { 'scenario': 'INTERNAL', 'status': 503 });
    assert.strictEqual(error.status, 503);
  }

  static 'http-uses-scenario-code'(): void {
    const error = ModuleError.create('Not found', { 'scenario': 'NOT_FOUND' });
    assert.strictEqual(error.status, 404);
  }

  static 'instanceof-error'(): void {
    const error = ModuleError.create('Test', { 'scenario': 'INTERNAL' });
    assert.ok(error instanceof Error);
  }

  static 'instanceof-module-error'(): void {
    const error = ModuleError.create('Test', { 'scenario': 'INTERNAL' });
    assert.ok(error instanceof ModuleError);
  }

  static 'instanceof-subclass'(): void {
    const error = NetworkError.create('Test');
    assert.ok(error instanceof Error);
    assert.ok(error instanceof ModuleError);
    assert.ok(error instanceof NetworkError);
  }

  static 'json-basic'(): void {
    const error = ModuleError.create('Test error', { 'scenario': 'INTERNAL' });
    const json = error.toJSON();
    assert.strictEqual(json.title, 'ModuleError');
    assert.strictEqual(json.detail, 'Test error');
    assert.strictEqual(json.code, 'INTERNAL_ERROR');
    assert.strictEqual(json.type, `${PROBLEM_TYPE_BASE}INTERNAL_ERROR`);
    assert.strictEqual(json.retryable, false);
    assert.strictEqual(json.status, 500);
    assert.ok(typeof json.stack === 'string');
  }

  static 'json-deep-chain'(): void {
    const root = RuntimeError.create('Root');
    const middle = ModuleError.create('Middle', { 'cause': root, 'scenario': 'INTERNAL' });
    const top = ModuleError.create('Top', { 'cause': middle, 'scenario': 'INTERNAL' });
    // The chain is flattened, nearest first, rather than nested.
    const causes = top.toJSON().causes ?? [];
    assert.strictEqual(causes[0]?.code, 'INTERNAL_ERROR');
    assert.strictEqual(causes[1]?.detail, 'Root');
  }

  static 'json-depth-sentinel'(): void {
    let current = ModuleError.create('depth-0', { 'scenario': 'INTERNAL' });
    for (let index = 1; index <= CAUSE_CHAIN_DEPTH_LIMIT + 1; index += 1) {
      current = ModuleError.create(`depth-${index}`, { 'cause': current, 'scenario': 'INTERNAL' });
    }
    const causes = current.toJSON().causes ?? [];
    const found = causes.some((node) => {
      const result = node.detail === CAUSE_DEPTH_SENTINEL;

      return result;
    });
    assert.ok(found);
  }

  static 'json-excludes-undefined'(): void {
    const error = ModuleError.create('Test', { 'scenario': 'VALIDATION' });
    const json = error.toJSON();
    assert.strictEqual('context' in json, false);
  }

  static 'json-module-cause'(): void {
    const root = ModuleError.create('Root', { 'scenario': 'DATABASE' });
    const top = ModuleError.create('Top', { 'cause': root, 'scenario': 'INTERNAL' });
    const causes = top.toJSON().causes ?? [];
    assert.strictEqual(causes[0]?.detail, 'Root');
    assert.strictEqual(causes[0]?.code, 'DATABASE_ERROR');
    assert.strictEqual(causes[0]?.type, `${PROBLEM_TYPE_BASE}DATABASE_ERROR`);
  }

  static 'json-native-cause'(): void {
    const cause = RuntimeError.create('Root cause');
    const error = ModuleError.create('Test', { 'cause': cause, 'scenario': 'INTERNAL' });
    const causes = error.toJSON().causes ?? [];
    assert.strictEqual(causes[0]?.detail, 'Root cause');
    assert.strictEqual(causes[0]?.name, 'RuntimeError');
    // A cause node is a summary: only the head carries a stack.
    assert.strictEqual('stack' in (causes[0] ?? {}), false);
  }

  static 'json-optional-context'(): void {
    const context = { 'userId': '123' };
    const error = ModuleError.create('Test', { 'context': context, 'scenario': 'INTERNAL' });
    const json = error.toJSON();
    assert.deepStrictEqual(json.context, context);
    assert.strictEqual(json.status, 500);
    assert.strictEqual(json.retryable, false);
  }

  static 'json-safe'(): void {
    const error = ModuleError.create('Test', {
      'context': { 'count': 42, 'date': new Date().toISOString() },
      'scenario': 'INTERNAL'
    });
    let parsed: unknown;
    try {
      const jsonString = JSON.stringify(error.toJSON());
      assert.ok(jsonString.length > 0);
      parsed = JSON.parse(jsonString);
    } catch (cause) {
      throw RuntimeError.create('ModuleError JSON round trip failed', { 'cause': cause });
    }
    const parsedRecord = ScenarioValues.requireRecord(parsed, 'Parsed JSON');
    assert.strictEqual(parsedRecord.code, 'INTERNAL_ERROR');
    assert.strictEqual(parsedRecord.status, 500);
  }

  static 'retryable-permanent'(): void {
    const error = ModuleError.create('Invalid input', { 'scenario': 'VALIDATION' });
    assert.strictEqual(error.retryable, false);
  }

  static 'retryable-transient'(): void {
    const error = ModuleError.create('Timeout', { 'scenario': 'TIMEOUT' });
    assert.strictEqual(error.retryable, true);
  }

  static 'scenario-defaults'(scenarioCase: ScenarioCaseOfType<ModuleErrorScenarioCaseEntity.Type, 'scenario-defaults'>): void {
    const scenario = ModuleErrorRunners.requireScenarioName(scenarioCase.scenario);
    let message = 'Not found';
    if (scenario === 'CONNECTION') {
      message = 'Connection failed';
    }
    if (scenario === 'AUTHENTICATION') {
      message = 'Auth failed';
    }
    const expectedResult = ScenarioValues.requireRecord(scenarioCase.expected?.result, 'Scenario expected.result');
    const error = ModuleError.create(message, { 'scenario': scenario });
    assert.strictEqual(error.code, expectedResult.code);
    assert.strictEqual(error.status, expectedResult.status);
    assert.strictEqual(error.retryable, expectedResult.retryable);
  }

  static 'scenario-retryable-overrides'(): void {
    const error = ModuleError.create('Connection failed', { 'retryable': false, 'scenario': 'CONNECTION' });
    assert.strictEqual(error.retryable, false);
  }

  static 'stack-trace'(): void {
    const error = ModuleError.create('Test error', { 'scenario': 'INTERNAL' });
    assert.ok(error.stack !== undefined);
    assert.ok(error.stack.includes('ModuleError'));
  }

  static 'stack-trace-disabled'(): void {
    const descriptor = Object.getOwnPropertyDescriptor(Error, 'captureStackTrace');
    assert.ok(descriptor !== undefined);
    const original = Error.captureStackTrace;

    try {
      Reflect.set(Error, 'captureStackTrace', undefined);
      const error = ModuleError.create('Test error', { 'scenario': 'INTERNAL' });
      assert.ok(error.stack !== undefined);
    } finally {
      Reflect.set(Error, 'captureStackTrace', original);
    }
  }

  static 'subclass-custom'(): void {
    const error = NetworkError.create('Connection failed');
    assert.ok(error instanceof Error);
    assert.ok(error instanceof ModuleError);
    assert.ok(error instanceof NetworkError);
    assert.strictEqual(error.name, 'NetworkError');
    assert.strictEqual(error.code, 'CONNECTION_ERROR');
    assert.strictEqual(error.status, 503);
    assert.strictEqual(error.retryable, true);
  }

  static 'subclass-overrides-defaults'(): void {
    const error = NetworkError.create('Connection failed', { 'retryable': false });
    assert.strictEqual(error.retryable, false);
    assert.strictEqual(error.code, 'CONNECTION_ERROR');
  }

  static 'subclass-serialization-name'(): void {
    const error = NetworkError.create('Test');
    const json = error.toJSON();
    // RFC 9457 3.1.2: title names the problem TYPE, so a subclass names itself.
    assert.strictEqual(json.title, 'NetworkError');
    assert.strictEqual(json.code, 'CONNECTION_ERROR');
  }

  private static requireScenarioName(value: unknown): keyof typeof ErrorDefaults {
    if (ErrorScenarioGuard.isKnownScenario(value)) {
      return value;
    }
    throw RuntimeError.create('Scenario input.scenario must name a known ErrorDefaults entry');
  }
}

ScenarioSuite.register({
  'entity': ModuleErrorScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'ModuleError',
  'runners': ModuleErrorRunners
});
