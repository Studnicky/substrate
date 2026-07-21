/**
 * BaseError Unit Tests
 *
 * Tests for:
 * - Construction and property write order
 * - Cause-chain traversal (static methods)
 * - toJSON() recursive serialization with depth cap
 * - toUserMessage() default and override
 * - toSerializedError() precise return type
 * - retryable flag
 * - correlationId
 * - metadata / context
 */

import {
  deepStrictEqual,
  ok,
  strictEqual
} from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { JSONSchema7Type } from 'json-schema';

import { Guard } from '@studnicky/types';

import { CAUSE_CHAIN_DEPTH_LIMIT, CAUSE_DEPTH_SENTINEL } from '../../src/constants/index.js';
import { BaseError } from '../../src/errors/BaseError.js';

// Concrete test subclass — registers its code at construction time.
class TestError extends BaseError {
  public constructor(message: string, options?: Partial<{
    cause: unknown;
    code: string;
    correlationId: string;
    metadata: Record<string, JSONSchema7Type>;
    retryable: boolean;
  }>) {
    super({
      cause: options?.cause,
      code: options?.code ?? 'test.generic',
      correlationId: options?.correlationId,
      message,
      metadata: options?.metadata,
      retryable: options?.retryable ?? false
    });
  }
}

class RetryableError extends BaseError {
  public constructor(message: string) {
    super({ code: 'test.retryable', message, retryable: true });
  }
}

