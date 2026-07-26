import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EntityStore } from '../../src/EntityStore.js';
import scenarioGroups from './EntityStore.scenarios.json' with { type: 'json' };

type UserType = { id: string; name: string };
type NestedUserType = { id: string; profile: { name: string }; roles: string[] };
type NestedMutationType = { profileName: string; role: string };
type SnapshotRetentionMutationsType = {
  batched: NestedMutationType;
  replacement: NestedMutationType;
  upserted: NestedMutationType;
};
type DetachedGetterMutationsType = {
  all: NestedMutationType;
  byId: NestedMutationType;
};
type StoreCheckpointType = { ids: readonly string[]; size: number };
type OperationCheckpointsType = {
  afterAdd: StoreCheckpointType;
  afterBatch: StoreCheckpointType;
  initial: StoreCheckpointType;
};
type HookEventType =
  | { event: 'upsert'; id: string; entity: UserType }
  | { event: 'remove'; id: string }
  | { event: 'replaceAll'; count: number };
type HookOperationType = 'removeOne' | 'setAll' | 'upsertMany' | 'upsertOne';
type HookEventNameType = HookEventType['event'];
type HookFailureType = { message: string };
type SelectiveHookFailureType = HookFailureType & { id: string };
type ErrorCauseMutationType = { attempt: number; message: string };

type ScenarioDescriptor<Shape extends string, Input, Expected> = {
  description: string;
  expected: Expected;
  input: Input;
  shape: Shape;
  name: string;
};

