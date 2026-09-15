import { RuntimeError } from '@studnicky/errors/browser';
import { Predicates } from '@studnicky/types/browser';

import type { ContextConfigEntity } from '../entities/ContextConfigEntity.js';
import type { ContextConstructorInterface } from '../interfaces/ContextConstructorInterface.js';
import type { ContextStorageInterface } from '../interfaces/ContextStorageInterface.js';

import * as ContextModule from '../context/Context.js';
import { ContextConfigError, ContextError } from '../errors/ContextError.js';
import { BrowserContextStorage } from './BrowserContextStorage.js';
import { ContextAsyncRuntime } from './ContextAsyncRuntime.js';

export class Context extends ContextModule.Context {
  static override create<TInstance extends Context = Context>(
    this: ContextConstructorInterface<TInstance>,
    config: ContextConfigEntity.Type,
    storage: ContextStorageInterface = new BrowserContextStorage()
  ): TInstance {
    const result = super.create(config, storage);
    if (!Predicates.isInstanceOf<TInstance>(result, this)) {
      throw RuntimeError.create('Context.create() did not construct the requested subclass.');
    }
    return result;
  }
}

export { ContextAsyncRuntime, ContextConfigError, ContextError };
