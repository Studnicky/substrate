import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FrozenMutationError, ImmutableSnapshot, ImmutableSnapshotError } from '../../../src/index.js';

void describe('ImmutableSnapshot', () => {
  void it('detaches and freezes nested object graphs', () => {
    const source = { 'nested': { 'items': [ { 'id': 1 } ] } };
    const snapshot = ImmutableSnapshot.from(source);

    assert.notStrictEqual(snapshot, source);
    assert.notStrictEqual(snapshot.nested, source.nested);
    assert.notStrictEqual(snapshot.nested.items, source.nested.items);
    const snapshotFirstItem = snapshot.nested.items.at(0);
    const sourceFirstItem = source.nested.items.at(0);

    assert.ok(snapshotFirstItem !== undefined);
    assert.ok(sourceFirstItem !== undefined);
    assert.notStrictEqual(snapshotFirstItem, sourceFirstItem);
    assert.throws(() => { snapshotFirstItem.id = 2; }, TypeError);
    assert.equal(sourceFirstItem.id, 1);
  });

  void it('detaches and mutation-guards Map and Set values', () => {
    const source = { 'records': new Map<string, Set<{ id: number }>>([[ 'team', new Set([ { 'id': 1 } ]) ]]) };
    const snapshot = ImmutableSnapshot.from(source);
    const members = snapshot.records.get('team');

    assert.notStrictEqual(snapshot.records, source.records);
    assert.ok(members instanceof Set);
    assert.throws(() => snapshot.records.set('other', new Set()), FrozenMutationError);
    assert.throws(() => members.add({ 'id': 2 }), FrozenMutationError);
    const member = members.values().next().value;
    assert.ok(member !== undefined);
    assert.throws(() => { member.id = 2; }, TypeError);
    const sourceMembers = source.records.get('team');

    assert.ok(sourceMembers !== undefined);
    const sourceMember = sourceMembers.values().next().value;
    assert.ok(sourceMember !== undefined);
    assert.equal(sourceMember.id, 1);
  });

  void it('throws a typed error when a value cannot be structured cloned', () => {
    const source = { 'callback': (): void => {} };

    assert.throws(() => ImmutableSnapshot.from(source), ImmutableSnapshotError);
  });
});
