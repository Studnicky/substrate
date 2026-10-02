
import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import type { HookEventEntity } from './entities/common/HookEventEntity.js';
import type { NestedUserEntity } from './entities/common/NestedUserEntity.js';
import type { OperationCheckpointsEntity } from './entities/common/OperationCheckpointsEntity.js';
import type { SelectiveHookFailureEntity } from './entities/common/SelectiveHookFailureEntity.js';
import type { SnapshotRetentionMutationsEntity } from './entities/common/SnapshotRetentionMutationsEntity.js';
import type { UserEntity } from './entities/common/UserEntity.js';

import { EntityStore } from '../../src/EntityStore.js';
import { EntityStoreScenarioCaseEntity } from './entities/EntityStoreScenarioCaseEntity.js';
import scenarioGroups from './EntityStore.scenarios.json' with { 'type': 'json' };
import { EntityStoreTestFixtures } from './helpers/EntityStoreTestFixtures.js';













class RecordingStore extends EntityStore<UserEntity.Type, string> {
  readonly log: HookEventEntity.Type[] = [];

  protected override onUpsert(id: string, entity: UserEntity.Type): void {
    this.log.push({ 'entity': entity, 'event': 'upsert', 'id': id });
  }

  protected override onRemove(id: string): void {
    this.log.push({ 'event': 'remove', 'id': id });
  }

  protected override onReplaceAll(count: number): void {
    this.log.push({ 'count': count, 'event': 'replaceAll' });
  }
}

class EntityStoreScenarioFixtures {
  static makeUserStore(): EntityStore<UserEntity.Type, string> {
    const result = EntityStore.create<UserEntity.Type>({ 'selectId': (entity) => { return entity.id; } });
    return result;
  }

  static makeSortedUserStore(): EntityStore<UserEntity.Type, string> {
    const result = EntityStore.create<UserEntity.Type>({
      'selectId': (entity) => { return entity.id; },
      'sortComparer': EntityStoreScenarioFixtures.compareUsersByName
    });
    return result;
  }

  static makeNestedStore(): EntityStore<NestedUserEntity.Type, string> {
    const result = EntityStore.create<NestedUserEntity.Type>({ 'selectId': (entity) => { return entity.id; } });
    return result;
  }

  static makeThrowingUpsertStore(error: RuntimeError): EntityStore<UserEntity.Type, string> {
    class ThrowingUpsertStore extends EntityStore<UserEntity.Type, string> {
      protected override onUpsert(): void {
        throw error;
      }
    }

    const result = ThrowingUpsertStore.create<UserEntity.Type>({ 'selectId': (entity) => { return entity.id; } });
    return result;
  }

  static makeThrowingRemoveStore(message: string): EntityStore<UserEntity.Type, string> {
    class ThrowingRemoveStore extends EntityStore<UserEntity.Type, string> {
      protected override onRemove(): void {
        throw RuntimeError.create(message);
      }
    }

    const result = ThrowingRemoveStore.create<UserEntity.Type>({ 'selectId': (entity) => { return entity.id; } });
    return result;
  }

  static makeThrowingReplaceAllStore(message: string): EntityStore<UserEntity.Type, string> {
    class ThrowingReplaceAllStore extends EntityStore<UserEntity.Type, string> {
      protected override onReplaceAll(): void {
        throw RuntimeError.create(message);
      }
    }

    const result = ThrowingReplaceAllStore.create<UserEntity.Type>({ 'selectId': (entity) => { return entity.id; } });
    return result;
  }

  static makeSelectiveThrowingUpsertStore(failure: SelectiveHookFailureEntity.Type): EntityStore<UserEntity.Type, string> {
    class SelectiveThrowingStore extends EntityStore<UserEntity.Type, string> {
      protected override onUpsert(id: string): void {
        if (id === failure.id) {
          throw RuntimeError.create(failure.message);
        }
      }
    }

    const result = SelectiveThrowingStore.create<UserEntity.Type>({ 'selectId': (entity) => { return entity.id; } });
    return result;
  }

