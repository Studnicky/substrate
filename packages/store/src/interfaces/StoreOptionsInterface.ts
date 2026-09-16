import type { MutexInterface } from '@studnicky/mutex/interfaces';

import type { StatePersistenceInterface } from './StatePersistenceInterface.js';

export interface StoreOptionsInterface<TState> {
  readonly 'initialState': TState;
  readonly 'key': string;
  readonly 'mutex'?: MutexInterface<string>;
  readonly 'persistence': StatePersistenceInterface<TState>;
}
