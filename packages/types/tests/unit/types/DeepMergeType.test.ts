import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

/**
 * Compile-time structural tests for DeepMergeType.
 * DeepMergeType is a pure type-level utility — runtime tests verify
 * that the import resolves and that typical merge shapes are assignable.
 */
import type { DeepMergeType } from '../../../src/types/DeepMergeType.js';

void describe('DeepMergeType', () => {
  void it('module resolves and type is usable in assignments', () => {
    // If this compiles, the type is importable and structurally correct.
    type Base = { a: number; b: string };
    type Overlay = { b: boolean; c: number };
    type Merged = DeepMergeType<Base, Overlay>;

    // A value that satisfies the merged shape
    const merged: Merged = { a: 1, b: true, c: 3 };
    assert.equal(merged.a, 1);
    assert.equal(merged.b, true);
    assert.equal(merged.c, 3);
  });

  void it('overlay wins on conflicting keys', () => {
    type Merged = DeepMergeType<{ x: number }, { x: string }>;
    const merged: Merged = { x: 'overlay' };
    assert.equal(typeof merged.x, 'string');
  });

  void it('base keys not in overlay are preserved', () => {
    type Merged = DeepMergeType<{ a: number; b: string }, { b: boolean }>;
    const merged: Merged = { a: 42, b: false };
    assert.equal(merged.a, 42);
    assert.equal(merged.b, false);
  });
});
