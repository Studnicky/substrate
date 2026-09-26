import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { InflightAfterExpectedEntity } from './common/InflightAfterExpectedEntity.js';

/** The `throwing-settled-hook` scenario case shape `Coalesce.loop.spec.ts` exercises. */
export namespace ThrowingSettledHookScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': InflightAfterExpectedEntity.Schema,
      'input': {
        'additionalProperties': false,
        'properties': {
          'factoryMessage': { 'minLength': 1, 'type': 'string' },
          'firstKey': { 'minLength': 1, 'type': 'string' },
          'secondKey': { 'minLength': 1, 'type': 'string' },
          'settledMessage': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['factoryMessage', 'firstKey', 'secondKey', 'settledMessage'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'throwing-settled-hook' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': InflightAfterExpectedEntity.Node,
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'factoryMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'firstKey': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'secondKey': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'settledMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        }, ['factoryMessage', 'firstKey', 'secondKey', 'settledMessage'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'throwing-settled-hook' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