  static makeAsyncRejectingUpsertStore(message: string): EntityStore<UserEntity.Type, string> {
    class AsyncRejectingUpsertStore extends EntityStore<UserEntity.Type, string> {
      protected override async onUpsert(): Promise<void> {
        await Promise.resolve();
        throw RuntimeError.create(message);
      }
    }

    const result = AsyncRejectingUpsertStore.create<UserEntity.Type>({ 'selectId': (entity) => { return entity.id; } });
    return result;
  }

  static makeIsolatedFailureStore(messagePrefix: string): EntityStore<UserEntity.Type, string> {
    class IsolatedFailureStore extends EntityStore<UserEntity.Type, string> {
      protected override onUpsert(id: string): void {
        throw RuntimeError.create(`${messagePrefix} ${id}`);
      }
    }

    const result = IsolatedFailureStore.create<UserEntity.Type>({ 'selectId': (entity) => { return entity.id; } });
    return result;
  }

  static compareUsersByName(a: UserEntity.Type, b: UserEntity.Type): number {
    const result = a.name.localeCompare(b.name);
    return result;
  }

  static mutateNestedUser(entity: NestedUserEntity.Type, mutation: SnapshotRetentionMutationsEntity.Type['upserted']): void {
    entity.profile.name = mutation.profileName;
    entity.roles.push(mutation.role);
  }

  static requireUser(entity: UserEntity.Type | undefined, label: string): UserEntity.Type {
    assert.ok(entity !== undefined, `${label} should exist`);
    return entity;
  }

  static requireNestedUser(entity: NestedUserEntity.Type | undefined, label: string): NestedUserEntity.Type {
    assert.ok(entity !== undefined, `${label} should exist`);
    return entity;
  }

  static requireHookErrorCause(store: EntityStore<UserEntity.Type, string>, hookName: string, label: string): Error {
    const hookError = store.getHookErrors()[0];
    assert.ok(hookError !== undefined, `${label} hook error should exist`);
    assert.equal(hookError.hookName, hookName);
    assert.ok(hookError.cause instanceof Error, `${label} cause should be an Error`);
    return hookError.cause;
  }

