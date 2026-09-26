import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { CoalesceTimeoutKeyResultInputEntity } from './common/CoalesceTimeoutKeyResultInputEntity.js';

/** The `timeout-second-caller` scenario case shape `Coalesce.loop.spec.ts` exercises. */
export namespace TimeoutSecondCallerScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'timeoutEvents': { 'type': 'number' } },
        'required': ['timeoutEvents'],
        'type': 'object'
      },
      'input': CoalesceTimeoutKeyResultInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'timeout-second-caller' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'timeoutEvents': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['timeoutEvents'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': CoalesceTimeoutKeyResultInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'timeout-second-caller' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
