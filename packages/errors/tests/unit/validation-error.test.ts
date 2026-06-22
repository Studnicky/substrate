/**
 * ValidationError Unit Tests
 */

import {
  ok,
  strictEqual
} from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { BaseError } from '../../src/errors/BaseError.js';
import { ValidationError } from '../../src/errors/ValidationError.js';

void describe('ValidationError', () => {
  void describe('construction', () => {
    void it('is an instance of BaseError and Error', () => {
      const err = ValidationError.create({ message: 'bad input', path: '/field' });
      ok(err instanceof Error);
      ok(err instanceof BaseError);
      ok(err instanceof ValidationError);
    });

    void it('has code errors.validationFailed', () => {
      const err = ValidationError.create({ message: 'bad input', path: '/field' });
      strictEqual(err.code, 'errors.validationFailed');
    });

    void it('is not retryable', () => {
      const err = ValidationError.create({ message: 'bad input', path: '/field' });
      strictEqual(err.retryable, false);
    });

    void it('formats message with path', () => {
      const err = ValidationError.create({ message: 'must be string', path: '/user/name' });
      ok(err.message.includes('/user/name'), 'message should include path');
      ok(err.message.includes('must be string'), 'message should include description');
    });

    void it('stores correlationId when provided', () => {
      const err = ValidationError.create({
        correlationId: 'trace-abc',
        message: 'bad input',
        path: '/x'
      });
      strictEqual(err.correlationId, 'trace-abc');
    });

    void it('stores violations when provided', () => {
      const violations = [
        { message: 'required', path: '/a' },
        { message: 'too short', path: '/b' }
      ];
      const err = ValidationError.create({ message: 'multiple', path: '/root', violations });
      ok(err.violations !== undefined);
      strictEqual(err.violations.length, 2);
    });

    void it('leaves violations undefined when not provided', () => {
      const err = ValidationError.create({ message: 'bad', path: '/x' });
      strictEqual(err.violations, undefined);
    });
  });

  void describe('toUserMessage()', () => {
    void it('returns formatted message with violations', () => {
      const err = ValidationError.create({
        message: 'failed',
        path: '/root',
        violations: [
          { message: 'required', path: '/a' },
          { message: 'too long', path: '/b' }
        ]
      });
      const msg = err.toUserMessage();
      ok(msg.includes('/a'), 'should include violation paths');
      ok(msg.includes('/b'), 'should include violation paths');
      ok(msg.includes('required'), 'should include violation messages');
    });

    void it('returns plain message when no violations', () => {
      const err = ValidationError.create({ message: 'bad input', path: '/field' });
      strictEqual(err.toUserMessage(), err.message);
    });
  });

  void describe('toJSON()', () => {
    void it('serializes with code and message', () => {
      const err = ValidationError.create({ message: 'invalid', path: '/x' });
      const json = err.toJSON() as Record<string, unknown>;
      strictEqual(json['code'], 'errors.validationFailed');
      ok(typeof json['message'] === 'string');
    });

    void it('JSON.stringify roundtrip works', () => {
      const err = ValidationError.create({ message: 'bad', path: '/y' });
      const parsed = JSON.parse(JSON.stringify(err.toJSON())) as Record<string, unknown>;
      strictEqual(parsed['code'], 'errors.validationFailed');
    });

    void it('includes violations in JSON when provided', () => {
      const violations = [{ message: 'required', path: '/a' }];
      const err = ValidationError.create({ message: 'invalid', path: '/x', violations });
      const json = err.toJSON() as Record<string, unknown>;
      ok('violations' in json, 'toJSON should include violations');
    });

    void it('excludes violations from JSON when absent', () => {
      const err = ValidationError.create({ message: 'invalid', path: '/x' });
      const json = err.toJSON() as Record<string, unknown>;
      strictEqual('violations' in json, false, 'toJSON should not include violations when absent');
    });
  });
});
