import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';
import { ThrottleConfigEntity } from '@studnicky/throttle/entities';

/** A config bag carrying only a throttle, used by the `throttle-bound` and `undefined-result-vs-abort` scenarios. */
export namespace ThrottleOnlyConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'throttle': ThrottleConfigEntity.Schema
    },
    'required': ['throttle'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'throttle': ThrottleConfigEntity.Node
    }, ['throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
