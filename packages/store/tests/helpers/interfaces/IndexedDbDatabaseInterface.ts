import type { IndexedDbTransactionInterface } from './IndexedDbTransactionInterface.js';

/** The slice of an `IDBDatabase` the helpers drive. */
export interface IndexedDbDatabaseInterface {
  close(): void;
  createObjectStore(name: string): unknown;
  transaction(name: string, mode: 'readwrite'): IndexedDbTransactionInterface;
}
