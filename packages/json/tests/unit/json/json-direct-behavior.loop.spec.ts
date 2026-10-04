import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Draft, Patch } from '../../../src/index.js';
import { StrictPatch } from './StrictPatch.js';
import { Widget } from './Widget.js';

void describe('Draft runtime value pass-through', () => {
  void it('preserves Date, Map, Set, and class instance references while drafting a sibling', () => {
    const createdAt = new Date(1);
    const tags = new Set(['primary']);
    const attributes = new Map([['status', 'active']]);
    const widget = new Widget('widget-1');
    const next = Draft.produce(
      { 'attributes': attributes, 'createdAt': createdAt, 'label': 'before', 'tags': tags, 'widget': widget },
      (draft) => {
        draft.label = 'after';
      }
    );
    assert.strictEqual(next.createdAt, createdAt);
    assert.strictEqual(next.tags, tags);
    assert.strictEqual(next.attributes, attributes);
    assert.strictEqual(next.widget, widget);
    assert.equal(next.label, 'after');
  });
});

void describe('Patch diff', () => {
  void it('emits an RFC-6902 patch between independently obtained JSON values', () => {
    const before = { 'items': ['one', 'two'], 'nested': { '/~': 1, 'value': 'before' }, 'remove': true };
    const after = { 'added': false, 'items': ['one', 'three'], 'nested': { '/~': 2, 'value': 'after' } };
    const patch = Patch.diff(before, after);
    const replay = { 'items': ['one', 'two'], 'nested': { '/~': 1, 'value': 'before' }, 'remove': true };

    patch.apply(replay);

    assert.deepEqual(replay, after);
    assert.deepEqual(patch.operations, [
      { 'op': 'remove', 'path': '/remove' },
      { 'op': 'add', 'path': '/added', 'value': false },
      { 'op': 'replace', 'path': '/items/1', 'value': 'three' },
      { 'op': 'replace', 'path': '/nested/~1~0', 'value': 2 },
      { 'op': 'replace', 'path': '/nested/value', 'value': 'after' }
    ]);
    assert.ok(StrictPatch.diff(before, after) instanceof StrictPatch);
  });
});
