import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicates } from '@studnicky/types/node';

import { EntityClone } from '../../src/EntityClone.js';

type CloneRecord = {
  array: { label: string }[];
  date: Date;
  map: Map<string, { count: number }>;
  set: Set<{ flag: boolean }>;
};

const onCycle = (): never => {
  throw new Error('cycle callback must not run');
};

void describe('EntityClone.clone', () => {
  void it('returns primitive values unchanged', () => {
    const result = EntityClone.clone(42, onCycle);
    assert.equal(result, 42);
  });

  void it('creates independent object, array, Map, Set, and Date values', () => {
    const sourceArrayEntry = { label: 'original' };
    const sourceMapEntry = { count: 1 };
    const sourceSetEntry = { flag: true };
    const source: CloneRecord = {
      array: [sourceArrayEntry],
      date: new Date(0),
      map: new Map([['entry', sourceMapEntry]]),
      set: new Set([sourceSetEntry])
    };

    const clonedValue = EntityClone.clone(source, onCycle);
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

    assert.deepEqual(cloned.array, [{ label: 'original' }]);
    assert.equal(cloned.date.getTime(), 0);
    assert.deepEqual([...cloned.map.entries()], [['entry', { count: 1 }]]);
    assert.deepEqual([...cloned.set], [{ flag: true }]);
  });

  void it('invokes the cycle callback instead of cloning cyclic input', () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    let callbackCalls = 0;

    assert.throws(() => EntityClone.clone(cyclic, () => {
      callbackCalls += 1;
      throw new Error('cyclic input');
    }), /cyclic input/);
    assert.equal(callbackCalls, 1);
  });

  void it('rejects own-property cycles on Date and RegExp values', () => {
    const date = new Date();
    Reflect.set(date, 'self', date);
    const expression = /cycle/u;
    Reflect.set(expression, 'self', expression);

    for (const value of [date, expression]) {
      let callbackCalls = 0;
      assert.throws(() => EntityClone.clone(value, () => {
        callbackCalls += 1;
        throw new Error('cyclic input');
      }), /cyclic input/);
      assert.equal(callbackCalls, 1);
    }
  });
});
