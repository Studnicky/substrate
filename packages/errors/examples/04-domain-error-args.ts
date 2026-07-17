/** 04-domain-error-args — Leaf error class built with DomainErrorArgs.build(). Run: npx tsx packages/errors/examples/04-domain-error-args.ts */

import assert from 'node:assert/strict';

import type { BaseErrorArgumentsType } from '../src/index.js';

// #region usage
import { BaseError, DomainErrorArgs } from '../src/index.js';

abstract class RateLimitError extends BaseError {
  protected constructor(args: Readonly<BaseErrorArgumentsType>) {
    super(args);
  }
}

// json-schema-uninexpressible: minimal demo-only fields type for a runnable doc example, not a shipped domain shape
type RateLimitExceededFieldsType = {
  'limit': number;
  'route': string;
};

class RateLimitExceededError extends RateLimitError {
  readonly limit!: number;
  readonly route!: string;

  constructor(route: string, limit: number) {
    const fields: RateLimitExceededFieldsType = { 'limit': limit, 'route': route };
    super(DomainErrorArgs.build(fields, {
      'code': 'rateLimit.exceeded',
      'message': (f) => { const result = `Rate limit of ${String(f.limit)} exceeded for "${f.route}"`; return result; },
      'retryable': true
    }));
    Object.assign(this, fields);
  }
}

const err = new RateLimitExceededError('/api/orders', 100);

console.log('RateLimitExceededError.code:', err.code);
console.log('RateLimitExceededError.route:', err.route);
console.log('RateLimitExceededError.limit:', err.limit);
console.log('RateLimitExceededError.retryable:', err.retryable);
console.log('RateLimitExceededError.message:', err.message);
// #endregion usage

assert.ok(err instanceof RateLimitExceededError, 'instanceof RateLimitExceededError');
assert.ok(err instanceof RateLimitError, 'instanceof RateLimitError');
assert.ok(err instanceof BaseError, 'instanceof BaseError');
assert.strictEqual(err.name, 'RateLimitExceededError', 'name = class name');
assert.strictEqual(err.code, 'rateLimit.exceeded');
assert.strictEqual(err.route, '/api/orders');
assert.strictEqual(err.limit, 100);
assert.strictEqual(err.retryable, true);
assert.strictEqual(err.message, 'Rate limit of 100 exceeded for "/api/orders"');

console.log('04-domain-error-args: all assertions passed');
