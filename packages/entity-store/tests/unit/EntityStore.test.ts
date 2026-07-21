/**
 * EntityStore Unit Tests
 */

import assert from 'node:assert/strict';
import { it } from 'node:test';

import { EntityStore } from '../../src/EntityStore.js';

type UserType = { id: string; name: string };
type NestedUserType = { id: string; profile: { name: string }; roles: string[] };

const selectId = (entity: UserType): string => { return entity.id; };

// --- upsertOne / upsertMany ---

it('upsertOne inserts a new entity', async () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });

  await store.upsertOne({ id: 'a', name: 'Alice' });

  assert.equal(store.size, 1);
  assert.deepEqual(store.getById('a'), { id: 'a', name: 'Alice' });
});

it('upsertOne overwrites an existing entity with the same id', async () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });

  await store.upsertOne({ id: 'a', name: 'Alice' });
  await store.upsertOne({ id: 'a', name: 'Alicia' });

  assert.equal(store.size, 1);
  assert.deepEqual(store.getById('a'), { id: 'a', name: 'Alicia' });
});

it('upsertMany batch-inserts every entity', async () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });

  await store.upsertMany([
    { id: 'a', name: 'Alice' },
    { id: 'b', name: 'Bob' },
    { id: 'c', name: 'Carol' }
  ]);

  assert.equal(store.size, 3);
  assert.deepEqual(store.getById('b'), { id: 'b', name: 'Bob' });
});

it('upsertMany with an empty array is a no-op', async () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });

  await store.upsertMany([]);

  assert.equal(store.size, 0);
});

it('snapshots caller-owned entities on every retention path', async () => {
  const nestedSelectId = (entity: NestedUserType): string => { return entity.id; };
  const store = EntityStore.create<NestedUserType>({ 'selectId': nestedSelectId });
  const upserted = { 'id': 'upserted', 'profile': { 'name': 'Alice' }, 'roles': ['admin'] };

  await store.upsertOne(upserted);
  upserted.profile.name = 'mutated';
  upserted.roles.push('owner');

  assert.deepEqual(store.getById('upserted'), {
    'id': 'upserted',
    'profile': { 'name': 'Alice' },
    'roles': ['admin']
  });

  const batched = { 'id': 'batched', 'profile': { 'name': 'Bob' }, 'roles': ['reader'] };
  await store.upsertMany([batched]);
  batched.profile.name = 'mutated';
  batched.roles.push('writer');

  assert.deepEqual(store.getById('batched'), {
    'id': 'batched',
    'profile': { 'name': 'Bob' },
    'roles': ['reader']
  });

  const replacement = { 'id': 'replacement', 'profile': { 'name': 'Carol' }, 'roles': ['editor'] };
  await store.setAll([replacement]);
  replacement.profile.name = 'mutated';
  replacement.roles.push('publisher');

  assert.deepEqual(store.getById('replacement'), {
    'id': 'replacement',
    'profile': { 'name': 'Carol' },
    'roles': ['editor']
  });
});

// --- removeOne / removeMany ---

it('removeOne returns true and removes an existing entity', async () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });
  await store.upsertOne({ id: 'a', name: 'Alice' });

  const result = await store.removeOne('a');

  assert.equal(result, true);
  assert.equal(store.size, 0);
  assert.equal(store.getById('a'), undefined);
});

it('removeOne returns false for a missing id', async () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });

  const result = await store.removeOne('missing');

  assert.equal(result, false);
});

it('removeMany returns the count of entities actually removed', async () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });
  await store.upsertMany([
    { id: 'a', name: 'Alice' },
    { id: 'b', name: 'Bob' }
  ]);

  const removed = await store.removeMany(['a', 'b', 'missing']);

  assert.equal(removed, 2);
  assert.equal(store.size, 0);
});

it('removeMany with an empty array returns 0', async () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });

  const removed = await store.removeMany([]);

  assert.equal(removed, 0);
});

// --- setAll ---

it('setAll replaces the entire collection', async () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });
  await store.upsertMany([
    { id: 'a', name: 'Alice' },
    { id: 'b', name: 'Bob' }
  ]);

  await store.setAll([{ id: 'c', name: 'Carol' }]);

  assert.equal(store.size, 1);
  assert.equal(store.getById('a'), undefined);
  assert.equal(store.getById('b'), undefined);
  assert.deepEqual(store.getById('c'), { id: 'c', name: 'Carol' });
});

it('setAll with an empty array clears the collection', async () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });
  await store.upsertOne({ id: 'a', name: 'Alice' });

  await store.setAll([]);

  assert.equal(store.size, 0);
});

// --- getAll ordering ---