type ScenarioCaseMap = {
  'async-rejection-routed-no-unhandled': ScenarioDescriptor<
    'async-rejection-routed-no-unhandled',
    { entity: UserType; failure: HookFailureType },
    { entity: UserType; hookErrorCount: number; hookName: string; size: number; unhandledRejections: number }
  >;
  'deep-detached-getters': ScenarioDescriptor<
    'deep-detached-getters',
    { entity: NestedUserType; mutations: DetachedGetterMutationsType },
    { entity: NestedUserType }
  >;
  'get-all-cache-invalidated': ScenarioDescriptor<
    'get-all-cache-invalidated',
    { entities: readonly UserType[]; mutation: UserType },
    { idsAfterMutation: readonly string[]; idsBeforeMutation: readonly string[] }
  >;
  'get-all-defensive-snapshot': ScenarioDescriptor<
    'get-all-defensive-snapshot',
    { entities: readonly UserType[]; snapshotMutation: UserType },
    { defensiveCopy: boolean; ids: readonly string[] }
  >;
  'get-all-insertion-order': ScenarioDescriptor<
    'get-all-insertion-order',
    { entities: readonly UserType[] },
    { ids: readonly string[] }
  >;
  'get-all-sorted': ScenarioDescriptor<
    'get-all-sorted',
    { entities: readonly UserType[] },
    { ids: readonly string[] }
  >;
  'hook-errors-deeply-detached': ScenarioDescriptor<
    'hook-errors-deeply-detached',
    { cause: { attempts: number[] }; entity: UserType; failure: HookFailureType; mutation: ErrorCauseMutationType },
    { cause: { details: { attempts: readonly number[] }; message: string }; hookErrorCount: number; hookName: string }
  >;
  'hook-errors-defensive-copy': ScenarioDescriptor<
    'hook-errors-defensive-copy',
    { entity: UserType; failure: HookFailureType },
    { defensiveCopy: boolean; hookErrorCount: number }
  >;
  'hook-failure-recorded-batch-continues': ScenarioDescriptor<
    'hook-failure-recorded-batch-continues',
    { entities: readonly UserType[]; failure: SelectiveHookFailureType },
    { entities: Record<string, UserType>; hookErrorCount: number; hookName: string; size: number }
  >;
  'hook-failures-isolated-per-instance': ScenarioDescriptor<
    'hook-failures-isolated-per-instance',
    { failureMessagePrefix: string; first: UserType; second: UserType },
    { first: { hookErrorCount: number; message: string }; hookName: string; second: { hookErrorCount: number; message: string } }
  >;
  'hooks-all-overridden': ScenarioDescriptor<
    'hooks-all-overridden',
    { removeOne: string; setAll: readonly UserType[]; steps: readonly HookOperationType[]; upsertMany: readonly UserType[]; upsertOne: UserType },
    { events: readonly HookEventNameType[] }
  >;
  'hooks-remove-many': ScenarioDescriptor<
    'hooks-remove-many',
    { entities: readonly UserType[]; ids: readonly string[] },
    { removeEvents: readonly HookEventType[]; removed: number }
  >;
  'hooks-remove-only-when-exists': ScenarioDescriptor<
    'hooks-remove-only-when-exists',
    { entity: UserType; missingId: string; presentId: string },
    { event: HookEventType; existingRemoves: number; missingRemoves: number }
  >;
  'hooks-replace-all-count': ScenarioDescriptor<
    'hooks-replace-all-count',
    { initial: readonly UserType[]; next: readonly UserType[] },
    { replaceEvents: readonly HookEventType[] }
  >;
  'hooks-replace-all-empty': ScenarioDescriptor<
    'hooks-replace-all-empty',
    { initial: readonly UserType[]; next: readonly UserType[] },
    { replaceEvents: readonly HookEventType[] }
  >;
  'hooks-upsert-many': ScenarioDescriptor<
    'hooks-upsert-many',
    { entities: readonly UserType[] },
    { ids: readonly string[]; upsertCount: number }
  >;
  'hooks-upsert-overwrite': ScenarioDescriptor<
    'hooks-upsert-overwrite',
    { entities: readonly UserType[] },
    { events: readonly HookEventType[] }
  >;
  'ids-size-reflect-operations': ScenarioDescriptor<
    'ids-size-reflect-operations',
    { added: UserType; entities: readonly UserType[]; initial: number; removedId: string },
    { checkpoints: OperationCheckpointsType; entity: UserType; ids: readonly string[]; missingId: string; size: number }
  >;
  'remove-many-count': ScenarioDescriptor<
    'remove-many-count',
    { entities: readonly UserType[]; ids: readonly string[] },
    { removed: number; size: number }
  >;
  'remove-many-empty': ScenarioDescriptor<
    'remove-many-empty',
    { ids: readonly string[] },
    { removed: number }
  >;
  'remove-one-missing': ScenarioDescriptor<
    'remove-one-missing',
    { id: string },
    { removed: boolean }
  >;
  'remove-one-removes': ScenarioDescriptor<
    'remove-one-removes',
    { entity: UserType },
    { removed: boolean; size: number }
  >;
  'set-all-empty': ScenarioDescriptor<
    'set-all-empty',
    { initial: readonly UserType[]; next: readonly UserType[] },
    { size: number }
  >;
  'set-all-replaces': ScenarioDescriptor<
    'set-all-replaces',
    { initial: readonly UserType[]; next: readonly UserType[] },
    { entity: UserType; ids: readonly string[]; missing: readonly string[]; size: number }
  >;
  'snapshot-retention-paths': ScenarioDescriptor<
    'snapshot-retention-paths',
    { batched: NestedUserType; mutations: SnapshotRetentionMutationsType; replacement: NestedUserType; upserted: NestedUserType },
    { batched: NestedUserType; replacement: NestedUserType; upserted: NestedUserType }
  >;
  'throwing-on-remove-preserves-removal': ScenarioDescriptor<
    'throwing-on-remove-preserves-removal',
    { entity: UserType; failure: HookFailureType },
    { hookErrorCount: number; removed: boolean; size: number }
  >;
  'throwing-on-replace-all-preserves-swap': ScenarioDescriptor<
    'throwing-on-replace-all-preserves-swap',
    { failure: HookFailureType; initial: UserType; next: UserType },
    { entity: UserType; hookErrorCount: number; size: number }
  >;
  'throwing-on-upsert-preserves-store': ScenarioDescriptor<
    'throwing-on-upsert-preserves-store',
    { entity: UserType; failure: HookFailureType },
    { entity: UserType; hookErrorCount: number; size: number }
  >;
  'upsert-many-batch': ScenarioDescriptor<
    'upsert-many-batch',
    { entities: readonly UserType[] },
    { entity: UserType; size: number }
  >;
  'upsert-many-empty': ScenarioDescriptor<
    'upsert-many-empty',
    { entities: readonly UserType[] },
    { size: number }
  >;
  'upsert-one-inserts': ScenarioDescriptor<
    'upsert-one-inserts',
    { entity: UserType },
    { entity: UserType; size: number }
  >;
  'upsert-one-overwrites': ScenarioDescriptor<
    'upsert-one-overwrites',
    { initial: UserType; next: UserType },
    { entity: UserType; size: number }
  >;
};

