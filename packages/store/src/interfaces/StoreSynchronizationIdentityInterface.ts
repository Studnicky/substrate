import type { MutexInterface } from '@studnicky/mutex/interfaces';

/** Identifies the mutex and key that serialize a store's mutations. */
export interface StoreSynchronizationIdentityInterface {
  readonly 'key': string;
  readonly 'mutex': MutexInterface<string>;
}