it('getAll falls back to insertion order when no sortComparer is configured', async () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });
  await store.upsertOne({ id: 'c', name: 'Carol' });
  await store.upsertOne({ id: 'a', name: 'Alice' });
  await store.upsertOne({ id: 'b', name: 'Bob' });

  const ids = store.getAll().map((entity) => { return entity.id; });

  assert.deepEqual(ids, ['c', 'a', 'b']);
});

it('getAll respects sortComparer when configured', async () => {
  const store = EntityStore.create<UserType>({
    'selectId': selectId,
    'sortComparer': (a, b) => { return a.name.localeCompare(b.name); }
  });
  await store.upsertOne({ id: 'c', name: 'Carol' });
  await store.upsertOne({ id: 'a', name: 'Alice' });
  await store.upsertOne({ id: 'b', name: 'Bob' });

  const ids = store.getAll().map((entity) => { return entity.id; });

  assert.deepEqual(ids, ['a', 'b', 'c']);
});

it('getAll returns a defensive sorted snapshot', async () => {
  const store = EntityStore.create<UserType>({
    'selectId': selectId,
    'sortComparer': (a, b) => { return a.name.localeCompare(b.name); }
  });
  await store.upsertOne({ id: 'b', name: 'Bob' });
  await store.upsertOne({ id: 'a', name: 'Alice' });

  const snapshot = store.getAll();
  Reflect.set(snapshot, 0, { id: 'tampered', name: 'Tampered' });

  assert.deepEqual(store.getAll().map((entity) => entity.id), ['a', 'b']);
});

it('getAll caches the sorted snapshot until the next mutation', async () => {
  let calls = 0;
  const comparer = (a: UserType, b: UserType): number => {
    calls += 1;
    return a.name.localeCompare(b.name);
  };
  const store = EntityStore.create<UserType>({ 'selectId': selectId, 'sortComparer': comparer });
  await store.upsertOne({ id: 'c', name: 'Carol' });
  await store.upsertOne({ id: 'a', name: 'Alice' });

  store.getAll();
  const callsAfterFirstGetAll = calls;
  assert.ok(callsAfterFirstGetAll > 0);

  store.getAll();
  store.getAll();
  assert.equal(calls, callsAfterFirstGetAll);

  await store.upsertOne({ id: 'b', name: 'Bob' });
  store.getAll();
  assert.ok(calls > callsAfterFirstGetAll);
});

it('getAll and getById return deeply detached entities', async () => {
  const nestedSelectId = (entity: NestedUserType): string => { return entity.id; };
  const store = EntityStore.create<NestedUserType>({ 'selectId': nestedSelectId });
  await store.upsertOne({ 'id': 'a', 'profile': { 'name': 'Alice' }, 'roles': ['admin'] });

  const byId = store.getById('a');
  assert.notEqual(byId, undefined);
  byId.profile.name = 'tampered';
  byId.roles.push('owner');

  const all = store.getAll();
  const first = all[0];
  assert.notEqual(first, undefined);
  first.profile.name = 'tampered again';
  first.roles.push('writer');

  assert.deepEqual(store.getById('a'), {
    'id': 'a',
    'profile': { 'name': 'Alice' },
    'roles': ['admin']
  });
});

// --- getById / getIds / size ---

