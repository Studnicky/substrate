/**
 * EntityStore Unit Tests
 */

import assert from 'node:assert/strict';
import { it } from 'node:test';

import { EntityStore } from '../../src/EntityStore.js';

type UserType = { id: string; name: string };

const selectId = (entity: UserType): string => { return entity.id; };

// --- upsertOne / upsertMany ---

it('upsertOne inserts a new entity', () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });

  store.upsertOne({ id: 'a', name: 'Alice' });

  assert.equal(store.size, 1);
  assert.deepEqual(store.getById('a'), { id: 'a', name: 'Alice' });
});

it('upsertOne overwrites an existing entity with the same id', () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });

  store.upsertOne({ id: 'a', name: 'Alice' });
  store.upsertOne({ id: 'a', name: 'Alicia' });

  assert.equal(store.size, 1);
  assert.deepEqual(store.getById('a'), { id: 'a', name: 'Alicia' });
});

it('upsertMany batch-inserts every entity', () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });

  store.upsertMany([
    { id: 'a', name: 'Alice' },
    { id: 'b', name: 'Bob' },
    { id: 'c', name: 'Carol' }
  ]);

  assert.equal(store.size, 3);
  assert.deepEqual(store.getById('b'), { id: 'b', name: 'Bob' });
});

it('upsertMany with an empty array is a no-op', () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });

  store.upsertMany([]);

  assert.equal(store.size, 0);
});

// --- removeOne / removeMany ---

it('removeOne returns true and removes an existing entity', () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });
  store.upsertOne({ id: 'a', name: 'Alice' });

  const result = store.removeOne('a');

  assert.equal(result, true);
  assert.equal(store.size, 0);
  assert.equal(store.getById('a'), undefined);
});

it('removeOne returns false for a missing id', () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });

  const result = store.removeOne('missing');

  assert.equal(result, false);
});

it('removeMany returns the count of entities actually removed', () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });
  store.upsertMany([
    { id: 'a', name: 'Alice' },
    { id: 'b', name: 'Bob' }
  ]);

  const removed = store.removeMany(['a', 'b', 'missing']);

  assert.equal(removed, 2);
  assert.equal(store.size, 0);
});

it('removeMany with an empty array returns 0', () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });

  const removed = store.removeMany([]);

  assert.equal(removed, 0);
});

// --- setAll ---

it('setAll replaces the entire collection', () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });
  store.upsertMany([
    { id: 'a', name: 'Alice' },
    { id: 'b', name: 'Bob' }
  ]);

  store.setAll([{ id: 'c', name: 'Carol' }]);

  assert.equal(store.size, 1);
  assert.equal(store.getById('a'), undefined);
  assert.equal(store.getById('b'), undefined);
  assert.deepEqual(store.getById('c'), { id: 'c', name: 'Carol' });
});

it('setAll with an empty array clears the collection', () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });
  store.upsertOne({ id: 'a', name: 'Alice' });

  store.setAll([]);

  assert.equal(store.size, 0);
});

// --- getAll ordering ---

it('getAll falls back to insertion order when no sortComparer is configured', () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });
  store.upsertOne({ id: 'c', name: 'Carol' });
  store.upsertOne({ id: 'a', name: 'Alice' });
  store.upsertOne({ id: 'b', name: 'Bob' });

  const ids = store.getAll().map((entity) => { return entity.id; });

  assert.deepEqual(ids, ['c', 'a', 'b']);
});

it('getAll respects sortComparer when configured', () => {
  const store = EntityStore.create<UserType>({
    'selectId': selectId,
    'sortComparer': (a, b) => { return a.name.localeCompare(b.name); }
  });
  store.upsertOne({ id: 'c', name: 'Carol' });
  store.upsertOne({ id: 'a', name: 'Alice' });
  store.upsertOne({ id: 'b', name: 'Bob' });

  const ids = store.getAll().map((entity) => { return entity.id; });

  assert.deepEqual(ids, ['a', 'b', 'c']);
});

// --- getById / getIds / size ---

it('getById/getIds/size reflect a mix of operations', () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });

  assert.equal(store.size, 0);
  assert.deepEqual(store.getIds(), []);

  store.upsertMany([
    { id: 'a', name: 'Alice' },
    { id: 'b', name: 'Bob' }
  ]);
  assert.equal(store.size, 2);
  assert.deepEqual(store.getIds(), ['a', 'b']);

  store.upsertOne({ id: 'c', name: 'Carol' });
  assert.equal(store.size, 3);
  assert.deepEqual(store.getIds(), ['a', 'b', 'c']);

  store.removeOne('b');
  assert.equal(store.size, 2);
  assert.deepEqual(store.getIds(), ['a', 'c']);
  assert.equal(store.getById('b'), undefined);
  assert.deepEqual(store.getById('a'), { id: 'a', name: 'Alice' });
});

