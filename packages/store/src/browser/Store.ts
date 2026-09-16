import type { MutexInterface } from '@studnicky/mutex/interfaces';

import { Mutex } from '@studnicky/mutex/browser';

import type { StoreOptionsInterface } from '../interfaces/StoreOptionsInterface.js';

import { StoreCore } from '../core/StoreCore.js';

export class Store<TState> extends StoreCore<TState> {
  public static create<TState>(options: StoreOptionsInterface<TState>): Store<TState> {
    const result = new Store(options, options.mutex ?? Mutex.create<string>());

    return result;
  }

  protected constructor(options: StoreOptionsInterface<TState>, mutex: MutexInterface<string>) {
    super(options, mutex);
  }
}
