import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `hooks.loop.spec.ts` scenario case shape. `expected` lists every field used across the five shapes, each optional — each shape reads its own subset directly, never a cast. */
export namespace HooksScenarioCaseEntity {
  const workerPoolConfigSchema = {
    'additionalProperties': false,
    'properties': { 'concurrency': { 'type': 'number' }, 'workerPath': { 'type': 'string' } },
    'required': ['workerPath'],
    'type': 'object'
  } as const;

  const itemSchema = {
    'additionalProperties': false,
    'properties': { 'error': { 'type': 'string' }, 'value': { 'type': 'string' } },
    'required': ['value'],
    'type': 'object'
  } as const;

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'firstHookErrorMessage': { 'type': 'string' },
          'firstHookErrorName': { 'type': 'string' },
          'firstResults': { 'items': { 'type': 'string' }, 'type': 'array' },
          'hookErrorMessages': { 'items': { 'type': 'string' }, 'type': 'array' },
          'rejectionEvents': { 'items': {}, 'type': 'array' },
          'results': { 'items': { 'type': 'string' }, 'type': 'array' },
          'secondHookErrorMessage': { 'type': 'string' },
          'secondHookErrorName': { 'type': 'string' },
          'secondResults': { 'items': { 'type': 'string' }, 'type': 'array' },
          'seenErrors': { 'items': { 'type': 'string' }, 'type': 'array' },
          'seenTypes': { 'items': { 'type': 'string' }, 'type': 'array' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': {
          'firstItems': { 'items': itemSchema, 'type': 'array' },
          'items': { 'items': itemSchema, 'type': 'array' },
          'secondItems': { 'items': itemSchema, 'type': 'array' },
          'workerPool': workerPoolConfigSchema
        },
        'required': ['workerPool'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': ['on-message-envelopes', 'error-envelope-and-hook', 'throwing-on-message', 'async-rejecting-on-message', 'hook-errors-instance-local']
      }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const WorkerPoolConfigNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'concurrency': SchemaNode.defineNumber({ 'type': 'number' } as const), 'workerPath': SchemaNode.defineString({ 'type': 'string' } as const) },
    ['workerPath'] as const,
    { 'additionalProperties': false }
  );

  const ItemNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'error': SchemaNode.defineString({ 'type': 'string' } as const), 'value': SchemaNode.defineString({ 'type': 'string' } as const) },
    ['value'] as const,
    { 'additionalProperties': false }
  );

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'firstHookErrorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
          'firstHookErrorName': SchemaNode.defineString({ 'type': 'string' } as const),
          'firstResults': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
          'hookErrorMessages': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
          'rejectionEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineUnknown({} as const)),
          'results': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
          'secondHookErrorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
          'secondHookErrorName': SchemaNode.defineString({ 'type': 'string' } as const),
          'secondResults': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
          'seenErrors': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
          'seenTypes': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const))
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'firstItems': SchemaNode.defineArray({ 'type': 'array' } as const, ItemNode),
          'items': SchemaNode.defineArray({ 'type': 'array' } as const, ItemNode),
          'secondItems': SchemaNode.defineArray({ 'type': 'array' } as const, ItemNode),
          'workerPool': WorkerPoolConfigNode
        },
        ['workerPool'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum([
        'on-message-envelopes', 'error-envelope-and-hook', 'throwing-on-message', 'async-rejecting-on-message', 'hook-errors-instance-local'
      ] as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
