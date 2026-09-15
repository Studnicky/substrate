import { RuntimeError } from '@studnicky/errors/node';
import { Predicates } from '@studnicky/types/node';

import type { ContextConfigEntity } from '../entities/ContextConfigEntity.js';
import type { ContextConstructorInterface } from '../interfaces/ContextConstructorInterface.js';
import type { ContextStorageInterface } from '../interfaces/ContextStorageInterface.js';

import * as ContextModule from '../context/Context.js';
import { ContextConfigError, ContextError } from '../errors/ContextError.js';
import { ContextAsyncRuntime } from './ContextAsyncRuntime.js';
import { NodeContextStorage } from './NodeContextStorage.js';

export class Context extends ContextModule.Context {
  static override create<TInstance extends Context = Context>(
    this: ContextConstructorInterface<TInstance>,
    config: ContextConfigEntity.Type,
    storage: ContextStorageInterface = new NodeContextStorage()
  ): TInstance {
    const result = super.create(config, storage);
    if (!Predicates.isInstanceOf<TInstance>(result, this)) {
      throw RuntimeError.create('Context.create() did not construct the requested subclass.');
    }
    return result;
  }
}

export { ContextAsyncRuntime, ContextConfigError, ContextError };