it('getById/getIds/size reflect a mix of operations', async () => {
  const store = EntityStore.create<UserType>({ 'selectId': selectId });

  assert.equal(store.size, 0);
  assert.deepEqual(store.getIds(), []);

  await store.upsertMany([
    { id: 'a', name: 'Alice' },
    { id: 'b', name: 'Bob' }
  ]);
  assert.equal(store.size, 2);
  assert.deepEqual(store.getIds(), ['a', 'b']);

  await store.upsertOne({ id: 'c', name: 'Carol' });
  assert.equal(store.size, 3);
  assert.deepEqual(store.getIds(), ['a', 'b', 'c']);

  await store.removeOne('b');
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

it('onUpsert fires on insert and on overwrite of the same id', async () => {
  const store = new RecordingStore({ 'selectId': selectId });

  await store.upsertOne({ id: 'a', name: 'Alice' });
  await store.upsertOne({ id: 'a', name: 'Alicia' });

  const upserts = store.log.filter((e) => { return e.event === 'upsert'; });
  assert.equal(upserts.length, 2);
  assert.deepEqual(upserts[0], { 'event': 'upsert', 'id': 'a', 'entity': { id: 'a', name: 'Alice' } });
  assert.deepEqual(upserts[1], { 'event': 'upsert', 'id': 'a', 'entity': { id: 'a', name: 'Alicia' } });
});

it('onUpsert fires once per entity from upsertMany', async () => {
  const store = new RecordingStore({ 'selectId': selectId });

  await store.upsertMany([
    { id: 'a', name: 'Alice' },
    { id: 'b', name: 'Bob' }
  ]);

  const upserts = store.log.filter((e) => { return e.event === 'upsert'; });
  assert.equal(upserts.length, 2);
});

it('onRemove fires only when something was actually removed', async () => {
  const store = new RecordingStore({ 'selectId': selectId });
  await store.upsertOne({ id: 'a', name: 'Alice' });
  store.log.length = 0;

  await store.removeOne('missing');
  assert.equal(store.log.length, 0);

  await store.removeOne('a');
  assert.equal(store.log.length, 1);
  assert.deepEqual(store.log[0], { 'event': 'remove', 'id': 'a' });
});

it('onRemove fires once per entity actually removed from removeMany', async () => {
  const store = new RecordingStore({ 'selectId': selectId });
  await store.upsertMany([
    { id: 'a', name: 'Alice' },
    { id: 'b', name: 'Bob' }
  ]);
  store.log.length = 0;

  const removed = await store.removeMany(['a', 'missing', 'b']);

  assert.equal(removed, 2);
  const removeEvents = store.log.filter((e) => { return e.event === 'remove'; });
  assert.equal(removeEvents.length, 2);
});

it('onReplaceAll fires once from setAll with the new collection count', async () => {
  const store = new RecordingStore({ 'selectId': selectId });
  await store.upsertOne({ id: 'a', name: 'Alice' });
  store.log.length = 0;

  await store.setAll([
    { id: 'b', name: 'Bob' },
    { id: 'c', name: 'Carol' },
    { id: 'd', name: 'Dave' }
  ]);

  const replaceEvents = store.log.filter((e) => { return e.event === 'replaceAll'; });
  assert.equal(replaceEvents.length, 1);
  assert.deepEqual(replaceEvents[0], { 'event': 'replaceAll', 'count': 3 });
});

it('onReplaceAll fires with count 0 when setAll is called with an empty array', async () => {
  const store = new RecordingStore({ 'selectId': selectId });
  await store.upsertOne({ id: 'a', name: 'Alice' });
  store.log.length = 0;

  await store.setAll([]);

  assert.equal(store.log.length, 1);
  assert.deepEqual(store.log[0], { 'event': 'replaceAll', 'count': 0 });
});

it('a subclass overriding all three hooks observes every event', async () => {
  const store = new RecordingStore({ 'selectId': selectId });

  await store.upsertOne({ id: 'a', name: 'Alice' });
  await store.upsertMany([{ id: 'b', name: 'Bob' }]);
  await store.removeOne('a');
  await store.setAll([{ id: 'c', name: 'Carol' }]);

  assert.deepEqual(
    store.log.map((e) => { return e.event; }),
    ['upsert', 'upsert', 'remove', 'replaceAll']
  );
});

it('a throwing onUpsert hook does not replace the completed store mutation', async () => {
  class ThrowingUpsertStore extends EntityStore<UserType, string> {
    protected override onUpsert(): void {
      throw new Error('hook boom');
    }
  }

  const store = new ThrowingUpsertStore({ 'selectId': selectId });
  await store.upsertOne({ 'id': 'a', 'name': 'Alice' });

  assert.equal(store.size, 1);
  assert.deepEqual(store.getById('a'), { 'id': 'a', 'name': 'Alice' });
});

it('a throwing onRemove hook does not replace the completed removal', async () => {
  class ThrowingRemoveStore extends EntityStore<UserType, string> {
    protected override onRemove(): void {
      throw new Error('hook boom');
    }
  }

  const store = new ThrowingRemoveStore({ 'selectId': selectId });
  await store.upsertOne({ 'id': 'a', 'name': 'Alice' });

  assert.equal(await store.removeOne('a'), true);
  assert.equal(store.size, 0);
  assert.equal(store.getById('a'), undefined);
});

it('a throwing onReplaceAll hook does not replace the completed collection swap', async () => {
  class ThrowingReplaceAllStore extends EntityStore<UserType, string> {
    protected override onReplaceAll(): void {
      throw new Error('hook boom');
    }
  }

  const store = new ThrowingReplaceAllStore({ 'selectId': selectId });
  await store.upsertOne({ 'id': 'a', 'name': 'Alice' });
  await store.setAll([{ 'id': 'b', 'name': 'Bob' }]);

  assert.equal(store.size, 1);
  assert.equal(store.getById('a'), undefined);
  assert.deepEqual(store.getById('b'), { 'id': 'b', 'name': 'Bob' });
});

// ---------------------------------------------------------------------------
// onHookError — recorded failures surfaced via hookErrorCount/getHookErrors
// ---------------------------------------------------------------------------

it('a throwing onUpsert hook in upsertMany does not abort remaining entities, and is recorded', async () => {
  class SelectiveThrowingStore extends EntityStore<UserType, string> {
    protected override onUpsert(id: string): void {
      if (id === 'b') {
        throw new Error('hook boom for b');
      }
    }
  }

  const store = new SelectiveThrowingStore({ 'selectId': selectId });

  await store.upsertMany([
    { id: 'a', name: 'Alice' },
    { id: 'b', name: 'Bob' },
    { id: 'c', name: 'Carol' }
  ]);

  assert.equal(store.size, 3);
  assert.deepEqual(store.getById('a'), { id: 'a', name: 'Alice' });
  assert.deepEqual(store.getById('b'), { id: 'b', name: 'Bob' });
  assert.deepEqual(store.getById('c'), { id: 'c', name: 'Carol' });

  assert.equal(store.hookErrorCount, 1);
  const errors = store.getHookErrors();
  assert.equal(errors.length, 1);
  assert.equal(errors[0]?.hookName, 'onUpsert');
  assert.ok(errors[0]?.cause instanceof Error);
});

it('getHookErrors returns a defensive copy', async () => {
  class ThrowingUpsertStore extends EntityStore<UserType, string> {
    protected override onUpsert(): void {
      throw new Error('hook boom');
    }
  }

  const store = new ThrowingUpsertStore({ 'selectId': selectId });
  await store.upsertOne({ id: 'a', name: 'Alice' });

  const errors = [...store.getHookErrors()];
  errors.length = 0;

  assert.equal(store.hookErrorCount, 1);
});

it('getHookErrors records one failure and deeply detaches nested diagnostics', async () => {
  const cause = new Error('hook boom', { 'cause': { 'attempts': [1] } });

  class ThrowingUpsertStore extends EntityStore<UserType, string> {
    protected override onUpsert(): void {
      throw cause;
    }
  }

  const store = new ThrowingUpsertStore({ 'selectId': selectId });
  await store.upsertOne({ 'id': 'a', 'name': 'Alice' });

  assert.equal(store.hookErrorCount, 1);
  const firstCause = store.getHookErrors()[0]?.cause;
  assert.ok(firstCause instanceof Error);
  firstCause.message = 'mutated';
  const firstDetails = firstCause.cause;
  assert.ok(firstDetails !== null && typeof firstDetails === 'object');
  const firstAttempts = Reflect.get(firstDetails, 'attempts');
  assert.ok(Array.isArray(firstAttempts));
  firstAttempts.push(2);

  const secondCause = store.getHookErrors()[0]?.cause;
  assert.ok(secondCause instanceof Error);
  assert.equal(secondCause.message, 'hook boom');
  assert.deepEqual(secondCause.cause, { 'attempts': [1] });
  assert.equal(store.hookErrorCount, 1);
});

// ---------------------------------------------------------------------------
// Regression: `this.hooks.invoke('onX', () => { this.onX(...); })` call sites
// must return the hook's own result so HookInvoker can detect an async
// override and route its eventual rejection through onHookError, rather than
// discarding it and letting it become an unhandled rejection.
// ---------------------------------------------------------------------------

it('an async-overridden onUpsert that rejects is routed through onHookError, recorded, and never surfaces as an unhandled rejection', async () => {
  class AsyncRejectingUpsertStore extends EntityStore<UserType, string> {
    protected override async onUpsert(): Promise<void> {
      await Promise.resolve();
      throw new Error('async onUpsert boom');
    }
  }

  const store = new AsyncRejectingUpsertStore({ 'selectId': selectId });
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    await store.upsertOne({ id: 'a', name: 'Alice' });

    assert.equal(store.size, 1);
    assert.deepEqual(store.getById('a'), { id: 'a', name: 'Alice' });
    assert.equal(store.hookErrorCount, 1);
    assert.equal(store.getHookErrors()[0]?.hookName, 'onUpsert');

    await new Promise((resolve) => { setImmediate(resolve); });
    assert.equal(rejectionEvents.length, 0);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});

it('records hook failures only on the entity-store instance that produced them', async () => {
  class IsolatedFailureStore extends EntityStore<UserType, string> {
    protected override onUpsert(id: string): void {
      throw new Error(`hook failure for ${id}`);
    }
  }

  const first = new IsolatedFailureStore({ 'selectId': selectId });
  const second = new IsolatedFailureStore({ 'selectId': selectId });

  await first.upsertOne({ 'id': 'first', 'name': 'First' });
  await second.upsertOne({ 'id': 'second', 'name': 'Second' });

  const firstError = first.getHookErrors()[0];
  const secondError = second.getHookErrors()[0];

  assert.equal(first.hookErrorCount, 1);
  assert.equal(second.hookErrorCount, 1);
  assert.equal(firstError?.hookName, 'onUpsert');
  assert.equal(secondError?.hookName, 'onUpsert');
  assert.ok(firstError?.cause instanceof Error);
  assert.ok(secondError?.cause instanceof Error);
  assert.equal(firstError.cause.message, 'hook failure for first');
  assert.equal(secondError.cause.message, 'hook failure for second');
});
