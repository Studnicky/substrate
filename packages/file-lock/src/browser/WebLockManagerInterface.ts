interface ExclusiveWebLockOptionsInterface extends Readonly<Pick<LockOptions, 'mode'>> {
  readonly 'mode': Extract<LockOptions['mode'], 'exclusive'>;
}

/** Native Web Locks API surface used by `WebLock`. */
export interface WebLockManagerInterface {
  'request': (
    name: string,
    options: ExclusiveWebLockOptionsInterface,
    callback: () => Promise<undefined>
  ) => Promise<undefined>;
}
