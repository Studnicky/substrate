import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BoundaryCycleGuard } from '../../src/BoundaryCycleGuard.js';

void describe('BoundaryCycleGuard.hasCycle', () => {
  void it('reports false for primitives', () => {
    assert.equal(BoundaryCycleGuard.hasCycle(null), false);
    assert.equal(BoundaryCycleGuard.hasCycle(undefined), false);
    assert.equal(BoundaryCycleGuard.hasCycle('text'), false);
    assert.equal(BoundaryCycleGuard.hasCycle(42), false);
    assert.equal(BoundaryCycleGuard.hasCycle(true), false);
  });

  void it('reports false for an acyclic plain object', () => {
    const value = { 'a': 1, 'b': { 'c': 2 } };
    assert.equal(BoundaryCycleGuard.hasCycle(value), false);
  });

  void it('reports false for an acyclic array', () => {
    const value = [1, [2, 3], { 'x': 4 }];
    assert.equal(BoundaryCycleGuard.hasCycle(value), false);
  });

  void it('reports false for a diamond-shaped, non-cyclic reference graph', () => {
    const shared = { 'value': 1 };
    const value = { 'left': shared, 'right': shared };
    assert.equal(BoundaryCycleGuard.hasCycle(value), false);
  });

  void it('reports true for a self-referencing object', () => {
    const value: Record<string, unknown> = {};
    value.self = value;
    assert.equal(BoundaryCycleGuard.hasCycle(value), true);
  });

  void it('reports true for a self-referencing array', () => {
    const value: unknown[] = [];
    value.push(value);
    assert.equal(BoundaryCycleGuard.hasCycle(value), true);
  });

  void it('reports true for a cycle nested inside a Map value', () => {
    const value: Record<string, unknown> = {};
    const map = new Map<string, unknown>([['self', value]]);
    value.map = map;
    assert.equal(BoundaryCycleGuard.hasCycle(value), true);
  });

  void it('reports true for a cycle nested inside a Set member', () => {
    const value: Record<string, unknown> = {};
    const set = new Set<unknown>([value]);
    value.set = set;
    assert.equal(BoundaryCycleGuard.hasCycle(value), true);
  });

  void it('reports false for a Map/Set with no cycle', () => {
    const value = { 'map': new Map([['a', 1]]), 'set': new Set([1, 2, 3]) };
    assert.equal(BoundaryCycleGuard.hasCycle(value), false);
  });

  void it('treats a Date as an opaque leaf', () => {
    const value = { 'when': new Date(0) };
    assert.equal(BoundaryCycleGuard.hasCycle(value), false);
  });
});
