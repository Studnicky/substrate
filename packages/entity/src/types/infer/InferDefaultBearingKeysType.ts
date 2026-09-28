import type { SchemaNodeInterface } from '../../interfaces/SchemaNodeInterface.js';

/** Keys whose own property schema declares `default` — present on intake output even when not `required`. */
export type InferDefaultBearingKeysType<TProps extends Record<string, SchemaNodeInterface<unknown, unknown>>>
  = { [K in keyof TProps]: TProps[K] extends SchemaNodeInterface<infer TPropSchema, unknown> ? ('default' extends keyof TPropSchema ? K : never) : never }[keyof TProps];
