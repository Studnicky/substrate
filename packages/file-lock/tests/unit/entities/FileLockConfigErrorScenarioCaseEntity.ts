import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The single scenario case shape `FileLockConfigError.loop.spec.ts` exercises. */
export namespace FileLockConfigErrorScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'code': { 'minLength': 1, 'type': 'string' }, 'message': { 'minLength': 1, 'type': 'string' } },
        'required': ['code', 'message'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'message': { 'minLength': 1, 'type': 'string' } },
        'required': ['message'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'constructs-with-code' }
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
          'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        },
        ['code', 'message'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) },
        ['message'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('constructs-with-code' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
