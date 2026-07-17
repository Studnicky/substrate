/** A recorded failure raised by a lifecycle hook override. */

// json-schema-uninexpressible: `cause` is `unknown`, not plain JSON-serializable data
export type HookErrorEntryType = {
  /** The value thrown or rejected by the hook. */
  'cause': unknown;
  /** Name of the hook that threw (`'onCheckRegistered'`, `'onCheckResult'`, `'onAggregate'`, `'onCheckTimeout'`). */
  'hookName': string;
};
