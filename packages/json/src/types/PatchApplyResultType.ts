/** Result of applying a patch to a target. */
export type PatchApplyResultType = {
  'error'?: string;
  'success': boolean;
  'value': unknown;
};
