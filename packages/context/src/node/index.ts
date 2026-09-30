
import type { ContextStorageInterface } from '../interfaces/ContextStorageInterface.js';

import * as ContextModule from '../context/Context.js';
import { ContextConfigEntity } from '../entities/ContextConfigEntity.js';
import { ContextConfigError, ContextError } from '../errors/ContextError.js';
import { UnsupportedSourceExtensionError } from '../errors/UnsupportedSourceExtensionError.js';
import { ContextAsyncRuntime } from './ContextAsyncRuntime.js';
import { NodeContextStorage } from './NodeContextStorage.js';

export class Context extends ContextModule.Context {
  static override create(
    config: ContextConfigEntity.InputType,
    storage: ContextStorageInterface = new NodeContextStorage()
  ): Context {
    return new Context(ContextConfigEntity.create(config), storage);
  }
}

export { ContextAsyncRuntime, ContextConfigError, ContextError, UnsupportedSourceExtensionError };
