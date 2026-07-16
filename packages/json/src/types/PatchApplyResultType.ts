// json-schema-uninexpressible: 'value' is unknown, since it holds an arbitrary patched target — unknown cannot be expressed in JSON Schema
/** Result of applying a patch to a target. */
export type PatchApplyResultType = {
  'error'?: string;
  'success': boolean;
  'value': unknown;
};
