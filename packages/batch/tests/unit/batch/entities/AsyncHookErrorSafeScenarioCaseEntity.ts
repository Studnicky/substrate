import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BatchItemsHookErrorMessageInputEntity } from './common/BatchItemsHookErrorMessageInputEntity.js';

/** The `async-hook-error-safe` scenario case shape `batchHooks.loop.spec.ts` exercises. */
export namespace AsyncHookErrorSafeScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'hookErrorCount': { 'type': 'number' },
          'statuses': { 'items': { 'enum': ['fulfilled', 'rejected'] }, 'type': 'array' },
          'unhandledRejections': { 'type': 'number' }
        },
        'required': ['hookErrorCount', 'statuses', 'unhandledRejections'],
        'type': 'object'
      },
      'input': BatchItemsHookErrorMessageInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'async-hook-error-safe' }
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
        {
          'hookErrorCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'statuses': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineEnum(['fulfilled', 'rejected'] as const)),
          'unhandledRejections': SchemaNode.defineNumber({ 'type': 'number' } as const)
        },
        ['hookErrorCount', 'statuses', 'unhandledRejections'] as const,
        { 'additionalProperties': false }
      ),
      'input': BatchItemsHookErrorMessageInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('async-hook-error-safe' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
