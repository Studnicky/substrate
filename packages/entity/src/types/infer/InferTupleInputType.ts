import type { SchemaNodeInterface } from '../../interfaces/SchemaNodeInterface.js';
import type { NodeInputType } from '../NodeInputType.js';

/** Homomorphic mapped tuple, stripped of `readonly`: each slot resolves its own node's `.input` independently, preserving arity. */
export type InferTupleInputType<TItems extends readonly SchemaNodeInterface<unknown, unknown>[]>
  = { -readonly [K in keyof TItems]: NodeInputType<TItems[K]> };
