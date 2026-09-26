import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{coalesce: {timeout}, key, result}` input shape shared by `Coalesce.loop.spec.ts` timeout cases. */
export namespace CoalesceTimeoutKeyResultInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'coalesce': {
        'additionalProperties': false,
        'properties': { 'timeout': { 'type': 'number' } },
        'required': ['timeout'],
        'type': 'object'
      },
      'key': { 'minLength': 1, 'type': 'string' },
      'result': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['coalesce', 'key', 'result'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'coalesce': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'timeout': SchemaNode.defineNumber({ 'type': 'number' } as const) },
        ['timeout'] as const,
        { 'additionalProperties': false }
      ),
      'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'result': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    },
    ['coalesce', 'key', 'result'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
