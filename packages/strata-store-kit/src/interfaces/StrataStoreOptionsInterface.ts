import type { StoreInterface } from '@studnicky/store/interfaces';

export interface StrataStoreOptionsInterface<TState> {
  readonly 'layers': readonly StoreInterface<TState>[];
}
