import type { ItemEntity } from '../entities/ItemEntity.js';

export namespace SettledProcessingFixture {
  export const Items: ItemEntity.Type[] = [
    { 'id': 1, 'shouldFail': false },
    { 'id': 2, 'shouldFail': true },
    { 'id': 3, 'shouldFail': false },
    { 'id': 4, 'shouldFail': false }
  ];
}
