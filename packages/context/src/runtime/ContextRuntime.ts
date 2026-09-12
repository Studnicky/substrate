import type { ContextStorageInterface } from '../interfaces/ContextStorageInterface.js';

interface ContextStorageFactoryInterface {
  (): ContextStorageInterface;
}

export class ContextRuntime {
  static defaultStorageFactory: ContextStorageFactoryInterface | undefined;

  static registerDefaultStorage(factory: ContextStorageFactoryInterface): void {
    ContextRuntime.defaultStorageFactory = factory;
  }
}
