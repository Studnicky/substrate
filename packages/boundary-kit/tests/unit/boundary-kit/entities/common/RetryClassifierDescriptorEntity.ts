import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** A serializable stand-in for a `RetryConfigInterface['errorClassifier']` function, materialized by `retryClassifierMap`. */
export namespace RetryClassifierDescriptorEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'reason': { 'type': 'string' },
      'retryable': { 'type': 'boolean' },
      'shape': { 'const': 'constant' }
    },
    'required': ['reason', 'retryable', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'reason': SchemaNode.defineString({ 'type': 'string' } as const),
      'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'shape': SchemaNode.defineConst('constant' as const)
    },
    ['reason', 'retryable', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
