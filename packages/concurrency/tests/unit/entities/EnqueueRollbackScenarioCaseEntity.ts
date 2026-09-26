import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { FirstKeySecondInputEntity } from './common/FirstKeySecondInputEntity.js';

/** The `enqueue-rollback` scenario case shape `Channel.loop.spec.ts` exercises. */
export namespace EnqueueRollbackScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'nextValue': { 'type': 'number' } },
        'required': ['nextValue'],
        'type': 'object'
      },
      'input': FirstKeySecondInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'enqueue-rollback' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'nextValue': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['nextValue'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': FirstKeySecondInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'enqueue-rollback' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
