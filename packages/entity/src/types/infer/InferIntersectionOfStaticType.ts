import type { SchemaNodeInterface } from '../../interfaces/SchemaNodeInterface.js';
import type { InferUnionOfStaticType } from './InferUnionOfStaticType.js';
import type { UnionToIntersectionType } from './UnionToIntersectionType.js';

/** Intersection of a tuple of nodes' own `.static` types — the `allOf` shape. */
export type InferIntersectionOfStaticType<TItems extends readonly SchemaNodeInterface<unknown, unknown>[]>
  = UnionToIntersectionType<InferUnionOfStaticType<TItems>>;
