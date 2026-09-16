/** defaultClockSlidingWindowLimiter — exercise the limiter without injecting a clock. */

import { SlidingWindowLimiter } from '@studnicky/resilience/node';
import assert from 'node:assert/strict';

// #region usage
class DefaultClockLimiter extends SlidingWindowLimiter {
  hasNoHookErrors(): boolean {
    const result = this.getHookErrors().length === 0;
    return result;
  }
}

const logLimiter = DefaultClockLimiter.create({ 'algorithm': 'log', 'limit': 1, 'windowMs': 1000 });
logLimiter.consume();
assert.equal(logLimiter.hasNoHookErrors(), true);

const counterLimiter = DefaultClockLimiter.create({ 'algorithm': 'counter', 'limit': 1, 'windowMs': 1000 });
counterLimiter.consume();
assert.equal(counterLimiter.hasNoHookErrors(), true);
// #endregion usage

console.log('defaultClockSlidingWindowLimiter: all assertions passed');
