import type {
  ContainsBrandType,
  MaximumContainsBrandType,
  MaximumItemsBrandType,
  MinimumContainsBrandType,
  MinimumItemsBrandType
} from '../brands/index.js';
import type { UniqueItemsBrandType } from '../brands/UniqueItemsBrandType.js';

/** Count/contains/uniqueness brands for an array node; `TContainsStatic` is `never` when no `contains` schema was given. */
export type ApplyArrayConstraintBrandsType<TSchema extends Record<string, unknown>, TContainsStatic = never>
  = ([TContainsStatic] extends [never] ? Record<never, never> : ContainsBrandType<TContainsStatic>)
  & (TSchema['maxContains'] extends infer TMaximumContains extends number ? MaximumContainsBrandType<TMaximumContains> : Record<never, never>)
  & (TSchema['maxItems'] extends infer TMaximumItems extends number ? MaximumItemsBrandType<TMaximumItems> : Record<never, never>)
  & (TSchema['minContains'] extends infer TMinimumContains extends number ? MinimumContainsBrandType<TMinimumContains> : Record<never, never>)
  & (TSchema['minItems'] extends infer TMinimumItems extends number ? MinimumItemsBrandType<TMinimumItems> : Record<never, never>)
  & (TSchema['uniqueItems'] extends true ? UniqueItemsBrandType<true> : Record<never, never>);