type ScenarioShape = keyof ScenarioCaseMap;
type ScenarioCase = ScenarioCaseMap[ScenarioShape];
type ScenarioRunner<K extends ScenarioShape> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => Promise<void>;
type RunnerMap = { [K in ScenarioShape]: ScenarioRunner<K> };

const selectId = (entity: UserType): string => entity.id;

class RecordingStore extends EntityStore<UserType, string> {
  readonly log: HookEventType[] = [];

  protected override onUpsert(id: string, entity: UserType): void {
    this.log.push({ entity, event: 'upsert', id });
  }

  protected override onRemove(id: string): void {
    this.log.push({ event: 'remove', id });
  }

  protected override onReplaceAll(count: number): void {
    this.log.push({ count, event: 'replaceAll' });
  }
}

function makeUserStore(): EntityStore<UserType, string> {
  return EntityStore.create<UserType>({ selectId });
}

function makeSortedUserStore(): EntityStore<UserType, string> {
  return EntityStore.create<UserType>({
    selectId,
    sortComparer: compareUsersByName
  });
}

function makeNestedStore(): EntityStore<NestedUserType, string> {
  return EntityStore.create<NestedUserType>({ selectId: (entity) => entity.id });
}

function makeThrowingUpsertStore(errorFactory: () => Error): EntityStore<UserType, string> {
  class ThrowingUpsertStore extends EntityStore<UserType, string> {
    protected override onUpsert(): void {
      throw errorFactory();
    }
  }

  return ThrowingUpsertStore.create({ selectId });
}

function makeThrowingRemoveStore(message: string): EntityStore<UserType, string> {
  class ThrowingRemoveStore extends EntityStore<UserType, string> {
    protected override onRemove(): void {
      throw new Error(message);
    }
  }

  return ThrowingRemoveStore.create({ selectId });
}

function makeThrowingReplaceAllStore(message: string): EntityStore<UserType, string> {
  class ThrowingReplaceAllStore extends EntityStore<UserType, string> {
    protected override onReplaceAll(): void {
      throw new Error(message);
    }
  }

  return ThrowingReplaceAllStore.create({ selectId });
}

function makeSelectiveThrowingUpsertStore(failure: SelectiveHookFailureType): EntityStore<UserType, string> {
  class SelectiveThrowingStore extends EntityStore<UserType, string> {
    protected override onUpsert(id: string): void {
      if (id === failure.id) {
        throw new Error(failure.message);
      }
    }
  }

  return SelectiveThrowingStore.create({ selectId });
}

function makeAsyncRejectingUpsertStore(message: string): EntityStore<UserType, string> {
  class AsyncRejectingUpsertStore extends EntityStore<UserType, string> {
    protected override async onUpsert(): Promise<void> {
      await Promise.resolve();
      throw new Error(message);
    }
  }

  return AsyncRejectingUpsertStore.create({ selectId });
}

function makeIsolatedFailureStore(messagePrefix: string): EntityStore<UserType, string> {
  class IsolatedFailureStore extends EntityStore<UserType, string> {
    protected override onUpsert(id: string): void {
      throw new Error(`${messagePrefix} ${id}`);
    }
  }

  return IsolatedFailureStore.create({ selectId });
}

function compareUsersByName(a: UserType, b: UserType): number {
  return a.name.localeCompare(b.name);
}

function mutateNestedUser(entity: NestedUserType, mutation: NestedMutationType): void {
  entity.profile.name = mutation.profileName;
  entity.roles.push(mutation.role);
}

function requireUser(entity: UserType | undefined, label: string): UserType {
  assert.ok(entity !== undefined, `${label} should exist`);
  return entity;
}

function requireNestedUser(entity: NestedUserType | undefined, label: string): NestedUserType {
  assert.ok(entity !== undefined, `${label} should exist`);
  return entity;
}

function requireHookErrorCause(store: EntityStore<UserType, string>, hookName: string, label: string): Error {
  const hookError = store.getHookErrors()[0];
  assert.ok(hookError !== undefined, `${label} hook error should exist`);
  assert.equal(hookError.hookName, hookName);
  assert.ok(hookError.cause instanceof Error, `${label} cause should be an Error`);
  return hookError.cause;
}

