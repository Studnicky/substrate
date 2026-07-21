/** Key capacity behavior. */

import { deepStrictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { KeyedRateLimiter } from '../../../src/index.js';

class TrackingLimiter extends KeyedRateLimiter {
  readonly evicted: string[] = [];

  protected override onKeyEvicted(key: string): void {
    this.evicted.push(key);
  }
}

it('create() applies maxKeys while composing the limiter', () => {
  const limiter = TrackingLimiter.create({
    'burstSize': 5,
    'maxKeys': 3,
    'requestsPerSecond': 10
  });

  limiter.consume('user-a');
  limiter.consume('user-b');
  limiter.consume('user-c');
  limiter.consume('user-d');

  deepStrictEqual(limiter.evicted, ['user-a']);
});
