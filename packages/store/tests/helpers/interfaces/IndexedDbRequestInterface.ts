import type { IndexedDbDatabaseInterface } from './IndexedDbDatabaseInterface.js';

/** The slice of an `IDBOpenDBRequest` the helpers drive. */
export interface IndexedDbRequestInterface {
  addEventListener(type: 'blocked' | 'error' | 'success' | 'upgradeneeded', listener: () => void, options: object): void;
  readonly 'error': unknown;
  readonly 'result': IndexedDbDatabaseInterface;
}