function assertStoreCheckpoint(store: EntityStore<UserType, string>, checkpoint: StoreCheckpointType): void {
  assert.equal(store.size, checkpoint.size);
  assert.deepEqual(store.getIds(), checkpoint.ids);
}

async function runUpsertOneInserts(scenarioCase: ScenarioCaseMap['upsert-one-inserts']): Promise<void> {
  const store = makeUserStore();
  await store.upsertOne(scenarioCase.input.entity);
  assert.equal(store.size, scenarioCase.expected.size);
  assert.deepEqual(store.getById(scenarioCase.input.entity.id), scenarioCase.expected.entity);
}

async function runUpsertOneOverwrites(scenarioCase: ScenarioCaseMap['upsert-one-overwrites']): Promise<void> {
  const store = makeUserStore();
  await store.upsertOne(scenarioCase.input.initial);
  await store.upsertOne(scenarioCase.input.next);
  assert.equal(store.size, scenarioCase.expected.size);
  assert.deepEqual(store.getById(scenarioCase.input.next.id), scenarioCase.expected.entity);
}

async function runUpsertManyBatch(scenarioCase: ScenarioCaseMap['upsert-many-batch']): Promise<void> {
  const store = makeUserStore();
  await store.upsertMany(scenarioCase.input.entities);
  assert.equal(store.size, scenarioCase.expected.size);
  assert.deepEqual(store.getById(scenarioCase.expected.entity.id), scenarioCase.expected.entity);
}

async function runUpsertManyEmpty(scenarioCase: ScenarioCaseMap['upsert-many-empty']): Promise<void> {
  const store = makeUserStore();
  await store.upsertMany(scenarioCase.input.entities);
  assert.equal(store.size, scenarioCase.expected.size);
}

async function runSnapshotRetentionPaths(scenarioCase: ScenarioCaseMap['snapshot-retention-paths']): Promise<void> {
  const store = makeNestedStore();
  await store.upsertOne(scenarioCase.input.upserted);
  mutateNestedUser(scenarioCase.input.upserted, scenarioCase.input.mutations.upserted);
  assert.deepEqual(store.getById(scenarioCase.input.upserted.id), scenarioCase.expected.upserted);

  await store.upsertMany([scenarioCase.input.batched]);
  mutateNestedUser(scenarioCase.input.batched, scenarioCase.input.mutations.batched);
  assert.deepEqual(store.getById(scenarioCase.input.batched.id), scenarioCase.expected.batched);

  await store.setAll([scenarioCase.input.replacement]);
  mutateNestedUser(scenarioCase.input.replacement, scenarioCase.input.mutations.replacement);
  assert.deepEqual(store.getById(scenarioCase.input.replacement.id), scenarioCase.expected.replacement);
}

async function runRemoveOneRemoves(scenarioCase: ScenarioCaseMap['remove-one-removes']): Promise<void> {
  const store = makeUserStore();
  await store.upsertOne(scenarioCase.input.entity);
  const result = await store.removeOne(scenarioCase.input.entity.id);
  assert.equal(result, scenarioCase.expected.removed);
  assert.equal(store.size, scenarioCase.expected.size);
  assert.equal(store.getById(scenarioCase.input.entity.id), undefined);
}

async function runRemoveOneMissing(scenarioCase: ScenarioCaseMap['remove-one-missing']): Promise<void> {
  const store = makeUserStore();
  const result = await store.removeOne(scenarioCase.input.id);
  assert.equal(result, scenarioCase.expected.removed);
}

async function runRemoveManyCount(scenarioCase: ScenarioCaseMap['remove-many-count']): Promise<void> {
  const store = makeUserStore();
  await store.upsertMany(scenarioCase.input.entities);
  const removed = await store.removeMany(scenarioCase.input.ids);
  assert.equal(removed, scenarioCase.expected.removed);
  assert.equal(store.size, scenarioCase.expected.size);
}

async function runRemoveManyEmpty(scenarioCase: ScenarioCaseMap['remove-many-empty']): Promise<void> {
  const store = makeUserStore();
  const removed = await store.removeMany(scenarioCase.input.ids);
  assert.equal(removed, scenarioCase.expected.removed);
}

