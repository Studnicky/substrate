import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `async-timeout-hook` scenario case shape `Coalesce.loop.spec.ts` exercises. */
export namespace AsyncTimeoutHookScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'hookName': { 'minLength': 1, 'type': 'string' }, 'unhandledRejections': { 'type': 'number' } },
        'required': ['hookName', 'unhandledRejections'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'coalesce': {
            'additionalProperties': false,
            'properties': { 'timeout': { 'type': 'number' } },
            'required': ['timeout'],
            'type': 'object'
          },
          'key': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['coalesce', 'key'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'async-timeout-hook' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'hookName': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
          'unhandledRejections': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['hookName', 'unhandledRejections'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'coalesce': SchemaNode.defineObject({ 'type': 'object' } as const, { 'timeout': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['timeout'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
          'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        }, ['coalesce', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'async-timeout-hook' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
