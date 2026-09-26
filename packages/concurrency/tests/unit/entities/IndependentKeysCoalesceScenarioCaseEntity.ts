import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `independent-keys` scenario case shape `Coalesce.loop.spec.ts` exercises. */
export namespace IndependentKeysCoalesceScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'callCount': { 'type': 'number' }, 'resultA': { 'type': 'number' }, 'resultB': { 'type': 'number' } },
        'required': ['callCount', 'resultA', 'resultB'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'keyA': { 'minLength': 1, 'type': 'string' },
          'keyB': { 'minLength': 1, 'type': 'string' },
          'valueA': { 'type': 'number' },
          'valueB': { 'type': 'number' }
        },
        'required': ['keyA', 'keyB', 'valueA', 'valueB'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'independent-keys' }
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
          'callCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'resultA': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'resultB': SchemaNode.defineNumber({ 'type': 'number' } as const)
        },
        ['callCount', 'resultA', 'resultB'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'keyA': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'keyB': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'valueA': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'valueB': SchemaNode.defineNumber({ 'type': 'number' } as const)
        },
        ['keyA', 'keyB', 'valueA', 'valueB'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('independent-keys' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
