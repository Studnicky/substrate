import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The single scenario case shape `PatchOperationCoreEntity.loop.spec.ts` exercises. */
export namespace PatchOperationCoreEntityScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'valid': { 'type': 'boolean' } },
        'required': ['valid'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'operation': {
            'additionalProperties': false,
            'properties': { 'op': { 'type': 'string' }, 'path': { 'type': 'string' } },
            'required': [],
            'type': 'object'
          }
        },
        'required': ['operation'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': ['invalid-missing-path', 'invalid-operation-variant', 'valid-operation'] }
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
        { 'valid': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) },
        ['valid'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'operation': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            {
              'op': SchemaNode.defineString({ 'type': 'string' } as const),
              'path': SchemaNode.defineString({ 'type': 'string' } as const)
            },
            [] as const,
            { 'additionalProperties': false }
          )
        },
        ['operation'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum(['invalid-missing-path', 'invalid-operation-variant', 'valid-operation'] as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
