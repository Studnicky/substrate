import {
  PROBLEM_TYPE_BASE,
  PROBLEM_TYPE_THROWN_PRIMITIVE,
  PROBLEM_TYPE_THROWN_STRING
} from '../../src/constants/ProblemConstants.js';
import { RuntimeError } from '../../src/errors/RuntimeError.js';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import type { ModuleErrorOptionsInterface } from '../../src/interfaces/index.js';

import { CAUSE_CHAIN_DEPTH_LIMIT, CAUSE_DEPTH_SENTINEL } from '../../src/constants/CauseChainConstants.js';
import { ErrorDefaults } from '../../src/constants/index.js';
import { BaseError } from '../../src/errors/BaseError.js';
import { ModuleError } from '../../src/errors/ModuleError.js';
import { ModuleErrorScenarioCaseEntity } from './entities/ModuleErrorScenarioCaseEntity.js';
import scenarioGroups from './module-error.scenarios.json' with { type: 'json' };

type ScenarioCase = ModuleErrorScenarioCaseEntity.Type;
type ScenarioRunner = (scenarioCase: ScenarioCase) => void;
type RunnerMap = Record<string, ScenarioRunner>;

const fileIntake = ScenarioFileCompiler.compileIntake(ModuleErrorScenarioCaseEntity.Schema, ModuleErrorScenarioCaseEntity.Node);

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!Predicates.isRecord(value)) {
    throw RuntimeError.create(`${label} must be an object`);
  }
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw RuntimeError.create(`${label} must be a string`);
  }
  return value;
}

function requireBoolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw RuntimeError.create(`${label} must be a boolean`);
  }
  return value;
}

function assertScenarioName(value: unknown): asserts value is keyof typeof ErrorDefaults {
  if (typeof value !== 'string' || !Object.hasOwn(ErrorDefaults, value)) {
    throw RuntimeError.create('Scenario input.scenario must name a known ErrorDefaults entry');
  }
}

class TestError extends BaseError {
  constructor(message: string) {
    super({
      'code': 'test.error',
      'message': message,
      'retryable': false
    });
  }
}

