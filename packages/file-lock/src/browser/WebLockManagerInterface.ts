type ExclusiveWebLockOptions = Readonly<Pick<LockOptions, 'mode'>> & {
  readonly 'mode': Extract<LockOptions['mode'], 'exclusive'>;
};

/** Native Web Locks API surface used by `WebLock`. */
export interface WebLockManagerInterface {
  'request': (
    name: string,
    options: ExclusiveWebLockOptions,
    callback: () => Promise<undefined>
  ) => Promise<undefined>;
}
