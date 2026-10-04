import type {
  EntityCreateFunctionInterface,
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

const validationCaseSchema = {
  'additionalProperties': false,
  'properties': {
    'entity': {
      'enum': [
        'WorkerErrorEnvelopeEntity',
        'WorkerLogEnvelopeEntity',
        'WorkerPoolConfigEntity',
        'WorkerProgressEnvelopeEntity',
        'WorkerTaskDispositionEntity',
        'WorkerTaskIndexEntity'
      ]
    },
    'expected': { 'type': 'boolean' },
    'value': { 'additionalProperties': true, 'properties': {}, 'required': [], 'type': 'object' }
  },
  'required': ['entity', 'expected', 'value'],
  'type': 'object'
} as const;

const ValidationCaseNode = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    'entity': SchemaNode.defineEnum({}, [
      'WorkerErrorEnvelopeEntity',
      'WorkerLogEnvelopeEntity',
      'WorkerPoolConfigEntity',
      'WorkerProgressEnvelopeEntity',
      'WorkerTaskDispositionEntity',
      'WorkerTaskIndexEntity'
    ] as const),
    'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'value': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, {
      'additionalProperties': true,
      'patternProperties': {}
    })
  },
  ['entity', 'expected', 'value'] as const,
  { 'additionalProperties': false, 'patternProperties': {} }
);

/** Builds one branch per `shape`; every branch shares the same envelope, with `shape` the only varying field. */
class EntitiesScenarioBranches {
  static schema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': { 'validationResults': { 'items': { 'type': 'boolean' }, 'type': 'array' } },
          'required': ['validationResults'],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': { 'validations': { 'items': validationCaseSchema, 'type': 'array' } },
          'required': ['validations'],
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
            'validationResults': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
              undefined
            )
          },
          ['validationResults'] as const,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          {
            'validations': SchemaNode.defineArray(
              { 'type': 'array' } as const,
              ValidationCaseNode,
              undefined
            )
          },
          ['validations'] as const,
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

/** The `entities.loop.spec.ts` scenario case shape. Each `validations[].value` bag is entity-specific, so it stays an open object. */
export namespace EntitiesScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      EntitiesScenarioBranches.schema('rejects-invalid'),
      EntitiesScenarioBranches.schema('validates-everything')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    EntitiesScenarioBranches.node('rejects-invalid'),
    EntitiesScenarioBranches.node('validates-everything')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> =
    EntityCompiler.compileCreate<Type>(Schema);
}
