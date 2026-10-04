import type {
  EntityCreateFunctionInterface,
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

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

const BatchConfigNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  { 'concurrency': SchemaNode.defineNumber({ 'type': 'number' } as const) },
  [] as const,
  { 'additionalProperties': false, 'patternProperties': {} }
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
  { 'additionalProperties': false, 'patternProperties': {} }
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
  { 'additionalProperties': false, 'patternProperties': {} }
);

const SignalNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  { 'shape': SchemaNode.defineString({ 'type': 'string' } as const) },
  ['shape'] as const,
  { 'additionalProperties': true, 'patternProperties': {} }
);

/** Builds one branch per `shape`; every branch shares the same envelope, with `shape` the only varying field. */
class TimeoutScenarioBranches {
  static schema<const TShape extends string>(shape: TShape) {
    const result = {
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
          'properties': {
            'items': { 'items': itemSchema, 'type': 'array' },
            'signal': signalSchema,
            'workerPool': workerPoolConfigSchema
          },
          'required': ['workerPool'],
          'type': 'object'
        },
        'name': { 'minLength': 1, 'type': 'string' },
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
    return result;
  }

  static node<const TShape extends string>(shape: TShape) {
    const result = SchemaNode.defineObject(
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
            'results': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineString({ 'type': 'string' } as const),
              undefined
            ),
            'timedOutIndexes': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineNumber({ 'type': 'number' } as const),
              undefined
            )
          },
          [] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'items': SchemaNode.defineArray({ 'type': 'array' } as const, ItemNode, undefined),
            'signal': SignalNode,
            'workerPool': WorkerPoolConfigNode
          },
          ['workerPool'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, shape)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false, 'patternProperties': {} }
    );
    return result;
  }
}

/** The `timeout.loop.spec.ts` scenario case shape. `input`/`expected` list every field used across the nine shapes, each optional — each shape reads its own subset directly, never a cast. */
export namespace TimeoutScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      TimeoutScenarioBranches.schema('worker-timeout'),
      TimeoutScenarioBranches.schema('signal-already-aborted'),
      TimeoutScenarioBranches.schema('within-timeout'),
      TimeoutScenarioBranches.schema('awaits-signal-composition'),
      TimeoutScenarioBranches.schema('signal-compose-rejects'),
      TimeoutScenarioBranches.schema('signal-compose-rejects-string'),
      TimeoutScenarioBranches.schema('compose-after-exit'),
      TimeoutScenarioBranches.schema('compose-after-exit-queued'),
      TimeoutScenarioBranches.schema('startup-timeout')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    TimeoutScenarioBranches.node('worker-timeout'),
    TimeoutScenarioBranches.node('signal-already-aborted'),
    TimeoutScenarioBranches.node('within-timeout'),
    TimeoutScenarioBranches.node('awaits-signal-composition'),
    TimeoutScenarioBranches.node('signal-compose-rejects'),
    TimeoutScenarioBranches.node('signal-compose-rejects-string'),
    TimeoutScenarioBranches.node('compose-after-exit'),
    TimeoutScenarioBranches.node('compose-after-exit-queued'),
    TimeoutScenarioBranches.node('startup-timeout')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> =
    EntityCompiler.compileCreate<Type>(Schema);
}
