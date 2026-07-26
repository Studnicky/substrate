import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import type { ModuleErrorOptionsInterface } from '../../src/interfaces/index.js';

import { CAUSE_CHAIN_DEPTH_LIMIT, CAUSE_DEPTH_SENTINEL } from '../../src/constants/CauseChainConstants.js';
import { ErrorDefaults } from '../../src/constants/index.js';
import { BaseError } from '../../src/errors/BaseError.js';
import { ModuleError } from '../../src/errors/ModuleError.js';
import scenarioGroups from './module-error.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | { description: string; shape: 'factory-scenario-defaults'; name: string }
  | { description: string; shape: 'factory-merge-user-options'; name: string }
  | { description: string; expected: { errorName: string }; shape: 'factory-reject-empty-message'; name: string }
  | { description: string; expected: { errorName: string }; shape: 'factory-reject-empty-code'; name: string }
  | { description: string; expected: { errorName: string }; shape: 'factory-reject-invalid-scenario'; name: string }
  | { description: string; expected: { result: { retryable: boolean } }; input: { code: string; message: string }; shape: 'constructor-defaults-omitted-options'; name: string }
  | { description: string; expected: { result: { code: string; retryable: boolean; statusCode: number } }; scenario: 'CONNECTION' | 'AUTHENTICATION' | 'NOT_FOUND'; shape: 'scenario-defaults'; name: string }
  | { description: string; shape: 'scenario-retryable-overrides'; name: string }
  | { description: string; expected: { result: { context: Record<string, unknown> } }; input: { context: Record<string, unknown> }; shape: 'context-stores-arbitrary-data'; name: string }
  | { description: string; shape: 'context-handles-undefined'; name: string }
  | { description: string; shape: 'context-empty-object'; name: string }
  | { description: string; shape: 'context-null-prototype'; name: string }
  | { description: string; expected: { result: { label: string; sameInstance: boolean } }; input: { context: { collaborator: { label: string } } }; shape: 'context-preserves-collaborator-instance'; name: string }
  | { description: string; shape: 'context-detaches-projections'; name: string }
  | { description: string; shape: 'http-uses-scenario-code'; name: string }
  | { description: string; shape: 'http-allows-status-override'; name: string }
  | { description: string; shape: 'retryable-transient'; name: string }
  | { description: string; shape: 'retryable-permanent'; name: string }
  | { description: string; shape: 'cause-stores-single'; name: string }
  | { description: string; shape: 'cause-builds-chain'; name: string }
  | { description: string; shape: 'cause-handles-undefined'; name: string }
  | { description: string; shape: 'chain-single'; name: string }
  | { description: string; shape: 'chain-nested'; name: string }
  | { description: string; shape: 'chain-deep'; name: string }
  | { description: string; shape: 'chain-circular'; name: string }
  | { description: string; shape: 'find-cause-match'; name: string }
  | { description: string; shape: 'find-cause-missing'; name: string }
  | { description: string; shape: 'find-cause-first-match'; name: string }
  | { description: string; shape: 'find-cause-subclass'; name: string }
  | { description: string; shape: 'find-cause-circular'; name: string }
  | { description: string; shape: 'has-cause-true'; name: string }
  | { description: string; shape: 'has-cause-false'; name: string }
  | { description: string; shape: 'has-cause-empty'; name: string }
  | { description: string; shape: 'has-cause-deep'; name: string }
  | { description: string; shape: 'has-cause-circular'; name: string }
  | { description: string; shape: 'json-basic'; name: string }
  | { description: string; shape: 'json-optional-context'; name: string }
  | { description: string; shape: 'json-excludes-undefined'; name: string }
  | { description: string; shape: 'json-native-cause'; name: string }
  | { description: string; shape: 'json-primitive-cause'; name: string }
  | { description: string; shape: 'json-native-primitive-cause'; name: string }
  | { description: string; shape: 'json-module-cause'; name: string }
  | { description: string; shape: 'json-deep-chain'; name: string }
  | { description: string; shape: 'json-depth-sentinel'; name: string }
  | { description: string; shape: 'json-safe'; name: string }
  | { description: string; shape: 'subclass-custom'; name: string }
  | { description: string; shape: 'subclass-overrides-defaults'; name: string }
  | { description: string; shape: 'subclass-serialization-name'; name: string }
  | { description: string; shape: 'instanceof-error'; name: string }
  | { description: string; shape: 'instanceof-module-error'; name: string }
  | { description: string; shape: 'instanceof-subclass'; name: string }
  | { description: string; shape: 'stack-trace-disabled'; name: string }
  | { description: string; shape: 'stack-trace'; name: string };

