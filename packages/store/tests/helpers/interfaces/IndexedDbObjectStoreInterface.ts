/** The slice of an `IDBObjectStore` the helpers drive. */
export interface IndexedDbObjectStoreInterface {
  put(value: number, key: string): unknown;
}
