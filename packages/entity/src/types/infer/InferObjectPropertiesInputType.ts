import type { SchemaNodeInterface } from '../../interfaces/SchemaNodeInterface.js';
import type { IdentityType } from '../IdentityType.js';
import type { NodeInputType } from '../NodeInputType.js';

/** Same optionality as declared `required` — a `default` does not promote a property here, only on `.static`. */
export type InferObjectPropertiesInputType<
  TProps extends Record<string, SchemaNodeInterface<unknown, unknown>>,
  TRequired extends keyof TProps
> = IdentityType<
  { [K in Exclude<keyof TProps, TRequired>]?: NodeInputType<TProps[K]> }
  & { [K in TRequired]: NodeInputType<TProps[K]> }
>;