async function runSetAllReplaces(scenarioCase: ScenarioCaseMap['set-all-replaces']): Promise<void> {
  const store = makeUserStore();
  await store.upsertMany(scenarioCase.input.initial);
  await store.setAll(scenarioCase.input.next);
  assert.equal(store.size, scenarioCase.expected.size);
  assert.deepEqual(store.getIds(), scenarioCase.expected.ids);
  for (const id of scenarioCase.expected.missing) {
    assert.equal(store.getById(id), undefined);
  }
  assert.deepEqual(store.getById(scenarioCase.expected.entity.id), scenarioCase.expected.entity);
}

async function runSetAllEmpty(scenarioCase: ScenarioCaseMap['set-all-empty']): Promise<void> {
  const store = makeUserStore();
  await store.upsertMany(scenarioCase.input.initial);
  await store.setAll(scenarioCase.input.next);
  assert.equal(store.size, scenarioCase.expected.size);
}

async function runGetAllInsertionOrder(scenarioCase: ScenarioCaseMap['get-all-insertion-order']): Promise<void> {
  const store = makeUserStore();
  await store.upsertMany(scenarioCase.input.entities);
  assert.deepEqual(store.getAll().map((entity) => entity.id), scenarioCase.expected.ids);
}

async function runGetAllSorted(scenarioCase: ScenarioCaseMap['get-all-sorted']): Promise<void> {
  const store = makeSortedUserStore();
  await store.upsertMany(scenarioCase.input.entities);
  assert.deepEqual(store.getAll().map((entity) => entity.id), scenarioCase.expected.ids);
}

async function runGetAllDefensiveSnapshot(scenarioCase: ScenarioCaseMap['get-all-defensive-snapshot']): Promise<void> {
  const store = makeSortedUserStore();
  await store.upsertMany(scenarioCase.input.entities);
  const snapshot = store.getAll();
  Reflect.set(snapshot, 0, scenarioCase.input.snapshotMutation);
  assert.deepEqual(store.getAll().map((entity) => entity.id), scenarioCase.expected.ids);
  assert.equal(scenarioCase.expected.defensiveCopy, true);
}

async function runGetAllCacheInvalidated(scenarioCase: ScenarioCaseMap['get-all-cache-invalidated']): Promise<void> {
  const store = makeSortedUserStore();

  await store.upsertMany(scenarioCase.input.entities);
  const idsBeforeMutation = store.getAll().map((entity) => entity.id);
  assert.deepEqual(idsBeforeMutation, scenarioCase.expected.idsBeforeMutation);
  assert.deepEqual(store.getAll().map((entity) => entity.id), scenarioCase.expected.idsBeforeMutation);

  await store.upsertOne(scenarioCase.input.mutation);
  const idsAfterMutation = store.getAll().map((entity) => entity.id);
  assert.deepEqual(idsAfterMutation, scenarioCase.expected.idsAfterMutation);
}

async function runDeepDetachedGetters(scenarioCase: ScenarioCaseMap['deep-detached-getters']): Promise<void> {
  const store = makeNestedStore();
  await store.upsertOne(scenarioCase.input.entity);
  const byId = requireNestedUser(store.getById(scenarioCase.input.entity.id), 'getById result');
  mutateNestedUser(byId, scenarioCase.input.mutations.byId);
  const first = requireNestedUser(store.getAll()[0], 'getAll first result');
  mutateNestedUser(first, scenarioCase.input.mutations.all);
  assert.deepEqual(store.getById(scenarioCase.input.entity.id), scenarioCase.expected.entity);
}

async function runIdsSizeReflectOperations(scenarioCase: ScenarioCaseMap['ids-size-reflect-operations']): Promise<void> {
  const store = makeUserStore();
  assert.equal(store.size, scenarioCase.input.initial);
  assertStoreCheckpoint(store, scenarioCase.expected.checkpoints.initial);
  await store.upsertMany(scenarioCase.input.entities);
  assertStoreCheckpoint(store, scenarioCase.expected.checkpoints.afterBatch);
  await store.upsertOne(scenarioCase.input.added);
  assertStoreCheckpoint(store, scenarioCase.expected.checkpoints.afterAdd);
  await store.removeOne(scenarioCase.input.removedId);
  assert.equal(store.size, scenarioCase.expected.size);
  assert.deepEqual(store.getIds(), scenarioCase.expected.ids);
  assert.equal(store.getById(scenarioCase.expected.missingId), undefined);
  assert.deepEqual(store.getById(scenarioCase.expected.entity.id), scenarioCase.expected.entity);
}