class NetworkError extends ModuleError {
  static override create(
    message: string,
    options?: Omit<Parameters<typeof ModuleError.create>[1], 'scenario'>
  ): NetworkError {
    const defaults = ErrorDefaults.CONNECTION;
    const mergedOptions: ModuleErrorOptionsInterface = {
      cause: options?.cause,
      code: defaults.code,
      context: options?.context,
      retryable: options?.retryable ?? defaults.retryable,
      status: options?.status ?? defaults.status
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
  static build(message: string, code: string): MinimalOptionsError {
    return new MinimalOptionsError(message, {
      code,
      context: undefined,
      retryable: undefined,
      status: undefined
    });
  }

  protected constructor(message: string, options: ModuleErrorOptionsInterface) {
    super(message, options);
  }
}

const runnerMap: RunnerMap = {
  'factory-scenario-defaults': () => {
    const error = ModuleError.create('Test error', { scenario: 'INTERNAL' });
    assert.ok(error instanceof Error);
    assert.ok(error instanceof ModuleError);
    assert.strictEqual(error.name, 'ModuleError');
    assert.strictEqual(error.message, 'Test error');
    assert.strictEqual(error.code, 'INTERNAL_ERROR');
    assert.strictEqual(error.retryable, false);
    assert.strictEqual(error.status, 500);
    assert.strictEqual(error.context, undefined);
  },

  'factory-merge-user-options': () => {
    const cause = RuntimeError.create('Root cause');
    const context = { operation: 'fetch', userId: '123' };
    const error = ModuleError.create('Test error', {
      cause,
      context,
      retryable: true,
      scenario: 'DATABASE',
      status: 503
    });
    assert.strictEqual(error.code, 'DATABASE_ERROR');
    assert.strictEqual(error.cause, cause);
    assert.deepStrictEqual(error.context, context);
    assert.strictEqual(error.status, 503);
    assert.strictEqual(error.retryable, true);
  },

  'factory-reject-empty-message': (scenarioCase) => {
    assert.throws(() => {
      ModuleError.create('', { scenario: 'INTERNAL' });
    }, {
      message: /Validation failed at "message"/u,
      name: requireString(scenarioCase.expected?.errorName, 'Scenario expected.errorName')
    });
  },

  'factory-reject-empty-code': (scenarioCase) => {
    class EmptyCodeError extends ModuleError {
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
      message: /Validation failed at "code"/u,
      name: requireString(scenarioCase.expected?.errorName, 'Scenario expected.errorName')
    });
  },

  'factory-reject-invalid-scenario': (scenarioCase) => {
    assert.throws(() => {
      Reflect.apply(ModuleError.create, ModuleError, ['Test', { scenario: 'INVALID' }]);
    }, {
      message: /Validation failed at "scenario"/u,
      name: requireString(scenarioCase.expected?.errorName, 'Scenario expected.errorName')
    });
  },

  'constructor-defaults-omitted-options': (scenarioCase) => {
    const message = requireString(scenarioCase.input?.message, 'Scenario input.message');
    const code = requireString(scenarioCase.input?.code, 'Scenario input.code');
    const expectedResult = requireRecord(scenarioCase.expected?.result, 'Scenario expected.result');
    const error = MinimalOptionsError.build(message, code);
    assert.strictEqual(error.retryable, requireBoolean(expectedResult.retryable, 'Scenario expected.result.retryable'));
    assert.strictEqual(error.context, undefined);
    assert.strictEqual(error.status, undefined);
  },

  'scenario-defaults': (scenarioCase) => {
    const { scenario } = scenarioCase;
    assertScenarioName(scenario);
    const message = scenario === 'CONNECTION'
      ? 'Connection failed'
      : scenario === 'AUTHENTICATION'
        ? 'Auth failed'
        : 'Not found';
    const expectedResult = requireRecord(scenarioCase.expected?.result, 'Scenario expected.result');
    const error = ModuleError.create(message, { scenario });
    assert.strictEqual(error.code, expectedResult.code);
    assert.strictEqual(error.status, expectedResult.status);
    assert.strictEqual(error.retryable, expectedResult.retryable);
  },

  'scenario-retryable-overrides': () => {
    const error = ModuleError.create('Connection failed', { retryable: false, scenario: 'CONNECTION' });
    assert.strictEqual(error.retryable, false);
  },

  'context-stores-arbitrary-data': (scenarioCase) => {
    const context = requireRecord(scenarioCase.input?.context, 'Scenario input.context');
    const expectedResult = requireRecord(scenarioCase.expected?.result, 'Scenario expected.result');
    const error = ModuleError.create('Operation failed', {
      context,
      scenario: 'INTERNAL'
    });
    assert.deepStrictEqual(error.context, expectedResult.context);
  },

  'context-handles-undefined': () => {
    const error = ModuleError.create('Test', { scenario: 'INTERNAL' });
    assert.strictEqual(error.context, undefined);
  },

  'context-empty-object': () => {
    const error = ModuleError.create('Test', { context: {}, scenario: 'INTERNAL' });
    assert.deepStrictEqual(error.context, {});
  },

  'context-null-prototype': () => {
    const context: Record<string, unknown> = Object.create(null);
    context.items = [{ nested: { count: 1 } }, ['a', 'b']];
    const flags: Record<string, unknown> = Object.create(null);
    context.meta = { flags };
    const error = ModuleError.create('Test', { context, scenario: 'INTERNAL' });
    const projection = error.context;
    assert.ok(projection !== undefined);
    assert.deepStrictEqual(projection.items, [{ nested: { count: 1 } }, ['a', 'b']]);
    assert.deepStrictEqual(projection.meta, { flags: {} });
    assert.ok(Object.getPrototypeOf(projection) === Object.prototype);
  },

  'context-preserves-collaborator-instance': (scenarioCase) => {
    const inputContext = requireRecord(scenarioCase.input?.context, 'Scenario input.context');
    const inputCollaborator = requireRecord(inputContext.collaborator, 'Scenario input.context.collaborator');
    const label = requireString(inputCollaborator.label, 'Scenario input.context.collaborator.label');
    const expectedResult = requireRecord(scenarioCase.expected?.result, 'Scenario expected.result');
    const collaborator = new ContextCollaborator(label);
    const error = ModuleError.create('Test', {
      context: { collaborator },
      scenario: 'INTERNAL'
    });
    const projection = error.context;
    assert.ok(projection !== undefined);
    const projectedCollaborator = projection.collaborator;
    assert.ok(projectedCollaborator instanceof ContextCollaborator);
    assert.strictEqual(projectedCollaborator.label, expectedResult.label);
    assert.strictEqual(projectedCollaborator === collaborator, expectedResult.sameInstance);
  },

  'context-detaches-projections': () => {
    const context = { request: { attempt: 1 } };
    const error = ModuleError.create('Test', { context, scenario: 'INTERNAL' });
    context.request.attempt = 2;
    assert.deepStrictEqual(error.context, { request: { attempt: 1 } });
    const projection = error.context;
    if (projection !== undefined && projection.request !== null && typeof projection.request === 'object') {
      Reflect.set(projection.request, 'attempt', 3);
    }
    assert.deepStrictEqual(error.context, { request: { attempt: 1 } });
    assert.deepStrictEqual(error.toJSON().context, { request: { attempt: 1 } });
  },

  'http-uses-scenario-code': () => {
    const error = ModuleError.create('Not found', { scenario: 'NOT_FOUND' });
    assert.strictEqual(error.status, 404);
  },

  'http-allows-status-override': () => {
    const error = ModuleError.create('Test', { scenario: 'INTERNAL', status: 503 });
    assert.strictEqual(error.status, 503);
  },

  'retryable-transient': () => {
    const error = ModuleError.create('Timeout', { scenario: 'TIMEOUT' });
    assert.strictEqual(error.retryable, true);
  },

  'retryable-permanent': () => {
    const error = ModuleError.create('Invalid input', { scenario: 'VALIDATION' });
    assert.strictEqual(error.retryable, false);
  },

  'cause-stores-single': () => {
    const cause = RuntimeError.create('Root cause');
    const error = ModuleError.create('Wrapper', { cause, scenario: 'INTERNAL' });
    assert.strictEqual(error.cause, cause);
  },

  'cause-builds-chain': () => {
    const root = RuntimeError.create('Root cause');
    const middle = ModuleError.create('Middle error', { cause: root, scenario: 'INTERNAL' });
    const top = ModuleError.create('Top error', { cause: middle, scenario: 'INTERNAL' });
    assert.strictEqual(top.cause, middle);
    assert.strictEqual(top.cause.cause, root);
  },

  'cause-handles-undefined': () => {
    const error = ModuleError.create('Test', { scenario: 'INTERNAL' });
    assert.strictEqual(error.cause, undefined);
  },

  'chain-single': () => {
    const error = ModuleError.create('Test', { scenario: 'INTERNAL' });
    const chain = BaseError.getCauseChain(error);
    assert.strictEqual(chain.length, 1);
    assert.strictEqual(chain[0], error);
  },

  'chain-nested': () => {
    const root = RuntimeError.create('Root');
    const middle = ModuleError.create('Middle', { cause: root, scenario: 'INTERNAL' });
    const top = ModuleError.create('Top', { cause: middle, scenario: 'INTERNAL' });
    const chain = BaseError.getCauseChain(top);
    assert.strictEqual(chain.length, 3);
    assert.strictEqual(chain[0], top);
    assert.strictEqual(chain[1], middle);
    assert.strictEqual(chain[2], root);
  },

  'chain-deep': () => {
    let current: Error = RuntimeError.create('Root');
    for (let index = 0; index < 9; index += 1) {
      current = ModuleError.create(`Level ${index}`, { cause: current, scenario: 'INTERNAL' });
    }
    assert.ok(current instanceof BaseError);
    const chain = BaseError.getCauseChain(current);
    assert.strictEqual(chain.length, 10);
    const deepest = chain[9];
    assert.ok(deepest instanceof Error);
    assert.strictEqual(deepest.message, 'Root');
  },

  'chain-circular': () => {
    const a = ModuleError.create('a', { scenario: 'INTERNAL' });
    const b = ModuleError.create('b', { cause: a, scenario: 'INTERNAL' });
    Reflect.set(a, 'cause', b);
    const chain = BaseError.getCauseChain(b);
    assert.ok(chain.length <= CAUSE_CHAIN_DEPTH_LIMIT);
  },

  'find-cause-match': () => {
    const root = new TestError('Test error');
    const middle = ModuleError.create('Middle', { cause: root, scenario: 'INTERNAL' });
    const top = ModuleError.create('Top', { cause: middle, scenario: 'INTERNAL' });
    const found = BaseError.findCauseOfType(top, TestError);
    assert.ok(found instanceof TestError);
    assert.strictEqual(found, root);
  },

  'find-cause-missing': () => {
    const root = RuntimeError.create('Root');
    const top = ModuleError.create('Top', { cause: root, scenario: 'INTERNAL' });
    const found = BaseError.findCauseOfType(top, TestError);
    assert.strictEqual(found, undefined);
  },

  'find-cause-first-match': () => {
    const root = new TestError('First');
    const middle = new TestError('Second');
    ModuleError.create('Wrapper1', { cause: root, scenario: 'INTERNAL' });
    const wrapper2 = ModuleError.create('Wrapper2', { cause: middle, scenario: 'INTERNAL' });
    const top = ModuleError.create('Top', { cause: wrapper2, scenario: 'INTERNAL' });
    const found = BaseError.findCauseOfType(top, TestError);
    assert.strictEqual(found, middle);
  },

  'find-cause-subclass': () => {
    const root = RuntimeError.create('Root');
    const network = NetworkError.create('Network failed', { cause: root });
    const top = ModuleError.create('Top', { cause: network, scenario: 'INTERNAL' });
    const found = BaseError.getCauseChain(top).find((error) => { return error instanceof NetworkError; });
    assert.ok(found instanceof NetworkError);
    assert.strictEqual(found, network);
  },

  'find-cause-circular': () => {
    const a = ModuleError.create('a', { scenario: 'INTERNAL' });
    const b = ModuleError.create('b', { cause: a, scenario: 'INTERNAL' });
    Reflect.set(a, 'cause', b);
    const found = BaseError.findCauseOfType(b, TestError);
    assert.strictEqual(found, undefined);
  },

  'has-cause-true': () => {
    const root = new TestError('Test');
    const top = ModuleError.create('Top', { cause: root, scenario: 'INTERNAL' });
    assert.strictEqual(BaseError.hasCauseOfType(top, TestError), true);
  },

  'has-cause-false': () => {
    const root = RuntimeError.create('Root');
    const top = ModuleError.create('Top', { cause: root, scenario: 'INTERNAL' });
    assert.strictEqual(BaseError.hasCauseOfType(top, TestError), false);
  },

  'has-cause-empty': () => {
    const error = ModuleError.create('Test', { scenario: 'INTERNAL' });
    assert.strictEqual(BaseError.hasCauseOfType(error, TestError), false);
  },

  'has-cause-deep': () => {
    const root = new TestError('Root');
    const middle1 = ModuleError.create('Middle1', { cause: root, scenario: 'INTERNAL' });
    const middle2 = ModuleError.create('Middle2', { cause: middle1, scenario: 'INTERNAL' });
    const top = ModuleError.create('Top', { cause: middle2, scenario: 'INTERNAL' });
    assert.ok(BaseError.hasCauseOfType(top, TestError));
  },

  'has-cause-circular': () => {
    const a = ModuleError.create('a', { scenario: 'INTERNAL' });
    const b = ModuleError.create('b', { cause: a, scenario: 'INTERNAL' });
    Reflect.set(a, 'cause', b);
    assert.strictEqual(BaseError.hasCauseOfType(b, TestError), false);
  },

  'json-basic': () => {
    const error = ModuleError.create('Test error', { scenario: 'INTERNAL' });
    const json = error.toJSON();
    assert.strictEqual(json.title, 'ModuleError');
    assert.strictEqual(json.detail, 'Test error');
    assert.strictEqual(json.code, 'INTERNAL_ERROR');
    assert.strictEqual(json.type, `${PROBLEM_TYPE_BASE}INTERNAL_ERROR`);
    assert.strictEqual(json.retryable, false);
    assert.strictEqual(json.status, 500);
    assert.ok(typeof json.stack === 'string');
  },

  'json-optional-context': () => {
    const context = { userId: '123' };
    const error = ModuleError.create('Test', { context, scenario: 'INTERNAL' });
    const json = error.toJSON();
    assert.deepStrictEqual(json.context, context);
    assert.strictEqual(json.status, 500);
    assert.strictEqual(json.retryable, false);
  },

  'json-excludes-undefined': () => {
    const error = ModuleError.create('Test', { scenario: 'VALIDATION' });
    const json = error.toJSON();
    assert.strictEqual('context' in json, false);
  },

  'json-native-cause': () => {
    const cause = RuntimeError.create('Root cause');
    const error = ModuleError.create('Test', { cause, scenario: 'INTERNAL' });
    const causes = error.toJSON().causes ?? [];
    assert.strictEqual(causes[0]?.detail, 'Root cause');
    assert.strictEqual(causes[0]?.name, 'RuntimeError');
    // A cause node is a summary: only the head carries a stack.
    assert.strictEqual('stack' in (causes[0] ?? {}), false);
  },

  'json-native-primitive-cause': () => {
    const error: ModuleError = Reflect.apply(ModuleError.create, ModuleError, ['Test', { cause: 42, scenario: 'INTERNAL' }]);
    const causes = error.toJSON().causes ?? [];
    assert.strictEqual(causes[0]?.type, PROBLEM_TYPE_THROWN_PRIMITIVE);
    assert.strictEqual(causes[0]?.detail, '42');
  },

  'json-primitive-cause': () => {
    const error: ModuleError = Reflect.apply(ModuleError.create, ModuleError, ['Test', { cause: 'primitive cause', scenario: 'INTERNAL' }]);
    const causes = error.toJSON().causes ?? [];
    assert.strictEqual(causes[0]?.type, PROBLEM_TYPE_THROWN_STRING);
    assert.strictEqual(causes[0]?.detail, 'primitive cause');
  },

  'json-module-cause': () => {
    const root = ModuleError.create('Root', { scenario: 'DATABASE' });
    const top = ModuleError.create('Top', { cause: root, scenario: 'INTERNAL' });
    const causes = top.toJSON().causes ?? [];
    assert.strictEqual(causes[0]?.detail, 'Root');
    assert.strictEqual(causes[0]?.code, 'DATABASE_ERROR');
    assert.strictEqual(causes[0]?.type, `${PROBLEM_TYPE_BASE}DATABASE_ERROR`);
  },

  'json-deep-chain': () => {
    const root = RuntimeError.create('Root');
    const middle = ModuleError.create('Middle', { cause: root, scenario: 'INTERNAL' });
    const top = ModuleError.create('Top', { cause: middle, scenario: 'INTERNAL' });
    // The chain is flattened, nearest first, rather than nested.
    const causes = top.toJSON().causes ?? [];
    assert.strictEqual(causes[0]?.code, 'INTERNAL_ERROR');
    assert.strictEqual(causes[1]?.detail, 'Root');
  },

  'json-depth-sentinel': () => {
    let current = ModuleError.create('depth-0', { scenario: 'INTERNAL' });
    for (let index = 1; index <= CAUSE_CHAIN_DEPTH_LIMIT + 1; index += 1) {
      current = ModuleError.create(`depth-${index}`, { cause: current, scenario: 'INTERNAL' });
    }
    const causes = current.toJSON().causes ?? [];
    const found = causes.some((node) => {
      const result = node.detail === CAUSE_DEPTH_SENTINEL;

      return result;
    });
    assert.ok(found);
  },

  'json-safe': () => {
    const error = ModuleError.create('Test', {
      context: { count: 42, date: new Date().toISOString() },
      scenario: 'INTERNAL'
    });
    const jsonString = JSON.stringify(error.toJSON());
    assert.ok(jsonString.length > 0);
    const parsed: unknown = JSON.parse(jsonString);
    const parsedRecord = requireRecord(parsed, 'Parsed JSON');
    assert.strictEqual(parsedRecord.code, 'INTERNAL_ERROR');
    assert.strictEqual(parsedRecord.status, 500);
  },

  'subclass-custom': () => {
    const error = NetworkError.create('Connection failed');
    assert.ok(error instanceof Error);
    assert.ok(error instanceof ModuleError);
    assert.ok(error instanceof NetworkError);
    assert.strictEqual(error.name, 'NetworkError');
    assert.strictEqual(error.code, 'CONNECTION_ERROR');
    assert.strictEqual(error.status, 503);
    assert.strictEqual(error.retryable, true);
  },

  'subclass-overrides-defaults': () => {
    const error = NetworkError.create('Connection failed', { retryable: false });
    assert.strictEqual(error.retryable, false);
    assert.strictEqual(error.code, 'CONNECTION_ERROR');
  },

  'subclass-serialization-name': () => {
    const error = NetworkError.create('Test');
    const json = error.toJSON();
    // RFC 9457 3.1.2: title names the problem TYPE, so a subclass names itself.
    assert.strictEqual(json.title, 'NetworkError');
    assert.strictEqual(json.code, 'CONNECTION_ERROR');
  },

  'instanceof-error': () => {
    const error = ModuleError.create('Test', { scenario: 'INTERNAL' });
    assert.ok(error instanceof Error);
  },

  'instanceof-module-error': () => {
    const error = ModuleError.create('Test', { scenario: 'INTERNAL' });
    assert.ok(error instanceof ModuleError);
  },

  'instanceof-subclass': () => {
    const error = NetworkError.create('Test');
    assert.ok(error instanceof Error);
    assert.ok(error instanceof ModuleError);
    assert.ok(error instanceof NetworkError);
  },

  'stack-trace': () => {
    const error = ModuleError.create('Test error', { scenario: 'INTERNAL' });
    assert.ok(error.stack !== undefined);
    assert.ok(error.stack.includes('ModuleError'));
  },

  'stack-trace-disabled': () => {
    const descriptor = Object.getOwnPropertyDescriptor(Error, 'captureStackTrace');
    assert.ok(descriptor !== undefined);
    const original = Error.captureStackTrace;

    try {
      Object.defineProperty(Error, 'captureStackTrace', {
        'configurable': true,
        'value': undefined,
        'writable': true
      });
      const error = ModuleError.create('Test error', { scenario: 'INTERNAL' });
      assert.ok(error.stack !== undefined);
    } finally {
      Object.defineProperty(Error, 'captureStackTrace', {
        'configurable': true,
        'value': original,
        'writable': true
      });
    }
  }
};

function runCase(scenarioCase: ScenarioCase): void {
  const runner = runnerMap[scenarioCase.shape];
  if (runner === undefined) {
    throw RuntimeError.create(`No runner registered for shape: ${scenarioCase.shape}`);
  }
  runner(scenarioCase);
}

void describe('ModuleError', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
