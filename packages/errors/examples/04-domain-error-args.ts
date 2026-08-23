/** 04-domain-error-args — Leaf error class built with DomainErrorArgumentList.build(). Run: npx tsx packages/errors/examples/04-domain-error-args.ts */

import assert from 'node:assert/strict';

import type { BaseErrorArgumentsInterface } from '../src/index.js';

// #region usage
import { BaseError, DomainErrorArgumentList } from '../src/index.js';

abstract class RateLimitError extends BaseError {
  protected constructor(argumentList: Readonly<BaseErrorArgumentsInterface>) {
    super(argumentList);
  }
}

class RateLimitExceededError extends RateLimitError {
  readonly limit!: number;
  readonly route!: string;

  constructor(route: string, limit: number) {
    const fields = { 'limit': limit, 'route': route };
    super(DomainErrorArgumentList.build(fields, {
      'code': 'rateLimit.exceeded',
      'message': (messageFields): string => {
        const result = `Rate limit of ${String(messageFields.limit)} exceeded for "${messageFields.route}"`;
        return result;
      },
      'retryable': true
    }));
    this.limit = limit;
    this.route = route;
  }
}

const error = new RateLimitExceededError('/api/orders', 100);

console.log('RateLimitExceededError.code:', error.code);
console.log('RateLimitExceededError.route:', error.route);
console.log('RateLimitExceededError.limit:', error.limit);
console.log('RateLimitExceededError.retryable:', error.retryable);
console.log('RateLimitExceededError.message:', error.message);
// #endregion usage

assert.ok(error instanceof RateLimitExceededError, 'instanceof RateLimitExceededError');
assert.ok(error instanceof RateLimitError, 'instanceof RateLimitError');
assert.ok(error instanceof BaseError, 'instanceof BaseError');
assert.strictEqual(error.name, 'RateLimitExceededError', 'name = class name');
assert.strictEqual(error.code, 'rateLimit.exceeded');
assert.strictEqual(error.route, '/api/orders');
assert.strictEqual(error.limit, 100);
assert.strictEqual(error.retryable, true);
assert.strictEqual(error.message, 'Rate limit of 100 exceeded for "/api/orders"');

console.log('04-domain-error-args: all assertions passed');
