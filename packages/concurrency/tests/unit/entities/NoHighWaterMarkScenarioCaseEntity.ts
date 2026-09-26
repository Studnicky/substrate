import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `no-high-water-mark` scenario case shape `Channel.loop.spec.ts` exercises. */
export namespace NoHighWaterMarkScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'items': { 'items': { 'type': 'number' }, 'type': 'array' }, 'overflowCount': { 'type': 'number' } },
        'required': ['items', 'overflowCount'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'count': { 'type': 'number' }, 'key': { 'minLength': 1, 'type': 'string' } },
        'required': ['count', 'key'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'no-high-water-mark' }
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
          'items': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)),
          'overflowCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
        },
        ['items', 'overflowCount'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        },
        ['count', 'key'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('no-high-water-mark' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
