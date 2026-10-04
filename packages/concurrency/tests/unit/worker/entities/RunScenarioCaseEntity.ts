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
    'timeoutMs': { 'type': 'number' },
    'workerPath': { 'type': 'string' }
  },
  'required': ['concurrency', 'workerPath'],
  'type': 'object'
} as const;

const itemSchema = {
  'additionalProperties': false,
  'properties': {
    'awaitResultCount': { 'type': 'number' },
    'error': { 'type': 'string' },
    'exit': { 'type': 'boolean' },
    'ms': { 'type': 'number' },
    'stateFile': { 'type': 'string' },
    'value': { 'type': 'string' }
  },
  'required': ['value'],
  'type': 'object'
} as const;

const boundedConcurrencyBatchSchema = {
  'additionalProperties': false,
  'properties': {
    'itemCount': { 'type': 'number' },
    'itemMs': { 'type': 'number' },
    'valuePrefix': { 'type': 'string' }
  },
  'required': ['itemCount', 'itemMs', 'valuePrefix'],
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
    'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'workerPath': SchemaNode.defineString({ 'type': 'string' } as const)
  },
  ['concurrency', 'workerPath'] as const,
  { 'additionalProperties': false, 'patternProperties': {} }
);

const ItemNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'awaitResultCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'error': SchemaNode.defineString({ 'type': 'string' } as const),
    'exit': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'ms': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'stateFile': SchemaNode.defineString({ 'type': 'string' } as const),
    'value': SchemaNode.defineString({ 'type': 'string' } as const)
  },
  ['value'] as const,
  { 'additionalProperties': false, 'patternProperties': {} }
);

const BoundedConcurrencyBatchNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'itemCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'itemMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'valuePrefix': SchemaNode.defineString({ 'type': 'string' } as const)
  },
  ['itemCount', 'itemMs', 'valuePrefix'] as const,
  { 'additionalProperties': false, 'patternProperties': {} }
);

/** Builds one branch per `shape`; every branch shares the same envelope, with `shape` the only varying field. */
class RunScenarioBranches {
  static schema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': {
            'createdWorkerCount': { 'type': 'number' },
            'itemCount': { 'type': 'number' },
            'observedMaximumGreaterThanOne': { 'const': true },
            'observedMaximumLessThanOrEqualConcurrency': { 'const': true },
            'observedResults': { 'items': { 'type': 'string' }, 'type': 'array' },
            'results': { 'items': { 'type': 'string' }, 'type': 'array' },
            'runRejectedMessageIncludes': { 'type': 'string' }
          },
          'required': [],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': {
            'batch': boundedConcurrencyBatchSchema,
            'items': { 'items': itemSchema, 'type': 'array' },
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
            'createdWorkerCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'itemCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'observedMaximumGreaterThanOne': SchemaNode.defineConst({}, true as const),
            'observedMaximumLessThanOrEqualConcurrency': SchemaNode.defineConst({}, true as const),
            'observedResults': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineString({ 'type': 'string' } as const),
              undefined
            ),
            'results': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineString({ 'type': 'string' } as const),
              undefined
            ),
            'runRejectedMessageIncludes': SchemaNode.defineString({ 'type': 'string' } as const)
          },
          [] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'batch': BoundedConcurrencyBatchNode,
            'items': SchemaNode.defineArray({ 'type': 'array' } as const, ItemNode, undefined),
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

/** The `run.loop.spec.ts` scenario case shape. `input`/`expected` list every field used across the six shapes, each optional — each shape reads its own subset directly, never a cast. */
export namespace RunScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      RunScenarioBranches.schema('result-order'),
      RunScenarioBranches.schema('bounded-concurrency'),
      RunScenarioBranches.schema('error-fail-fast'),
      RunScenarioBranches.schema('exit-retry'),
      RunScenarioBranches.schema('exit-retry-fails'),
      RunScenarioBranches.schema('timeout-rejects')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    RunScenarioBranches.node('result-order'),
    RunScenarioBranches.node('bounded-concurrency'),
    RunScenarioBranches.node('error-fail-fast'),
    RunScenarioBranches.node('exit-retry'),
    RunScenarioBranches.node('exit-retry-fails'),
    RunScenarioBranches.node('timeout-rejects')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> =
    EntityCompiler.compileCreate<Type>(Schema);
}