  static assertStoreCheckpoint(store: EntityStore<UserEntity.Type, string>, checkpoint: OperationCheckpointsEntity.Type['initial']): void {
    assert.equal(store.size, checkpoint.size);
    assert.deepEqual(store.getIds(), checkpoint.ids);
  }
}
const makeNestedStore = EntityStoreScenarioFixtures.makeNestedStore;
const makeSortedUserStore = EntityStoreScenarioFixtures.makeSortedUserStore;
const makeThrowingUpsertStore = EntityStoreScenarioFixtures.makeThrowingUpsertStore;
const makeThrowingRemoveStore = EntityStoreScenarioFixtures.makeThrowingRemoveStore;
const makeThrowingReplaceAllStore = EntityStoreScenarioFixtures.makeThrowingReplaceAllStore;
const makeSelectiveThrowingUpsertStore = EntityStoreScenarioFixtures.makeSelectiveThrowingUpsertStore;
const makeAsyncRejectingUpsertStore = EntityStoreScenarioFixtures.makeAsyncRejectingUpsertStore;
const makeIsolatedFailureStore = EntityStoreScenarioFixtures.makeIsolatedFailureStore;
const mutateNestedUser = EntityStoreScenarioFixtures.mutateNestedUser;
const requireUser = EntityStoreScenarioFixtures.requireUser;
const requireNestedUser = EntityStoreScenarioFixtures.requireNestedUser;
const requireHookErrorCause = EntityStoreScenarioFixtures.requireHookErrorCause;
const assertStoreCheckpoint = EntityStoreScenarioFixtures.assertStoreCheckpoint;
class EntityStoreScenarioRunners {
  static async 'upsert-one-inserts'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'upsert-one-inserts' }>): Promise<void> {

    const store = EntityStoreTestFixtures.userStore();
    await store.upsertOne(scenarioCase.input.entity);
    assert.equal(store.size, scenarioCase.expected.size);
    assert.deepEqual(store.getById(scenarioCase.input.entity.id), scenarioCase.expected.entity);
  }
  static async 'upsert-one-overwrites'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'upsert-one-overwrites' }>): Promise<void> {

    const store = EntityStoreTestFixtures.userStore();
    await store.upsertOne(scenarioCase.input.initial);
    await store.upsertOne(scenarioCase.input.next);
    assert.equal(store.size, scenarioCase.expected.size);
    assert.deepEqual(store.getById(scenarioCase.input.next.id), scenarioCase.expected.entity);
  }
  static async 'upsert-many-batch'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'upsert-many-batch' }>): Promise<void> {

    const store = EntityStoreTestFixtures.userStore();
    await store.upsertMany(scenarioCase.input.entities);
    assert.equal(store.size, scenarioCase.expected.size);
    assert.deepEqual(store.getById(scenarioCase.expected.entity.id), scenarioCase.expected.entity);
  }
  static async 'upsert-many-empty'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'upsert-many-empty' }>): Promise<void> {

    const store = EntityStoreTestFixtures.userStore();
    await store.upsertMany(scenarioCase.input.entities);
    assert.equal(store.size, scenarioCase.expected.size);
  }

  static async 'snapshot-retention-paths'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'snapshot-retention-paths' }>): Promise<void> {
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
  static async 'remove-one-removes'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'remove-one-removes' }>): Promise<void> {

    const store = EntityStoreTestFixtures.userStore();
    await store.upsertOne(scenarioCase.input.entity);
    const result = await store.removeOne(scenarioCase.input.entity.id);
    assert.equal(result, scenarioCase.expected.removed);
    assert.equal(store.size, scenarioCase.expected.size);
    assert.equal(store.getById(scenarioCase.input.entity.id), undefined);
  }
  static async 'remove-one-missing'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'remove-one-missing' }>): Promise<void> {

    const store = EntityStoreTestFixtures.userStore();
    const result = await store.removeOne(scenarioCase.input.id);
    assert.equal(result, scenarioCase.expected.removed);
  }
  static async 'remove-many-count'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'remove-many-count' }>): Promise<void> {

    const store = EntityStoreTestFixtures.userStore();
    await store.upsertMany(scenarioCase.input.entities);
    const removed = await store.removeMany(scenarioCase.input.ids);
    assert.equal(removed, scenarioCase.expected.removed);
    assert.equal(store.size, scenarioCase.expected.size);
  }
  static async 'remove-many-empty'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'remove-many-empty' }>): Promise<void> {

    const store = EntityStoreTestFixtures.userStore();
    const removed = await store.removeMany(scenarioCase.input.ids);
    assert.equal(removed, scenarioCase.expected.removed);
  }
  static async 'set-all-replaces'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'set-all-replaces' }>): Promise<void> {

    const store = EntityStoreTestFixtures.userStore();
    await store.upsertMany(scenarioCase.input.initial);
    await store.setAll(scenarioCase.input.next);
    assert.equal(store.size, scenarioCase.expected.size);
    assert.deepEqual(store.getIds(), scenarioCase.expected.ids);
    for (const id of scenarioCase.expected.missing) {
      assert.equal(store.getById(id), undefined);
    }
    assert.deepEqual(store.getById(scenarioCase.expected.entity.id), scenarioCase.expected.entity);
  }

  static async 'set-all-empty'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'set-all-empty' }>): Promise<void> {

    const store = EntityStoreTestFixtures.userStore();
    await store.upsertMany(scenarioCase.input.initial);
    await store.setAll(scenarioCase.input.next);
    assert.equal(store.size, scenarioCase.expected.size);
  }

  static async 'get-all-insertion-order'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'get-all-insertion-order' }>): Promise<void> {

    const store = EntityStoreTestFixtures.userStore();
    await store.upsertMany(scenarioCase.input.entities);
    assert.deepEqual(store.getAll().map((entity) => {return entity.id;}), scenarioCase.expected.ids);
  }

  static async 'get-all-sorted'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'get-all-sorted' }>): Promise<void> {
    const store = makeSortedUserStore();
    await store.upsertMany(scenarioCase.input.entities);
    assert.deepEqual(store.getAll().map((entity) => {return entity.id;}), scenarioCase.expected.ids);
  }

  static async 'get-all-defensive-snapshot'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'get-all-defensive-snapshot' }>): Promise<void> {
    const store = makeSortedUserStore();
    await store.upsertMany(scenarioCase.input.entities);
    const snapshot = store.getAll();
    Reflect.set(snapshot, 0, scenarioCase.input.snapshotMutation);
    assert.deepEqual(store.getAll().map((entity) => {return entity.id;}), scenarioCase.expected.ids);
    assert.equal(scenarioCase.expected.defensiveCopy, true);
  }

  static async 'get-all-cache-invalidated'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'get-all-cache-invalidated' }>): Promise<void> {
    const store = makeSortedUserStore();

    await store.upsertMany(scenarioCase.input.entities);
    const idsBeforeMutation = store.getAll().map((entity) => {return entity.id;});
    assert.deepEqual(idsBeforeMutation, scenarioCase.expected.idsBeforeMutation);
    assert.deepEqual(store.getAll().map((entity) => {return entity.id;}), scenarioCase.expected.idsBeforeMutation);

    await store.upsertOne(scenarioCase.input.mutation);
    const idsAfterMutation = store.getAll().map((entity) => {return entity.id;});
    assert.deepEqual(idsAfterMutation, scenarioCase.expected.idsAfterMutation);
  }

  static async 'deep-detached-getters'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'deep-detached-getters' }>): Promise<void> {
    const store = makeNestedStore();
    await store.upsertOne(scenarioCase.input.entity);
    const byId = requireNestedUser(store.getById(scenarioCase.input.entity.id), 'getById result');
    mutateNestedUser(byId, scenarioCase.input.mutations.byId);
    const first = requireNestedUser(store.getAll()[0], 'getAll first result');
    mutateNestedUser(first, scenarioCase.input.mutations.all);
    assert.deepEqual(store.getById(scenarioCase.input.entity.id), scenarioCase.expected.entity);
  }

  static async 'ids-size-reflect-operations'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'ids-size-reflect-operations' }>): Promise<void> {

    const store = EntityStoreTestFixtures.userStore();
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

  static async 'hooks-upsert-overwrite'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'hooks-upsert-overwrite' }>): Promise<void> {
    const store = RecordingStore.create({ 'selectId': (entity: UserEntity.Type): string => { return entity.id; } });
    await store.upsertOne(requireUser(scenarioCase.input.entities[0], 'first upsert entity'));
    await store.upsertOne(requireUser(scenarioCase.input.entities[1], 'second upsert entity'));
    const upsertEvents = store.log.filter((event) => {
      const result = event.event === 'upsert';
      return result;
    });
    assert.deepEqual(upsertEvents, scenarioCase.expected.events);
  }

  static async 'hooks-upsert-many'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'hooks-upsert-many' }>): Promise<void> {
    const store = RecordingStore.create({ 'selectId': (entity: UserEntity.Type): string => { return entity.id; } });
    await store.upsertMany(scenarioCase.input.entities);
    const upserts = store.log.filter((event) => {
      const result = event.event === 'upsert';
      return result;
    });
    assert.equal(upserts.length, scenarioCase.expected.upsertCount);
    assert.deepEqual(upserts.map((event) => {return event.id;}), scenarioCase.expected.ids);
  }

  static async 'hooks-remove-only-when-exists'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'hooks-remove-only-when-exists' }>): Promise<void> {
    const store = RecordingStore.create({ 'selectId': (entity: UserEntity.Type): string => { return entity.id; } });
    await store.upsertOne(scenarioCase.input.entity);
    store.log.length = 0;
    await store.removeOne(scenarioCase.input.missingId);
    assert.equal(store.log.length, scenarioCase.expected.missingRemoves);
    await store.removeOne(scenarioCase.input.presentId);
    assert.equal(store.log.length, scenarioCase.expected.existingRemoves);
    assert.deepEqual(store.log[0], scenarioCase.expected.event);
  }

  static async 'hooks-remove-many'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'hooks-remove-many' }>): Promise<void> {
    const store = RecordingStore.create({ 'selectId': (entity: UserEntity.Type): string => { return entity.id; } });
    await store.upsertMany(scenarioCase.input.entities);
    store.log.length = 0;
    const removed = await store.removeMany(scenarioCase.input.ids);
    assert.equal(removed, scenarioCase.expected.removed);
    const removeEvents = store.log.filter((event) => {
      const result = event.event === 'remove';
      return result;
    });
    assert.deepEqual(removeEvents, scenarioCase.expected.removeEvents);
  }

  static async 'hooks-replace-all-count'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'hooks-replace-all-count' }> | Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'hooks-replace-all-empty' }>): Promise<void> {
    const store = RecordingStore.create({ 'selectId': (entity: UserEntity.Type): string => { return entity.id; } });
    await store.upsertMany(scenarioCase.input.initial);
    store.log.length = 0;
    await store.setAll(scenarioCase.input.next);
    const replaceAllEvents = store.log.filter((event) => {
      const result = event.event === 'replaceAll';
      return result;
    });
    assert.deepEqual(replaceAllEvents, scenarioCase.expected.replaceEvents);
  }

  static async 'hooks-replace-all-empty'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'hooks-replace-all-empty' }>): Promise<void> {
    await EntityStoreScenarioRunners['hooks-replace-all-count'](scenarioCase);
  }

  static async 'hooks-all-overridden'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'hooks-all-overridden' }>): Promise<void> {
    const store = RecordingStore.create({ 'selectId': (entity: UserEntity.Type): string => { return entity.id; } });
    const steps = scenarioCase.input.steps;
    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      if (step === 'removeOne') {
        await store.removeOne(scenarioCase.input.removeOne);
      } else if (step === 'setAll') {
        await store.setAll(scenarioCase.input.setAll);
      } else if (step === 'upsertMany') {
        await store.upsertMany(scenarioCase.input.upsertMany);
      } else {
        await store.upsertOne(scenarioCase.input.upsertOne);
      }
    }

    const eventNames = store.log.map((event) => {
      const result = event.event;
      return result;
    });
    assert.deepEqual(eventNames, scenarioCase.expected.events);
  }

  static async 'throwing-on-upsert-preserves-store'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'throwing-on-upsert-preserves-store' }>): Promise<void> {
    const error = RuntimeError.create(scenarioCase.input.failure.message);
    const store = makeThrowingUpsertStore(error);
    await store.upsertOne(scenarioCase.input.entity);
    assert.equal(store.size, scenarioCase.expected.size);
    assert.deepEqual(store.getById(scenarioCase.input.entity.id), scenarioCase.expected.entity);
    assert.equal(store.hookErrorCount, scenarioCase.expected.hookErrorCount);
  }

  static async 'throwing-on-remove-preserves-removal'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'throwing-on-remove-preserves-removal' }>): Promise<void> {
    const store = makeThrowingRemoveStore(scenarioCase.input.failure.message);
    await store.upsertOne(scenarioCase.input.entity);
    assert.equal(await store.removeOne(scenarioCase.input.entity.id), scenarioCase.expected.removed);
    assert.equal(store.size, scenarioCase.expected.size);
    assert.equal(store.getById(scenarioCase.input.entity.id), undefined);
    assert.equal(store.hookErrorCount, scenarioCase.expected.hookErrorCount);
  }

  static async 'throwing-on-replace-all-preserves-swap'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'throwing-on-replace-all-preserves-swap' }>): Promise<void> {
    const store = makeThrowingReplaceAllStore(scenarioCase.input.failure.message);
    await store.upsertOne(scenarioCase.input.initial);
    await store.setAll([scenarioCase.input.next]);
    assert.equal(store.size, scenarioCase.expected.size);
    assert.equal(store.getById(scenarioCase.input.initial.id), undefined);
    assert.deepEqual(store.getById(scenarioCase.input.next.id), scenarioCase.expected.entity);
    assert.equal(store.hookErrorCount, scenarioCase.expected.hookErrorCount);
  }

  static async 'hook-failure-recorded-batch-continues'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'hook-failure-recorded-batch-continues' }>): Promise<void> {
    const store = makeSelectiveThrowingUpsertStore(scenarioCase.input.failure);
    await store.upsertMany(scenarioCase.input.entities);
    assert.equal(store.size, scenarioCase.expected.size);
    const expectedEntries = Object.entries(scenarioCase.expected.entities);
    for (let index = 0; index < expectedEntries.length; index += 1) {
      const entry = expectedEntries[index];
      assert.ok(entry !== undefined);
      const [id, entity] = entry;
      assert.deepEqual(store.getById(id), entity);
    }
  }

  static async 'hook-errors-defensive-copy'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'hook-errors-defensive-copy' }>): Promise<void> {
    const error = RuntimeError.create(scenarioCase.input.failure.message);
    const store = makeThrowingUpsertStore(error);
    await store.upsertOne(scenarioCase.input.entity);
    assert.equal(store.hookErrorCount, scenarioCase.expected.hookErrorCount);
    const errors = [...store.getHookErrors()];
    errors.length = 0;
    assert.equal(store.hookErrorCount, scenarioCase.expected.hookErrorCount);
    assert.equal(scenarioCase.expected.defensiveCopy, true);
  }

  static async 'hook-errors-deeply-detached'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'hook-errors-deeply-detached' }>): Promise<void> {
    const error = RuntimeError.create(scenarioCase.input.failure.message, { 'cause': scenarioCase.input.cause });
    const store = makeThrowingUpsertStore(error);
    await store.upsertOne(scenarioCase.input.entity);
    assert.equal(store.hookErrorCount, scenarioCase.expected.hookErrorCount);
    const firstCause = requireHookErrorCause(store, scenarioCase.expected.hookName, 'first read');
    firstCause.message = scenarioCase.input.mutation.message;
    const firstDetails = firstCause.cause;
    assert.ok(firstDetails !== null && typeof firstDetails === 'object');
    const firstAttempts: unknown = Reflect.get(firstDetails, 'attempts');
    assert.ok(Array.isArray(firstAttempts));
    firstAttempts.push(scenarioCase.input.mutation.attempt);
    const secondCause = requireHookErrorCause(store, scenarioCase.expected.hookName, 'second read');
    assert.equal(secondCause.message, scenarioCase.expected.cause.message);
    assert.deepEqual(secondCause.cause, scenarioCase.expected.cause.details);
  }

  static async 'async-rejection-routed-no-unhandled'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'async-rejection-routed-no-unhandled' }>): Promise<void> {
    const store = makeAsyncRejectingUpsertStore(scenarioCase.input.failure.message);
    const rejectionEvents: boolean[] = [];
    const onUnhandledRejection = (): void => {
      rejectionEvents.push(true);
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

  static async 'hook-failures-isolated-per-instance'(scenarioCase: Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'hook-failures-isolated-per-instance' }>): Promise<void> {
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

}
ScenarioSuite.register({
  'entity': EntityStoreScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'EntityStore',
  'runners': EntityStoreScenarioRunners
});
