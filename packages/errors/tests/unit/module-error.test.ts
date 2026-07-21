/**
 * ModuleError Unit Tests
 *
 * Tests for the base ModuleError class including:
 * - Factory method and validation
 * - Error codes and context
 * - Cause chain traversal
 * - Serialization
 * - Stack traces
 */

import type { ModuleErrorOptionsInterface } from '../../src/interfaces/index.js';

import {
  deepStrictEqual,
  ok,
  strictEqual,
  throws
} from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { CAUSE_CHAIN_DEPTH_LIMIT, CAUSE_DEPTH_SENTINEL, ErrorDefaults } from '../../src/constants/index.js';
import { BaseError } from '../../src/errors/BaseError.js';
import { ModuleError } from '../../src/errors/ModuleError.js';

// Test error subclasses
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
    // Get CONNECTION scenario defaults
    const defaults = ErrorDefaults.CONNECTION;

    // Merge user options over defaults
    const mergedOptions: ModuleErrorOptionsInterface = {
      cause: options?.cause,
      code: defaults.code,
      context: options?.context,
      retryable: options?.retryable ?? defaults.retryable,
      statusCode: options?.statusCode ?? defaults.statusCode
    };

    // Create NetworkError instance via protected constructor
    return new NetworkError(message, mergedOptions);
  }

  protected constructor(message: string, options: ModuleErrorOptionsInterface) {
    super(message, options);
  }
}

