import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Builds one branch per `shape`; every branch shares the same envelope, with `shape` the only varying field. */
class MutexQueueEntryScenarioBranches {
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
          'properties': {
            'validations': {
              'items': {
                'additionalProperties': false,
                'properties': {
                  'expected': { 'type': 'boolean' },
                  'value': {
                    'additionalProperties': false,
                    'properties': { 'queuedAt': { 'type': 'number' } },
                    'required': ['queuedAt'],
                    'type': 'object'
                  }
                },
                'required': ['expected', 'value'],
                'type': 'object'
              },
              'type': 'array'
            }
          },
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
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'validationResults': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineBoolean({ 'type': 'boolean' } as const), undefined) }, ['validationResults'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'validations': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineObject({ 'type': 'object' } as const, {
          'expected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
          'value': SchemaNode.defineObject({ 'type': 'object' } as const, { 'queuedAt': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['queuedAt'] as const, { 'additionalProperties': false, 'patternProperties': {} })
        }, ['expected', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} }), undefined)
      }, ['validations'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The single scenario case shape `entities.loop.spec.ts` exercises against `MutexQueueEntryEntity`. */
export namespace MutexQueueEntryScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      MutexQueueEntryScenarioBranches.schema('negative'), MutexQueueEntryScenarioBranches.schema('non-negative')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    MutexQueueEntryScenarioBranches.node('negative'), MutexQueueEntryScenarioBranches.node('non-negative')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
