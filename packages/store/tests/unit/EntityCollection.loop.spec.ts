import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EntityCollection } from '../../src/entity/EntityCollection.js';

interface UserInterface {
  readonly 'id': string;
  readonly 'name': string;
}

class EntityCollectionTests {
  static declares(): void {
    void it('normalizes ids, preserves insertion order, and replaces existing entities', () => {
      const first: UserInterface = { 'id': 'first', 'name': 'Ada' };
      const replacement: UserInterface = { 'id': 'first', 'name': 'Ada Lovelace' };
      const second: UserInterface = { 'id': 'second', 'name': 'Grace' };
      const initial = EntityCollection.empty<UserInterface>();
      const populated = EntityCollection.upsertMany(initial, [first, second, replacement], (user): string => {
        const result = user.id;

        return result;
      });

      assert.deepEqual(populated.ids, ['first', 'second']);
      assert.deepEqual(EntityCollection.getAll(populated), [replacement, second]);
      assert.strictEqual(populated.entities.first, replacement);
    });

    void it('removes only extant ids and retains a JSON-safe plain record for hostile string ids', () => {
      const entity: UserInterface = { 'id': '__proto__', 'name': 'safe key' };
      const populated = EntityCollection.upsertOne(EntityCollection.empty<UserInterface>(), entity, (user): string => {
        const result = user.id;

        return result;
      });
      const removed = EntityCollection.removeMany(populated, ['missing', '__proto__']);

      assert.equal(Object.getPrototypeOf(populated.entities), Object.prototype);
      assert.strictEqual(populated.entities.__proto__, entity);
      assert.deepEqual(removed, { 'entities': {}, 'ids': [] });
      assert.strictEqual(EntityCollection.removeOne(removed, 'missing'), removed);
    });
  }
}

void describe('EntityCollection', () => {
  EntityCollectionTests.declares();
});
