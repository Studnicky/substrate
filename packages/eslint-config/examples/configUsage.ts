/** configUsage — browser-safe platform-call policy smoke test. Run: npx tsx examples/configUsage.ts */

import assert from 'node:assert/strict';

// #region usage
import { PlatformCallDefaults } from '../src/browser/index.js';

const entries = PlatformCallDefaults.build();
const fetchPolicy = entries.find((entry) => {
  const result = entry.kind === 'call' && entry.member === 'fetch' && entry.owner === '';

  return result;
});

console.log(`Platform call policy entries: ${entries.length}`);
console.log('Fetch policy:', fetchPolicy);
// #endregion usage

assert.ok(entries.length > 0, 'platform call policy defaults must be non-empty');
assert.deepEqual(fetchPolicy, { 'kind': 'call', 'member': 'fetch', 'owner': '', 'safeWhenLiteral': 'never' });

console.log('configUsage: all assertions passed');
