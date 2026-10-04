import type { SchemaNodeInterface } from '../../interfaces/SchemaNodeInterface.js';
import type { NodeStaticType } from '../NodeStaticType.js';
import type { PatternPropertyKeyType } from './PatternPropertyKeyType.js';
import type { UnionToIntersectionType } from './UnionToIntersectionType.js';

/** Intersects one `Record<PatternKey, Value>` per `patternProperties` entry; a non-derivable pattern contributes `{}`. */
export type InferPatternPropertiesStaticType<TPatternProps extends Record<string, SchemaNodeInterface<unknown, unknown>>>
  = UnionToIntersectionType<
    { [P in keyof TPatternProps]: Record<PatternPropertyKeyType<P & string>, NodeStaticType<TPatternProps[P]>> }[keyof TPatternProps]
  >;
