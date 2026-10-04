import type { IndexedDbRequestInterface } from './IndexedDbRequestInterface.js';

/** The slice of an `IDBFactory` the helpers drive. */
export interface IndexedDbFactoryInterface {
  open(name: string, version?: number): IndexedDbRequestInterface;
}
