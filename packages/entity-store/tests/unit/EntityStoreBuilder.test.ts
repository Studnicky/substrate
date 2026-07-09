/**
 * EntityStoreBuilder Unit Tests
 */

import assert from 'node:assert/strict';
import { it } from 'node:test';

import { EntityStore } from '../../src/EntityStore.js';

type UserType = { id: string; name: string };

it('builder constructs a working EntityStore', () => {
  const store = EntityStore.builder<UserType>()
    .withSelectId((entity) => { return entity.id; })
    .build();

  store.upsertOne({ id: 'a', name: 'Alice' });

  assert.equal(store.size, 1);
  assert.deepEqual(store.getById('a'), { id: 'a', name: 'Alice' });
});

it('builder applies sortComparer to getAll()', () => {
  const store = EntityStore.builder<UserType>()
    .withSelectId((entity) => { return entity.id; })
    .withSortComparer((a, b) => { return a.name.localeCompare(b.name); })
    .build();

  store.upsertOne({ id: 'b', name: 'Bob' });
  store.upsertOne({ id: 'a', name: 'Alice' });

  assert.deepEqual(store.getAll().map((entity) => { return entity.id; }), ['a', 'b']);
});

it('build() throws when selectId was never set', () => {
  assert.throws(() => {
    EntityStore.builder<UserType>().build();
  }, /selectId is required/);
});
