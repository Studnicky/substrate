import type { SchemaNodeInterface } from './SchemaNodeInterface.js';

/** `SchemaNode.defineObject` options carrying only `additionalProperties`, `patternProperties` defaulting to `{}`. */
export interface DefineObjectAdditionalOnlyOptionsInterface<TAdditional extends boolean | SchemaNodeInterface<unknown, unknown>> {
  readonly 'additionalProperties': TAdditional;
}
