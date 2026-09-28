import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { KeyMessageInputEntity } from './common/KeyMessageInputEntity.js';

/** The `rejecting-start-hook` scenario case shape `Coalesce.loop.spec.ts` exercises. */
export namespace RejectingStartHookScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'inflightAfter': { 'type': 'boolean' },
          'settledEvents': { 'items': { 'type': 'boolean' }, 'type': 'array' }
        },
        'required': ['inflightAfter', 'settledEvents'],
        'type': 'object'
      },
      'input': KeyMessageInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'rejecting-start-hook' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'inflightAfter': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'settledEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineBoolean({ 'type': 'boolean' } as const), undefined)
        }, ['inflightAfter', 'settledEvents'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': KeyMessageInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'rejecting-start-hook' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
