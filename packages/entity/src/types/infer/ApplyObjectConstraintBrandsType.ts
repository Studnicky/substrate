import type { MaximumPropertiesBrandInterface, MinimumPropertiesBrandInterface } from '../../interfaces/index.js';

/** Property-count brands for an object node. */
export type ApplyObjectConstraintBrandsType<TSchema extends Record<string, unknown>>
  = (TSchema['maxProperties'] extends infer TMaximumProperties extends number ? MaximumPropertiesBrandInterface<TMaximumProperties> : Record<never, never>)
  & (TSchema['minProperties'] extends infer TMinimumProperties extends number ? MinimumPropertiesBrandInterface<TMinimumProperties> : Record<never, never>);
