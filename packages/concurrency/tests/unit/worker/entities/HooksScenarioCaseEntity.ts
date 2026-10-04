import type {
  EntityCreateFunctionInterface,
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

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

const WorkerPoolConfigNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'concurrency': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'workerPath': SchemaNode.defineString({ 'type': 'string' } as const)
  },
  ['workerPath'] as const,
  { 'additionalProperties': false, 'patternProperties': {} }
);

const ItemNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'error': SchemaNode.defineString({ 'type': 'string' } as const),
    'value': SchemaNode.defineString({ 'type': 'string' } as const)
  },
  ['value'] as const,
  { 'additionalProperties': false, 'patternProperties': {} }
);

/** Builds one branch per `shape`; every branch shares the same envelope, with `shape` the only varying field. */
class HooksScenarioBranches {
  static schema<const TShape extends string>(shape: TShape) {
    const result = {
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
            'firstHookErrorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
            'firstHookErrorName': SchemaNode.defineString({ 'type': 'string' } as const),
            'firstResults': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineString({ 'type': 'string' } as const),
              undefined
            ),
            'hookErrorMessages': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineString({ 'type': 'string' } as const),
              undefined
            ),
            'rejectionEvents': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineUnknown({} as const),
              undefined
            ),
            'results': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineString({ 'type': 'string' } as const),
              undefined
            ),
            'secondHookErrorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
            'secondHookErrorName': SchemaNode.defineString({ 'type': 'string' } as const),
            'secondResults': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineString({ 'type': 'string' } as const),
              undefined
            ),
            'seenErrors': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineString({ 'type': 'string' } as const),
              undefined
            ),
            'seenTypes': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineString({ 'type': 'string' } as const),
              undefined
            )
          },
          [] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'firstItems': SchemaNode.defineArray({ 'type': 'array' } as const, ItemNode, undefined),
            'items': SchemaNode.defineArray({ 'type': 'array' } as const, ItemNode, undefined),
            'secondItems': SchemaNode.defineArray({ 'type': 'array' } as const, ItemNode, undefined),
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

/** The `hooks.loop.spec.ts` scenario case shape. `expected` lists every field used across the five shapes, each optional — each shape reads its own subset directly, never a cast. */
export namespace HooksScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      HooksScenarioBranches.schema('on-message-envelopes'),
      HooksScenarioBranches.schema('error-envelope-and-hook'),
      HooksScenarioBranches.schema('throwing-on-message'),
      HooksScenarioBranches.schema('async-rejecting-on-message'),
      HooksScenarioBranches.schema('hook-errors-instance-local')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    HooksScenarioBranches.node('on-message-envelopes'),
    HooksScenarioBranches.node('error-envelope-and-hook'),
    HooksScenarioBranches.node('throwing-on-message'),
    HooksScenarioBranches.node('async-rejecting-on-message'),
    HooksScenarioBranches.node('hook-errors-instance-local')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> =
    EntityCompiler.compileCreate<Type>(Schema);
}
