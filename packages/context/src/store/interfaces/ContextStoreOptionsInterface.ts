import type { StoreInterface, StoreSynchronizationIdentityInterface } from '@studnicky/store/interfaces';

import type { ContextInterface } from '../../interfaces/ContextInterface.js';

/** Configures a store whose backing instance is isolated by an active Context scope. */
export interface ContextStoreOptionsInterface<TState> {
  readonly 'context': ContextInterface;
  readonly 'createStore': () => StoreInterface<TState>;
  readonly 'key': string;
  readonly 'synchronizationIdentity': StoreSynchronizationIdentityInterface;
}
