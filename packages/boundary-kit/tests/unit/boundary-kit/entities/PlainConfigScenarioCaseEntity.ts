import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BoundaryKitConfigOptionalEntity } from './common/BoundaryKitConfigOptionalEntity.js';

/** The `plain-config` scenario case shape `boundary-kit.loop.spec.ts` exercises. */
export namespace PlainConfigScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'result': { 'type': 'string' } },
        'required': ['result'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'boundaryKit': {
            'additionalProperties': false,
            'properties': { 'config': BoundaryKitConfigOptionalEntity.Schema },
            'required': ['config'],
            'type': 'object'
          }
        },
        'required': ['boundaryKit'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'plain-config' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineString({ 'type': 'string' } as const) }, ['result'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'boundaryKit': SchemaNode.defineObject({ 'type': 'object' } as const, { 'config': BoundaryKitConfigOptionalEntity.Node }, ['config'] as const, { 'additionalProperties': false, 'patternProperties': {} })
        }, ['boundaryKit'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'plain-config' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
