/**
 * KeyedRateLimiterBuilder Unit Tests
 */

import { throws } from 'node:assert/strict';
import { it } from 'node:test';

import { KeyedRateLimiter, KeyedRateLimiterConfigError } from '../../../src/index.js';

it('throws KeyedRateLimiterConfigError when requestsPerSecond is missing', () => {
  throws(() => {
    KeyedRateLimiter.builder().withBurstSize(5).build();
  }, KeyedRateLimiterConfigError);
});

it('throws KeyedRateLimiterConfigError when burstSize is missing', () => {
  throws(() => {
    KeyedRateLimiter.builder().withRequestsPerSecond(5).build();
  }, KeyedRateLimiterConfigError);
});
