/**
 * Basic Context lifecycle example.
 *
 * Shows the complete create → initialize → execute → terminate flow using
 * Context.create(). Values set inside execute() are captured in the snapshot
 * returned by terminate().
 *
 * Run:
 *   npx tsx packages/context/examples/basic-context.ts
 */

import assert from 'node:assert/strict';

import { Context } from '../src/index.js';

const context = Context.create({ name: 'request' });

const scope = context.initialize({ requestId: 'req-001' });

await scope.execute(async () => {
  context.set('statusCode', 200);
  context.set('userId', 'u-42');

  const requestId = context.get<string>('requestId');
  const statusCode = context.get<number>('statusCode');

  console.log(`requestId: ${requestId}`);
  console.log(`statusCode: ${statusCode}`);

  assert.equal(requestId, 'req-001');
  assert.equal(statusCode, 200);
  assert.ok(context.isActive());
});

const snapshot = scope.terminate();

console.log('snapshot:', snapshot);

assert.equal(snapshot['requestId'], 'req-001');
assert.equal(snapshot['statusCode'], 200);
assert.equal(snapshot['userId'], 'u-42');

// Context is no longer active after terminate
assert.equal(context.isActive(), false);

console.log('basic-context: all assertions passed');
