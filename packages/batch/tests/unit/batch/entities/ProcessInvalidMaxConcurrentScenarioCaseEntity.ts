import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BatchOnlyInputEntity } from './common/BatchOnlyInputEntity.js';

/** The `process-invalid-max-concurrent` scenario case shape `batch.loop.spec.ts` exercises. */
export namespace ProcessInvalidMaxConcurrentScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'message': { 'minLength': 1, 'type': 'string' } },
        'required': ['message'],
        'type': 'object'
      },
      'input': BatchOnlyInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'process-invalid-max-concurrent' }
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
        { 'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) },
        ['message'] as const,
        { 'additionalProperties': false }
      ),
      'input': BatchOnlyInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('process-invalid-max-concurrent' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