async function runHooksUpsertOverwrite(scenarioCase: ScenarioCaseMap['hooks-upsert-overwrite']): Promise<void> {
  const store = RecordingStore.create({ selectId });
  await store.upsertOne(requireUser(scenarioCase.input.entities[0], 'first upsert entity'));
  await store.upsertOne(requireUser(scenarioCase.input.entities[1], 'second upsert entity'));
  assert.deepEqual(store.log.filter((event) => event.event === 'upsert'), scenarioCase.expected.events);
}

async function runHooksUpsertMany(scenarioCase: ScenarioCaseMap['hooks-upsert-many']): Promise<void> {
  const store = RecordingStore.create({ selectId });
  await store.upsertMany(scenarioCase.input.entities);
  const upserts = store.log.filter((event) => event.event === 'upsert');
  assert.equal(upserts.length, scenarioCase.expected.upsertCount);
  assert.deepEqual(upserts.map((event) => event.id), scenarioCase.expected.ids);
}

async function runHooksRemoveOnlyWhenExists(scenarioCase: ScenarioCaseMap['hooks-remove-only-when-exists']): Promise<void> {
  const store = RecordingStore.create({ selectId });
  await store.upsertOne(scenarioCase.input.entity);
  store.log.length = 0;
  await store.removeOne(scenarioCase.input.missingId);
  assert.equal(store.log.length, scenarioCase.expected.missingRemoves);
  await store.removeOne(scenarioCase.input.presentId);
  assert.equal(store.log.length, scenarioCase.expected.existingRemoves);
  assert.deepEqual(store.log[0], scenarioCase.expected.event);
}

async function runHooksRemoveMany(scenarioCase: ScenarioCaseMap['hooks-remove-many']): Promise<void> {
  const store = RecordingStore.create({ selectId });
  await store.upsertMany(scenarioCase.input.entities);
  store.log.length = 0;
  const removed = await store.removeMany(scenarioCase.input.ids);
  assert.equal(removed, scenarioCase.expected.removed);
  const removeEvents = store.log.filter((event) => event.event === 'remove');
  assert.deepEqual(removeEvents, scenarioCase.expected.removeEvents);
}

async function runHooksReplaceAll(scenarioCase: ScenarioCaseMap['hooks-replace-all-count'] | ScenarioCaseMap['hooks-replace-all-empty']): Promise<void> {
  const store = RecordingStore.create({ selectId });
  await store.upsertMany(scenarioCase.input.initial);
  store.log.length = 0;
  await store.setAll(scenarioCase.input.next);
  assert.deepEqual(store.log.filter((event) => event.event === 'replaceAll'), scenarioCase.expected.replaceEvents);
}

async function runHooksAllOverridden(scenarioCase: ScenarioCaseMap['hooks-all-overridden']): Promise<void> {
  const store = RecordingStore.create({ selectId });
  const operations = {
    removeOne: async (): Promise<void> => {
      await store.removeOne(scenarioCase.input.removeOne);
    },
    setAll: async (): Promise<void> => {
      await store.setAll(scenarioCase.input.setAll);
    },
    upsertMany: async (): Promise<void> => {
      await store.upsertMany(scenarioCase.input.upsertMany);
    },
    upsertOne: async (): Promise<void> => {
      await store.upsertOne(scenarioCase.input.upsertOne);
    }
  } satisfies Record<HookOperationType, () => Promise<void>>;

  for (const step of scenarioCase.input.steps) {
    await operations[step]();
  }
  assert.deepEqual(store.log.map((event) => event.event), scenarioCase.expected.events);
}

async function runThrowingOnUpsertPreservesStore(scenarioCase: ScenarioCaseMap['throwing-on-upsert-preserves-store']): Promise<void> {
  const store = makeThrowingUpsertStore(() => new Error(scenarioCase.input.failure.message));
  await store.upsertOne(scenarioCase.input.entity);
  assert.equal(store.size, scenarioCase.expected.size);
  assert.deepEqual(store.getById(scenarioCase.input.entity.id), scenarioCase.expected.entity);
  assert.equal(store.hookErrorCount, scenarioCase.expected.hookErrorCount);
}

