import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EntityClone } from '../../src/EntityClone.js';
import { EntityCloneError } from '../../src/EntityCloneError.js';

class CloneFixtures {
  public static onCycle(): never {
    throw new EntityCloneError('cycle callback must not run');
  }

  public static assertCycleRejected(value: unknown): void {
    let callbackCalls = 0;
    assert.throws(() => {
      const cloned = EntityClone.clone(value, () => {
        callbackCalls += 1;
        throw new EntityCloneError('cyclic input');
      });
      return cloned;
    }, { 'message': 'cyclic input' });
    assert.equal(callbackCalls, 1);
  }
}

void describe('EntityClone.clone', () => {
  void it('returns primitive values unchanged', () => {
    const result = EntityClone.clone(42, CloneFixtures.onCycle);
    assert.equal(result, 42);
  });

  void it('creates independent object, array, Map, Set, and Date values', () => {
    const sourceArrayEntry = { 'label': 'original' };
    const sourceMapEntry = { 'count': 1 };
    const sourceSetEntry = { 'flag': true };
    const source = {
      'array': [sourceArrayEntry],
      'date': new Date(0),
      'map': new Map([['entry', sourceMapEntry]]),
      'set': new Set([sourceSetEntry])
    };

    const clonedValue = EntityClone.clone(source, CloneFixtures.onCycle);
    assert.ok(Predicates.isObject(clonedValue));
    const cloned = clonedValue;
    assert.ok(Array.isArray(cloned.array));
    assert.ok(cloned.date instanceof Date);
    assert.ok(cloned.map instanceof Map);
    assert.ok(cloned.set instanceof Set);
    assert.notStrictEqual(cloned, source);
    assert.notStrictEqual(cloned.array, source.array);
    assert.notStrictEqual(cloned.date, source.date);
    assert.notStrictEqual(cloned.map, source.map);
    assert.notStrictEqual(cloned.set, source.set);

    sourceArrayEntry.label = 'changed';
    source.date.setTime(1);
    sourceMapEntry.count = 2;
    sourceSetEntry.flag = false;

    assert.deepEqual(cloned.array, [{ 'label': 'original' }]);
    assert.equal(cloned.date.getTime(), 0);
    assert.deepEqual([...cloned.map.entries()], [['entry', { 'count': 1 }]]);
    assert.deepEqual([...cloned.set], [{ 'flag': true }]);
  });

  void it('invokes the cycle callback instead of cloning cyclic input', () => {
    const cyclic: { 'self'?: unknown } = {};
    cyclic.self = cyclic;

    CloneFixtures.assertCycleRejected(cyclic);
  });

  void it('rejects own-property cycles on Date and RegExp values', () => {
    const date = new Date();
    Reflect.set(date, 'self', date);
    const built: unknown = Reflect.construct(RegExp, ['cycle', 'u']);
    assert.ok(built instanceof RegExp);
    const expression = built;
    Reflect.set(expression, 'self', expression);

    CloneFixtures.assertCycleRejected(date);
    CloneFixtures.assertCycleRejected(expression);
  });
});
