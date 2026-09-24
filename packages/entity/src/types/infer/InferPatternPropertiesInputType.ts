import type { SchemaNodeInterface } from '../../interfaces/SchemaNodeInterface.js';
import type { NodeInputType } from '../NodeInputType.js';
import type { PatternPropertyKeyType } from './PatternPropertyKeyType.js';
import type { UnionToIntersectionType } from './UnionToIntersectionType.js';

/** Intersects one `Record<PatternKey, Value>` per `patternProperties` entry, keyed to each value's input type. */
export type InferPatternPropertiesInputType<TPatternProps extends Record<string, SchemaNodeInterface<unknown, unknown>>>
  = UnionToIntersectionType<
    { [P in keyof TPatternProps]: Record<PatternPropertyKeyType<P & string>, NodeInputType<TPatternProps[P]>> }[keyof TPatternProps]
  >;