async function runThrowingOnRemovePreservesRemoval(scenarioCase: ScenarioCaseMap['throwing-on-remove-preserves-removal']): Promise<void> {
  const store = makeThrowingRemoveStore(scenarioCase.input.failure.message);
  await store.upsertOne(scenarioCase.input.entity);
  assert.equal(await store.removeOne(scenarioCase.input.entity.id), scenarioCase.expected.removed);
  assert.equal(store.size, scenarioCase.expected.size);
  assert.equal(store.getById(scenarioCase.input.entity.id), undefined);
  assert.equal(store.hookErrorCount, scenarioCase.expected.hookErrorCount);
}

async function runThrowingOnReplaceAllPreservesSwap(scenarioCase: ScenarioCaseMap['throwing-on-replace-all-preserves-swap']): Promise<void> {
  const store = makeThrowingReplaceAllStore(scenarioCase.input.failure.message);
  await store.upsertOne(scenarioCase.input.initial);
  await store.setAll([scenarioCase.input.next]);
  assert.equal(store.size, scenarioCase.expected.size);
  assert.equal(store.getById(scenarioCase.input.initial.id), undefined);
  assert.deepEqual(store.getById(scenarioCase.input.next.id), scenarioCase.expected.entity);
  assert.equal(store.hookErrorCount, scenarioCase.expected.hookErrorCount);
}

async function runHookFailureRecordedBatchContinues(scenarioCase: ScenarioCaseMap['hook-failure-recorded-batch-continues']): Promise<void> {
  const store = makeSelectiveThrowingUpsertStore(scenarioCase.input.failure);
  await store.upsertMany(scenarioCase.input.entities);
  assert.equal(store.size, scenarioCase.expected.size);
  for (const [id, entity] of Object.entries(scenarioCase.expected.entities)) {
    assert.deepEqual(store.getById(id), entity);
  }
  assert.equal(store.hookErrorCount, scenarioCase.expected.hookErrorCount);
  const errors = store.getHookErrors();
  assert.equal(errors.length, scenarioCase.expected.hookErrorCount);
  assert.equal(errors[0]?.hookName, scenarioCase.expected.hookName);
  assert.ok(errors[0]?.cause instanceof Error);
}

async function runHookErrorsDefensiveCopy(scenarioCase: ScenarioCaseMap['hook-errors-defensive-copy']): Promise<void> {
  const store = makeThrowingUpsertStore(() => new Error(scenarioCase.input.failure.message));
  await store.upsertOne(scenarioCase.input.entity);
  assert.equal(store.hookErrorCount, scenarioCase.expected.hookErrorCount);
  const errors = [...store.getHookErrors()];
  errors.length = 0;
  assert.equal(store.hookErrorCount, scenarioCase.expected.hookErrorCount);
  assert.equal(scenarioCase.expected.defensiveCopy, true);
}

async function runHookErrorsDeeplyDetached(scenarioCase: ScenarioCaseMap['hook-errors-deeply-detached']): Promise<void> {
  const error = new Error(scenarioCase.input.failure.message, { cause: scenarioCase.input.cause });
  const store = makeThrowingUpsertStore(() => error);
  await store.upsertOne(scenarioCase.input.entity);
  assert.equal(store.hookErrorCount, scenarioCase.expected.hookErrorCount);
  const firstCause = requireHookErrorCause(store, scenarioCase.expected.hookName, 'first read');
  firstCause.message = scenarioCase.input.mutation.message;
  const firstDetails = firstCause.cause;
  assert.ok(firstDetails !== null && typeof firstDetails === 'object');
  const firstAttempts = Reflect.get(firstDetails, 'attempts');
  assert.ok(Array.isArray(firstAttempts));
  firstAttempts.push(scenarioCase.input.mutation.attempt);
  const secondCause = requireHookErrorCause(store, scenarioCase.expected.hookName, 'second read');
  assert.equal(secondCause.message, scenarioCase.expected.cause.message);
  assert.deepEqual(secondCause.cause, scenarioCase.expected.cause.details);
}

