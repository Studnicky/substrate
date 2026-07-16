import type { TaskEntity } from '../entities/TaskEntity.js';

export namespace ObservedBatchFixture {
  export const Tasks: TaskEntity.Type[] = [
    { 'id': 1, 'label': 'alpha' },
    { 'id': 2, 'label': 'beta' },
    { 'id': 3, 'label': 'gamma' },
    { 'id': 4, 'label': 'delta' },
    { 'id': 5, 'label': 'epsilon' }
  ];
}
