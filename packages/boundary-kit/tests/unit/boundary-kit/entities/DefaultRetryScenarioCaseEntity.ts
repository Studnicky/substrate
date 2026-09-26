import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `default-retry` scenario case shape `boundary-kit.loop.spec.ts` exercises. */
export namespace DefaultRetryScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'callCount': { 'type': 'number' }, 'result': { 'type': 'string' } },
        'required': ['callCount', 'result'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'boundaryKit': {
            'additionalProperties': false,
            'properties': { 'failuresBeforeSuccess': { 'type': 'number' } },
            'required': ['failuresBeforeSuccess'],
            'type': 'object'
          }
        },
        'required': ['boundaryKit'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'default-retry' }
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
        { 'callCount': SchemaNode.defineNumber({ 'type': 'number' } as const), 'result': SchemaNode.defineString({ 'type': 'string' } as const) },
        ['callCount', 'result'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'boundaryKit': SchemaNode.defineObject(
            { 'type': 'object' } as const,
            { 'failuresBeforeSuccess': SchemaNode.defineNumber({ 'type': 'number' } as const) },
            ['failuresBeforeSuccess'] as const,
            { 'additionalProperties': false }
          )
        },
        ['boundaryKit'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('default-retry' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
