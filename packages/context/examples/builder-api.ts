/** builder-api — Context.builder() fluent API and tryGet vs get behaviour. Run: npx tsx packages/context/examples/builder-api.ts */

import assert from 'node:assert/strict';

// #region usage
import { Context, ContextError } from '../src/index.js';

// Build via the fluent builder
const context = Context.builder().name('session').build();

const scope = context.initialize({ 'userId': 'u-42' });

scope.execute(() => {
  context.set('role', 'admin');

  console.log(`userId: ${context.get<string>('userId')}`);
  console.log(`role:   ${context.get<string>('role')}`);
});

const snapshot = scope.terminate();

console.log('snapshot:', snapshot);

// --- tryGet vs get ---

const context2 = Context.create({ 'name': 'demo' });
const scope2 = context2.initialize();

scope2.execute(() => {
  context2.set('present', 'yes');

  // tryGet never throws — returns undefined for missing keys
  const missing = context2.tryGet<string>('absent');
  console.log('tryGet for absent key returned:', missing);

  // get throws ContextError for missing keys
  try {
    context2.get<string>('absent');
  } catch (err) {
    console.log('get for absent key threw:', err instanceof ContextError ? 'ContextError' : String(err));
  }

  // get works normally for present keys
  console.log('get for present key returned:', context2.get<string>('present'));
});

scope2.terminate();
// #endregion usage

assert.equal(snapshot.userId, 'u-42');
assert.equal(snapshot.role, 'admin');

const context3 = Context.create({ 'name': 'assert-demo' });
const scope3 = context3.initialize();

scope3.execute(() => {
  context3.set('present', 'yes');

  assert.equal(context3.tryGet<string>('absent'), undefined);
  assert.throws(() => { context3.get<string>('absent'); }, ContextError);
  assert.equal(context3.get<string>('present'), 'yes');
});

scope3.terminate();

console.log('builder-api: all assertions passed');