void describe('ModuleError', () => {
  void describe('factory method', () => {
    void it('creates error with scenario defaults', () => {
      const error = ModuleError.create('Test error', { scenario: 'INTERNAL' });

      ok(error instanceof Error, 'Should be instance of Error');
      ok(error instanceof ModuleError, 'Should be instance of ModuleError');
      strictEqual(error.name, 'ModuleError');
      strictEqual(error.message, 'Test error');
      strictEqual(error.code, 'INTERNAL_ERROR');
      strictEqual(error.retryable, false);
      strictEqual(error.statusCode, 500);
      strictEqual(error.context, undefined);
    });

    void it('merges user options over scenario defaults', () => {
      const cause = new Error('Root cause');
      const context = {
        operation: 'fetch',
        userId: '123'
      };

      const error = ModuleError.create('Test error', {
        cause,
        context,
        retryable: true,
        scenario: 'DATABASE',
        statusCode: 503
      });

      strictEqual(error.code, 'DATABASE_ERROR');
      strictEqual(error.cause, cause);
      deepStrictEqual(error.context, context);
      // Overridden
      strictEqual(error.statusCode, 503);
      // Overridden
      strictEqual(error.retryable, true);
    });

    void it('validates empty message', () => {
      throws(
        () => {
          ModuleError.create('', { scenario: 'INTERNAL' });
        },
        {
          message: /Validation failed at "message"/u,
          name: 'ValidationError'
        }
      );
    });

    void it('validates invalid scenario', () => {
      throws(
        () => {
          Reflect.apply(ModuleError.create, ModuleError, ['Test', { 'scenario': 'INVALID' }]);
        },
        {
          message: /Validation failed at "scenario"/u,
          name: 'ValidationError'
        }
      );
    });
  });

  void describe('scenarios', () => {
    const scenarioScenarios: Array<{
      description: string;
      scenario: 'CONNECTION' | 'AUTHENTICATION' | 'NOT_FOUND';
      message: string;
      expected: { code: string; statusCode: number; retryable: boolean };
    }> = [
      {
        description: 'CONNECTION scenario has correct defaults',
        expected: { code: 'CONNECTION_ERROR', retryable: true, statusCode: 503 },
        message: 'Connection failed',
        scenario: 'CONNECTION'
      },
      {
        description: 'AUTHENTICATION scenario has correct defaults',
        expected: { code: 'AUTHENTICATION_ERROR', retryable: false, statusCode: 401 },
        message: 'Auth failed',
        scenario: 'AUTHENTICATION'
      },
      {
        description: 'NOT_FOUND scenario has correct defaults',
        expected: { code: 'NOT_FOUND', retryable: false, statusCode: 404 },
        message: 'Not found',
        scenario: 'NOT_FOUND'
      }
    ];

    for (const { description, scenario, message, expected } of scenarioScenarios) {
      void it(description, () => {
        const error = ModuleError.create(message, { scenario });
        strictEqual(error.code, expected.code);
        strictEqual(error.statusCode, expected.statusCode);
        strictEqual(error.retryable, expected.retryable);
      });
    }

    void it('allows overriding scenario retryable', () => {
      const error = ModuleError.create('Connection failed', {
        retryable: false,
        scenario: 'CONNECTION'
      });

      strictEqual(error.retryable, false);
    });
  });

  void describe('context metadata', () => {
    void it('stores arbitrary context data', () => {
      const context = {
        operation: 'createUser',
        requestId: 'req-456',
        timestamp: new Date().toISOString(),
        userId: '123'
      };

      const error = ModuleError.create('Operation failed', {
        context,
        scenario: 'INTERNAL'
      });

      deepStrictEqual(error.context, context);
    });

    void it('handles undefined context', () => {
      const error = ModuleError.create('Test', { scenario: 'INTERNAL' });

      strictEqual(error.context, undefined);
    });

    void it('handles empty context object', () => {
      const error = ModuleError.create('Test', {
        context: {},
        scenario: 'INTERNAL'
      });

      deepStrictEqual(error.context, {});
    });

    void it('detaches nested construction context and each public projection', () => {
      const context = { 'request': { 'attempt': 1 } };
      const error = ModuleError.create('Test', { context, scenario: 'INTERNAL' });

      context.request.attempt = 2;
      deepStrictEqual(error.context, { 'request': { 'attempt': 1 } });

      const projection = error.context;
      if (projection !== undefined && projection.request !== null && typeof projection.request === 'object') {
        Reflect.set(projection.request, 'attempt', 3);
      }

      deepStrictEqual(error.context, { 'request': { 'attempt': 1 } });
      deepStrictEqual(error.toJSON().context, { 'request': { 'attempt': 1 } });
    });
  });

  void describe('HTTP semantics', () => {
    void it('uses scenario status code', () => {
      const error = ModuleError.create('Not found', { scenario: 'NOT_FOUND' });

      strictEqual(error.statusCode, 404);
    });

    void it('allows overriding status code', () => {
      const error = ModuleError.create('Test', {
        scenario: 'INTERNAL',
        statusCode: 503
      });

      strictEqual(error.statusCode, 503);
    });
  });

  void describe('retryable flag', () => {
    void it('marks transient errors as retryable', () => {
      const error = ModuleError.create('Timeout', { scenario: 'TIMEOUT' });

      strictEqual(error.retryable, true);
    });

    void it('marks permanent errors as non-retryable', () => {
      const error = ModuleError.create('Invalid input', { scenario: 'VALIDATION' });

      strictEqual(error.retryable, false);
    });
  });

  void describe('cause chain', () => {
    void it('stores single cause', () => {
      const cause = new Error('Root cause');
      const error = ModuleError.create('Wrapper', {
        cause,
        scenario: 'INTERNAL'
      });

      strictEqual(error.cause, cause);
    });

    void it('builds multi-level cause chain', () => {
      const root = new Error('Root cause');
      const middle = ModuleError.create('Middle error', {
        cause: root,
        scenario: 'INTERNAL'
      });
      const top = ModuleError.create('Top error', {
        cause: middle,
        scenario: 'INTERNAL'
      });

      strictEqual(top.cause, middle);
      strictEqual((top.cause).cause, root);
    });

    void it('handles undefined cause', () => {
      const error = ModuleError.create('Test', { scenario: 'INTERNAL' });

      strictEqual(error.cause, undefined);
    });
  });

  void describe('BaseError.getCauseChain()', () => {
    void it('returns single error for no causes', () => {
      const error = ModuleError.create('Test', { scenario: 'INTERNAL' });

      const chain = BaseError.getCauseChain(error);

      strictEqual(chain.length, 1);
      strictEqual(chain[0], error);
    });

    void it('returns full chain for nested causes', () => {
      const root = new Error('Root');
      const middle = ModuleError.create('Middle', {
        cause: root,
        scenario: 'INTERNAL'
      });
      const top = ModuleError.create('Top', {
        cause: middle,
        scenario: 'INTERNAL'
      });

      const chain = BaseError.getCauseChain(top);

      strictEqual(chain.length, 3);
      strictEqual(chain[0], top);
      strictEqual(chain[1], middle);
      strictEqual(chain[2], root);
    });

    void it('handles deep cause chains', () => {
      let current: Error = new Error('Root');

      // Build chain of 10 errors
      for (let i = 0; i < 9; i++) {
        current = ModuleError.create(`Level ${i}`, {
          cause: current,
          scenario: 'INTERNAL'
        });
      }

      ok(current instanceof BaseError);
      const chain = BaseError.getCauseChain(current);

      strictEqual(chain.length, 10);
      strictEqual(chain[0], current);
      ok(chain[9], 'Chain should have element at index 9');
      strictEqual(chain[9].message, 'Root');
    });

    void it('does not hang on a circular cause chain', () => {
      const a = ModuleError.create('a', { scenario: 'INTERNAL' });
      const b = ModuleError.create('b', {
        cause: a,
        scenario: 'INTERNAL'
      });
      // Force a cycle: a -> b -> a. `cause` is readonly at the type level
      // only; mutate the runtime property to simulate a mutated cause graph.
      Reflect.set(a, 'cause', b);

      const chain = BaseError.getCauseChain(b);

      ok(chain.length <= CAUSE_CHAIN_DEPTH_LIMIT, 'Chain should be bounded despite the cycle');
    });
  });

  void describe('BaseError.findCauseOfType()', () => {
    void it('finds matching cause in chain', () => {
      const root = new TestError('Test error');
      const middle = ModuleError.create('Middle', {
        cause: root,
        scenario: 'INTERNAL'
      });
      const top = ModuleError.create('Top', {
        cause: middle,
        scenario: 'INTERNAL'
      });

      const found = BaseError.findCauseOfType(top, TestError);

      ok(found instanceof TestError);
      strictEqual(found, root);
    });

    void it('returns undefined when type not found', () => {
      const root = new Error('Root');
      const top = ModuleError.create('Top', {
        cause: root,
        scenario: 'INTERNAL'
      });

      const found = BaseError.findCauseOfType(top, TestError);

      strictEqual(found, undefined);
    });

    void it('finds first matching type', () => {
      const root = new TestError('First');
      const middle = new TestError('Second');
      const _wrapper1 = ModuleError.create('Wrapper1', {
        cause: root,
        scenario: 'INTERNAL'
      });
      const wrapper2 = ModuleError.create('Wrapper2', {
        cause: middle,
        scenario: 'INTERNAL'
      });
      const top = ModuleError.create('Top', {
        cause: wrapper2,
        scenario: 'INTERNAL'
      });

      // Should find the first TestError in the chain (middle, not root)
      const found = BaseError.findCauseOfType(top, TestError);

      strictEqual(found, middle);
    });

    void it('can find ModuleError subclass', () => {
      const root = new Error('Root');
      const network = NetworkError.create('Network failed', { cause: root });
      const top = ModuleError.create('Top', {
        cause: network,
        scenario: 'INTERNAL'
      });

      const found = BaseError.getCauseChain(top).find((error) => { return error instanceof NetworkError; });

      ok(found instanceof NetworkError);
      strictEqual(found, network);
    });

    void it('does not hang on a circular cause chain', () => {
      const a = ModuleError.create('a', { scenario: 'INTERNAL' });
      const b = ModuleError.create('b', {
        cause: a,
        scenario: 'INTERNAL'
      });
      Reflect.set(a, 'cause', b);

      const found = BaseError.findCauseOfType(b, TestError);

      strictEqual(found, undefined);
    });
  });

  void describe('BaseError.hasCauseOfType()', () => {
    void it('returns true when type exists in chain', () => {
      const root = new TestError('Test');
      const top = ModuleError.create('Top', {
        cause: root,
        scenario: 'INTERNAL'
      });

      ok(BaseError.hasCauseOfType(top, TestError));
    });

    void it('returns false when type not in chain', () => {
      const root = new Error('Root');
      const top = ModuleError.create('Top', {
        cause: root,
        scenario: 'INTERNAL'
      });

      strictEqual(BaseError.hasCauseOfType(top, TestError), false);
    });

    void it('returns false for error with no causes', () => {
      const error = ModuleError.create('Test', { scenario: 'INTERNAL' });

      strictEqual(BaseError.hasCauseOfType(error, TestError), false);
    });

    void it('checks entire cause chain', () => {
      const root = new TestError('Root');
      const middle1 = ModuleError.create('Middle1', {
        cause: root,
        scenario: 'INTERNAL'
      });
      const middle2 = ModuleError.create('Middle2', {
        cause: middle1,
        scenario: 'INTERNAL'
      });
      const top = ModuleError.create('Top', {
        cause: middle2,
        scenario: 'INTERNAL'
      });

      ok(BaseError.hasCauseOfType(top, TestError), 'Should find TestError deep in chain');
    });

    void it('does not hang on a circular cause chain', () => {
      const a = ModuleError.create('a', { scenario: 'INTERNAL' });
      const b = ModuleError.create('b', {
        cause: a,
        scenario: 'INTERNAL'
      });
      Reflect.set(a, 'cause', b);

      strictEqual(BaseError.hasCauseOfType(b, TestError), false);
    });
  });

  void describe('toJSON()', () => {
    void it('serializes basic properties', () => {
      const error = ModuleError.create('Test error', { scenario: 'INTERNAL' });

      const json = error.toJSON();

      strictEqual(json.name, 'ModuleError');
      strictEqual(json.message, 'Test error');
      strictEqual(json.code, 'INTERNAL_ERROR');
      strictEqual(json.retryable, false);
      strictEqual(json.statusCode, 500);
      ok(typeof json.stack === 'string');
    });

    void it('includes optional properties when defined', () => {
      const context = { userId: '123' };
      const error = ModuleError.create('Test', {
        context,
        scenario: 'INTERNAL'
      });

      const json = error.toJSON();

      deepStrictEqual(json.context, context);
      strictEqual(json.statusCode, 500);
      strictEqual(json.retryable, false);
    });

    void it('excludes undefined optional properties', () => {
      const error = ModuleError.create('Test', { scenario: 'VALIDATION' });

      const json = error.toJSON();

      strictEqual('context' in json, false);
    });

    void it('serializes native Error cause', () => {
      const cause = new Error('Root cause');
      const error = ModuleError.create('Test', {
        cause,
        scenario: 'INTERNAL'
      });

      const json = error.toJSON();

      ok(json.cause !== undefined);
      strictEqual((json.cause as { message: string }).message, 'Root cause');
      strictEqual((json.cause as { name: string }).name, 'Error');
      ok(typeof (json.cause as { stack: string }).stack === 'string');
    });

    void it('recursively serializes ModuleError cause', () => {
      const root = ModuleError.create('Root', { scenario: 'DATABASE' });
      const top = ModuleError.create('Top', {
        cause: root,
        scenario: 'INTERNAL'
      });

      const json = top.toJSON();

      ok(json.cause !== undefined);
      const causeJson = json.cause as Record<string, unknown>;

      strictEqual(causeJson.message, 'Root');
      strictEqual(causeJson.code, 'DATABASE_ERROR');
      strictEqual(causeJson.statusCode, 500);
    });

    void it('handles deep cause chain serialization', () => {
      const root = new Error('Root');
      const middle = ModuleError.create('Middle', {
        cause: root,
        scenario: 'INTERNAL'
      });
      const top = ModuleError.create('Top', {
        cause: middle,
        scenario: 'INTERNAL'
      });

      const json = top.toJSON();

      ok(json.cause !== undefined);
      const middleJson = json.cause as Record<string, unknown>;

      strictEqual(middleJson.code, 'INTERNAL_ERROR');
      ok(middleJson.cause !== undefined);
      const rootJson = middleJson.cause as Record<string, unknown>;

      strictEqual(rootJson.message, 'Root');
    });

    void it('uses sentinel string when ModuleError chain exceeds depth limit instead of stack overflowing', () => {
      let current = ModuleError.create('depth-0', { scenario: 'INTERNAL' });
      for (let i = 1; i <= CAUSE_CHAIN_DEPTH_LIMIT + 1; i++) {
        current = ModuleError.create(`depth-${i}`, {
          cause: current,
          scenario: 'INTERNAL'
        });
      }

      const json = current.toJSON();

      // Walk the serialized chain to find the sentinel — must not throw
      // (stack overflow) and must terminate before the chain's true depth.
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
      ok(found, 'Should find cause depth sentinel in serialized ModuleError chain');
    });

    void it('produces JSON-safe output', () => {
      const error = ModuleError.create('Test', {
        context: {
          count: 42,
          date: new Date().toISOString()
        },
        scenario: 'INTERNAL'
      });

      const json = error.toJSON();
      const jsonString = JSON.stringify(json);

      ok(jsonString.length > 0, 'Should stringify without errors');

      const parsed = JSON.parse(jsonString) as Record<string, unknown>;

      strictEqual(parsed.code, 'INTERNAL_ERROR');
      strictEqual(parsed.statusCode, 500);
    });
  });

  void describe('subclassing', () => {
    void it('supports custom error subclasses', () => {
      const error = NetworkError.create('Connection failed');

      ok(error instanceof Error);
      ok(error instanceof ModuleError);
      ok(error instanceof NetworkError);
      strictEqual(error.name, 'NetworkError');
      strictEqual(error.code, 'CONNECTION_ERROR');
      strictEqual(error.statusCode, 503);
      strictEqual(error.retryable, true);
    });

    void it('allows subclass to override defaults', () => {
      const error = NetworkError.create('Connection failed', { retryable: false });

      strictEqual(error.retryable, false);
      strictEqual(error.code, 'CONNECTION_ERROR');
    });

    void it('preserves subclass name in serialization', () => {
      const error = NetworkError.create('Test');
      const json = error.toJSON();

      strictEqual(json.name, 'NetworkError');
      strictEqual(json.code, 'CONNECTION_ERROR');
    });
  });

  void describe('instanceof checks', () => {
    const instanceofScenarios: Array<{ description: string; useSubclass: boolean }> = [
      { description: 'is instance of Error', useSubclass: false },
      { description: 'is instance of ModuleError', useSubclass: false },
      { description: 'subclass is instance of both ModuleError and Error', useSubclass: true }
    ];

    for (const { description, useSubclass } of instanceofScenarios) {
      void it(description, () => {
        if (useSubclass) {
          const error = NetworkError.create('Test');
          ok(error instanceof Error);
          ok(error instanceof ModuleError);
          ok(error instanceof NetworkError);
        } else {
          const error = ModuleError.create('Test', { scenario: 'INTERNAL' });
          ok(error instanceof Error);
          ok(error instanceof ModuleError);
        }
      });
    }
  });

  void describe('captures stack trace', () => {
    void it('has stack trace', () => {
      const error = ModuleError.create('Test error', { scenario: 'INTERNAL' });

      ok(error.stack !== undefined, 'Should have stack trace');
      ok(error.stack.includes('ModuleError'), 'Stack should include error name');
    });
  });
});
