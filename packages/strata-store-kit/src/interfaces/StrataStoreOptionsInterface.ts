import type { MutexInterface } from '@studnicky/mutex/interfaces';
import type { StoreInterface } from '@studnicky/store/interfaces';

export interface StrataStoreOptionsInterface<TState> {
  readonly 'layers': readonly StoreInterface<TState>[];
  readonly 'mutex'?: MutexInterface<string>;
  readonly 'mutexKey'?: string;
}
