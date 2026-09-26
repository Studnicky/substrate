import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `dequeue-hook-error` scenario case shape `Channel.loop.spec.ts` exercises. */
export namespace DequeueHookErrorScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'errorName': { 'minLength': 1, 'type': 'string' },
          'item': { 'type': 'number' },
          'key': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['errorName', 'item', 'key'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'item': { 'type': 'number' }, 'key': { 'minLength': 1, 'type': 'string' } },
        'required': ['item', 'key'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'dequeue-hook-error' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'errorName': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'item': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        },
        ['errorName', 'item', 'key'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'item': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        },
        ['item', 'key'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('dequeue-hook-error' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