type ScenarioRunner<K extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => void;

type RunnerMap = {
  [K in ScenarioCase['shape']]: ScenarioRunner<K>;
};

class TestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TestError';
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
      statusCode: options?.statusCode ?? defaults.statusCode
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
      statusCode: undefined
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
    assert.strictEqual(error.statusCode, 500);
    assert.strictEqual(error.context, undefined);
  },

  'factory-merge-user-options': () => {
    const cause = new Error('Root cause');
    const context = { operation: 'fetch', userId: '123' };
    const error = ModuleError.create('Test error', {
      cause,
      context,
      retryable: true,
      scenario: 'DATABASE',
      statusCode: 503
    });
    assert.strictEqual(error.code, 'DATABASE_ERROR');
    assert.strictEqual(error.cause, cause);
    assert.deepStrictEqual(error.context, context);
    assert.strictEqual(error.statusCode, 503);
    assert.strictEqual(error.retryable, true);
  },

  'factory-reject-empty-message': (scenarioCase) => {
    assert.throws(() => {
      ModuleError.create('', { scenario: 'INTERNAL' });
    }, {
      message: /Validation failed at "message"/u,
      name: scenarioCase.expected.errorName
    });
  },

  'factory-reject-empty-code': (scenarioCase) => {
    class EmptyCodeError extends ModuleError {
      static override create(message: string): EmptyCodeError {
        return new EmptyCodeError(message, {
          'code': '',
          'context': undefined,
          'retryable': false,
          'statusCode': undefined
        });
      }
    }
    assert.throws(() => {
      EmptyCodeError.create('Test');
    }, {
      message: /Validation failed at "code"/u,
      name: scenarioCase.expected.errorName
    });
  },

  'factory-reject-invalid-scenario': (scenarioCase) => {
    assert.throws(() => {
      Reflect.apply(ModuleError.create, ModuleError, ['Test', { scenario: 'INVALID' }]);
    }, {
      message: /Validation failed at "scenario"/u,
      name: scenarioCase.expected.errorName
    });
  },

  'constructor-defaults-omitted-options': (scenarioCase) => {
    const error = MinimalOptionsError.build(scenarioCase.input.message, scenarioCase.input.code);
    assert.strictEqual(error.retryable, scenarioCase.expected.result.retryable);
    assert.strictEqual(error.context, undefined);
    assert.strictEqual(error.statusCode, undefined);
  },

  'scenario-defaults': (scenarioCase) => {
    const message = scenarioCase.scenario === 'CONNECTION'
      ? 'Connection failed'
      : scenarioCase.scenario === 'AUTHENTICATION'
        ? 'Auth failed'
        : 'Not found';
    const error = ModuleError.create(message, { scenario: scenarioCase.scenario });
    assert.strictEqual(error.code, scenarioCase.expected.result.code);
    assert.strictEqual(error.statusCode, scenarioCase.expected.result.statusCode);
    assert.strictEqual(error.retryable, scenarioCase.expected.result.retryable);
  },

  'scenario-retryable-overrides': () => {
    const error = ModuleError.create('Connection failed', { retryable: false, scenario: 'CONNECTION' });
    assert.strictEqual(error.retryable, false);
  },

  'context-stores-arbitrary-data': (scenarioCase) => {
    const context = scenarioCase.input.context;
    const error = ModuleError.create('Operation failed', {
      context,
      scenario: 'INTERNAL'
    });
    assert.deepStrictEqual(error.context, scenarioCase.expected.result.context);
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
    const context = Object.create(null) as Record<string, unknown>;
    context.items = [{ nested: { count: 1 } }, ['a', 'b']];
    context.meta = { flags: Object.create(null) as Record<string, unknown> };
    const error = ModuleError.create('Test', { context, scenario: 'INTERNAL' });
    const projection = error.context;
    assert.ok(projection !== undefined);
    assert.deepStrictEqual(projection.items, [{ nested: { count: 1 } }, ['a', 'b']]);
    assert.deepStrictEqual(projection.meta, { flags: {} });
    assert.ok(Object.getPrototypeOf(projection) === Object.prototype);
  },

  'context-preserves-collaborator-instance': (scenarioCase) => {
    const collaborator = new ContextCollaborator(scenarioCase.input.context.collaborator.label);
    const error = ModuleError.create('Test', {
      context: { collaborator },
      scenario: 'INTERNAL'
    });
    const projection = error.context;
    assert.ok(projection !== undefined);
    const projectedCollaborator = projection.collaborator;
    assert.ok(projectedCollaborator instanceof ContextCollaborator);
    assert.strictEqual(projectedCollaborator.label, scenarioCase.expected.result.label);
    assert.strictEqual(projectedCollaborator === collaborator, scenarioCase.expected.result.sameInstance);
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
    assert.strictEqual(error.statusCode, 404);
  },

  'http-allows-status-override': () => {
    const error = ModuleError.create('Test', { scenario: 'INTERNAL', statusCode: 503 });
    assert.strictEqual(error.statusCode, 503);
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
    const cause = new Error('Root cause');
    const error = ModuleError.create('Wrapper', { cause, scenario: 'INTERNAL' });
    assert.strictEqual(error.cause, cause);
  },

  'cause-builds-chain': () => {
    const root = new Error('Root cause');
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
    const root = new Error('Root');
    const middle = ModuleError.create('Middle', { cause: root, scenario: 'INTERNAL' });
    const top = ModuleError.create('Top', { cause: middle, scenario: 'INTERNAL' });
    const chain = BaseError.getCauseChain(top);
    assert.strictEqual(chain.length, 3);
    assert.strictEqual(chain[0], top);
    assert.strictEqual(chain[1], middle);
    assert.strictEqual(chain[2], root);
  },

  'chain-deep': () => {
    let current: Error = new Error('Root');
    for (let index = 0; index < 9; index += 1) {
      current = ModuleError.create(`Level ${index}`, { cause: current, scenario: 'INTERNAL' });
    }
    assert.ok(current instanceof BaseError);
    const chain = BaseError.getCauseChain(current);
    assert.strictEqual(chain.length, 10);
    assert.strictEqual((chain[9] as Error).message, 'Root');
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
    const root = new Error('Root');
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
    const root = new Error('Root');
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
    const root = new Error('Root');
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
    assert.strictEqual(json.name, 'ModuleError');
    assert.strictEqual(json.message, 'Test error');
    assert.strictEqual(json.code, 'INTERNAL_ERROR');
    assert.strictEqual(json.retryable, false);
    assert.strictEqual(json.statusCode, 500);
    assert.ok(typeof json.stack === 'string');
  },

  'json-optional-context': () => {
    const context = { userId: '123' };
    const error = ModuleError.create('Test', { context, scenario: 'INTERNAL' });
    const json = error.toJSON();
    assert.deepStrictEqual(json.context, context);
    assert.strictEqual(json.statusCode, 500);
    assert.strictEqual(json.retryable, false);
  },

  'json-excludes-undefined': () => {
    const error = ModuleError.create('Test', { scenario: 'VALIDATION' });
    const json = error.toJSON();
    assert.strictEqual('context' in json, false);
  },

  'json-native-cause': () => {
    const cause = new Error('Root cause');
    const error = ModuleError.create('Test', { cause, scenario: 'INTERNAL' });
    const json = error.toJSON();
    assert.ok(json.cause !== undefined);
    assert.strictEqual((json.cause as { message: string }).message, 'Root cause');
    assert.strictEqual((json.cause as { name: string }).name, 'Error');
    assert.ok(typeof (json.cause as { stack: string }).stack === 'string');
  },

  'json-native-primitive-cause': () => {
    const error: ModuleError = Reflect.apply(ModuleError.create, ModuleError, ['Test', { cause: 42, scenario: 'INTERNAL' }]);
    const json = error.toJSON();
    assert.strictEqual(json.cause, 42);
  },

  'json-primitive-cause': () => {
    const error: ModuleError = Reflect.apply(ModuleError.create, ModuleError, ['Test', { cause: 'primitive cause', scenario: 'INTERNAL' }]);
    const json = error.toJSON();
    assert.strictEqual(json.cause, 'primitive cause');
  },

  'json-module-cause': () => {
    const root = ModuleError.create('Root', { scenario: 'DATABASE' });
    const top = ModuleError.create('Top', { cause: root, scenario: 'INTERNAL' });
    const json = top.toJSON();
    assert.ok(json.cause !== undefined);
    const causeJson = json.cause as Record<string, unknown>;
    assert.strictEqual(causeJson.message, 'Root');
    assert.strictEqual(causeJson.code, 'DATABASE_ERROR');
    assert.strictEqual(causeJson.statusCode, 500);
  },

  'json-deep-chain': () => {
    const root = new Error('Root');
    const middle = ModuleError.create('Middle', { cause: root, scenario: 'INTERNAL' });
    const top = ModuleError.create('Top', { cause: middle, scenario: 'INTERNAL' });
    const json = top.toJSON();
    assert.ok(json.cause !== undefined);
    const middleJson = json.cause as Record<string, unknown>;
    assert.strictEqual(middleJson.code, 'INTERNAL_ERROR');
    assert.ok(middleJson.cause !== undefined);
    const rootJson = middleJson.cause as Record<string, unknown>;
    assert.strictEqual(rootJson.message, 'Root');
  },

  'json-depth-sentinel': () => {
    let current = ModuleError.create('depth-0', { scenario: 'INTERNAL' });
    for (let index = 1; index <= CAUSE_CHAIN_DEPTH_LIMIT + 1; index += 1) {
      current = ModuleError.create(`depth-${index}`, { cause: current, scenario: 'INTERNAL' });
    }
    const json = current.toJSON();
    let node: unknown = json;
    let found = false;
    while (node !== null && node !== undefined) {
      const rec = node as { cause: unknown };
      if (typeof rec.cause === 'string' && rec.cause === CAUSE_DEPTH_SENTINEL) {
        found = true;
        break;
      }
      node = rec.cause;
    }
    assert.ok(found);
  },

  'json-safe': () => {
    const error = ModuleError.create('Test', {
      context: { count: 42, date: new Date().toISOString() },
      scenario: 'INTERNAL'
    });
    const jsonString = JSON.stringify(error.toJSON());
    assert.ok(jsonString.length > 0);
    const parsed = JSON.parse(jsonString) as Record<string, unknown>;
    assert.strictEqual(parsed.code, 'INTERNAL_ERROR');
    assert.strictEqual(parsed.statusCode, 500);
  },

  'subclass-custom': () => {
    const error = NetworkError.create('Connection failed');
    assert.ok(error instanceof Error);
    assert.ok(error instanceof ModuleError);
    assert.ok(error instanceof NetworkError);
    assert.strictEqual(error.name, 'NetworkError');
    assert.strictEqual(error.code, 'CONNECTION_ERROR');
    assert.strictEqual(error.statusCode, 503);
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
    assert.strictEqual(json.name, 'NetworkError');
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

function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('ModuleError', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