// ---------------------------------------------------------------------------
// Lifecycle hooks — recording subclass
// ---------------------------------------------------------------------------

type HookEventType =
  | { 'event': 'upsert'; 'id': string; 'entity': UserType }
  | { 'event': 'remove'; 'id': string }
  | { 'event': 'replaceAll'; 'count': number };

class RecordingStore extends EntityStore<UserType, string> {
  readonly log: HookEventType[] = [];

  protected override onUpsert(id: string, entity: UserType): void {
    this.log.push({ 'event': 'upsert', 'id': id, 'entity': entity });
  }

  protected override onRemove(id: string): void {
    this.log.push({ 'event': 'remove', 'id': id });
  }

  protected override onReplaceAll(count: number): void {
    this.log.push({ 'event': 'replaceAll', 'count': count });
  }
}

it('onUpsert fires on insert and on overwrite of the same id', () => {
  const store = new RecordingStore({ 'selectId': selectId });

  store.upsertOne({ id: 'a', name: 'Alice' });
  store.upsertOne({ id: 'a', name: 'Alicia' });

  const upserts = store.log.filter((e) => { return e.event === 'upsert'; });
  assert.equal(upserts.length, 2);
  assert.deepEqual(upserts[0], { 'event': 'upsert', 'id': 'a', 'entity': { id: 'a', name: 'Alice' } });
  assert.deepEqual(upserts[1], { 'event': 'upsert', 'id': 'a', 'entity': { id: 'a', name: 'Alicia' } });
});

it('onUpsert fires once per entity from upsertMany', () => {
  const store = new RecordingStore({ 'selectId': selectId });

  store.upsertMany([
    { id: 'a', name: 'Alice' },
    { id: 'b', name: 'Bob' }
  ]);

  const upserts = store.log.filter((e) => { return e.event === 'upsert'; });
  assert.equal(upserts.length, 2);
});

it('onRemove fires only when something was actually removed', () => {
  const store = new RecordingStore({ 'selectId': selectId });
  store.upsertOne({ id: 'a', name: 'Alice' });
  store.log.length = 0;

  store.removeOne('missing');
  assert.equal(store.log.length, 0);

  store.removeOne('a');
  assert.equal(store.log.length, 1);
  assert.deepEqual(store.log[0], { 'event': 'remove', 'id': 'a' });
});

it('onRemove fires once per entity actually removed from removeMany', () => {
  const store = new RecordingStore({ 'selectId': selectId });
  store.upsertMany([
    { id: 'a', name: 'Alice' },
    { id: 'b', name: 'Bob' }
  ]);
  store.log.length = 0;

  const removed = store.removeMany(['a', 'missing', 'b']);

  assert.equal(removed, 2);
  const removeEvents = store.log.filter((e) => { return e.event === 'remove'; });
  assert.equal(removeEvents.length, 2);
});

it('onReplaceAll fires once from setAll with the new collection count', () => {
  const store = new RecordingStore({ 'selectId': selectId });
  store.upsertOne({ id: 'a', name: 'Alice' });
  store.log.length = 0;

  store.setAll([
    { id: 'b', name: 'Bob' },
    { id: 'c', name: 'Carol' },
    { id: 'd', name: 'Dave' }
  ]);

  const replaceEvents = store.log.filter((e) => { return e.event === 'replaceAll'; });
  assert.equal(replaceEvents.length, 1);
  assert.deepEqual(replaceEvents[0], { 'event': 'replaceAll', 'count': 3 });
});

it('onReplaceAll fires with count 0 when setAll is called with an empty array', () => {
  const store = new RecordingStore({ 'selectId': selectId });
  store.upsertOne({ id: 'a', name: 'Alice' });
  store.log.length = 0;

  store.setAll([]);

  assert.equal(store.log.length, 1);
  assert.deepEqual(store.log[0], { 'event': 'replaceAll', 'count': 0 });
});

it('a subclass overriding all three hooks observes every event', () => {
  const store = new RecordingStore({ 'selectId': selectId });

  store.upsertOne({ id: 'a', name: 'Alice' });
  store.upsertMany([{ id: 'b', name: 'Bob' }]);
  store.removeOne('a');
  store.setAll([{ id: 'c', name: 'Carol' }]);

  assert.deepEqual(
    store.log.map((e) => { return e.event; }),
    ['upsert', 'upsert', 'remove', 'replaceAll']
  );
});
