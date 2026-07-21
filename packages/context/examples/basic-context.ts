/** basic-context — complete create → initialize → execute → terminate lifecycle. Run: npx tsx packages/context/examples/basic-context.ts */

import assert from 'node:assert/strict';

// #region usage
import { Context } from '../src/index.js';

const context = Context.create({ 'name': 'request' });

const scope = context.initialize({ 'requestId': 'req-001' });

scope.execute(() => {
  context.set('statusCode', 200);
  context.set('userId', 'u-42');

  console.log(`requestId: ${context.get('requestId')}`);
  console.log(`statusCode: ${context.get('statusCode')}`);
  console.log(`isActive inside execute: ${context.isActive()}`);
});

const snapshot = scope.terminate();

console.log('snapshot:', snapshot);
console.log(`isActive after terminate: ${context.isActive()}`);
// #endregion usage

assert.equal(snapshot.requestId, 'req-001');
assert.equal(snapshot.statusCode, 200);
assert.equal(snapshot.userId, 'u-42');
assert.equal(context.isActive(), false);

console.log('basic-context: all assertions passed');
