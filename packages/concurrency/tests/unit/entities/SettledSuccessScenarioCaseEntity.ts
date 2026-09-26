import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `settled-success` scenario case shape `Coalesce.loop.spec.ts` exercises. */
export namespace SettledSuccessScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'success': { 'type': 'boolean' } },
        'required': ['success'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'key': { 'minLength': 1, 'type': 'string' }, 'result': { 'type': 'number' } },
        'required': ['key', 'result'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'settled-success' }
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
        { 'success': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) },
        ['success'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'result': SchemaNode.defineNumber({ 'type': 'number' } as const)
        },
        ['key', 'result'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('settled-success' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
