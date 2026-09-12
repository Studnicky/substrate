import type { ContextInterface } from '@studnicky/context/interfaces';

import type { StoreInterface } from './StoreInterface.js';

/** Configures a store whose backing instance is isolated by an active Context scope. */
export interface ContextStoreOptionsInterface<TState> {
  readonly 'context': ContextInterface;
  readonly 'createStore': () => StoreInterface<TState>;
  readonly 'key': string;
}
