import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

const workerPoolConfigSchema = {
  'additionalProperties': false,
  'properties': { 'concurrency': { 'type': 'number' }, 'timeoutMs': { 'type': 'number' }, 'workerPath': { 'type': 'string' } },
  'required': ['workerPath'],
  'type': 'object'
} as const;

const itemSchema = {
  'additionalProperties': false,
  'properties': { 'crash': { 'type': 'boolean' }, 'error': { 'type': 'string' }, 'ms': { 'type': 'number' }, 'value': { 'type': 'string' } },
  'required': ['value'],
  'type': 'object'
} as const;

const observedErrorSchema = {
  'additionalProperties': false,
  'properties': { 'index': { 'type': 'number' }, 'message': { 'type': 'string' } },
  'required': ['index', 'message'],
  'type': 'object'
} as const;

const WorkerPoolConfigNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'concurrency': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'workerPath': SchemaNode.defineString({ 'type': 'string' } as const)
}, ['workerPath'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const ItemNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'crash': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
  'error': SchemaNode.defineString({ 'type': 'string' } as const),
  'ms': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'value': SchemaNode.defineString({ 'type': 'string' } as const)
}, ['value'] as const, { 'additionalProperties': false, 'patternProperties': {} });

const ObservedErrorNode = SchemaNode.defineObject({ 'type': 'object' } as const, { 'index': SchemaNode.defineNumber({ 'type': 'number' } as const), 'message': SchemaNode.defineString({ 'type': 'string' } as const) }, ['index', 'message'] as const, { 'additionalProperties': false, 'patternProperties': {} });

/** Builds one branch per `shape`; every branch shares the same envelope, with `shape` the only varying field. */
class TerminationScenarioBranches {
  static schema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': {
            'laterResults': { 'items': { 'type': 'string' }, 'type': 'array' },
            'observedErrors': { 'items': observedErrorSchema, 'type': 'array' },
            'rejectionEvents': { 'items': {}, 'type': 'array' },
            'results': { 'items': { 'type': 'string' }, 'type': 'array' },
            'runRejectedMessageIncludes': { 'type': 'string' },
            'terminateCalls': { 'type': 'number' }
          },
          'required': [],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': {
            'crashItem': itemSchema,
            'item': itemSchema,
            'laterItem': itemSchema,
            'terminateFailureMessage': { 'type': 'string' },
            'timeoutItem': itemSchema,
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
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'laterResults': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
        'observedErrors': SchemaNode.defineArray({ 'type': 'array' } as const, ObservedErrorNode, undefined),
        'rejectionEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineUnknown({} as const), undefined),
        'results': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
        'runRejectedMessageIncludes': SchemaNode.defineString({ 'type': 'string' } as const),
        'terminateCalls': SchemaNode.defineNumber({ 'type': 'number' } as const)
      }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'crashItem': ItemNode,
        'item': ItemNode,
        'laterItem': ItemNode,
        'terminateFailureMessage': SchemaNode.defineString({ 'type': 'string' } as const),
        'timeoutItem': ItemNode,
        'workerPool': WorkerPoolConfigNode
      }, ['workerPool'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The `termination.loop.spec.ts` scenario case shape. `input`/`expected` list every field used across the four shapes, each optional — each shape reads its own subset directly, never a cast. */
export namespace TerminationScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      TerminationScenarioBranches.schema('final-shutdown-rejection'),
      TerminationScenarioBranches.schema('timeout-shutdown-rejection'),
      TerminationScenarioBranches.schema('error-shutdown-rejection'),
      TerminationScenarioBranches.schema('task-timeout-after-startup')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    TerminationScenarioBranches.node('final-shutdown-rejection'),
    TerminationScenarioBranches.node('timeout-shutdown-rejection'),
    TerminationScenarioBranches.node('error-shutdown-rejection'),
    TerminationScenarioBranches.node('task-timeout-after-startup')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
