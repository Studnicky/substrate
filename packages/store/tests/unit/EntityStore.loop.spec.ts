import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EntityCollection } from '../../src/entity/EntityCollection.js';
import { EntityStore } from '../../src/entity/EntityStore.js';
import { MemoryPersistence } from '../../src/MemoryPersistence.js';
import { Store } from '../../src/node/Store.js';

interface UserInterface {
  readonly 'id': string;
  readonly 'name': string;
}

class EntityStoreTests {
  static declares(): void {
    void it('persists entity mutations and relays Store subscriptions through the facade', async () => {
      const persistence = MemoryPersistence.create<ReturnType<typeof EntityCollection.empty<UserInterface>>>();
      const backing = Store.create({
        'initialState': EntityCollection.empty<UserInterface>(),
        'key': 'users',
        'persistence': persistence
      });
      const users = EntityStore.create({
        'selectId': (user: UserInterface): string => {
          const result = user.id;

          return result;
        },
        'store': backing
      });
      const receivedIds: string[][] = [];
      users.subscribe((snapshot): void => {
        receivedIds.push([...snapshot.ids]);
      });
      const supplied = { 'id': 'ada', 'name': 'Ada' };

      await users.upsertOne(supplied);
      supplied.name = 'mutated';

      assert.deepEqual(users.getAll(), [{ 'id': 'ada', 'name': 'Ada' }]);
      assert.deepEqual(receivedIds, [['ada']]);

      const hydratedBacking = Store.create({
        'initialState': EntityCollection.empty<UserInterface>(),
        'key': 'users',
        'persistence': persistence
      });
      await hydratedBacking.hydrate();
      const hydrated = EntityStore.create({
        'selectId': (user: UserInterface): string => {
          const result = user.id;

          return result;
        },
        'store': hydratedBacking
      });

      assert.deepEqual(hydrated.getById('ada'), { 'id': 'ada', 'name': 'Ada' });
      assert.equal(await hydrated.removeOne('ada'), true);
      assert.equal(await hydrated.removeOne('missing'), false);
      assert.deepEqual(hydrated.getIds(), []);
    });
  }
}

void describe('EntityStore', () => {
  EntityStoreTests.declares();
});
