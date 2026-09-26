import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `onPublishDropped-hooks` scenario case shape `Channel.loop.spec.ts` exercises. */
export namespace OnPublishDroppedHooksScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'count': { 'type': 'number' },
          'entry': {
            'additionalProperties': false,
            'properties': { 'item': { 'type': 'string' }, 'key': { 'minLength': 1, 'type': 'string' } },
            'required': ['item', 'key'],
            'type': 'object'
          }
        },
        'required': ['count', 'entry'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'item': { 'type': 'string' }, 'key': { 'minLength': 1, 'type': 'string' } },
        'required': ['item', 'key'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'onPublishDropped-hooks' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'count': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'entry': SchemaNode.defineObject({ 'type': 'object' } as const, {
              'item': SchemaNode.defineString({ 'type': 'string' } as const),
              'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
            }, ['item', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} })
        }, ['count', 'entry'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'item': SchemaNode.defineString({ 'type': 'string' } as const),
          'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        }, ['item', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'onPublishDropped-hooks' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
