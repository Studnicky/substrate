import type { IndexedDbFactoryInterface } from './interfaces/IndexedDbFactoryInterface.js';

declare const indexedDB: IndexedDbFactoryInterface;

/** Writes a value of the wrong type into a store's database, bypassing the store's own encoding. */
export class IndexedDbSeed {
  static async writeNumber(databaseName: string, storeName: string, key: string, value: number): Promise<void> {
    const request = indexedDB.open(databaseName);
    const opened = Promise.withResolvers<void>();

    request.addEventListener('upgradeneeded', (): void => {
      request.result.createObjectStore(storeName);
    }, { 'once': true });
    request.addEventListener('success', (): void => { opened.resolve(); }, { 'once': true });
    await opened.promise;
    const database = request.result;
    const written = Promise.withResolvers<void>();
    const transaction = database.transaction(storeName, 'readwrite');

    transaction.objectStore(storeName).put(value, key);
    transaction.addEventListener('complete', (): void => { written.resolve(); }, { 'once': true });
    await written.promise;
    database.close();
  }
}
