import type { MutexInterface } from '@studnicky/mutex/interfaces';

import { Mutex } from '@studnicky/mutex/browser';

import type { StrataStoreOptionsInterface } from '../interfaces/StrataStoreOptionsInterface.js';

import { StrataStoreCore } from '../core/StrataStoreCore.js';

export class StrataStore<TState> extends StrataStoreCore<TState> {
  public static create<TState>(options: StrataStoreOptionsInterface<TState>): StrataStore<TState> {
    const result = new StrataStore(options, options.mutex ?? Mutex.create<string>());

    return result;
  }

  protected constructor(options: StrataStoreOptionsInterface<TState>, mutex: MutexInterface<string>) {
    super(options, mutex);
  }
}
