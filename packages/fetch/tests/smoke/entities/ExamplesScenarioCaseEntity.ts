import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `examples.loop.spec.ts` scenario case shape. */
export namespace ExamplesScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'input': { 'additionalProperties': false, 'properties': { 'entrypoint': { 'minLength': 1, 'type': 'string' } }, 'required': ['entrypoint'], 'type': 'object' },
      'name': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['description', 'input', 'name'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'entrypoint': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['entrypoint'] as const, { 'additionalProperties': false }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    },
    ['description', 'input', 'name'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
