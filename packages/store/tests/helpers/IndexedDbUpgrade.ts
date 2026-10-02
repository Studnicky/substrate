import type { IndexedDbFactoryInterface } from './interfaces/IndexedDbFactoryInterface.js';

import { StoreTestError } from './StoreTestError.js';

declare const indexedDB: IndexedDbFactoryInterface;

/** Opens a database at a higher schema version from outside the store, forcing the store's connection to release. */
export class IndexedDbUpgrade {
  static async upgrade(name: string, version: number): Promise<void> {
    const request = indexedDB.open(name, version);

    await new Promise<void>((resolve, reject): void => {
      request.addEventListener('blocked', (): void => {
        reject(new StoreTestError('IndexedDB upgrade remained blocked'));
      }, { 'once': true });
      request.addEventListener('error', (): void => {
        reject(new StoreTestError('IndexedDB upgrade failed', request.error));
      }, { 'once': true });
      request.addEventListener('success', (): void => {
        request.result.close();
        resolve();
      }, { 'once': true });
    });
  }
}
