import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `inflight-state` scenario case shape `Coalesce.loop.spec.ts` exercises. */
export namespace InflightStateScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'inflightAfter': { 'type': 'boolean' }, 'inflightBefore': { 'type': 'boolean' } },
        'required': ['inflightAfter', 'inflightBefore'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'key': { 'minLength': 1, 'type': 'string' }, 'result': { 'minLength': 1, 'type': 'string' } },
        'required': ['key', 'result'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'inflight-state' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'inflightAfter': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'inflightBefore': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
        }, ['inflightAfter', 'inflightBefore'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'result': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        }, ['key', 'result'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'inflight-state' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
