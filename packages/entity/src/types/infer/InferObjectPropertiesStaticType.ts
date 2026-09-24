import type { SchemaNodeInterface } from '../../interfaces/SchemaNodeInterface.js';
import type { IdentityType } from '../IdentityType.js';
import type { NodeStaticType } from '../NodeStaticType.js';

/** Reads each property node's own `.static` (indexed access); never walks into a nested property's schema. */
export type InferObjectPropertiesStaticType<
  TProps extends Record<string, SchemaNodeInterface<unknown, unknown>>,
  TRequired extends keyof TProps
> = IdentityType<
  { [K in Exclude<keyof TProps, TRequired>]?: NodeStaticType<TProps[K]> }
  & { [K in TRequired]: NodeStaticType<TProps[K]> }
>;
