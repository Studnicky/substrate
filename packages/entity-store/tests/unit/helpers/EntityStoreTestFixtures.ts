import type { EntityStoreScenarioCaseEntity } from '../entities/EntityStoreScenarioCaseEntity.js';

import { EntityStore } from '../../../src/EntityStore.js';

export class EntityStoreTestFixtures {
  static userStore(): EntityStore<Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'upsert-one-inserts' }>['input']['entity'], string> {
    const store = EntityStore.create<Extract<EntityStoreScenarioCaseEntity.Type, { 'shape': 'upsert-one-inserts' }>['input']['entity']>({
      'selectId': (entity): string => {
        return entity.id;
      }
    });
    return store;
  }
}
