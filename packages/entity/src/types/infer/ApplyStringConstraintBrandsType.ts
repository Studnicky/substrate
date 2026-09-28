import type {
  ContentEncodingBrandType,
  ContentMediaTypeBrandType,
  FormatBrandType,
  MaximumLengthBrandType,
  MinimumLengthBrandType,
  PatternBrandType
} from '../brands/index.js';

/**
 * Intersects `string` with every length/pattern/format/content brand `TSchema`
 * declares. `TSchema` is the caller's raw JSON Schema literal — the one
 * legitimate intake edge for an externally-authored schema — read only by
 * indexed access, never re-declared as a member.
 */
export type ApplyStringConstraintBrandsType<TSchema extends Record<string, unknown>> = string
  & (TSchema['contentEncoding'] extends infer TEncoding extends string ? ContentEncodingBrandType<TEncoding> : Record<never, never>)
  & (TSchema['contentMediaType'] extends infer TMediaType extends string ? ContentMediaTypeBrandType<TMediaType> : Record<never, never>)
  & (TSchema['format'] extends infer TFormat extends string ? FormatBrandType<TFormat> : Record<never, never>)
  & (TSchema['maxLength'] extends infer TMaximum extends number ? MaximumLengthBrandType<TMaximum> : Record<never, never>)
  & (TSchema['minLength'] extends infer TMinimum extends number ? MinimumLengthBrandType<TMinimum> : Record<never, never>)
  & (TSchema['pattern'] extends infer TPattern extends string ? PatternBrandType<TPattern> : Record<never, never>);
