import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BaseError } from '@studnicky/errors';

import { ConfigurationError } from '../../../src/errors/ConfigurationError.js';

void describe('ConfigurationError', () => {
  void it('is an instance of Error', () => {
    const err = ConfigurationError.create('bad config');
    assert.ok(err instanceof Error);
    assert.ok(err instanceof ConfigurationError);
  });

  void it('is an instance of BaseError', () => {
    const err = ConfigurationError.create('bad config');
    assert.ok(err instanceof BaseError);
  });

  void it('sets the message correctly', () => {
    const err = ConfigurationError.create('maxEvents must be positive');
    assert.strictEqual(err.message, 'maxEvents must be positive');
  });

  void it('sets name to ConfigurationError', () => {
    const err = ConfigurationError.create('test');
    assert.strictEqual(err.name, 'ConfigurationError');
  });

  void it('has a stack trace', () => {
    const err = ConfigurationError.create('test');
    assert.ok(typeof err.stack === 'string');
    assert.ok(err.stack.length > 0);
  });

  void it('has fixed code config.invalid', () => {
    const err = ConfigurationError.create('test');
    assert.strictEqual(err.code, 'config.invalid');
  });

  void it('is not retryable', () => {
    const err = ConfigurationError.create('test');
    assert.strictEqual(err.retryable, false);
  });

  void it('toJSON includes code, message, retryable', () => {
    const err = ConfigurationError.create('bad value');
    const json = err.toJSON();
    assert.strictEqual(json['code'], 'config.invalid');
    assert.strictEqual(json['message'], 'bad value');
  });

  void it('accepts a cause and threads it through the chain', () => {
    const cause = new Error('original');
    const err = ConfigurationError.create('wrapped', cause);
    assert.strictEqual(err.cause, cause);
  });
});
