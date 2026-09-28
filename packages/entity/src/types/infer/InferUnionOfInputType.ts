import type { SchemaNodeInterface } from '../../interfaces/SchemaNodeInterface.js';
import type { InferTupleInputType } from './InferTupleInputType.js';

/** Union of a tuple of nodes' own `.input` types — the `anyOf`/`oneOf` shape. */
export type InferUnionOfInputType<TItems extends readonly SchemaNodeInterface<unknown, unknown>[]>
  = InferTupleInputType<TItems>[number];
