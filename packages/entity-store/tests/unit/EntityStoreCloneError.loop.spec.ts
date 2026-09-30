import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EntityStore } from '../../src/EntityStore.js';
import { EntityStoreCloneError } from '../../src/errors/EntityStoreCloneError.js';

interface UncloneableEntityInterface {
  readonly 'id': string;
  readonly 'run': () => void;
}

const uncloneable: UncloneableEntityInterface = { 'id': 'a', 'run': (): void => {} };

const rejections = new Map<string, (store: EntityStore<UncloneableEntityInterface, string>) => Promise<void>>([
  ['upsertOne', async (store) => { await store.upsertOne(uncloneable); }],
  ['upsertMany', async (store) => { await store.upsertMany([uncloneable]); }],
  ['setAll', async (store) => { await store.setAll([uncloneable]); }]
]);

void describe('EntityStore clone failures', () => {
  for (const [operation, invoke] of rejections) {
    void it(`${operation} rejects an uncloneable entity with EntityStoreCloneError`, async () => {
      const store = EntityStore.create<UncloneableEntityInterface>({ 'selectId': (entity) => entity.id });

      await assert.rejects(invoke(store), (error: unknown) => {
        assert.ok(error instanceof EntityStoreCloneError);
        assert.equal(error.name, 'EntityStoreCloneError');
        assert.equal(error.code, 'entityStore.cloneFailed');
        assert.ok(error.cause instanceof DOMException);
        assert.equal(error.cause.name, 'DataCloneError');

        return true;
      });
      assert.equal(store.size, 0);
    });
  }
});
