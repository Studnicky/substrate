/** Result of applying a patch to a target. */
export type PatchApplyResultType = {
  readonly 'error'?: string;
  readonly 'success': boolean;
  readonly 'value': unknown;
};
