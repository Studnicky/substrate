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
  'required': ['workerPath'],
  'type': 'object'
} as const;

const itemSchema = {
  'additionalProperties': false,
  'properties': { 'value': { 'type': 'string' } },
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
    'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'workerPath': SchemaNode.defineString({ 'type': 'string' } as const)
  },
  ['workerPath'] as const,
  { 'additionalProperties': false, 'patternProperties': {} }
);

const ItemNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  { 'value': SchemaNode.defineString({ 'type': 'string' } as const) },
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
class CreationScenarioBranches {
  static schema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': {
            'composeCalls': { 'type': 'number' },
            'errorMessageIncludes': { 'type': 'string' },
            'results': { 'items': { 'type': 'string' }, 'type': 'array' }
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
            'composeCalls': SchemaNode.defineNumber({ 'type': 'number' } as const),
            'errorMessageIncludes': SchemaNode.defineString({ 'type': 'string' } as const),
            'results': SchemaNode.defineArray(
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

/** The `creation.loop.spec.ts` scenario case shape. `expected` lists every field used across the five shapes, each optional — each shape reads its own subset directly, never a cast. */
export namespace CreationScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      CreationScenarioBranches.schema('missing-worker-path'),
      CreationScenarioBranches.schema('default-concurrency'),
      CreationScenarioBranches.schema('caller-supplied-signal'),
      CreationScenarioBranches.schema('explicit-bounded-concurrency'),
      CreationScenarioBranches.schema('foreign-construction')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    CreationScenarioBranches.node('missing-worker-path'),
    CreationScenarioBranches.node('default-concurrency'),
    CreationScenarioBranches.node('caller-supplied-signal'),
    CreationScenarioBranches.node('explicit-bounded-concurrency'),
    CreationScenarioBranches.node('foreign-construction')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> =
    EntityCompiler.compileCreate<Type>(Schema);
}
