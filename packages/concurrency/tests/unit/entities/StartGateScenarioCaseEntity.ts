import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { KeyOnlyInputEntity } from './common/KeyOnlyInputEntity.js';

/** The `start-gate` scenario case shape `Coalesce.loop.spec.ts` exercises. */
export namespace StartGateScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'factoryCalls': { 'type': 'number' }, 'inflight': { 'type': 'boolean' } },
        'required': ['factoryCalls', 'inflight'],
        'type': 'object'
      },
      'input': KeyOnlyInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'start-gate' }
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
          'factoryCalls': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'inflight': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
        },
        ['factoryCalls', 'inflight'] as const,
        { 'additionalProperties': false }
      ),
      'input': KeyOnlyInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('start-gate' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
