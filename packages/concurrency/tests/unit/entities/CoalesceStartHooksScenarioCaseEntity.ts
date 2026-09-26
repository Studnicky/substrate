import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { KeyOnlyInputEntity } from './common/KeyOnlyInputEntity.js';

/** The `coalesce-start-hooks` scenario case shape `Coalesce.loop.spec.ts` exercises. */
export namespace CoalesceStartHooksScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'joinCount': { 'type': 'number' }, 'startCount': { 'type': 'number' } },
        'required': ['joinCount', 'startCount'],
        'type': 'object'
      },
      'input': KeyOnlyInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'coalesce-start-hooks' }
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
          'joinCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'startCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
        },
        ['joinCount', 'startCount'] as const,
        { 'additionalProperties': false }
      ),
      'input': KeyOnlyInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('coalesce-start-hooks' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
