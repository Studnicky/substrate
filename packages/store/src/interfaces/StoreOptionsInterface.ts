import type { StatePersistenceInterface } from './StatePersistenceInterface.js';

export interface StoreOptionsInterface<TState> {
  readonly 'initialState': TState;
  readonly 'key': string;
  readonly 'persistence': StatePersistenceInterface<TState>;
}
