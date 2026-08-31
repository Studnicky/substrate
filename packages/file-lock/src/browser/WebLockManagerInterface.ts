/** Native Web Locks API surface used by `WebLock`. */
export interface WebLockManagerInterface {
  'request': (
    name: string,
    options: { readonly 'mode': 'exclusive' },
    callback: () => Promise<undefined>
  ) => Promise<undefined>;
}
