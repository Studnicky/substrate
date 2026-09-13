/** entityCompiler — parse external input, enforce owned-object shape, and reject cycles. Run: npx tsx packages/entity/examples/entityCompiler.ts */

import { BoundaryCycleGuard, EntityCompiler } from '@studnicky/entity/node';
import assert from 'node:assert/strict';

interface SubscriberInterface {
  readonly 'email': string;
  readonly 'name': string;
}

class SubscriberExample {
  static isRecord(value: unknown): value is Record<string, unknown> {
    const result = typeof value === 'object' && value !== null && !Array.isArray(value);
    return result;
  }

  static isUnknownProperty(key: string): boolean {
    const result = key !== 'email' && key !== 'name';
    return result;
  }

  static parse(candidate: unknown, options: EntityCompiler.ParseOptionsInterface): SubscriberInterface | undefined {
    if (!SubscriberExample.isRecord(candidate) || typeof candidate.email !== 'string' || typeof candidate.name !== 'string') {
      return undefined;
    }

    const hasUnknownProperty = Object.keys(candidate).some(SubscriberExample.isUnknownProperty);
    if (options.rejectUnknownProperties && hasUnknownProperty) {
      return undefined;
    }

    const result = { 'email': candidate.email, 'name': candidate.name };
    return result;
  }

  static rejectInvalidCandidate(entityName: string, reason: string): never {
    throw new TypeError(`${entityName} ${reason}`);
  }
}

// #region usage
const { create, intake } = EntityCompiler.compile(SubscriberExample.parse, 'Subscriber', {
  'clone': (value) => {
    const result = structuredClone(value);
    return result;
  },
  'onInvalidCandidate': SubscriberExample.rejectInvalidCandidate
});

const subscriber = intake({ 'email': 'ada@example.test', 'name': 'Ada' });
console.log('Boundary input:', subscriber);

assert.throws(() => {
  intake({ 'email': 'ada@example.test', 'name': 'Ada', 'unexpected': true });
}, TypeError);
console.log('Boundary input: undeclared fields rejected');

assert.throws(() => {
  create({});
}, TypeError);
console.log('Owned-object validation: incomplete objects rejected');

const cyclic: { 'parent'?: unknown } = {};
cyclic.parent = cyclic;

console.log('Acyclic value:', BoundaryCycleGuard.hasCycle(subscriber));
console.log('Cyclic value:', BoundaryCycleGuard.hasCycle(cyclic));

assert.equal(BoundaryCycleGuard.hasCycle(subscriber), false);
assert.equal(BoundaryCycleGuard.hasCycle(cyclic), true);
// #endregion usage

console.log('entityCompiler: all assertions passed');