async function runAsyncRejectionRoutedNoUnhandled(scenarioCase: ScenarioCaseMap['async-rejection-routed-no-unhandled']): Promise<void> {
  const store = makeAsyncRejectingUpsertStore(scenarioCase.input.failure.message);
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => {
    rejectionEvents.push(reason);
  };
  process.on('unhandledRejection', onUnhandledRejection);
  try {
    await store.upsertOne(scenarioCase.input.entity);
    assert.equal(store.size, scenarioCase.expected.size);
    assert.deepEqual(store.getById(scenarioCase.input.entity.id), scenarioCase.expected.entity);
    assert.equal(store.hookErrorCount, scenarioCase.expected.hookErrorCount);
    assert.equal(store.getHookErrors()[0]?.hookName, scenarioCase.expected.hookName);
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
    assert.equal(rejectionEvents.length, scenarioCase.expected.unhandledRejections);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
}

async function runHookFailuresIsolatedPerInstance(scenarioCase: ScenarioCaseMap['hook-failures-isolated-per-instance']): Promise<void> {
  const firstStore = makeIsolatedFailureStore(scenarioCase.input.failureMessagePrefix);
  const secondStore = makeIsolatedFailureStore(scenarioCase.input.failureMessagePrefix);
  await firstStore.upsertOne(scenarioCase.input.first);
  await secondStore.upsertOne(scenarioCase.input.second);
  assert.equal(firstStore.hookErrorCount, scenarioCase.expected.first.hookErrorCount);
  assert.equal(secondStore.hookErrorCount, scenarioCase.expected.second.hookErrorCount);
  const firstCause = requireHookErrorCause(firstStore, scenarioCase.expected.hookName, 'first store');
  const secondCause = requireHookErrorCause(secondStore, scenarioCase.expected.hookName, 'second store');
  assert.equal(firstCause.message, scenarioCase.expected.first.message);
  assert.equal(secondCause.message, scenarioCase.expected.second.message);
}

const runnerMap: RunnerMap = {
  'async-rejection-routed-no-unhandled': runAsyncRejectionRoutedNoUnhandled,
  'deep-detached-getters': runDeepDetachedGetters,
  'get-all-cache-invalidated': runGetAllCacheInvalidated,
  'get-all-defensive-snapshot': runGetAllDefensiveSnapshot,
  'get-all-insertion-order': runGetAllInsertionOrder,
  'get-all-sorted': runGetAllSorted,
  'hook-errors-deeply-detached': runHookErrorsDeeplyDetached,
  'hook-errors-defensive-copy': runHookErrorsDefensiveCopy,
  'hook-failure-recorded-batch-continues': runHookFailureRecordedBatchContinues,
  'hook-failures-isolated-per-instance': runHookFailuresIsolatedPerInstance,
  'hooks-all-overridden': runHooksAllOverridden,
  'hooks-remove-many': runHooksRemoveMany,
  'hooks-remove-only-when-exists': runHooksRemoveOnlyWhenExists,
  'hooks-replace-all-count': runHooksReplaceAll,
  'hooks-replace-all-empty': runHooksReplaceAll,
  'hooks-upsert-many': runHooksUpsertMany,
  'hooks-upsert-overwrite': runHooksUpsertOverwrite,
  'ids-size-reflect-operations': runIdsSizeReflectOperations,
  'remove-many-count': runRemoveManyCount,
  'remove-many-empty': runRemoveManyEmpty,
  'remove-one-missing': runRemoveOneMissing,
  'remove-one-removes': runRemoveOneRemoves,
  'set-all-empty': runSetAllEmpty,
  'set-all-replaces': runSetAllReplaces,
  'snapshot-retention-paths': runSnapshotRetentionPaths,
  'throwing-on-remove-preserves-removal': runThrowingOnRemovePreservesRemoval,
  'throwing-on-replace-all-preserves-swap': runThrowingOnReplaceAllPreservesSwap,
  'throwing-on-upsert-preserves-store': runThrowingOnUpsertPreservesStore,
  'upsert-many-batch': runUpsertManyBatch,
  'upsert-many-empty': runUpsertManyEmpty,
  'upsert-one-inserts': runUpsertOneInserts,
  'upsert-one-overwrites': runUpsertOneOverwrites
};

async function dispatchCase<K extends ScenarioShape>(shape: K, scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> {
  await runnerMap[shape](scenarioCase);
}

async function runCase<K extends ScenarioShape>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> {
  await dispatchCase(scenarioCase.shape, scenarioCase);
}

void describe('EntityStore', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
