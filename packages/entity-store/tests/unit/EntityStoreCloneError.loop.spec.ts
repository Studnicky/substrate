import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { EntityStoreCloneError } from '../../src/errors/EntityStoreCloneError.js';

import { EntityStore } from '../../src/EntityStore.js';

interface UncloneableEntityInterface {
  readonly 'id': string;
  readonly 'run': () => void;
}

const uncloneable: UncloneableEntityInterface = { 'id': 'a', 'run': (): void => {} };

class EntityStoreCloneErrorScenarios {
  static isCloneError(error: EntityStoreCloneError): boolean {
    assert.equal(error.name, 'EntityStoreCloneError');
    assert.equal(error.code, 'entityStore.cloneFailed');
    assert.ok(error.cause instanceof DOMException);
    assert.equal(error.cause.name, 'DataCloneError');

    const result = true;
    return result;
  }

  static selectId(entity: UncloneableEntityInterface): string {
    const id = Reflect.get(entity, 'id');
    assert.equal(typeof id, 'string');

    return id;
  }

  static async setAll(store: EntityStore<UncloneableEntityInterface, string>): Promise<void> {
    await store.setAll([uncloneable]);
  }

  static async upsertMany(store: EntityStore<UncloneableEntityInterface, string>): Promise<void> {
    await store.upsertMany([uncloneable]);
  }

  static async upsertOne(store: EntityStore<UncloneableEntityInterface, string>): Promise<void> {
    await store.upsertOne(uncloneable);
  }

  static async assertRejection(invoke: (store: EntityStore<UncloneableEntityInterface, string>) => Promise<void>): Promise<void> {
    const store = EntityStore.create<UncloneableEntityInterface>({ 'selectId': EntityStoreCloneErrorScenarios.selectId });

    await assert.rejects(invoke(store), EntityStoreCloneErrorScenarios.isCloneError);
    assert.equal(store.size, 0);
  }
}

const rejections = new Map<string, (store: EntityStore<UncloneableEntityInterface, string>) => Promise<void>>([
  ['setAll', EntityStoreCloneErrorScenarios.setAll],
  ['upsertMany', EntityStoreCloneErrorScenarios.upsertMany],
  ['upsertOne', EntityStoreCloneErrorScenarios.upsertOne]
]);

void describe('EntityStore clone failures', () => {
  for (const [operation, invoke] of rejections) {
    void it(`${operation} rejects an uncloneable entity with EntityStoreCloneError`, async () => {
      await EntityStoreCloneErrorScenarios.assertRejection(invoke);
    });
  }
});
