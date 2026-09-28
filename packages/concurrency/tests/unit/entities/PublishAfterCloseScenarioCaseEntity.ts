import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `publish-after-close` scenario case shape `Channel.loop.spec.ts` exercises. */
export namespace PublishAfterCloseScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'items': { 'items': {}, 'maxItems': 0, 'type': 'array' } },
        'required': ['items'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'item': { 'type': 'number' }, 'key': { 'minLength': 1, 'type': 'string' } },
        'required': ['item', 'key'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'publish-after-close' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'items': SchemaNode.defineArray({ 'maxItems': 0, 'type': 'array' } as const, SchemaNode.defineUnknown({} as const), undefined) }, ['items'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'item': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        }, ['item', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'publish-after-close' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
