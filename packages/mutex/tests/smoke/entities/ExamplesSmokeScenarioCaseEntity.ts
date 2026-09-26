import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The single scenario case shape `examples.loop.spec.ts` exercises. */
export namespace ExamplesSmokeScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'importsWithoutThrow': { 'const': true } },
        'required': ['importsWithoutThrow'],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'entrypoint': { 'minLength': 1, 'type': 'string' } },
        'required': ['entrypoint'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['description', 'expected', 'input', 'name'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'importsWithoutThrow': SchemaNode.defineConst({}, true as const) }, ['importsWithoutThrow'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'entrypoint': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['entrypoint'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    }, ['description', 'expected', 'input', 'name'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
