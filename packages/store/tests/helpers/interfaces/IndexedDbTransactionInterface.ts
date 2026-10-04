import type { IndexedDbObjectStoreInterface } from './IndexedDbObjectStoreInterface.js';

/** The slice of an `IDBTransaction` the helpers drive. */
export interface IndexedDbTransactionInterface {
  addEventListener(type: 'complete', listener: () => void, options: object): void;
  objectStore(name: string): IndexedDbObjectStoreInterface;
}
