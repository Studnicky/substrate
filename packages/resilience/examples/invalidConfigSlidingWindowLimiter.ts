/** invalidConfigSlidingWindowLimiter — exercise the configuration error path from the public example surface. */

import { SlidingWindowLimiter, SlidingWindowLimiterConfigError } from '@studnicky/resilience/node';
import assert from 'node:assert/strict';

// #region usage
assert.throws(() => {
  SlidingWindowLimiter.create({ 'algorithm': 'log', 'limit': 0, 'windowMs': 1000 });
}, SlidingWindowLimiterConfigError);
// #endregion usage

console.log('invalidConfigSlidingWindowLimiter: all assertions passed');
