import type { SchemaNodeInterface } from '../../interfaces/SchemaNodeInterface.js';
import type { NodeStaticType } from '../NodeStaticType.js';

/** Homomorphic mapped tuple, stripped of `readonly`: each slot resolves its own node's `.static` independently, preserving arity. */
export type InferTupleStaticType<TItems extends readonly SchemaNodeInterface<unknown, unknown>[]>
  = { -readonly [K in keyof TItems]: NodeStaticType<TItems[K]> };
