/**
 * ContextBuilder fluent API example.
 *
 * Shows constructing a Context via Context.builder().name(...).build(), then
 * demonstrates the difference between tryGet (never throws, returns undefined
 * for absent keys) and get (throws ContextError if key is absent).
 *
 * Run:
 *   npx tsx packages/context/examples/builder-api.ts
 */

import assert from 'node:assert/strict';

import { Context, ContextError } from '../src/index.js';

// Build via the fluent builder
const context = Context.builder().name('session').build();

const scope = context.initialize({ userId: 'u-42' });

scope.execute(() => {
  context.set('role', 'admin');

  console.log(`userId: ${context.get<string>('userId')}`);
  console.log(`role:   ${context.get<string>('role')}`);
});

const snapshot = scope.terminate();

console.log('snapshot:', snapshot);

assert.equal(snapshot['userId'], 'u-42');
assert.equal(snapshot['role'], 'admin');

// --- tryGet vs get ---

const context2 = Context.create({ name: 'demo' });
const scope2 = context2.initialize();

scope2.execute(() => {
  context2.set('present', 'yes');

  // tryGet never throws — returns undefined for missing keys
  const missing = context2.tryGet<string>('absent');
  assert.equal(missing, undefined);
  console.log('tryGet for absent key returned:', missing);

  // get throws for missing keys
  assert.throws(
    () => { context2.get<string>('absent'); },
    ContextError
  );
  console.log('get for absent key threw ContextError as expected');

  // get works normally for present keys
  const present = context2.get<string>('present');
  assert.equal(present, 'yes');
  console.log('get for present key returned:', present);
});

scope2.terminate();

console.log('builder-api: all assertions passed');
