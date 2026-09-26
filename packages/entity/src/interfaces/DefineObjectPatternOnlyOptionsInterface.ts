import type { SchemaNodeInterface } from './SchemaNodeInterface.js';

/** `SchemaNode.defineObject` options carrying only `patternProperties`, `additionalProperties` defaulting to `false`. */
export interface DefineObjectPatternOnlyOptionsInterface<TPatternProps extends Record<string, SchemaNodeInterface<unknown, unknown>>> {
  readonly 'patternProperties': TPatternProps;
}
