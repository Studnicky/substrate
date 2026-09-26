import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { CoalesceTimeoutKeyResultInputEntity } from './common/CoalesceTimeoutKeyResultInputEntity.js';

/** The `timeout-rejects` scenario case shape `Coalesce.loop.spec.ts` exercises. */
export namespace TimeoutRejectsScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'inflightAfterTimeout': { 'type': 'boolean' },
          'timeoutEvents': {
            'items': {
              'additionalProperties': false,
              'properties': { 'key': { 'minLength': 1, 'type': 'string' }, 'timeoutMs': { 'type': 'number' } },
              'required': ['key', 'timeoutMs'],
              'type': 'object'
            },
            'type': 'array'
          }
        },
        'required': ['inflightAfterTimeout', 'timeoutEvents'],
        'type': 'object'
      },
      'input': CoalesceTimeoutKeyResultInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'timeout-rejects' }
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
          'inflightAfterTimeout': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'timeoutEvents': SchemaNode.defineArray(
            { 'type': 'array' } as const,
            SchemaNode.defineObject(
              { 'type': 'object' } as const,
              {
                'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
                'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
              },
              ['key', 'timeoutMs'] as const,
              { 'additionalProperties': false }
            )
          )
        },
        ['inflightAfterTimeout', 'timeoutEvents'] as const,
        { 'additionalProperties': false }
      ),
      'input': CoalesceTimeoutKeyResultInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('timeout-rejects' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
