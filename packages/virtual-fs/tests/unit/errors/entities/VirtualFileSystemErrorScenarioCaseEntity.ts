import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The single scenario case shape `virtual-file-system-error.loop.spec.ts` exercises. */
export namespace VirtualFileSystemErrorScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'code': { 'minLength': 1, 'type': 'string' },
          'correlationId': { 'type': 'string' },
          'message': { 'minLength': 1, 'type': 'string' },
          'metadata': {
            'additionalProperties': false,
            'properties': { 'path': { 'minLength': 1, 'type': 'string' } },
            'required': ['path'],
            'type': 'object'
          },
          'retryable': { 'type': 'boolean' }
        },
        'required': ['code', 'message', 'retryable'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'error': {
            'additionalProperties': false,
            'properties': {
              'args': {
                'additionalProperties': false,
                'properties': {
                  'cause': {},
                  'correlationId': { 'type': 'string' },
                  'metadata': {
            'additionalProperties': false,
            'properties': { 'path': { 'minLength': 1, 'type': 'string' } },
            'required': ['path'],
            'type': 'object'
          },
                  'retryable': { 'type': 'boolean' }
                },
                'required': [],
                'type': 'object'
              },
              'message': { 'minLength': 1, 'type': 'string' }
            },
            'required': ['message'],
            'type': 'object'
          }
        },
        'required': ['error'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'construction' }
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
          'code': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'correlationId': SchemaNode.defineString({ 'type': 'string' } as const),
          'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'metadata': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            { 'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) },
            ['path'] as const,
            { 'additionalProperties': false }
          ),
          'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
        },
        ['code', 'message', 'retryable'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'error': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            {
              'args': SchemaNode.defineObject(
                { 'type': 'object' } as const,
                {
                  'cause': SchemaNode.defineUnknown({} as const),
                  'correlationId': SchemaNode.defineString({ 'type': 'string' } as const),
                  'metadata': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            { 'path': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) },
            ['path'] as const,
            { 'additionalProperties': false }
          ),
                  'retryable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
                },
                [] as const,
                { 'additionalProperties': false }
              ),
              'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
            },
            ['message'] as const,
            { 'additionalProperties': false }
          )
        },
        ['error'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('construction' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
