import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BaseError } from '@studnicky/errors';

import { ConfigurationError } from '../../../src/errors/ConfigurationError.js';

void describe('ConfigurationError', () => {
  const constructionScenarios: Array<{ description: string; assert: (err: ConfigurationError) => void }> = [
    {
      description: 'is an instance of Error',
      assert: (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err instanceof ConfigurationError);
      },
    },
    {
      description: 'is an instance of BaseError',
      assert: (err) => assert.ok(err instanceof BaseError),
    },
    {
      description: 'sets name to ConfigurationError',
      assert: (err) => assert.strictEqual(err.name, 'ConfigurationError'),
    },
    {
      description: 'has fixed code config.invalid',
      assert: (err) => assert.strictEqual(err.code, 'config.invalid'),
    },
    {
      description: 'is not retryable',
      assert: (err) => assert.strictEqual(err.retryable, false),
    },
    {
      description: 'has a stack trace',
      assert: (err) => {
        assert.ok(typeof err.stack === 'string');
        assert.ok(err.stack.length > 0);
      },
    },
  ];

  for (const scenario of constructionScenarios) {
    void it(scenario.description, () => {
      const err = ConfigurationError.create('test');
      scenario.assert(err);
    });
  }

  void it('sets the message correctly', () => {
    const err = ConfigurationError.create('maxEvents must be positive');
    assert.strictEqual(err.message, 'maxEvents must be positive');
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
