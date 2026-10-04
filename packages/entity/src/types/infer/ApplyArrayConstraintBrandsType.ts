import type {
  ContainsBrandInterface,
  MaximumContainsBrandInterface,
  MaximumItemsBrandInterface,
  MinimumContainsBrandInterface,
  MinimumItemsBrandInterface,
  UniqueItemsBrandInterface
} from '../../interfaces/index.js';

/** Count/contains/uniqueness brands for an array node; `TContainsStatic` is `never` when no `contains` schema was given. */
export type ApplyArrayConstraintBrandsType<TSchema extends Record<string, unknown>, TContainsStatic = never>
  = ([TContainsStatic] extends [never] ? Record<never, never> : ContainsBrandInterface<TContainsStatic>)
  & (TSchema['maxContains'] extends infer TMaximumContains extends number ? MaximumContainsBrandInterface<TMaximumContains> : Record<never, never>)
  & (TSchema['maxItems'] extends infer TMaximumItems extends number ? MaximumItemsBrandInterface<TMaximumItems> : Record<never, never>)
  & (TSchema['minContains'] extends infer TMinimumContains extends number ? MinimumContainsBrandInterface<TMinimumContains> : Record<never, never>)
  & (TSchema['minItems'] extends infer TMinimumItems extends number ? MinimumItemsBrandInterface<TMinimumItems> : Record<never, never>)
  & (TSchema['uniqueItems'] extends true ? UniqueItemsBrandInterface<true> : Record<never, never>);
