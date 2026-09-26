import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `independent-keys` scenario case shape `Channel.loop.spec.ts` exercises. */
export namespace IndependentKeysScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'left': { 'items': { 'type': 'string' }, 'type': 'array' }, 'right': { 'items': { 'type': 'string' }, 'type': 'array' } },
        'required': ['left', 'right'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'left': { 'minLength': 1, 'type': 'string' },
          'leftItem': { 'type': 'string' },
          'right': { 'minLength': 1, 'type': 'string' },
          'rightItem': { 'type': 'string' }
        },
        'required': ['left', 'leftItem', 'right', 'rightItem'],
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
          'left': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
          'right': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const))
        },
        ['left', 'right'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'left': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'leftItem': SchemaNode.defineString({ 'type': 'string' } as const),
          'right': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'rightItem': SchemaNode.defineString({ 'type': 'string' } as const)
        },
        ['left', 'leftItem', 'right', 'rightItem'] as const,
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
