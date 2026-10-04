import type { SchemaNodeInterface } from '../../interfaces/SchemaNodeInterface.js';
import type { InferTupleStaticType } from './InferTupleStaticType.js';

/** Union of a tuple of nodes' own `.static` types — the `anyOf`/`oneOf` shape. */
export type InferUnionOfStaticType<TItems extends readonly SchemaNodeInterface<unknown, unknown>[]>
  = InferTupleStaticType<TItems>[number];
