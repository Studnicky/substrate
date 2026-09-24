import type { SchemaNodeInterface } from '../../interfaces/SchemaNodeInterface.js';
import type { NodeStaticType } from '../NodeStaticType.js';

/** `false`/absent contributes nothing (closed object); `true` or a node opens the object to that value type. */
export type InferAdditionalPropertiesStaticType<TAdditional>
  = TAdditional extends SchemaNodeInterface<unknown, unknown>
    ? Record<string, NodeStaticType<TAdditional>>
    : TAdditional extends true
      ? Record<string, unknown>
      : Record<never, never>;
