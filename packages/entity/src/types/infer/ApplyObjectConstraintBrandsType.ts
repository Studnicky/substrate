import type { MaximumPropertiesBrandType, MinimumPropertiesBrandType } from '../brands/index.js';

/** Property-count brands for an object node. */
export type ApplyObjectConstraintBrandsType<TSchema extends Record<string, unknown>>
  = (TSchema['maxProperties'] extends infer TMaximumProperties extends number ? MaximumPropertiesBrandType<TMaximumProperties> : Record<never, never>)
  & (TSchema['minProperties'] extends infer TMinimumProperties extends number ? MinimumPropertiesBrandType<TMinimumProperties> : Record<never, never>);
