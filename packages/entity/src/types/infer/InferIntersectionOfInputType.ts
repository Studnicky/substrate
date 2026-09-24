import type { SchemaNodeInterface } from '../../interfaces/SchemaNodeInterface.js';
import type { InferUnionOfInputType } from './InferUnionOfInputType.js';
import type { UnionToIntersectionType } from './UnionToIntersectionType.js';

/** Intersection of a tuple of nodes' own `.input` types — the `allOf` shape. */
export type InferIntersectionOfInputType<TItems extends readonly SchemaNodeInterface<unknown, unknown>[]>
  = UnionToIntersectionType<InferUnionOfInputType<TItems>>;
