/** entityCompiler — compile a schema once, then intake and create typed values. Run: npx tsx packages/entity/examples/entityCompiler.ts */

import { EntityCompiler, SchemaIntakeError } from '@studnicky/entity/node';
import assert from 'node:assert/strict';

interface SubscriberInterface {
  readonly 'email': string;
  readonly 'name': string;
}

const SubscriberSchema = {
  '$id': 'https://studnicky.dev/examples/subscriber',
  'additionalProperties': false,
  'properties': {
    'email': { 'format': 'email', 'type': 'string' },
    'name': { 'type': 'string' }
  },
  'required': ['email', 'name'],
  'type': 'object'
};

// #region usage
const validate = EntityCompiler.compile<SubscriberInterface>(SubscriberSchema);
const intake = EntityCompiler.compileIntake<SubscriberInterface>(SubscriberSchema);
const create = EntityCompiler.compileCreate<SubscriberInterface>(SubscriberSchema);

const subscriber = intake({ 'email': 'ada@example.test', 'name': 'Ada' });
console.log('Boundary input:', subscriber);
assert.equal(validate(subscriber), true);

assert.throws(() => {
  intake({ 'email': 'ada@example.test', 'name': 'Ada', 'unexpected': true });
}, SchemaIntakeError);
console.log('Boundary input: undeclared fields rejected');

assert.throws(() => {
  create({ 'email': 'ada@example.test' });
}, SchemaIntakeError);
console.log('Owned-object validation: incomplete objects rejected');
// #endregion usage

console.log('entityCompiler: all assertions passed');
