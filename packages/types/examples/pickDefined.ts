/** pickDefined — assembling an options object from required and optional builder fields. Run: npx tsx packages/types/examples/pickDefined.ts */

import assert from 'node:assert/strict';

// #region usage
import { PickDefined } from '../src/index.js';

// A function-typed member ('clock') is a genuine contract signal, not a pure
// data shape — matches the TokenBucketOptionsInterface precedent.
interface RateLimiterOptionsInterface {
  'burstSize': number;
  'clock'?: () => number;
  'deadlineMs'?: number;
  'requestsPerSecond': number;
}

class RateLimiterBuilder {
  private requestsPerSecond?: number;
  private burstSize?: number;
  private clock?: () => number;
  private deadlineMs?: number;

  public withRequestsPerSecond(value: number): this {
    this.requestsPerSecond = value;
    return this;
  }

  public withBurstSize(value: number): this {
    this.burstSize = value;
    return this;
  }

  public withClock(value: () => number): this {
    this.clock = value;
    return this;
  }

  public build(): RateLimiterOptionsInterface {
    const result = PickDefined.from({
      'burstSize': this.burstSize ?? 20,
      'clock': this.clock,
      'deadlineMs': this.deadlineMs,
      'requestsPerSecond': this.requestsPerSecond ?? 10
    });
    return result;
  }
}

const withClock = new RateLimiterBuilder()
  .withRequestsPerSecond(5)
  .withBurstSize(15)
  .withClock(() => { const result = Date.now(); return result; })
  .build();

const withoutClock = new RateLimiterBuilder().build();

console.log('withClock:', { ...withClock, 'clock': typeof withClock.clock });
console.log('withoutClock:', withoutClock);
// #endregion usage

assert.equal(withClock.requestsPerSecond, 5);
assert.equal(withClock.burstSize, 15);
assert.equal(typeof withClock.clock, 'function');
assert.equal('deadlineMs' in withClock, false, 'unset optional field is stripped');

assert.deepEqual(withoutClock, { 'burstSize': 20, 'requestsPerSecond': 10 });
assert.equal('clock' in withoutClock, false, 'unset optional field is stripped');
assert.equal('deadlineMs' in withoutClock, false, 'unset optional field is stripped');

console.log('pickDefined: all assertions passed');
