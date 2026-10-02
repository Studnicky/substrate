import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const closed = { 'additionalProperties': false, 'patternProperties': {} } as const;

const doubleNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['result'] as const, closed),
  'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'operand': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['operand'] as const, closed),
  'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'operation': SchemaNode.defineConst({}, 'double' as const)
}, ['description', 'expected', 'input', 'name', 'operation'] as const, closed);

const adoubleNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'result': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['result'] as const, closed),
  'input': SchemaNode.defineObject({ 'type': 'object' } as const, { 'operand': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['operand'] as const, closed),
  'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'operation': SchemaNode.defineConst({}, 'negate' as const)
}, ['description', 'expected', 'input', 'name', 'operation'] as const, closed);

/** Cases for the `ScenarioSuite` custom-discriminant spec, discriminated by `operation`. */
export namespace ScenarioSuiteOperationScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'result': { 'type': 'number' } }, 'required': ['result'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'operand': { 'type': 'number' } }, 'required': ['operand'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'operation': { 'const': 'double' }
        },
        'required': ['description', 'expected', 'input', 'name', 'operation'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'description': { 'minLength': 1, 'type': 'string' },
          'expected': { 'additionalProperties': false, 'properties': { 'result': { 'type': 'number' } }, 'required': ['result'], 'type': 'object' },
          'input': { 'additionalProperties': false, 'properties': { 'operand': { 'type': 'number' } }, 'required': ['operand'], 'type': 'object' },
          'name': { 'minLength': 1, 'type': 'string' },
          'operation': { 'const': 'negate' }
        },
        'required': ['description', 'expected', 'input', 'name', 'operation'],
        'type': 'object'
      }
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [doubleNode, adoubleNode] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
