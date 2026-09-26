import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `timeout.loop.spec.ts` scenario case shape. `input`/`expected` list every field used across the nine shapes, each optional — each shape reads its own subset directly, never a cast. */
export namespace TimeoutScenarioCaseEntity {
  const batchConfigSchema = {
    'additionalProperties': false,
    'properties': { 'concurrency': { 'type': 'number' } },
    'required': [],
    'type': 'object'
  } as const;

  const workerPoolConfigSchema = {
    'additionalProperties': false,
    'properties': {
      'batch': batchConfigSchema,
      'concurrency': { 'type': 'number' },
      'startupTimeoutMs': { 'type': 'number' },
      'timeoutMs': { 'type': 'number' },
      'workerPath': { 'type': 'string' }
    },
    'required': ['workerPath'],
    'type': 'object'
  } as const;

  const itemSchema = {
    'additionalProperties': false,
    'properties': {
      'error': { 'type': 'string' },
      'exitAfterResult': { 'type': 'boolean' },
      'ms': { 'type': 'number' },
      'value': { 'type': 'string' }
    },
    'required': ['value'],
    'type': 'object'
  } as const;

  const signalSchema = {
    'additionalProperties': true,
    'properties': { 'shape': { 'type': 'string' } },
    'required': ['shape'],
    'type': 'object'
  } as const;

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'errorMessageIncludes': { 'type': 'string' },
          'excludesMessage': { 'type': 'string' },
          'messagesAfterCompose': { 'type': 'number' },
          'messagesAfterRun': { 'type': 'number' },
          'results': { 'items': { 'type': 'string' }, 'type': 'array' },
          'timedOutIndexes': { 'items': { 'type': 'number' }, 'type': 'array' }
        },
        'required': [],
        'type': 'object'
      },
      'input': {
        'additionalProperties': false,
        'properties': { 'items': { 'items': itemSchema, 'type': 'array' }, 'signal': signalSchema, 'workerPool': workerPoolConfigSchema },
        'required': ['workerPool'],
        'type': 'object'
      },
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': {
        'enum': [
          'worker-timeout', 'signal-already-aborted', 'within-timeout', 'awaits-signal-composition', 'signal-compose-rejects',
          'signal-compose-rejects-string', 'compose-after-exit', 'compose-after-exit-queued', 'startup-timeout'
        ]
      }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  const BatchConfigNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'concurrency': SchemaNode.defineNumber({ 'type': 'number' } as const) },
    [] as const,
    { 'additionalProperties': false }
  );

  const WorkerPoolConfigNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'batch': BatchConfigNode,
      'concurrency': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'startupTimeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'workerPath': SchemaNode.defineString({ 'type': 'string' } as const)
    },
    ['workerPath'] as const,
    { 'additionalProperties': false }
  );

  const ItemNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'error': SchemaNode.defineString({ 'type': 'string' } as const),
      'exitAfterResult': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'ms': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'value': SchemaNode.defineString({ 'type': 'string' } as const)
    },
    ['value'] as const,
    { 'additionalProperties': false }
  );

  const SignalNode = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'shape': SchemaNode.defineString({ 'type': 'string' } as const) },
    ['shape'] as const,
    { 'additionalProperties': true }
  );

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'errorMessageIncludes': SchemaNode.defineString({ 'type': 'string' } as const),
          'excludesMessage': SchemaNode.defineString({ 'type': 'string' } as const),
          'messagesAfterCompose': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'messagesAfterRun': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'results': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
          'timedOutIndexes': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const))
        },
        [] as const,
        { 'additionalProperties': false }
      ),
      'input': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'items': SchemaNode.defineArray({ 'type': 'array' } as const, ItemNode), 'signal': SignalNode, 'workerPool': WorkerPoolConfigNode },
        ['workerPool'] as const,
        { 'additionalProperties': false }
      ),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineEnum([
        'worker-timeout', 'signal-already-aborted', 'within-timeout', 'awaits-signal-composition', 'signal-compose-rejects',
        'signal-compose-rejects-string', 'compose-after-exit', 'compose-after-exit-queued', 'startup-timeout'
      ] as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