void describe('BaseError', () => {
  void describe('construction', () => {
    void it('sets name to the concrete subclass name', () => {
      const err = new TestError('hello');
      strictEqual(err.name, 'TestError');
    });

    void it('sets message correctly', () => {
      const err = new TestError('test message');
      strictEqual(err.message, 'test message');
    });

    void it('sets code correctly', () => {
      const err = new TestError('msg');
      strictEqual(err.code, 'test.generic');
    });

    void it('sets retryable to false by default', () => {
      const err = new TestError('msg');
      strictEqual(err.retryable, false);
    });

    void it('sets retryable to true when specified', () => {
      const err = new RetryableError('msg');
      strictEqual(err.retryable, true);
    });

    void it('sets timestamp within reasonable range', () => {
      const before = Date.now();
      const err = new TestError('msg');
      const after = Date.now();
      ok(err.timestamp >= before && err.timestamp <= after, 'timestamp should be current');
    });

    void it('sets correlationId when provided', () => {
      const err = new TestError('msg', { correlationId: 'abc-123' });
      strictEqual(err.correlationId, 'abc-123');
    });

    void it('leaves correlationId undefined when not provided', () => {
      const err = new TestError('msg');
      strictEqual(err.correlationId, undefined);
    });

    void it('freezes metadata and makes it available', () => {
      const err = new TestError('msg', { metadata: { key: 'value' } });
      ok(err.metadata !== undefined);
      deepStrictEqual(err.metadata, { key: 'value' });
      ok(Object.isFrozen(err.metadata));
    });

    void it('leaves metadata undefined when not provided', () => {
      const err = new TestError('msg');
      strictEqual(err.metadata, undefined);
    });

    void it('stores cause in the Error.cause chain', () => {
      const cause = new Error('inner');
      const err = new TestError('outer', { cause });
      strictEqual(err.cause, cause);
    });

    void it('is instanceof Error and instanceof BaseError', () => {
      const err = new TestError('msg');
      ok(err instanceof Error);
      ok(err instanceof BaseError);
    });
  });

  void describe('toUserMessage()', () => {
    void it('returns message by default', () => {
      const err = new TestError('User-facing message');
      strictEqual(err.toUserMessage(), 'User-facing message');
    });
  });

  void describe('toJSON()', () => {
    void it('returns all required fields', () => {
      const err = new TestError('msg', { correlationId: 'cid-1', metadata: { a: 1 } });
      const json = err.toJSON();
      ok('code' in json);
      ok('message' in json);
      ok('timestamp' in json);
      ok('correlationId' in json);
      ok('cause' in json);
    });

    void it('serializes code and message', () => {
      const err = new TestError('serialize me');
      const json = err.toJSON();
      strictEqual(json.code, 'test.generic');
      strictEqual(json.message, 'serialize me');
    });

    void it('includes correlationId as null when absent', () => {
      const err = new TestError('msg');
      const json = err.toJSON();
      strictEqual(json.correlationId, null);
    });

    void it('includes correlationId value when present', () => {
      const err = new TestError('msg', { correlationId: 'trace-xyz' });
      const json = err.toJSON();
      strictEqual(json.correlationId, 'trace-xyz');
    });

    void it('serializes cause chain recursively', () => {
      const root = new TestError('root');
      const top = new TestError('top', { cause: root });
      const json = top.toJSON();
      const cause = json.cause;
      ok(Guard.isObject(cause));
      strictEqual(cause.code, 'test.generic');
      strictEqual(cause.message, 'root');
      strictEqual(cause.cause, null);
    });

    void it('uses sentinel string when chain exceeds depth limit', () => {
      // Build a chain exactly at the limit + 1 deep.
      let current: BaseError = new TestError('depth-0');
      for (let i = 1; i <= CAUSE_CHAIN_DEPTH_LIMIT + 1; i++) {
        current = new TestError(`depth-${i}`, { cause: current });
      }
      const json = current.toJSON();
      // Walk the serialized chain to find the sentinel.
      let node: unknown = json;
      let found = false;
      while (node !== null && node !== undefined) {
        if (!Guard.isObject(node)) { break; }
        if (typeof node.cause === 'string' && node.cause === CAUSE_DEPTH_SENTINEL) {
          found = true;
          break;
        }
        node = node.cause;
      }
      ok(found, 'Should find cause depth sentinel in serialized chain');
    });

    void it('serializes a native Error cause with code native.error', () => {
      const native = new Error('native cause');
      const err = new TestError('wrapper', { cause: native });
      const json = err.toJSON();
      const cause = json.cause;
      ok(Guard.isObject(cause));
      strictEqual(cause.code, 'native.error');
      strictEqual(cause.message, 'native cause');
    });

    void it('serializes a primitive cause with code native.primitive', () => {
      const err = new TestError('wrapper', { cause: 'string cause' });
      const json = err.toJSON();
      const cause = json.cause;
      ok(Guard.isObject(cause));
      strictEqual(cause.code, 'native.primitive');
      strictEqual(cause.message, 'string cause');
    });

    void it('produces JSON-serializable output (JSON.stringify roundtrip)', () => {
      const err = new TestError('serialize', {
        correlationId: 'cid',
        metadata: { n: 42 }
      });
      const json = err.toJSON();
      const roundtrip: unknown = JSON.parse(JSON.stringify(json));
      ok(Guard.isObject(roundtrip));
      strictEqual(roundtrip['message'], 'serialize');
      strictEqual(roundtrip['code'], 'test.generic');
    });
  });

  void describe('toSerializedError()', () => {
    void it('returns canonical JSON object data', () => {
      const err = new TestError('typed serial');
      const serial = err.toSerializedError();
      strictEqual(typeof serial.code, 'string');
      strictEqual(typeof serial.message, 'string');
      strictEqual(typeof serial.timestamp, 'number');
      strictEqual(serial.cause, null);
    });
  });

  void describe('static findCauseOfType()', () => {
    void it('finds matching type in chain', () => {
      const inner = new RetryableError('inner');
      const outer = new TestError('outer', { cause: inner });
      const found = BaseError.findCauseOfType(outer, RetryableError);
      strictEqual(found, inner);
    });

    void it('returns undefined when type not in chain', () => {
      const err = new TestError('no match');
      const found = BaseError.findCauseOfType(err, RetryableError);
      strictEqual(found, undefined);
    });

    void it('finds top-level error when it is the matching type', () => {
      const err = new RetryableError('top is match');
      const found = BaseError.findCauseOfType(err, RetryableError);
      strictEqual(found, err);
    });
  });

  void describe('static hasCauseOfType()', () => {
    void it('returns true when type is in chain', () => {
      const inner = new RetryableError('inner');
      const outer = new TestError('outer', { cause: inner });
      ok(BaseError.hasCauseOfType(outer, RetryableError));
    });

    void it('returns false when type not in chain', () => {
      const err = new TestError('no match');
      strictEqual(BaseError.hasCauseOfType(err, RetryableError), false);
    });
  });

  void describe('static getCauseChain()', () => {
    void it('returns single-element array for no causes', () => {
      const err = new TestError('solo');
      const chain = BaseError.getCauseChain(err);
      strictEqual(chain.length, 1);
      strictEqual(chain[0], err);
    });

    void it('returns full chain in order', () => {
      const root = new RetryableError('root');
      const top = new TestError('top', { cause: root });
      const chain = BaseError.getCauseChain(top);
      strictEqual(chain.length, 2);
      strictEqual(chain[0], top);
      strictEqual(chain[1], root);
    });

    void it('respects CAUSE_CHAIN_DEPTH_LIMIT', () => {
      let current: BaseError = new TestError('depth-0');
      for (let i = 1; i <= CAUSE_CHAIN_DEPTH_LIMIT + 5; i++) {
        current = new TestError(`depth-${i}`, { cause: current });
      }
      const chain = BaseError.getCauseChain(current);
      ok(chain.length <= CAUSE_CHAIN_DEPTH_LIMIT, 'Chain should not exceed depth limit');
    });
  });

  void describe('static toMessage()', () => {
    const toMessageScenarios: Array<{ description: string; input: unknown; expected: string }> = [
      { description: 'returns message from Error instance', expected: 'error message', input: new Error('error message') },
      { description: 'converts non-Error string to string', expected: 'plain string', input: 'plain string' },
      { description: 'converts non-Error number to string', expected: '42', input: 42 }
    ];

    for (const { description, input, expected } of toMessageScenarios) {
      void it(description, () => {
        strictEqual(BaseError.toMessage(input), expected);
      });
    }
  });
});
