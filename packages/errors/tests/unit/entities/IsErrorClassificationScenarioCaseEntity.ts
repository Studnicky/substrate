import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The single scenario case shape `is-error-classification.loop.spec.ts` exercises. */
export namespace IsErrorClassificationScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'result': { 'type': 'boolean' } },
        'required': ['result'],
        'type': 'object'
      },
      'input': {},
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'enum': ['invalid-reason', 'non-object', 'valid', 'valid-with-reason'] }
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
        { 'result': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) },
        ['result'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineUnknown({} as const),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum(['invalid-reason', 'non-object', 'valid', 'valid-with-reason'] as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
