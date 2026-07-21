/** pickDefined — assembling an options object from required and optional values. Run: npx tsx packages/types/examples/pickDefined.ts */

import assert from 'node:assert/strict';

// #region usage
import { PickDefined } from '../src/index.js';

const withClock = PickDefined.from({
  'burstSize': 15,
  'clock': () => { const result = Date.now(); return result; },
  'deadlineMs': undefined,
  'requestsPerSecond': 5
});

const withoutClock = PickDefined.from({
  'burstSize': 20,
  'clock': undefined,
  'deadlineMs': undefined,
  'requestsPerSecond': 10
});

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
