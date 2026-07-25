/** invalidConfigSlidingWindowLimiter — exercise the configuration error path from the public example surface. */

import assert from 'node:assert/strict';

import { SlidingWindowLimiter, SlidingWindowLimiterConfigError } from '../src/index.js';

// #region usage
assert.throws(() => {
  SlidingWindowLimiter.create({ 'algorithm': 'log', 'limit': 0, 'windowMs': 1000 });
}, SlidingWindowLimiterConfigError);
// #endregion usage

console.log('invalidConfigSlidingWindowLimiter: all assertions passed');
