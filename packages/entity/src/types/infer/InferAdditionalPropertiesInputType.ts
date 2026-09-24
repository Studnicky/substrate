import type { SchemaNodeInterface } from '../../interfaces/SchemaNodeInterface.js';
import type { NodeInputType } from '../NodeInputType.js';

/** `false`/absent contributes nothing (closed object); `true` or a node opens the object to that value's input type. */
export type InferAdditionalPropertiesInputType<TAdditional>
  = TAdditional extends SchemaNodeInterface<unknown, unknown>
    ? Record<string, NodeInputType<TAdditional>>
    : TAdditional extends true
      ? Record<string, unknown>
      : Record<never, never>;
