import type { SchemaNodeInterface } from './SchemaNodeInterface.js';

/** Trailing options for `SchemaNode.defineObject`, collecting its optional parameters. */
export interface DefineObjectOptionsInterface<
  TAdditional extends boolean | SchemaNodeInterface<unknown, unknown>,
  TPatternProps extends Record<string, SchemaNodeInterface<unknown, unknown>>
> {
  readonly 'additionalProperties'?: TAdditional;
  readonly 'patternProperties'?: TPatternProps;
}
