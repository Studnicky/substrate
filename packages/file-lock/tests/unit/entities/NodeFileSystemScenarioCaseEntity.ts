import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The single `NodeFileSystem.loop.spec.ts` scenario shape. `input` carries no fields — the test drives `NodeFileSystem` directly. */
export namespace NodeFileSystemScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'forwarded': { 'const': true } },
        'required': ['forwarded'],
        'type': 'object'
      },
      'input': { 'additionalProperties': false, 'properties': {}, 'required': [], 'type': 'object' },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'forwards-file-system-operations' }
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
        { 'forwarded': SchemaNode.defineConst(true as const) },
        ['forwarded'] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, { 'additionalProperties': false }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('forwards-file-system-operations' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
