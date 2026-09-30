import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Builds one branch per `shape`; every branch shares the same envelope, with `shape` the only varying field. */
class PatchOperationCoreEntityScenarioBranches {
  static schema<const TShape extends string>(shape: TShape) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': {
          'additionalProperties': false,
          'properties': { 'valid': { 'type': 'boolean' } },
          'required': ['valid'],
          'type': 'object'
        },
        'input': {
          'additionalProperties': false,
          'properties': {
            'operation': {
              'additionalProperties': false,
              'properties': { 'op': { 'type': 'string' }, 'path': { 'type': 'string' } },
              'required': [],
              'type': 'object'
            }
          },
          'required': ['operation'],
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
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'valid': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['valid'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SchemaNode.defineObject({ 'type': 'object' } as const, {
        'operation': SchemaNode.defineObject({ 'type': 'object' } as const, {
          'op': SchemaNode.defineString({ 'type': 'string' } as const),
          'path': SchemaNode.defineString({ 'type': 'string' } as const)
        }, [] as const, { 'additionalProperties': false, 'patternProperties': {} })
      }, ['operation'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/** The single scenario case shape `PatchOperationCoreEntity.loop.spec.ts` exercises. */
export namespace PatchOperationCoreEntityScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      PatchOperationCoreEntityScenarioBranches.schema('invalid-missing-path'), PatchOperationCoreEntityScenarioBranches.schema('invalid-operation-variant'), PatchOperationCoreEntityScenarioBranches.schema('valid-operation')
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    PatchOperationCoreEntityScenarioBranches.node('invalid-missing-path'), PatchOperationCoreEntityScenarioBranches.node('invalid-operation-variant'), PatchOperationCoreEntityScenarioBranches.node('valid-operation')
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
