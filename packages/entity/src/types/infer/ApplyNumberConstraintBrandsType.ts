import type {
  ExclusiveMaximumBrandType,
  ExclusiveMinimumBrandType,
  MaximumBrandType,
  MinimumBrandType,
  MultipleOfBrandType
} from '../brands/index.js';

/** Intersects `number` with every bound/multiple brand `TSchema` declares. */
export type ApplyNumberConstraintBrandsType<TSchema extends Record<string, unknown>> = number
  & (TSchema['exclusiveMaximum'] extends infer TExclusiveMaximum extends number ? ExclusiveMaximumBrandType<TExclusiveMaximum> : Record<never, never>)
  & (TSchema['exclusiveMinimum'] extends infer TExclusiveMinimum extends number ? ExclusiveMinimumBrandType<TExclusiveMinimum> : Record<never, never>)
  & (TSchema['maximum'] extends infer TMaximum extends number ? MaximumBrandType<TMaximum> : Record<never, never>)
  & (TSchema['minimum'] extends infer TMinimum extends number ? MinimumBrandType<TMinimum> : Record<never, never>)
  & (TSchema['multipleOf'] extends infer TMultipleOf extends number ? MultipleOfBrandType<TMultipleOf> : Record<never, never>);
